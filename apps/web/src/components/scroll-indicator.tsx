"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

const sections = [
  { id: "hero", label: "01", title: "Innovation" },
  { id: "business", label: "02", title: "Business" },
  { id: "insights", label: "03", title: "AI Insights" },
  { id: "contact", label: "04", title: "Contact" },
]

export function ScrollIndicator() {
  const [activeSection, setActiveSection] = useState("hero")
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const lastSection = document.getElementById(sections[sections.length - 1].id)
      if (!lastSection) return

      // 스크롤이 도달해야 할 최종 지점 (마지막 섹션의 하단 = 푸터 시작점)
      const contentEnd = lastSection.offsetTop + lastSection.offsetHeight
      // 뷰포트 하단이 contentEnd에 닿았을 때가 100%가 되는 스크롤 위치
      const targetScroll = contentEnd - window.innerHeight
      
      const scrollPos = window.scrollY
      
      // 0에서 100 사이로 계산 (푸터 영역으로 넘어가도 100% 유지)
      const progress = Math.max(0, Math.min((scrollPos / targetScroll) * 100, 100))
      setScrollProgress(progress)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { 
        threshold: 0.3,
        rootMargin: "-20% 0px -20% 0px" // More natural triggering
      }
    )

    sections.forEach((section) => {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    })

    window.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll() // Initialize

    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  return (
    <div className="fixed inset-y-0 right-6 z-50 hidden lg:flex items-center pointer-events-none">
      <div className="flex flex-col items-center gap-12 w-14 pointer-events-auto">
        {/* Current Number Display with Circular Progress */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-14 w-14 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={activeSection}
                  initial={{ y: 10, opacity: 0, filter: "blur(4px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  exit={{ y: -10, opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                  className="text-xl font-bold tracking-tighter text-foreground"
                >
                  {sections.find((s) => s.id === activeSection)?.label}
                </motion.span>
              </AnimatePresence>
              
              {/* Progress Ring */}
              <svg className="absolute inset-0 -rotate-90 h-full w-full p-1">
                <circle
                  cx="24"
                  cy="24"
                  r="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-muted-foreground/30"
                />
                <motion.circle
                  cx="24"
                  cy="24"
                  r="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="138.2"
                  animate={{ strokeDashoffset: 138.2 - (138.2 * scrollProgress) / 100 }}
                  transition={{ type: "spring", stiffness: 50, damping: 20 }}
                  className="text-primary"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            
            {/* Active Title */}
            <div className="relative h-4 w-full flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={activeSection}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute text-sm font-bold tracking-widest uppercase text-primary whitespace-nowrap"
                >
                  {sections.find((s) => s.id === activeSection)?.title}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>

          {/* Vertical Navigation Dots */}
          <div className="flex flex-col gap-6">
            {sections.map((section) => {
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth" })
                  }}
                  className="group relative flex items-center justify-center h-4 w-4"
                >
                  {/* Active Indicator Background Removed */}


                  {/* Dot */}
                  <motion.div
                    animate={{
                      scale: isActive ? 1.2 : 1,
                      backgroundColor: isActive ? "var(--primary)" : "var(--dot-inactive)",
                    }}
                    className="relative z-10 h-1.5 w-1.5 rounded-full transition-colors duration-300"
                  />

                  {/* Hover Label */}
                  <span className="absolute right-10 top-1/2 -translate-y-1/2 whitespace-nowrap text-sm font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 text-muted-foreground">
                    {section.title}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }
