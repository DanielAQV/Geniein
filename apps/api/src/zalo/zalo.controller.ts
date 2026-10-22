import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ServiceTokenGuard } from '../common/guards/service-token.guard';
import {
  ZaloService,
  type ZaloDelivery,
  type ZaloIncoming,
} from './zalo.service';

/**
 * Zalo 웹훅 페이로드. 문서(bot.zapps.me/docs/webhook)는 `{ok, result:{…}}` 로 싸여
 * 온다고 하지만 실측(2026-10-22)은 `{event_name, message}` 가 맨 바깥이다. 둘 다 받는다.
 *   message: { message_id, date, text, from: { id, display_name, is_bot },
 *              chat: { id, chat_type: PRIVATE | GROUP(Beta) } }
 */
interface ZaloWebhookBody {
  event_name?: string;
  message?: {
    message_id?: string;
    text?: string;
    from?: { id?: string; display_name?: string; is_bot?: boolean };
    chat?: { id?: string; chat_type?: string };
  };
  result?: ZaloWebhookBody;
}

export function parseIncoming(body: unknown): ZaloIncoming | null {
  const outer = body as ZaloWebhookBody | null;
  const result = outer?.result ?? outer;
  if (!result || result.event_name !== 'message.text.received') return null;

  const message = result.message;
  const chatId = message?.chat?.id;
  const fromId = message?.from?.id;
  const text = typeof message?.text === 'string' ? message.text.trim() : '';

  if (!chatId || !fromId || !text) return null;
  if (message?.from?.is_bot) return null;
  if ((message?.chat?.chat_type ?? 'PRIVATE').toUpperCase() !== 'PRIVATE')
    return null;

  const name = message?.from?.display_name;
  return {
    messageId: message?.message_id ?? '',
    chatId: String(chatId),
    fromId: String(fromId),
    displayName: typeof name === 'string' && name.trim() ? name.trim() : null,
    text,
  };
}

const MAX_NOTIFY_TEXT = 4000;

export interface NotifyBody {
  /** zalo_user_id 하나, 여럿, 또는 'all' */
  to?: unknown;
  text?: unknown;
  photo_url?: unknown;
  caption?: unknown;
}

function parseNotify(body: NotifyBody | null | undefined): {
  to: string | string[];
  text?: string;
  photoUrl?: string;
  caption?: string;
} {
  const to = body?.to;
  const toOk =
    (typeof to === 'string' && to.trim()) ||
    (Array.isArray(to) &&
      to.length > 0 &&
      to.every((x) => typeof x === 'string'));
  if (!toOk)
    throw new BadRequestException(
      'to must be a zalo user id, a list, or "all"',
    );

  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const photoUrl =
    typeof body?.photo_url === 'string' ? body.photo_url.trim() : '';
  const caption = typeof body?.caption === 'string' ? body.caption.trim() : '';

  if (!text && !photoUrl)
    throw new BadRequestException('text or photo_url is required');
  if (text.length > MAX_NOTIFY_TEXT)
    throw new BadRequestException(
      `text must be at most ${MAX_NOTIFY_TEXT} characters`,
    );
  if (photoUrl && !/^https:\/\//.test(photoUrl))
    throw new BadRequestException('photo_url must be an https URL');

  return {
    to: typeof to === 'string' ? to.trim() : to,
    text: text || undefined,
    photoUrl: photoUrl || undefined,
    caption: caption || undefined,
  };
}

@Controller('zalo')
export class ZaloController {
  private readonly logger = new Logger(ZaloController.name);

  constructor(private readonly zalo: ZaloService) {}

  /**
   * 들어옴. 가드 없음 — 호출자는 Zalo 서버이고 검증은 Zalo 가 보내는 시크릿 헤더로 한다.
   */
  @Post('webhook')
  @HttpCode(200)
  webhook(
    @Headers('x-bot-api-secret-token') secret: unknown,
    @Body() body: unknown,
  ): { ok: true } {
    if (!this.zalo.verifySecret(secret)) {
      throw new ForbiddenException();
    }

    const incoming = parseIncoming(body);
    if (!incoming) {
      // 사진·스티커·그룹 메시지는 200 으로 받되, 무엇을 걸렀는지는 남긴다 —
      // 페이로드 모양이 문서와 다를 때 여기 말고는 볼 곳이 없다. 본문은 잘라서.
      this.logger.warn(`Zalo 웹훅 무시: ${JSON.stringify(body).slice(0, 800)}`);
      return { ok: true };
    }

    this.logger.log(
      `Zalo DM 수신 chat=${incoming.chatId} from=${incoming.fromId} len=${incoming.text.length}`,
    );

    // 200 을 먼저 돌려주고 처리는 뒤에서 한다. 실패는 로그로만 남긴다 —
    // 여기서 던지면 Zalo 가 재전송하고 같은 질문이 또 과금된다.
    void this.zalo.handle(incoming).catch((err: unknown) => {
      this.logger.error(
        `Zalo 처리 실패 chat=${incoming.chatId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    });

    return { ok: true };
  }

  /**
   * 나감 — 먼저 말 걸기. 우리 뒷단만 부르므로 서비스 토큰으로 막는다.
   * ★ 이 문이 열려 있으면 아무나 Genie 이름으로 직원에게 말을 걸 수 있다. 가장 위험한 표면이다.
   */
  @Post('notify')
  @UseGuards(ServiceTokenGuard)
  async notify(
    @Body() body: NotifyBody,
  ): Promise<{ delivered: number; total: number; results: ZaloDelivery[] }> {
    const { to, text, photoUrl, caption } = parseNotify(body);
    const results = await this.zalo.notify(to, { text, photoUrl, caption });
    return {
      delivered: results.filter((r) => r.delivered).length,
      total: results.length,
      results,
    };
  }

  /** 말 걸 수 있는 사람 목록. 운영 확인용. */
  @Get('contacts')
  @UseGuards(ServiceTokenGuard)
  contacts() {
    return this.zalo.listContacts();
  }
}
