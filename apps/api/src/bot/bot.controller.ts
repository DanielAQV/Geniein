/**
 * 봇 수신 지점과 선제 발신 지점.
 *
 * ★ `/bot/messages` 에는 **가드를 걸지 않는다.** 부르는 쪽이 Bot Framework 서비스라
 *   우리 서비스 토큰도, Entra 사용자 토큰도 갖고 있지 않다. 대신 SDK 가 활동에
 *   실려 온 JWT 를 검증한다 — 인증이 없는 게 아니라 **다른 곳에서** 일어난다.
 *   여기에 ServiceTokenGuard 를 붙이면 봇은 한 통도 못 받는다.
 *
 * ★ `/bot/notify` 는 반대다. 우리 뒷단(플로우 → 게이트웨이)만 부르므로 서비스
 *   토큰으로 막는다. 이 문이 열려 있으면 아무나 마이키 이름으로 직원에게 말을
 *   걸 수 있다 — 봇에서 가장 위험한 표면이다.
 */

import {
  Body,
  Controller,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { BotService } from './bot.service';
import { ServiceTokenGuard } from '../common/guards/service-token.guard';

@Controller('bot')
export class BotController {
  private readonly logger = new Logger(BotController.name);

  constructor(private readonly bot: BotService) {}

  @Post('messages')
  async messages(@Req() req: unknown, @Res() res: unknown): Promise<void> {
    await this.bot.process(req, res);
  }

  @Post('notify')
  @UseGuards(ServiceTokenGuard)
  async notify(
    @Body() body: { tenantId?: string; objectId?: string; text?: string },
  ): Promise<{ delivered: boolean }> {
    const { tenantId, objectId, text } = body ?? {};
    if (!tenantId || !objectId || !text?.trim()) {
      return { delivered: false };
    }
    const delivered = await this.bot.notify(tenantId, objectId, text);
    return { delivered };
  }
}
