/**
 * Teams 탭 문구.
 *
 * ★ 사이트 사전(`src/lib/i18n/dictionary.ts`)에 섞지 않는다. 그쪽은 회사 소개
 *   페이지의 마케팅 문구이고 코드도 `kr/en/vn` 이라 표준 태그와 어긋난다.
 *   여기서는 `ko/vi/en` 을 쓴다 — 계정 언어(`ko-kr`)와 Teams locale(`vi-vn`)에서
 *   앞부분만 잘라 바로 대응시키기 위해서다. 두 체계를 오가며 변환하면 그 사이에
 *   반드시 오역이 생긴다.
 *
 * 언어를 정하는 근거는 셋이고 순서가 있다:
 *
 *   1. 사용자가 탭에서 고른 값     자동 판정이 틀렸을 때의 탈출구. 가장 우선한다
 *   2. Entra 계정 언어 (xms_pl)    검증된 토큰에서 온다. 다만 **없을 수 있다**
 *   3. Teams 클라이언트 locale     항상 있지만 UI 설정일 뿐이다
 *
 * ★ 답변 언어는 이것과 별개다. 그쪽은 **질문한 언어**가 우선이고(인격 규칙),
 *   계정 언어는 판단이 안 설 때만 쓰인다. 화면 문구는 물어볼 질문이 없으니
 *   위 사슬로 정할 수밖에 없다.
 */

export const LANGUAGES = ['ko', 'vi', 'en'] as const
export type Lang = (typeof LANGUAGES)[number]

export const DEFAULT_LANG: Lang = 'ko'

/** 언어 선택기에 보일 이름. 각 언어를 **그 언어로** 적는다 — 못 읽는 이름은 소용없다. */
export const LANGUAGE_LABELS: Record<Lang, string> = {
  ko: '한국어',
  vi: 'Tiếng Việt',
  en: 'English',
}

/** `ko-KR`, `vi-vn`, `en` → `Lang`. 모르는 값이면 null (다음 근거로 넘어간다). */
export function toLang(tag: unknown): Lang | null {
  if (typeof tag !== 'string') return null
  const primary = tag.trim().toLowerCase().split(/[-_]/)[0]
  return (LANGUAGES as readonly string[]).includes(primary) ? (primary as Lang) : null
}

/**
 * 근거 셋을 순서대로 훑어 언어를 정한다. 전부 비면 기본값.
 * 인자를 순서대로 받는 것이 곧 우선순위다 — 호출부가 순서를 바꾸면 정책이 바뀐다.
 */
export function resolveLang(...candidates: unknown[]): Lang {
  for (const candidate of candidates) {
    const lang = toLang(candidate)
    if (lang) return lang
  }
  return DEFAULT_LANG
}

export interface Strings {
  title: string
  /** 언어 선택기의 접근성 라벨. 라벨 자체도 언어를 타야 한다 */
  languageLabel: string
  newChat: string
  emptyTitle: string
  emptyBody: string
  placeholder: string
  send: string
  /** 검색 중 문구. **시간을 약속하지 않는다** — 실측이 45초에서 10초로 바뀌었고,
   *  또 바뀔 값이다. 근거 없는 숫자를 적으면 그게 곧 틀린 안내가 된다. */
  searching: string
  toolSearch: string
  toolFailed: string
  retry: string
  suggestions: string[]
  notInTeamsTitle: string
  notInTeamsBody: string
  authFailedTitle: string
  authFailedBody: string
  expiredTitle: string
  expiredBody: string
  notConfiguredTitle: string
  notConfiguredBody: string
  upstreamTitle: string
  upstreamBody: string
  unknownTitle: string
  unknownBody: string
}

const ko: Strings = {
  title: '사규 검색',
  languageLabel: '언어',
  newChat: '새 대화',
  emptyTitle: '무엇이 궁금하세요?',
  emptyBody: '평소 말하듯 물어보세요. 근거가 된 규정과 시행일을 함께 알려드립니다.',
  placeholder: '예: 해외 출장 숙박비 한도가 얼마인가요?',
  send: '보내기',
  searching: '문서를 확인하고 있습니다',
  toolSearch: '사내 규정 검색',
  toolFailed: '실패',
  retry: '다시 시도',
  suggestions: [
    '해외 출장 숙박비 한도가 얼마인가요?',
    '출장 가기 전에 뭘 해야 하나요?',
    '연차는 언제부터 쓸 수 있나요?',
  ],
  notInTeamsTitle: 'Teams 안에서 열어주세요',
  notInTeamsBody:
    '이 화면은 Teams 앱의 탭으로 동작합니다. 브라우저에서 주소를 직접 열면 로그인 정보를 받을 수 없습니다.',
  authFailedTitle: '로그인 정보를 받지 못했습니다',
  authFailedBody:
    '앱 권한 설정이 끝나지 않았거나, 계정에 이 앱을 쓸 권한이 없을 수 있습니다. 관리자에게 문의해 주세요.',
  expiredTitle: '로그인이 만료되었습니다',
  expiredBody: '탭을 새로고침하면 다시 로그인됩니다.',
  notConfiguredTitle: '아직 설정이 끝나지 않았습니다',
  notConfiguredBody: '서버 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.',
  upstreamTitle: '검색 서버에 연결하지 못했습니다',
  upstreamBody: '잠시 후 다시 시도해 주세요. 계속되면 관리자에게 알려주세요.',
  unknownTitle: '검색하지 못했습니다',
  unknownBody: '알 수 없는 오류가 발생했습니다.',
}

