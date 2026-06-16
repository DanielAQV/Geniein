"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import Link from "next/link";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-card dark:bg-[#07080c] text-muted-foreground border-t border-border/50 px-5 pt-10 pb-8 sm:px-6 md:px-8 md:pt-12 md:pb-10 lg:px-8 lg:pt-16 lg:pb-16 transition-colors duration-300">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 md:gap-12">
        {/* Company info + navigation */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          {/* Company Info */}
          <div className="lg:max-w-md">
            <Link
              href="/"
              className="group mb-4 flex items-center gap-2 font-bold text-foreground md:mb-6"
            >
              <div className="relative h-8 w-8 overflow-hidden rounded-lg transition-transform group-hover:scale-110">
                <img
                  src="/logo.png"
                  alt="geniein logo"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="text-lg font-bold tracking-tight md:text-xl">
                Geniein
              </span>
            </Link>
            <div className="space-y-1 text-[13px] font-light leading-relaxed tracking-wide text-muted-foreground/80 md:text-sm">
              <p>{t("landing.footer.reg_no")}</p>
              <p>{t("landing.footer.ceo")}</p>
              <p>{t("landing.footer.address")}</p>
            </div>
          </div>

          {/* Navigation: 2-col grid on mobile, 4 equal columns on tablet, inline on desktop */}
          <nav className="grid grid-cols-2 gap-x-6 gap-y-8 text-sm md:flex md:w-full md:gap-x-8 lg:w-auto lg:gap-x-12">
            <div className="md:flex-1 lg:flex-none">
              <Link
                href="/about"
                className="font-semibold text-foreground transition-colors hover:text-foreground/70"
              >
                {t("common.about")}
              </Link>
            </div>

            <div className="flex flex-col gap-3 md:flex-1 lg:flex-none">
              <span className="font-semibold text-foreground">
                {t("common.business")}
              </span>
              <Link
                href="/business?category=oda"
                scroll={false}
                className="font-light text-[#f7f7f7] transition-colors hover:text-white"
              >
                {t("common.oda")}
              </Link>
              <Link
                href="/business?category=platform"
                scroll={false}
                className="font-light text-[#f7f7f7] transition-colors hover:text-white"
              >
                {t("common.platform")}
              </Link>
            </div>

            <div className="flex flex-col gap-3 md:flex-1 lg:flex-none">
              <span className="font-semibold text-foreground">
                {t("common.insights")}
              </span>
              <Link
                href="/insights?category=oda"
                scroll={false}
                className="font-light text-[#f7f7f7] transition-colors hover:text-white"
              >
                {t("common.insights_oda")}
              </Link>
              <Link
                href="/insights?category=it"
                scroll={false}
                className="font-light text-[#f7f7f7] transition-colors hover:text-white"
              >
                {t("common.insights_it")}
              </Link>
            </div>

            <div className="md:flex-1 lg:flex-none">
              <Link
                href="/contact"
                className="font-semibold text-foreground transition-colors hover:text-foreground/70"
              >
                {t("common.contact")}
              </Link>
            </div>
          </nav>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/50 pt-6 text-center text-sm text-muted-foreground md:border-t-0 md:pt-0">
          <p>{t("common.copyright")}</p>
        </div>
      </div>
    </footer>
  );
}
