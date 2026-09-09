/**
 * 채용 공고 데이터 소스.
 *
 * 지금은 목업이라 dictionary 의 더미 공고를 읽지만, 컴포넌트는 `JobPosting[]` 만
 * 받는다. admin 이 붙으면 이 파일의 `getJobPostings()` 하나만
 * `fetch('/api/careers')` 로 바꾸면 화면 코드는 손대지 않아도 된다.
 */

import { dictionary } from "@/lib/i18n/dictionary"

/** kr/en/vn 3개 언어를 담는 텍스트. dictionary 의 다른 블록과 같은 모양이다. */
export type Localized = { kr: string; en: string; vn: string }

export type JobPosting = {
  id: string
  /** 필터용 안정 키. 표시 문구(department)와 분리해 언어가 바뀌어도 필터가 유지된다. */
  departmentKey: string
  locationKey: string
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
