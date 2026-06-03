"use client"

import { motion } from "framer-motion"
import { MapPin } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { dictionary } from "@/lib/i18n/dictionary"

export function OrganizationSection() {
  const { t, language } = useLanguage()
  const hubData = dictionary.about.organization.hubs

  const hubs = [
    {
      ...hubData[0],
      image: "/images/about/org-korea.png",
      address: hubData[0].address[language]
    },
    {
      ...hubData[1],
      image: "/images/about/org-hanoi.png",
      address: hubData[1].address[language]
    }
  ]

  return (
    <section id="organization" className="py-28 bg-background/50 border-y border-border/50 relative overflow-hidden">
      {/* Decorative Network Lines */}
      <div className="absolute inset-0 -z-10 opacity-10 pointer-events-none">
        <svg className="h-full w-full" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
          <circle cx="300" cy="400" r="2" fill="var(--primary)" />
          <circle cx="700" cy="600" r="2" fill="var(--primary)" />
          <path d="M 300 400 Q 500 300 700 600" fill="none" stroke="var(--primary)" strokeWidth="1" strokeDasharray="5,5" />
        </svg>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
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
          <h2 className="text-5xl font-bold text-foreground mb-6 tracking-tighter">
            {t('about.organization.title')}
          </h2>
          <p className="text-[18px] text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed break-keep whitespace-pre-line">
            {t('about.organization.desc')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {hubs.map((hub, index) => {
            const cityParts = hub.city[language].split("\n")
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="relative overflow-hidden rounded-[16px] border border-[#999eab]/30 bg-[#14172b] shadow-[inset_0_0_0_2px_rgba(190,190,190,0.1)] hover:border-primary/40 transition-all duration-500 group"
              >
                {/* Photo with role badge */}
                <div className="relative h-[259px] w-full overflow-hidden">
                  <img
                    src={hub.image}
                    alt={cityParts[0]}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <span className="absolute left-4 top-4 inline-flex items-center rounded-full border border-[#999eab]/60 bg-[#5874ea] px-[17px] py-[7px] text-xs font-medium text-[#f7f7f7]">
                    {hub.role[language]}
                  </span>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-6 px-4 py-8">
                  <div className="flex items-start justify-between gap-4 pt-2">
                    <h3 className="flex-1 text-xl font-bold tracking-[-0.5px] leading-7 text-[#f6f8ff]">{cityParts[0]}</h3>
                    {cityParts[1] && (
                      <span className="flex-1 text-right text-xl font-bold tracking-[-0.5px] leading-7 text-[#f6f8ff]">{cityParts[1]}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {hub.specialization.map((spec, sIdx) => (
                      <span key={sIdx} className="rounded-full border border-[#999eab]/60 bg-[#090b0f]/30 px-[17px] py-[7px] text-xs font-medium text-[#f7f7f7]">
                        {spec[language]}
                      </span>
                    ))}
                  </div>

                  <div className="border-t border-[#f6f6f8]/10 pt-8">
                    <div className="flex items-center gap-2 text-[#f7f7f7]">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="text-sm font-light">{hub.address}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
