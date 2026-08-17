/**
 * 뇌(agent-service) 호출 — 게이트웨이의 유일한 아웃바운드 경로.
 *
 * 설계문서 3.6 의 경계를 지킨다: NestJS 가 인터넷 노출면이고 뇌는 내부망이다.
 * 브라우저는 이 서비스 너머를 알지 못하고, 뇌는 우리를 통해서만 불린다.
 *
 * ★ 신원은 **여기서 확정된 값만** 넘어간다. 요청 본문에 담겨 온 신원 비슷한 값은
 *   쳐다보지 않는다 — EntraAuthGuard 가 토큰에서 뽑은 것이 유일한 출처다.
 *   뇌 쪽 `AgentContext` 도 같은 규칙을 갖고 있다 (설계문서 원칙③).
 */

import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EntraUser } from '../common/guards/entra-auth.guard';

/** 뇌가 돌려주는 모양. 이 파일 밖으로 그대로 내보내지 않는다. */
interface BrainResponse {
  text: string;
  refused: boolean;
  iterations: number;
  tool_trace: { name: string; outcome: string; latency_ms: number }[];
  usage: Record<string, number>;
}

/** 브라우저가 보는 모양. 비용·토큰 수치는 넘기지 않는다. */
/**
 * 대화 이력 한 마디. **평문만 오간다** — thinking 블록이나 도구 결과 같은 내부
 * 표현은 브라우저까지 왕복시키지 않는다. 검색해 온 문서 원문이 클라이언트로 새고,
 * 클라이언트가 도구 결과를 위조해 넣을 수 있게 되기 때문이다.
 */
export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface AgentSearchResult {
  text: string;
  /** Genie 가 답변을 거절했는가 (인격 규칙에 따른 거절) */
  refused: boolean;
  /** 어떤 도구가 쓰였는가. 근거 표시와 "검색이 돌긴 했나" 확인용 */
  tools: { name: string; outcome: string }[];
}

/**
 * 뇌는 도구 연쇄 + LLM 이라 수 초에서 수십 초가 걸린다 (설계문서 3.4).
 * 무한정 기다리면 우리 워커가 묶이므로 상한을 둔다.
 */
const DEFAULT_TIMEOUT_MS = 60_000;

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(private readonly config: ConfigService) {}

  async search(
    question: string,
    user: EntraUser,
    history: ChatTurn[] = [],
  ): Promise<AgentSearchResult> {
    const { baseUrl, token, timeoutMs } = this.requireConfig();
    const startedAt = Date.now();

    const body = await this.callBrain(
      `${baseUrl}/agent/message`,
      token,
      timeoutMs,
      {
        text: question,
        // 이력은 클라이언트가 들고 있다가 다시 보낸 값이다. 맥락에만 쓰이고,
        // 신원·권한 판단에는 관여하지 않는다 — 그 출처는 아래 두 줄뿐이다.
        history,
        // ★ 서버가 확정한 신원. 클라이언트가 주장한 값이 아니다.
        internal_user_id: user.internalUserId,
        org_id: user.tenantId,
        // 계정 언어. 답변 언어를 강제하지 않고, 질문만으로 언어를 알기 어려울 때의
        // 기준으로만 쓰인다 (뇌의 _language_hint 참조). 없으면 그냥 빠진다.
        locale: user.preferredLanguage ?? null,
        // Entra 그룹 클레임을 roles 로 승격하는 것은 ACL 필터와 함께 간다
        // (docs/TEAMS_TAB_DESIGN.md 3.4). 그때까지는 뇌가 최소 권한으로 떨어진다.
        roles: [],
      },
    );

    // 비용과 지연은 우리가 들고 있는다. 브라우저로 내려보내지 않는다 (설계문서 10.2).
    // ★ lang 은 Entra 선택적 클레임 `xms_pl` 이 실제로 오는지 확인하는 용도로 남긴다.
    //   "앱 등록에서 켰다"와 "토큰에 값이 실린다"는 별개다 — 사용자 프로필에 선호
    //   언어가 없으면 켜도 비어 있고, 그러면 언어 판단을 다른 근거로 해야 한다.
    //   언어 태그는 개인을 식별하지 않으므로 로그에 남겨도 된다.
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

  // ── 설정 ────────────────────────────────────────────────────────────

  private requireConfig(): {
    baseUrl: string;
    token: string;
    timeoutMs: number;
  } {
    const baseUrl = (this.config.get<string>('RAG_SERVICE_URL') ?? '')
      .trim()
      .replace(/\/+$/, '');
    const token = (this.config.get<string>('AGENT_SERVICE_TOKEN') ?? '').trim();

    // 설정이 없으면 조용히 우회하지 않는다. 토큰 없이 부르면 뇌가 어차피 막는데,
    // 그 실패는 "인증 실패"로 보여서 원인 찾기가 어려워진다. 여기서 끊는 게 낫다.
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

  // ── 호출 ────────────────────────────────────────────────────────────

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
          // 뇌가 "호출자가 게이트웨이인가"를 확인하는 값 (agent-service main.py)
          'x-service-token': token,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      // 타임아웃·연결 거부·DNS 실패가 모두 여기로 온다. 어느 쪽이든 브라우저에
      // 알려줄 것은 "지금 못 부른다" 하나뿐이다 — 내부 주소를 노출하지 않는다.
      this.logger.error(
        `뇌 호출 실패: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadGatewayException('agent service is unreachable');
    }

    if (!response.ok) {
      // 뇌가 우리를 거절했다면(401) 그건 사용자 문제가 아니라 우리 설정 문제다.
      // 사용자에게 401 을 그대로 돌려주면 "다시 로그인" 을 시도하게 만든다.
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

    // 계약이 깨졌을 때 undefined 를 그대로 흘려보내지 않는다 —
    // 화면에서 "undefined" 가 렌더되는 것보다 502 가 낫다.
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

  /** 오류 본문 읽기가 또 실패해도 원래 오류를 덮지 않게 한다. */
  private async safeText(response: Response): Promise<string> {
    try {
      return (await response.text()).slice(0, 200);
    } catch {
      return '(본문 읽기 실패)';
    }
  }
}
