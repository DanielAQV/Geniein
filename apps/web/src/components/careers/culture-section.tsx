"use client"

import { motion } from "framer-motion"
import { Compass, FileText, Globe } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { dictionary } from "@/lib/i18n/dictionary"

const ICONS = [
  <Compass key="compass" className="h-6 w-6 text-[#5874ea]" />,
  <FileText key="file" className="h-6 w-6 text-[#5874ea]" />,
  <Globe key="globe" className="h-6 w-6 text-[#5874ea]" />,
]

export function CultureSection() {
  const { t, language } = useLanguage()
  const items = dictionary.careers.culture.items

  return (
    <section id="culture" className="py-14 md:py-20 lg:py-28 bg-background/50 border-b border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-8 md:mb-12 lg:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1 rounded-sm border border-primary/30 bg-primary/5"
          >
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary">
              {t("careers.culture.label")}
            </span>
          </motion.div>
          <h2 className="mt-4 md:mt-6 text-[28px] tracking-[-0.6px] md:text-4xl lg:text-5xl lg:tracking-tighter font-bold text-foreground leading-tight">
            {t("careers.culture.title")}
          </h2>
          <p className="mt-4 md:mt-6 text-sm leading-[23px] md:text-base lg:text-[18px] text-muted-foreground font-light lg:leading-relaxed break-keep whitespace-pre-line">
            {t("careers.culture.desc")}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="flex flex-col gap-5 rounded-[20px] border border-[var(--border-card)] bg-[var(--card-dark)] p-6 md:p-8 shadow-md transition-all duration-500 hover:border-primary/40 hover:shadow-lg"
            >
              <div className="w-fit rounded-2xl border border-[var(--border-card-strong)] bg-[var(--card-glass)] p-4 shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)]">
                {ICONS[index] ?? ICONS[0]}
              </div>
              <h3 className="text-lg md:text-xl font-bold tracking-[-0.5px] leading-7 text-[var(--text-heading)]">
                {item.title[language]}
              </h3>
              <p className="text-sm md:text-base font-light leading-relaxed text-[var(--text-sub)] break-keep">
                {item.desc[language]}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
