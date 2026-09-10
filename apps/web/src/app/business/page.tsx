"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { SectionDivider } from "@/components/section-divider"
import { BusinessNav } from "@/components/business/business-nav"
import { OdaServices } from "@/components/business/oda-services"
import { PlatformServices } from "@/components/business/platform-services"
import { ConnextCta } from "@/components/business/connext-cta"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState, Suspense, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { useLanguage } from "@/lib/i18n/language-context"

function BusinessContent() {
  const [activeTab, setActiveTab] = useState("platform")
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
      {/* 스크롤 기준점만 잡는 0px 마커.
          네비를 감싸면 sticky 가 죽는다 — 래퍼 높이가 네비와 같아서 빠져나갈
          공간이 없다. 그리고 네비 자체를 재면 상단에 붙은 뒤 위치가 틀어진다. */}
      <div ref={navRef} aria-hidden className="h-0" />
      <BusinessNav />

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
              <ConnextCta />
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
      {/* 위 여백이 헤더(h-15 + 1px) 아래에서 시작하는 걸 감안해 아래 여백보다
          그만큼 크게 잡는다. 같은 값으로 두면 내용이 위로 붙어 보인다. */}
      <section className="relative pt-30 pb-14 min-h-[320px] md:pt-36 md:pb-20 md:min-h-[400px] flex flex-col justify-center overflow-hidden border-b border-border/50">
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

      {/* 배너 아래 시그니처 구분선. 메인과 같은 컴포넌트를 쓴다 —
          인라인으로 복사해두면 한쪽만 바뀌어 페이지마다 달라진다. */}
      <SectionDivider />



      <Suspense fallback={<div className="h-96" />}>
        <BusinessContent />
      </Suspense>

      <Footer />
    </main>
  )
}
