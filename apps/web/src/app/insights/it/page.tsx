"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AIInsights } from "@/components/ai-insights"
import { InsightsNav } from "@/components/insights/insights-nav"
import { motion } from "framer-motion"
import { Suspense } from "react"

export default function InsightsItPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      {/* Insights IT Hero */}
      <section className="relative pt-48 pb-32 overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/heroes/insights.png" 
            alt="Insights IT Background" 
            className="w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        </div>
        
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold tracking-[0.3em] uppercase text-emerald-500 mb-8 block">
                AI INSIGHTS
              </span>
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground mb-10 leading-[1.1] max-w-4xl mx-auto">
                AI STRATEGY IT INSIGHTS
              </h1>
            </div>
          </motion.div>
        </div>
      </section>

      <InsightsNav />
      <Suspense fallback={null}>
        <AIInsights isFullPage={true} category="IT" id="it" />
      </Suspense>
      <Footer />
    </main>
  )
}
