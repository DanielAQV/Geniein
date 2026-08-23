
import { Fragment, type ReactNode } from 'react'

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

        // 한 줄이라도 불릿이면 블록 전체를 목록으로 본다. 불릿이 아닌 줄은 문단으로 남긴다.
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

        return (
          <p key={blockIndex} className="whitespace-pre-wrap">
            {inline(block)}
          </p>
        )
      })}
    </div>
  )
}
