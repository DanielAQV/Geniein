/**
 * 가이드 본문 렌더링.
 *
 * ★ `rich-text.tsx` 와 나눠 둔다. 저쪽은 **모델이 만든 문자열**을 그리는 곳이라
 *   표기 집합이 인격이 실제로 내보내는 것(문단·목록·굵게·표)에 묶여 있다. 이쪽은
 *   **우리가 쓴 문서**라 제목·번호·안내상자가 필요하고, 문서 형식이 바뀔 때 저쪽이
 *   따라 흔들리면 안 된다.
 *
 * ★ 그래도 `dangerouslySetInnerHTML` 은 쓰지 않는다. 신뢰하는 원본이라 해도
 *   React 엘리먼트로만 조립하면 "이 문자열이 어디서 왔나"를 따질 일이 없어진다.
 *
 * 지원하는 표기 — `## 제목`, `### 제목`, `- 목록`, `| 표 |`, `**굵게**`, `` `코드` ``,
 * 그리고 안내상자 `!note` / `!warn` / `!stop`.
 */

import { Fragment, type ReactNode } from 'react'

function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={i}
          className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <Fragment key={i}>{part}</Fragment>
  })
}

const CALLOUT_STYLE: Record<string, string> = {
  note: 'border-primary/30 bg-primary/5',
  warn: 'border-amber-500/40 bg-amber-500/10',
  stop: 'border-rose-500/40 bg-rose-500/10',
}

const isTableRow = (line: string) => line.trim().startsWith('|') && line.includes('|', 1)
const isDivider = (line: string) => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line)
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())

export function DocBody({ markdown }: { markdown: string }) {
  const lines = markdown.split('\n')
  const out: ReactNode[] = []
  let paragraph: string[] = []
  let bullets: string[] = []

  const flushParagraph = () => {
    if (!paragraph.length) return
    out.push(
      <p key={`p${out.length}`} className="text-[15px] leading-relaxed text-muted-foreground">
        {inline(paragraph.join(' '))}
      </p>,
    )
    paragraph = []
  }

  const flushBullets = () => {
    if (!bullets.length) return
    out.push(
      <ul key={`u${out.length}`} className="flex list-disc flex-col gap-1.5 pl-5">
        {bullets.map((b, i) => (
          <li key={i} className="text-[15px] leading-relaxed text-muted-foreground">
            {inline(b)}
          </li>
        ))}
      </ul>,
    )
    bullets = []
  }

  const flush = () => {
    flushParagraph()
    flushBullets()
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      flush()
      continue
    }

    if (trimmed.startsWith('### ')) {
      flush()
      out.push(
        <h3 key={`h3${i}`} className="mt-2 text-[17px] font-semibold text-foreground">
          {inline(trimmed.slice(4))}
        </h3>,
      )
      continue
    }

    if (trimmed.startsWith('## ')) {
      flush()
      out.push(
        <h2
          key={`h2${i}`}
          className="mt-6 border-b border-border pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
        >
          {trimmed.slice(3)}
        </h2>,
      )
      continue
    }

    const callout = /^!(note|warn|stop)\s+(.*)$/.exec(trimmed)
    if (callout) {
      flush()
      out.push(
        <div
          key={`c${i}`}
          className={`rounded-lg border px-4 py-3 text-[14.5px] leading-relaxed text-muted-foreground ${CALLOUT_STYLE[callout[1]]}`}
        >
          {inline(callout[2])}
        </div>,
      )
      continue
    }

    if (isTableRow(line)) {
      flush()
      const head = cells(line)
      let j = i + 1
      const hasHead = j < lines.length && isDivider(lines[j])
      if (hasHead) j++
      const rows: string[][] = []
      while (j < lines.length && isTableRow(lines[j])) {
        rows.push(cells(lines[j]))
        j++
      }
      out.push(
        <div key={`t${i}`} className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[520px] border-collapse text-[14.5px]">
            {hasHead && (
              <thead>
                <tr>
                  {head.map((c, k) => (
                    <th
                      key={k}
                      className="border-b border-border px-4 py-2.5 text-left text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {(hasHead ? rows : [head, ...rows]).map((row, r) => (
                <tr key={r}>
                  {row.map((c, k) => (
                    <td
                      key={k}
                      className="border-b border-border px-4 py-3 align-top text-muted-foreground last:border-r-0"
                    >
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      i = j - 1
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph()
      bullets.push(line.replace(/^\s*[-*]\s+/, ''))
      continue
    }

    flushBullets()
    paragraph.push(trimmed)
  }

  flush()

  return <div className="flex flex-col gap-4">{out}</div>
}
