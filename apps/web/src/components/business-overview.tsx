"use client"

import { ArrowUpRight, Target } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/language-context"
import { dictionary } from "@/lib/i18n/dictionary"

export function BusinessOverview() {
  const { t, language } = useLanguage()
  const odaItems = dictionary.landing.business.oda_items
  const platformItems = dictionary.landing.business.platform_items

  return (
    <section id="business" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-6 inline-flex items-center gap-2 px-5 py-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md relative overflow-hidden group shadow-lg"
          >
            {/* Shimmer Effect */}
            <motion.div
              animate={{
                left: ["-100%", "200%"],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-primary/5 to-transparent -skew-x-12"
            />
            <Target className="h-4 w-4 text-primary relative z-10" />
            <span className="text-sm font-bold tracking-widest uppercase text-primary relative z-10">
              {t('landing.business.label')}
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl font-bold text-foreground mb-6 tracking-tight leading-[1.2] whitespace-pre-line text-balance break-keep"
          >
            {t('landing.business.title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light whitespace-pre-line text-balance break-keep"
          >
            {t('landing.business.description')}
          </motion.p>
        </div>

        {/* Stacked Service Cards */}
        <div className="flex flex-col gap-8">
          {/* AI Platform Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Link
              href="/business?category=platform"
              className="group block relative overflow-hidden rounded-[20px] border border-[#999eab]/30 bg-[#14172b] p-8 shadow-[inset_0_0_0_2px_rgba(190,190,190,0.1)] transition-all duration-500 hover:border-primary/40 hover:shadow-[inset_0_0_0_2px_rgba(190,190,190,0.15),0_20px_50px_-12px_rgba(0,0,0,0.5)]"
            >
              <div className="flex flex-col md:flex-row items-center md:items-stretch justify-center gap-8 lg:gap-[46px]">
                <img
                  src="/images/business/ai-cube.png"
                  alt=""
                  className="w-full max-w-[335px] md:w-[335px] h-[300px] md:h-[334px] shrink-0 rounded-[20px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="flex flex-1 flex-col gap-8 lg:gap-[46px] self-stretch">
                  <div className="flex flex-col gap-3">
                    <h3 className="pt-2 text-xl font-bold leading-7 tracking-[-0.5px] text-[#f6f8ff]">
                      {t('landing.business.platform_title')}
                    </h3>
                    <p className="text-sm font-medium leading-[25px] tracking-[1.4px] uppercase text-[#999eab] break-keep">
                      {t('landing.business.platform_desc')}
                    </p>
                    <ul className="list-disc pl-5 text-sm font-medium text-[#999eab] marker:text-[#999eab]">
                      {platformItems.map((item, idx) => (
                        <li key={idx} className="leading-[25px]">{item[language]}</li>
                      ))}
                    </ul>
                  </div>
                  <span className="inline-flex h-14 w-fit items-center gap-2 self-start rounded-full border border-white/10 bg-white pl-6 pr-5 text-base font-bold text-[#12161f] backdrop-blur-[6px] transition-all group-hover:gap-3">
                    {t('common.more')}
                    <ArrowUpRight className="h-5 w-5" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* ODA Consulting Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <Link
              href="/business?category=oda"
              className="group block relative overflow-hidden rounded-[20px] border border-[#999eab]/30 bg-[#14172b] p-8 shadow-[inset_0_0_0_2px_rgba(190,190,190,0.1)] transition-all duration-500 hover:border-primary/40 hover:shadow-[inset_0_0_0_2px_rgba(190,190,190,0.15),0_20px_50px_-12px_rgba(0,0,0,0.5)]"
            >
              <div className="flex flex-col md:flex-row items-center md:items-stretch justify-center gap-8 lg:gap-[46px]">
                <img
                  src="/images/business/oda-orbit.png"
                  alt=""
                  className="w-full max-w-[335px] md:w-[335px] h-[300px] md:h-[334px] shrink-0 rounded-[20px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="flex flex-1 flex-col gap-8 lg:gap-[46px] self-stretch">
                  <div className="flex flex-col gap-3">
                    <h3 className="pt-2 text-xl font-bold leading-7 tracking-[-0.5px] text-[#f6f8ff]">
                      {t('landing.business.oda_title')}
                    </h3>
                    <p className="text-sm font-medium leading-[25px] tracking-[1.4px] uppercase text-[#999eab] break-keep">
                      {t('landing.business.oda_desc')}
                    </p>
                    <ul className="list-disc pl-5 text-sm font-medium text-[#999eab] marker:text-[#999eab]">
                      {odaItems.map((item, idx) => (
                        <li key={idx} className="leading-[25px]">{item[language]}</li>
                      ))}
                    </ul>
                  </div>
                  <span className="inline-flex h-14 w-fit items-center gap-2 self-start rounded-full border border-white/10 bg-white pl-6 pr-5 text-base font-bold text-[#12161f] backdrop-blur-[6px] transition-all group-hover:gap-3">
                    {t('common.more')}
                    <ArrowUpRight className="h-5 w-5" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
