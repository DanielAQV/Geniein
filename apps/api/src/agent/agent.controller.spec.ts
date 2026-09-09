import { BadRequestException } from '@nestjs/common';

// 가드 체인 끝의 ESM 전용 패키지(jose)가 jest 의 CJS 변환을 막는다. 가드 검증은
// entra-auth.guard.spec.ts 의 몫이라 여기서는 로딩만 끊는다.
jest.mock('jwks-rsa', () => ({ JwksClient: jest.fn() }));

import { AgentController } from './agent.controller';
import type { AgentService, AgentSearchResult } from './agent.service';
import type {
  EntraUser,
  RequestWithEntraUser,
} from '../common/guards/entra-auth.guard';

const USER: EntraUser = {
  tenantId: 'b81a7702-1111-2222-3333-444455556666',
  objectId: '0a1b2c3d-4e5f-6789-abcd-ef0123456789',
  internalUserId:
    'b81a7702-1111-2222-3333-444455556666:0a1b2c3d-4e5f-6789-abcd-ef0123456789',
};

const RESULT: AgentSearchResult = { text: '답변', refused: false, tools: [] };

const search =
  jest.fn<
    Promise<AgentSearchResult>,
    [
      string,
      EntraUser,
      { role: 'user' | 'assistant'; text: string }[],
      string | null,
    ]
  >();

const searchStream =
  jest.fn<
    Promise<ReadableStream<Uint8Array>>,
    [
      string,
      EntraUser,
      { role: 'user' | 'assistant'; text: string }[],
      string | null,
    ]
  >();

function controller(): AgentController {
  search.mockResolvedValue(RESULT);
  return new AgentController({
    search,
    searchStream,
  } as unknown as AgentService);
}

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function responseSpy() {
  const headers: Record<string, string> = {};
  const chunks: string[] = [];
  const decoder = new TextDecoder();
  return {
    headers,
    get body() {
      return chunks.join('');
    },
    ended: false,
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    flushHeaders() {},
    write(chunk: Uint8Array | string) {
      chunks.push(
        typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true }),
      );
      return true;
    },
    end() {
      this.ended = true;
    },
  };
}

const requestOf = (user?: EntraUser): RequestWithEntraUser => ({
  headers: {},
  entraUser: user,
});

