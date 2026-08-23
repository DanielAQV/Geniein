import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DIST = join(HERE, 'dist')
const API_ENV = join(HERE, '..', 'api', '.env')

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

// 호스트가 둘이다. serviceHost 는 Application ID URI 에서 유도하며 터널을 따라가지
// 않는다 (developer 블록이 임시 터널 주소를 가리키면 안 된다). contentUrl 과
// validDomains 만 contentHost 를 따른다.
const domainFromAudience = audience.replace(/^api:\/\//, '').split('/')[0]
const serviceHost = `https://${domainFromAudience}`
const contentHost = (get('CONTENT_HOST') || serviceHost).replace(/\/+$/, '')
const contentDomain = contentHost.replace(/^https?:\/\//, '')

// Teams 는 이미 올라간 앱과 같은 버전을 거부하므로 개발 빌드는 번호를 자동 생성한다:
//   0.<2026-01-01 이후 경과 일>.<그날의 경과 분>   예: 0.227.969
// major 가 0 인 것이 중요하다 — 1.x 로 두면 개발 번호가 운영 번호(1.0.0)를 넘어서
// 운영 빌드를 영원히 못 올린다. 세 칸으로 나누는 것도 필수다 (업로드 검증기가
// 1.0.327429 같은 값을 거부한다).
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

// 조립 결과가 유효한 JSON 인지 확인한다. 깨지면 Teams 는 "앱 패키지가 올바르지
// 않습니다" 한 줄만 말하고 어디가 문제인지 알려주지 않는다.
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
