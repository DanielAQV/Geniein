import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentService } from '../agent/agent.service';
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

const mockFetch = jest.fn();
const ask = jest.fn();

function build(env: Record<string, string> = ENV) {
  const config = { get: (k: string) => env[k] } as unknown as ConfigService;
  const agent = { ask } as unknown as AgentService;
  const service = new ZaloService(config, agent);
  return { service, controller: new ZaloController(service) };
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
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
}

describe('parseIncoming', () => {
  it('텍스트 DM 을 꺼낸다', () => {
    expect(parseIncoming(update())).toEqual({
      messageId: 'm-1',
      chatId: 'c-100',
      fromId: 'u-100',
      text: 'Phụ cấp công tác là bao nhiêu?',
    });
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
    const long = 'ộ'.repeat(ZALO_TEXT_LIMIT + 50);
    const clipped = clipForZalo(long);
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

  it('DM 을 받으면 200 을 먼저 주고, 뇌에 zalo 신원으로 묻고, 답을 sendMessage 로 보낸다', async () => {
    const { controller } = build();
    expect(controller.webhook(SECRET, update())).toEqual({ ok: true });
    await flush();

    expect(ask).toHaveBeenCalledTimes(1);
    const [question, identity, history] = ask.mock.calls[0] as [
      string,
      { internalUserId: string; orgId: string },
      unknown[],
    ];
    expect(question).toBe('Phụ cấp công tác là bao nhiêu?');
    expect(identity).toEqual({
      internalUserId: 'zalo:u-100',
      orgId: ORG,
      locale: null,
    });
    expect(history).toEqual([]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://bot-api.zapps.me/bot${BOT_TOKEN}/sendMessage`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      chat_id: 'c-100',
      text: 'Phụ cấp công tác trong nước là 20.000 KRW/ngày.',
    });
  });

  it('같은 채팅의 두 번째 질문에는 앞 문답이 이력으로 붙는다', async () => {
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

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string) as { text: string };
    expect(sent.text).toContain('Tạm thời chưa trả lời được');

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
