'use client'

/** 가이드 한 장. 목록과 같은 경계를 지난다 — 껍데기는 공개, 본문은 토큰으로. */

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { initTeams } from '@/lib/teams/client'
import { DocBody } from '../../_components/doc-body'
import { GuideNotFoundError, fetchGuide } from '../../_lib/guide-client'

interface Guide {
  slug: string
  title: string
  summary: string
  roles: string[]
  updated: string
  supersedes?: string
  body: string
}

export default function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [guide, setGuide] = useState<Guide | null>(null)
  const [problem, setProblem] = useState<'none' | 'missing' | 'failed'>('none')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        await initTeams()
        const data = await fetchGuide<Guide>(`/${slug}`)
        if (alive) setGuide(data)
      } catch (error) {
        if (alive) setProblem(error instanceof GuideNotFoundError ? 'missing' : 'failed')
      }
    })()
    return () => {
      alive = false
    }
  }, [slug])

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-8">
      <Link
        href="/teams/guide"
        className="inline-flex w-fit items-center gap-1.5 font-mono text-[11.5px] uppercase tracking-[0.1em] text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Guides
      </Link>

      {problem !== 'none' && (
        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-4 py-3 text-[14.5px] text-muted-foreground">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-500" aria-hidden />
          <span>
            {problem === 'missing'
              ? "That guide doesn't exist."
              : "Couldn't load this guide. Reopen the tab and try again."}
          </span>
        </div>
      )}

      {guide && (
        <>
          <header className="flex flex-col gap-2 border-b border-border pb-5">
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
              {guide.title}
            </h1>
            {guide.summary && (
              <p className="max-w-[60ch] text-[15.5px] text-muted-foreground">{guide.summary}</p>
            )}
            <div className="mt-1 flex flex-wrap gap-2 font-mono text-[11.5px] text-muted-foreground">
              {guide.roles.map((role) => (
                <span key={role} className="rounded-full border border-border px-2.5 py-0.5">
                  {role}
                </span>
              ))}
              {guide.updated && (
                <span className="rounded-full border border-border px-2.5 py-0.5">
                  updated {guide.updated}
                </span>
              )}
            </div>
          </header>

          <DocBody markdown={guide.body} />

          {guide.supersedes && (
            <footer className="border-t border-border pt-4 font-mono text-[11.5px] text-muted-foreground">
              Replaces {guide.supersedes}
            </footer>
          )}
        </>
      )}
    </main>
  )
}
