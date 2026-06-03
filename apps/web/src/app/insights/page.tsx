"use client"

export const dynamic = 'force-dynamic'

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AIInsights } from "@/components/ai-insights"
import { InsightsNav } from "@/components/insights/insights-nav"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState, Suspense, useRef } from "react"
import { useLanguage } from "@/lib/i18n/language-context"
import { usePathname, useSearchParams } from "next/navigation"

function InsightsContent() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState("it")
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const navRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const category = searchParams.get('category')

    if (category === "oda") {
      setActiveTab("oda")
    } else {
      setActiveTab("it")
    }

    if (category) {
      setTimeout(() => {
        if (navRef.current) {
          const navTop = navRef.current.getBoundingClientRect().top + window.pageYOffset
          window.scrollTo({
            top: navTop - 64,
            behavior: "smooth"
          })
        }
      }, 100)
    }
  }, [searchParams])

  return (
    <>
      <div ref={navRef}>
        <InsightsNav />
      </div>
      
      <section className="pt-28 pb-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8 inline-flex items-center gap-2 px-4 py-1 rounded-sm border border-primary/30 bg-primary/5"
            >
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary">
                {t('landing.insights.label')}
              </span>
            </motion.div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-8 tracking-tighter">
              {t('landing.insights.title')}
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed break-keep whitespace-pre-line">
              {t('landing.insights.desc')}
            </p>
          </div>
        </div>
      </section>

      <div className="relative min-h-[800px] scroll-mt-20">
        <AnimatePresence mode="wait">
          {activeTab === "oda" ? (
            <motion.div
              key="oda-insights"
              id="oda"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
            >
              <AIInsights isFullPage={true} category="ODA" id="oda-list" />
            </motion.div>
          ) : (
            <motion.div
              key="it-insights"
              id="it"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
            >
              <AIInsights isFullPage={true} category="IT" id="it-list" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

export default function InsightsPage() {
  const { t } = useLanguage()

  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      {/* Insights Hero */}
      <section className="relative pt-32 pb-24 min-h-[400px] flex flex-col justify-center overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/heroes/insights.png" 
            alt="Insights Background" 
            className="w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background opacity-40" />
        </div>

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
              <span className="text-sm font-bold tracking-[0.3em] uppercase text-primary mb-8 block">
                {t('landing.insights.label')}
              </span>
               <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-foreground mb-10 leading-[1.1] max-w-4xl mx-auto text-balance">
                {t('landing.insights.hero_title')}
              </h1>
            </div>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed font-light text-balance break-keep whitespace-pre-line">
              {t('landing.insights.hero_desc')}
            </p>
          </motion.div>
        </div>
      </section>
      




      <Suspense fallback={<div className="h-96" />}>
        <InsightsContent />
      </Suspense>

      <Footer />
    </main>
  )
}
