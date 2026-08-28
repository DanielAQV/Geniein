'use client'

/**
 * 가이드 목록.
 *
 * ★ 페이지 껍데기는 공개고 **본문은 토큰을 지나야** 온다 (`/api/teams/guide`).
 *   대화 화면과 같은 경계다 — 화면이 뜨는 것과 내용을 보는 것을 나눠 둔다.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, AlertCircle, ArrowLeft } from 'lucide-react'
import { initTeams } from '@/lib/teams/client'
import { fetchGuide } from '../_lib/guide-client'
import { DEFAULT_LANG, readStoredLang, stringsFor, type Lang } from '../_lib/i18n'

interface GuideMeta {
  slug: string
  title: string
  summary: string
  roles: string[]
  updated: string
}

export default function GuideListPage() {
  const [guides, setGuides] = useState<GuideMeta[] | null>(null)
  const [failed, setFailed] = useState(false)
  // 대화 화면에서 고른 언어를 그대로 따른다. 문서 본문은 영어 한 벌이고,
  // 화면 문구만 각자 언어로 보인다.
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG)
  const strings = stringsFor(lang)

  useEffect(() => {
    setLang(readStoredLang() ?? DEFAULT_LANG)
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await initTeams()
        const data = await fetchGuide<{ guides: GuideMeta[] }>('')
        if (alive) setGuides(data.guides)
      } catch {
        if (alive) setFailed(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-1.5">
        <Link
          href="/teams/search"
          className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          {strings.title}
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{strings.guides}</h1>
        <p className="text-[15px] text-muted-foreground">{strings.guidesLede}</p>
      </header>

      {failed && (
        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-[14.5px] text-muted-foreground">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-500" aria-hidden />
          <span>Couldn&apos;t load the guides. Reopen the tab and try again.</span>
        </div>
      )}

      {guides !== null && guides.length === 0 && !failed && (
        <p className="text-[15px] text-muted-foreground">No guides yet.</p>
      )}

      <div className="flex flex-col gap-2.5">
        {(guides ?? []).map((guide) => (
          <Link
            key={guide.slug}
            href={`/teams/guide/${guide.slug}`}
            className="group flex items-start gap-3.5 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <FileText className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-[15.5px] font-semibold text-foreground">{guide.title}</span>
              <span className="text-[14px] leading-relaxed text-muted-foreground">
                {guide.summary}
              </span>
              {guide.updated && (
                <span className="font-mono text-[11.5px] text-muted-foreground/70">
                  Updated {guide.updated}
                </span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </main>
  )
}
