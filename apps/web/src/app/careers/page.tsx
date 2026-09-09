"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CultureSection } from "@/components/careers/culture-section"
import { JobBoard } from "@/components/careers/job-board"
import { ApplyCta } from "@/components/careers/apply-cta"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/language-context"
import { getJobPostings } from "@/lib/careers/jobs"

// 공고 배열은 컴포넌트 밖에서 주입한다. admin 이 붙으면 이 한 줄만
// 서버 fetch(또는 SWR)로 바꾸면 되고 JobBoard 는 그대로 쓴다.
const jobs = getJobPostings()

export default function CareersPage() {
  const { t } = useLanguage()

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

      <CultureSection />

      <JobBoard jobs={jobs} />

      <ApplyCta />

      <Footer />
    </main>
  )
}
