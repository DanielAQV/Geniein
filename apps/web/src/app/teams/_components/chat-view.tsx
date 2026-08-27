'use client'

/**
 * 대화 화면 — 표시만 한다. 네트워크도 인증도 여기 없다.
 *
 * 그래서 두 곳이 같은 화면을 쓴다:
 *   /teams/search    실제 동작 (Teams SSO + BFF)
 *   /teams/preview   개발 전용. 검색 서비스에 직접 묻고, 설정이 없으면 예시로 떨어진다
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
import { AlertCircle, BookOpen, Loader2, RotateCcw, Send, Sparkles } from 'lucide-react'
import Link from 'next/link'
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

/**
 * 지금 무엇을 하고 있는가. 스트리밍 경로에서 뇌가 보내주는 단계다.
 *
 * ★ 대기 40~60초 중 텍스트 생성은 마지막 5~10초뿐이다. 단계를 안 보여주면 앞의
 *   30초가 그대로 침묵이라, 텍스트를 흘려도 체감이 크게 안 바뀐다.
 */
export type Phase =
  | { kind: 'thinking' }
  | { kind: 'searching'; detail?: string }
  | { kind: 'reading' }

export interface ChatViewProps {
  turns: ChatTurn[]
  /** 답변을 기다리는 중인가 */
  pending: boolean
  /** 기다린 시간(초). 이게 없으면 멈춘 것처럼 보인다 */
  elapsedSec: number
  /**
   * 스트리밍 진행 상태. 비스트리밍 경로(미리보기)는 넘기지 않고, 그때는
   * `strings.searching` 한 줄로 떨어진다.
   */
  phase?: Phase | null
  /** 아직 끝나지 않은 답변. 글자가 오는 대로 늘어난다 */
  streamingText?: string
  onSend: (text: string) => void
  onRetry: () => void
  onReset: () => void
  /** 부팅 중이거나 환경이 준비되지 않아 입력을 받을 수 없는 상태 */
  inputDisabled?: boolean
  suggestions?: string[]
  /** 헤더 아래 띠. 지금은 미리보기가 "이건 실제 답변이 아니다"를 밝히는 데 쓴다. */
  notice?: ReactNode
  /** 화면 문구. 언어 판단은 호출부가 하고 여기는 결과만 받는다 */
  strings: Strings
  lang: Lang
  onLangChange: (next: Lang) => void
}

/**
 * 이 시간을 넘겨야 경과 초를 보여준다.
 *
 * ★ 처음부터 초를 세면 짧은 대기에도 시계를 들이대는 꼴이라 실제보다 느리게 느껴진다.
 *   반대로 아예 안 보여주면 오래 걸릴 때 멈춘 것처럼 보인다. 평소엔 조용하고
 *   느려질 때만 말하는 쪽이 맞다.
 */
const ELAPSED_AFTER_SEC = 10

/** 입력창 최대 높이(px). 넘으면 자체 스크롤 — 대화가 화면에서 밀려나지 않게. */
const COMPOSER_MAX_HEIGHT = 160

const MAX_QUESTION_LENGTH = 2000

function ToolBadges({ tools, strings }: { tools: ToolChip[]; strings: Strings }) {
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
      const label = tool.name === 'search_knowledge' ? strings.toolSearch : tool.name
      return [...acc, { key, label, failed, count: 1 }]
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
          {tool.failed && ` · ${strings.toolFailed}`}
        </span>
      ))}
    </div>
  )
}

/**
 * 언어 선택기 — 세그먼트 알약.
 *
 * ★ 자동 판정은 반드시 틀리는 경우가 생긴다 — 계정 언어가 안 채워져 있거나,
 *   Teams 를 영어로 쓰는 베트남 직원이거나. 그때 사용자가 **한 번에** 고칠 수
 *   있어야 한다. 탈출구가 없으면 틀린 사람은 계속 틀린 채로 쓴다.
 *
 * ★ 네이티브 `select` 를 버렸다. 키보드·스크린리더를 공짜로 얻는 대신 OS 위젯이
 *   그대로 노출돼서, Teams 안에서 이 화면만 다른 시대의 물건처럼 보였다. 언어가
 *   셋뿐이라 전부 펼쳐 놓을 수 있고, 그러면 **현재 언어가 항상 보이고 전환이
 *   한 번**이다 — 메뉴를 여는 단계가 사라진다.
 *
 * ★ `radiogroup` 이 아니라 `group` + `aria-pressed` 다. 라디오는 화살표 키로
 *   옮겨다니는 것이 규약인데, 그러려면 포커스 관리를 직접 해야 한다. 버튼 셋은
 *   Tab 으로 자연히 순회하고 Enter/Space 로 눌린다 — 만들 것이 없다.
 */
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
            // 코드만으로는 못 읽는 사람이 있다. 이름 전체를 여기서 준다.
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

/**
 * 밀린 글자를 이 시간 안에 따라잡는다. 작을수록 도착 속도에 가깝고(덜컹거림),
 * 클수록 매끄럽지만 답변이 실제보다 늦게 끝난 것처럼 보인다.
 */
const SMOOTH_CATCHUP_MS = 360

