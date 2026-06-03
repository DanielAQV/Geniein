"use client"

import { motion } from "framer-motion"
import { Eye, Target, Heart, ChevronRight } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { dictionary } from "@/lib/i18n/dictionary"

export function IdentitySection() {
  const { t, language } = useLanguage()

  const icons = [
    <Eye key="eye" className="h-6 w-6" />,
    <Target key="target" className="h-6 w-6" />,
    <Heart key="heart" className="h-6 w-6" />
  ]

  const steps = dictionary.about.identity.steps

  return (
    <section id="identity" className="py-28 relative bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-16">
          {/* Left Side: Philosophy Narrative */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="sticky top-32"
            >
              <div className="mb-8 inline-flex items-center gap-2 px-4 py-1 rounded-sm border border-primary/30 bg-primary/5">

                <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary">
                  {t('about.identity.label')}
                </span>
              </div>
              <h2 className="text-5xl font-bold text-foreground mb-8 leading-tight tracking-tighter">
                {t('about.identity.title')}
              </h2>
              <div className="space-y-6 text-[18px] text-muted-foreground font-light leading-relaxed break-keep">
                <p>{t('about.identity.p1')}</p>
                <p>{t('about.identity.p2')}</p>
              </div>
            </motion.div>
          </div>

          {/* Right Side: Blueprint Visualization */}
          <div className="lg:col-span-7 relative">

            <div className="space-y-16">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="relative pl-0 sm:pl-20"
                >
                  {/* Connection Node */}
                  <div className="absolute left-0 top-0 hidden sm:flex items-center justify-center w-16 h-16 rounded-full border border-[#5874EA]/30 bg-background z-10">
                    <div className="text-[#5874EA]">{icons[index]}</div>
                    <div className="absolute -inset-2 bg-[#5874EA]/5 rounded-full animate-pulse" />
                  </div>
                  
                  {/* Connection Line to next node */}
                  {index !== steps.length - 1 && (
                    <div className="absolute left-[31px] top-16 bottom-[-64px] w-px bg-[#5874EA] hidden sm:block z-0" />
                  )}

                  <div className="p-8 md:p-10 rounded-[16px] border border-[#999eab]/60 bg-[#090b0f]/50 backdrop-blur-[6px] shadow-2xl group relative overflow-hidden transition-all hover:bg-[#14172B] hover:border-[#5874EA]">
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                      <span className="text-8xl font-bold tracking-tighter">0{index + 1}</span>
                    </div>

                    <div className="relative z-10">
                      <div className="inline-flex items-center mb-4 px-2.5 py-1 rounded-sm border border-primary/30 bg-primary/5 text-[11px] font-bold tracking-widest text-primary uppercase">{step.title[language]}</div>
                      <h3 className="text-[30px] font-bold text-foreground mb-4">{step.label[language]}</h3>
                      <p className="text-[18px] md:text-base text-muted-foreground font-light leading-relaxed max-w-md break-keep">
                        {step.desc[language]}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
