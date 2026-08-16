'use client'

/**
 * 대화 화면 — 표시만 한다. 네트워크도 인증도 여기 없다.
 *
 * 그래서 두 곳이 같은 화면을 쓴다:
 *   /teams/search    실제 동작 (Teams SSO + BFF)
 *   /teams/preview   개발 전용. 로컬 뇌에 직접 묻고, 설정이 없으면 예시로 떨어진다
 *
 * ★ 검색창이 아니라 **대화**다. 한 번 묻고 끝나면 "해외는?" 같은 되묻기가
 *   불가능해서, 사용자가 매번 질문을 처음부터 다시 쓰게 된다. 이전 발언이
 *   화면에 남아 있어야 그게 자연스러워진다.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { AlertCircle, Loader2, RotateCcw, Send, Sparkles } from 'lucide-react'
import { RichText } from './rich-text'

export interface ToolChip {
  name: string
  outcome: string
}

export type ChatTurn =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; text: string; tools: ToolChip[] }
  | {
      id: string
      role: 'error'
      title: string
      detail: string
      technical?: string
      canRetry: boolean
    }

export interface ChatViewProps {
  turns: ChatTurn[]
  /** 답변을 기다리는 중인가 */
  pending: boolean
  /** 기다린 시간(초). 이게 없으면 멈춘 것처럼 보인다 */
  elapsedSec: number
  onSend: (text: string) => void
  onRetry: () => void
  onReset: () => void
  /** 부팅 중이거나 환경이 준비되지 않아 입력을 받을 수 없는 상태 */
  inputDisabled?: boolean
  suggestions?: string[]
  /** 헤더 아래 띠. 지금은 미리보기가 "이건 실제 답변이 아니다"를 밝히는 데 쓴다. */
  notice?: ReactNode
}

/** 이 시간을 넘기면 "원래 오래 걸린다"고 알려준다. 그 전에는 잡음이다. */
const PATIENCE_HINT_SEC = 15

/** 입력창 최대 높이(px). 넘으면 자체 스크롤 — 대화가 화면에서 밀려나지 않게. */
const COMPOSER_MAX_HEIGHT = 160

const MAX_QUESTION_LENGTH = 2000

const TOOL_LABELS: Record<string, string> = {
  search_knowledge: '사내 규정 검색',
}

function ToolBadges({ tools }: { tools: ToolChip[] }) {
  if (tools.length === 0) return null

  // 같은 도구를 여러 번 부르는 일이 흔하다 (질문이 두 갈래면 두 번 찾는다).
  // 그대로 나열하면 같은 칩이 반복돼 버그처럼 보이므로 묶어서 횟수로 보여준다.
  const grouped = tools.reduce<{ key: string; label: string; failed: boolean; count: number }[]>(
    (acc, tool) => {
      const failed = tool.outcome !== 'ok'
      const key = `${tool.name}:${failed}`
      const found = acc.find((item) => item.key === key)
      if (found) {
        found.count += 1
        return acc
      }
      return [...acc, { key, label: TOOL_LABELS[tool.name] ?? tool.name, failed, count: 1 }]
    },
    [],
  )

  // 검색이 실제로 돌았는지 보여준다. 답변만 있으면 사용자는 이게 규정을 찾아본
  // 답인지 그냥 지어낸 말인지 구분할 수 없다.
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {grouped.map((tool) => (
        <span
          key={tool.key}
          className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground"
        >
          {tool.label}
          {tool.count > 1 && ` ×${tool.count}`}
          {tool.failed && ' · 실패'}
        </span>
      ))}
    </div>
  )
}

function GenieAvatar() {
  return (
    <div
      aria-hidden
      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary"
    >
      <Sparkles className="h-3.5 w-3.5" />
    </div>
  )
}

