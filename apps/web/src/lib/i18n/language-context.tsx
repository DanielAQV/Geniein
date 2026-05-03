"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { dictionary, Language } from "./dictionary"

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (path: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("kr")

  useEffect(() => {
    const savedLang = localStorage.getItem("geniein-lang") as Language
    if (savedLang && (savedLang === "kr" || savedLang === "en" || savedLang === "vn")) {
      setLanguageState(savedLang)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("geniein-lang", lang)
  }

  const t = (path: string): string => {
    const keys = path.split(".")
    let current: any = dictionary

    for (const key of keys) {
      if (current[key] === undefined) {
        console.warn(`Translation key not found: ${path}`)
        return path
      }
      current = current[key]
    }

    if (typeof current === "object" && current[language]) {
      return current[language]
    }

    return path
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
