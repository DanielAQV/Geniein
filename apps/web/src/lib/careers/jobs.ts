/**
 * 채용 공고 데이터 소스. NestJS 의 공개 목록(`GET /careers`)을 읽는다.
 *
 * 예전에는 dictionary 의 더미 공고를 읽었다. 그래서 어드민에서 등록해도
 * 공개 페이지에는 아무것도 안 떴다 — 쓰는 곳과 읽는 곳이 달랐다.
 *
 * ★ 서버에서만 부른다. 내부 주소(127.0.0.1:3001)라 브라우저에서는
 *   닿지 않고, nginx 의 /api/ 규칙에 얽히지 않는 것도 이 편이 낫다.
 *
 * ★ 실패하면 빈 배열을 준다. 회사 소개 사이트의 채용 섹션이 API 사정으로
 *   500 을 내면 안 된다. JobBoard 가 공고 0건이면 섹션을 통째로 감춘다.
 */

import { apiUpstream } from "@/lib/api-upstream"

export type Lang = "kr" | "en" | "vn"

/**
 * 채용 텍스트. KR 만 필수고 EN/VN 은 비어 있을 수 있다 —
 * admin 에서 한국어만 쓰고 올리는 경우가 정상 경로다.
 */
export type Localized = { kr: string; en?: string | null; vn?: string | null }

/**
 * 언어 선택 + KR 폴백.
 *
 * ★ 전역 `t()` 를 고치지 않는다. 폴백은 채용 데이터에만 적용되는 규칙이고,
 *   사이트 전체 사전은 3개 언어가 다 채워져 있는 걸 전제로 하기 때문에
 *   거기에 폴백을 넣으면 빠진 번역이 조용히 한국어로 나가버린다.
 */
export function pick(field: Localized, lang: Lang): string {
  return field[lang] || field.kr
}

export type JobPosting = {
  id: string
  /** 필터용 안정 키. 표시 문구(department)와 분리해 언어가 바뀌어도 필터가 유지된다. */
  departmentKey: string
  locationKey: string
  /** 카드 뱃지로만 쓴다. 필터 축에서는 쓰지 않는다. */
  employmentKey: string
  /** ISO 날짜(2026-10-31) 또는 상시 채용을 뜻하는 "rolling" */
  deadline: string
  title: Localized
  department: Localized
  location: Localized
  employment: Localized
  experience: Localized
  /** 공고 본문(산문). 비어 있으면 null — 화면에서 블록을 안 그린다. */
  description: Localized | null
  tags: Localized[]
  responsibilities: Localized[]
  requirements: Localized[]
  preferred: Localized[]
}

/** 상시 채용을 표현하는 deadline 값. */
export const ROLLING_DEADLINE = "rolling"

/** 근무지 키 → 국기 이미지. header.tsx 가 이미 쓰는 flagcdn 을 그대로 재사용한다. */
export const LOCATION_FLAGS: Record<string, string> = {
  korea: "https://flagcdn.com/w40/kr.png",
  vietnam: "https://flagcdn.com/w40/vn.png",
  philippines: "https://flagcdn.com/w40/ph.png",
}

const localized = (value: Localized): Localized => ({ ...value })

/**
 * NestJS 가 돌려주는 공고 한 건. 엔티티를 그대로 직렬화한 모양이라
 * 표시 문구가 언어별 컬럼으로, 목록이 언어별 병렬 배열로 온다.
 */
type ApiJobPosting = {
  id: string
  department_key: string
  location_key: string
  employment_type: string
  /** NULL = 상시 채용. 프론트의 ROLLING_DEADLINE 으로 바꿔서 넘긴다. */
  deadline: string | null
  title_kr: string
  title_en: string | null
  title_vn: string | null
  department_kr: string
  department_en: string | null
  department_vn: string | null
  location_kr: string
  location_en: string | null
  location_vn: string | null
  employment_kr: string
  employment_en: string | null
  employment_vn: string | null
  experience_kr: string
  experience_en: string | null
  experience_vn: string | null
  description_kr: string | null
  description_en: string | null
  description_vn: string | null
  tags_kr: string[]
  tags_en: string[] | null
  tags_vn: string[] | null
  responsibilities_kr: string[]
  responsibilities_en: string[] | null
  responsibilities_vn: string[] | null
  requirements_kr: string[]
  requirements_en: string[] | null
  requirements_vn: string[] | null
  preferred_kr: string[]
  preferred_en: string[] | null
  preferred_vn: string[] | null
}

const text = (kr: string, en: string | null, vn: string | null): Localized => ({ kr, en, vn })

/**
 * 자유 서술 칸. `text()` 와 갈라 둔 이유는 **여기만 KR 이 NULL 일 수 있다**는
 * 것이다(엔티티 주석 참고). 비면 null 을 줘서 JobBoard 가 블록을 통째로 뺀다.
 *
 * KR 이 비었으면 EN/VN 이 있어도 null 로 접는다 — `pick` 이 KR 우선 폴백이라,
 * 한국어로 보는 사람에게 영어 본문만 뜨는 쪽이 안 뜨는 쪽보다 나쁘다.
 */
const prose = (kr: string | null, en: string | null, vn: string | null): Localized | null =>
  kr && kr.trim() ? { kr, en, vn } : null

/**
 * 언어별 병렬 배열을 인덱스로 묶는다. KR 이 기준이다 — DB 에서 KR 만
 * NOT NULL 이고, 어드민이 언어별 textarea 를 줄 단위로 나눠 보낸다.
 * EN/VN 이 짧으면 그 줄만 KR 로 폴백된다(`pick`).
 */
const list = (kr: string[], en: string[] | null, vn: string[] | null): Localized[] =>
  (kr ?? []).map((value, index) => ({
    kr: value,
    en: en?.[index] ?? null,
    vn: vn?.[index] ?? null,
  }))

function adapt(row: ApiJobPosting): JobPosting {
  return {
    id: row.id,
    departmentKey: row.department_key,
    locationKey: row.location_key,
    employmentKey: row.employment_type,
    deadline: row.deadline ?? ROLLING_DEADLINE,
    title: text(row.title_kr, row.title_en, row.title_vn),
    department: text(row.department_kr, row.department_en, row.department_vn),
    location: text(row.location_kr, row.location_en, row.location_vn),
    employment: text(row.employment_kr, row.employment_en, row.employment_vn),
    experience: text(row.experience_kr, row.experience_en, row.experience_vn),
    description: prose(row.description_kr, row.description_en, row.description_vn),
    tags: list(row.tags_kr, row.tags_en, row.tags_vn),
    responsibilities: list(row.responsibilities_kr, row.responsibilities_en, row.responsibilities_vn),
    requirements: list(row.requirements_kr, row.requirements_en, row.requirements_vn),
    preferred: list(row.preferred_kr, row.preferred_en, row.preferred_vn),
  }
}

export async function fetchJobPostings(): Promise<JobPosting[]> {
  let response: Response
  try {
    // 어드민에서 등록한 공고가 바로 보여야 한다 — 캐시하지 않는다.
    response = await fetch(`${apiUpstream()}/careers`, { cache: "no-store" })
  } catch (error) {
    console.error("[careers] NestJS 호출 실패:", error)
    return []
  }

  if (!response.ok) {
    console.error("[careers] NestJS 응답 %d", response.status)
    return []
  }

  try {
    const rows = (await response.json()) as ApiJobPosting[]
    return Array.isArray(rows) ? rows.map(adapt) : []
  } catch (error) {
    console.error("[careers] 응답을 읽지 못했습니다:", error)
    return []
  }
}
