import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { timingSafeEqual } from 'node:crypto';
import { Repository } from 'typeorm';
import { AgentService } from '../agent/agent.service';
import {
  MAX_ZALO_TURNS,
  ZaloContact,
  type ZaloTurn,
} from './zalo-contact.entity';

/**
 * Zalo Bot Platform 몸(입). 두 방향이다.
 *
 *   들어옴  사용자 DM → 뇌 → 답장                      handle()
 *   나감    뒷단이 먼저 말을 건다 (사람·사진·전체)       notify()
 *
 * 설계 원칙은 Teams 탭·봇과 같다 — 몸은 얇게, 뇌는 두껍게. 여기에는 라우팅 판단이
 * 없고, 신원 확정 · 손잡이 저장 · 이력 · 글자수 제한 · 전송만 있다.
 *
 * API 는 텔레그램 Bot API 를 본뜬 모양이다 (bot.zapps.me/docs):
 *   POST https://bot-api.zapps.me/bot<TOKEN>/sendMessage  {chat_id, text}
 *   POST https://bot-api.zapps.me/bot<TOKEN>/sendPhoto    {chat_id, photo(URL), caption}
 * 웹훅은 헤더 `X-Bot-Api-Secret-Token` 으로 검증한다.
 */

// Zalo 가 받는 한 메시지 상한. 넘으면 잘라 보내고 콘솔 링크는 다음 단계에서 붙인다.
export const ZALO_TEXT_LIMIT = 2000;

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
  displayName: string | null;
  text: string;
}

export interface ZaloOutgoing {
  text?: string;
  photoUrl?: string;
  caption?: string;
}

export interface ZaloDelivery {
  to: string;
  displayName: string | null;
  delivered: boolean;
  error?: string;
}

interface ZaloEnvelope<T> {
  ok?: boolean;
  description?: string;
  result?: T;
}

@Injectable()
export class ZaloService {
  private readonly logger = new Logger(ZaloService.name);

  // Zalo 가 웹훅을 재전송해도 같은 질문을 두 번 뇌에 넣지 않는다 (= 두 번 과금하지 않는다).
  private readonly seen = new Set<string>();

