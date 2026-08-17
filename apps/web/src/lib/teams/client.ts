/**
 * Teams 탭 클라이언트 — SDK 초기화와 SSO 토큰 획득.
 *
 * 여기서만 `@microsoft/teams-js` 를 안다. 화면 컴포넌트는 이 모듈이 돌려주는
 * 토큰 문자열만 쓴다 — Teams 를 벗어나 다른 호스트(Outlook 등)로 옮겨도
 * 바꿀 곳이 여기 하나다.
 *
 * ★ SDK 를 **동적 import** 한다. Next 는 "use client" 컴포넌트도 초기 HTML 을
 *   위해 서버에서 한 번 렌더하는데, teams-js 는 모듈 로드 시점에 window 를
 *   건드려서 그 단계에서 터진다. effect 안에서 import 하면 브라우저에서만 돈다.
 */

/** Teams 밖(일반 브라우저)에서 열렸을 때 영원히 기다리지 않기 위한 상한. */
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

/**
 * SDK 를 초기화한다. Teams 밖이면 `NotInTeamsError`.
 *
 * 여러 번 불러도 안전하다 (teams-js 가 초기화를 한 번만 수행한다). 화면은
 * 마운트 시 한 번 불러 **환경 문제를 먼저 드러낸다** — 그래야 사용자가
 * 질문을 입력하고 기다린 뒤에야 "Teams 가 아니다"를 보는 일이 없다.
 */
/**
 * teams-js 가 "호스트가 없다"는 뜻으로 던지는 오류인지 본다.
 *
 * 밖에서 열면 SDK 는 **매달리지 않고 즉시** 부모 프레임이 없다며 거절한다.
 * 그 원문("Initialization Failed. No Parent window found.")을 그대로 화면에
 * 띄우면 사용자는 무엇을 해야 하는지 알 수 없으므로 우리 오류로 바꾼다.
 * 문구 매칭이라 SDK 가 표현을 바꾸면 놓치는데, 그때는 타임아웃이 같은 결론을
 * 내주므로 안내가 틀리지는 않는다.
 */
function meansNoTeamsHost(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /no parent window|initialization failed/i.test(message);
}

export async function initTeams(): Promise<void> {
  const { app } = await import('@microsoft/teams-js');

  try {
    // 호스트가 응답하지 않는 경우까지 대비해 상한을 둔다. 그대로 두면 화면이
    // 영원히 로딩 상태로 남아 "느린 것"처럼 보인다.
    await withTimeout(app.initialize(), INIT_TIMEOUT_MS, () => new NotInTeamsError());
  } catch (error) {
    if (meansNoTeamsHost(error)) throw new NotInTeamsError();
    throw error;
  }
}

/**
 * Teams SSO 토큰을 얻는다.
 *
 * 사용자에게 동의 창을 띄우지 않는다 — Entra 앱이 `access_as_user` 로 사전
 * 승인돼 있으면 조용히 발급된다. 승인이 빠져 있으면 여기서 실패하는데,
 * 그 오류 메시지가 "SSO 설정이 덜 됐다"와 "사용자에게 권한이 없다"를 구분해
 * 주지 않으므로, 호출부는 두 경우를 같은 문구로 안내한다.
 *
 * ★ 토큰을 컴포넌트 상태에 보관하지 않고 **요청할 때마다 새로 받는다.**
 *   토큰은 만료되고, 보관하면 만료 처리를 우리가 떠안게 된다. teams-js 가
 *   내부적으로 캐시하므로 반복 호출이 비싸지 않다.
 */
export async function getTeamsToken(): Promise<string> {
  const { authentication } = await import('@microsoft/teams-js');

  await initTeams();

  try {
    return await authentication.getAuthToken();
  } catch (error) {
    throw new TeamsAuthError(error instanceof Error ? error.message : String(error));
  }
}
