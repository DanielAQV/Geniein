"use client"

import { motion } from "framer-motion"
import { Database, BarChart3, ShieldCheck } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { dictionary } from "@/lib/i18n/dictionary"

export function PlatformServices() {
  const { t, language } = useLanguage()

  const icons = [
    <BarChart3 key="chart" className="h-6 w-6" />,
    <Database key="db" className="h-6 w-6" />,
    <ShieldCheck key="shield" className="h-6 w-6" />
  ]

  const capabilities = dictionary.business.platform.capabilities

  return (
    <section id="platforms" className="py-28 bg-background relative overflow-hidden">
      {/* Blueprint Grid Background */}
      <div className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="platform-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
              <circle cx="0" cy="0" r="1" fill="currentColor" className="text-primary" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#platform-grid)" />
        </svg>
      </div>
      {/* Futuristic Background Decor */}
      <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
        {/* Large Gradient Orbs */}
        <div className="absolute top-1/4 -right-20 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -left-20 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />

        {/* Tech Matrix Visual */}
        <svg className="absolute top-0 right-0 h-full w-1/3 opacity-[0.08]" viewBox="0 0 400 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="400" cy="400" r="300" stroke="var(--primary)" strokeWidth="0.5" strokeDasharray="10 10" />
          <circle cx="400" cy="400" r="200" stroke="var(--primary)" strokeWidth="1" />
          <path d="M 0 400 H 400 M 400 0 V 800" stroke="var(--primary)" strokeWidth="0.5" />
          {/* Animated Particles (Conceptual) */}
          <rect x="350" y="350" width="10" height="10" fill="var(--primary)" className="animate-pulse" />
          <rect x="250" y="450" width="10" height="10" fill="var(--primary)" className="animate-pulse" />
        </svg>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mb-8 inline-flex items-center gap-2 px-4 py-1 rounded-sm border border-primary/30 bg-primary/5"
          >

            <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary">
              {t('business.platform.label')}
            </span>
          </motion.div>
          <h2 className="text-5xl font-bold text-foreground mb-6 tracking-tighter">
            {t('business.platform.title')}
          </h2>
          <p className="text-[18px] text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed break-keep">
            {t('business.platform.description')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {capabilities.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="px-[16px] py-[32px] rounded-[16px] border border-[#999eab]/30 bg-[#14172b] hover:border-primary/40 transition-all group relative overflow-hidden shadow-[inset_0_0_0_2px_rgba(190,190,190,0.1)]"
            >
              <div className="mb-8 p-4 w-fit rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-inner">
                {icons[index]}
              </div>
              <h3 className="text-2xl font-bold text-[#f6f8ff] mb-4 group-hover:text-primary transition-colors tracking-tight">
                {item.title[language]}
              </h3>
              <p className="text-[#999eab] font-light leading-relaxed break-keep">
                {item.desc[language]}
              </p>

              {/* Decorative Line */}
              <div className="absolute bottom-0 left-0 w-0 h-1 bg-primary group-hover:w-full transition-all duration-700" />
            </motion.div>
          ))}
        </div>

        <div className="mt-24 p-12 md:p-16 rounded-[24px] border border-[#999eab]/30 bg-[#090b0f]/30 shadow-2xl backdrop-blur-[4px] relative overflow-hidden">
          <img
            src="/images/business/platform-vision.png"
            alt=""
            className="absolute right-0 top-0 h-full w-auto max-w-[65%] object-cover object-left pointer-events-none select-none"
          />
          <div className="absolute inset-0 pointer-events-none" />
          <div className="relative z-10 max-w-xl">
            <h4 className="text-[30px] font-bold text-[#f6f8ff] mb-6 tracking-tight">{t('business.platform.vision_title')}</h4>
            <p className="text-[18px] text-[#999eab] font-light leading-relaxed break-keep">
              {t('business.platform.vision_desc')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
