"use client"

import { useState } from "react"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n/language-context"
import { 
  ChevronDown, 
  Globe, 
  Menu, 
  X 
} from "lucide-react"
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [businessOpen, setBusinessOpen] = useState(false)
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const { t, language, setLanguage } = useLanguage()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 cursor-pointer group">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg transition-transform group-hover:scale-110">
              <img
                src="/logo.png"
                alt="geniein logo"
                className="h-full w-full object-cover"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Geniein
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-16">
            <Link
              href="/about"
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer group relative py-2"
            >
              <span>{t('common.about')}</span>
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary origin-center scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
            </Link>

            <DropdownMenu open={businessOpen} onOpenChange={setBusinessOpen} modal={false}>
              <div 
                className="relative"
                onMouseEnter={() => setBusinessOpen(true)}
                onMouseLeave={() => setBusinessOpen(false)}
              >
                <DropdownMenuTrigger asChild>
                  <Link
                    href="/business"
                    className="flex items-center gap-1 text-base font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none group relative py-2"
                  >
                    <span className={businessOpen ? "text-foreground" : ""}>{t('common.business')}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${businessOpen ? 'rotate-180' : ''}`} />
                    <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary origin-center transition-transform duration-300 ${businessOpen ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                  </Link>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="center" 
                  className="min-w-[220px] w-auto bg-card/95 backdrop-blur-lg border border-white/10"
                  onMouseEnter={() => setBusinessOpen(true)}
                  onMouseLeave={() => setBusinessOpen(false)}
                >
                  <DropdownMenuItem asChild className="focus:bg-transparent p-0">
                    <Link 
                      href="/business#oda" 
                      scroll={false}
                      className="cursor-pointer w-full text-base font-medium py-3 px-5 hover:bg-primary/5 transition-all group/item text-muted-foreground whitespace-nowrap"
                    >
                      <span className="relative group-hover/item:text-foreground transition-colors">
                        {t('common.oda')}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="focus:bg-transparent p-0">
                    <Link 
                      href="/business#platforms" 
                      scroll={false}
                      className="cursor-pointer w-full text-base font-medium py-3 px-5 hover:bg-primary/5 transition-all group/item text-muted-foreground whitespace-nowrap"
                    >
                      <span className="relative group-hover/item:text-foreground transition-colors">
                        {t('common.platform')}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </div>
            </DropdownMenu>

            <DropdownMenu open={insightsOpen} onOpenChange={setInsightsOpen} modal={false}>
              <div 
                className="relative"
                onMouseEnter={() => setInsightsOpen(true)}
                onMouseLeave={() => setInsightsOpen(false)}
              >
                <DropdownMenuTrigger asChild>
                  <Link
                    href="/insights"
                    className="flex items-center gap-1 text-base font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none group relative py-2"
                  >
                    <span className={insightsOpen ? "text-foreground" : ""}>{t('common.insights')}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${insightsOpen ? 'rotate-180' : ''}`} />
                    <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary origin-center transition-transform duration-300 ${insightsOpen ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                  </Link>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="center" 
                  className="min-w-[220px] w-auto bg-card/95 backdrop-blur-lg border border-white/10"
                  onMouseEnter={() => setInsightsOpen(true)}
                  onMouseLeave={() => setInsightsOpen(false)}
                >
                  <DropdownMenuItem asChild className="focus:bg-transparent p-0">
                    <Link 
                      href="/insights#oda" 
                      scroll={false}
                      className="cursor-pointer w-full text-base font-medium py-3 px-5 hover:bg-primary/5 transition-all group/item text-muted-foreground whitespace-nowrap"
                    >
                      <span className="relative group-hover/item:text-foreground transition-colors">
                        {t('common.insights_oda')}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="focus:bg-transparent p-0">
                    <Link 
                      href="/insights#it" 
                      scroll={false}
                      className="cursor-pointer w-full text-base font-medium py-3 px-5 hover:bg-primary/5 transition-all group/item text-muted-foreground whitespace-nowrap"
                    >
                      <span className="relative group-hover/item:text-foreground transition-colors">
                        {t('common.insights_it')}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </div>
            </DropdownMenu>

            <Link
              href="/contact"
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer group relative py-2"
            >
              <span>{t('common.contact')}</span>
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary origin-center scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="hidden md:flex md:items-center md:gap-4">
            <DropdownMenu open={langOpen} onOpenChange={setLangOpen} modal={false}>
              <div 
                className="relative"
                onMouseEnter={() => setLangOpen(true)}
                onMouseLeave={() => setLangOpen(false)}
              >
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 text-base font-medium text-muted-foreground hover:text-foreground transition-colors uppercase cursor-pointer outline-none group relative py-2">
                    <Globe className="h-4 w-4" />
                    <span className={langOpen ? "text-foreground" : ""}>{language}</span>
                    <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`} />
                    <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary origin-center transition-transform duration-300 ${langOpen ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="bg-card/95 backdrop-blur-xl border border-white/10 min-w-[120px] p-1"
                  onMouseEnter={() => setLangOpen(true)}
                  onMouseLeave={() => setLangOpen(false)}
                >
                  <DropdownMenuItem 
                    onClick={() => setLanguage("kr")}
                    className="cursor-pointer text-sm font-medium py-2.5 px-4 text-muted-foreground hover:text-foreground focus:bg-primary/5 focus:text-primary transition-colors rounded-lg flex items-center gap-3"
                  >
                    <img src="https://flagcdn.com/w40/kr.png" alt="KR" className="w-7 h-5 object-cover rounded-sm shadow-sm border border-white/5" />
                    KR
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLanguage("en")}
                    className="cursor-pointer text-sm font-medium py-2.5 px-4 text-muted-foreground hover:text-foreground focus:bg-primary/5 focus:text-primary transition-colors rounded-lg flex items-center gap-3"
                  >
                    <img src="https://flagcdn.com/w40/us.png" alt="EN" className="w-7 h-5 object-cover rounded-sm shadow-sm border border-white/5" />
                    EN
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLanguage("vn")}
                    className="cursor-pointer text-sm font-medium py-2.5 px-4 text-muted-foreground hover:text-foreground focus:bg-primary/5 focus:text-primary transition-colors rounded-lg flex items-center gap-3"
                  >
                    <img src="https://flagcdn.com/w40/vn.png" alt="VN" className="w-7 h-5 object-cover rounded-sm shadow-sm border border-white/5" />
                    VN
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </div>
            </DropdownMenu>

            <Button asChild size="sm" className="rounded-full px-5">
              <Link href="/contact">{t('common.consulting_btn')}</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50">
            <div className="flex flex-col gap-4">
              <Link
                href="/about"
                className="text-base font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('common.about')}
              </Link>
              {/* Business Mobile */}
              <div className="flex flex-col gap-2">
                <Link
                  href="/business"
                  className="text-base font-bold text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('common.business')}
                </Link>
                <Link
                  href="/business#oda"
                  scroll={false}
                  className="text-sm font-medium text-muted-foreground pl-4 border-l border-white/10 ml-1"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('common.oda')}
                </Link>
                <Link
                  href="/business#platforms"
                  scroll={false}
                  className="text-sm font-medium text-muted-foreground pl-4 border-l border-white/10 ml-1"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('common.platform')}
                </Link>
              </div>

              {/* Insights Mobile */}
              <div className="flex flex-col gap-2">
                <Link
                  href="/insights"
                  className="text-base font-bold text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('common.insights')}
                </Link>
                <Link
                  href="/insights#oda"
                  scroll={false}
                  className="text-sm font-medium text-muted-foreground pl-4 border-l border-white/10 ml-1"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('common.insights_oda')}
                </Link>
                <Link
                  href="/insights#it"
                  scroll={false}
                  className="text-sm font-medium text-muted-foreground pl-4 border-l border-white/10 ml-1"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('common.insights_it')}
                </Link>
              </div>
              <Link
                href="/contact"
                className="text-base font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('common.contact')}
              </Link>
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <span className="text-base text-muted-foreground">{t('common.language')}:</span>
                <button 
                  onClick={() => setLanguage("en")}
                  className={`text-base ${language === 'en' ? 'font-medium text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  EN
                </button>
                <span className="text-muted-foreground">/</span>
                <button 
                  onClick={() => setLanguage("kr")}
                  className={`text-base ${language === 'kr' ? 'font-medium text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  KR
                </button>
                <span className="text-muted-foreground">/</span>
                <button 
                  onClick={() => setLanguage("vn")}
                  className={`text-base ${language === 'vn' ? 'font-medium text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  VN
                </button>
              </div>
              <Button asChild size="sm" className="w-full rounded-full mt-2">
                <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>
                  {t('common.consulting_btn')}
                </Link>
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
