import { fetchJobPostings } from "@/lib/careers/jobs"
import { CareersClient } from "./careers-client"

/**
 * 공고를 서버에서 읽어 클라이언트로 넘긴다.
 *
 * 화면은 지원 모달과 언어 컨텍스트 때문에 클라이언트 컴포넌트여야 하는데,
 * 데이터는 내부 주소(API_INTERNAL_URL)로 가져와야 해서 브라우저에서 부를 수
 * 없다. 그래서 셸만 서버로 두고 데이터를 prop 으로 내린다.
 */
export default async function CareersPage() {
  const jobs = await fetchJobPostings()
  return <CareersClient jobs={jobs} />
}
