'use client'

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
import {
  LANGUAGES,
  LANGUAGE_LABELS,
  LANGUAGE_SHORT,
  type Lang,
  type Strings,
} from '../_lib/i18n'

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

export type Phase =
  | { kind: 'thinking' }
  | { kind: 'searching'; detail?: string }
  | { kind: 'reading' }

export interface ChatViewProps {
  turns: ChatTurn[]
  pending: boolean
  elapsedSec: number
  phase?: Phase | null
  streamingText?: string
  onSend: (text: string) => void
  onRetry: () => void
  onReset: () => void
  inputDisabled?: boolean
  suggestions?: string[]
  notice?: ReactNode
  strings: Strings
  lang: Lang
  onLangChange: (next: Lang) => void
}

const ELAPSED_AFTER_SEC = 10

const COMPOSER_MAX_HEIGHT = 160

const MAX_QUESTION_LENGTH = 2000

function ToolBadges({ tools, strings }: { tools: ToolChip[]; strings: Strings }) {
  if (tools.length === 0) return null

  const grouped = tools.reduce<{ key: string; label: string; failed: boolean; count: number }[]>(
    (acc, tool) => {
      const failed = tool.outcome !== 'ok'
      const key = `${tool.name}:${failed}`
      const found = acc.find((item) => item.key === key)
      if (found) {
        found.count += 1
        return acc
      }
      const label = tool.name === 'search_knowledge' ? strings.toolSearch : tool.name
      return [...acc, { key, label, failed, count: 1 }]
    },
    [],
  )

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {grouped.map((tool) => (
        <span
          key={tool.key}
          className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground"
        >
          {tool.label}
          {tool.count > 1 && ` ×${tool.count}`}
          {tool.failed && ` · ${strings.toolFailed}`}
        </span>
      ))}
    </div>
  )
}

function LanguagePicker({
  lang,
  onChange,
  label,
}: {
  lang: Lang
  onChange: (next: Lang) => void
  label: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-0.5 rounded-full bg-muted p-0.5"
    >
      {LANGUAGES.map((value) => {
        const active = value === lang
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={active}
            title={LANGUAGE_LABELS[value]}
            aria-label={LANGUAGE_LABELS[value]}
            className={
              'rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums transition-colors ' +
              (active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            {LANGUAGE_SHORT[value]}
          </button>
        )
      })}
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

const SMOOTH_CATCHUP_MS = 360

const SMOOTH_COMMIT_MS = 40

function useSmoothText(target: string, streaming: boolean): string {
  const [shown, setShown] = useState(target)
  const shownRef = useRef(target)

  useEffect(() => {
    const instant =
      !streaming ||
      target.length < shownRef.current.length ||
      (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

    if (instant) {
      shownRef.current = target
      setShown(target)
      return
    }

    let raf = 0
    let last = performance.now()

    const step = (now: number) => {
      const elapsed = now - last
      if (elapsed < SMOOTH_COMMIT_MS) {
        raf = requestAnimationFrame(step)
        return
      }
      last = now

      const backlog = target.length - shownRef.current.length
      const chars = Math.max(1, Math.ceil((backlog * elapsed) / SMOOTH_CATCHUP_MS))
      let next = shownRef.current.length + chars

      // 서로게이트 쌍(⚠️ 같은 이모지) 가운데를 자르면 그 프레임에 깨진 글자가 보인다
      if (next < target.length) {
        const code = target.charCodeAt(next - 1)
        if (code >= 0xd800 && code <= 0xdbff) next += 1
      }

      shownRef.current = target.slice(0, next)
      setShown(shownRef.current)
      if (shownRef.current.length < target.length) raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, streaming])

  return shown
}

function phaseLabel(phase: Phase | null | undefined, strings: Strings): string {
  if (!phase) return strings.searching
  if (phase.kind === 'thinking') return strings.phaseThinking
  if (phase.kind === 'reading') return strings.phaseReading
  return phase.detail
    ? `${strings.phaseSearching} · ${phase.detail}`
    : strings.phaseSearching
}

export function ChatView({
  turns,
  pending,
  elapsedSec,
  phase,
  streamingText = '',
  onSend,
  onRetry,
  onReset,
  inputDisabled = false,
  suggestions = [],
  notice,
  strings,
  lang,
  onLangChange,
}: ChatViewProps) {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const busy = pending || inputDisabled
  const canSend = draft.trim().length > 0 && !busy

  const visibleText = useSmoothText(streamingText, pending)

  // 바닥 근처에 있을 때만 내린다. 무조건 내리면 위로 올려 읽는 사용자를 매번 끌어내린다.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distance < 120) el.scrollTop = el.scrollHeight
  }, [turns.length, pending, visibleText])

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
    // 한글 조합 중의 Enter 는 글자를 확정하는 키라서 보내면 안 된다.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  const empty = turns.length === 0 && !pending

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="shrink-0 border-b border-border px-4 py-2.5">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold">{strings.title}</h1>

          <div className="ml-auto flex items-center gap-1">
            <LanguagePicker
              lang={lang}
              onChange={onLangChange}
              label={strings.languageLabel}
            />
            {turns.length > 0 && (
              <button
                type="button"
                onClick={onReset}
                disabled={pending}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {strings.newChat}
              </button>
            )}
          </div>
        </div>
      </header>

      {notice}

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          {empty ? (
            <div className="flex flex-col items-center gap-5 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-semibold">{strings.emptyTitle}</p>
                <p className="text-sm text-muted-foreground">{strings.emptyBody}</p>
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
                        <ToolBadges tools={turn.tools} strings={strings} />
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
                          {strings.retry}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {pending && (
                <div className="flex gap-3">
                  <GenieAvatar />
                  <div className="min-w-0 flex-1 pt-0.5">
                    {visibleText ? (
                      // 커서는 마지막 블록 안쪽에 붙인다. 형제로 두면 <p> 다음이라 줄이 바뀐다
                      <div className="[&>div>*:last-child]:after:ml-0.5 [&>div>*:last-child]:after:animate-pulse [&>div>*:last-child]:after:text-primary [&>div>*:last-child]:after:content-['▏']">
                        <RichText text={visibleText} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-0.5">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">
                          {phaseLabel(phase, strings)}
                          {elapsedSec >= ELAPSED_AFTER_SEC && (
                            <span className="ml-1.5 tabular-nums text-muted-foreground/70">
                              {elapsedSec}s
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
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
            placeholder={strings.placeholder}
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label={strings.send}
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
