const INIT_TIMEOUT_MS = 3000;

export class NotInTeamsError extends Error {
  constructor() {
    super('Teams 안에서 열리지 않았습니다');
    this.name = 'NotInTeamsError';
  }
}

export class TeamsAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TeamsAuthError';
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(onTimeout()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// SDK 오류 문구로 판정한다. 표현이 바뀌어 놓치면 타임아웃이 같은 결론을 낸다.
function meansNoTeamsHost(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /no parent window|initialization failed/i.test(message);
}

// 동적 import 다. teams-js 는 모듈 로드 시점에 window 를 건드려서 SSR 렌더에서 터진다.
export async function initTeams(): Promise<void> {
  const { app } = await import('@microsoft/teams-js');

  try {
    // 호스트가 응답하지 않으면 화면이 영원히 로딩 상태로 남는다.
    await withTimeout(app.initialize(), INIT_TIMEOUT_MS, () => new NotInTeamsError());
  } catch (error) {
    if (meansNoTeamsHost(error)) throw new NotInTeamsError();
    throw error;
  }
}

// 토큰은 보관하지 않고 요청할 때마다 새로 받는다 — 만료 처리를 떠안지 않으려고.
// teams-js 가 내부적으로 캐시하므로 반복 호출이 비싸지 않다.
export async function getTeamsToken(): Promise<string> {
  const { authentication } = await import('@microsoft/teams-js');

  await initTeams();

  try {
    return await authentication.getAuthToken();
  } catch (error) {
    throw new TeamsAuthError(error instanceof Error ? error.message : String(error));
  }
}
