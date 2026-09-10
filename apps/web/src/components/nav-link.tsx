"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";

import { scrollToPageTop, scrollToTabRow } from "@/lib/layout";

/**
 * 지금 보고 있는 페이지의 메뉴를 다시 눌렀을 때를 처리하는 링크.
 *
 * Next 의 Link 는 목적지가 현재 URL 과 같으면 아무 것도 하지 않는다 — 라우팅이
 * 없으니 스크롤도 그대로다. 사용자 눈에는 "메뉴를 눌렀는데 반응이 없는" 상태다.
 *
 * 같은 목적지면 라우팅을 막고 직접 두 가지를 한다.
 *   1) 스크롤 이동 — 상위 메뉴는 맨 위로, 카테고리 메뉴(`?category=…`)는 탭 줄로.
 *      페이지를 옮겨 다닐 때와 같은 규칙이다.
 *   2) router.refresh() — 서버에서 내려오는 내용(채용 공고 등)을 다시 받는다.
 *      화면이 하얗게 껌뻑이는 새로고침이 아니라 조용히 갱신된다.
 *
 * ★ 현재 주소를 usePathname/useSearchParams 가 아니라 click 시점의
 *   window.location 에서 읽는다. useSearchParams 를 헤더에 넣으면 정적으로
 *   렌더되는 페이지들이 Suspense 경계를 요구하게 된다 — 핸들러는 브라우저에서만
 *   돌므로 window 로 충분하다.
 */
type NavLinkProps = ComponentProps<typeof Link>;

export function NavLink({ href, onClick, ...rest }: NavLinkProps) {
  const router = useRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // 메뉴를 닫는 등 호출한 쪽의 동작은 같은 페이지든 아니든 그대로 실행한다.
    onClick?.(event);

    // 새 탭·다운로드 등 브라우저에 맡겨야 하는 클릭은 건드리지 않는다.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = typeof href === "string" ? href : (href.pathname ?? "");
    if (!target.startsWith("/")) return;

    const [targetPath, targetQuery = ""] = target.split("?");
    const currentQuery = window.location.search.replace(/^\?/, "");
    if (targetPath !== window.location.pathname) return;
    if (targetQuery !== currentQuery) return;

    event.preventDefault();

    /* 도착 지점은 메뉴 종류에 따라 다르다. 카테고리를 지정하는 메뉴(사업분야
       드롭다운의 플랫폼/ODA 등)는 탭 줄까지, 나머지 상위 메뉴는 맨 위까지. */
    const jumpedToTabRow = targetQuery !== "" && scrollToTabRow();
    if (!jumpedToTabRow) scrollToPageTop();

    /* 갱신은 스크롤이 끝난 뒤에 건다. 스크롤 애니메이션 중에 리렌더가 끼면
       브라우저가 진행 중인 smooth 스크롤을 취소한다 — 실제로 그래서 맨 위까지
       올라가지 않고 제자리에 멈췄다. scrollend 를 모르는 브라우저(사파리)는
       타이머로 대체한다. */
    if (jumpedToTabRow || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.refresh();
    } else if ("onscrollend" in window) {
      window.addEventListener("scrollend", () => router.refresh(), {
        once: true,
      });
    } else {
      setTimeout(() => router.refresh(), 600);
    }
  };

  return <Link href={href} onClick={handleClick} {...rest} />;
}
