import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'node:crypto';
import { IsNull, Not, Repository } from 'typeorm';
import { ZaloService, type ZaloIncoming } from '../zalo.service';
import { ZaloOnboarding } from './onboarding.entity';
import { STEPS, WELCOME, fill } from './onboarding-steps';

const CODE_RE = /^\s*GENIE[-\s]?(\d{4})\s*$/i;

/** 날짜 문자열(YYYY-MM-DD) 사이의 일수. 시간대 흔들림 없게 UTC 자정끼리 뺀다. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** 베트남 시간(UTC+7) 기준 오늘. 서버는 KST 지만 직원 대부분이 베트남에 있다. */
export function todayVN(now = new Date()): string {
  return new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly zalo: ZaloService,
    @InjectRepository(ZaloOnboarding)
    private readonly rows: Repository<ZaloOnboarding>,
  ) {}

  async register(input: {
    name: string;
    team?: string | null;
    startDate: string;
  }): Promise<ZaloOnboarding> {
    for (let i = 0; i < 20; i += 1) {
      const code = `GENIE-${String(randomInt(0, 10_000)).padStart(4, '0')}`;
      if (await this.rows.findOne({ where: { code } })) continue;
      const saved = await this.rows.save(
        this.rows.create({
          code,
          name: input.name,
          team: input.team ?? null,
          startDate: input.startDate,
          zaloUserId: null,
          linkedAt: null,
          stepsSent: 0,
        }),
      );
      this.logger.log(
        `온보딩 등록 ${saved.code} ${saved.name} (${saved.team ?? '-'}) 입사 ${saved.startDate}`,
      );
      return saved;
    }
    throw new Error('온보딩 코드를 만들지 못했습니다');
  }

  list(): Promise<ZaloOnboarding[]> {
    return this.rows.find({ order: { createdAt: 'DESC' } });
  }

  /**
   * 들어온 DM 이 온보딩 코드면 연결하고 true. 아니면 false (보통 질문 → 뇌로).
   * 코드 처리는 LLM 을 부르지 않는다 — 정해진 문장만 보낸다.
   */
  async tryLink(incoming: ZaloIncoming, today = todayVN()): Promise<boolean> {
    const m = CODE_RE.exec(incoming.text);
    if (!m) return false;

    const code = `GENIE-${m[1]}`;
    const row = await this.rows.findOne({ where: { code } });
    if (!row) {
      await this.zalo.touch(incoming);
      await this.safeSend(
        incoming.chatId,
        'Mã không đúng. Vui lòng kiểm tra lại với bộ phận Admin.\nThe code is not valid. Please check with the Admin team.',
      );
      return true;
    }
    if (row.zaloUserId && row.zaloUserId !== incoming.fromId) {
      // 이미 다른 계정에 연결된 코드다. 남의 신원을 가져가지 못하게 한다.
      this.logger.warn(
        `온보딩 코드 재사용 시도 ${code} by zalo=${incoming.fromId}`,
      );
      await this.safeSend(
        incoming.chatId,
        'Mã này đã được sử dụng. Vui lòng liên hệ bộ phận Admin.\nThis code has already been used. Please contact the Admin team.',
      );
      return true;
    }

    await this.zalo.touch(incoming);
    const first = !row.zaloUserId;
    row.zaloUserId = incoming.fromId;
    row.linkedAt ??= new Date();
    await this.rows.save(row);

    await this.safeSend(incoming.chatId, fill(WELCOME, row));
    await this.sendDue(row, today, { latestOnly: true });

    if (first)
      await this.tellHr(
        `✅ ${row.name}${row.team ? ` (${row.team})` : ''} đã kết nối Genie — ${code}`,
      );
    return true;
  }

  /** 매일 한 번 (cron). 연결된 신입마다 기한이 된 단계를 보낸다. */
  async tick(today = todayVN()): Promise<{ checked: number; sent: number }> {
    const linked = await this.rows.find({
      where: { zaloUserId: Not(IsNull()) },
    });
    let sent = 0;
    for (const row of linked) {
      if (row.stepsSent >= STEPS.length) continue;
      sent += await this.sendDue(row, today, { latestOnly: false });
    }
    this.logger.log(
      `온보딩 tick ${today}: ${linked.length}명 확인, ${sent}건 발송`,
    );
    return { checked: linked.length, sent };
  }

  /**
   * 기한이 된 단계를 보낸다. 늦게 연결된 사람에게 밀린 단계를 한꺼번에 퍼붓지 않도록,
   * latestOnly 면 가장 최근 하나만 보내고 그 앞은 보낸 것으로 친다.
   */
  private async sendDue(
    row: ZaloOnboarding,
    today: string,
    { latestOnly }: { latestOnly: boolean },
  ): Promise<number> {
    const elapsed = daysBetween(row.startDate, today);
    const due = STEPS.map((s, i) => ({ s, i })).filter(
      ({ s, i }) => i >= row.stepsSent && s.day <= elapsed,
    );
    if (!due.length || !row.zaloUserId) return 0;

    const targets = latestOnly ? [due[due.length - 1]] : due;
    let sent = 0;
    for (const { s } of targets) {
      const res = await this.zalo.notify(row.zaloUserId, {
        text: fill(s.text, row),
      });
      if (res[0]?.delivered) sent += 1;
      else break;
    }
    if (sent) {
      row.stepsSent = due[0].i + (latestOnly ? due.length : sent);
      await this.rows.save(row);
    }
    return sent;
  }

  private async tellHr(text: string): Promise<void> {
    const ids = (this.config.get<string>('ZALO_HR_IDS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.length) return;
    await this.zalo.notify(ids, { text });
  }

  private async safeSend(chatId: string, text: string): Promise<void> {
    try {
      await this.zalo.send(chatId, { text });
    } catch (err) {
      this.logger.error(err instanceof Error ? err.message : String(err));
    }
  }
}
