'use client'

/**
 * Teams 탭 — 사규 검색.
 *
 * 이 화면이 브라우저에서 부르는 것은 같은 오리진의 `/api/teams/search` 하나뿐이다.
 * NestJS 도 뇌도 여기서 보이지 않는다 (docs/TEAMS_TAB_DESIGN.md 2장).
 *
 * ★ 응답이 수 초~수십 초 걸린다. 검색만 하는 게 아니라 에이전트 루프를 타면서
 *   Claude 가 근거를 읽고 인용을 정리하기 때문이다 (같은 문서 1장). 그래서
 *   로딩 표시가 선택이 아니라 필수다 — 경과 시간을 보여주지 않으면 멈춘 걸로 보인다.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, Search } from 'lucide-react'
import { NotInTeamsError, TeamsAuthError, getTeamsToken, initTeams } from '@/lib/teams/client'

interface SearchResult {
  text: string
  refused: boolean
  tools: { name: string; outcome: string }[]
}

type Phase =
  | { kind: 'booting' }
  | { kind: 'ready' }
  | { kind: 'searching' }
  | { kind: 'done'; result: SearchResult }
  | { kind: 'error'; title: string; detail: string; canRetry: boolean }

/** 이 시간을 넘기면 "원래 오래 걸린다"고 알려준다. 그 전에는 잡음이다. */
const PATIENCE_HINT_SEC = 15

function describeFailure(error: unknown): { title: string; detail: string; canRetry: boolean } {
  if (error instanceof NotInTeamsError) {
    return {
      title: 'Teams 안에서 열어주세요',
      detail:
        '이 화면은 Teams 앱의 탭으로 동작합니다. 브라우저에서 주소를 직접 열면 로그인 정보를 받을 수 없습니다.',
      canRetry: false,
    }
  }
  if (error instanceof TeamsAuthError) {
    return {
      title: '로그인 정보를 받지 못했습니다',
      detail:
        '앱 권한 설정이 끝나지 않았거나, 계정에 이 앱을 쓸 권한이 없을 수 있습니다. 관리자에게 문의해 주세요.',
      canRetry: true,
    }
  }
  return {
    title: '검색하지 못했습니다',
    detail: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    canRetry: true,
  }
}

/** BFF 가 돌려주는 오류 코드를 사람이 읽는 문장으로. 코드 자체는 노출하지 않는다. */
function describeBffError(status: number, code: string) {
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

export default function TeamsSearchPage() {
  const [phase, setPhase] = useState<Phase>({ kind: 'booting' })
  const [question, setQuestion] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // 마운트 시 환경을 먼저 확인한다. 질문을 입력하고 기다린 뒤에야
  // "Teams 가 아니다"를 보게 되면 늦다.
  useEffect(() => {
    let cancelled = false
    initTeams().then(
      () => {
        if (cancelled) return
        setPhase({ kind: 'ready' })
        inputRef.current?.focus()
      },
      (error) => {
        if (!cancelled) setPhase({ kind: 'error', ...describeFailure(error) })
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  // 경과 시간. 이게 없으면 멈춘 것처럼 보인다.
  useEffect(() => {
    if (phase.kind !== 'searching') return
    setElapsed(0)
    const started = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [phase.kind])

  const runSearch = useCallback(async () => {
    const text = question.trim()
    if (!text) return

    setPhase({ kind: 'searching' })
    try {
      // 토큰은 보관하지 않고 매번 받는다 (lib/teams/client.ts 참조)
      const token = await getTeamsToken()

      const response = await fetch('/api/teams/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        const code = await response
          .json()
          .then((body) => String(body?.error ?? ''))
          .catch(() => '')
        setPhase({ kind: 'error', ...describeBffError(response.status, code) })
        return
      }

      setPhase({ kind: 'done', result: (await response.json()) as SearchResult })
    } catch (error) {
      setPhase({ kind: 'error', ...describeFailure(error) })
    }
  }, [question])

  const busy = phase.kind === 'searching' || phase.kind === 'booting'

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">사규 검색</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          궁금한 것을 평소 말하듯 물어보세요. 근거가 된 규정과 시행일을 함께 알려드립니다.
        </p>
      </header>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void runSearch()
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={busy}
            maxLength={2000}
            placeholder="예: 해외 출장 숙박비 한도가 얼마인가요?"
            className="w-full rounded-full border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary/50 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !question.trim()}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-40"
        >
          검색
        </button>
      </form>

      {phase.kind === 'searching' && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.02] py-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            사규를 찾아 근거를 정리하고 있습니다… {elapsed}초
          </p>
          {elapsed >= PATIENCE_HINT_SEC && (
            // 정직하게 말한다. 가짜 진행률을 그리는 것보다 낫다.
            <p className="text-xs text-muted-foreground/70">
              질문이 복잡하면 1분까지 걸릴 수 있습니다.
            </p>
          )}
        </div>
      )}

      {phase.kind === 'error' && (
        <div className="flex gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-300">{phase.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{phase.detail}</p>
            {phase.canRetry && (
              <button
                onClick={() => void runSearch()}
                disabled={!question.trim()}
                className="mt-3 text-sm font-medium text-primary disabled:opacity-40"
              >
                다시 시도
              </button>
            )}
          </div>
        </div>
      )}

      {phase.kind === 'done' && (
        <article className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          {/* 뇌가 인격 규칙대로 조항·시행일을 담아 문장으로 돌려준다.
              줄바꿈이 근거 구분이므로 whitespace-pre-wrap 이 필요하다. */}
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{phase.result.text}</p>

          {phase.result.tools.length > 0 && (
            // 검색이 실제로 돌았는지 보여준다. 답변만 있으면 사용자는 이게
            // 규정을 찾아본 답인지 그냥 지어낸 말인지 구분할 수 없다.
            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-white/5 pt-4">
              {phase.result.tools.map((tool, index) => (
                <span
                  key={`${tool.name}-${index}`}
                  className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-muted-foreground"
                >
                  {tool.name === 'search_knowledge' ? '사내 규정 검색' : tool.name}
                  {tool.outcome !== 'ok' && ' · 실패'}
                </span>
              ))}
            </div>
          )}
        </article>
      )}
    </main>
  )
}
