"use client"

import { Globe2, Layers, ArrowUpRight, Target } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/language-context"
import { dictionary } from "@/lib/i18n/dictionary"

export function BusinessOverview() {
  const { t, language } = useLanguage()
  const odaItems = dictionary.landing.business.oda_items
  const platformItems = dictionary.landing.business.platform_items

  return (
    <section id="business" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-6 inline-flex items-center gap-2 px-5 py-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md relative overflow-hidden group shadow-lg"
          >
            {/* Shimmer Effect */}
            <motion.div
              animate={{
                left: ["-100%", "200%"],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-primary/5 to-transparent -skew-x-12"
            />
            <Target className="h-4 w-4 text-primary relative z-10" />
            <span className="text-sm font-bold tracking-widest uppercase text-primary relative z-10">
              {t('landing.business.label')}
            </span>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold text-foreground mb-6 tracking-tight leading-[1.2] whitespace-pre-line text-balance break-keep"
          >
            {t('landing.business.title')}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light whitespace-pre-line text-balance break-keep"
          >
            {t('landing.business.description')}
          </motion.p>
        </div>

        {/* Split Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {/* IT Platform Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="h-full"
          >
            <Link
            href="/business?category=platform"
            className="block h-full group relative overflow-hidden rounded-2xl bg-card border border-border/50 p-8 lg:p-10 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20"
          >

            
            <div className="relative">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 text-accent mb-6">
                <Layers className="h-7 w-7" />
              </div>
              
              <h3 className="text-2xl font-semibold text-foreground mb-4">
                {t('landing.business.platform_title')}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed mb-6 break-keep">
                {t('landing.business.platform_desc')}
              </p>

              <ul className="space-y-3 mb-8">
                {platformItems.map((item, idx) => (
                   <li key={idx} className="flex items-center gap-3 text-base text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {item[language]}
                  </li>
                ))}
              </ul>

              <div className="inline-flex items-center gap-1.5 text-base font-medium text-accent group-hover:gap-3 transition-all">
                {t('common.more')}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </div>
          </Link>
          </motion.div>

          {/* ODA Consulting Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="h-full"
          >
            <Link
            href="/business?category=oda"
            className="block h-full group relative overflow-hidden rounded-2xl bg-card border border-border/50 p-8 lg:p-10 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20"
          >

            
            <div className="relative">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-6">
                <Globe2 className="h-7 w-7" />
              </div>
              
              <h3 className="text-2xl font-semibold text-foreground mb-4">
                {t('landing.business.oda_title')}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed mb-6 break-keep">
                {t('landing.business.oda_desc')}
              </p>

              <ul className="space-y-3 mb-8">
                {odaItems.map((item, idx) => (
                   <li key={idx} className="flex items-center gap-3 text-base text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {item[language]}
                  </li>
                ))}
              </ul>

              <div className="inline-flex items-center gap-1.5 text-base font-medium text-primary group-hover:gap-3 transition-all">
                {t('common.more')}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </div>
          </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
