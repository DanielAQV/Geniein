'use client'

/**
 * 미리보기 알맹이.
 *
 * 기본은 **로컬 뇌에 실제로 질문한다** (`/api/teams/preview-search`, 개발 빌드 전용).
 * 그 경로가 없거나 설정이 안 됐으면 캔에 담긴 예시 응답으로 떨어진다.
 *
 * ★ 떨어졌다는 사실을 반드시 화면에 밝힌다. 처음엔 조용히 고정 응답만 내놨는데,
 *   무슨 질문을 해도 같은 답이 나오니 **에이전트가 질문을 무시하는 것처럼 보였다.**
 *   미리보기가 가짜라는 것을 미리보기가 스스로 말하지 않으면, 디자인을 보는 도구가
 *   제품이 고장 났다는 오해를 만든다.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { FlaskConical, Info } from 'lucide-react'
import { ChatView, type ChatTurn, type ToolChip } from '../_components/chat-view'
import { normalizeTheme, type TeamsTheme } from '../_components/teams-theme-sync'

const MAX_HISTORY_TURNS = 20

const SUGGESTIONS = [
  '해외 출장 숙박비 한도가 얼마인가요?',
  '출장 가기 전에 뭘 해야 하나요?',
  '연차는 언제부터 쓸 수 있나요?',
]

const CANNED_ANSWER = `해외출장 숙박비 한도는 **1일 최대 150 USD**입니다 (실비 정산, 세금계산서/영수증 첨부 기준).

- 한도를 초과하는 경우 사전에 대표이사(General Director) 승인 필요
- 1일 이내 출장이거나 회사가 숙박을 직접 마련한 경우 별도 지급 안 됨

**근거**: 「Regulation for Business Trip Allowance」(2018-06-26 시행) IV.2.2.4

⚠️ 이 문서는 스캔본 전사본이라 금액은 인사팀 확인을 권해드립니다.`

// 실제 답변에는 표가 섞여 나온다. 표가 없으면 렌더링이 깨지는지 알 수 없다.
const CANNED_FOLLOW_UP = `국내 출장 일비(교통·식비 등)는 직급별로 아래와 같이 최대 지급됩니다.

| 직급 | 국내 최대 일비 |
|---|---|
| General Director | 300,000 VND |
| Manager | 250,000 VND |
| Leader | 200,000 VND |
| Staff | 150,000 VND |

- 실제 출장 기간에 따라 지급되며, 승인된 출장 문서가 있어야 지급됩니다

**근거**: 「Regulation for Business Trip Allowance」(2018-06-26 시행) IV장 2.2.4`

const THEMES: { value: TeamsTheme; label: string }[] = [
  { value: 'default', label: '라이트' },
  { value: 'dark', label: '다크' },
  { value: 'contrast', label: '고대비' },
]

type Mode = 'unknown' | 'live' | 'canned'

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

function Banner({ mode, reason }: { mode: Mode; reason: string }) {
  if (mode === 'unknown') return null

  const canned = mode === 'canned'

  return (
    <div
      className={`shrink-0 border-b px-4 py-2 ${
        canned ? 'border-destructive/30 bg-destructive/8' : 'border-border bg-muted'
      }`}
    >
      <div className="mx-auto flex w-full max-w-3xl items-start gap-2">
        {canned ? (
          <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
        ) : (
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <p className={`text-[11px] leading-relaxed ${canned ? 'text-destructive' : 'text-muted-foreground'}`}>
          {canned ? (
            <>
              <strong className="font-semibold">고정 예시 응답입니다 — 실제 답변이 아닙니다.</strong>{' '}
              질문 내용과 무관하게 준비된 두 답변이 번갈아 나옵니다. {reason}
            </>
          ) : (
            <>로컬 뇌에 실제로 질문하고 있습니다. 답변까지 40~60초 걸립니다.</>
          )}
        </p>
      </div>
    </div>
  )
}

function historyFor(turns: ChatTurn[]) {
  const spoken = turns
    .filter((t): t is Extract<ChatTurn, { role: 'user' | 'assistant' }> =>
      t.role === 'user' || t.role === 'assistant',
    )
    .map((t) => ({ role: t.role, text: t.text }))

  while (spoken.length > 0 && spoken[spoken.length - 1].role === 'user') spoken.pop()
  return spoken.slice(-MAX_HISTORY_TURNS)
}

export function PreviewClient() {
  /** null = "아직 안 읽음". 인라인 스크립트(`?theme=`)가 세운 값을 덮지 않기 위해서다. */
  const [theme, setTheme] = useState<TeamsTheme | null>(null)
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [pending, setPending] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [mode, setMode] = useState<Mode>('unknown')
  const [reason, setReason] = useState('')

  const nextId = useRef(0)
  const cannedCount = useRef(0)
  const makeId = () => `p${nextId.current++}`

  useEffect(() => {
    setTheme(normalizeTheme(document.documentElement.getAttribute('data-teams-theme')))
  }, [])

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

  const pushCanned = useCallback((why: string) => {
    const isFollowUp = cannedCount.current > 0
    cannedCount.current += 1
    setMode('canned')
    setReason(why)
    setTurns((prev) => [
      ...prev,
      {
        id: makeId(),
        role: 'assistant',
        text: isFollowUp ? CANNED_FOLLOW_UP : CANNED_ANSWER,
        tools: [] as ToolChip[],
      },
    ])
  }, [])

  const onSend = useCallback(
    (text: string) => {
      const history = historyFor(turns)
      setTurns((prev) => [...prev, { id: makeId(), role: 'user', text }])
      setPending(true)

      void (async () => {
        try {
          const response = await fetch('/api/teams/preview-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, history }),
          })

          if (!response.ok) {
            const code = await response
              .json()
              .then((b) => String(b?.error ?? ''))
              .catch(() => '')
            pushCanned(
              code === 'preview_not_configured'
                ? 'apps/web/.env 에 RAG_SERVICE_URL · AGENT_SERVICE_TOKEN · TEAMS_PREVIEW_ORG_ID 를 넣으면 실제로 물어봅니다.'
                : '뇌를 부르지 못했습니다 (로컬 agent-service 가 떠 있는지 확인하세요).',
            )
            return
          }

          const result = (await response.json()) as { text: string; tools?: ToolChip[] }
          setMode('live')
          setTurns((prev) => [
            ...prev,
            { id: makeId(), role: 'assistant', text: result.text, tools: result.tools ?? [] },
          ])
        } catch {
          pushCanned('미리보기 경로에 연결하지 못했습니다.')
        } finally {
          setPending(false)
        }
      })()
    },
    [turns, pushCanned],
  )

  const onReset = useCallback(() => {
    cannedCount.current = 0
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
        suggestions={SUGGESTIONS}
        notice={<Banner mode={mode} reason={reason} />}
      />
    </>
  )
}
