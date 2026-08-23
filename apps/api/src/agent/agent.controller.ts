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

const MAX_QUESTION_LENGTH = 2000;

// 이력은 매 턴 통째로 재청구된다 — 길이를 클라이언트에 맡기지 않는다
const MAX_HISTORY_TURNS = 20;
const MAX_HISTORY_TEXT_LENGTH = 8000;

// apps/web/src/app/teams/_lib/i18n.ts 의 LANGUAGES 와 같아야 한다
const ALLOWED_LANGS = ['ko', 'vi', 'en'] as const;

// 모르는 값은 400 이 아니라 버린다 — 표시 설정 하나 때문에 검색이 실패하면 안 된다
function parseLang(raw: unknown): string | null {
  return typeof raw === 'string' &&
    (ALLOWED_LANGS as readonly string[]).includes(raw)
    ? raw
    : null;
}

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

    // 가드를 통과했으면 반드시 있다. 없으면 배선이 틀린 것이라 익명 호출보다 터지는 게 낫다
    const user = request.entraUser;
    if (!user) throw new BadRequestException('identity is missing');

    return this.agentService.search(question, user, priorTurns, parseLang(lang));
  }

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
    // nginx 설정이 한 번 어긋나면 스트리밍이 조용히 사라진다. 헤더로 한 겹 더 잠근다
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
      // 헤더가 이미 나갔으므로 상태 코드로는 못 알린다. 스트림 안에 마지막 한 줄로 알린다
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
