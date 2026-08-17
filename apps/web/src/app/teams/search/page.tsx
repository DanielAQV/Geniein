'use client'

/**
 * Teams 탭 — 사규 대화.
 *
 * 이 화면이 브라우저에서 부르는 것은 같은 오리진의 `/api/teams/*` 둘뿐이다.
 * NestJS 도 뇌도 여기서 보이지 않는다 (docs/TEAMS_TAB_DESIGN.md 2장).
 *
 * ★ 응답이 수 초~수십 초 걸린다. 검색만 하는 게 아니라 에이전트 루프를 타면서
 *   Claude 가 근거를 읽고 인용을 정리하기 때문이다. 그래서 경과 시간 표시가
 *   선택이 아니라 필수다.
 *
 * ★ 화면은 표시만 하는 ChatView 에 맡기고 여기서는 **상태·네트워크·언어**만 다룬다.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { NotInTeamsError, TeamsAuthError, getTeamsToken, initTeams } from '@/lib/teams/client'
import { ChatView, type ChatTurn, type ToolChip } from '../_components/chat-view'
import {
  DEFAULT_LANG,
  readStoredLang,
  resolveLang,
  storeLang,
  stringsFor,
  type Lang,
  type Strings,
} from '../_lib/i18n'

interface SearchResult {
  text: string
  refused: boolean
  tools: ToolChip[]
}

/** 모델에게 넘길 이력의 상한. 서버(BFF·NestJS·뇌)에도 같은 상한이 있다. */
const MAX_HISTORY_TURNS = 20

/**
 * 원문 오류를 화면에 남길지. 평소 운영에서는 감춘다 — 사용자가 할 수 있는 일이 없고,
 * MSAL/Entra 오류에는 테넌트·리소스 식별자가 섞여 나온다.
 *
 * 개발에서는 반대로 반드시 보여야 한다. 이 화면은 크로스 오리진 iframe 안이라
 * 바깥에서 콘솔을 읽을 수 없다. `NEXT_PUBLIC_TEAMS_DEBUG=1` 로 운영에서도 한시적으로
 * 켤 수 있다 — 새 호스트에 처음 올릴 때가 정확히 그 상황이다.
 */
const SHOW_TECHNICAL_DETAIL =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_TEAMS_DEBUG === '1'

interface Failure {
  title: string
  detail: string
  canRetry: boolean
  technical?: string
}

function describeFailure(error: unknown, s: Strings): Failure {
  if (error instanceof TeamsAuthError) {
    return {
      title: s.authFailedTitle,
      detail: s.authFailedBody,
      canRetry: true,
      technical: error.message,
    }
  }
  return {
    title: s.unknownTitle,
    detail: error instanceof Error ? error.message : s.unknownBody,
    canRetry: true,
  }
}

/** BFF 가 돌려주는 오류 코드를 사람이 읽는 문장으로. 코드 자체는 노출하지 않는다. */
function describeBffError(status: number, code: string, s: Strings): Failure {
  if (status === 401) {
    return { title: s.expiredTitle, detail: s.expiredBody, canRetry: true }
  }
  if (code === 'upstream_not_configured') {
    return { title: s.notConfiguredTitle, detail: s.notConfiguredBody, canRetry: false }
  }
  return { title: s.upstreamTitle, detail: s.upstreamBody, canRetry: true }
}

/**
 * 모델에게 넘길 이력을 고른다.
 *
 * 오류는 대화가 아니므로 뺀다. 끝이 사용자 발언이면 그것도 뺀다 — 이번에 보내는
 * 질문이 바로 그 발언이라 두 번 들어간다 (뇌도 같은 정리를 하지만, 보내는 쪽에서
 * 맞추는 편이 서버 로그를 읽을 때 헷갈리지 않는다).
 */
function historyFor(turns: ChatTurn[]): { role: 'user' | 'assistant'; text: string }[] {
  const spoken = turns
    .filter((turn): turn is Extract<ChatTurn, { role: 'user' | 'assistant' }> =>
      turn.role === 'user' || turn.role === 'assistant',
    )
    .map((turn) => ({ role: turn.role, text: turn.text }))

  while (spoken.length > 0 && spoken[spoken.length - 1].role === 'user') {
    spoken.pop()
  }

  return spoken.slice(-MAX_HISTORY_TURNS)
}

/** Teams 클라이언트가 설정된 언어. 못 읽으면 null — 다음 근거로 넘어간다. */
async function teamsLocale(): Promise<string | null> {
  try {
    const { app } = await import('@microsoft/teams-js')
    const context = await app.getContext()
    return context.app.locale ?? null
  } catch {
    return null
  }
}

