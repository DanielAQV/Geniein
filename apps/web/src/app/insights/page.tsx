"use client"

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
  const [activeTab, setActiveTab] = useState("oda")
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const navRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateTabFromHash = () => {
      const hash = window.location.hash.replace("#", "")
      
      if (hash === "it") {
        setActiveTab("it")
      } else if (hash === "oda") {
        setActiveTab("oda")
      }

      if (hash) {
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
    }

    updateTabFromHash()
    window.addEventListener("hashchange", updateTabFromHash)
    
    return () => {
      window.removeEventListener("hashchange", updateTabFromHash)
    }
  }, [pathname, searchParams])

  return (
    <>
      <div ref={navRef}>
        <InsightsNav />
      </div>

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
    <main className="min-h-screen bg-[#02040a]">
      <Header />
      
      {/* Insights Hero */}
      <section className="relative pt-48 pb-32 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/heroes/insights.png" 
            alt="Insights Background" 
            className="w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050810]/40 via-[#02040a]/60 to-[#02040a]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#02040a] via-transparent to-[#02040a] opacity-40" />
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
            <span className="text-sm font-bold tracking-[0.3em] uppercase text-primary mb-8 block">
              {t('landing.insights.label')}
            </span>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tighter text-foreground mb-8 leading-[0.9] text-balance uppercase">
              AI <br />
              <span className="text-transparent stroke-text">INSIGHTS</span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto break-keep leading-relaxed font-light whitespace-pre-line">
              {t('landing.insights.desc')}
            </p>
          </motion.div>
        </div>
        
        <style jsx>{`
          .stroke-text {
            -webkit-text-stroke: 1px rgba(255, 255, 255, 0.3);
          }
        `}</style>
      </section>
      
      <div className="relative h-px w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
      </div>

      <Suspense fallback={<div className="h-96" />}>
        <InsightsContent />
      </Suspense>

      <Footer />
    </main>
  )
}
