"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/language-context"
import {
  EFFECTIVE_DATE,
  governingLanguageNote,
  privacyIntro,
  privacyOfficer,
  privacySections,
} from "@/lib/legal/privacy"

/**
 * 개인정보 처리방침. 마케팅 페이지와 달리 스캔이 아니라 통독을 전제로 해서
 * 히어로를 낮추고 본문 폭을 좁혔다(max-w-4xl). 표는 좁은 화면에서 가로 스크롤한다.
 */
export default function PrivacyPage() {
  const { language } = useLanguage()

  const officerLabel =
    language === "kr" ? "개인정보 보호책임자" : language === "vn" ? "Người phụ trách" : "Privacy Officer"
  const effectiveLabel =
    language === "kr" ? "시행일" : language === "vn" ? "Ngày hiệu lực" : "Effective date"
  const title =
    language === "kr" ? "개인정보 처리방침" : language === "vn" ? "Chính sách Bảo mật" : "Privacy Policy"

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero — 문서 페이지라 다른 페이지보다 낮게 잡았다 */}
      <section className="relative pt-28 pb-12 md:pt-32 md:pb-16 flex flex-col justify-center overflow-hidden border-b border-border/50">
        <div className="absolute inset-0 z-0 opacity-10">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="privacy-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                  className="text-primary/40"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#privacy-grid)" />
          </svg>
        </div>

        <div className="relative z-10 mx-auto max-w-4xl w-full px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary mb-4 block">
              Legal
            </span>
            <h1 className="text-[28px] md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-4">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground font-light">
              {effectiveLabel}: {EFFECTIVE_DATE}
            </p>
          </motion.div>
        </div>
      </section>

      <div className="relative h-px w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </div>

      <section className="py-12 md:py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm md:text-base leading-relaxed text-muted-foreground font-light break-keep">
            {privacyIntro[language]}
          </p>

          <p className="mt-4 rounded-[12px] border border-[var(--border-card)] bg-[var(--card-glass)] px-4 py-3 text-xs leading-relaxed text-muted-foreground font-light break-keep">
            {governingLanguageNote[language]}
          </p>

          <div className="mt-10 flex flex-col gap-10 md:gap-12">
            {privacySections.map((section, index) => (
              <section key={index} className="flex flex-col gap-4">
                <h2 className="text-lg md:text-xl font-bold tracking-[-0.3px] text-foreground break-keep">
                  {section.heading[language]}
                </h2>

                {section.paragraphs?.map((paragraph, pIdx) => (
                  <p
                    key={pIdx}
                    className="text-sm md:text-[15px] leading-relaxed text-muted-foreground font-light break-keep"
                  >
                    {paragraph[language]}
                  </p>
                ))}

                {section.bullets && (
                  <ul className="flex flex-col gap-2">
                    {section.bullets.map((bullet, bIdx) => (
                      <li
                        key={bIdx}
                        className="flex gap-3 text-sm md:text-[15px] leading-relaxed text-muted-foreground font-light break-keep"
                      >
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                        <span>{bullet[language]}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.table && (
                  <div className="overflow-x-auto rounded-[12px] border border-[var(--border-card)]">
                    <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="bg-[var(--card-glass)]">
                          {section.table.columns.map((column, cIdx) => (
                            <th
                              key={cIdx}
                              className="border-b border-[var(--border-card)] px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-heading)]/70"
                            >
                              {column[language]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.table.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="align-top">
                            {row.map((cell, cellIdx) => (
                              <td
                                key={cellIdx}
                                className="border-b border-border/30 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground font-light break-keep last:border-r-0"
                              >
                                {cell[language]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 보호책임자 조항 뒤에만 실제 연락처 카드를 붙인다 */}
                {section.heading.kr.startsWith("제11조") && (
                  <div className="rounded-[16px] border border-[var(--border-card)] bg-[var(--card-dark)] p-6">
                    <div className="text-xs font-bold uppercase tracking-[0.15em] text-primary mb-3">
                      {officerLabel}
                    </div>
                    <dl className="flex flex-col gap-1.5 text-sm text-[var(--text-heading)]">
                      <div className="flex gap-3">
                        <dt className="w-20 shrink-0 text-muted-foreground font-light">
                          {language === "kr" ? "성명" : language === "vn" ? "Họ tên" : "Name"}
                        </dt>
                        <dd>
                          {privacyOfficer.name[language]} ({privacyOfficer.title[language]})
                        </dd>
                      </div>
                      <div className="flex gap-3">
                        <dt className="w-20 shrink-0 text-muted-foreground font-light">
                          {language === "kr" ? "이메일" : "Email"}
                        </dt>
                        <dd>
                          <a
                            href={`mailto:${privacyOfficer.email}`}
                            className="text-primary hover:underline"
                          >
                            {privacyOfficer.email}
                          </a>
                        </dd>
                      </div>
                      {privacyOfficer.phone && (
                        <div className="flex gap-3">
                          <dt className="w-20 shrink-0 text-muted-foreground font-light">
                            {language === "kr" ? "연락처" : language === "vn" ? "Điện thoại" : "Phone"}
                          </dt>
                          <dd>{privacyOfficer.phone}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