/** Entra 계정에 설정된 언어. 없을 수 있고, 실패해도 화면은 떠야 한다. */
async function accountLocale(token: string): Promise<string | null> {
  try {
    const response = await fetch('/api/teams/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) return null
    const body = (await response.json()) as { language?: unknown }
    return typeof body.language === 'string' ? body.language : null
  } catch {
    return null
  }
}

export default function TeamsSearchPage() {
  const [boot, setBoot] = useState<'booting' | 'ready' | 'blocked'>('booting')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [pending, setPending] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  /**
   * ★ 저장된 선택이 있으면 그것으로 시작한다. 자동 판정을 기다렸다가 바꾸면
   *   직접 고른 사람에게 화면이 한 번 번쩍인다.
   */
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG)
  const chosenByUser = useRef(false)

  const strings = stringsFor(lang)

  /** 다시 시도할 질문. 오류가 났을 때 사용자가 다시 입력하지 않아도 되게. */
  const lastQuestion = useRef('')
  const nextId = useRef(0)
  const makeId = () => `t${nextId.current++}`

  // 저장된 선택을 먼저 반영한다 (SSR 이후 첫 effect).
  useEffect(() => {
    const stored = readStoredLang()
    if (stored) {
      chosenByUser.current = true
      setLang(stored)
    }
  }, [])

  // 마운트 시 환경을 먼저 확인한다. 질문을 입력하고 기다린 뒤에야
  // "Teams 가 아니다"를 보게 되면 늦다.
  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        await initTeams()
        if (cancelled) return
        setBoot('ready')

        // 언어는 부팅을 막지 않는다. 늦게 와도 문구만 바뀐다.
        if (chosenByUser.current) return
        const [fromTeams, token] = await Promise.all([
          teamsLocale(),
          getTeamsToken().catch(() => null),
        ])
        const fromAccount = token ? await accountLocale(token) : null
        if (cancelled || chosenByUser.current) return

        // 순서가 곧 우선순위다 — 계정 설정이 클라이언트 UI 설정보다 낫다.
        setLang(resolveLang(fromAccount, fromTeams))
      } catch (error) {
        if (cancelled) return
        // Teams 밖이면 어떤 질문도 처리할 수 없다 — 대화창 대신 안내만 띄운다.
        setBoot(error instanceof NotInTeamsError ? 'blocked' : 'ready')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // 경과 시간. 이게 없으면 멈춘 것처럼 보인다.
  useEffect(() => {
    if (!pending) return
    setElapsed(0)
    const started = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [pending])

  const onLangChange = useCallback((next: Lang) => {
    chosenByUser.current = true
    storeLang(next)
    setLang(next)
  }, [])

  /**
   * `chosen` 은 **사용자가 직접 고른 언어**이고, 자동 판정 결과는 넣지 않는다.
   *
   * ★ 이 구분이 없으면 신호가 흐려진다. 자동 판정은 이미 계정 언어와 Teams locale
   *   에서 나온 값이라, 그걸 되돌려 보내면 서버가 "사용자가 골랐다"와 "우리가 추측했다"
   *   를 구분할 수 없다. 서버 쪽 우선순위(발언 언어 > 고른 값 > 계정 언어)가 무의미해진다.
   */
  const ask = useCallback(
    async (question: string, history: ChatTurn[], s: Strings, chosen: Lang | null) => {
      setPending(true)
      try {
        // 토큰은 보관하지 않고 매번 받는다 (lib/teams/client.ts 참조)
        const token = await getTeamsToken()

        const response = await fetch('/api/teams/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            text: question,
            history: historyFor(history),
            ...(chosen ? { lang: chosen } : {}),
          }),
        })

        if (!response.ok) {
          const code = await response
            .json()
            .then((body) => String(body?.error ?? ''))
            .catch(() => '')
          const failure = describeBffError(response.status, code, s)
          setTurns((prev) => [...prev, { id: makeId(), role: 'error', ...failure }])
          return
        }

        const result = (await response.json()) as SearchResult
        setTurns((prev) => [
          ...prev,
          { id: makeId(), role: 'assistant', text: result.text, tools: result.tools ?? [] },
        ])
      } catch (error) {
        const failure = describeFailure(error, s)
        setTurns((prev) => [
          ...prev,
          {
            id: makeId(),
            role: 'error',
            ...failure,
            technical: SHOW_TECHNICAL_DETAIL ? failure.technical : undefined,
          },
        ])
      } finally {
        setPending(false)
      }
    },
    [],
  )

  const onSend = useCallback(
    (text: string) => {
      lastQuestion.current = text
      setTurns((prev) => {
        const next: ChatTurn[] = [...prev, { id: makeId(), role: 'user', text }]
        void ask(text, prev, strings, chosenByUser.current ? lang : null)
        return next
      })
    },
    [ask, strings, lang],
  )

  const onRetry = useCallback(() => {
    const question = lastQuestion.current
    if (!question) return
    setTurns((prev) => {
      // 실패 기록을 지우고 같은 질문을 다시 보낸다. 사용자 발언은 그대로 남긴다.
      const next = prev.filter((turn) => turn.role !== 'error')
      void ask(question, next, strings, chosenByUser.current ? lang : null)
      return next
    })
  }, [ask, strings, lang])

  const onReset = useCallback(() => {
    lastQuestion.current = ''
    setTurns([])
  }, [])

  if (boot === 'blocked') {
    return (
      <main className="flex h-dvh items-center justify-center bg-background p-6 text-foreground">
        <div className="flex max-w-md gap-3 rounded-2xl border border-border bg-card p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{strings.notInTeamsTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{strings.notInTeamsBody}</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <ChatView
      turns={turns}
      pending={pending}
      elapsedSec={elapsed}
      onSend={onSend}
      onRetry={onRetry}
      onReset={onReset}
      inputDisabled={boot === 'booting'}
      suggestions={strings.suggestions}
      strings={strings}
      lang={lang}
      onLangChange={onLangChange}
    />
  )
}
