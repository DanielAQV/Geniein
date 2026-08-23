'use client'


import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { NotInTeamsError, TeamsAuthError, getTeamsToken, initTeams } from '@/lib/teams/client'
import { ChatView, type ChatTurn, type Phase, type ToolChip } from '../_components/chat-view'
import { readStream } from '../_lib/stream'
import {
  DEFAULT_LANG,
  readStoredLang,
  resolveLang,
  storeLang,
  stringsFor,
  type Lang,
  type Strings,
} from '../_lib/i18n'

const MAX_HISTORY_TURNS = 20

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

function describeBffError(status: number, code: string, s: Strings): Failure {
  if (status === 401) {
    return { title: s.expiredTitle, detail: s.expiredBody, canRetry: true }
  }
  if (code === 'upstream_not_configured') {
    return { title: s.notConfiguredTitle, detail: s.notConfiguredBody, canRetry: false }
  }
  return { title: s.upstreamTitle, detail: s.upstreamBody, canRetry: true }
}

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

function describeStreamError(code: string, s: Strings): Failure {
  return {
    title: s.upstreamTitle,
    detail: s.upstreamBody,
    canRetry: true,
    technical: SHOW_TECHNICAL_DETAIL ? `stream: ${code}` : undefined,
  }
}

async function teamsLocale(): Promise<string | null> {
  try {
    const { app } = await import('@microsoft/teams-js')
    const context = await app.getContext()
    return context.app.locale ?? null
  } catch {
    return null
  }
}

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
  const [phase, setPhase] = useState<Phase | null>(null)
  const [streamingText, setStreamingText] = useState('')

  const [lang, setLang] = useState<Lang>(DEFAULT_LANG)
  const chosenByUser = useRef(false)

  const strings = stringsFor(lang)

  const lastQuestion = useRef('')
  const nextId = useRef(0)
  const makeId = () => `t${nextId.current++}`

  useEffect(() => {
    const stored = readStoredLang()
    if (stored) {
      chosenByUser.current = true
      setLang(stored)
    }
  }, [])

  // 환경 확인은 마운트 시에. 질문을 기다린 뒤에 "Teams 가 아니다"를 보면 늦다.
  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        await initTeams()
        if (cancelled) return
        setBoot('ready')

        if (chosenByUser.current) return
        const [fromTeams, token] = await Promise.all([
          teamsLocale(),
          getTeamsToken().catch(() => null),
        ])
        const fromAccount = token ? await accountLocale(token) : null
        if (cancelled || chosenByUser.current) return

        setLang(resolveLang(fromAccount, fromTeams))
      } catch (error) {
        if (cancelled) return
        setBoot(error instanceof NotInTeamsError ? 'blocked' : 'ready')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

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

  const ask = useCallback(
    async (question: string, history: ChatTurn[], s: Strings, chosen: Lang | null) => {
      setPending(true)
      try {
        const token = await getTeamsToken()

        const response = await fetch('/api/teams/search/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            text: question,
            history: historyFor(history),
            ...(chosen ? { lang: chosen } : {}),
          }),
        })

        // 스트림이 열리기 전의 실패는 여전히 HTTP 상태로 온다.
        if (!response.ok || !response.body) {
          const code = await response
            .json()
            .then((body) => String(body?.error ?? ''))
            .catch(() => '')
          const failure = describeBffError(response.status, code, s)
          setTurns((prev) => [...prev, { id: makeId(), role: 'error', ...failure }])
          return
        }

        const outcome = await readStream(response.body, {
          onPhase: setPhase,
          onText: (full) => setStreamingText(full),
        })

        if (outcome.kind === 'error') {
          setTurns((prev) => [
            ...prev,
            { id: makeId(), role: 'error', ...describeStreamError(outcome.code, s) },
          ])
          return
        }

        // `replace_text` 가 있으면 쌓인 글자를 버린다 — 거절·중단일 때 조각이 남으면 오해를 만든다.
        const text = outcome.replaceText ?? outcome.text
        if (text) {
          setTurns((prev) => [
            ...prev,
            { id: makeId(), role: 'assistant', text, tools: outcome.tools },
          ])
        }
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
        setPhase(null)
        setStreamingText('')
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
      phase={phase}
      streamingText={streamingText}
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
