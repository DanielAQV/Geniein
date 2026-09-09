/**
 * Teams 탭이 실제로 두드리는 엔드포인트.
 *
 * 관문이 둘이고 답하는 질문이 다르다 (docs/TEAMS_TAB_DESIGN.md 2장):
 *   ServiceTokenGuard  호출자가 우리 BFF 인가        — Next.js route handler 만 부른다
 *   EntraAuthGuard     이 사용자가 누구인가           — Teams SSO 토큰에서 확정
 *
 * 순서가 의미를 갖는다. ServiceTokenGuard 가 먼저 걸려서, BFF 를 거치지 않은
 * 요청은 Entra 검증(= JWKS 조회, 외부 호출)까지 가지 못한다.
 *
 * > ServiceTokenGuard 는 ADMIN_SERVICE_TOKEN 을 쓴다. 이름에 admin 이 들어 있지만
 * > 그 값이 답하는 질문은 "호출자가 우리 BFF 인가"이고, 여기서도 같은 두 당사자가
 * > 같은 관계로 통신한다. 토큰을 하나 더 만들어도 새로운 경계가 생기지 않는다.
 */

import {
  BadRequestException,
  Body,
  Get,
  Controller,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AgentService, type AgentSearchResult } from './agent.service';
import { ServiceTokenGuard } from '../common/guards/service-token.guard';
import {
  EntraAuthGuard,
  type RequestWithEntraUser,
} from '../common/guards/entra-auth.guard';

/** 검색어 상한. 뇌 쪽 상한(8000)보다 좁게 잡는다 — 검색창이지 편집기가 아니다. */
const MAX_QUESTION_LENGTH = 2000;

/**
 * 대화 이력 상한. 뇌 쪽과 같은 값으로 맞춘다.
 *
 * 상한이 필요한 이유는 비용이다 — 이력은 매 턴마다 통째로 다시 청구된다.
 * 클라이언트가 길이를 정하게 두면 한 사람이 요금을 무한정 늘릴 수 있다.
 */
const MAX_HISTORY_TURNS = 20;
/** 이력 한 마디의 상한. 답변이 길 수 있어 질문 상한보다 넉넉하다. */
const MAX_HISTORY_TEXT_LENGTH = 8000;

/**
 * 탭이 보낼 수 있는 언어 값. `apps/web/src/app/teams/_lib/i18n.ts` 의 `LANGUAGES` 와
 * 같아야 한다 — 화면에 없는 언어를 뇌에 넘겨도 문구가 없다.
 */
const ALLOWED_LANGS = ['ko', 'vi', 'en'] as const;

/**
 * 사용자가 탭에서 직접 고른 언어. 모르는 값은 **버리고 통과시킨다.**
 *
 * ★ 400 을 내지 않는 것이 의도다. 이 값은 인가 경계가 아니라 표시 설정이고, 뇌에는
 *   계정 언어라는 다음 근거가 있다. 오래된 탭이 새 언어 코드를 보냈다는 이유로 검색이
 *   실패하면, 사용자는 답을 못 받고 원인도 알 수 없다.
 */
function parseLang(raw: unknown): string | null {
  return typeof raw === 'string' &&
    (ALLOWED_LANGS as readonly string[]).includes(raw)
    ? raw
    : null;
}

/**
 * 이력은 **클라이언트가 들고 있다가 다시 보내는 값**이다. 서버는 이것을 신원이나
 * 권한 판단에 쓰지 않는다 — 그 출처는 오직 Entra 토큰이다 (설계문서 원칙③).
 * 여기서는 모양만 본다. 내용의 진위는 확인할 수 있는 종류가 아니고, 확인해야 할
 * 경계(누구인가 / 어느 법인의 문서인가)는 이 값과 무관하게 서버가 정한다.
 */
function parseHistory(
  raw: unknown,
): { role: 'user' | 'assistant'; text: string }[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw new BadRequestException('history must be an array');
  }
  if (raw.length > MAX_HISTORY_TURNS) {
    throw new BadRequestException(
      `history must be at most ${MAX_HISTORY_TURNS} turns`,
    );
  }

  return raw.map((item) => {
    const role: unknown = (item as { role?: unknown })?.role;
    const text: unknown = (item as { text?: unknown })?.text;

    if (role !== 'user' && role !== 'assistant') {
      throw new BadRequestException('history role must be user or assistant');
    }
    if (typeof text !== 'string' || !text.trim()) {
      throw new BadRequestException('history text must be a non-empty string');
    }
    if (text.length > MAX_HISTORY_TEXT_LENGTH) {
      throw new BadRequestException(
        `history text must be at most ${MAX_HISTORY_TEXT_LENGTH} characters`,
      );
    }

    return { role, text };
  });
}

/**
 * 스트리밍 응답에 쓰는 것만 골라 둔 최소 인터페이스.
 *
 * ★ `express.Response` 타입을 끌어오지 않는다. 이 파일이 HTTP 어댑터에 묶이면
 *   테스트에서도 Express 객체를 만들어야 한다. 여기서 실제로 쓰는 것은 넷뿐이다.
 */
