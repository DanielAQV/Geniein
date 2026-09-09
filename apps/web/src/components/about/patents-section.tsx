"use client"

import { motion } from "framer-motion"
import { ShieldCheck } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { dictionary } from "@/lib/i18n/dictionary"

/**
 * 특허 현황. 조직 섹션과 같은 카드 언어(--card-dark / --border-card)를 쓰고,
 * 배경만 한 단계 낮춰(bg-background/50) 프로젝트 섹션과 번갈아 보이게 했다.
 */
export function PatentsSection() {
  const { t, language } = useLanguage()
  const patents = dictionary.about.patents.items

  return (
    <section
      id="patents"
      className="py-14 md:py-20 lg:py-28 bg-background/50 border-y border-border/50 relative overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 md:mb-12 lg:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-6 inline-flex items-center gap-2 px-4 py-1 rounded-sm border border-primary/30 bg-primary/5"
          >
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary">
              {t('about.patents.label')}
            </span>
          </motion.div>
          <h2 className="text-[28px] tracking-[-0.6px] md:text-4xl lg:text-5xl lg:tracking-tighter font-bold text-foreground mb-3 md:mb-6">
            {t('about.patents.title')}
          </h2>
          <p className="text-sm leading-[23px] md:text-base lg:text-[18px] text-muted-foreground max-w-2xl mx-auto font-light lg:leading-relaxed break-keep whitespace-pre-line">
            {t('about.patents.desc')}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {patents.map((patent, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="flex flex-col gap-5 rounded-[16px] border border-[var(--border-card)] bg-[var(--card-dark)] p-6 shadow-md transition-all duration-500 hover:shadow-lg hover:border-primary/40 lg:p-8"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="rounded-xl border border-[var(--border-card-strong)] bg-[var(--card-glass)] p-3 text-[#5874ea] shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center rounded-full border border-[var(--border-card-strong)] bg-[#5874ea] px-[17px] py-[7px] text-xs font-medium text-white">
                  {t('about.patents.status')}
                </span>
              </div>

              <h3 className="text-base md:text-lg font-bold leading-snug tracking-[-0.3px] text-[var(--text-heading)] break-keep">
                {patent.title[language]}
              </h3>

              <p className="text-sm font-light leading-relaxed text-[var(--text-sub)] break-keep">
                {patent.desc[language]}
              </p>

              <dl className="mt-auto flex flex-col gap-2 border-t border-border/30 pt-5 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-bold uppercase tracking-[0.15em] text-[var(--text-heading)]/50">
                    {t('about.patents.no_label')}
                  </dt>
                  <dd className="font-medium text-[var(--text-heading)] tabular-nums">{patent.no}</dd>
                </div>
                {/* 출원일 미확인 건은 행 자체를 그리지 않는다 — 빈 값을 노출하느니 없는 편이 낫다 */}
                {patent.date && (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="font-bold uppercase tracking-[0.15em] text-[var(--text-heading)]/50">
                      {t('about.patents.date_label')}
                    </dt>
                    <dd className="font-medium text-[var(--text-heading)] tabular-nums">{patent.date}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-bold uppercase tracking-[0.15em] text-[var(--text-heading)]/50">
                    IPO
                  </dt>
                  <dd className="font-medium text-[var(--text-heading)]">{t('about.patents.office')}</dd>
                </div>
              </dl>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
