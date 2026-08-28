import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

/**
 * Teams 탭 → 뇌 경로. 상태를 갖지 않는다 (TypeOrmModule 을 import 하지 않는다) —
 * 대화 이력은 아직 없고, 생기면 뇌 쪽 스키마가 소유한다 (db/init/02-knowledge.sql 의
 * "소유권" 주석과 같은 규칙).
 */
@Module({
  controllers: [AgentController],
  providers: [AgentService],
  // 봇 채널도 같은 뇌를 부른다 — 경로가 둘이어도 뇌를 부르는 방법은 하나여야 한다
  exports: [AgentService],
})
export class AgentModule {}
