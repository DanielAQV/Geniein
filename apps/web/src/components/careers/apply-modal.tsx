"use client"

/**
 * 채용 지원 폼 (목업).
 *
 * ⚠ TODO — 백엔드는 아직 붙이지 않는다. 여기서 다루는 값은 전부 개인정보이고,
 *   아래 항목은 대표 결정 사항이라 임의로 정할 수 없다:
 *     · 이력서 파일을 어디에 둘지 (S3/오브젝트 스토리지 · 접근권한 · 암호화)
 *     · 보관 기간과 파기 절차 (채용 종료 후 N개월)
 *     · 개인정보 수집·이용 동의 문구의 최종 문안 (법무 확인 필요)
 *     · 지원 내역을 볼 수 있는 사람 (admin 권한 분리)
 *   그 전까지 제출은 화면 상태만 바꾸고 아무 데도 보내지 않는다.
 *   실제 연동 시 이 컴포넌트에서 바꿀 곳은 handleSubmit 하나다.
 */

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, CheckCircle2, Loader2, Paperclip, X } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { pick, type JobPosting } from "@/lib/careers/jobs"

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"]
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB

const EMPTY_FORM = { name: "", email: "", phone: "", intro: "" }

const inputClass = (invalid: boolean) =>
  `w-full px-4 py-3 rounded-2xl bg-card/50 border ${
    invalid
      ? "border-red-500/30 ring-1 ring-red-500/10"
      : "border-border hover:border-primary/40 hover:bg-card/70"
  } focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-card focus:outline-none transition-all text-foreground placeholder:text-[#999EAB]/40 text-sm`

