import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentService } from './agent.service';
import type { EntraUser } from '../common/guards/entra-auth.guard';

const TENANT = 'b81a7702-1111-2222-3333-444455556666';
const OID = '0a1b2c3d-4e5f-6789-abcd-ef0123456789';
const TOKEN = 'brain-service-token';

const USER: EntraUser = {
  tenantId: TENANT,
  objectId: OID,
  internalUserId: `${TENANT}:${OID}`,
  displayName: '김대리',
};

const BRAIN_OK = {
  text: '출장 일비는 국내 2만원입니다.',
  refused: false,
  iterations: 2,
  tool_trace: [{ name: 'search_knowledge', outcome: 'ok', latency_ms: 120 }],
  usage: { input_tokens: 1200, output_tokens: 300 },
};

const CONFIGURED = {
  RAG_SERVICE_URL: 'http://127.0.0.1:8000',
  AGENT_SERVICE_TOKEN: TOKEN,
};

function serviceWith(env: Record<string, string | undefined>): AgentService {
  const config = { get: (k: string) => env[k] } as unknown as ConfigService;
  return new AgentService(config);
}

/** fetch 응답 흉내. 실제 Response 를 만들지 않고 필요한 표면만 준다. */
function reply(
  body: unknown,
  { ok = true, status = 200 } = {},
): Promise<Response> {
  return Promise.resolve({
    ok,
    status,
    json: () =>
      typeof body === 'string'
        ? Promise.reject(new Error('not json'))
        : Promise.resolve(body),
    text: () =>
      Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response);
}

const mockFetch = jest.fn();

/** 마지막 호출의 (url, init) 을 꺼낸다. */
function lastCall(): { url: string; init: RequestInit } {
  const [url, init] = mockFetch.mock.calls.at(-1) as [string, RequestInit];
  return { url, init };
}

function sentBody(): Record<string, unknown> {
  return JSON.parse(lastCall().init.body as string) as Record<string, unknown>;
}

describe('AgentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockReturnValue(reply(BRAIN_OK));
  });

  describe('정상 경로', () => {
    it('뇌의 답을 브라우저용 모양으로 옮긴다', async () => {
      const result = await serviceWith(CONFIGURED).search('일비 얼마야', USER);

      expect(result).toEqual({
        text: BRAIN_OK.text,
        refused: false,
        tools: [{ name: 'search_knowledge', outcome: 'ok' }],
      });
    });

    it('★ 토큰 사용량·비용은 브라우저로 내려보내지 않는다', async () => {
      const result = await serviceWith(CONFIGURED).search('일비 얼마야', USER);

      expect(JSON.stringify(result)).not.toContain('input_tokens');
      expect(JSON.stringify(result)).not.toContain('latency_ms');
      expect(result).not.toHaveProperty('usage');
      expect(result).not.toHaveProperty('iterations');
    });

    it('뇌의 /agent/message 를 서비스 토큰과 함께 부른다', async () => {
      await serviceWith(CONFIGURED).search('일비 얼마야', USER);
      const { url, init } = lastCall();

      expect(url).toBe('http://127.0.0.1:8000/agent/message');
      expect(init.method).toBe('POST');
      expect((init.headers as Record<string, string>)['x-service-token']).toBe(
        TOKEN,
      );
    });

    it('★ 신원은 가드가 확정한 값만 넘어간다', async () => {
      await serviceWith(CONFIGURED).search('일비 얼마야', USER);

      expect(sentBody()).toEqual({
        text: '일비 얼마야',
        internal_user_id: `${TENANT}:${OID}`,
        org_id: TENANT,
        roles: [],
      });
    });

    it('base URL 끝의 슬래시를 정리한다', async () => {
      await serviceWith({
        ...CONFIGURED,
        RAG_SERVICE_URL: 'http://127.0.0.1:8000///',
      }).search('일비', USER);

      expect(lastCall().url).toBe('http://127.0.0.1:8000/agent/message');
    });

    it('타임아웃 신호를 붙인다 (요청이 영원히 매달리지 않는다)', async () => {
      await serviceWith(CONFIGURED).search('일비', USER);

      expect(lastCall().init.signal).toBeInstanceOf(AbortSignal);
    });

    it('거절 응답도 그대로 전달한다', async () => {
      mockFetch.mockReturnValue(reply({ ...BRAIN_OK, refused: true }));

      const result = await serviceWith(CONFIGURED).search('...', USER);
      expect(result.refused).toBe(true);
    });
  });

  describe('설정 누락', () => {
    it.each([
      ['둘 다 없음', {}],
      ['RAG_SERVICE_URL 없음', { AGENT_SERVICE_TOKEN: TOKEN }],
      [
        'AGENT_SERVICE_TOKEN 없음',
        { RAG_SERVICE_URL: 'http://127.0.0.1:8000' },
      ],
      ['공백뿐', { RAG_SERVICE_URL: '  ', AGENT_SERVICE_TOKEN: '  ' }],
    ])('%s → 503 이고 뇌를 부르지 않는다', async (_label, env) => {
      await expect(serviceWith(env).search('일비', USER)).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('뇌가 답하지 못할 때', () => {
    it('연결 실패는 502 로 바꾼다 (내부 주소를 노출하지 않는다)', async () => {
      mockFetch.mockRejectedValue(
        new Error('connect ECONNREFUSED 127.0.0.1:8000'),
      );

      const call = serviceWith(CONFIGURED).search('일비', USER);
      await expect(call).rejects.toThrow(BadGatewayException);
      // 메시지가 일반화된 문구뿐이어야 한다 — 내부 주소가 섞여 나가면 여기서 깨진다
      await expect(call).rejects.toThrow('agent service is unreachable');
    });

    it('타임아웃도 502 다', async () => {
      mockFetch.mockRejectedValue(
        Object.assign(new Error('The operation was aborted'), {
          name: 'TimeoutError',
        }),
      );

      await expect(
        serviceWith(CONFIGURED).search('일비', USER),
      ).rejects.toThrow(BadGatewayException);
    });

    // ★ 뇌가 우리 토큰을 거절한 것은 사용자 문제가 아니다. 401 을 그대로 돌려주면
    //   사용자가 "다시 로그인" 을 시도하게 되고, 진짜 원인(설정 오류)은 숨는다.
    it('뇌의 401 을 사용자에게 401 로 돌려주지 않는다', async () => {
      mockFetch.mockReturnValue(
        reply({ detail: 'unauthorized' }, { ok: false, status: 401 }),
      );

      await expect(
        serviceWith(CONFIGURED).search('일비', USER),
      ).rejects.toThrow(BadGatewayException);
    });

    it.each([
      ['503', 503],
      ['500', 500],
      ['422', 422],
    ])('뇌의 %s 는 502 로 바꾼다', async (_label, status) => {
      mockFetch.mockReturnValue(
        reply({ detail: 'nope' }, { ok: false, status }),
      );

      await expect(
        serviceWith(CONFIGURED).search('일비', USER),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe('응답 계약이 깨졌을 때', () => {
    it('JSON 이 아니면 502', async () => {
      mockFetch.mockReturnValue(reply('<html>502 Bad Gateway</html>'));

      await expect(
        serviceWith(CONFIGURED).search('일비', USER),
      ).rejects.toThrow(BadGatewayException);
    });

    it.each([
      ['text 없음', { refused: false }],
      ['text 가 문자열이 아님', { text: 42 }],
      ['null', null],
    ])(
      '%s → 502 (undefined 를 화면까지 흘리지 않는다)',
      async (_label, body) => {
        mockFetch.mockReturnValue(reply(body));

        await expect(
          serviceWith(CONFIGURED).search('일비', USER),
        ).rejects.toThrow(BadGatewayException);
      },
    );

    it('tool_trace 가 없어도 빈 배열로 버틴다', async () => {
      mockFetch.mockReturnValue(reply({ text: '답' }));

      const result = await serviceWith(CONFIGURED).search('일비', USER);
      expect(result).toEqual({ text: '답', refused: false, tools: [] });
    });
  });
});
