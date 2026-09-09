/**
 * 채용 공고 데이터 소스.
 *
 * 지금은 목업이라 dictionary 의 더미 공고를 읽지만, 컴포넌트는 `JobPosting[]` 만
 * 받는다. admin 이 붙으면 이 파일의 `getJobPostings()` 하나만
 * `fetch('/api/careers')` 로 바꾸면 화면 코드는 손대지 않아도 된다.
 */

import { dictionary } from "@/lib/i18n/dictionary"

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
  tags: Localized[]
  responsibilities: Localized[]
  requirements: Localized[]
  preferred: Localized[]
}

/** 상시 채용을 표현하는 deadline 값. */
export const ROLLING_DEADLINE = "rolling"

/** 근무지 키 → 국기 이미지. header.tsx 가 이미 쓰는 flagcdn 을 그대로 재사용한다. */
export const LOCATION_FLAGS: Record<string, string> = {
  seongnam: "https://flagcdn.com/w40/kr.png",
  hanoi: "https://flagcdn.com/w40/vn.png",
}

const localized = (value: Localized): Localized => ({ ...value })

export function getJobPostings(): JobPosting[] {
  return dictionary.careers.items.map((item) => ({
    id: item.id,
    departmentKey: item.department_key,
    locationKey: item.location_key,
    employmentKey: item.employment_key,
    deadline: item.deadline,
    title: localized(item.title),
    department: localized(item.department),
    location: localized(item.location),
    employment: localized(item.employment),
    experience: localized(item.experience),
    tags: item.tags.map(localized),
    responsibilities: item.responsibilities.map(localized),
    requirements: item.requirements.map(localized),
    preferred: item.preferred.map(localized),
  }))
}