function FieldError({ message }: { message?: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="text-[11px] text-red-400/80 flex items-center gap-1 mt-0.5 ml-1 font-medium"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {message}
        </motion.p>
      )}
    </AnimatePresence>
  )
}

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export function ApplyModal({
  open,
  job,
  onClose,
}: {
  open: boolean
  job: JobPosting | null
  onClose: () => void
}) {
  const { t, language } = useLanguage()
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [file, setFile] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // 열릴 때마다 초기화한다. 이전 지원자의 입력이 남아 있으면 안 된다.
  useEffect(() => {
    if (!open) return
    setForm({ ...EMPTY_FORM })
    setFile(null)
    setConsent(false)
    setErrors({})
    setSubmitting(false)
    setSubmitted(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [open, job?.id])

  // 배경 스크롤 잠금 + ESC 닫기
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  const positionLabel = job ? pick(job.title, language) : t("careers.apply.general")

  const validateFile = (candidate: File | null): string | undefined => {
    if (!candidate) return t("careers.apply.errors.resume")
    const lower = candidate.name.toLowerCase()
    if (!ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      return t("careers.apply.errors.resume_type")
    }
    if (candidate.size > MAX_FILE_BYTES) return t("careers.apply.errors.resume_size")
    return undefined
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const candidate = e.target.files?.[0] ?? null
    const error = validateFile(candidate)
    // 형식·용량이 어긋나면 붙잡아두지 않는다. 인라인 에러만 보여주고 비운다.
    if (candidate && error) {
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setErrors((prev) => ({ ...prev, resume: error }))
      return
    }
    setFile(candidate)
    setErrors((prev) => {
      const next = { ...prev }
      delete next.resume
      return next
    })
  }

  const clearFile = () => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = t("careers.apply.errors.name")
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = t("careers.apply.errors.email")
    }
    if (!form.phone.trim()) next.phone = t("careers.apply.errors.phone")
    if (!form.intro.trim()) next.intro = t("careers.apply.errors.intro")
    const fileError = validateFile(file)
    if (fileError) next.resume = fileError
    if (!consent) next.consent = t("careers.apply.errors.consent")
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    // TODO(백엔드): 여기서 multipart 로 지원서를 보낸다. 저장소·보관기간·동의문구가
    // 정해지기 전까지는 아무 데도 전송하지 않는다 (위 파일 상단 주석 참고).
    window.setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
    }, 600)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="apply-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(15,23,42,0.6)] px-4 py-6 backdrop-blur-[6px]"
          role="dialog"
          aria-modal="true"
          aria-label={t("careers.apply.title")}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          {/* 화면보다 폼이 길면 모달 안에서 스크롤한다. 바깥 컨테이너를 스크롤시키면
              items-center 가 넘치는 부분의 '위쪽'을 잘라먹어 제목에 손이 닿지 않는다. */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-h-full w-full max-w-[640px] overflow-y-auto rounded-[20px] border border-[var(--border-card)] bg-[var(--card-dark)] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.5)]"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label={t("careers.apply.close")}
              className="absolute right-4 top-4 z-10 rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            {submitted ? (
              <div className="flex flex-col items-center gap-5 px-6 py-14 text-center md:px-12">
                <CheckCircle2 className="h-12 w-12 text-[#5874ea]" />
                <h3 className="text-xl md:text-2xl font-bold text-[var(--text-heading)]">
                  {t("careers.apply.success_title")}
                </h3>
                <p className="whitespace-pre-line text-sm font-light leading-relaxed text-[var(--text-sub)] break-keep">
                  {t("careers.apply.success_desc")}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 rounded-full bg-[#5874ea] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5874ea]/90"
                >
                  {t("careers.apply.close")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 px-5 py-8 md:px-10 md:py-10">
                <div className="flex flex-col gap-2 pr-10">
                  <h3 className="text-xl md:text-2xl font-bold tracking-[-0.5px] text-[var(--text-heading)]">
                    {t("careers.apply.title")}
                  </h3>
                  <p className="text-sm font-light text-[var(--text-sub)] break-keep">
                    {t("careers.apply.subtitle")}
                  </p>
                </div>

                {/* 지원 포지션 — 선택한 공고가 자동으로 채워진다 */}
                <div className="space-y-1">
                  <label className="ml-1 mb-2 block text-sm font-semibold text-foreground/70">
                    {t("careers.apply.position")}
                  </label>
                  <input
                    name="position"
                    value={positionLabel}
                    readOnly
                    aria-readonly
                    className="w-full cursor-default rounded-2xl border border-[var(--border-card-strong)] bg-[var(--card-glass)] px-4 py-3 text-sm font-medium text-[var(--text-heading)]"
                  />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="ml-1 mb-2 block text-sm font-semibold text-foreground/70">
                      {t("careers.apply.name")}
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder={t("careers.apply.name_ph")}
                      className={inputClass(Boolean(errors.name))}
                    />
                    <FieldError message={errors.name} />
                  </div>
                  <div className="space-y-1">
                    <label className="ml-1 mb-2 block text-sm font-semibold text-foreground/70">
                      {t("careers.apply.email")}
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder={t("careers.apply.email_ph")}
                      className={inputClass(Boolean(errors.email))}
                    />
                    <FieldError message={errors.email} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="ml-1 mb-2 block text-sm font-semibold text-foreground/70">
                    {t("careers.apply.phone")}
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder={t("careers.apply.phone_ph")}
                    className={inputClass(Boolean(errors.phone))}
                  />
                  <FieldError message={errors.phone} />
                </div>

                <div className="space-y-1">
                  <label className="ml-1 mb-2 block text-sm font-semibold text-foreground/70">
                    {t("careers.apply.intro")}
                  </label>
                  <textarea
                    name="intro"
                    rows={4}
                    value={form.intro}
                    onChange={handleChange}
                    placeholder={t("careers.apply.intro_ph")}
                    className={`${inputClass(Boolean(errors.intro))} resize-none`}
                  />
                  <FieldError message={errors.intro} />
                </div>

                {/* 이력서 첨부 */}
                <div className="space-y-1">
                  <label className="ml-1 mb-2 block text-sm font-semibold text-foreground/70">
                    {t("careers.apply.resume")}
                  </label>
                  <div
                    className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 ${
                      errors.resume ? "border-red-500/30 ring-1 ring-red-500/10" : "border-border"
                    } bg-card/50`}
                  >
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--border-card-strong)] bg-[var(--card-glass)] px-4 py-2 text-xs font-medium text-[var(--text-heading)] transition-colors hover:border-primary/40"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {t("careers.apply.resume_button")}
                    </button>
                    <span className="min-w-0 flex-1 truncate text-xs font-light text-[var(--text-sub)]">
                      {file ? `${file.name} · ${formatSize(file.size)}` : t("careers.apply.resume_none")}
                    </span>
                    {file && (
                      <button
                        type="button"
                        onClick={clearFile}
                        className="shrink-0 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {t("careers.apply.resume_clear")}
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                  <p className="ml-1 mt-1 text-[11px] font-light text-muted-foreground">
                    {t("careers.apply.resume_hint")}
                  </p>
                  <FieldError message={errors.resume} />
                </div>

                {/* 개인정보 동의 */}
                <div className="space-y-1">
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--border-card)] bg-[var(--card-glass)] px-4 py-3">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => {
                        setConsent(e.target.checked)
                        setErrors((prev) => {
                          const next = { ...prev }
                          delete next.consent
                          return next
                        })
                      }}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#5874ea]"
                    />
                    <span className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-[var(--text-heading)]">
                        {t("careers.apply.consent")}
                      </span>
                      <span className="text-[11px] font-light leading-relaxed text-[var(--text-sub)] break-keep">
                        {t("careers.apply.consent_detail")}
                      </span>
                    </span>
                  </label>
                  <FieldError message={errors.consent} />
                </div>

                <p className="text-[11px] font-light text-muted-foreground">{t("careers.apply.mock_notice")}</p>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-[var(--border-card-strong)] px-6 py-3 text-sm font-semibold text-[var(--text-heading)] transition-colors hover:bg-muted/50"
                  >
                    {t("careers.apply.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5874ea] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5874ea]/90 disabled:opacity-70"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t("careers.apply.submit")}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
