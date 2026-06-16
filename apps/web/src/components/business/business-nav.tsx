"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useEffect, useState, Suspense } from "react"
import { useLanguage } from "@/lib/i18n/language-context"
import { useSearchParams } from "next/navigation"

function BusinessNavContent() {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState("platform")
  const searchParams = useSearchParams()

  useEffect(() => {
    const category = searchParams.get('category')
    if (category === "oda") {
      setActiveTab("oda")
    } else {
      setActiveTab("platform")
    }
  }, [searchParams])

  const tabs = [
    { id: "platform", label: t('common.platform'), href: "/business?category=platform" },
    { id: "oda", label: t('common.oda'), href: "/business?category=oda" }
  ]

  return (
    <div className="sticky top-[64px] z-40 w-full border-b border-border bg-card/60 backdrop-blur-xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center sm:justify-start gap-8 h-14">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              scroll={false}
              className="relative h-full flex items-center text-sm font-bold tracking-widest uppercase transition-colors"
            >
              <span className={activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"}>
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeBusinessTab"
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

export function BusinessNav() {
  return (
    <Suspense fallback={<div className="h-14 w-full bg-background" />}>
      <BusinessNavContent />
    </Suspense>
  )
}
