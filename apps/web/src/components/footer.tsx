"use client"

import { useLanguage } from "@/lib/i18n/language-context"
import Link from "next/link"

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-[#080a10] text-zinc-300 py-16 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-12 mb-12">
          {/* Company Info */}
          <div className="max-w-md">
            <Link href="/" className="flex items-center gap-2 font-bold mb-6 text-white group">
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
            <div className="space-y-3 text-base text-zinc-200 font-light tracking-wide">
              <p>사업자등록번호: 645-81-03508 | 대표: 변범준</p>
              <p>주소: 경기도 용인시 수지구 용구대로2790번길 7, 3층 302-179호</p>
            </div>
          </div>

          {/* Horizontal Menu with Vertical Sub-items */}
          <nav className="flex flex-wrap gap-x-12 gap-y-8 text-base font-medium">
            <Link href="/about" className="hover:text-white transition-colors">
              {t('common.about')}
            </Link>
            <div className="flex flex-col gap-3">
              <span className="text-white">{t('common.business')}</span>
              <Link href="/business?category=oda" scroll={false} className="hover:text-white transition-colors text-zinc-500 font-normal">
                {t('common.oda')}
              </Link>
              <Link href="/business?category=platform" scroll={false} className="hover:text-white transition-colors text-zinc-500 font-normal">
                {t('common.platform')}
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-white">{t('common.insights')}</span>
              <Link href="/insights?category=oda" scroll={false} className="hover:text-white transition-colors text-zinc-500 font-normal">
                {t('common.insights_oda')}
              </Link>
              <Link href="/insights?category=it" scroll={false} className="hover:text-white transition-colors text-zinc-500 font-normal">
                {t('common.insights_it')}
              </Link>
            </div>
            <Link href="/contact" className="hover:text-white transition-colors">
              {t('common.contact')}
            </Link>
          </nav>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/5 pt-8 flex justify-between items-center text-sm text-zinc-500">
          <p>{t('common.copyright')}</p>
        </div>
      </div>
    </footer>
  )
}
