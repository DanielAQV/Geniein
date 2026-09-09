"use client"

import { motion } from "framer-motion"
import { MapPin } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { dictionary } from "@/lib/i18n/dictionary"
import { FallbackPanel } from "@/components/about/projects-showcase"

export function OrganizationSection() {
  const { t, language } = useLanguage()
  const hubs = dictionary.about.organization.hubs

  return (
    <section id="organization" className="py-14 md:py-20 lg:py-28 bg-background/50 border-y border-border/50 relative overflow-hidden">
      {/* Decorative Network Lines */}
      <div className="absolute inset-0 -z-10 opacity-10 pointer-events-none">
        <svg className="h-full w-full" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
          <circle cx="300" cy="400" r="2" fill="var(--primary)" />
          <circle cx="700" cy="600" r="2" fill="var(--primary)" />
          <path d="M 300 400 Q 500 300 700 600" fill="none" stroke="var(--primary)" strokeWidth="1" strokeDasharray="5,5" />
        </svg>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 md:mb-12 lg:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-6 inline-flex items-center gap-2 px-4 py-1 rounded-sm border border-primary/30 bg-primary/5"
          >

            <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary">
              {t('about.organization.label')}
            </span>
          </motion.div>
          <h2 className="text-[28px] tracking-[-0.6px] md:text-4xl lg:text-5xl lg:tracking-tighter font-bold text-foreground mb-3 md:mb-6">
            {t('about.organization.title')}
          </h2>
          <p className="text-sm leading-[23px] md:text-base lg:text-[18px] text-muted-foreground max-w-2xl mx-auto font-light lg:leading-relaxed break-keep whitespace-pre-line">
            {t('about.organization.desc')}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {hubs.map((hub, index) => {
            const cityParts = hub.city[language].split("\n")
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative flex flex-col overflow-hidden rounded-[16px] border border-[var(--border-card)] bg-[var(--card-dark)] shadow-md hover:shadow-lg hover:border-primary/40 transition-all duration-500 group"
              >
                {/* Photo with role badge */}
                <div className="relative h-40 md:h-[259px] w-full overflow-hidden">
                  {hub.image ? (
                    <img
                      src={hub.image}
                      alt={cityParts[0]}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <FallbackPanel />
                  )}
                  <span className="absolute left-4 top-4 inline-flex items-center rounded-full border border-[var(--border-card-strong)] bg-[#5874ea] px-[17px] py-[7px] text-xs font-medium text-white">
                    {hub.role[language]}
                  </span>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col gap-6 px-4 py-8">
                  <div className="flex items-start justify-between gap-3 pt-2">
                    <h3 className="min-w-0 text-lg md:text-xl font-bold tracking-[-0.5px] leading-7 text-[var(--text-heading)] whitespace-nowrap">{cityParts[0]}</h3>
                    {cityParts[1] && (
                      <span className="shrink-0 text-right text-base md:text-lg lg:text-xl font-bold tracking-[-0.5px] leading-7 text-[var(--text-heading)] whitespace-nowrap">{cityParts[1]}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {hub.specialization.map((spec, sIdx) => (
                      <span key={sIdx} className="rounded-full border border-[var(--border-card-strong)] bg-[var(--card-glass)] px-[17px] py-[7px] text-xs font-medium text-[var(--text-heading)]">
                        {spec[language]}
                      </span>
                    ))}
                  </div>

                  {/* 주소 미정인 거점은 줄 자체를 그리지 않는다 */}
                  {hub.address[language] && (
                    <div className="border-t border-border/30 pt-8">
                      <div className="flex items-start gap-2 text-[var(--text-heading)]">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="text-sm font-light break-keep">{hub.address[language]}</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
