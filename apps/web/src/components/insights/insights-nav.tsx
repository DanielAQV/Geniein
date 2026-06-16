"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useEffect, useState, Suspense } from "react"
import { useLanguage } from "@/lib/i18n/language-context"
import { useSearchParams } from "next/navigation"

function InsightsNavContent() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState("it")
  const searchParams = useSearchParams()

  useEffect(() => {
    const category = searchParams.get('category')
    if (category === "oda") {
      setActiveTab("oda")
    } else {
      setActiveTab("it")
    }
  }, [searchParams])

  const tabs = [
    { id: "it", label: t('common.insights_it'), href: "/insights?category=it" },
    { id: "oda", label: t('common.insights_oda'), href: "/insights?category=oda" }
  ]

  return (
    <div className="sticky top-[64px] z-40 w-full border-t border-border/40 border-b border-border bg-card/60 backdrop-blur-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-stretch sm:items-center justify-center sm:justify-start gap-0 sm:gap-8 h-14">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              scroll={false}
              className="relative h-full flex flex-1 sm:flex-none items-center justify-center sm:justify-start text-sm font-bold tracking-widest uppercase transition-colors"
            >
              <span className={activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"}>
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeInsightsTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export function InsightsNav() {
  return (
    <Suspense fallback={<div className="h-14 w-full bg-background" />}>
      <InsightsNavContent />
    </Suspense>
  )
}
