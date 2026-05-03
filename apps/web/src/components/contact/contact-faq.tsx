"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, HelpCircle } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { dictionary } from "@/lib/i18n/dictionary"

export function ContactFAQ() {
  const { t, language } = useLanguage()
  const faqs = dictionary.contact.faq.items

  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-8">
        <HelpCircle className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-bold text-foreground uppercase tracking-tight">{t('contact.faq.title')}</h3>
      </div>
      
      {faqs.map((faq, index) => (
        <div key={index} className="border border-white/10 bg-white/[0.05] backdrop-blur-md rounded-2xl overflow-hidden shadow-sm hover:border-primary/20 transition-all">
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full p-6 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors group"
          >
            <span className="text-base font-bold text-foreground pr-8 break-keep group-hover:text-primary transition-colors">{faq.q[language]}</span>
            <div className={`p-2 rounded-full transition-all ${openIndex === index ? 'bg-primary text-primary-foreground rotate-180' : 'bg-white/5 text-primary'}`}>
              <ChevronDown className="h-4 w-4" />
            </div>
          </button>
          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="p-6 pt-0 text-base text-muted-foreground font-light leading-relaxed border-t border-white/5 break-keep whitespace-pre-line">
                  {faq.a[language]}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
