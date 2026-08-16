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

@Controller('agent')
@UseGuards(ServiceTokenGuard, EntraAuthGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('search')
  search(
    @Body('text') text: unknown,
    @Req() request: RequestWithEntraUser,
  ): Promise<AgentSearchResult> {
    const question = typeof text === 'string' ? text.trim() : '';
    if (!question || question.length > MAX_QUESTION_LENGTH) {
      throw new BadRequestException('text must be 1..2000 characters');
    }

    // 가드를 통과했으면 반드시 있다. 없다면 가드 배선이 틀린 것이므로
    // 익명으로 뇌를 부르느니 여기서 터지는 게 낫다.
    const user = request.entraUser;
    if (!user) throw new BadRequestException('identity is missing');

    // ★ 요청 본문의 신원 비슷한 필드는 읽지 않는다. 토큰이 유일한 출처다.
    return this.agentService.search(question, user);
  }
}
