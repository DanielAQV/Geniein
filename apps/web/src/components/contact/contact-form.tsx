"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, CheckCircle2, Loader2, ChevronDown, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/i18n/language-context"

export function ContactForm({ showIntro = true }: { showIntro?: boolean }) {
  const { t } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [inquiryType, setInquiryType] = useState("oda")
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    org: "",
    message: ""
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  const inquiryTypes = [
    { id: "oda", label: t('contact.form.type_oda') },
    { id: "platform", label: t('contact.form.type_platform') },
    { id: "tech", label: t('contact.form.type_tech') },
    { id: "etc", label: t('contact.form.type_etc') },
  ]

  const currentTypeLabel = inquiryTypes.find(t => t.id === inquiryType)?.label || t('contact.form.type')

  const validate = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) newErrors.name = t('contact.form.errors.name')
    if (!formData.email.trim()) {
      newErrors.email = t('contact.form.errors.email')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('contact.form.errors.email')
    }
    if (!formData.phone.trim()) newErrors.phone = t('contact.form.errors.phone')
    if (!formData.org.trim()) newErrors.org = t('contact.form.errors.org')
    if (!formData.message.trim()) newErrors.message = t('contact.form.errors.message')
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return

    setIsSubmitting(true)
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSuccess(true)
    }, 2000)
  }

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-10 md:p-16 text-center rounded-3xl border border-primary/30 bg-primary/[0.05] backdrop-blur-2xl shadow-2xl"
      >
        <div className="mb-6 flex justify-center">
          <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-3 tracking-tight">{t('contact.form.success_title')}</h3>
        <p className="text-base text-muted-foreground mb-8 max-w-sm mx-auto font-light">{t('contact.form.success_desc')}</p>
        <Button 
          onClick={() => {
            setIsSuccess(false)
            setFormData({ name: "", email: "", phone: "", org: "", message: "" })
          }} 
          variant="outline" 
          className="px-6 rounded-full h-10 border-primary/30 hover:bg-primary/5 text-sm"
        >
          {t('contact.form.new_btn')}
        </Button>
      </motion.div>
    )
  }

  return (
    <div className="h-full p-8 md:p-12 rounded-3xl border border-white/10 bg-white/[0.05] backdrop-blur-xl shadow-2xl relative">
      {/* Form Grid Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none overflow-hidden rounded-tr-3xl">
        <svg viewBox="0 0 100 100" className="w-full h-full fill-primary">
          <rect width="10" height="10" x="90" y="0" />
          <rect width="10" height="10" x="70" y="0" />
          <rect width="10" height="10" x="90" y="20" />
        </svg>
      </div>

      <div className="relative z-10">
        {showIntro && (
          <h3 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-8 leading-tight whitespace-pre-line">
            {t('contact.form.intro')}
          </h3>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-primary ml-1 mb-2 block">{t('contact.form.name')}</label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('contact.form.name_ph')}
              className={`w-full px-4 py-3 rounded-xl bg-white/[0.03] border ${errors.name ? 'border-red-500/30 ring-1 ring-red-500/10' : 'border-white/10'} focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all text-foreground placeholder:text-muted-foreground/30 text-sm`}
            />
            <AnimatePresence>
              {errors.name && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[11px] text-red-400/80 flex items-center gap-1 mt-0.5 ml-1 font-medium"
                >
                  <AlertCircle className="h-3.5 w-3.5" /> {errors.name}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-primary ml-1 mb-2 block">{t('contact.form.email')}</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('contact.form.email_ph')}
              className={`w-full px-4 py-3 rounded-xl bg-white/[0.03] border ${errors.email ? 'border-red-500/30 ring-1 ring-red-500/10' : 'border-white/10'} focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all text-foreground placeholder:text-muted-foreground/30 text-sm`}
            />
            <AnimatePresence>
              {errors.email && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[11px] text-red-400/80 flex items-center gap-1 mt-0.5 ml-1 font-medium"
                >
                  <AlertCircle className="h-3.5 w-3.5" /> {errors.email}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-primary ml-1 mb-2 block">{t('contact.form.phone')}</label>
            <input
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t('contact.form.phone_ph')}
              className={`w-full px-4 py-3 rounded-xl bg-white/[0.03] border ${errors.phone ? 'border-red-500/30 ring-1 ring-red-500/10' : 'border-white/10'} focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all text-foreground placeholder:text-muted-foreground/30 text-sm`}
            />
            <AnimatePresence>
              {errors.phone && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[11px] text-red-400/80 flex items-center gap-1 mt-0.5 ml-1 font-medium"
                >
                  <AlertCircle className="h-3.5 w-3.5" /> {errors.phone}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-primary ml-1 mb-2 block">{t('contact.form.org')}</label>
            <input
              name="org"
              value={formData.org}
              onChange={handleChange}
              placeholder={t('contact.form.org_ph')}
              className={`w-full px-4 py-3 rounded-xl bg-white/[0.03] border ${errors.org ? 'border-red-500/30 ring-1 ring-red-500/10' : 'border-white/10'} focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all text-foreground placeholder:text-muted-foreground/30 text-sm`}
            />
            <AnimatePresence>
              {errors.org && (
                <motion.p 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[11px] text-red-400/80 flex items-center gap-1 mt-0.5 ml-1 font-medium"
                >
                  <AlertCircle className="h-3.5 w-3.5" /> {errors.org}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-1 relative">
          <label className="text-sm font-semibold text-primary ml-1 mb-2 block">{t('contact.form.type')}</label>
          <div 
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full h-12 px-4 rounded-xl bg-white/[0.03] border ${isOpen ? 'border-primary ring-1 ring-primary/20' : 'border-white/10'} flex items-center justify-between cursor-pointer transition-all hover:border-white/20`}
          >
            <span className={`text-sm ${inquiryType ? 'text-foreground' : 'text-muted-foreground/30'}`}>
              {currentTypeLabel}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`} />
          </div>

          <AnimatePresence>
            {isOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 bg-[#050b1a] border border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-black/50 backdrop-blur-xl"
                >
                  {inquiryTypes.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setInquiryType(item.id)
                        setIsOpen(false)
                      }}
                      className="px-4 py-3 text-sm text-foreground hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"
                    >
                      {item.label}
                    </div>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-primary ml-1 mb-2 block">{t('contact.form.message')}</label>
          <textarea
            name="message"
            rows={4}
            value={formData.message}
            onChange={handleChange}
            placeholder={t('contact.form.message_ph')}
            className={`w-full px-4 py-3 rounded-xl bg-white/[0.03] border ${errors.message ? 'border-red-500/30 ring-1 ring-red-500/10' : 'border-white/10'} focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition-all text-foreground resize-none placeholder:text-muted-foreground/30 text-sm`}
          />
          <AnimatePresence>
            {errors.message && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="text-[11px] text-red-400/80 flex items-center gap-1 -mt-0.5 ml-1 font-medium"
              >
                <AlertCircle className="h-3.5 w-3.5" /> {errors.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <Button
          disabled={isSubmitting}
          className="w-full h-14 rounded-xl text-base font-bold uppercase bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <div className="flex items-center gap-2">
              {t('contact.form.submit')} <Send className="h-4 w-4" />
            </div>
          )}
        </Button>
      </form>
    </div>
  </div>
)
}
