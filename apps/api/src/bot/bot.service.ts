/**
 * 마이키의 봇 채널.
 *
 * 두 방향이 다 여기를 지난다:
 *   들어옴  사용자가 봇에게 말한다 → 뇌에 물어 답한다
 *   나감    시스템이 먼저 말을 건다 (`notify`) → 저장해 둔 손잡이로 이어 붙인다
 *
 * ★ 신원은 **활동에서** 온다. 봇 프레임워크가 서명을 검증한 활동만 여기 도달하므로
 *   `activity.from.aadObjectId` 와 `channelData.tenant.id` 는 서버가 확정한 값이다.
 *   요청 본문에 담겨 온 신원 비슷한 값은 쳐다보지 않는다 (설계문서 원칙③).
 *
 * ★ 자격증명이 없으면 **조용히 꺼진다.** 봇을 아직 안 만든 환경에서 게이트웨이가
 *   안 뜨면 안 된다 — 탭은 봇 없이도 돌아야 한다.
 */

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  TurnContext,
  type Activity,
  type ConversationReference,
} from 'botbuilder';
import { AgentService } from '../agent/agent.service';
import type { EntraUser } from '../common/guards/entra-auth.guard';
import { BotConversation, MAX_BOT_TURNS } from './bot-conversation.entity';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private readonly adapter: CloudAdapter | null;
  private readonly appId: string;

  constructor(
    private readonly config: ConfigService,
    private readonly agent: AgentService,
    @InjectRepository(BotConversation)
    private readonly conversations: Repository<BotConversation>,
  ) {
    this.appId = this.config.get<string>('MICROSOFT_APP_ID') ?? '';
    const password = this.config.get<string>('MICROSOFT_APP_PASSWORD') ?? '';

    if (!this.appId || !password) {
      this.logger.warn(
        'MICROSOFT_APP_ID/PASSWORD 가 없어 봇 채널을 비활성화합니다 (탭은 그대로 동작)',
      );
      this.adapter = null;
      return;
    }

    const auth = new ConfigurationBotFrameworkAuthentication({
      MicrosoftAppId: this.appId,
      MicrosoftAppPassword: password,
      // 다중 테넌트 봇이다 — 등록은 geniein 에 있고 쓰는 곳은 AQV 다.
      MicrosoftAppType: this.config.get<string>('MICROSOFT_APP_TYPE') ?? 'MultiTenant',
      MicrosoftAppTenantId: this.config.get<string>('MICROSOFT_APP_TENANT_ID') ?? '',
    });

    this.adapter = new CloudAdapter(auth);
    this.adapter.onTurnError = async (context, error) => {
      // 사용자에게는 무슨 일이 있었는지만 알린다. 스택은 우리가 들고 있는다.
      this.logger.error(`봇 턴 실패: ${error}`, (error as Error)?.stack);
      await context.sendActivity('처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    };

    this.logger.log(`봇 채널 활성 — appId=${this.appId.slice(0, 8)}…`);
  }

  get enabled(): boolean {
    return this.adapter !== null;
  }

  /** Bot Framework 가 두드리는 지점. 요청/응답을 SDK 에 그대로 넘긴다. */
  async process(req: unknown, res: unknown): Promise<void> {
    if (!this.adapter) {
      throw new ServiceUnavailableException('봇 채널이 설정되지 않았습니다');
    }
    await this.adapter.process(req as never, res as never, (context) =>
      this.onTurn(context),
    );
  }

  private async onTurn(context: TurnContext): Promise<void> {
    const activity = context.activity;
    const identity = this.identityOf(activity);

    // 어떤 활동이든 손잡이는 최신으로 갱신한다. 설치·첫 인사·메시지 모두가 기회다.
    if (identity) {
      await this.remember(identity, TurnContext.getConversationReference(activity));
    }

    if (activity.type !== 'message' || !activity.text?.trim()) return;
    if (!identity) {
      // 신원을 확정할 수 없으면 답하지 않는다. 어느 법인의 문서를 볼지 정할 수 없다.
      await context.sendActivity('계정을 확인할 수 없어 답변할 수 없습니다.');
      return;
    }

    const row = await this.conversations.findOne({ where: identity });
    const history = row?.recentTurns ?? [];

    const user: EntraUser = {
      tenantId: identity.tenantId,
      objectId: identity.objectId,
      internalUserId: `${identity.tenantId}:${identity.objectId}`,
      displayName: activity.from?.name,
      preferredLanguage: activity.locale ?? undefined,
    };

    const question = activity.text.trim();
    // 뇌가 도구를 돌고 LLM 을 부르는 동안 사용자는 아무것도 못 본다. 타이핑 표시가
    // 그 공백을 메운다 — 답이 늦는 것과 죽은 것은 다르다는 것을 알려야 한다.
    await context.sendActivity({ type: 'typing' });

    const answer = await this.agent.search(question, user, history, null);
    await context.sendActivity(answer.text);

    await this.appendTurns(identity, history, [
      { role: 'user', text: question },
      { role: 'assistant', text: answer.text },
    ]);
  }

  /**
   * 먼저 말 걸기. 손잡이가 없으면 **아무 일도 하지 않는다** — 예외를 던지지 않는 것이
   * 의도다. 아직 앱을 설치하지 않은 사람이 있다는 것은 오류가 아니라 정상 상태고,
   * 그 사람 때문에 알림 배치 전체가 실패하면 안 된다.
   */
  async notify(
    tenantId: string,
    objectId: string,
    message: string | Partial<Activity>,
  ): Promise<boolean> {
    if (!this.adapter) return false;

    const row = await this.conversations.findOne({ where: { tenantId, objectId } });
    if (!row) {
      this.logger.log(`선제 발신 건너뜀 — 손잡이 없음 user=${objectId.slice(0, 8)}…`);
      return false;
    }

    await this.adapter.continueConversationAsync(
      this.appId,
      row.reference as unknown as ConversationReference,
      async (context) => {
        await context.sendActivity(message as never);
      },
    );
    return true;
  }

  // ── 내부 ────────────────────────────────────────────────────────

  private identityOf(
    activity: Activity,
  ): { tenantId: string; objectId: string } | null {
    const tenantId = (activity.channelData as { tenant?: { id?: string } } | undefined)
      ?.tenant?.id;
    const objectId = activity.from?.aadObjectId;
    return tenantId && objectId ? { tenantId, objectId } : null;
  }

  private async remember(
    identity: { tenantId: string; objectId: string },
    reference: Partial<ConversationReference>,
  ): Promise<void> {
    await this.conversations.upsert(
      {
        ...identity,
        // TypeORM 은 jsonb 컬럼도 "부분 갱신할 수 있는 객체"로 보려 해서 SDK 타입이
        // 그대로 들어가지 않는다. 통째로 덮어쓰는 게 맞으므로 여기서 끊는다.
        reference: reference as never,
      },
      { conflictPaths: ['tenantId', 'objectId'], skipUpdateIfNoValuesChanged: true },
    );
  }

  private async appendTurns(
    identity: { tenantId: string; objectId: string },
    history: { role: 'user' | 'assistant'; text: string }[],
    added: { role: 'user' | 'assistant'; text: string }[],
  ): Promise<void> {
    const next = [...history, ...added].slice(-MAX_BOT_TURNS);
    await this.conversations.update(identity, { recentTurns: next });
  }
}
