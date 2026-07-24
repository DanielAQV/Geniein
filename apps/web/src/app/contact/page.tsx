"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { motion } from "framer-motion";
import { ContactForm } from "@/components/contact/contact-form";
import { OfficeInfo } from "@/components/contact/office-info";
import { useLanguage } from "@/lib/i18n/language-context";

export default function ContactPage() {
  const { t } = useLanguage();
  const [activeOffice, setActiveOffice] = useState(0);

  const maps = [
    {
      title: "Geniein HQ Location (경기도 성남시 분당구 황새울로319번길 8-4)",
      src: "https://www.google.com/maps?q=%EA%B2%BD%EA%B8%B0%EB%8F%84%20%EC%84%B1%EB%82%A8%EC%8B%9C%20%EB%B6%84%EB%8B%B9%EA%B5%AC%20%ED%99%A9%EC%83%88%EC%9A%B8%EB%A1%9C319%EB%B2%88%EA%B8%B8%208-4&hl=ko&z=17&output=embed",
    },
    {
      title: "Geniein Hanoi Location (Capital Tower)",
      src: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.227834783214!2d105.8395386103612!3d21.023567880543606!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab90949fd5f7%3A0x25802ec5e94a3668!2sCapital%20Tower!5e0!3m2!1sko!2s!4v1780469286345!5m2!1sko!2s",
    },
  ];

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Contact Hero */}
      <section className="relative pt-32 pb-24 min-h-[400px] flex flex-col justify-center overflow-hidden border-b border-border/50">
        {/* Background Image Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/heroes/contact.png"
            alt="Contact Background"
            className="w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background opacity-40" />
        </div>

        <div className="absolute inset-0 z-0 opacity-10">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="blueprint-grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-primary/40"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#blueprint-grid)" />
          </svg>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold tracking-[0.3em] uppercase text-primary mb-8 block">
                {t("contact.hero.label")}
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-foreground mb-10 leading-[1.1] max-w-4xl mx-auto">
                {t("contact.hero.title_1")} {t("contact.hero.title_2")}
              </h1>
            </div>
            <p className="text-[15px] sm:text-xl text-muted-foreground max-w-4xl mx-auto break-keep leading-relaxed font-light whitespace-pre-line text-balance">
              {t("contact.hero.description")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Signature Gradient Beam Separator */}
      <div className="relative h-px w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
      </div>

      <section className="pt-16 pb-52">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Section Header: Added to match Business/Insights structure */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-4"
          >
            <span className="text-sm font-bold tracking-[0.3em] uppercase text-primary mb-4 block">
              {t("contact.section.label")}
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-4 break-keep text-balance">
              {t("contact.section.title")}
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto break-keep whitespace-pre-line">
              {t("contact.section.desc")}
            </p>
          </motion.div>

          <div className="flex flex-col gap-16">
            {/* Full-width Inquiry Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <ContactForm />
            </motion.div>

            {/* Office Info + Map */}
            <div className="grid lg:grid-cols-2 gap-6 items-stretch">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="h-full"
              >
                <OfficeInfo
                  activeOffice={activeOffice}
                  onOfficeSelect={setActiveOffice}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="h-full min-h-[400px]"
              >
                <div className="h-full min-h-[450px] w-full overflow-hidden rounded-[20px] border border-[var(--border-card)] shadow-[inset_0_0_0_2px_rgba(190,190,190,0.1)]">
                  <iframe
                    key={maps[activeOffice].src}
                    title={maps[activeOffice].title}
                    src={maps[activeOffice].src}
                    className="h-full min-h-[450px] w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
