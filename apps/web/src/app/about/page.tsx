"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { IdentitySection } from "@/components/about/identity-section"
import { OrganizationSection } from "@/components/about/organization-section"
import { ProjectsShowcase } from "@/components/about/projects-showcase"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n/language-context"

export default function AboutPage() {
  const { t } = useLanguage()

  return (
    <main className="min-h-screen bg-[#02040a]">
      <Header />
      
      {/* About Hero Section: The Manifesto */}
      <section className="relative pt-48 pb-40 overflow-hidden border-b border-white/5">
        {/* Background Image Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/heroes/about.png" 
            alt="About Background" 
            className="w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050810]/40 via-[#02040a]/60 to-[#02040a]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#02040a] via-transparent to-[#02040a] opacity-40" />
        </div>

        {/* Architectural Background: Blueprint Grid */}
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
              {t('about.hero.label')}
            </span>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tighter text-foreground mb-8 leading-[0.9] text-balance">
              {t('about.hero.title_1')} <br />
              <span className="text-transparent stroke-text">{t('about.hero.title_2')}</span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto break-keep leading-relaxed font-light whitespace-pre-line">
              {t('about.hero.description')}
            </p>
          </motion.div>
        </div>
        
        <style jsx>{`
          .stroke-text {
            -webkit-text-stroke: 1px rgba(255, 255, 255, 0.3);
          }
        `}</style>
      </section>
      
      {/* Signature Gradient Beam Separator */}
      <div className="relative h-px w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
      </div>

      {/* Identity Section */}
      <IdentitySection />

      {/* Organization Section */}
      <OrganizationSection />

      {/* Projects Showcase Section */}
      <ProjectsShowcase />

      <Footer />
    </main>
  )
}
