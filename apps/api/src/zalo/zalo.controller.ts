import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Logger,
  Post,
} from '@nestjs/common';
import { ZaloService, type ZaloIncoming } from './zalo.service';

/**
 * Zalo 웹훅 페이로드 (bot.zapps.me/docs/webhook):
 *   { ok: true, result: { event_name, message: { message_id, date, text,
 *     from: { id, display_name, is_bot }, chat: { id, chat_type } } } }
 * chat_type 은 PRIVATE | GROUP(Beta). 스파이크는 DM 만 받는다.
 */
interface ZaloWebhookBody {
  result?: {
    event_name?: string;
    message?: {
      message_id?: string;
      text?: string;
      from?: { id?: string; is_bot?: boolean };
      chat?: { id?: string; chat_type?: string };
    };
  };
}

export function parseIncoming(body: unknown): ZaloIncoming | null {
  const result = (body as ZaloWebhookBody | null)?.result;
  if (!result || result.event_name !== 'message.text.received') return null;

  const message = result.message;
  const chatId = message?.chat?.id;
  const fromId = message?.from?.id;
  const text = typeof message?.text === 'string' ? message.text.trim() : '';

  if (!chatId || !fromId || !text) return null;
  if (message?.from?.is_bot) return null;
  if ((message?.chat?.chat_type ?? 'PRIVATE').toUpperCase() !== 'PRIVATE')
    return null;

  return {
    messageId: message?.message_id ?? '',
    chatId: String(chatId),
    fromId: String(fromId),
    text,
  };
}

// 이 컨트롤러에는 ServiceTokenGuard · EntraAuthGuard 를 걸지 않는다.
// 호출자는 Zalo 서버이고, 검증은 Zalo 가 보내는 시크릿 헤더로 한다.
@Controller('zalo')
export class ZaloController {
  private readonly logger = new Logger(ZaloController.name);

  constructor(private readonly zalo: ZaloService) {}

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
      // 사진·스티커·그룹 메시지는 조용히 200. 재전송을 유발하지 않는다
      return { ok: true };
    }

    // 200 을 먼저 돌려주고 처리는 뒤에서 한다. 실패는 로그로만 남긴다 —
    // 여기서 던지면 Zalo 가 재전송하고 같은 질문이 또 과금된다.
    void this.zalo.handle(incoming).catch((err: unknown) => {
      this.logger.error(
        `Zalo 처리 실패 chat=${incoming.chatId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    });

    return { ok: true };
  }
}
