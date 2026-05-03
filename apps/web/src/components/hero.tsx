"use client"

import Link from "next/link"
import { ArrowRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, useScroll, useTransform } from "framer-motion"
import { useLanguage } from "@/lib/i18n/language-context"
import { ParticleBackground } from "./particle-background"
import { TechMap } from "./tech-map"

export function Hero() {
  const { t } = useLanguage()
  
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-32">
      {/* Premium Dynamic Background */}
      <div className="absolute inset-0 -z-10 bg-[#02040a]">
        <ParticleBackground />
        
        {/* Deep Atmosphere Glows */}
        <div className="absolute top-1/4 -right-20 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -left-20 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px]" />
        
        {/* Subtle Grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="text-left">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Premium Shimmering Badge */}
              <div className="mb-8 inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl relative overflow-hidden group shadow-2xl">
                <motion.div
                  animate={{ left: ["-100%", "200%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12"
                />
                <Zap className="h-4 w-4 text-primary relative z-10" />
                <span className="text-sm font-bold tracking-widest uppercase text-primary relative z-10">
                  {t('hero.badge')}
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-8xl font-bold tracking-tight text-foreground leading-[1.1] mb-8">
                <span className="block">{t('hero.title_main')}</span>
                <span className="text-transparent stroke-text">{t('hero.title_accent')}</span>
              </h1>

              {/* Sub-headline */}
              <p className="text-xl text-muted-foreground max-w-xl font-light tracking-wide break-keep mb-10 leading-relaxed whitespace-pre-line">
                {t('hero.description')}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Button asChild size="lg" className="w-full sm:w-auto rounded-full px-10 text-base h-14 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-1">
                  <Link href="/business" className="flex items-center justify-center">
                    {t('hero.btn_projects')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-auto rounded-full px-10 text-base h-14 bg-white/5 backdrop-blur-md hover:bg-white/10 border border-white/10 transition-all hover:-translate-y-1 text-white"
                >
                  <Link href="/contact" className="flex items-center justify-center">
                    {t('hero.btn_contact')}
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Right: Strategic Tech Map */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block relative"
          >
            <TechMap />
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        .stroke-text {
          -webkit-text-stroke: 1px rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </section>
  )
}
