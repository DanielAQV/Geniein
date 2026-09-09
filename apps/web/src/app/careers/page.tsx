import { fetchJobPostings } from "@/lib/careers/jobs"
import { CareersClient } from "./careers-client"

/**
 * 공고를 서버에서 읽어 클라이언트로 넘긴다.
 *
 * 화면은 지원 모달과 언어 컨텍스트 때문에 클라이언트 컴포넌트여야 하는데,
 * 데이터는 내부 주소(API_INTERNAL_URL)로 가져와야 해서 브라우저에서 부를 수
 * 없다. 그래서 셸만 서버로 두고 데이터를 prop 으로 내린다.
 */
/**
 * 정적 렌더를 시도하지 않는다.
 *
 * 공고는 `cache: "no-store"` 로 읽는다 — 어드민에서 등록한 게 바로 보여야
 * 한다. 그런데 그것만 두면 빌드 때 Next 가 이 라우트를 정적으로 만들려
 * 시도하다 DynamicServerError 를 던지고, fetchJobPostings 의 fail-soft
 * catch 가 그걸 "[careers] NestJS 호출 실패" 로 찍는다. API 는 멀쩡한데
 * 빌드 로그만 보면 장애처럼 읽힌다.
 *
 * 어차피 요청마다 새로 읽어야 하는 라우트이므로 의도를 명시한다.
 */
export const dynamic = "force-dynamic"

export default async function CareersPage() {
  const jobs = await fetchJobPostings()
  return <CareersClient jobs={jobs} />
}
