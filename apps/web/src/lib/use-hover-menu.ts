"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * 호버로 여닫는 헤더 드롭다운의 열림 상태.
 *
 * ★ 왜 지연이 필요한가.
 *   Radix 의 DropdownMenuContent 는 포털로 트리거 **밖에** 그려지고,
 *   sideOffset 기본값 4px 만큼 떨어져 뜬다. 그 4px 에는 아무 요소도 없다.
 *   마우스가 트리거에서 패널로 내려가는 길에 그 틈을 지나는 순간
 *   트리거의 onMouseLeave 가 먼저 터져 패널이 닫히고, 패널에 도착하면
 *   다시 열린다 — 메뉴를 고르는 중에 한 번 끊겼다 다시 보이는 이유다.
 *
 *   닫기만 조금 늦춰서 그 사이를 메운다. 여는 것은 즉시다 — 열리는 데
 *   지연을 주면 메뉴가 둔하게 느껴진다.
 *
 * 지연만으로 대각선 이동(트리거에서 패널 모서리로 바로 긋는 움직임)까지
 * 받아내지는 못하므로, 호출하는 쪽에서 트리거 래퍼에 `py-2 -my-2` 처럼
 * 레이아웃을 밀지 않는 여백을 줘서 히트박스도 같이 넓힌다.
 */
const CLOSE_DELAY_MS = 160

export function useHoverMenu() {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const onEnter = useCallback(() => {
    cancel()
    setOpen(true)
  }, [cancel])

  const onLeave = useCallback(() => {
    cancel()
    timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }, [cancel])

  /* 언마운트 뒤에 타이머가 살아 있으면 안 된다. */
  useEffect(() => cancel, [cancel])

  return { open, setOpen, onEnter, onLeave }
}
