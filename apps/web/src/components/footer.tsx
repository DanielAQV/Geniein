"use client"

import { useLanguage } from "@/lib/i18n/language-context"
import Link from "next/link"

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-card text-muted-foreground py-16 border-t border-border/50 transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12 mb-12">
          {/* Company Info */}
          <div className="max-w-md">
            <Link href="/" className="flex items-center gap-2 font-bold mb-6 text-foreground group">
              <div className="relative h-8 w-8 overflow-hidden rounded-lg transition-transform group-hover:scale-110">
                <img
                  src="/logo.png"
                  alt="geniein logo"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Geniein
              </span>
            </Link>
            <div className="space-y-1 text-sm text-muted-foreground/80 font-light tracking-wide leading-relaxed">
              <p>{t('landing.footer.reg_no')}</p>
              <p>{t('landing.footer.ceo')}</p>
              <p>{t('landing.footer.address')}</p>
            </div>
          </div>

          {/* Horizontal Menu with Vertical Sub-items */}
          <nav className="flex flex-wrap gap-x-12 gap-y-8 text-base font-medium">
            <Link href="/about" className="hover:text-foreground transition-colors">
              {t('common.about')}
            </Link>
            <div className="flex flex-col gap-3">
              <span className="text-foreground">{t('common.business')}</span>
              <Link href="/business?category=oda" scroll={false} className="hover:text-foreground transition-colors text-muted-foreground/60 font-normal">
                {t('common.oda')}
              </Link>
              <Link href="/business?category=platform" scroll={false} className="hover:text-foreground transition-colors text-muted-foreground/60 font-normal">
                {t('common.platform')}
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-foreground">{t('common.insights')}</span>
              <Link href="/insights?category=oda" scroll={false} className="hover:text-foreground transition-colors text-muted-foreground/60 font-normal">
                {t('common.insights_oda')}
              </Link>
              <Link href="/insights?category=it" scroll={false} className="hover:text-foreground transition-colors text-muted-foreground/60 font-normal">
                {t('common.insights_it')}
              </Link>
            </div>
            <Link href="/contact" className="hover:text-foreground transition-colors">
              {t('common.contact')}
            </Link>
          </nav>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border/50 pt-8 flex justify-between items-center text-sm text-muted-foreground">
          <p>{t('common.copyright')}</p>
        </div>
      </div>
    </footer>
  )
}
