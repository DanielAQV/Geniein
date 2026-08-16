/**
 * 생성된 매니페스트를 Microsoft 가 게시한 **실제 스키마**와 대조한다.
 *
 *   node build.mjs && node validate.mjs
 *
 * 손으로 훑는 것으로는 안 된다. 스키마가 `additionalProperties: false` 라서
 * 필드 이름 하나가 틀리거나 옛 버전 필드가 남아 있으면 패키지 전체가 거부되는데,
 * Teams 는 "앱 패키지가 올바르지 않습니다" 한 줄만 말하고 어디가 문제인지
 * 알려주지 않는다. (실제로 이 검사가 구버전 필드 `packageName` 을 잡아냈다.)
 *
 * 스키마를 받아 오므로 네트워크가 필요하다.
 */
import { readFileSync } from 'node:fs'

const m = JSON.parse(readFileSync(process.argv[2] ?? new URL('dist/manifest.json', import.meta.url), 'utf8'))
const res = await fetch(m.$schema)
if (!res.ok) {
  console.error('스키마 받기 실패', res.status)
  process.exit(1)
}
const s = await res.json()

let ok = true
const say = (pass, label) => {
  if (!pass) ok = false
  console.log((pass ? ' PASS ' : ' FAIL ') + label)
}

const missing = (s.required || []).filter((k) => !(k in m))
say(missing.length === 0, `필수 최상위 필드 (${(s.required || []).length}개) 전부 존재` + (missing.length ? ` — 누락: ${missing.join(', ')}` : ''))

const unknown = Object.keys(m).filter((k) => k !== '$schema' && !(k in (s.properties || {})))
say(unknown.length === 0, '스키마에 없는 최상위 필드 없음' + (unknown.length ? ` — ${unknown.join(', ')}` : ''))

const tabProps = s.properties.staticTabs?.items?.properties || {}
const tabUnknown = Object.keys(m.staticTabs[0]).filter((k) => !(k in tabProps))
say(tabUnknown.length === 0, 'staticTabs 필드 유효' + (tabUnknown.length ? ` — ${tabUnknown.join(', ')}` : ''))

const waiProps = s.properties.webApplicationInfo?.properties || {}
const waiReq = s.properties.webApplicationInfo?.required || []
say(Object.keys(m.webApplicationInfo).every((k) => k in waiProps), 'webApplicationInfo 필드 유효')
say(waiReq.every((k) => k in m.webApplicationInfo), `webApplicationInfo 필수 충족 (${waiReq.join(', ') || '없음'})`)

const mv = s.properties.manifestVersion
say(!mv?.enum || mv.enum.includes(m.manifestVersion), 'manifestVersion 값 유효')
say(/^#[0-9A-Fa-f]{6}$/.test(m.accentColor), 'accentColor 형식 (#RRGGBB)')

const scopeEnum = tabProps.scopes?.items?.enum || ['personal', 'team', 'groupChat']
say(m.staticTabs[0].scopes.every((x) => scopeEnum.includes(x)), `scopes 값 유효 (허용: ${scopeEnum.join('/')})`)

// URL 필드는 https 여야 한다 — http 면 Teams 가 조용히 렌더를 거부한다
const urls = [m.staticTabs[0].contentUrl, m.developer.websiteUrl, m.developer.privacyUrl, m.developer.termsOfUseUrl]
say(urls.every((u) => u.startsWith('https://')), '모든 URL 이 https')

// validDomains 에 스킴이 들어가면 안 된다
say(m.validDomains.every((d) => !d.includes('://')), 'validDomains 에 스킴 없음')
say(m.validDomains.includes(new URL(m.staticTabs[0].contentUrl).host), 'contentUrl 호스트가 validDomains 에 포함')

console.log('')
console.log(ok ? '결과: 스키마 대조 통과' : '결과: 실패 있음')
process.exitCode = ok ? 0 : 1
