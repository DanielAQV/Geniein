import { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import type { ZaloIncoming, ZaloService } from '../zalo.service';
import { ZaloOnboarding } from './onboarding.entity';
import { OnboardingService, daysBetween, todayVN } from './onboarding.service';
import { STEPS } from './onboarding-steps';

function memoryRepo() {
  const rows: ZaloOnboarding[] = [];
  const match = (r: ZaloOnboarding, where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) =>
      typeof v === 'object' && v !== null
        ? (r as unknown as Record<string, unknown>)[k] != null // Not(IsNull())
        : (r as unknown as Record<string, unknown>)[k] === v,
    );
  const repo = {
    create: (d: Partial<ZaloOnboarding>) =>
      Object.assign(new ZaloOnboarding(), d),
    save: (r: ZaloOnboarding) => {
      if (!rows.includes(r)) {
        r.id = `id-${rows.length}`;
        r.createdAt = new Date();
        rows.push(r);
      }
      return Promise.resolve(r);
    },
    findOne: ({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(rows.find((r) => match(r, where)) ?? null),
    find: (opts?: { where?: Record<string, unknown> }) =>
      Promise.resolve(
        opts?.where ? rows.filter((r) => match(r, opts.where!)) : [...rows],
      ),
  };
  return { repo: repo as unknown as Repository<ZaloOnboarding>, rows };
}

const sent: { kind: string; to: unknown; text: string }[] = [];
const zalo = {
  touch: jest.fn(() => Promise.resolve({})),
  send: jest.fn((chatId: string, m: { text: string }) => {
    sent.push({ kind: 'send', to: chatId, text: m.text });
    return Promise.resolve();
  }),
  notify: jest.fn((to: unknown, m: { text: string }) => {
    sent.push({ kind: 'notify', to, text: m.text });
    return Promise.resolve([
      { to: String(to), displayName: null, delivered: true },
    ]);
  }),
} as unknown as ZaloService;

function build(env: Record<string, string> = { ZALO_HR_IDS: 'hr-1' }) {
  const config = { get: (k: string) => env[k] } as unknown as ConfigService;
  const { repo, rows } = memoryRepo();
  return { svc: new OnboardingService(config, zalo, repo), rows };
}

function dm(text: string, fromId = 'z-1'): ZaloIncoming {
  return {
    messageId: `m-${Math.random()}`,
    chatId: fromId,
    fromId,
    displayName: 'Nghia',
    text,
  };
}

beforeEach(() => {
  sent.length = 0;
  jest.clearAllMocks();
});

describe('날짜', () => {
  it('daysBetween 은 날짜 차이, todayVN 은 UTC+7', () => {
    expect(daysBetween('2026-11-01', '2026-11-03')).toBe(2);
    expect(todayVN(new Date('2026-10-22T18:00:00Z'))).toBe('2026-10-23');
  });
});

describe('OnboardingService', () => {
  it('등록하면 GENIE-0000 코드가 나온다', async () => {
    const { svc } = build();
    const row = await svc.register({
      name: 'Nghia',
      team: 'Platform',
      startDate: '2026-11-01',
    });
    expect(row.code).toMatch(/^GENIE-\d{4}$/);
    expect(row.zaloUserId).toBeNull();
  });

  it('코드가 아닌 말은 false (뇌로 간다)', async () => {
    const { svc } = build();
    expect(await svc.tryLink(dm('Phụ cấp công tác?'))).toBe(false);
    expect(sent).toHaveLength(0);
  });

  it('입사 전에 연결하면 환영만, HR 에게 알림', async () => {
    const { svc } = build();
    const row = await svc.register({
      name: 'Nghia',
      team: 'Platform',
      startDate: '2026-11-01',
    });
    expect(await svc.tryLink(dm(row.code.toLowerCase()), '2026-10-30')).toBe(
      true,
    );
    expect(row.zaloUserId).toBe('z-1');
    expect(sent.map((s) => s.kind)).toEqual(['send', 'notify']);
    expect(sent[0].text).toContain('Xin chào Nghia');
    expect(sent[1]).toMatchObject({ to: ['hr-1'] });
    expect(row.stepsSent).toBe(0);
  });

  it('입사일에 연결하면 환영 + 첫날 체크리스트(팀 이름 채움)', async () => {
    const { svc } = build();
    const row = await svc.register({
      name: 'Nghia',
      team: 'Platform',
      startDate: '2026-11-01',
    });
    await svc.tryLink(dm(row.code), '2026-11-01');
    expect(sent[1].text).toContain('Platform');
    expect(row.stepsSent).toBe(1);
  });

  it('늦게 연결하면 밀린 단계는 가장 최근 하나만', async () => {
    const { svc } = build();
    const row = await svc.register({
      name: 'Nghia',
      team: null,
      startDate: '2026-11-01',
    });
    await svc.tryLink(dm(row.code), '2026-11-04'); // day 3 → day0, day2 기한
    const steps = sent.filter((s) => s.kind === 'notify' && s.to === 'z-1');
    expect(steps).toHaveLength(1);
    expect(steps[0].text).toContain('Hanbiro chưa');
    expect(row.stepsSent).toBe(2);
  });

  it('tick 은 기한이 된 단계를 하루에 한 번씩 이어서 보낸다', async () => {
    const { svc } = build();
    const row = await svc.register({
      name: 'Nghia',
      team: 'Platform',
      startDate: '2026-11-01',
    });
    await svc.tryLink(dm(row.code), '2026-11-01');
    sent.length = 0;
    expect(await svc.tick('2026-11-02')).toEqual({ checked: 1, sent: 0 });
    expect(await svc.tick('2026-11-03')).toEqual({ checked: 1, sent: 1 });
    expect(await svc.tick('2026-11-07')).toEqual({ checked: 1, sent: 1 });
    expect(row.stepsSent).toBe(STEPS.length);
    expect(await svc.tick('2026-11-20')).toEqual({ checked: 1, sent: 0 });
  });

  it('남이 이미 쓴 코드는 가져가지 못한다', async () => {
    const { svc } = build();
    const row = await svc.register({
      name: 'Nghia',
      team: null,
      startDate: '2026-11-01',
    });
    await svc.tryLink(dm(row.code, 'z-1'), '2026-10-30');
    sent.length = 0;
    expect(await svc.tryLink(dm(row.code, 'z-2'), '2026-10-30')).toBe(true);
    expect(row.zaloUserId).toBe('z-1');
    expect(sent[0].text).toContain('đã được sử dụng');
  });

  it('없는 코드는 안내만', async () => {
    const { svc } = build();
    expect(await svc.tryLink(dm('GENIE-0000'))).toBe(true);
    expect(sent[0].text).toContain('Mã không đúng');
  });
});
