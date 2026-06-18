"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { XCircle, Loader2, ChevronDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/language-context";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  org: "",
  message: "",
};

export function ContactForm({ showIntro = true }: { showIntro?: boolean }) {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [inquiryType, setInquiryType] = useState("oda");

  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Portal target — modal/toast must escape the form's stacking context
  // (the card's backdrop-blur creates one), otherwise the header (z-50) covers them.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const inquiryTypes = [
    { id: "oda", label: t("contact.form.type_oda") },
    { id: "platform", label: t("contact.form.type_platform") },
    { id: "tech", label: t("contact.form.type_tech") },
    { id: "etc", label: t("contact.form.type_etc") },
  ];

  const currentTypeLabel =
    inquiryTypes.find((t) => t.id === inquiryType)?.label ||
    t("contact.form.type");

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = t("contact.form.errors.name");
    if (!formData.email.trim()) {
      newErrors.email = t("contact.form.errors.email");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t("contact.form.errors.email");
    }
    if (!formData.phone.trim())
      newErrors.phone = t("contact.form.errors.phone");
    if (!formData.org.trim()) newErrors.org = t("contact.form.errors.org");
    if (!formData.message.trim())
      newErrors.message = t("contact.form.errors.message");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setIsError(false);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, inquiryType }),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      // Success: show the modal and clear the form.
      setIsSuccess(true);
      setFormData({ ...EMPTY_FORM });
      setInquiryType("oda");
      setErrors({});
    } catch {
      // Failure: show the toast but keep the user's input.
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dismiss the failure toast after 6s, or on any click (toast or anywhere on screen).
  useEffect(() => {
    if (!isError) return;
    const dismiss = () => setIsError(false);
    const timer = setTimeout(dismiss, 6000);
    window.addEventListener("click", dismiss);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", dismiss);
    };
  }, [isError]);

  return (
    <>
    <div className="h-full p-6 md:p-8 rounded-2xl border border-[var(--border-card)] bg-[var(--card-dark)] backdrop-blur-xl shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] relative group overflow-hidden">
      {/* Form Decoration Accent */}

      <div className="relative z-10">
        {showIntro && (
          <h3 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight mb-8 leading-tight whitespace-pre-line text-center">
            {t("contact.form.intro")}
          </h3>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-semibold text-foreground/70 ml-1 mb-2 block">
                {t("contact.form.name")}
              </label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t("contact.form.name_ph")}
                className={`w-full px-4 py-3 rounded-2xl bg-card/50 border ${errors.name ? "border-red-500/30 ring-1 ring-red-500/10" : "border-border hover:border-primary/40 hover:bg-card/70"} focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-card focus:outline-none transition-all text-foreground placeholder:text-[#999EAB]/40 text-sm`}
              />
              <AnimatePresence>
                {errors.name && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[11px] text-red-400/80 flex items-center gap-1 mt-0.5 ml-1 font-medium"
                  >
                    <AlertCircle className="h-3.5 w-3.5" /> {errors.name}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-foreground/70 ml-1 mb-2 block">
                {t("contact.form.email")}
              </label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t("contact.form.email_ph")}
                className={`w-full px-4 py-3 rounded-2xl bg-card/50 border ${errors.email ? "border-red-500/30 ring-1 ring-red-500/10" : "border-border hover:border-primary/40 hover:bg-card/70"} focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-card focus:outline-none transition-all text-foreground placeholder:text-[#999EAB]/40 text-sm`}
              />
              <AnimatePresence>
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
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
              <label className="text-sm font-semibold text-foreground/70 ml-1 mb-2 block">
                {t("contact.form.phone")}
              </label>
              <input
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder={t("contact.form.phone_ph")}
                className={`w-full px-4 py-3 rounded-2xl bg-card/50 border ${errors.phone ? "border-red-500/30 ring-1 ring-red-500/10" : "border-border hover:border-primary/40 hover:bg-card/70"} focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-card focus:outline-none transition-all text-foreground placeholder:text-[#999EAB]/40 text-sm`}
              />
              <AnimatePresence>
                {errors.phone && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[11px] text-red-400/80 flex items-center gap-1 mt-0.5 ml-1 font-medium"
                  >
                    <AlertCircle className="h-3.5 w-3.5" /> {errors.phone}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-foreground/70 ml-1 mb-2 block">
                {t("contact.form.org")}
              </label>
              <input
                name="org"
                value={formData.org}
                onChange={handleChange}
                placeholder={t("contact.form.org_ph")}
                className={`w-full px-4 py-3 rounded-2xl bg-card/50 border ${errors.org ? "border-red-500/30 ring-1 ring-red-500/10" : "border-border hover:border-primary/40 hover:bg-card/70"} focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-card focus:outline-none transition-all text-foreground placeholder:text-[#999EAB]/40 text-sm`}
              />
              <AnimatePresence>
                {errors.org && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
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
            <label className="text-sm font-semibold text-foreground/70 ml-1 mb-2 block">
              {t("contact.form.type")}
            </label>
            <div
              onClick={() => setIsOpen(!isOpen)}
              className={`w-full h-12 px-4 rounded-2xl bg-card/50 border ${isOpen ? "border-primary ring-4 ring-primary/10 bg-card" : "border-border hover:border-primary/40 hover:bg-card/70"} flex items-center justify-between cursor-pointer transition-all`}
            >
              <span
                className={`text-sm ${inquiryType ? "text-foreground" : "text-muted-foreground/30"}`}
              >
                {currentTypeLabel}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180 text-primary" : ""}`}
              />
            </div>

            <AnimatePresence>
              {isOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 bg-card border border-border rounded-2xl overflow-hidden shadow-2xl shadow-black/20 backdrop-blur-xl"
                  >
                    {inquiryTypes.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setInquiryType(item.id);
                          setIsOpen(false);
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
            <label className="text-sm font-semibold text-foreground/70 ml-1 mb-2 block">
              {t("contact.form.message")}
            </label>
            <textarea
              name="message"
              rows={4}
              value={formData.message}
              onChange={handleChange}
              placeholder={t("contact.form.message_ph")}
              className={`w-full px-4 py-3 rounded-2xl bg-card/50 border ${errors.message ? "border-red-500/30 ring-1 ring-red-500/10" : "border-border hover:border-primary/40 hover:bg-card/70"} focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-card focus:outline-none transition-all text-foreground resize-none placeholder:text-[#999EAB] text-sm`}
            />
            <AnimatePresence>
              {errors.message && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
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
            className="w-full h-14 rounded-full text-base font-bold uppercase bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:-translate-y-1 active:translate-y-0"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              t("contact.form.submit")
            )}
          </Button>
        </form>
      </div>
    </div>

    {mounted &&
      createPortal(
        <>
    {/* Success modal — dismissed by overlay or button click */}
    <AnimatePresence>
      {isSuccess && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => setIsSuccess(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[rgba(15,23,42,0.5)] backdrop-blur-[7.5px]"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 360, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[400px] overflow-hidden rounded-[20px] bg-white shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.5)]"
          >
            <div className="flex flex-col items-center gap-4 p-4">
              <div className="w-full overflow-hidden rounded-[10px] bg-[#ebeef4]">
                <Image
                  src="/contact-success.png"
                  alt=""
                  width={368}
                  height={240}
                  className="aspect-[368/240] w-full object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col items-center gap-3 px-2 text-center">
                <h3 className="text-[20px] font-bold leading-7 tracking-[-0.2px] text-[#090d14]">
                  {t("contact.form.success_title")}
                </h3>
                <p className="whitespace-pre-line text-sm leading-5 text-[#6b7280]">
                  {t("contact.form.success_desc")}
                </p>
              </div>
            </div>
            <div className="border-t border-[#e5e7eb] p-4">
              <button
                type="button"
                onClick={() => setIsSuccess(false)}
                className="w-full rounded-[10px] bg-[#4a6df2] px-4 py-3 text-base font-medium text-white transition-colors hover:bg-[#3f5fe0] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#4a6df2]/30"
              >
                {t("contact.form.close_btn")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Failure toast — auto-dismisses after 3s, keeps form input */}
    <AnimatePresence>
      {isError && (
        <div className="fixed inset-x-0 top-6 z-[110] flex justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            role="alert"
            className="flex w-full max-w-[430px] cursor-pointer items-center gap-4 rounded-xl border border-l-4 border-[#fda29b] bg-[#e40014] py-4 pl-4 pr-4 shadow-[0px_2px_8px_rgba(0,0,0,0.12)]"
          >
            <div className="shrink-0 rounded-full bg-[#ffaea8] p-1">
              <XCircle className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm leading-5 text-[#f8f8fa]">
              {t("contact.form.error_desc")}
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
        </>,
        document.body,
      )}
    </>
  );
}