export function ChatView({
  turns,
  pending,
  elapsedSec,
  onSend,
  onRetry,
  onReset,
  inputDisabled = false,
  suggestions = [],
  notice,
}: ChatViewProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const busy = pending || inputDisabled
  const canSend = draft.trim().length > 0 && !busy

  // 새 발언이 생기면 바닥으로. useLayoutEffect 라야 중간 프레임이 안 보인다.
  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [turns.length, pending])

  // 답변이 끝나면 다시 입력창으로. 이어서 되묻는 것이 기본 동작이다.
  useEffect(() => {
    if (!busy) inputRef.current?.focus()
  }, [busy])

  const resize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_HEIGHT)}px`
  }, [])

  const submit = useCallback(() => {
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
    }
    onSend(text)
  }, [draft, busy, onSend])

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 로 보내고 Shift+Enter 로 줄바꿈 — 채팅의 관습이다.
    // 한글 조합 중의 Enter 는 글자를 확정하는 키라서 보내면 안 된다.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  const empty = turns.length === 0 && !pending

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      {/* 헤더 안쪽도 대화와 같은 열 폭에 맞춘다. 넓은 화면에서 제목만 왼쪽 끝에
          떨어져 있으면 같은 화면이 아닌 것처럼 보인다. */}
      <header className="shrink-0 border-b border-border px-4 py-2.5">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold">사규 검색</h1>
          {turns.length > 0 && (
            <button
              type="button"
              onClick={onReset}
              disabled={pending}
              className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              새 대화
            </button>
          )}
        </div>
      </header>

      {notice}

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          {empty ? (
            <div className="flex flex-col items-center gap-5 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-semibold">무엇이 궁금하세요?</p>
                <p className="text-sm text-muted-foreground">
                  평소 말하듯 물어보세요. 근거가 된 규정과 시행일을 함께 알려드립니다.
                </p>
              </div>
              {suggestions.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => onSend(suggestion)}
                      disabled={busy}
                      className="rounded-full border border-border bg-card px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-40"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {turns.map((turn) => {
                if (turn.role === 'user') {
                  return (
                    <div key={turn.id} className="flex justify-end">
                      <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
                        {turn.text}
                      </p>
                    </div>
                  )
                }

                if (turn.role === 'assistant') {
                  return (
                    <div key={turn.id} className="flex gap-3">
                      <GenieAvatar />
                      <div className="min-w-0 flex-1 pt-0.5">
                        <RichText text={turn.text} />
                        <ToolBadges tools={turn.tools} />
                      </div>
                    </div>
                  )
                }

                return (
                  <div key={turn.id} className="flex gap-3">
                    <div
                      aria-hidden
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/12 text-destructive"
                    >
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                      <p className="text-sm font-medium text-destructive">{turn.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{turn.detail}</p>
                      {turn.technical && (
                        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-muted p-2 text-[11px] leading-relaxed text-muted-foreground">
                          {turn.technical}
                        </pre>
                      )}
                      {turn.canRetry && (
                        <button
                          type="button"
                          onClick={onRetry}
                          disabled={busy}
                          className="mt-3 text-sm font-medium text-primary disabled:opacity-40"
                        >
                          다시 시도
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {pending && (
                <div className="flex gap-3">
                  <GenieAvatar />
                  <div className="flex min-w-0 flex-1 items-center gap-2 pt-1">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      사규를 찾아 근거를 정리하고 있습니다… {elapsedSec}초
                    </p>
                  </div>
                </div>
              )}

              {pending && elapsedSec >= PATIENCE_HINT_SEC && (
                // 정직하게 말한다. 가짜 진행률을 그리는 것보다 낫다.
                <p className="pl-10 text-xs text-muted-foreground/70">
                  질문이 복잡하면 1분까지 걸릴 수 있습니다.
                </p>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
          className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-border bg-card p-2 transition-colors focus-within:border-primary/50"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={MAX_QUESTION_LENGTH}
            disabled={inputDisabled}
            onChange={(event) => {
              setDraft(event.target.value)
              resize(event.target)
            }}
            onKeyDown={onKeyDown}
            placeholder="예: 해외 출장 숙박비 한도가 얼마인가요?"
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="보내기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