export interface StreamingResponse {
  setHeader(name: string, value: string): void;
  flushHeaders?(): void;
  write(chunk: Uint8Array | string): boolean;
  end(): void;
}

@Controller('agent')
@UseGuards(ServiceTokenGuard, EntraAuthGuard)
export class AgentController {
  private readonly logger = new Logger(AgentController.name);

  constructor(private readonly agentService: AgentService) {}

  /**
   * 탭이 부팅할 때 한 번 부른다 — 화면 문구를 무슨 언어로 그릴지 정하려고.
   *
   * ★ 신원을 돌려주지 않는다. 화면이 필요한 것은 언어 하나뿐이고, 이름·이메일을
   *   내려보내면 쓰지도 않을 개인정보가 브라우저와 로그에 남는다.
   *
   * ★ `preferredLanguage` 는 없을 수 있다 (Entra `xms_pl` 이 "설정돼 있으면" 실린다).
   *   그때는 `null` 을 돌려주고, 화면이 Teams locale 로 떨어진다. 서버가 억지로
   *   기본값을 만들어 내려보내면 클라이언트가 더 나은 근거를 갖고도 못 쓰게 된다.
   */
  @Get('me')
  me(@Req() request: RequestWithEntraUser): { language: string | null } {
    const user = request.entraUser;
    if (!user) throw new BadRequestException('identity is missing');

    return { language: user.preferredLanguage ?? null };
  }

  @Post('search')
  search(
    @Body('text') text: unknown,
    @Body('history') history: unknown,
    @Req() request: RequestWithEntraUser,
    @Body('lang') lang?: unknown,
  ): Promise<AgentSearchResult> {
    const question = typeof text === 'string' ? text.trim() : '';
    if (!question || question.length > MAX_QUESTION_LENGTH) {
      throw new BadRequestException('text must be 1..2000 characters');
    }

    const priorTurns = parseHistory(history);

    // 가드를 통과했으면 반드시 있다. 없다면 가드 배선이 틀린 것이므로
    // 익명으로 뇌를 부르느니 여기서 터지는 게 낫다.
    const user = request.entraUser;
    if (!user) throw new BadRequestException('identity is missing');

    // ★ 요청 본문의 신원 비슷한 필드는 읽지 않는다. 토큰이 유일한 출처다.
    //   `lang` 은 예외가 아니다 — 신원이 아니라 표시 설정이고, 이 값으로 열리는
    //   데이터가 없다. 어느 법인의 문서를 볼지는 여전히 토큰의 tid 가 정한다.
    return this.agentService.search(question, user, priorTurns, parseLang(lang));
  }

  /**
   * 같은 검색을, 답이 쓰이는 대로.
   *
   * 검증은 `search` 와 **같은 함수들**을 쓴다. 상한과 규칙이 두 벌로 갈리면 한쪽으로만
   * 우회할 수 있게 된다 (스트리밍 경로로 21턴짜리 이력을 밀어넣는 식으로).
   *
   * ★ 실패를 두 갈래로 나눠야 한다. 첫 응답 **전**의 실패는 HTTP 상태로 알릴 수
   *   있으므로 예외를 그대로 던진다(502/503). 스트림이 열린 **뒤**의 실패는 이미
   *   200 이 나갔으므로 상태로 말할 수 없고, 뇌가 스트림 안에 `error` 줄을 넣는다.
   */
  @Post('search/stream')
  async searchStream(
    @Body('text') text: unknown,
    @Body('history') history: unknown,
    @Req() request: RequestWithEntraUser,
    @Res() response: StreamingResponse,
    @Body('lang') lang?: unknown,
  ): Promise<void> {
    const question = typeof text === 'string' ? text.trim() : '';
    if (!question || question.length > MAX_QUESTION_LENGTH) {
      throw new BadRequestException('text must be 1..2000 characters');
    }

    const priorTurns = parseHistory(history);

    const user = request.entraUser;
    if (!user) throw new BadRequestException('identity is missing');

    const stream = await this.agentService.searchStream(
      question,
      user,
      priorTurns,
      parseLang(lang),
    );

    response.setHeader('Content-Type', 'application/x-ndjson');
    response.setHeader('Cache-Control', 'no-store');
    // nginx 두 겹에 `proxy_buffering off` 가 들어가 있지만, 설정이 한 번 어긋나면
    // 스트리밍이 조용히 사라지고 증상은 "느려졌다"로만 보인다. 헤더로 한 겹 더.
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders?.();

    const reader = stream.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        response.write(value);
      }
      response.end();
    } catch (err) {
      // 여기까지 왔으면 헤더는 이미 나갔다. 상태 코드를 바꿀 수 없으므로 스트림 안에
      // 마지막 한 줄로 알리고 닫는다 — 조용히 끊으면 화면에는 "중간에 멈춘 답변"이 된다.
      this.logger.error(
        `스트림 중단: ${err instanceof Error ? err.message : String(err)}`,
      );
      response.write(`${JSON.stringify({ type: 'error', code: 'stream_broken' })}\n`);
      response.end();
    } finally {
      reader.releaseLock();
    }
  }
}
