"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { BusinessNav } from "@/components/business/business-nav"
import { OdaServices } from "@/components/business/oda-services"
import { PlatformServices } from "@/components/business/platform-services"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState, Suspense, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { useLanguage } from "@/lib/i18n/language-context"
import { dictionary } from "@/lib/i18n/dictionary"

function BusinessContent() {
  const [activeTab, setActiveTab] = useState("oda")
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const navRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const category = searchParams.get('category')
    
    // Determine active tab
    if (category === "platform" || category === "platforms") {
      setActiveTab("platform")
    } else {
      setActiveTab("oda")
    }

    // Handle scrolling if there's a category
    if (category) {
      setTimeout(() => {
        if (navRef.current) {
          const navTop = navRef.current.getBoundingClientRect().top + window.pageYOffset
          window.scrollTo({
            top: navTop - 72,
            behavior: "smooth"
          })
        }
      }, 100)
    }
  }, [searchParams])

  return (
    <>
      <div ref={navRef}>
        <BusinessNav />
      </div>

      {/* Mutually Exclusive Content with Animation */}
      <div className="relative min-h-[600px]">
        <AnimatePresence mode="wait">
          {activeTab === "oda" ? (
            <motion.div
              key="oda"
              id="oda"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <OdaServices />
            </motion.div>
          ) : (
            <motion.div
              key="platform"
              id="platforms"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <PlatformServices />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

export default function BusinessPage() {
  const { t } = useLanguage()

  return (
    <main className="min-h-screen bg-[#02040a]">
      <Header />
      
      {/* Business Hero */}
      <section className="relative pt-48 pb-40 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/heroes/business.png" 
            alt="Business Background" 
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
              {t('business.hero.label')}
            </span>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tighter text-foreground mb-8 leading-[0.9] text-balance">
              {t('business.hero.title_1')} <br />
              <span className="text-transparent stroke-text">{t('business.hero.title_2')}</span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto break-keep leading-relaxed font-light whitespace-pre-line">
              {t('business.hero.description')}
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
        <BusinessContent />
      </Suspense>

      <Footer />
    </main>
  )
}
