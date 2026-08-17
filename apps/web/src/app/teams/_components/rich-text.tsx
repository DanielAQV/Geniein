/**
 * 답변 본문 렌더링 — 마크다운의 **아주 작은 부분집합**만 다룬다.
 *
 * 인격이 실제로 내보내는 것은 문단, `- 목록`, `**굵게**` 셋뿐이다 (personas/default.yaml).
 * 그것 때문에 마크다운 라이브러리를 하나 더 들이는 대신 필요한 만큼만 만든다.
 *
 * ★ `dangerouslySetInnerHTML` 을 쓰지 않는다. 여기 들어오는 문자열은 모델이 만든
 *   것이고, 모델은 검색해 온 **사내 문서 내용을 그대로 옮겨 적을 수 있다.** 즉
 *   문서에 든 무엇이든 이 경로로 흘러올 수 있다고 봐야 한다. React 엘리먼트로만
 *   조립하면 그 가정이 필요 없어진다.
 *
 * 지원하지 않는 표기(제목, 링크, 코드블록)는 원문 그대로 보인다. 지금 인격이
 * 쓰지 않는 표기이고, 어설프게 반쯤 처리하면 오히려 깨져 보인다.
 */

import { Fragment, type ReactNode } from 'react'

/** `**굵게**` 만 인라인으로 처리한다. 나머지는 글자 그대로. */
function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g)
  return parts.map((part, index) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={index} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  )
}

const BULLET = /^\s*[-*•]\s+/

/** `|---|---|` 같은 구분줄. 표의 머리와 몸을 가른다. */
const TABLE_DIVIDER = /^\s*\|?[\s:|-]+\|[\s:|-]*$/

function isTableRow(line: string): boolean {
  return line.trim().startsWith('|') && line.includes('|', 1)
}

function cellsOf(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim())
}

/**
 * 표. 인격이 직급별 금액처럼 **여러 값을 나란히 놓을 때** 실제로 쓴다 —
 * 지원하지 않으면 파이프 문자가 그대로 보여서 답변이 망가진 것처럼 읽힌다.
 *
 * 좁은 탭에서도 깨지지 않도록 가로 스크롤을 표 자체에 준다. 화면 전체가
 * 옆으로 밀리면 입력창까지 따라 나가 버린다.
 */
function Table({ lines }: { lines: string[] }) {
  const rows = lines.filter((line) => !TABLE_DIVIDER.test(line)).map(cellsOf)
  if (rows.length === 0) return null

  const [head, ...body] = rows

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr>
            {head.map((cell, i) => (
              <th
                key={i}
                className="border-b border-border px-3 py-1.5 text-left font-medium text-muted-foreground"
              >
                {inline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, i) => (
                <td key={i} className="border-b border-border/60 px-3 py-1.5 align-top">
                  {inline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function RichText({ text }: { text: string }) {
  // 빈 줄로 블록을 가른다. 연속된 빈 줄은 하나로 본다.
  const blocks = text.trim().split(/\n{2,}/)

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n')

        // 표가 먼저다 — 표의 구분줄(`|---|`)이 불릿 판정에 걸릴 수 있다.
        const tableLines = lines.filter(isTableRow)
        if (tableLines.length >= 2) {
          const rest = lines.filter((line) => !isTableRow(line) && line.trim())
          return (
            <div key={blockIndex} className="space-y-2">
              {rest.map((line, i) => (
                <p key={i}>{inline(line)}</p>
              ))}
              <Table lines={tableLines} />
            </div>
          )
        }

        // 한 줄이라도 불릿이면 블록 전체를 목록으로 본다. 모델이 목록 앞에
        // 도입 문장을 같은 블록에 붙이는 일이 있어, 불릿이 아닌 줄은 문단으로 남긴다.
        if (lines.some((line) => BULLET.test(line))) {
          const lead = lines.filter((line) => line.trim() && !BULLET.test(line))
          const items = lines.filter((line) => BULLET.test(line))

          return (
            <div key={blockIndex} className="space-y-2">
              {lead.map((line, i) => (
                <p key={i}>{inline(line)}</p>
              ))}
              <ul className="space-y-1.5 pl-1">
                {items.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span
                      aria-hidden
                      className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-muted-foreground"
                    />
                    <span className="min-w-0 flex-1">
                      {inline(line.replace(BULLET, ''))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        }

        // 문단 안의 단일 줄바꿈은 보존한다 — 근거를 줄로 나눠 적는 경우가 있다.
        return (
          <p key={blockIndex} className="whitespace-pre-wrap">
            {inline(block)}
          </p>
        )
      })}
    </div>
  )
}
