/**
 * 스트리밍 와이어 계약 — 뇌의 `apps/agent-service/src/agent/wire.py` 와 짝이다.
 *
 * ★ 한쪽을 고치면 다른 쪽도 고쳐야 한다. 그래서 서로의 파일 이름을 양쪽 주석에
 *   적어 둔다 — 계약이 두 언어에 걸쳐 있을 때 이것이 유일한 연결선이다.
 *
 * 화면(page.tsx)에서 떼어낸 것은 재사용 때문이 아니라 **읽기 쉬움** 때문이다.
 * 그쪽은 상태·인증·언어를 다루고, 여기는 바이트를 이벤트로 바꾸는 일만 한다.
 */

import type { Phase, ToolChip } from '../_components/chat-view'

/** 스트림 한 줄. */
export type StreamEvent =
  | { type: 'status'; phase: 'thinking' | 'reading' }
  | { type: 'tool_start'; name: string; detail: string | null }
  | { type: 'tool_end'; name: string; outcome: string }
  | { type: 'text'; delta: string }
  | {
      type: 'done'
      refused: boolean
      replace_text: string | null
      tools: ToolChip[]
    }
  | { type: 'error'; code: string }

export type StreamOutcome =
  | { kind: 'done'; text: string; replaceText: string | null; tools: ToolChip[] }
  | { kind: 'error'; code: string }

/**
 * NDJSON 을 읽어 이벤트로 나눈다.
 *
 * ★ 줄이 청크 경계에 걸쳐 쪼개진다. 버퍼에 모아 개행에서만 자른다 — 청크마다
 *   JSON.parse 를 시도하면 멀쩡한 스트림에서 파싱 오류가 쏟아진다.
 *
 * ★ `done` 없이 스트림이 끝나면 **오류로 본다.** 중간에 끊긴 답변을 완성된 것처럼
 *   보여주면, 사용자는 규정의 절반만 읽고 판단하게 된다. 사규 도구에서 그건
 *   "느리다"보다 나쁘다.
 */
export async function readStream(
  body: ReadableStream<Uint8Array>,
  handlers: { onPhase: (phase: Phase) => void; onText: (full: string) => void },
): Promise<StreamOutcome> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''

  const handle = (line: string): StreamOutcome | null => {
    let event: StreamEvent
    try {
      event = JSON.parse(line) as StreamEvent
    } catch {
      // 한 줄이 깨진 것이 전체를 버릴 이유는 아니다. 남은 줄이 계속 온다.
      return null
    }

    switch (event.type) {
      case 'status':
        handlers.onPhase({ kind: event.phase })
        return null
      case 'tool_start':
        handlers.onPhase({ kind: 'searching', detail: event.detail ?? undefined })
        return null
      case 'text':
        text += event.delta
        handlers.onText(text)
        return null
      case 'done':
        return {
          kind: 'done',
          text,
          replaceText: event.replace_text,
          tools: event.tools ?? [],
        }
      case 'error':
        return { kind: 'error', code: event.code }
      default:
        return null
    }
  }

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      const outcome = handle(line)
      if (outcome) return outcome
    }
  }
  if (buffer.trim()) {
    const outcome = handle(buffer)
    if (outcome) return outcome
  }

  return { kind: 'error', code: 'truncated' }
}
