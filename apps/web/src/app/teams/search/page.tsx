'use client'

/**
 * Teams 탭 — 사규 대화.
 *
 * 이 화면이 브라우저에서 부르는 것은 같은 오리진의 `/api/teams/search` 하나뿐이다.
 * NestJS 도 뇌도 여기서 보이지 않는다 (docs/TEAMS_TAB_DESIGN.md 2장).
 *
 * ★ 응답이 수 초~수십 초 걸린다. 검색만 하는 게 아니라 에이전트 루프를 타면서
 *   Claude 가 근거를 읽고 인용을 정리하기 때문이다 (같은 문서 1장). 그래서
 *   경과 시간 표시가 선택이 아니라 필수다.
 *
 * ★ 화면은 표시만 하는 ChatView 에 맡기고 여기서는 **상태와 네트워크만** 다룬다.
 *   같은 화면을 /teams/preview 가 캔에 담긴 대화로 재사용한다.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { NotInTeamsError, TeamsAuthError, getTeamsToken, initTeams } from '@/lib/teams/client'
import { ChatView, type ChatTurn, type ToolChip } from '../_components/chat-view'

interface SearchResult {
  text: string
  refused: boolean
  tools: ToolChip[]
}

/** 모델에게 넘길 이력의 상한. 서버(BFF·NestJS·뇌)에도 같은 상한이 있다. */
const MAX_HISTORY_TURNS = 20

const SUGGESTIONS = [
  '해외 출장 숙박비 한도가 얼마인가요?',
  '연차는 언제부터 쓸 수 있나요?',
  '경조사 휴가는 며칠인가요?',
]

/**
 * 원문 오류를 화면에 남길지. 평소 운영에서는 감춘다 — 사용자가 할 수 있는 일이 없고,
 * MSAL/Entra 오류에는 테넌트·리소스 식별자가 섞여 나온다.
 *
 * 개발에서는 반대로 **반드시 보여야 한다.** 이 화면은 크로스 오리진 iframe 안이라
 * 바깥에서 콘솔을 읽을 수 없다. 여기 안 띄우면 SSO 실패 원인을 볼 방법이 아예 없다
 * (실제로 "App resource ... do not match" 를 이걸로 찾았다).
 *
 * ★ 그래서 운영에서도 켤 수 있어야 한다. 새 호스트에 처음 올릴 때가 정확히 그
 *   상황이다 — 배포는 운영 빌드인데 확인해야 할 것은 개발 때와 같다.
 *   `NEXT_PUBLIC_TEAMS_DEBUG=1` 로 한시적으로 켜고, 통과하면 지운다.
 */
const SHOW_TECHNICAL_DETAIL =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_TEAMS_DEBUG === '1'

interface Failure {
  title: string
  detail: string
  canRetry: boolean
  technical?: string
}

function describeFailure(error: unknown): Failure {
  if (error instanceof TeamsAuthError) {
    return {
      title: '로그인 정보를 받지 못했습니다',
      detail:
        '앱 권한 설정이 끝나지 않았거나, 계정에 이 앱을 쓸 권한이 없을 수 있습니다. 관리자에게 문의해 주세요.',
      canRetry: true,
      technical: error.message,
    }
  }
  return {
    title: '검색하지 못했습니다',
    detail: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    canRetry: true,
  }
}

/** BFF 가 돌려주는 오류 코드를 사람이 읽는 문장으로. 코드 자체는 노출하지 않는다. */
function describeBffError(status: number, code: string): Failure {
  if (status === 401) {
    return {
      title: '로그인이 만료되었습니다',
      detail: '탭을 새로고침하면 다시 로그인됩니다.',
      canRetry: true,
    }
  }
  if (code === 'upstream_not_configured') {
    return {
      title: '아직 설정이 끝나지 않았습니다',
      detail: '서버 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.',
      canRetry: false,
    }
  }
  return {
    title: '검색 서버에 연결하지 못했습니다',
    detail: '잠시 후 다시 시도해 주세요. 계속되면 관리자에게 알려주세요.',
    canRetry: true,
  }
}

/**
 * 모델에게 넘길 이력을 고른다.
 *
 * 오류는 대화가 아니므로 뺀다. 끝이 사용자 발언이면 그것도 뺀다 — 이번에 보내는
 * 질문이 바로 그 발언이라 두 번 들어가게 된다 (뇌도 같은 정리를 하지만, 보내는
 * 쪽에서 맞추는 편이 서버 로그를 읽을 때 헷갈리지 않는다).
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

export default function TeamsSearchPage() {
  const [boot, setBoot] = useState<'booting' | 'ready' | 'blocked'>('booting')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [pending, setPending] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  /** 다시 시도할 질문. 오류가 났을 때 사용자가 다시 입력하지 않아도 되게. */
  const lastQuestion = useRef('')
  const nextId = useRef(0)
  const makeId = () => `t${nextId.current++}`

  // 마운트 시 환경을 먼저 확인한다. 질문을 입력하고 기다린 뒤에야
  // "Teams 가 아니다"를 보게 되면 늦다.
  useEffect(() => {
    let cancelled = false
    initTeams().then(
      () => {
        if (!cancelled) setBoot('ready')
      },
      (error) => {
        if (cancelled) return
        // Teams 밖이면 어떤 질문도 처리할 수 없다 — 대화창 대신 안내만 띄운다.
        setBoot(error instanceof NotInTeamsError ? 'blocked' : 'ready')
      },
    )
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

  const ask = useCallback(async (question: string, history: ChatTurn[]) => {
    setPending(true)
    try {
      // 토큰은 보관하지 않고 매번 받는다 (lib/teams/client.ts 참조)
      const token = await getTeamsToken()

      const response = await fetch('/api/teams/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: question, history: historyFor(history) }),
      })

      if (!response.ok) {
        const code = await response
          .json()
          .then((body) => String(body?.error ?? ''))
          .catch(() => '')
        const failure = describeBffError(response.status, code)
        setTurns((prev) => [...prev, { id: makeId(), role: 'error', ...failure }])
        return
      }

      const result = (await response.json()) as SearchResult
      setTurns((prev) => [
        ...prev,
        { id: makeId(), role: 'assistant', text: result.text, tools: result.tools ?? [] },
      ])
    } catch (error) {
      const failure = describeFailure(error)
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
  }, [])

  const onSend = useCallback(
    (text: string) => {
      lastQuestion.current = text
      setTurns((prev) => {
        const next: ChatTurn[] = [...prev, { id: makeId(), role: 'user', text }]
        void ask(text, prev)
        return next
      })
    },
    [ask],
  )

  const onRetry = useCallback(() => {
    const question = lastQuestion.current
    if (!question) return
    setTurns((prev) => {
      // 실패 기록을 지우고 같은 질문을 다시 보낸다. 사용자 발언은 그대로 남긴다.
      const next = prev.filter((turn) => turn.role !== 'error')
      void ask(question, next)
      return next
    })
  }, [ask])

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
            <p className="text-sm font-medium">Teams 안에서 열어주세요</p>
            <p className="mt-1 text-sm text-muted-foreground">
              이 화면은 Teams 앱의 탭으로 동작합니다. 브라우저에서 주소를 직접 열면
              로그인 정보를 받을 수 없습니다.
            </p>
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
      suggestions={SUGGESTIONS}
    />
  )
}
