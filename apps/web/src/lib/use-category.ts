"use client"

import { useSearchParams } from "next/navigation"

/**
 * 주소의 `?category=` 를 읽는다. 탭을 고르는 값이다.
 *
 * ★ `useSearchParams().get()` 만 믿으면 안 된다. `/business` · `/insights` 는
 *   정적으로 미리 그려지고(`next build` 표에서 `○ Static`), useSearchParams()
 *   를 쓰는 Suspense 경계 안쪽은 **HTML 에 폴백만 실려 나간다.** 잰 값
 *   (2026-09-10, 로컬 운영 빌드와 사는 사이트가 같았다):
 *
 *       class="h-96" 폴백    1개
 *       id="platforms"       0개
 *       id="oda"             0개
 *
 *   탭 줄과 탭 내용은 전부 하이드레이션 뒤 클라이언트에서 그려진다. 그 첫
 *   렌더에서 훅이 빈 값을 주는 순간이 있는데, 예전 코드는 그 값을 `useState`
 *   에 굳혀 뒀다. `searchParams` 객체가 다시 안 바뀌면 효과도 다시 안 돌아서
 *   **`?category=oda` 로 직접 들어오거나 새로고침하면 영영 첫 탭이 떴다.**
 *   탭을 눌러 이동하면(클라이언트 이동) 제대로 됐기 때문에 오래 안 보였다.
 *
 * `location.search` 는 클라이언트에서 항상 맞다. 훅이 값을 줄 때는 훅을 믿고,
 * 안 줄 때만 주소를 직접 읽는다.
 *
 * ★ 이 값을 `useState` 에 담지 마라. 탭은 주소에서 나오는 **파생값**이다 —
 *   담는 순간 위의 버그가 그대로 돌아온다.
 *
 * ★ 부르는 쪽은 여전히 `<Suspense>` 안에 있어야 한다. useSearchParams() 가
 *   미리그리기에서 경계를 요구하는 것은 그대로다.
 */
export function useCategory(): string | null {
  const searchParams = useSearchParams()
  const fromHook = searchParams.get("category")
  if (fromHook) return fromHook
  if (typeof window === "undefined") return null
  return new URLSearchParams(window.location.search).get("category")
}
