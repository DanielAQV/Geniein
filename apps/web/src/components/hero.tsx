"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/language-context";

export function Hero() {
  const { t } = useLanguage();

  return (
    <section
      id="hero"
      className="relative isolate min-h-[470px] md:min-h-[520px] lg:min-h-screen flex items-center justify-start md:justify-center overflow-hidden pt-28 pb-16 md:pt-40 md:pb-32"
    >
      <div className="absolute inset-0 -z-10 bg-[var(--page-bg)] transition-colors duration-300">
        {/* Figma wave background — breakpoint-specific assets, each framed for its width.
            Width-anchored (w-full) so the side wave arcs always hit the screen edges.
            Mobile/tablet pin the wave to the top (per Figma); desktop centers the band. */}
        <picture>
          <source media="(min-width: 1024px)" srcSet="/main-hero.png" />
          <source media="(min-width: 768px)" srcSet="/main-hero-tablet.png" />
          <img
            src="/main-hero-mobile.png"
            alt=""
            aria-hidden
            className="pointer-events-none select-none absolute left-0 right-0 top-[60px] w-full h-auto max-w-none lg:top-1/2 lg:-translate-y-1/2 transition-opacity duration-300"
            style={{ opacity: "var(--hero-img-opacity)" }}
          />
        </picture>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="text-center max-w-4xl mx-auto flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full"
          >
            {/* Headline */}
            <h1 className="text-4xl leading-[1.1] tracking-[-1px] md:text-[60px] md:tracking-[-1.5px] lg:text-[96px] lg:tracking-tight font-bold text-foreground mb-8">
              <span className="block">{t("hero.title_main")}</span>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-400 to-primary inline-block pb-2">
                {t("hero.title_accent")}
              </span>
            </h1>

            {/* Sub-headline */}
            <p className="text-muted-foreground max-w-4xl mx-auto font-light tracking-wide break-keep mb-10 text-[15px] leading-[24px] md:text-[17px] md:leading-[27px] lg:text-lg lg:leading-relaxed whitespace-pre-line text-balance">
              {t("hero.description")}
            </p>

            {/* CTAs */}
            <div className="flex flex-row items-center justify-center gap-3 sm:gap-4">
              <Button
                asChild
                size="pill"
                className="flex-1 sm:flex-none min-w-0 shadow-lg shadow-primary/25"
              >
                <Link href="/about">
                  {t("hero.btn_projects")}
                  <ArrowRight className="size-4 sm:size-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="glass"
                size="pill"
                className="flex-1 sm:flex-none min-w-0 font-bold"
              >
                <Link href="/contact">{t("hero.btn_contact")}</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