describe('AgentController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('정상 질문을 서비스로 넘긴다', async () => {
    await expect(
      controller().search('출장 일비 얼마야?', undefined, requestOf(USER)),
    ).resolves.toEqual(RESULT);

    expect(search).toHaveBeenCalledWith('출장 일비 얼마야?', USER, [], null);
  });

  it('앞뒤 공백을 다듬어 넘긴다', async () => {
    await controller().search('  일비  ', undefined, requestOf(USER));

    expect(search).toHaveBeenCalledWith('일비', USER, [], null);
  });

  it.each([
    ['빈 문자열', ''],
    ['공백뿐', '   '],
    ['문자열이 아님', 42],
    ['null', null],
    ['객체', { text: '우회 시도' }],
    ['2000자 초과', 'ㄱ'.repeat(2001)],
    // 검증이 동기라 여기서 던진다 — 뇌를 부르기 전에 끊긴다는 뜻이다
  ])('%s → 400 이고 뇌를 부르지 않는다', (_label, text) => {
    expect(() => controller().search(text, undefined, requestOf(USER))).toThrow(
      BadRequestException,
    );
    expect(search).not.toHaveBeenCalled();
  });

  it('2000자는 통과한다 (경계)', async () => {
    await controller().search('ㄱ'.repeat(2000), undefined, requestOf(USER));

    expect(search).toHaveBeenCalled();
  });

  describe('대화 이력', () => {
    const OK = [
      { role: 'user', text: '해외 숙박비는?' },
      { role: 'assistant', text: '1일 150 USD 입니다.' },
    ];

    it('정상 이력을 그대로 넘긴다', async () => {
      await controller().search('그럼 국내는?', OK, requestOf(USER));

      expect(search).toHaveBeenCalledWith('그럼 국내는?', USER, OK, null);
    });

    it('없으면 빈 배열로 넘긴다', async () => {
      await controller().search('일비', undefined, requestOf(USER));

      expect(search).toHaveBeenCalledWith('일비', USER, [], null);
    });

    it.each([
      ['배열이 아님', { role: 'user', text: 'x' }],
      ['모르는 role', [{ role: 'system', text: 'x' }]],
      ['text 없음', [{ role: 'user' }]],
      ['text 가 문자열이 아님', [{ role: 'user', text: 42 }]],
      ['text 가 공백뿐', [{ role: 'user', text: '   ' }]],
    ])('%s 이면 거부한다', (_label, history) => {
      expect(() => controller().search('일비', history, requestOf(USER))).toThrow(
        BadRequestException,
      );
      expect(search).not.toHaveBeenCalled();
    });

    it('20턴을 넘으면 거부한다', () => {
      const tooLong = Array.from({ length: 21 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        text: `${i}`,
      }));

      expect(() => controller().search('일비', tooLong, requestOf(USER))).toThrow(
        BadRequestException,
      );
    });

    it('한 마디가 8000자를 넘으면 거부한다', () => {
      const huge = [{ role: 'user', text: 'ㄱ'.repeat(8001) }];

      expect(() => controller().search('일비', huge, requestOf(USER))).toThrow(
        BadRequestException,
      );
    });
  });

  describe('고른 언어(lang)', () => {
    it.each([['ko'], ['vi'], ['en']])('허용된 값 %s 을 그대로 넘긴다', async (lang) => {
      await controller().search('일비', undefined, requestOf(USER), lang);

      expect(search).toHaveBeenCalledWith('일비', USER, [], lang);
    });

    // 거부하지 않고 버린다. 표시 설정 하나 때문에 검색이 실패하면 안 된다.
    it.each([
      ['모르는 코드', 'jp'],
      ['사이트 사전 코드', 'vn'],
      ['문자열이 아님', 42],
      ['빈 문자열', ''],
      ['긴 문자열', 'k'.repeat(50)],
      ['객체', { lang: 'ko' }],
    ])('%s 이면 버리고 통과시킨다', async (_label, lang) => {
      await expect(
        controller().search('일비', undefined, requestOf(USER), lang),
      ).resolves.toEqual(RESULT);

      expect(search).toHaveBeenCalledWith('일비', USER, [], null);
    });

    it('없으면 null 로 넘긴다', async () => {
      await controller().search('일비', undefined, requestOf(USER));

      expect(search).toHaveBeenCalledWith('일비', USER, [], null);
    });
  });

  describe('POST /agent/search/stream', () => {
    const LINES =
      '{"type":"status","phase":"thinking"}\n' +
      '{"type":"text","delta":"해외 출장"}\n' +
      '{"type":"done","refused":false,"iterations":2,"replace_text":null,' +
      '"tools":[{"name":"search_knowledge","outcome":"ok"}],"usage":{}}\n';

    it('뇌의 줄을 바꾸지 않고 흘린다', async () => {
      searchStream.mockResolvedValue(streamOf(LINES.slice(0, 40), LINES.slice(40)));
      const res = responseSpy();

      await controller().searchStream('일비', undefined, requestOf(USER), res, 'ko');

      expect(res.body).toBe(LINES);
      expect(res.ended).toBe(true);
      expect(searchStream).toHaveBeenCalledWith('일비', USER, [], 'ko');
    });

    it('버퍼링을 막는 헤더를 세운다', async () => {
      searchStream.mockResolvedValue(streamOf(LINES));
      const res = responseSpy();

      await controller().searchStream('일비', undefined, requestOf(USER), res);

      expect(res.headers['Content-Type']).toBe('application/x-ndjson');
      expect(res.headers['X-Accel-Buffering']).toBe('no');
      expect(res.headers['Cache-Control']).toBe('no-store');
    });

    it.each([
      ['빈 문자열', ''],
      ['2000자 초과', 'ㄱ'.repeat(2001)],
      ['문자열이 아님', 42],
    ])('%s 이면 스트림을 열지 않는다', async (_label, text) => {
      const res = responseSpy();

      await expect(
        controller().searchStream(text, undefined, requestOf(USER), res),
      ).rejects.toThrow(BadRequestException);

      expect(searchStream).not.toHaveBeenCalled();
      expect(res.headers).toEqual({});
    });

    it('이력이 20턴을 넘으면 스트림을 열지 않는다', async () => {
      const tooLong = Array.from({ length: 21 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        text: `${i}`,
      }));
      const res = responseSpy();

      await expect(
        controller().searchStream('일비', tooLong, requestOf(USER), res),
      ).rejects.toThrow(BadRequestException);
      expect(searchStream).not.toHaveBeenCalled();
    });

    it('스트림이 중간에 깨지면 error 줄을 넣고 닫는다', async () => {
      const encoder = new TextEncoder();
      // `start()` 안에서 바로 error 를 부르면 큐에 넣은 청크가 버려진다. 여기서
      // 보려는 것은 흐르다 끊긴 경우라 pull 로 나눠 첫 청크를 실제로 내보낸다.
      let pulls = 0;
      searchStream.mockResolvedValue(
        new ReadableStream({
          pull(controller) {
            if (pulls++ === 0) {
              controller.enqueue(encoder.encode('{"type":"status","phase":"thinking"}\n'));
              return;
            }
            controller.error(new Error('뇌 연결이 끊겼다'));
          },
        }),
      );
      const res = responseSpy();

      await controller().searchStream('일비', undefined, requestOf(USER), res);

      expect(res.body).toContain('"type":"status"');
      expect(res.body).toContain('{"type":"error","code":"stream_broken"}');
      expect(res.ended).toBe(true);
    });

    it('신원이 없으면 스트림을 열지 않는다', async () => {
      const res = responseSpy();

      await expect(
        controller().searchStream('일비', undefined, requestOf(undefined), res),
      ).rejects.toThrow(BadRequestException);
      expect(searchStream).not.toHaveBeenCalled();
    });
  });

  describe('GET /agent/me', () => {
    it('계정 언어만 돌려준다 — 신원은 담지 않는다', () => {
      const result = controller().me(requestOf({ ...USER, preferredLanguage: 'vi-vn' }));

      // 화면이 필요한 것은 언어 하나뿐이다. 이름·이메일을 내려보내면 안 된다.
      expect(result).toEqual({ language: 'vi-vn' });
    });

    it('계정 언어가 없으면 null — 서버가 기본값을 지어내지 않는다', () => {
      expect(controller().me(requestOf(USER))).toEqual({ language: null });
    });

    it('신원이 없으면 거부한다', () => {
      expect(() => controller().me(requestOf(undefined))).toThrow(BadRequestException);
    });
  });

  // 가드 배선이 틀렸을 때 익명으로 뇌를 부르느니 여기서 터지는 게 낫다.
  it('신원이 없으면 뇌를 부르지 않는다', () => {
    expect(() => controller().search('일비', undefined, requestOf(undefined))).toThrow(
      BadRequestException,
    );
    expect(search).not.toHaveBeenCalled();
  });
});
