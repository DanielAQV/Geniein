/**
 * Teams 앱 패키지 빌드 — 템플릿 + 아이콘 → dist/
 *
 * ★ 매니페스트를 완성본으로 커밋하지 않는다. 안에 들어가는 값(테넌트 앱 ID,
 *   Application ID URI, 호스트)은 이미 `apps/api/.env` 에 있고, 저장소에 두 벌을
 *   두면 한쪽만 고치는 사고가 난다. 여기서 조립한다.
 *
 * 로컬 검증은 호스트만 바꿔서 같은 템플릿을 쓴다:
 *   CONTENT_HOST=https://xxxx.devtunnels.ms node build.mjs
 */

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIST = join(HERE, 'dist')
const API_ENV = join(HERE, '..', 'api', '.env')

/** 프로세스 환경이 우선. 없으면 apps/api/.env 에서 읽는다 (값의 단일 출처). */
function readConfig() {
  const fromFile = {}
  if (existsSync(API_ENV)) {
    for (const line of readFileSync(API_ENV, 'utf8').split(/\r?\n/)) {
      const match = /^([A-Z_]+)=(.*)$/.exec(line.trim())
      if (match) fromFile[match[1]] = match[2].trim()
    }
  }
  return (key) => process.env[key] || fromFile[key] || ''
}

const get = readConfig()

const clientId = get('ENTRA_CLIENT_ID')
const audience = get('ENTRA_API_AUDIENCE')
if (!clientId || !audience) {
  console.error(
    '중단: ENTRA_CLIENT_ID / ENTRA_API_AUDIENCE 가 필요합니다.\n' +
      `      apps/api/.env 에 넣거나 환경변수로 주세요.`,
  )
  process.exit(1)
}

/**
 * 호스트가 둘이고, 섞으면 안 된다.
 *
 *   serviceHost   서비스가 실제로 사는 곳. Application ID URI 에서 유도한다
 *                 (`api://genie.geniein.com/<clientId>`). **터널을 따라가지 않는다.**
 *   contentHost   탭 콘텐츠를 지금 어디서 받아올지. 터널 검증 때만 달라진다.
 *
 * ★ 게시자(AirQuay Vina)와 서비스(Geniein)가 다른 주체다. developer 블록의
 *   링크는 서비스 쪽을 가리켜야 하고, 임시 터널 주소가 회사 사이트로 박히면 안 된다.
 *   contentUrl / validDomains 만 contentHost 를 따른다.
 */
