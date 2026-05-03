"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AIInsights } from "@/components/ai-insights"
import { InsightsNav } from "@/components/insights/insights-nav"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/language-context"
import { Suspense } from "react"

export default function InsightsOdaPage() {
  const { t } = useLanguage()

  return (
    <main className="min-h-screen bg-[#02040a]">
      <Header />
      
      {/* Insights ODA Hero */}
      <section className="relative pt-48 pb-32 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/heroes/insights.png" 
            alt="Insights ODA Background" 
            className="w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050810]/40 via-[#02040a]/60 to-[#02040a]" />
        </div>
        
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-sm font-bold tracking-[0.3em] uppercase text-primary mb-8 block">
              AI Insights
            </span>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tighter text-foreground mb-8 leading-[0.9] text-balance uppercase">
              ODA <br />
              <span className="text-transparent stroke-text">INSIGHTS</span>
            </h1>
          </motion.div>
        </div>
        
        <style jsx>{`
          .stroke-text {
            -webkit-text-stroke: 1px rgba(255, 255, 255, 0.3);
          }
        `}</style>
      </section>

      <InsightsNav />

      <Suspense fallback={null}>
        <AIInsights isFullPage={true} category="ODA" id="oda" />
      </Suspense>

      <Footer />
    </main>
  )
}
