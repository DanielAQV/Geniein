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

/**
 * 청크 경계 표시 — U+2060 WORD JOINER.
 *
 * 스트리밍 중에 도착한 덩어리들이 각각 **fade in** 되게 하려면, 렌더러가 "여기서부터
 * 새 덩어리"를 알아야 한다. 문자열 하나에 그 정보를 실어 보내는 가장 간단한 방법이
 * 보이지 않는 문자다 — 오프셋 배열을 따로 넘기면 블록·줄·셀로 쪼개질 때마다 좌표를
 * 다시 계산해야 한다.
 *
 * ★ 이 문자를 고른 이유: 폭이 없고(화면에 안 보임), 마크다운 문법 문자가 아니고
 *   (`*`·`|`·`-`·개행이 아님), 줄바꿈으로 취급되지 않는다. 그래서 블록 판정·표 판정·
 *   불릿 판정이 이 문자를 사이에 두고도 그대로 동작한다.
 */
const CHUNK = '⁠'

/** 표시용 문자열에서 청크 표시를 걷어낸다. 정규식 판정 전에 부른다. */
function bare(text: string): string {
  return text.replaceAll(CHUNK, '')
}

/**
 * `**굵게**` 만 인라인으로 처리한다. 나머지는 글자 그대로.
 *
 * 청크 표시가 섞여 있으면 그 경계마다 조각을 `<span>` 으로 감싸고 fade in 시킨다.
 * 스트리밍이 아닐 때는(최종 버블) 표시가 없으므로 예전과 똑같이 렌더된다.
 *
 * ★ 키는 `청크번호-조각번호` 다. 청크는 뒤에만 붙으므로 이미 나온 조각의 키는 변하지
 *   않고, 그래서 **한 번만** 애니메이션한다. (굵게 표기가 스트리밍 중간에 완성되면
 *   그 줄의 조각 번호가 밀려 다시 fade 되는 경우가 있다 — 한 줄 안에서 잠깐이고,
 *   이걸 없애려면 마크다운 파서를 증분식으로 다시 써야 한다.)
 */
function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*\n]+\*\*)/g)
  let chunk = 0

  return parts.map((part, index) => {
    const strong = part.startsWith('**') && part.endsWith('**') && part.length > 4
    const body = strong ? part.slice(2, -2) : part

    if (!body.includes(CHUNK)) {
      const node = strong ? (
        <strong key={index} className="font-semibold text-foreground">
          {body}
        </strong>
      ) : (
        <Fragment key={index}>{body}</Fragment>
      )
      return node
    }

    // 경계로 쪼갠다. 빈 조각(맨 앞 표시)은 버린다.
    const pieces = body.split(CHUNK).filter((piece) => piece !== '')
    const wrapped = pieces.map((piece) => {
      chunk += 1
      return (
        <span
          key={`${chunk}-${index}`}
          className="animate-in fade-in duration-500 ease-out"
        >
          {piece}
        </span>
      )
    })

    return strong ? (
      <strong key={index} className="font-semibold text-foreground">
        {wrapped}
      </strong>
    ) : (
      <Fragment key={index}>{wrapped}</Fragment>
    )
  })
}

const BULLET = /^\s*[-*•]\s+/

/** `|---|---|` 같은 구분줄. 표의 머리와 몸을 가른다. */
const TABLE_DIVIDER = /^\s*\|?[\s:|-]+\|[\s:|-]*$/

function isTableRow(line: string): boolean {
  const plain = bare(line).trim()
  return plain.startsWith('|') && plain.includes('|', 1)
}

function cellsOf(line: string): string[] {
  // ★ 셀을 가르는 `|` 를 찾을 때만 표시를 걷어낸다. 셀 **안**의 표시는 남겨야
  //   그 조각이 fade in 된다.
  return line
    .replaceAll(`${CHUNK}|`, '|')
    .replaceAll(`|${CHUNK}`, '|')
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

/**
 * `text` 는 완성된 답변, `chunks` 는 스트리밍 중 확정된 덩어리들이다.
 *
 * 둘 중 하나만 준다. `chunks` 로 주면 경계마다 조각이 fade in 되고, `text` 로 주면
 * 예전과 똑같이 한 번에 그려진다 — 최종 버블은 후자다. 같은 문자열을 두 방식으로
 * 렌더할 수 있어야 스트리밍이 끝나는 순간 화면이 튀지 않는다.
 */
export function RichText({ text, chunks }: { text?: string; chunks?: string[] }) {
  const source = chunks ? chunks.join(CHUNK) : (text ?? '')

  // 빈 줄로 블록을 가른다. 연속된 빈 줄은 하나로 본다.
  const blocks = source.trim().split(/\n{2,}/)

  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, blockIndex) => {
        const lines = block.split('\n')

        // 표가 먼저다 — 표의 구분줄(`|---|`)이 불릿 판정에 걸릴 수 있다.
        const tableLines = lines.filter(isTableRow)
        if (tableLines.length >= 2) {
          const rest = lines.filter((line) => !isTableRow(line) && bare(line).trim())
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
        if (lines.some((line) => BULLET.test(bare(line)))) {
          const lead = lines.filter((line) => bare(line).trim() && !BULLET.test(bare(line)))
          const items = lines.filter((line) => BULLET.test(bare(line)))

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
                      {inline(line.replace(CHUNK, '').replace(BULLET, ''))}
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
