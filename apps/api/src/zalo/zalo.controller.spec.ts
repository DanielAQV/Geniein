import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import { AgentService } from '../agent/agent.service';
import { ZaloContact } from './zalo-contact.entity';
import type { OnboardingService } from './onboarding/onboarding.service';
import { ZaloController, parseIncoming } from './zalo.controller';
import { ZaloService, clipForZalo, ZALO_TEXT_LIMIT } from './zalo.service';

const SECRET = 'zalo-webhook-secret';
const BOT_TOKEN = 'bot-token-123';
const ORG = '3685a694-9c78-4783-ada9-5c1e8d5f769b';

const ENV: Record<string, string> = {
  ZALO_WEBHOOK_SECRET: SECRET,
  ZALO_BOT_TOKEN: BOT_TOKEN,
  ZALO_ORG_ID: ORG,
};

function update(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    result: {
      event_name: 'message.text.received',
      message: {
        message_id: 'm-1',
        date: 1760000000,
        text: 'Phụ cấp công tác là bao nhiêu?',
        from: { id: 'u-100', display_name: 'Nghia', is_bot: false },
        chat: { id: 'c-100', chat_type: 'PRIVATE' },
        ...overrides,
      },
    },
  };
}

/** 메모리 Repository. save/findOne/find/create 만 흉내 낸다. */
function memoryRepo() {
  const rows = new Map<string, ZaloContact>();
  const repo = {
    create: (data: Partial<ZaloContact>) =>
      Object.assign(new ZaloContact(), data),
    save: (c: ZaloContact) => {
      c.id ??= `id-${c.zaloUserId}`;
      rows.set(c.zaloUserId, c);
      return Promise.resolve(c);
    },
    findOne: ({ where }: { where: { zaloUserId: string } }) =>
      Promise.resolve(rows.get(where.zaloUserId) ?? null),
    find: () => Promise.resolve([...rows.values()]),
  };
  return { repo: repo as unknown as Repository<ZaloContact>, rows };
}

const mockFetch = jest.fn();
const ask = jest.fn();

function build(env: Record<string, string> = ENV) {
  const config = { get: (k: string) => env[k] } as unknown as ConfigService;
  const agent = { ask } as unknown as AgentService;
  const { repo, rows } = memoryRepo();
  const service = new ZaloService(config, agent, repo);
  const onboarding = {
    tryLink: () => Promise.resolve(false),
  } as unknown as OnboardingService;
  return { service, controller: new ZaloController(service, onboarding), rows };
}

function zaloOk() {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ ok: true, result: { message_id: 'r-1' } }),
  } as unknown as Response);
}

async function flush() {
  // handle() 은 fire-and-forget 이다. 마이크로태스크를 몇 번 비워 끝까지 돌린다
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
}

function sentBodies(): Record<string, unknown>[] {
  return mockFetch.mock.calls.map(
    ([, init]) =>
      JSON.parse((init as RequestInit).body as string) as Record<
        string,
        unknown
      >,
  );
}

describe('parseIncoming', () => {
  it('텍스트 DM 을 꺼낸다 (이름 포함)', () => {
    expect(parseIncoming(update())).toEqual({
      messageId: 'm-1',
      chatId: 'c-100',
      fromId: 'u-100',
      displayName: 'Nghia',
      text: 'Phụ cấp công tác là bao nhiêu?',
    });
  });

  it('실측 모양(result 없이 맨 바깥에 event_name)도 받는다', () => {
    expect(parseIncoming(update().result)?.text).toBe(
      'Phụ cấp công tác là bao nhiêu?',
    );
  });

  it('그룹·봇·비텍스트는 버린다', () => {
    expect(
      parseIncoming(update({ chat: { id: 'g-1', chat_type: 'GROUP' } })),
    ).toBeNull();
    expect(
      parseIncoming(update({ from: { id: 'b-1', is_bot: true } })),
    ).toBeNull();
    expect(parseIncoming(update({ text: '   ' }))).toBeNull();
    const photo = update();
    photo.result.event_name = 'message.image.received';
    expect(parseIncoming(photo)).toBeNull();
    expect(parseIncoming(null)).toBeNull();
    expect(parseIncoming({})).toBeNull();
  });
});

describe('clipForZalo', () => {
  it('상한 이하는 그대로, 넘으면 코드포인트 기준으로 자른다', () => {
    expect(clipForZalo('xin chào')).toBe('xin chào');
    const clipped = clipForZalo('ộ'.repeat(ZALO_TEXT_LIMIT + 50));
    expect(Array.from(clipped)).toHaveLength(ZALO_TEXT_LIMIT);
    expect(clipped.endsWith('…')).toBe(true);
  });
});

