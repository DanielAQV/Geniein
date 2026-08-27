/**
 * 가이드 원본 — 저장소의 마크다운을 읽는다 (서버 전용).
 *
 * ★ 원본을 SharePoint 가 아니라 여기 두는 이유는 **갱신을 자동화하기 위해서**다.
 *   플로우나 폼이 바뀌면 그 변경과 문서를 나란히 놓고 대조할 수 있어야 하는데,
 *   문서가 PDF 로만 있으면 그게 불가능하다. 실제로 v1 가이드가 넉 달 만에
 *   시스템과 어긋난 이유가 그것이다 (자식 행 → ChildDataJSON 변경).
 *
 * ★ 프론트매터 파서를 직접 쓴다. 필요한 것이 `key: value` 와 `[a, b]` 뿐이라
 *   의존성을 하나 더 들일 이유가 없다.
 */

import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

/** 저장소 루트 기준. 컨테이너·호스트 어디서 돌든 CWD 는 앱 루트다. */
const GUIDES_DIR = path.join(process.cwd(), 'content', 'guides')

export interface GuideMeta {
  slug: string
  title: string
  summary: string
  /** 누가 보는 문서인가. 검색 필터(role_scope)와 같은 값 집합을 쓴다. */
  roles: string[]
  order: number
  updated: string
  supersedes?: string
}

export interface Guide extends GuideMeta {
  body: string
}

function parseFrontmatter(raw: string): { meta: Record<string, string | string[]>; body: string } {
  if (!raw.startsWith('---')) return { meta: {}, body: raw }

  const end = raw.indexOf('\n---', 3)
  if (end === -1) return { meta: {}, body: raw }

  const meta: Record<string, string | string[]> = {}
  for (const line of raw.slice(3, end).split('\n')) {
    const at = line.indexOf(':')
    if (at === -1) continue
    const key = line.slice(0, at).trim()
    const value = line.slice(at + 1).trim()
    if (!key || !value) continue
    meta[key] = value.startsWith('[')
      ? value
          .slice(1, value.endsWith(']') ? -1 : undefined)
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : value
  }

  // `\n---` 다음 줄부터가 본문
  const bodyStart = raw.indexOf('\n', end + 1)
  return { meta, body: bodyStart === -1 ? '' : raw.slice(bodyStart + 1).trimStart() }
}

function toGuide(slug: string, raw: string): Guide {
  const { meta, body } = parseFrontmatter(raw)
  const text = (key: string, fallback = ''): string =>
    typeof meta[key] === 'string' ? (meta[key] as string) : fallback
  const list = (key: string): string[] => (Array.isArray(meta[key]) ? (meta[key] as string[]) : [])

  return {
    slug,
    title: text('title', slug),
    summary: text('summary'),
    roles: list('roles'),
    order: Number.parseInt(text('order', '99'), 10) || 99,
    updated: text('updated'),
    supersedes: text('supersedes') || undefined,
    body,
  }
}

export async function listGuides(): Promise<GuideMeta[]> {
  let files: string[]
  try {
    files = await readdir(GUIDES_DIR)
  } catch {
    // 디렉터리가 없는 것은 오류가 아니다 — 아직 문서를 안 넣은 상태다.
    return []
  }

  const guides = await Promise.all(
    files
      .filter((f) => f.endsWith('.md'))
      .map(async (file) => {
        const slug = file.replace(/\.md$/, '')
        const raw = await readFile(path.join(GUIDES_DIR, file), 'utf8')
        const { body: _body, ...meta } = toGuide(slug, raw)
        return meta
      }),
  )

  return guides.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
}

export async function getGuide(slug: string): Promise<Guide | null> {
  // ★ slug 가 경로가 되지 않게 막는다. 라우트 파라미터는 사용자 입력이다.
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return null

  try {
    const raw = await readFile(path.join(GUIDES_DIR, `${slug}.md`), 'utf8')
    return toGuide(slug, raw)
  } catch {
    return null
  }
}
