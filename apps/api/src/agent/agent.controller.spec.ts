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

const search = jest.fn<Promise<AgentSearchResult>, [string, EntraUser]>();

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
      controller().search('출장 일비 얼마야?', requestOf(USER)),
    ).resolves.toEqual(RESULT);

    expect(search).toHaveBeenCalledWith('출장 일비 얼마야?', USER);
  });

  it('앞뒤 공백을 다듬어 넘긴다', async () => {
    await controller().search('  일비  ', requestOf(USER));

    expect(search).toHaveBeenCalledWith('일비', USER);
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
    expect(() => controller().search(text, requestOf(USER))).toThrow(
      BadRequestException,
    );
    expect(search).not.toHaveBeenCalled();
  });

  it('2000자는 통과한다 (경계)', async () => {
    await controller().search('ㄱ'.repeat(2000), requestOf(USER));

    expect(search).toHaveBeenCalled();
  });

  // ★ 가드 배선이 틀렸을 때 익명으로 뇌를 부르느니 여기서 터지는 게 낫다.
  it('신원이 없으면 뇌를 부르지 않는다', () => {
    expect(() => controller().search('일비', requestOf(undefined))).toThrow(
      BadRequestException,
    );
    expect(search).not.toHaveBeenCalled();
  });
});