describe('ZaloController.webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockImplementation(zaloOk);
    ask.mockResolvedValue({
      text: 'Phụ cấp công tác trong nước là 20.000 KRW/ngày.',
      refused: false,
      tools: [],
    });
  });

  it('시크릿이 틀리면 403, 뇌도 Zalo 도 부르지 않는다', () => {
    const { controller } = build();
    expect(() => controller.webhook('wrong', update())).toThrow(
      ForbiddenException,
    );
    expect(ask).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('시크릿 설정이 없으면 503 으로 막는다', () => {
    const { controller } = build({ ...ENV, ZALO_WEBHOOK_SECRET: '' });
    expect(() => controller.webhook(SECRET, update())).toThrow(
      'zalo webhook is not configured',
    );
  });

  it('DM 을 받으면 손잡이를 저장하고, 뇌에 zalo 신원으로 묻고, 답을 보낸다', async () => {
    const { controller, rows } = build();
    expect(controller.webhook(SECRET, update())).toEqual({ ok: true });
    await flush();

    expect(rows.get('u-100')?.displayName).toBe('Nghia');
    expect(rows.get('u-100')?.chatId).toBe('c-100');

    const [question, identity, history] = ask.mock.calls[0] as [
      string,
      unknown,
      unknown[],
    ];
    expect(question).toBe('Phụ cấp công tác là bao nhiêu?');
    expect(identity).toEqual({
      internalUserId: 'zalo:u-100',
      orgId: ORG,
      locale: null,
    });
    expect(history).toEqual([]);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://bot-api.zapps.me/bot${BOT_TOKEN}/sendMessage`);
    expect(init.method).toBe('POST');
    expect(sentBodies()[0]).toEqual({
      chat_id: 'c-100',
      text: 'Phụ cấp công tác trong nước là 20.000 KRW/ngày.',
    });
  });

  it('두 번째 질문에는 앞 문답이 이력으로 붙는다 (DB 에 저장된 것)', async () => {
    const { controller } = build();
    controller.webhook(SECRET, update());
    await flush();
    controller.webhook(
      SECRET,
      update({ message_id: 'm-2', text: 'Còn nước ngoài?' }),
    );
    await flush();

    const [, , history] = ask.mock.calls[1] as [string, unknown, unknown[]];
    expect(history).toEqual([
      { role: 'user', text: 'Phụ cấp công tác là bao nhiêu?' },
      {
        role: 'assistant',
        text: 'Phụ cấp công tác trong nước là 20.000 KRW/ngày.',
      },
    ]);
  });

  it('같은 message_id 가 다시 오면 뇌를 두 번 부르지 않는다', async () => {
    const { controller } = build();
    controller.webhook(SECRET, update());
    await flush();
    controller.webhook(SECRET, update());
    await flush();
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it('뇌가 실패하면 안내 한 줄을 보내고 이력에는 남기지 않는다', async () => {
    ask.mockRejectedValueOnce(new Error('agent service is unreachable'));
    const { controller } = build();
    controller.webhook(SECRET, update());
    await flush();

    expect((sentBodies()[0] as { text: string }).text).toContain(
      'Tạm thời chưa trả lời được',
    );

    controller.webhook(SECRET, update({ message_id: 'm-2' }));
    await flush();
    const [, , history] = ask.mock.calls[1] as [string, unknown, unknown[]];
    expect(history).toEqual([]);
  });

  it('그룹 메시지는 200 만 주고 아무것도 하지 않는다', async () => {
    const { controller } = build();
    expect(
      controller.webhook(
        SECRET,
        update({ chat: { id: 'g-1', chat_type: 'GROUP' } }),
      ),
    ).toEqual({ ok: true });
    await flush();
    expect(ask).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('ZaloController.notify (먼저 말 걸기)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockImplementation(zaloOk);
    ask.mockResolvedValue({ text: 'ok', refused: false, tools: [] });
  });

  async function withContact() {
    const built = build();
    built.controller.webhook(SECRET, update());
    await flush();
    mockFetch.mockClear();
    return built;
  }

  it('말 걸어온 사람에게 텍스트를 보내고 이력에 남긴다', async () => {
    const { controller, rows } = await withContact();
    const res = await controller.notify({
      to: 'u-100',
      text: 'Hồ sơ công tác đã được duyệt.',
    });
    expect(res).toEqual({
      delivered: 1,
      total: 1,
      results: [{ to: 'u-100', displayName: 'Nghia', delivered: true }],
    });
    expect(sentBodies()).toEqual([
      { chat_id: 'c-100', text: 'Hồ sơ công tác đã được duyệt.' },
    ]);
    expect(rows.get('u-100')?.recentTurns.at(-1)).toEqual({
      role: 'assistant',
      text: 'Hồ sơ công tác đã được duyệt.',
    });
  });

  it('사진은 sendPhoto 로, 텍스트가 같이 오면 그 뒤에 sendMessage', async () => {
    const { controller } = await withContact();
    await controller.notify({
      to: 'u-100',
      photo_url: 'https://genie.geniein.com/x.png',
      caption: '견적 비교표',
      text: '확인 부탁드립니다.',
    });
    const urls = mockFetch.mock.calls.map(([u]) => u as string);
    expect(urls[0]).toContain('/sendPhoto');
    expect(urls[1]).toContain('/sendMessage');
    expect(sentBodies()[0]).toEqual({
      chat_id: 'c-100',
      photo: 'https://genie.geniein.com/x.png',
      caption: '견적 비교표',
    });
  });

  it('손잡이 없는 사람에게는 보내지 않고 이유를 남긴다', async () => {
    const { controller } = await withContact();
    const res = await controller.notify({ to: ['u-100', 'u-999'], text: 'hi' });
    expect(res.delivered).toBe(1);
    expect(res.results[1]).toMatchObject({ to: 'u-999', delivered: false });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('all 은 말 걸어온 전원', async () => {
    const { controller } = await withContact();
    controller.webhook(
      SECRET,
      update({
        message_id: 'm-9',
        from: { id: 'u-200', display_name: 'Thinh', is_bot: false },
        chat: { id: 'c-200', chat_type: 'PRIVATE' },
      }),
    );
    await flush();
    mockFetch.mockClear();
    const res = await controller.notify({ to: 'all', text: 'Thông báo chung' });
    expect(res.total).toBe(2);
    expect(res.delivered).toBe(2);
  });

  it('잘못된 본문은 400', async () => {
    const { controller } = await withContact();
    await expect(controller.notify({ text: 'x' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(controller.notify({ to: 'u-100' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      controller.notify({ to: 'u-100', photo_url: 'http://insecure/x.png' }),
    ).rejects.toThrow(BadRequestException);
  });
});
