import { Module } from '@nestjs/common';
import { AgentService } from '../agent/agent.service';
import { ZaloController } from './zalo.controller';
import { ZaloService } from './zalo.service';

@Module({
  controllers: [ZaloController],
  providers: [ZaloService, AgentService],
})
export class ZaloModule {}
