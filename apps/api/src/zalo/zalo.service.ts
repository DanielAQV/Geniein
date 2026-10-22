import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { AgentService, type ChatTurn } from '../agent/agent.service';

/**
 * Zalo Bot Platform 으로 들어오는 DM 을 뇌에 넘기고 답을 돌려보내는 몸(입).
 *
 * 설계 원칙은 Teams 탭과 같다 — 몸은 얇게, 뇌는 두껍게. 여기에는 라우팅 판단이
 * 없고, 신원 확정 · 이력 보관 · 글자수 제한 · 전송만 있다.
 *
 * API 는 텔레그램 Bot API 를 본뜬 모양이다:
 *   POST https://bot-api.zapps.me/bot<TOKEN>/sendMessage  {chat_id, text}
 * 웹훅은 헤더 `X-Bot-Api-Secret-Token` 으로 검증한다 (bot.zapps.me/docs/webhook).
 */

// Zalo 가 받는 한 메시지 상한. 넘으면 잘라 보내고 콘솔 링크는 다음 단계에서 붙인다.
export const ZALO_TEXT_LIMIT = 2000;

// 이력은 메모리에만 둔다 — 스파이크다. 재기동하면 잊는다. 뇌는 20턴까지 받지만
// Zalo 는 짧은 문답이라 10턴이면 충분하고, 턴마다 재청구되는 토큰도 줄인다.
const MAX_HISTORY_TURNS = 10;
const MAX_TRACKED_CHATS = 500;
const MAX_SEEN_MESSAGE_IDS = 2000;

const DEFAULT_API_BASE = 'https://bot-api.zapps.me';

// 뇌가 못 답했을 때 보내는 한 줄. 직원 대부분이 베트남어라 베트남어가 앞이다.
const FALLBACK_TEXT =
  'Tạm thời chưa trả lời được, vui lòng thử lại sau ít phút.\n' +
  '지금은 답할 수 없습니다. 잠시 후 다시 물어봐 주세요.';

export interface ZaloIncoming {
  messageId: string;
  chatId: string;
  fromId: string;
  text: string;
}

interface ZaloEnvelope<T> {
  ok?: boolean;
  description?: string;
  result?: T;
}

@Injectable()
export class ZaloService {
  private readonly logger = new Logger(ZaloService.name);

  // chat.id → 평문 이력. 가장 오래 안 쓴 채팅부터 버린다 (Map 은 삽입 순서를 지킨다).
  private readonly histories = new Map<string, ChatTurn[]>();

  // Zalo 가 웹훅을 재전송해도 같은 질문을 두 번 뇌에 넣지 않는다 (= 두 번 과금하지 않는다).
  private readonly seen = new Set<string>();

  constructor(
    private readonly config: ConfigService,
    private readonly agent: AgentService,
  ) {}