  constructor(
    private readonly config: ConfigService,
    private readonly agent: AgentService,
    @InjectRepository(ZaloContact)
    private readonly contacts: Repository<ZaloContact>,
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
   * 한 메시지를 끝까지 처리한다: 손잡이 저장 → 뇌에 묻고 → Zalo 로 답한다.
   * 웹훅 응답과는 분리해서 돈다 — Zalo 는 빠른 200 을 원하고 뇌는 수 초를 쓴다.
   */
  async handle(incoming: ZaloIncoming): Promise<void> {
    if (this.alreadySeen(incoming.messageId)) {
      this.logger.log(`중복 웹훅 무시 message=${incoming.messageId}`);
      return;
    }

    // 말을 걸어온 순간이 손잡이를 얻는 유일한 순간이다. 뇌 호출보다 먼저 저장한다.
    const contact = await this.touch(incoming);

    const orgId = (this.config.get<string>('ZALO_ORG_ID') ?? '').trim();
    if (!orgId) {
      // org 없이 뇌를 부르면 KB 필터가 사라진다. 조용히 넘기지 않고 사람에게 알린다.
      this.logger.error('ZALO_ORG_ID 가 설정되지 않아 뇌를 부를 수 없습니다');
      await this.sendSafely(incoming.chatId, { text: FALLBACK_TEXT });
      return;
    }

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
        contact.recentTurns,
        null,
      );
      answer = result.text;
      await this.remember(contact, incoming.text, answer);
    } catch (err) {
      this.logger.error(
        `뇌 호출 실패 chat=${incoming.chatId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      answer = FALLBACK_TEXT;
    }

    await this.sendSafely(incoming.chatId, { text: answer });
  }

  /**
   * 먼저 말을 건다. `to` 는 zalo_user_id 하나, 여럿, 또는 'all'(말 걸어온 전원).
   * 모르는 사람에게는 보낼 수 없다 — 손잡이가 없는 id 는 결과에 delivered=false 로 남긴다.
   */
  async notify(
    to: string | string[],
    message: ZaloOutgoing,
  ): Promise<ZaloDelivery[]> {
    const targets = await this.resolve(to);
    const out: ZaloDelivery[] = [];
    for (const t of targets) {
      if (!t.contact) {
        out.push({
          to: t.id,
          displayName: null,
          delivered: false,
          error: '손잡이 없음 — 이 사람이 먼저 봇에게 말을 건 적이 없습니다',
        });
        continue;
      }
      try {
        await this.send(t.contact.chatId, message);
        if (message.text) {
          // 먼저 건 말도 대화의 일부다. 다음 질문에서 뇌가 그 맥락을 안다.
          await this.remember(t.contact, null, message.text);
        }
        out.push({
          to: t.id,
          displayName: t.contact.displayName,
          delivered: true,
        });
      } catch (err) {
        out.push({
          to: t.id,
          displayName: t.contact.displayName,
          delivered: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    this.logger.log(
      `선제 발신 ${out.filter((d) => d.delivered).length}/${out.length} 건 (text=${message.text ? message.text.length : 0}자${message.photoUrl ? ', photo' : ''})`,
    );
    return out;
  }

  async listContacts(): Promise<
    { zaloUserId: string; displayName: string | null; lastSeenAt: Date }[]
  > {
    const rows = await this.contacts.find({ order: { lastSeenAt: 'DESC' } });
    return rows.map((r) => ({
      zaloUserId: r.zaloUserId,
      displayName: r.displayName,
      lastSeenAt: r.lastSeenAt,
    }));
  }

  /** 텍스트·사진 중 있는 것을 보낸다. 둘 다 있으면 사진(캡션) 뒤에 텍스트. */
  async send(chatId: string, message: ZaloOutgoing): Promise<void> {
    if (!message.text && !message.photoUrl) {
      throw new Error('보낼 내용이 없습니다 (text 또는 photoUrl)');
    }
    if (message.photoUrl) {
      await this.call('sendPhoto', {
        chat_id: chatId,
        photo: message.photoUrl,
        caption: message.caption ? clipForZalo(message.caption) : undefined,
      });
    }
    if (message.text) {
      await this.call('sendMessage', {
        chat_id: chatId,
        text: clipForZalo(message.text),
      });
    }
  }

  private async call(
    method: 'sendMessage' | 'sendPhoto',
    body: Record<string, unknown>,
  ): Promise<void> {
    const { base, token } = this.requireBotConfig();

    let response: Response;
    try {
      response = await fetch(`${base}/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      throw new Error(
        `Zalo ${method} 연결 실패: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    let parsed: ZaloEnvelope<unknown> | null = null;
    try {
      parsed = (await response.json()) as ZaloEnvelope<unknown>;
    } catch {
      // 본문이 JSON 이 아니면 상태 코드로만 판단한다
    }

    if (!response.ok || parsed?.ok === false) {
      // 토큰은 URL 에 있으므로 오류 문구에 URL 을 절대 싣지 않는다
      throw new Error(
        `Zalo ${method} ${response.status}: ${parsed?.description ?? '(설명 없음)'}`,
      );
    }
  }

  private async sendSafely(
    chatId: string,
    message: ZaloOutgoing,
  ): Promise<void> {
    try {
      await this.send(chatId, message);
    } catch (err) {
      this.logger.error(err instanceof Error ? err.message : String(err));
    }
  }

  private async resolve(
    to: string | string[],
  ): Promise<{ id: string; contact: ZaloContact | null }[]> {
    if (to === 'all') {
      const all = await this.contacts.find();
      return all.map((c) => ({ id: c.zaloUserId, contact: c }));
    }
    const ids = Array.from(
      new Set(
        (Array.isArray(to) ? to : [to]).map((s) => s.trim()).filter(Boolean),
      ),
    );
    const out: { id: string; contact: ZaloContact | null }[] = [];
    for (const id of ids) {
      out.push({
        id,
        contact: await this.contacts.findOne({ where: { zaloUserId: id } }),
      });
    }
    return out;
  }

  private async touch(incoming: ZaloIncoming): Promise<ZaloContact> {
    const existing = await this.contacts.findOne({
      where: { zaloUserId: incoming.fromId },
    });
    if (existing) {
      existing.chatId = incoming.chatId;
      if (incoming.displayName) existing.displayName = incoming.displayName;
      existing.lastSeenAt = new Date();
      return this.contacts.save(existing);
    }
    this.logger.log(
      `새 손잡이 zalo=${incoming.fromId} name=${incoming.displayName ?? '-'}`,
    );
    return this.contacts.save(
      this.contacts.create({
        zaloUserId: incoming.fromId,
        chatId: incoming.chatId,
        displayName: incoming.displayName,
        recentTurns: [],
        lastSeenAt: new Date(),
      }),
    );
  }

  private async remember(
    contact: ZaloContact,
    question: string | null,
    answer: string,
  ): Promise<void> {
    const turns: ZaloTurn[] = [...(contact.recentTurns ?? [])];
    if (question) turns.push({ role: 'user', text: question });
    turns.push({ role: 'assistant', text: answer });
    while (turns.length > MAX_ZALO_TURNS) turns.shift();
    contact.recentTurns = turns;
    await this.contacts.save(contact);
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
}

/** Zalo 상한에 맞춰 자른다. 코드포인트 기준이라 베트남어 성조 문자가 반으로 갈리지 않는다. */
export function clipForZalo(text: string): string {
  const chars = Array.from(text);
  if (chars.length <= ZALO_TEXT_LIMIT) return text;
  return chars.slice(0, ZALO_TEXT_LIMIT - 1).join('') + '…';
}
