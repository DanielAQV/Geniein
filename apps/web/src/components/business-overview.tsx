"use client";

import { ArrowUpRight, Target } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/language-context";
import { dictionary } from "@/lib/i18n/dictionary";

export function BusinessOverview() {
  const { t, language } = useLanguage();
  const odaItems = dictionary.landing.business.oda_items;
  const platformItems = dictionary.landing.business.platform_items;

  return (
    <section id="business" className="py-16 md:py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-3 inline-flex items-center gap-2 px-5 py-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md relative overflow-hidden group shadow-lg"
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
              {t("landing.business.label")}
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl tracking-[-0.8px] md:tracking-[-1px] font-bold text-foreground mb-3 leading-[1.2] whitespace-pre-line text-balance break-keep"
          >
            {t("landing.business.title")}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="leading-[24px] md:text-base md:leading-[26px] lg:text-xl lg:leading-relaxed text-muted-foreground max-w-2xl mx-auto font-light whitespace-pre-line text-balance break-keep"
          >
            {t("landing.business.description")}
          </motion.p>
        </div>

        {/* Stacked Service Cards — order matches Figma: ODA first, then AI Platform */}
        <div className="flex flex-col gap-6 md:gap-8">
          {/* ODA Consulting Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <Link
              href="/business?category=oda"
              className="group block relative overflow-hidden rounded-[20px] border border-[var(--border-card)] bg-[var(--card-dark)] p-4 shadow-md transition-all duration-500 hover:border-primary/40 hover:shadow-lg"
            >
              <div className="flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-12 lg:gap-[46px]">
                <>
                  <img
                    src="/images/business/oda-orbit.png"
                    alt=""
                    className="hidden dark:block w-full lg:w-[335px] h-[300px] md:h-[334px] shrink-0 rounded-[20px] object-cover transition-all duration-500 group-hover:scale-[1.02]"
                  />
                  <img
                    src="/images/business/oda-orbit-light.png"
                    alt=""
                    className="block dark:hidden w-full lg:w-[335px] h-[300px] md:h-[334px] shrink-0 rounded-[20px] object-cover transition-all duration-500 group-hover:scale-[1.02]"
                  />
                </>
                <div className="flex flex-1 flex-col gap-8 lg:gap-[46px] self-stretch">
                  <div className="flex flex-col gap-3">
                    <h3 className="pt-2 text-xl font-bold leading-7 tracking-[-0.5px] text-[var(--text-heading)]">
                      {t("landing.business.oda_title")}
                    </h3>
                    <p className="text-sm font-medium uppercase text-[var(--text-sub)] break-keep">
                      {t("landing.business.oda_desc")}
                    </p>
                    <ul className="list-disc pl-5 text-sm font-medium text-[var(--text-sub)] marker:text-[var(--text-sub)]">
                      {odaItems.map((item, idx) => (
                        <li key={idx} className="leading-[25px]">
                          {item[language]}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <span className="inline-flex px-6 py-2 w-full md:w-fit self-stretch md:self-start items-center justify-center md:justify-start gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white pl-6 pr-5 text-base font-bold text-[#12161f] shadow-sm transition-all group-hover:gap-3 hover:bg-slate-50">
                    {t("common.more")}
                    <ArrowUpRight className="size-[22px]" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* AI Platform Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          >
            <Link
              href="/business?category=platform"
              className="group block relative overflow-hidden rounded-[20px] border border-[var(--border-card)] bg-[var(--card-dark)] p-4 shadow-md transition-all duration-500 hover:border-primary/40 hover:shadow-lg"
            >
              <div className="flex flex-col lg:flex-row items-center lg:items-stretch justify-center gap-8 lg:gap-[46px]">
                <>
                  <img
                    src="/images/business/ai-cube.png"
                    alt=""
                    className="hidden dark:block w-full lg:w-[335px] h-[300px] md:h-[334px] shrink-0 rounded-[20px] object-cover transition-all duration-500 group-hover:scale-[1.02]"
                  />
                  <img
                    src="/images/business/ai-cube-light.png"
                    alt=""
                    className="block dark:hidden w-full lg:w-[335px] h-[300px] md:h-[334px] shrink-0 rounded-[20px] object-cover transition-all duration-500 group-hover:scale-[1.02]"
                  />
                </>
                <div className="flex flex-1 flex-col gap-8 lg:gap-[46px] self-stretch">
                  <div className="flex flex-col gap-3">
                    <h3 className="pt-2 text-xl font-bold leading-7 tracking-[-0.5px] text-[var(--text-heading)]">
                      {t("landing.business.platform_title")}
                    </h3>
                    <p className="text-sm font-medium leading-[25px] uppercase text-[var(--text-sub)] break-keep">
                      {t("landing.business.platform_desc")}
                    </p>
                    <ul className="list-disc pl-5 text-sm font-medium text-[var(--text-sub)] marker:text-[var(--text-sub)]">
                      {platformItems.map((item, idx) => (
                        <li key={idx} className="leading-[25px]">
                          {item[language]}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <span className="inline-flex px-6 py-2 w-full md:w-fit self-stretch md:self-start items-center justify-center md:justify-start gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white pl-6 pr-5 text-base font-bold text-[#12161f] shadow-sm transition-all group-hover:gap-3 hover:bg-slate-50">
                    {t("common.more")}
                    <ArrowUpRight className="size-[22px]" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
