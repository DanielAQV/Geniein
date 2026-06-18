"use client";

import { motion } from "framer-motion";
import { Settings, Users, Heart } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { dictionary } from "@/lib/i18n/dictionary";

export function OdaServices() {
  const { t, language } = useLanguage();

  const icons = [
    <Settings key="settings" className="h-6 w-6" />,
    <Users key="users" className="h-6 w-6" />,
    <Heart key="heart" className="h-6 w-6" />,
  ];

  const pillars = dictionary.business.oda.pillars;
  const phases = [
    "Planning & F/S",
    "Procurement",
    "Implementation",
    "Monitoring & Evaluation",
  ];

  return (
    <section
      id="oda"
      className="py-14 md:py-20 lg:py-28 relative overflow-hidden bg-background"
    >
      {/* Blueprint Grid Background */}
      <div className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="oda-grid"
              width="60"
              height="60"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-primary"
              />
              <circle
                cx="0"
                cy="0"
                r="1"
                fill="currentColor"
                className="text-primary"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#oda-grid)" />
        </svg>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-16 items-start">
          {/* Left: ODA Strategy Narrative */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="mb-8 inline-flex items-center gap-2 px-4 py-1 rounded-sm border border-primary/30 bg-primary/5">
                <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary">
                  {t("business.oda.label")}
                </span>
              </div>
              <h2 className="text-3xl sm:text-[38px] lg:text-4xl font-bold text-foreground mb-8 tracking-tighter leading-tight">
                {t("business.oda.title")}
              </h2>
              <p className="text-sm sm:text-[15px] lg:text-lg text-muted-foreground font-light leading-relaxed mb-10 break-keep">
                {t("business.oda.description")}
              </p>

              {/* Lifecycle Diagram — 2-col grid on tablet/desktop, vertical list (with connectors) on mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6 pl-2">
                {phases.map((phase, idx) => (
                  <motion.div
                    key={phase}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + idx * 0.1 }}
                    className="relative flex items-center gap-3 group/phase"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full border border-primary/30 bg-background text-primary text-[10px] font-bold relative z-10 transition-all duration-300 group-hover/phase:border-primary group-hover/phase:scale-110 shadow-sm">
                        {idx + 1}
                      </div>
                      {/* Connector — mobile only (single-column stack) */}
                      {idx < phases.length - 1 && (
                        <div className="sm:hidden absolute top-4 left-1/2 -translate-x-1/2 w-[1px] h-[56px] bg-gradient-to-b from-primary/40 via-primary/30 to-primary/20" />
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground group-hover/phase:text-primary transition-colors uppercase tracking-[0.2em]">
                      {phase}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: The Three Pillars — gap: mobile 16px / tablet 24px / desktop 64px */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-6 lg:space-y-16">
            {pillars.map((pillar, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-0 sm:pl-20"
              >
                {/* Connection Node */}
                <div className="absolute left-0 top-0 hidden sm:flex items-center justify-center w-16 h-16 rounded-full border border-[#5874EA]/30 bg-background z-10">
                  <div className="text-[#5874EA]">{icons[index]}</div>
                  <div className="absolute -inset-2 bg-[#5874EA]/5 rounded-full animate-pulse" />
                </div>

                {/* Connection Line to next node */}
                {index !== pillars.length - 1 && (
                  <div className="absolute left-[31px] top-16 -bottom-6 lg:-bottom-16 w-px bg-[#5874EA] hidden sm:block z-0" />
                )}

                <div className="p-6 sm:p-8 md:p-10 rounded-[16px] border border-[var(--border-card-strong)] bg-[var(--card-glass)] backdrop-blur-[6px] shadow-md group relative overflow-hidden transition-all hover:bg-[var(--card-dark-hover)] hover:border-[#5874EA] hover:shadow-lg">
                  {/* Number Watermark */}
                  <div className="absolute top-3 right-6 text-4xl sm:text-[40px] lg:text-8xl font-bold text-white/[0.04] tracking-tighter pointer-events-none select-none">
                    0{index + 1}
                  </div>
                  <div className="relative z-10">
                    {/* In-card node — mobile only (external node is hidden below sm) */}
                    <div className="sm:hidden flex items-center justify-center w-12 h-12 mb-4 rounded-full border border-[#5874EA]/30 bg-background text-[#5874EA]">
                      {icons[index]}
                    </div>
                    <div className="inline-flex items-center mb-4 px-2.5 py-1 rounded-sm border border-primary/30 bg-primary/5 text-[10px] font-bold tracking-widest text-primary uppercase">
                      {pillar.label[language]}
                    </div>
                    <h3 className="text-xl sm:text-[21px] lg:text-3xl font-bold text-[var(--text-heading)] mb-4 tracking-tight">
                      {pillar.title[language]}
                    </h3>
                    <p className="text-sm lg:text-[18px] text-[var(--text-sub)] font-light leading-relaxed break-keep max-w-lg">
                      {pillar.desc[language]}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
