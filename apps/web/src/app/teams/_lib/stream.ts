
import type { Phase, ToolChip } from '../_components/chat-view'

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

// 뇌의 apps/agent-service/src/agent/wire.py 와 짝이다. 한쪽을 고치면 다른 쪽도 고쳐야 한다.
// 줄은 청크 경계에 걸쳐 쪼개지므로 버퍼에 모아 개행에서만 자른다.
// `done` 없이 끝나면 오류로 본다 — 끊긴 답변을 완성된 것처럼 보이면 안 된다.
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
