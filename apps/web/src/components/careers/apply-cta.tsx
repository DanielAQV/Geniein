"use client"

import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"

export function ApplyCta({ onApply }: { onApply: () => void }) {
  const { t } = useLanguage()

  return (
    <section className="py-14 md:py-20 lg:py-28 bg-background/50 border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col items-center gap-6 rounded-[20px] border border-[var(--border-card)] bg-[var(--card-dark)] px-6 py-12 text-center shadow-md md:px-12 md:py-16"
        >
          <span className="inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/5 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            {t("careers.cta.label")}
          </span>
          <h2 className="text-[26px] tracking-[-0.6px] md:text-4xl lg:tracking-tighter font-bold text-[var(--text-heading)] break-keep">
            {t("careers.cta.title")}
          </h2>
          <p className="max-w-2xl text-sm leading-[23px] md:text-base lg:text-[18px] font-light lg:leading-relaxed text-[var(--text-sub)] break-keep whitespace-pre-line">
            {t("careers.cta.desc")}
          </p>
          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center gap-2 rounded-full bg-[#5874ea] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5874ea]/90"
          >
            {t("careers.cta.button")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </section>
  )
}