const vi: Strings = {
  title: 'Tra cứu quy định',
  languageLabel: 'Ngôn ngữ',
  newChat: 'Cuộc trò chuyện mới',
  emptyTitle: 'Bạn muốn hỏi điều gì?',
  emptyBody:
    'Hãy hỏi như khi bạn nói chuyện thường ngày. Chúng tôi sẽ kèm theo điều khoản và ngày hiệu lực làm căn cứ.',
  placeholder: 'Ví dụ: Mức phụ cấp khách sạn khi công tác nước ngoài là bao nhiêu?',
  send: 'Gửi',
  searching: 'Đang kiểm tra tài liệu',
  toolSearch: 'Tra cứu quy định nội bộ',
  toolFailed: 'thất bại',
  retry: 'Thử lại',
  suggestions: [
    'Mức phụ cấp khách sạn khi công tác nước ngoài là bao nhiêu?',
    'Trước khi đi công tác cần chuẩn bị những gì?',
    'Khi nào tôi có thể dùng phép năm?',
  ],
  notInTeamsTitle: 'Vui lòng mở trong Teams',
  notInTeamsBody:
    'Màn hình này hoạt động như một tab của ứng dụng Teams. Nếu mở trực tiếp bằng trình duyệt, hệ thống không nhận được thông tin đăng nhập.',
  authFailedTitle: 'Không nhận được thông tin đăng nhập',
  authFailedBody:
    'Có thể phần cấp quyền cho ứng dụng chưa hoàn tất, hoặc tài khoản của bạn chưa được phép dùng ứng dụng này. Vui lòng liên hệ quản trị viên.',
  expiredTitle: 'Phiên đăng nhập đã hết hạn',
  expiredBody: 'Hãy tải lại tab để đăng nhập lại.',
  notConfiguredTitle: 'Hệ thống chưa được cấu hình xong',
  notConfiguredBody: 'Cấu hình máy chủ chưa hoàn tất. Vui lòng liên hệ quản trị viên.',
  upstreamTitle: 'Không kết nối được máy chủ tra cứu',
  upstreamBody: 'Vui lòng thử lại sau. Nếu vẫn lỗi, hãy báo cho quản trị viên.',
  unknownTitle: 'Không thể tra cứu',
  unknownBody: 'Đã xảy ra lỗi không xác định.',
}

const en: Strings = {
  title: 'Policy Search',
  languageLabel: 'Language',
  newChat: 'New chat',
  emptyTitle: 'What would you like to know?',
  emptyBody:
    'Ask in plain language. Answers come with the regulation and its effective date.',
  placeholder: 'e.g. What is the accommodation limit for overseas travel?',
  send: 'Send',
  searching: 'Checking the documents',
  toolSearch: 'Internal policy search',
  toolFailed: 'failed',
  retry: 'Try again',
  suggestions: [
    'What is the accommodation limit for overseas travel?',
    'What do I need to do before a business trip?',
    'When can I start using annual leave?',
  ],
  notInTeamsTitle: 'Please open this inside Teams',
  notInTeamsBody:
    'This screen runs as a Teams app tab. Opening the address directly in a browser means it cannot receive your sign-in.',
  authFailedTitle: 'Could not get your sign-in',
  authFailedBody:
    'App permissions may not be finished, or your account may not be allowed to use this app. Please contact your administrator.',
  expiredTitle: 'Your session expired',
  expiredBody: 'Refresh the tab to sign in again.',
  notConfiguredTitle: 'Setup is not finished yet',
  notConfiguredBody: 'The server is not fully configured. Please contact your administrator.',
  upstreamTitle: 'Could not reach the search server',
  upstreamBody: 'Please try again shortly. If it keeps happening, let your administrator know.',
  unknownTitle: 'Search failed',
  unknownBody: 'An unexpected error occurred.',
}

const DICTIONARY: Record<Lang, Strings> = { ko, vi, en }

export function stringsFor(lang: Lang): Strings {
  return DICTIONARY[lang] ?? DICTIONARY[DEFAULT_LANG]
}

/** 사용자가 고른 언어를 기억한다. 자동 판정이 틀린 사람에게 매번 고르게 하지 않는다. */
const STORAGE_KEY = 'genie.teams.lang'

export function readStoredLang(): Lang | null {
  if (typeof window === 'undefined') return null
  try {
    return toLang(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    // 사생활 보호 모드 등에서 localStorage 접근이 막힐 수 있다. 저장은 부가 기능이라
    // 여기서 실패해도 화면은 그대로 동작해야 한다.
    return null
  }
}

export function storeLang(lang: Lang): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* 위와 같은 이유로 무시한다 */
  }
}
