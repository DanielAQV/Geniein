/** 고정 헤더 높이 (h-15 = 60px + 아래 보더 1px). 탭 네비의 `sticky top-[61px]` 과 같은 값이다. */
export const HEADER_HEIGHT = 61;

const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";

/** 페이지 맨 위로. 헤더 상위 메뉴를 눌렀을 때의 도착 지점. */
export function scrollToPageTop() {
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia(REDUCE_MOTION).matches ? "auto" : "smooth",
  });
}

/**
 * 탭 줄이 헤더 바로 밑에 붙도록 스크롤. 드롭다운의 카테고리 메뉴와 화면 안 탭을
 * 눌렀을 때의 도착 지점이다.
 *
 * 기준점은 탭 네비 바로 앞에 두는 `[data-tab-anchor]` 0px 마커 — 네비 자체를
 * 재면 상단에 붙은 뒤 위치가 틀어지고, 네비를 래퍼로 감싸면 sticky 가 죽는다.
 *
 * ★ 한 번만 스크롤하면 안 된다. 다른 페이지에서 막 넘어온 순간에는 탭 콘텐츠가
 *   아직 Suspense 대기 중이라 문서가 짧고, 브라우저가 스크롤을 문서 끝으로
 *   깎아버린다(clamp). 그래서 실제로 목표보다 108px 모자란 곳에 멈췄다. 문서
 *   크기가 바뀔 때마다 다시 맞추고, 사용자가 스크롤을 건드리면 즉시 멈춘다.
 *
 * 이동은 즉시(auto)다. 탭 콘텐츠가 교체되는 리렌더가 끼면 브라우저가 진행 중인
 * smooth 스크롤을 취소해서 중간에 멈춘다.
 *
 * @returns 마커가 있어 스크롤을 시작했으면 true (탭이 없는 페이지에서는 false)
 */
export function scrollToTabRow(): boolean {
  const anchor = document.querySelector<HTMLElement>("[data-tab-anchor]");
  if (!anchor) return false;

  let done = false;

  const align = () => {
    if (done) return;
    const target = Math.max(
      anchor.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT,
      0,
    );
    if (Math.abs(window.scrollY - target) < 2) return;
    window.scrollTo({ top: target, behavior: "auto" });
  };

  const observer = new ResizeObserver(align);
  const finish = () => {
    done = true;
    observer.disconnect();
    window.removeEventListener("wheel", finish);
    window.removeEventListener("touchstart", finish);
    window.removeEventListener("keydown", finish);
  };

  // 사용자가 직접 스크롤하기 시작하면 더 이상 끌어당기지 않는다.
  window.addEventListener("wheel", finish, { passive: true });
  window.addEventListener("touchstart", finish, { passive: true });
  window.addEventListener("keydown", finish);

  align();
  observer.observe(document.body);
  setTimeout(finish, 1200);
  return true;
}
