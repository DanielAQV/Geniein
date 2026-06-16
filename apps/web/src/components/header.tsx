"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Globe, Menu, Sun, Moon, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const LANG_FLAGS: Record<string, string> = {
  kr: "https://flagcdn.com/w40/kr.png",
  en: "https://flagcdn.com/w40/us.png",
  vn: "https://flagcdn.com/w40/vn.png",
};

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  // Mobile/tablet sidebar: only one accordion tab open at a time
  const [mobileTab, setMobileTab] = useState<"business" | "insights" | null>(
    null,
  );
  const [mobileLangOpen, setMobileLangOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const closeMobile = () => {
    setMobileMenuOpen(false);
    setMobileTab(null);
    setMobileLangOpen(false);
  };

  // Lock body scroll while the sidebar is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-15 items-center justify-between">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 cursor-pointer group"
            >
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
            <div className="hidden lg:flex lg:items-center lg:gap-16">
              <Link
                href="/about"
                className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer group relative py-2"
              >
                <span>{t("common.about")}</span>
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary origin-center scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </Link>

              <DropdownMenu
                open={businessOpen}
                onOpenChange={setBusinessOpen}
                modal={false}
              >
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
                      <span className={businessOpen ? "text-foreground" : ""}>
                        {t("common.business")}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${businessOpen ? "rotate-180" : ""}`}
                      />
                      <span
                        className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary origin-center transition-transform duration-300 ${businessOpen ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
                      />
                    </Link>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
                    className="min-w-[220px] w-auto bg-card/95 backdrop-blur-lg border border-white/10"
                    onMouseEnter={() => setBusinessOpen(true)}
                    onMouseLeave={() => setBusinessOpen(false)}
                  >
                    <DropdownMenuItem
                      asChild
                      className="focus:bg-transparent p-0"
                    >
                      <Link
                        href="/business?category=platform"
                        scroll={false}
                        className="cursor-pointer w-full text-base font-medium py-3 px-5 hover:bg-primary/5 transition-all group/item text-muted-foreground whitespace-nowrap"
                      >
                        <span className="relative group-hover/item:text-foreground transition-colors">
                          {t("common.platform")}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild
                      className="focus:bg-transparent p-0"
                    >
                      <Link
                        href="/business?category=oda"
                        scroll={false}
                        className="cursor-pointer w-full text-base font-medium py-3 px-5 hover:bg-primary/5 transition-all group/item text-muted-foreground whitespace-nowrap"
                      >
                        <span className="relative group-hover/item:text-foreground transition-colors">
                          {t("common.oda")}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </div>
              </DropdownMenu>

              <DropdownMenu
                open={insightsOpen}
                onOpenChange={setInsightsOpen}
                modal={false}
              >
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
                      <span className={insightsOpen ? "text-foreground" : ""}>
                        {t("common.insights")}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${insightsOpen ? "rotate-180" : ""}`}
                      />
                      <span
                        className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary origin-center transition-transform duration-300 ${insightsOpen ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
                      />
                    </Link>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
                    className="min-w-[220px] w-auto bg-card/95 backdrop-blur-lg border border-white/10"
                    onMouseEnter={() => setInsightsOpen(true)}
                    onMouseLeave={() => setInsightsOpen(false)}
                  >
                    <DropdownMenuItem
                      asChild
                      className="focus:bg-transparent p-0"
                    >
                      <Link
                        href="/insights?category=it"
                        scroll={false}
                        className="cursor-pointer w-full text-base font-medium py-3 px-5 hover:bg-primary/5 transition-all group/item text-muted-foreground whitespace-nowrap"
                      >
                        <span className="relative group-hover/item:text-foreground transition-colors">
                          {t("common.insights_it")}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild
                      className="focus:bg-transparent p-0"
                    >
                      <Link
                        href="/insights?category=oda"
                        scroll={false}
                        className="cursor-pointer w-full text-base font-medium py-3 px-5 hover:bg-primary/5 transition-all group/item text-muted-foreground whitespace-nowrap"
                      >
                        <span className="relative group-hover/item:text-foreground transition-colors">
                          {t("common.insights_oda")}
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
                <span>{t("common.contact")}</span>
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary origin-center scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </Link>
            </div>

            {/* Right Side Actions */}
            <div className="hidden lg:flex lg:items-center lg:gap-4">
              <DropdownMenu
                open={langOpen}
                onOpenChange={setLangOpen}
                modal={false}
              >
                <div
                  className="relative"
                  onMouseEnter={() => setLangOpen(true)}
                  onMouseLeave={() => setLangOpen(false)}
                >
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 text-base font-medium text-muted-foreground hover:text-foreground transition-colors uppercase cursor-pointer outline-none group relative py-2">
                      <Globe className="h-4 w-4" />
                      <span className={langOpen ? "text-foreground" : ""}>
                        {language}
                      </span>
                      <ChevronDown
                        className={`h-3 w-3 transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`}
                      />
                      <span
                        className={`absolute bottom-0 left-0 w-full h-0.5 bg-primary origin-center transition-transform duration-300 ${langOpen ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
                      />
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
                      <img
                        src="https://flagcdn.com/w40/kr.png"
                        alt="KR"
                        className="w-7 h-5 object-cover rounded-sm shadow-sm border border-white/5"
                      />
                      KR
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setLanguage("en")}
                      className="cursor-pointer text-sm font-medium py-2.5 px-4 text-muted-foreground hover:text-foreground focus:bg-primary/5 focus:text-primary transition-colors rounded-lg flex items-center gap-3"
                    >
                      <img
                        src="https://flagcdn.com/w40/us.png"
                        alt="EN"
                        className="w-7 h-5 object-cover rounded-sm shadow-sm border border-white/5"
                      />
                      EN
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setLanguage("vn")}
                      className="cursor-pointer text-sm font-medium py-2.5 px-4 text-muted-foreground hover:text-foreground focus:bg-primary/5 focus:text-primary transition-colors rounded-lg flex items-center gap-3"
                    >
                      <img
                        src="https://flagcdn.com/w40/vn.png"
                        alt="VN"
                        className="w-7 h-5 object-cover rounded-sm shadow-sm border border-white/5"
                      />
                      VN
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </div>
              </DropdownMenu>

              <ThemeToggle />

              <Button asChild size="sm" className="rounded-full px-5">
                <Link href="/contact">{t("common.consulting_btn")}</Link>
              </Button>
            </div>

            {/* Mobile / Tablet actions */}
            <div className="flex items-center gap-3 lg:hidden">
              {/* Partnership CTA — tablet only (per Figma tablet header) */}
              <Button
                asChild
                size="sm"
                className="hidden md:inline-flex rounded-full px-5"
              >
                <Link href="/contact">{t("common.consulting_btn")}</Link>
              </Button>
              <button
                type="button"
                className="p-2 text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile / Tablet Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="mobile-sidebar"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
            className="lg:hidden fixed inset-0 z-[100] flex h-[100dvh] w-full flex-col justify-between bg-background"
          >
            <div className="flex flex-col">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-3">
                <Link
                  href="/"
                  onClick={closeMobile}
                  className="flex items-center gap-2"
                >
                  <div className="relative h-8 w-8 overflow-hidden rounded-lg">
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
                <button
                  type="button"
                  onClick={closeMobile}
                  className="p-1 text-foreground hover:text-muted-foreground transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-7 w-7" />
                </button>
              </div>

              {/* Tabs */}
              <nav className="flex flex-col">
                <Link
                  href="/"
                  onClick={closeMobile}
                  className="px-6 py-3 text-base font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  {t("common.home")}
                </Link>

                <Link
                  href="/about"
                  onClick={closeMobile}
                  className="px-6 py-3 text-base font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  {t("common.about")}
                </Link>

                {/* Business accordion */}
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() =>
                      setMobileTab(mobileTab === "business" ? null : "business")
                    }
                    className={cn(
                      "flex items-center justify-between px-6 py-3 text-base text-left transition-colors",
                      mobileTab === "business"
                        ? "bg-muted font-bold text-foreground"
                        : "font-medium text-foreground hover:bg-muted/50",
                    )}
                    aria-expanded={mobileTab === "business"}
                  >
                    <span>{t("common.business")}</span>
                    <ChevronDown
                      className={cn(
                        "h-6 w-6 shrink-0 transition-transform duration-300",
                        mobileTab === "business" && "rotate-180",
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {mobileTab === "business" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <Link
                          href="/business?category=platform"
                          scroll={false}
                          onClick={closeMobile}
                          className="block pl-10 pr-6 py-3 text-base text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {t("common.platform")}
                        </Link>
                        <Link
                          href="/business?category=oda"
                          scroll={false}
                          onClick={closeMobile}
                          className="block pl-10 pr-6 py-3 text-base text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {t("common.oda")}
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Insights accordion */}
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() =>
                      setMobileTab(mobileTab === "insights" ? null : "insights")
                    }
                    className={cn(
                      "flex items-center justify-between px-6 py-3 text-base text-left transition-colors",
                      mobileTab === "insights"
                        ? "bg-muted font-bold text-foreground"
                        : "font-medium text-foreground hover:bg-muted/50",
                    )}
                    aria-expanded={mobileTab === "insights"}
                  >
                    <span>{t("common.insights")}</span>
                    <ChevronDown
                      className={cn(
                        "h-6 w-6 shrink-0 transition-transform duration-300",
                        mobileTab === "insights" && "rotate-180",
                      )}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {mobileTab === "insights" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <Link
                          href="/insights?category=it"
                          scroll={false}
                          onClick={closeMobile}
                          className="block pl-10 pr-6 py-3 text-base text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {t("common.insights_it")}
                        </Link>
                        <Link
                          href="/insights?category=oda"
                          scroll={false}
                          onClick={closeMobile}
                          className="block pl-10 pr-6 py-3 text-base text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {t("common.insights_oda")}
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Link
                  href="/contact"
                  onClick={closeMobile}
                  className="px-6 py-3 text-base font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  {t("common.contact")}
                </Link>
              </nav>
            </div>

            {/* Dim + blur backdrop while the language dropdown is open (Figma) */}
            <AnimatePresence>
              {mobileLangOpen && (
                <motion.button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setMobileLangOpen(false)}
                  className="fixed inset-0 z-40 cursor-default bg-[rgba(15,23,42,0.5)] backdrop-blur-[7.5px]"
                />
              )}
            </AnimatePresence>

            {/* Bottom bar: language + theme */}
            <div className="flex items-center justify-between px-6 pt-3 pb-6">
              {/* Language selector */}
              <div className="relative z-50">
                <button
                  type="button"
                  onClick={() => setMobileLangOpen((v) => !v)}
                  className="flex w-[72px] items-center justify-center gap-2 rounded-full border border-[var(--border-card)] bg-[var(--card-dark)] px-2 py-1.5 text-xs text-foreground outline-none"
                  aria-expanded={mobileLangOpen}
                  aria-label="Select language"
                >
                  <img
                    src={LANG_FLAGS[language]}
                    alt={language}
                    className="h-[14px] w-5 rounded-sm object-cover"
                  />
                  <span className="uppercase">{language}</span>
                </button>

                <AnimatePresence>
                  {mobileLangOpen && (
                    <motion.ul
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className={cn(
                        "z-50 overflow-hidden border border-[#e5e7eb] bg-white py-2 shadow-[0px_0px_6px_0px_rgba(0,0,0,0.04),0px_2px_4px_1px_rgba(0,0,0,0.08)]",
                        // Mobile: full-width bottom sheet, rounded top only (Figma)
                        "fixed bottom-0 left-0 right-0 rounded-t-[12px]",
                        // Tablet: floating dropdown above the trigger (Figma)
                        "md:absolute md:bottom-full md:right-auto md:mb-2 md:w-[273px] md:rounded-[12px]",
                      )}
                    >
                      {(["en", "kr", "vn"] as const).map((lang) => (
                        <li key={lang}>
                          <button
                            type="button"
                            onClick={() => {
                              setLanguage(lang);
                              setMobileLangOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center gap-3 px-4 py-3 text-base text-[#090d14] transition-colors",
                              language === lang
                                ? "bg-[#f4f6fa]"
                                : "hover:bg-[#f4f6fa]",
                            )}
                          >
                            <img
                              src={LANG_FLAGS[lang]}
                              alt={lang}
                              className="h-4 w-[22px] shrink-0 rounded-[2px] object-cover"
                            />
                            <span className="flex-1 text-left uppercase">
                              {lang}
                            </span>
                            {language === lang && (
                              <Check className="h-5 w-5 shrink-0 text-primary" />
                            )}
                          </button>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              {/* Theme segmented control */}
              {mounted && (
                <div className="flex items-center gap-1 rounded-full border border-[var(--border-card)] bg-[var(--card-dark)] p-1">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    aria-label="Light mode"
                    className={cn(
                      "flex items-center justify-center rounded-full px-5 py-1.5 transition-colors",
                      theme !== "dark"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Sun className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    aria-label="Dark mode"
                    className={cn(
                      "flex items-center justify-center rounded-full px-5 py-1.5 transition-colors",
                      theme === "dark"
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Moon className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