const domainFromAudience = audience.replace(/^api:\/\//, '').split('/')[0]
const serviceHost = `https://${domainFromAudience}`
const contentHost = (get('CONTENT_HOST') || serviceHost).replace(/\/+$/, '')
const contentDomain = contentHost.replace(/^https?:\/\//, '')

/**
 * ★ Teams 는 **이미 올라간 앱과 같은 버전**을 거부한다:
 *   "이 업데이트에는 새 앱 버전 번호가 필요합니다."
 *
 * 터널로 반복 업로드하는 동안 이걸 손으로 올리면 매번 걸린다. 그래서 개발
 * 빌드(CONTENT_HOST 를 준 경우)는 번호를 자동으로 만든다:
 *
 *     0.<2026-01-01 이후 경과 일>.<그날의 경과 분>      예: 0.227.969
 *
 * 항상 이전보다 크다 — 하루 안에서는 분이 오르고, 날이 바뀌면 minor 가 오른다
 * (semver 는 minor 를 patch 보다 먼저 비교하므로 patch 가 0 으로 돌아가도 크다).
 * 상태를 저장하지 않는다.
 *
 * ★★ major 가 **0** 인 것이 중요하다. 처음엔 `1.<일>.<분>` 을 썼는데, 그러면 개발
 *    번호가 운영 번호(1.0.0)보다 커져서 **운영 빌드를 영원히 올릴 수 없게 된다.**
 *    Teams 는 이전보다 큰 번호만 받기 때문이다. 0 번대로 내려 두면 개발 번호가
 *    아무리 올라가도 1.0.0 아래에 머문다.
 *
 *    (이미 1.x 개발 번호를 올려 둔 상태라면 운영 전환 시 앱을 한 번 제거하고
 *     다시 설치해야 한다. 번호를 되돌릴 방법은 없다.)
 *
 * ★ 처음엔 경과 분을 patch 하나에 다 넣어 1.0.327429 같은 값을 썼는데, Teams 가
 *   그래도 "새 앱 버전 번호가 필요합니다" 를 냈다. 스키마에는 자릿수 제한이 없지만
 *   (maxLength 256 + semver 가 전부) 업로드 검증기는 별개다. 세 칸으로 나눠
 *   각 칸을 3~4 자리로 유지한다 — 관례적인 모양이라 걸릴 여지가 없다.
 *
 * 운영 빌드는 RELEASE_VERSION 을 그대로 쓴다. 자동 번호가 운영에 새어 나가면
 * 버전이 시각이 되어 버려 무엇이 배포됐는지 말할 수 없게 된다.
 */
const RELEASE_VERSION = '1.0.0'
const DEV_EPOCH = Date.UTC(2026, 0, 1)

function resolveVersion() {
  const explicit = get('TEAMS_APP_VERSION')
  if (explicit) return { version: explicit, why: 'TEAMS_APP_VERSION 지정' }
  if (get('CONTENT_HOST')) {
    const elapsedMinutes = Math.floor((Date.now() - DEV_EPOCH) / 60_000)
    const days = Math.floor(elapsedMinutes / 1440)
    const minutesIntoDay = elapsedMinutes % 1440
    return {
      version: `0.${days}.${minutesIntoDay}`,
      why: '개발 빌드 — 재업로드마다 자동 증가',
    }
  }
  return { version: RELEASE_VERSION, why: '운영 빌드' }
}

const { version, why } = resolveVersion()

const values = {
  APP_VERSION: version,
  ENTRA_CLIENT_ID: clientId,
  ENTRA_API_AUDIENCE: audience,
  CONTENT_HOST: contentHost,
  CONTENT_DOMAIN: contentDomain,
  // developer 블록은 serviceHost 기준이다 — 터널을 따라가면 안 된다 (위 주석)
  WEBSITE_URL: get('TEAMS_WEBSITE_URL') || serviceHost,
  PRIVACY_URL: get('TEAMS_PRIVACY_URL') || `${serviceHost}/privacy`,
  TERMS_URL: get('TEAMS_TERMS_URL') || `${serviceHost}/terms`,
}

let manifest = readFileSync(join(HERE, 'manifest.template.json'), 'utf8')
manifest = manifest.replace(/\$\{([A-Z_]+)\}/g, (whole, key) => {
  if (!(key in values)) {
    console.error(`중단: 템플릿의 \${${key}} 를 채울 값이 없습니다`)
    process.exit(1)
  }
  return values[key]
})

// 조립 결과가 유효한 JSON 인지 확인하고 나간다. 매니페스트가 깨지면 Teams 는
// "앱 패키지가 올바르지 않습니다" 한 줄만 말하고 어디가 문제인지 알려주지 않는다.
JSON.parse(manifest)

mkdirSync(DIST, { recursive: true })
writeFileSync(join(DIST, 'manifest.json'), manifest)
for (const icon of ['color.png', 'outline.png']) copyFileSync(join(HERE, icon), join(DIST, icon))

console.log('dist/ 생성 완료')
console.log(`  버전       ${version}   (${why})`)
console.log(`  앱 ID      ${clientId}`)
console.log(`  콘텐츠 호스트 ${contentHost}${contentHost === serviceHost ? '' : '  (터널)'}`)
console.log(`  서비스 링크 ${values.WEBSITE_URL}  (게시자 AirQuay Vina, 서비스 Geniein)`)
console.log(`  리소스     ${audience}`)
console.log('')
console.log('업로드용 zip 만들기 (파일 3개가 zip 최상위에 있어야 한다):')
console.log(
  '  PowerShell  Compress-Archive -Path dist\\* -DestinationPath dist\\teams-app.zip -Force',
)
console.log('  bash        (cd dist && zip -r teams-app.zip manifest.json color.png outline.png)')
