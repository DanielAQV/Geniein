import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EntraUser } from '../common/guards/entra-auth.guard';

interface BrainResponse {
  text: string;
  refused: boolean;
  iterations: number;
  tool_trace: { name: string; outcome: string; latency_ms: number }[];
  usage: Record<string, number>;
}

// 평문만 오간다 — thinking 블록이나 도구 결과는 브라우저까지 왕복시키지 않는다
export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface AgentSearchResult {
  text: string;
  refused: boolean;
  tools: { name: string; outcome: string }[];
}

const DEFAULT_TIMEOUT_MS = 60_000;

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(private readonly config: ConfigService) {}

  async search(
    question: string,
    user: EntraUser,
    history: ChatTurn[] = [],
    chosenLang: string | null = null,
  ): Promise<AgentSearchResult> {
    const { baseUrl, token, timeoutMs } = this.requireConfig();
    const startedAt = Date.now();

    const body = await this.callBrain(
      `${baseUrl}/agent/message`,
      token,
      timeoutMs,
      {
        text: question,
        history,
        // 서버가 확정한 신원. 클라이언트가 주장한 값이 아니다.
        internal_user_id: user.internalUserId,
        org_id: user.tenantId,
        // 계정 언어. 답변 언어를 강제하지 않고 판단이 애매할 때의 기준으로만 쓰인다
        locale: user.preferredLanguage ?? null,
        // 탭에서 직접 고른 언어. locale 보다 강한 근거다 (컨트롤러가 허용목록으로 걸렀다)
        chosen_lang: chosenLang,
        // Entra 그룹 클레임의 roles 승격은 ACL 필터와 함께 간다 (docs/TEAMS_TAB_DESIGN.md 3.4)
        roles: [],
      },
    );

    // 비용·지연은 우리가 들고 있는다. 브라우저로 내려보내지 않는다
    this.logger.log(
      `검색 완료 user=${user.internalUserId} lang=${user.preferredLanguage ?? '-'} ` +
        `${Date.now() - startedAt}ms ` +
        `iterations=${body.iterations} tools=[${body.tool_trace
          .map((t) => `${t.name}:${t.outcome}`)
          .join(', ')}] usage=${JSON.stringify(body.usage)}`,
    );

    return {
      text: body.text,
      refused: body.refused,
      tools: body.tool_trace.map((t) => ({ name: t.name, outcome: t.outcome })),
    };
  }

  async searchStream(
    question: string,
    user: EntraUser,
    history: ChatTurn[] = [],
    chosenLang: string | null = null,
  ): Promise<ReadableStream<Uint8Array>> {
    const { baseUrl, token, timeoutMs } = this.requireConfig();
    const startedAt = Date.now();

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/agent/message/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-service-token': token },
        body: JSON.stringify({
          text: question,
          history,
          internal_user_id: user.internalUserId,
          org_id: user.tenantId,
          locale: user.preferredLanguage ?? null,
          chosen_lang: chosenLang,
          roles: [],
        }),
        // 타임아웃은 첫 응답까지만. 본문 수신 중에도 발동하므로 긴 답변이 중간에 잘린다
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      this.logger.error(
        `뇌 스트림 호출 실패: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadGatewayException('agent service is unreachable');
    }

    if (!response.ok || !response.body) {
      this.logger.error(
        `뇌가 ${response.status} 를 반환했습니다 (${await this.safeText(response)})`,
      );
      throw new BadGatewayException('agent service returned an error');
    }

    return response.body.pipeThrough(
      this.observe(user, startedAt),
    ) as ReadableStream<Uint8Array>;
  }

  // 줄이 청크 경계에 걸쳐 쪼개진다. 버퍼에 모아 개행에서만 자른다
  private observe(
    user: EntraUser,
    startedAt: number,
  ): TransformStream<Uint8Array, Uint8Array> {
    const decoder = new TextDecoder();
    let buffer = '';
    let logged = false;

    const inspect = (line: string): void => {
      if (logged || !line.includes('"done"')) return;
      try {
        const event = JSON.parse(line) as {
          type?: string;
          iterations?: number;
          tools?: { name: string; outcome: string }[];
          usage?: Record<string, number>;
        };
        if (event.type !== 'done') return;
        logged = true;
        this.logger.log(
          `검색 완료(스트림) user=${user.internalUserId} lang=${user.preferredLanguage ?? '-'} ` +
            `${Date.now() - startedAt}ms iterations=${event.iterations} ` +
            `tools=[${(event.tools ?? [])
              .map((t) => `${t.name}:${t.outcome}`)
              .join(', ')}] usage=${JSON.stringify(event.usage ?? {})}`,
        );
      } catch {
        // 관측이 실패해도 스트림은 흘러야 한다. 사용자 답변이 로그보다 중요하다.
      }
    };

    return new TransformStream({
      transform: (chunk, controller) => {
        controller.enqueue(chunk);
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) if (line.trim()) inspect(line);
      },
      flush: () => {
        if (buffer.trim()) inspect(buffer);
      },
    });
  }

  private requireConfig(): {
    baseUrl: string;
    token: string;
    timeoutMs: number;
  } {
    const baseUrl = (this.config.get<string>('RAG_SERVICE_URL') ?? '')
      .trim()
      .replace(/\/+$/, '');
    const token = (this.config.get<string>('AGENT_SERVICE_TOKEN') ?? '').trim();

    // 설정이 없으면 조용히 우회하지 않는다. 뇌가 막는 실패는 "인증 실패"로 보여 원인 찾기가 어렵다
    if (!baseUrl || !token) {
      this.logger.error(
        'RAG_SERVICE_URL / AGENT_SERVICE_TOKEN 이 설정되지 않아 뇌를 호출할 수 없습니다',
      );
      throw new ServiceUnavailableException('agent service is not configured');
    }

    const timeoutMs =
      Number(this.config.get<string>('AGENT_TIMEOUT_MS')) || DEFAULT_TIMEOUT_MS;

    return { baseUrl, token, timeoutMs };
  }

  private async callBrain(
    url: string,
    token: string,
    timeoutMs: number,
    payload: Record<string, unknown>,
  ): Promise<BrainResponse> {
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-service-token': token,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      // 타임아웃·연결 거부·DNS 실패가 모두 여기로 온다. 내부 주소는 노출하지 않는다
      this.logger.error(
        `뇌 호출 실패: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadGatewayException('agent service is unreachable');
    }

    if (!response.ok) {
      // 뇌의 401 은 사용자 문제가 아니라 우리 설정 문제다. 그대로 돌려주면 안 된다
      this.logger.error(
        `뇌가 ${response.status} 를 반환했습니다 (${await this.safeText(response)})`,
      );
      throw new BadGatewayException('agent service returned an error');
    }

    return this.parse(response);
  }

  private async parse(response: Response): Promise<BrainResponse> {
    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      this.logger.error('뇌 응답이 JSON 이 아닙니다');
      throw new BadGatewayException('agent service returned malformed data');
    }

    // 계약이 깨졌을 때 화면에 "undefined" 가 렌더되는 것보다 502 가 낫다
    const body = raw as Partial<BrainResponse> | null;
    if (!body || typeof body.text !== 'string') {
      this.logger.error(
        `뇌 응답에 text 가 없습니다: ${JSON.stringify(raw).slice(0, 200)}`,
      );
      throw new BadGatewayException('agent service returned malformed data');
    }

    return {
      text: body.text,
      refused: body.refused === true,
      iterations: typeof body.iterations === 'number' ? body.iterations : 0,
      tool_trace: Array.isArray(body.tool_trace) ? body.tool_trace : [],
      usage: body.usage && typeof body.usage === 'object' ? body.usage : {},
    };
  }

  private async safeText(response: Response): Promise<string> {
    try {
      return (await response.text()).slice(0, 200);
    } catch {
      return '(본문 읽기 실패)';
    }
  }
}
