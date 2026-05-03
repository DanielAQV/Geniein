"use client"

import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/language-context"
import { Footer } from "@/components/footer"
import { ContactForm } from "@/components/contact/contact-form"
import { Users } from "lucide-react"

export function ContactFooter() {
  const { t } = useLanguage()

  return (
    <>
      {/* Contact Section */}
      <section id="contact" className="py-24 sm:py-32 bg-muted/30 relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] opacity-50" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] opacity-50" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col items-center text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-6 inline-flex items-center gap-2 px-5 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md relative overflow-hidden group shadow-lg"
            >
              <Users className="h-4 w-4 text-primary relative z-10" />
              <span className="text-sm font-bold tracking-widest uppercase text-primary relative z-10">
                {t('landing.contact.label')}
              </span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl font-bold text-foreground mb-6 tracking-tight whitespace-pre-line leading-[1.2]"
            >
              {t('landing.contact.title')}
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted-foreground max-w-2xl leading-relaxed font-light whitespace-pre-line"
            >
              {t('landing.contact.desc')}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="max-w-3xl mx-auto"
          >
            <ContactForm showIntro={false} />
          </motion.div>
        </div>
      </section>

      <Footer />
    </>
  )
}
