"use client"

import { motion } from "framer-motion"
import { ClipboardCheck, Settings, Search, Users, ChevronRight } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { dictionary } from "@/lib/i18n/dictionary"

export function OdaServices() {
  const { t, language } = useLanguage()
  
  const icons = [
    <Settings key="settings" className="h-6 w-6" />,
    <Users key="users" className="h-6 w-6" />,
    <Search key="search" className="h-6 w-6" />
  ]

  const pillars = dictionary.business.oda.pillars
  const phases = ["Planning & F/S", "Procurement", "Implementation", "Monitoring & Evaluation"]

  return (
    <section id="oda" className="py-40 relative overflow-hidden border-t border-border/50 bg-background">
      {/* Blueprint Grid Background */}
      <div className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="oda-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
              <circle cx="0" cy="0" r="1" fill="currentColor" className="text-primary" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#oda-grid)" />
        </svg>
      </div>
      
      {/* Gradient Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-16 items-start">
          {/* Left: ODA Strategy Narrative */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="mb-8 inline-flex items-center gap-2 px-4 py-1 rounded-sm border border-primary/30 bg-primary/5">
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary">
                  {t('business.oda.label')}
                </span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-8 tracking-tighter leading-tight">
                {t('business.oda.title')}
              </h2>
              <p className="text-lg text-muted-foreground font-light leading-relaxed mb-10 break-keep">
                {t('business.oda.description')}
              </p>

              {/* Lifecycle Diagram (Small Version) */}
              <div className="flex flex-wrap gap-4">
                {phases.map((phase, idx) => (
                  <div key={phase} className="flex items-center gap-2">
                    <div className="text-[10px] font-bold text-primary border border-primary/30 px-2 py-1 rounded-sm uppercase tracking-widest">
                      {phase}
                    </div>
                    {idx < phases.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: The Three Pillars */}
          <div className="lg:col-span-7 space-y-6">
            {pillars.map((pillar, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-8 md:p-10 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-md hover:bg-card/80 hover:border-primary/30 transition-all relative overflow-hidden shadow-2xl"
              >
                <div className="flex gap-8 items-start">
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-inner">
                    {icons[index]}
                  </div>
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                      <span className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{pillar.title[language]}</span>
                      <span className="inline-block text-[10px] font-bold text-primary tracking-widest uppercase px-2 py-0.5 rounded-full bg-primary/5 border border-primary/20">{pillar.label[language]}</span>
                    </div>
                    <p className="text-base md:text-lg text-muted-foreground font-light leading-relaxed break-keep max-w-lg">
                      {pillar.desc[language]}
                    </p>
                  </div>
                </div>
                
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity uppercase select-none pointer-events-none">
                  <span className="text-8xl font-bold tracking-tighter">{pillar.title[language]}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