/**
 * 화면을 갱신하는 최소 간격(ms). 25fps 쯤이다.
 *
 * ★ 매 프레임 그리지 않는다. 갱신 한 번에 **마크다운 전체를 다시 파싱**하고
 *   (rich-text.tsx 는 문자열을 매번 새로 훑는다) 스크롤 위치를 다시 계산하므로,
 *   60fps 로 커밋하면 답변이 길어질수록 그 비용이 프레임 예산을 잠식한다.
 *   글자 흐름은 25fps 로도 연속으로 보인다 — 사람이 읽는 속도보다 한참 빠르다.
 */
const SMOOTH_COMMIT_MS = 40

/**
 * 도착 속도와 렌더 속도를 분리한다.
 *
 * ★ 이것이 "띄엄띄엄"의 원인이었다. 모델의 델타는 고르게 오지 않고 뭉텅이로 온다 —
 *   한 프레임에 40자가 오고 다음 300ms 는 아무것도 안 온다. 받는 즉시 그리면 그
 *   불균형이 그대로 눈에 보인다. 게다가 델타마다 마크다운을 다시 파싱하고 스크롤을
 *   건드려서 그 순간마다 프레임을 흘린다.
 *
 * 밀린 만큼을 매 프레임 나눠 따라가면 도착이 뭉쳐도 화면은 일정한 속도로 자란다.
 * 뒤처진 양에 비례해 속도를 올리므로(지수적 접근) 오래 밀리지도 않는다.
 *
 * ★ 스트리밍이 끝나면 **즉시** 목표에 맞춘다. 남은 지연을 그리는 동안 최종 버블이
 *   붙으면 화면이 한 번 튄다.
 *
 * ★ `prefers-reduced-motion` 이면 애니메이션 없이 바로 보여준다. 이건 장식이 아니라
 *   글자가 움직이는 것이라, 움직임에 민감한 사람에게는 읽기를 방해한다.
 */
function useSmoothText(target: string, streaming: boolean): string {
  const [shown, setShown] = useState(target)
  const shownRef = useRef(target)

  useEffect(() => {
    const instant =
      !streaming ||
      // 대화 초기화·재시도로 목표가 줄어들면 따라잡을 것이 아니라 맞춰야 한다
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
        // 아직 갱신할 때가 아니다. 프레임만 넘긴다 — 여기서 그리면 60fps 가 된다.
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

/** 진행 단계를 사람이 읽는 한 줄로. 단계를 아직 못 받았으면 일반 문구로 떨어진다. */
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

  // 화면에 그릴 글자. 도착한 것이 아니라 **따라가는 중인** 값이다 (useSmoothText).
  const visibleText = useSmoothText(streamingText, pending)

  // 새 발언이 생기거나 글자가 늘어나면 바닥으로. useLayoutEffect 라야 중간 프레임이
  // 안 보인다.
  //
  // ★ **바닥 근처에 있을 때만** 내린다. 스트리밍 중에는 이 효과가 초당 스무 번 넘게
  //   도는데, 무조건 내리면 위로 올려 읽는 사용자를 매번 끌어내린다.
  //
  // ★ `scrollIntoView` 대신 `scrollTop` 을 쓴다. 전자는 조상 전체를 훑어 스크롤
  //   위치를 계산하므로, 이 빈도로 부르면 레이아웃 비용이 눈에 보인다.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distance < 120) el.scrollTop = el.scrollHeight
  }, [turns.length, pending, visibleText])

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
          <h1 className="text-sm font-semibold">{strings.title}</h1>

          <div className="ml-auto flex items-center gap-1">
            {/* 가이드는 같은 탭 안의 다른 화면이다. 매니페스트에 탭을 하나 더
                추가하려면 앱 재업로드와 관리자 승인이 필요해서, 우선 여기 링크로 붙인다. */}
            <Link
              href="/teams/guide"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
            >
              <BookOpen className="h-3.5 w-3.5" />
              {strings.guides}
            </Link>
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

              {/* 아직 답변 중. 글자가 왔으면 그것을, 아직이면 진행 단계를 보여준다.
                  둘을 같은 자리에 두는 것이 중요하다 — 단계 줄이 사라지고 답변이
                  다른 곳에 나타나면 화면이 한 번 튄다. */}
              {pending && (
                <div className="flex gap-3">
                  <GenieAvatar />
                  <div className="min-w-0 flex-1 pt-0.5">
                    {visibleText ? (
                      // 커서를 **마지막 블록 안쪽**에 붙인다. 형제 요소로 두면 마크다운이
                      // 만든 <p> 다음이라 줄이 바뀌어, 글자와 떨어진 곳에서 깜박인다.
                      // 텍스트에 문자를 섞지 않는 것도 중요하다 — 그러면 마크다운
                      // 문법이 아직 안 닫힌 구간에서 그 문자가 본문처럼 렌더된다.
                      // ★ 한 겹 더 들어간다. RichText 가 블록들을 감싸는 <div> 를 하나
                      //   만들기 때문에, 그 래퍼에 ::after 를 붙이면 블록 **다음**이라
                      //   또 줄이 바뀐다. 마지막 블록(보통 <p>) 안쪽이어야 글자 끝에
                      //   붙는다. 목록·표로 끝나는 순간에는 한 줄 아래에 놓이는데,
                      //   그건 인라인으로 만들 방법이 없고 잠깐이라 그대로 둔다.
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
