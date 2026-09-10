"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Briefcase, CalendarDays, ChevronDown, MapPin, RotateCcw, UserRound } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { cn } from "@/lib/utils"
import {
  LOCATION_FLAGS,
  ROLLING_DEADLINE,
  pick,
  type JobPosting,
  type Lang,
  type Localized,
} from "@/lib/careers/jobs"

type FilterOption = { key: string; label: Localized }
type SelectableOption = FilterOption & { disabled: boolean }

const ALL = "all"

/** 공고 배열에서 필터 후보를 뽑는다. 공고가 API 로 바뀌어도 필터는 자동으로 따라온다. */
function optionsOf(
  jobs: JobPosting[],
  keyOf: (job: JobPosting) => string,
  labelOf: (job: JobPosting) => Localized,
): FilterOption[] {
  const seen = new Map<string, Localized>()
  for (const job of jobs) {
    const key = keyOf(job)
    if (!seen.has(key)) seen.set(key, labelOf(job))
  }
  return Array.from(seen, ([key, label]) => ({ key, label }))
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: SelectableOption[]
  value: string
  onChange: (next: string) => void
}) {
  const { t, language } = useLanguage()

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
      <span className="shrink-0 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground md:w-[92px]">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {[{ key: ALL, label: null, disabled: false }, ...options].map((option) => {
          const active = value === option.key
          return (
            <button
              key={option.key}
              type="button"
              disabled={option.disabled}
              onClick={() => onChange(option.key)}
              aria-pressed={active}
              className={cn(
                "rounded-full border px-[17px] py-[7px] text-xs font-medium transition-colors duration-300",
                active
                  ? "border-[#5874ea] bg-[#5874ea] text-white"
                  : option.disabled
                    ? "cursor-not-allowed border-[var(--border-card)] bg-transparent text-[var(--text-sub)]/60"
                    : "border-[var(--border-card-strong)] bg-[var(--card-glass)] text-[var(--text-heading)] hover:border-primary/40",
              )}
            >
              {option.label ? pick(option.label, language) : t("careers.jobs.filter_all")}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DetailList({ title, items, language }: { title: string; items: Localized[]; language: Lang }) {
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-[#5874ea]">{title}</h4>
      <ul className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2 text-sm font-light leading-relaxed text-[var(--text-sub)] break-keep">
            <span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-[#5874ea]" />
            <span>{pick(item, language)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function JobBoard({ jobs, onApply }: { jobs: JobPosting[]; onApply: (job: JobPosting) => void }) {
  const { t, language } = useLanguage()
  const [department, setDepartment] = useState(ALL)
  const [location, setLocation] = useState(ALL)
  const [expanded, setExpanded] = useState<string | null>(null)

  const matches = (job: JobPosting, dept: string, loc: string) =>
    (dept === ALL || job.departmentKey === dept) && (loc === ALL || job.locationKey === loc)

  /**
   * 다른 축의 현재 선택을 기준으로 각 옵션의 결과 건수를 미리 센다.
   * 0건이 되는 옵션은 눌리지 않게 막는다 — 그래야 "결과 없음" 상태에
   * 도달하는 경로 자체가 사라진다. 빈 화면에 "공고가 없습니다"를 띄우는 것보다
   * 애초에 그 조합을 못 고르게 하는 편이 낫다.
   */
  const departments: SelectableOption[] = useMemo(
    () =>
      optionsOf(jobs, (j) => j.departmentKey, (j) => j.department).map((option) => ({
        ...option,
        disabled: !jobs.some((job) => matches(job, option.key, location)),
      })),
    [jobs, location],
  )

  const locations: SelectableOption[] = useMemo(
    () =>
      optionsOf(jobs, (j) => j.locationKey, (j) => j.location).map((option) => ({
        ...option,
        disabled: !jobs.some((job) => matches(job, department, option.key)),
      })),
    [jobs, department],
  )

  // 선택지가 하나뿐인 축은 필터가 아니다. 줄 전체를 감춘다.
  //
  // 부문은 분류 체계가 확정되기 전까지 필터 축으로 쓰지 않는다. 지금 값들은
  // 공고를 만들며 임시로 붙인 것이라 필터로 노출하면 "이게 우리 조직 부문" 처럼
  // 읽힌다. 확정되면 SHOW_DEPARTMENT_FILTER 만 true 로 되돌리면 된다.
  const SHOW_DEPARTMENT_FILTER = false
  const showDepartments = SHOW_DEPARTMENT_FILTER && departments.length > 1
  const showLocations = locations.length > 1

  const filtered = useMemo(
    () => jobs.filter((job) => matches(job, department, location)),
    [jobs, department, location],
  )

  const dirty = department !== ALL || location !== ALL

  const reset = () => {
    setDepartment(ALL)
    setLocation(ALL)
  }

  // "총 {count}건의 공고" — 언어마다 숫자 위치가 달라서 템플릿을 쪼개 쓴다.
  // (t() 는 빈 문자열을 '키 없음'으로 취급하므로 접두/접미를 따로 두면 안 된다)
  const [countBefore, countAfter = ""] = t("careers.jobs.count_template").split("{count}")

  // 공고가 하나도 없으면(admin 에서 전부 내렸을 때) 섹션 헤더까지 통째로 안 그린다.
  // 빈 리스트를 보여주느니 없는 편이 낫다 — 하단 일반 지원 CTA 는 그대로 남는다.
  if (jobs.length === 0) return null

  return (
    <section id="positions" className="py-14 md:py-20 lg:py-28 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-8 md:mb-12 lg:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1 rounded-sm border border-primary/30 bg-primary/5"
          >
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary">
              {t("careers.jobs.label")}
            </span>
          </motion.div>
          <h2 className="mt-4 md:mt-6 text-[28px] tracking-[-0.6px] md:text-4xl lg:text-5xl lg:tracking-tighter font-bold text-foreground leading-tight">
            {t("careers.jobs.title")}
          </h2>
          <p className="mt-4 md:mt-6 text-sm leading-[23px] md:text-base lg:text-[18px] text-muted-foreground font-light lg:leading-relaxed break-keep whitespace-pre-line">
            {t("careers.jobs.desc")}
          </p>
        </div>

        {/* Filters — 부문 · 근무지 2축만 쓴다. 고용형태는 카드 뱃지로만 보여준다 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col gap-5 rounded-[20px] border border-[var(--border-card)] bg-[var(--card-dark)] p-5 md:p-8 shadow-md"
        >
          {showDepartments && (
            <FilterRow
              label={t("careers.jobs.filter_department")}
              options={departments}
              value={department}
              onChange={setDepartment}
            />
          )}
          {showLocations && (
            <FilterRow
              label={t("careers.jobs.filter_location")}
              options={locations}
              value={location}
              onChange={setLocation}
            />
          )}

          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-3",
              (showDepartments || showLocations) && "border-t border-border/30 pt-5",
            )}
          >
            <span className="text-sm font-medium text-[var(--text-heading)]">
              {countBefore}
              <span className="text-[#5874ea]">{filtered.length}</span>
              {countAfter}
            </span>
            {dirty && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t("careers.jobs.filter_reset")}
              </button>
            )}
          </div>
        </motion.div>

        {/* Job list */}
        {/* 0건 상태에는 도달할 수 없다(위 필터가 막는다). 혹시 남더라도
            "공고가 없습니다" 같은 문구는 두지 않고 조용히 아무것도 그리지 않는다. */}
        <div className="mt-6 flex flex-col gap-4 md:mt-8 md:gap-5">
          {filtered.map((job, index) => {
              const open = expanded === job.id
              const flag = LOCATION_FLAGS[job.locationKey]
              return (
                <motion.article
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(index, 4) * 0.08 }}
                  className={cn(
                    "overflow-hidden rounded-[20px] border bg-[var(--card-dark)] shadow-md transition-all duration-500",
                    open ? "border-primary/40 shadow-lg" : "border-[var(--border-card)] hover:border-primary/40 hover:shadow-lg",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : job.id)}
                    aria-expanded={open}
                    className="flex w-full flex-col gap-5 px-5 py-6 text-left md:px-8 md:py-8"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#5874ea]">
                          {pick(job.department, language)}
                        </span>
                        <h3 className="text-[20px] md:text-2xl lg:text-[28px] font-bold leading-snug tracking-[-0.5px] text-[var(--text-heading)] break-keep">
                          {pick(job.title, language)}
                        </h3>
                      </div>
                      <span
                        aria-hidden
                        className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-card-strong)] bg-[var(--card-glass)] text-[var(--text-heading)]"
                      >
                        <ChevronDown
                          className={cn("h-4 w-4 transition-transform duration-300", open && "rotate-180")}
                        />
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-light text-[var(--text-sub)]">
                      <span className="inline-flex items-center gap-2">
                        {flag ? (
                          <img
                            src={flag}
                            alt=""
                            aria-hidden
                            className="h-[14px] w-5 rounded-sm object-cover border border-white/5"
                          />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                        {pick(job.location, language)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        {pick(job.employment, language)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <UserRound className="h-4 w-4" />
                        {pick(job.experience, language)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {t("careers.jobs.deadline_label")}
                        {" · "}
                        {job.deadline === ROLLING_DEADLINE ? t("careers.jobs.rolling") : job.deadline}
                      </span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                      {job.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="rounded-full border border-[var(--border-card-strong)] bg-[var(--card-glass)] px-[17px] py-[7px] text-xs font-medium text-[var(--text-heading)]"
                        >
                          {pick(tag, language)}
                        </span>
                      ))}
                    </div>
                  </button>

                  {/* Detail — 라우트를 추가하지 않고 카드 안에서 펼친다 */}
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border/30 px-5 py-6 md:px-8 md:py-8">
                          {/* 공고 본문. 줄바꿈을 살리고(`whitespace-pre-line`) 읽는
                              폭을 70글자로 묶는다 — 넓은 화면에서 한 줄이 1,000px
                              넘게 늘어나면 산문은 못 읽는다. */}
                          {job.description && (
                            <p className="mb-8 max-w-[70ch] whitespace-pre-line text-sm font-light leading-relaxed text-[var(--text-sub)] break-keep">
                              {pick(job.description, language)}
                            </p>
                          )}

                          <div className="grid gap-8 lg:grid-cols-3">
                            <DetailList
                              title={t("careers.jobs.responsibilities")}
                              items={job.responsibilities}
                              language={language}
                            />
                            <DetailList
                              title={t("careers.jobs.requirements")}
                              items={job.requirements}
                              language={language}
                            />
                            <DetailList
                              title={t("careers.jobs.preferred")}
                              items={job.preferred}
                              language={language}
                            />
                          </div>

                          <div className="mt-8 flex justify-start">
                            <button
                              type="button"
                              onClick={() => onApply(job)}
                              className="inline-flex items-center rounded-full bg-[#5874ea] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5874ea]/90"
                            >
                              {t("careers.jobs.apply")}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
