'use client'

/**
 * 미리보기 알맹이. 캔에 담긴 대화로 ChatView 를 그대로 굴린다.
 *
 * 답변 문구는 실제로 뇌가 돌려준 것을 옮겨 왔다. 지어낸 짧은 문장으로 보면
 * 줄바꿈·목록·경고문이 실제로 어떻게 앉는지 알 수 없다.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChatView, type ChatTurn } from '../_components/chat-view'
import { normalizeTheme, type TeamsTheme } from '../_components/teams-theme-sync'

/** 실제 응답 지연(40~60초)을 그대로 재현하면 미리보기가 못 쓰게 느려진다. */
const FAKE_LATENCY_MS = 2200

const CANNED_ANSWER = `해외출장 숙박비 한도는 **1일 최대 150 USD**입니다 (실비 정산, 세금계산서/영수증 첨부 기준).

- 한도를 초과하는 경우 사전에 대표이사(General Director) 승인 필요
- 1일 이내 출장이거나 회사가 숙박을 직접 마련한 경우 별도 지급 안 됨
- 해외 출장은 현지 실제 상황과 승인된 예산안에 따라 유효 영수증 기준으로 지급

**근거**: 「Regulation for Business Trip Allowance」(2018-06-26 시행) IV.2.2.4 (Accommodation allowance)

⚠️ 이 문서는 스캔본 전사본으로 금액이 사람 대조를 거치지 않았고, 시행일도 2018년으로 다소 오래됐습니다. 정확한 금액 확인 및 최신 개정 여부는 인사팀에 재확인하시는 걸 권해드립니다.`

// 실제 답변에는 표가 섞여 나온다 (직급별 금액 등). 미리보기에 표가 없으면
// 렌더링이 깨지는지 알 수 없어서, 되묻기 답변은 표가 있는 쪽으로 골랐다.
const CANNED_FOLLOW_UP = `국내 출장 일비(교통·식비 등)는 직급별로 아래와 같이 최대 지급됩니다.

| 직급 | 국내 최대 일비 |
|---|---|
| General Director | 300,000 VND |
| Manager | 250,000 VND |
| Leader | 200,000 VND |
| Staff | 150,000 VND |

- 실제 출장 기간에 따라 지급되며, 승인된 출장 문서가 있어야 지급됩니다
- 숙박비는 국내·해외 공통으로 **1일 최대 150 USD** 입니다

**근거**: 「Regulation for Business Trip Allowance」(2018-06-26 시행) IV장 2.2.4

⚠️ 같은 스캔본 문서라 금액은 인사팀 확인을 권해드립니다.`

const THEMES: { value: TeamsTheme; label: string }[] = [
  { value: 'default', label: '라이트' },
  { value: 'dark', label: '다크' },
  { value: 'contrast', label: '고대비' },
]

function ThemeSwitcher({
  theme,
  onChange,
}: {
  theme: TeamsTheme
  onChange: (next: TeamsTheme) => void
}) {
  // 아래쪽에 둔다. 위 오른쪽은 헤더의 "새 대화" 자리라 겹친다.
  return (
    <div className="fixed bottom-3 right-3 z-50 flex items-center gap-1 rounded-full border border-border bg-card/95 p-1 shadow-sm backdrop-blur">
      <span className="px-2 text-[11px] text-muted-foreground">미리보기</span>
      {THEMES.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
            theme === option.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function PreviewClient() {
  /**
   * null = "아직 안 읽음". 초기값을 'default' 로 두면 첫 렌더의 적용 effect 가
   * 인라인 스크립트(`?theme=`)가 세운 값을 덮어써서, 미리보기가 실제 동작과
   * 다르게 보인다.
   */
  const [theme, setTheme] = useState<TeamsTheme | null>(null)
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [pending, setPending] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const nextId = useRef(0)
  const replyCount = useRef(0)
  const makeId = () => `p${nextId.current++}`

  // 먼저 읽는다 — 인라인 스크립트가 세운 값이 출발점이다.
  useEffect(() => {
    setTheme(normalizeTheme(document.documentElement.getAttribute('data-teams-theme')))
  }, [])

  // 읽은 뒤부터 전환을 반영한다.
  useEffect(() => {
    if (theme) document.documentElement.setAttribute('data-teams-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!pending) return
    setElapsed(0)
    const started = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [pending])

  const onSend = useCallback((text: string) => {
    setTurns((prev) => [...prev, { id: makeId(), role: 'user', text }])
    setPending(true)

    setTimeout(() => {
      const isFollowUp = replyCount.current > 0
      replyCount.current += 1
      setTurns((prev) => [
        ...prev,
        {
          id: makeId(),
          role: 'assistant',
          text: isFollowUp ? CANNED_FOLLOW_UP : CANNED_ANSWER,
          tools: [{ name: 'search_knowledge', outcome: 'ok' }],
        },
      ])
      setPending(false)
    }, FAKE_LATENCY_MS)
  }, [])

  const onReset = useCallback(() => {
    replyCount.current = 0
    setTurns([])
  }, [])

  return (
    <>
      <ThemeSwitcher theme={theme ?? 'default'} onChange={setTheme} />
      <ChatView
        turns={turns}
        pending={pending}
        elapsedSec={elapsed}
        onSend={onSend}
        onRetry={() => undefined}
        onReset={onReset}
        suggestions={[
          '해외 출장 숙박비 한도가 얼마인가요?',
          '연차는 언제부터 쓸 수 있나요?',
          '경조사 휴가는 며칠인가요?',
        ]}
      />
    </>
  )
}
