import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentService } from '../agent/agent.service';
import { ZaloContact } from './zalo-contact.entity';
import { ZaloOnboarding } from './onboarding/onboarding.entity';
import { OnboardingService } from './onboarding/onboarding.service';
import { ZaloController } from './zalo.controller';
import { ZaloService } from './zalo.service';

/**
 * Zalo 채널. 봇 채널(BotModule)과 같은 이유로 **상태를 갖는다** — 먼저 말을
 * 걸려면 손잡이(zalo_contacts)를 기억해야 한다. 표는 TypeORM 마이그레이션이 소유한다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ZaloContact, ZaloOnboarding])],
  controllers: [ZaloController],
  providers: [ZaloService, OnboardingService, AgentService],
  exports: [ZaloService],
})
export class ZaloModule {}
