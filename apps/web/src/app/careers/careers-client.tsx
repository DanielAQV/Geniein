"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { JobBoard } from "@/components/careers/job-board"
import { ApplyCta } from "@/components/careers/apply-cta"
import { ApplyModal } from "@/components/careers/apply-modal"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/language-context"
import { type JobPosting } from "@/lib/careers/jobs"

// 공고는 서버(page.tsx)가 NestJS 에서 읽어 넘겨준다. 여기서는 받아 쓰기만 한다 —
// 지원 모달과 언어 컨텍스트 때문에 이 컴포넌트가 클라이언트여야 하고,
// 데이터 fetch 는 내부 주소를 쓰므로 브라우저에서 할 수 없다.
export function CareersClient({ jobs }: { jobs: JobPosting[] }) {
  const { t } = useLanguage()

  // 지원 폼은 라우트를 추가하지 않고 모달로 띄운다. 공고 카드와 하단 CTA 가 같이 쓴다.
  const [applyOpen, setApplyOpen] = useState(false)
  const [applyJob, setApplyJob] = useState<JobPosting | null>(null)

  const openApply = (job: JobPosting | null) => {
    setApplyJob(job)
    setApplyOpen(true)
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Careers Hero */}
      <section className="relative pt-28 pb-16 min-h-[320px] md:pt-32 md:pb-24 md:min-h-[400px] flex flex-col justify-center overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/heroes/contact.png"
            alt="Careers Background"
            className="w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background opacity-40" />
        </div>

        {/* Architectural Background: Blueprint Grid */}
        <div className="absolute inset-0 z-0 opacity-10">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="blueprint-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary/40" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#blueprint-grid)" />
          </svg>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex flex-col items-center">
              <span className="text-xs md:text-sm font-bold tracking-[0.2em] uppercase text-primary mb-4 md:mb-8 block">
                {t("careers.hero.label")}
              </span>
              <h1 className="text-[32px] tracking-[-0.5px] leading-[1.18] md:text-5xl md:tracking-tight md:leading-[1.1] lg:text-7xl font-bold text-foreground mb-6 md:mb-10 max-w-4xl mx-auto text-balance">
                {t("careers.hero.title_1")} {t("careers.hero.title_2")}
              </h1>
            </div>
            <p className="text-sm leading-[22px] md:text-xl md:leading-relaxed lg:text-2xl text-muted-foreground max-w-4xl mx-auto break-keep font-light whitespace-pre-line text-balance">
              {t("careers.hero.description")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Signature Gradient Beam Separator */}
      <div className="relative h-px w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
      </div>

      <JobBoard jobs={jobs} onApply={openApply} />

      <ApplyCta onApply={() => openApply(null)} />

      <Footer />

      <ApplyModal open={applyOpen} job={applyJob} onClose={() => setApplyOpen(false)} />
    </main>
  )
}
