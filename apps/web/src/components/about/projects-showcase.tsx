"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/i18n/language-context"
import { dictionary } from "@/lib/i18n/dictionary"

/**
 * 프로젝트 포트폴리오 — 국가 탭 + 2단 컴팩트 카드.
 *
 * 전체폭 1단으로 9건을 쌓으면 이 섹션 하나가 2,900px 가 된다. 그렇다고 캐러셀로
 * 가면 한 번에 1건만 보이는데, 이 페이지 방문자(발주처·파트너)의 질문은
 * "우리 나라·우리 분야로 해봤나" 라서 둘러보기가 아니라 찾기다. 숨기면 안 된다.
 *
 * 그래서 개수가 아니라 카드 폭을 줄이고, 국가 탭으로 한 번에 최대 4건만 그린다.
 * 기본 탭을 "전체" 가 아니라 건수가 가장 많은 국가로 두는 이유가 여기 있다 —
 * 전체를 기본으로 하면 9건이 다 깔려 길이 문제가 그대로 돌아온다. 대신 헤더의
 * "총 9건 · 4개국" 한 줄과 탭별 건수가 규모를 대신 말해준다.
 *
 * 사업목적은 접지 않고 카드에 그대로 노출한다. 한 번 더 클릭해야 보이면
 * 사실상 안 읽히고, 이 문구가 실적을 판단하는 근거라 감출 이유가 없다.
 */
const ALL = "__all__"

export function ProjectsShowcase() {
  const { t, language } = useLanguage()
  const projects = dictionary.about.projects.items
  const countryNames = dictionary.about.projects.countries

  // 탭 계산이 아래에 있어 초기값을 여기서 못 정한다. null 은 "아직 안 정함" 이고,
  // 실제 기본값은 tabs 가 정해진 뒤 defaultCountry 로 결정한다.
  const [activeCountry, setActiveCountry] = useState<string | null>(null)

  // 탭은 데이터에서 뽑는다 — 사업이 추가돼도 따라온다.
  // 건수 많은 국가부터, 같으면 먼저 등장한 순서.
  const tabs = useMemo(() => {
    const counts = new Map<string, { count: number; firstIndex: number }>()
    projects.forEach((project, index) => {
      const entry = counts.get(project.country)
      if (entry) entry.count += 1
      else counts.set(project.country, { count: 1, firstIndex: index })
    })
    return [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count || a[1].firstIndex - b[1].firstIndex)
      .map(([code, { count }]) => ({ code, count }))
  }, [projects])

  const selected = activeCountry ?? tabs[0]?.code ?? ALL
  const visible =
    selected === ALL
      ? projects
      : projects.filter((project) => project.country === selected)

  const summary = t('about.projects.summary')
    .replace('{count}', String(projects.length))
    .replace('{countries}', String(tabs.length))

  return (
    <section id="projects" className="py-14 md:py-20 lg:py-28 relative bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-8 md:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center justify-center rounded-full border border-primary/30 bg-primary/5 px-[17px] py-[5px]"
          >
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary">
              {t('about.projects.label')}
            </span>
          </motion.div>
          <h2 className="mt-4 md:mt-6 text-[28px] tracking-[-0.6px] md:text-4xl lg:text-5xl md:tracking-tight font-bold text-foreground leading-tight">
            {t('about.projects.title')}
          </h2>
          <p className="mt-4 md:mt-6 text-sm md:text-base lg:text-lg text-muted-foreground font-light leading-relaxed break-keep whitespace-pre-line">
            {t('about.projects.desc')}
          </p>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.15em] text-primary">
            {summary}
          </p>
        </div>

        {/* 국가 필터 */}
        <div className="mb-8 flex flex-wrap justify-center gap-2 md:mb-10">
          {tabs.map(({ code, count }) => (
            <FilterChip
              key={code}
              active={selected === code}
              onClick={() => setActiveCountry(code)}
              label={countryNames[code as keyof typeof countryNames][language]}
              count={count}
              flag={code}
            />
          ))}
          <FilterChip
            active={selected === ALL}
            onClick={() => setActiveCountry(ALL)}
            label={t('about.projects.filter_all')}
            count={projects.length}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {visible.map((project, index) => (
            <motion.article
              key={`${selected}-${index}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index, 3) * 0.05 }}
              className="group relative flex flex-col overflow-hidden rounded-[20px] border border-[var(--border-card)] bg-[var(--card-dark)] shadow-md transition-all duration-500 hover:shadow-lg hover:border-primary/40"
            >
              {/* 사진 + 수행 국가. 사진이 없는 사업은 대체 패널을 그린다 —
                  아무 스톡이나 채우는 것보다 비어 보이지 않으면서 정직하다. */}
              <div className="relative h-40 w-full overflow-hidden bg-[var(--card-glass)] md:h-44">
                {project.image ? (
                  <>
                    <img
                      src={project.image}
                      alt={project.title[language]}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[var(--card-dark)]/80 via-transparent to-transparent" />
                  </>
                ) : (
                  <FallbackPanel />
                )}
                <div className="absolute right-4 top-4 rounded-xl border border-[var(--border-card-strong)] bg-[var(--card-glass)] p-2 shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)] backdrop-blur-sm">
                  <img
                    src={`https://flagcdn.com/w80/${project.country}.png`}
                    alt={project.country.toUpperCase()}
                    className="h-5 w-[30px] rounded-[3px] object-cover"
                  />
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-6">
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#5874ea]">
                  {project.category[language]}
                </span>
                <h3 className="text-base md:text-lg font-bold leading-snug tracking-[-0.2px] text-[var(--text-heading)] break-keep">
                  {project.title[language]}
                </h3>
                {language !== "en" && (
                  <p className="text-[11px] font-light leading-relaxed text-[var(--text-sub)]/60">
                    {project.official}
                  </p>
                )}
                <p className="mt-3 border-t border-border/30 pt-3 text-sm font-light leading-relaxed text-[var(--text-sub)] break-keep whitespace-pre-line">
                  {project.description[language]}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * 사진이 아직 없는 사업·거점용 패널.
 * 히어로 섹션의 블루프린트 그리드와 같은 결로 맞춰 "준비 중" 이 아니라
 * 의도된 디자인으로 읽히게 한다. 사진이 생기면 image 만 채우면 된다.
 */
export function FallbackPanel() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--card-glass)] to-[var(--card-dark)]">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, var(--border-card-strong) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, var(--border-card-strong) 0 1px, transparent 1px 40px)" }}
      />
      <img
        src="/logo.png"
        alt=""
        className="relative h-9 w-9 rounded-lg opacity-30 transition-transform duration-700 group-hover:scale-110"
      />
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  flag,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  flag?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-[var(--border-card-strong)] bg-[var(--card-glass)] text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {flag && (
        <img
          src={`https://flagcdn.com/w40/${flag}.png`}
          alt=""
          className="h-3.5 w-5 rounded-[2px] object-cover"
        />
      )}
      {label}
      <span className={cn("text-xs", active ? "text-primary" : "text-muted-foreground/60")}>
        {count}
      </span>
    </button>
  )
}
