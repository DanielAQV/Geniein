import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentModule } from '../agent/agent.module';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { BotConversation } from './bot-conversation.entity';

/**
 * 봇 채널. 탭(AgentModule)과 달리 **상태를 갖는다** — 선제 발신은 손잡이를
 * 기억해야만 성립하기 때문이다.
 *
 * 이 표는 TypeORM 마이그레이션이 소유한다 (`ai_posts` 와 같은 규칙). 뇌가 쓰지
 * 않는 표라서 `db/init/*.sql` 로 갈 이유가 없다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([BotConversation]), AgentModule],
  controllers: [BotController],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
