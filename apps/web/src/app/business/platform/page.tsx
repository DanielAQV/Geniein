"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { BusinessNav } from "@/components/business/business-nav"
import { PlatformServices } from "@/components/business/platform-services"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/language-context"

export default function PlatformPage() {
  const { t } = useLanguage()

  return (
    <main className="min-h-screen bg-[#02040a]">
      <Header />
      
      {/* Platform Hero */}
      <section className="relative pt-48 pb-32 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/heroes/business.png" 
            alt="Platform Background" 
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
            <span className="text-sm font-bold tracking-[0.3em] uppercase text-accent mb-8 block">
              Business Areas
            </span>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tighter text-foreground mb-8 leading-[0.9] uppercase">
              IT Platform <br />
              <span className="text-transparent stroke-text">Business</span>
            </h1>
          </motion.div>
        </div>
        
        <style jsx>{`
          .stroke-text {
            -webkit-text-stroke: 1px rgba(255, 255, 255, 0.3);
          }
        `}</style>
      </section>

      <BusinessNav />

      <PlatformServices />

      <Footer />
    </main>
  )
}
