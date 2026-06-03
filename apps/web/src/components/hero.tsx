"use client"

import Link from "next/link"
import { ArrowRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/language-context"
import { GlassButton } from "./ui/glass-button"
import { ParticleBackground } from "./particle-background"

export function Hero() {
  const { t } = useLanguage()

  return (
    <section id="hero" className="relative isolate min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-32">
      {/* Premium Dynamic Background */}
      <div className="absolute inset-0 -z-10 bg-[var(--page-bg)] transition-colors duration-300">
        {/* Figma wave background — full-width mapping keeps the wave spacing locked to the 1440 design */}
        <img src="/main-hero.png" alt="" aria-hidden className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 w-full h-auto max-w-none select-none transition-opacity duration-300" style={{ opacity: 'var(--hero-img-opacity)' }} />

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
        <div className="text-center max-w-4xl mx-auto flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full"
          >

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[96px] font-bold tracking-tight text-foreground leading-[1.1] mb-8">
              <span className="block">{t('hero.title_main')}</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-400 to-primary inline-block pb-2">{t('hero.title_accent')}</span>
            </h1>

            {/* Sub-headline */}
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto font-light tracking-wide break-keep mb-10 leading-relaxed whitespace-pre-line text-balance">
              {t('hero.description')}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto rounded-full px-10 text-base h-14 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:-translate-y-1">
                <Link href="/business" className="flex items-center justify-center">
                  {t('hero.btn_projects')}
                  <ArrowRight className="ml-1.5 h-5 w-5" />
                </Link>
              </Button>
              <GlassButton href="/contact">
                {t('hero.btn_contact')}
              </GlassButton>
            </div>
          </motion.div>
        </div>
      </div>

    </section>
  )
}
