"use client"

import { motion } from "framer-motion"
import { MapPin, Phone, Mail, Clock, Globe } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"

export function OfficeInfo() {
  const { t } = useLanguage()

  const offices = [
    {
      title: t('about.organization.hubs.0.city'),
      role: t('about.organization.hubs.0.role'),
      address: t('landing.contact.seoul_addr'),
      location: "SEOUL, KOREA"
    },
    {
      title: t('about.organization.hubs.1.city'),
      role: t('about.organization.hubs.1.role'),
      address: t('landing.contact.hanoi_addr'),
      location: "HANOI, VIETNAM"
    }
  ]

  return (
    <div className="h-full flex flex-col gap-6">
      {offices.map((office, index) => (
        <motion.div
          key={office.title}
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className="flex-1 p-8 rounded-3xl border border-border/50 bg-card/50 backdrop-blur-md hover:bg-card/80 hover:border-primary/30 transition-all group shadow-xl flex flex-col justify-center"
        >
          <div className="mb-8">
            <div className="text-[11px] font-bold text-primary tracking-[0.2em] uppercase mb-2">
              {office.role}
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground leading-tight tracking-tight break-keep whitespace-pre-line">
              {office.title}
            </h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="mt-1.5 h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              </div>
              <p className="text-[15px] text-muted-foreground break-keep leading-relaxed font-light">
                {office.address}
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              <div className="h-1 w-1 rounded-full bg-primary/60" />
              {office.location}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
