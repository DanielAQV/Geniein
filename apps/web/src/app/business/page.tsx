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
  const [activeTab, setActiveTab] = useState("platform")
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const navRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const category = searchParams.get('category')

    // Determine active tab (default to platform / IT-first)
    if (category === "oda") {
      setActiveTab("oda")
    } else {
      setActiveTab("platform")
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
    <main className="min-h-screen bg-background">
      <Header />
      
      {/* Business Hero */}
      <section className="relative pt-32 pb-24 min-h-[400px] flex flex-col justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/heroes/business.png" 
            alt="Business Background" 
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
                {t('business.hero.label')}
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-foreground mb-10 leading-[1.1] max-w-4xl mx-auto text-balance">
                {t('business.hero.title_1')} {t('business.hero.title_2')}
              </h1>
            </div>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed font-light text-balance break-keep whitespace-pre-line">
              {t('business.hero.description')}
            </p>
          </motion.div>
        </div>
        
      </section>



      <Suspense fallback={<div className="h-96" />}>
        <BusinessContent />
      </Suspense>

      <Footer />
    </main>
  )
}