  /** 웹훅 호출자가 우리 봇에 등록한 Zalo 인가. 설정이 없으면 열어두지 않고 막는다. */
  verifySecret(provided: unknown): boolean {
    const expected = (
      this.config.get<string>('ZALO_WEBHOOK_SECRET') ?? ''
    ).trim();
    if (!expected) {
      this.logger.error(
        'ZALO_WEBHOOK_SECRET 이 설정되지 않아 Zalo 웹훅을 차단합니다',
      );
      throw new ServiceUnavailableException('zalo webhook is not configured');
    }
    if (typeof provided !== 'string') return false;

    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /**
   * 한 메시지를 끝까지 처리한다: 뇌에 묻고 → Zalo 로 답한다.
   * 웹훅 응답과는 분리해서 돈다 — Zalo 는 빠른 200 을 원하고 뇌는 수 초를 쓴다.
   */
  async handle(incoming: ZaloIncoming): Promise<void> {
    if (this.alreadySeen(incoming.messageId)) {
      this.logger.log(`중복 웹훅 무시 message=${incoming.messageId}`);
      return;
    }

    const orgId = (this.config.get<string>('ZALO_ORG_ID') ?? '').trim();
    if (!orgId) {
      // org 없이 뇌를 부르면 KB 필터가 사라진다. 조용히 넘기지 않고 사람에게 알린다.
      this.logger.error('ZALO_ORG_ID 가 설정되지 않아 뇌를 부를 수 없습니다');
      await this.sendSafely(incoming.chatId, FALLBACK_TEXT);
      return;
    }

    const history = this.historyOf(incoming.chatId);
    let answer: string;
    try {
      const result = await this.agent.ask(
        incoming.text,
        {
          // Zalo 사용자 id 는 Entra oid 와 다른 체계다. 접두사로 출처를 남겨 두면
          // 나중에 신원 매핑 표(Entra ↔ Zalo ↔ Slack)를 붙일 때 충돌하지 않는다.
          internalUserId: `zalo:${incoming.fromId}`,
          orgId,
          locale: null,
        },
        history,
        null,
      );
      answer = result.text;
      this.remember(incoming.chatId, incoming.text, answer);
    } catch (err) {
      this.logger.error(
        `뇌 호출 실패 chat=${incoming.chatId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      answer = FALLBACK_TEXT;
    }

    await this.sendSafely(incoming.chatId, answer);
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    const { base, token } = this.requireBotConfig();
    const clipped = clipForZalo(text);

    let response: Response;
    try {
      response = await fetch(`${base}/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: clipped }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      throw new Error(
        `Zalo sendMessage 연결 실패: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    let body: ZaloEnvelope<unknown> | null = null;
    try {
      body = (await response.json()) as ZaloEnvelope<unknown>;
    } catch {
      // 본문이 JSON 이 아니면 상태 코드로만 판단한다
    }

    if (!response.ok || body?.ok === false) {
      // 토큰은 URL 에 있으므로 오류 문구에 URL 을 절대 싣지 않는다
      throw new Error(
        `Zalo sendMessage ${response.status}: ${body?.description ?? '(설명 없음)'}`,
      );
    }
  }

  private async sendSafely(chatId: string, text: string): Promise<void> {
    try {
      await this.sendMessage(chatId, text);
    } catch (err) {
      this.logger.error(err instanceof Error ? err.message : String(err));
    }
  }

  private requireBotConfig(): { base: string; token: string } {
    const token = (this.config.get<string>('ZALO_BOT_TOKEN') ?? '').trim();
    const base = (this.config.get<string>('ZALO_API_BASE') ?? DEFAULT_API_BASE)
      .trim()
      .replace(/\/+$/, '');
    if (!token) {
      this.logger.error(
        'ZALO_BOT_TOKEN 이 설정되지 않아 Zalo 로 보낼 수 없습니다',
      );
      throw new ServiceUnavailableException('zalo bot is not configured');
    }
    return { base, token };
  }

  private alreadySeen(messageId: string): boolean {
    if (!messageId) return false;
    if (this.seen.has(messageId)) return true;
    this.seen.add(messageId);
    if (this.seen.size > MAX_SEEN_MESSAGE_IDS) {
      // Set 도 삽입 순서를 지키므로 첫 원소가 가장 오래된 것이다
      for (const oldest of this.seen) {
        this.seen.delete(oldest);
        break;
      }
    }
    return false;
  }

  private historyOf(chatId: string): ChatTurn[] {
    const turns = this.histories.get(chatId);
    if (!turns) return [];
    // 최근 사용으로 올린다 — Map 삽입 순서가 곧 LRU 순서다
    this.histories.delete(chatId);
    this.histories.set(chatId, turns);
    return [...turns];
  }

  private remember(chatId: string, question: string, answer: string): void {
    const turns = this.historyOf(chatId);
    turns.push(
      { role: 'user', text: question },
      { role: 'assistant', text: answer },
    );
    while (turns.length > MAX_HISTORY_TURNS) turns.shift();
    this.histories.set(chatId, turns);

    while (this.histories.size > MAX_TRACKED_CHATS) {
      let evicted = false;
      for (const oldest of this.histories.keys()) {
        this.histories.delete(oldest);
        evicted = true;
        break;
      }
      if (!evicted) break;
    }
  }
}

/** Zalo 상한에 맞춰 자른다. 코드포인트 기준이라 베트남어 성조 문자가 반으로 갈리지 않는다. */
export function clipForZalo(text: string): string {
  const chars = Array.from(text);
  if (chars.length <= ZALO_TEXT_LIMIT) return text;
  return chars.slice(0, ZALO_TEXT_LIMIT - 1).join('') + '…';
}
