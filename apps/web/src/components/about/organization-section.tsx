"use client"

import { motion } from "framer-motion"
import { MapPin, Laptop, Briefcase } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { dictionary } from "@/lib/i18n/dictionary"

export function OrganizationSection() {
  const { t, language } = useLanguage()
  const hubData = dictionary.about.organization.hubs

  const hubs = [
    {
      ...hubData[0],
      icon: <Briefcase className="h-6 w-6" />,
      address: hubData[0].address[language]
    },
    {
      ...hubData[1],
      icon: <Laptop className="h-6 w-6" />,
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
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6 tracking-tighter">
            {t('about.organization.title')}
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed break-keep whitespace-pre-line">
            {t('about.organization.desc')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {hubs.map((hub, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="relative p-10 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-md hover:bg-card/80 hover:border-primary/30 transition-all group shadow-2xl"
            >
              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="text-xs font-bold text-primary mb-2 tracking-widest uppercase">{hub.role[language]}</div>
                  <h3 className="text-2xl font-bold text-foreground whitespace-pre-line">{hub.city[language]}</h3>
                </div>
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-inner">
                  {hub.icon}
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-xs font-bold text-foreground/50 tracking-widest uppercase">{t('about.organization.expertise_label')}</div>
                <div className="flex flex-wrap gap-2">
                  {hub.specialization.map((spec, sIdx) => (
                    <span key={sIdx} className="px-4 py-1.5 text-xs font-medium border border-border/50 rounded-full bg-card/30 text-muted-foreground group-hover:text-foreground transition-colors">
                      {spec[language]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors cursor-default">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-light">{hub.address}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
