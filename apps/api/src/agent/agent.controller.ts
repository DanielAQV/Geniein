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
  Controller,
  Post,
  Req,
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

@Controller('agent')
@UseGuards(ServiceTokenGuard, EntraAuthGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('search')
  search(
    @Body('text') text: unknown,
    @Body('history') history: unknown,
    @Req() request: RequestWithEntraUser,
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
    return this.agentService.search(question, user, priorTurns);
  }
}
