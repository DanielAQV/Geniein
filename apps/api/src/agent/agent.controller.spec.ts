import { BadRequestException } from '@nestjs/common';

// 컨트롤러가 @UseGuards 로 EntraAuthGuard 를 참조하고, 그 체인 끝에 ESM 전용
// 패키지(jose)가 있어서 jest 의 CJS 변환이 막힌다. 이 파일은 가드를 검증하지
// 않으므로(그건 entra-auth.guard.spec.ts 의 몫) 로딩만 끊어준다.
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
    [string, EntraUser, { role: 'user' | 'assistant'; text: string }[]]
  >();

function controller(): AgentController {
  search.mockResolvedValue(RESULT);
  return new AgentController({ search } as unknown as AgentService);
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

    expect(search).toHaveBeenCalledWith('출장 일비 얼마야?', USER, []);
  });

  it('앞뒤 공백을 다듬어 넘긴다', async () => {
    await controller().search('  일비  ', undefined, requestOf(USER));

    expect(search).toHaveBeenCalledWith('일비', USER, []);
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

  /**
   * 이력은 클라이언트가 들고 있다가 다시 보내는 값이라 모양이 제멋대로일 수 있다.
   * 걸러내지 않으면 뇌를 거쳐 모델 API 까지 흘러가 400 이 난다 — 사용자 입력만으로
   * 상류를 깨뜨릴 수 있게 된다.
   */
  describe('대화 이력', () => {
    const OK = [
      { role: 'user', text: '해외 숙박비는?' },
      { role: 'assistant', text: '1일 150 USD 입니다.' },
    ];

    it('정상 이력을 그대로 넘긴다', async () => {
      await controller().search('그럼 국내는?', OK, requestOf(USER));

      expect(search).toHaveBeenCalledWith('그럼 국내는?', USER, OK);
    });

    it('없으면 빈 배열로 넘긴다', async () => {
      await controller().search('일비', undefined, requestOf(USER));

      expect(search).toHaveBeenCalledWith('일비', USER, []);
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

    // 상한이 있어야 하는 이유는 비용이다 — 이력은 매 턴 통째로 다시 청구된다.
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

  // ★ 가드 배선이 틀렸을 때 익명으로 뇌를 부르느니 여기서 터지는 게 낫다.
  it('신원이 없으면 뇌를 부르지 않는다', () => {
    expect(() => controller().search('일비', undefined, requestOf(undefined))).toThrow(
      BadRequestException,
    );
    expect(search).not.toHaveBeenCalled();
  });
});
