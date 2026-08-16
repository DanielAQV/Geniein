# Teams 탭 앱 — API 노출 설계

> 브랜치: `feat/teams-tab` (베이스 `feat/yuna-agent-core` @ e7845b5)
> 작성 시점에 코드는 아직 없다. 이 문서가 합의문이고, 구현은 여기 적힌 커밋 단위를 따른다.

---

## 1. 목표

회사 사용자가 **Teams 좌측 사이드바에 커스텀 앱을 추가**하면, 그 안의 iframe에서
사규를 검색할 수 있다. 로그인은 따로 하지 않는다 — Teams에 이미 로그인한 Entra 신원을
그대로 쓴다.

| 단계 | 범위 | 상태 |
|---|---|---|
| **MVP** | 사규검색 (`search_knowledge`) 전용 UI. 검색어 → 결과 목록 + 출처(문서명·조항·개정일) | 이번 브랜치 |
| Phase 2 | SharePoint 문서 내용 조회 (Graph API, 사용자 권한으로) | 인증 설계만 미리 맞춰둠 |
| Phase 3 | 에이전트 채팅 (도구 연쇄 전체) | 미착수 |

> **MVP가 검색 전용인 이유.** 자유 대화창을 먼저 열면 스트리밍 UX·대화 이력·비용
> 관리가 한꺼번에 따라온다. 인증·iframe·배포 경로를 뚫는 게 목적이므로 화면을
> 검색창 하나로 좁힌다.

> ★ **"검색 전용"은 화면 이야기지 백엔드 이야기가 아니다.** 처음에는 뇌에 검색 전용
> 진입점이 있다고 가정했지만, 실제로는 `/agent/message`(에이전트 루프)뿐이다 —
> `kb/search.py` 를 직접 부르는 엔드포인트가 없고, 그 파일은 RAG 세션 소관이라
> 이 브랜치에 존재하지도 않는다. 그래서 MVP 는 **에이전트 루프를 탄다.**
>
> 나쁜 거래가 아니다. 루프를 타면 Claude 가 `personas/default.yaml` 의 인용 규칙대로
> 근거를 정리해 주므로, 청크를 그대로 나열하는 것보다 답이 낫다. 대신 응답이 1~2초가
> 아니라 수 초~수십 초다 — **로딩 UX 를 처음부터 넣어야 한다** (커밋 5).
>
> 나중에 뇌에 직행 검색 엔드포인트가 생기면 `AgentService.callBrain` 의 경로 한 줄만
> 바뀐다. 게이트웨이가 밖에 내보이는 `POST /agent/search` 계약은 그대로다.

---

## 2. 아키텍처

기존 설계문서 3.6의 경계를 그대로 따른다 — **NestJS가 유일한 인터넷 노출면**,
FastAPI(뇌)는 내부망.

```
┌─ Teams 클라이언트 (데스크톱/웹/모바일) ────────────────┐
│  좌측 사이드바 → 커스텀 앱 → iframe                    │
│     contentUrl: https://geniein.com/teams/search       │
└────────────────────────┬───────────────────────────────┘
                         │ ① teams-js: authentication.getAuthToken()
                         │    → Entra 액세스 토큰 (aud = api://.../<appId>)
                         ▼
┌─ Next.js (apps/web) ───────────────────────────────────┐
│  /teams/search          화면 (Server Component + 클라)  │
│  /api/teams/search      BFF. 브라우저는 여기까지만 안다  │
└────────────────────────┬───────────────────────────────┘
                         │ ② Authorization: Bearer <토큰> (서버→서버)
                         ▼
┌─ NestJS (apps/api) ────────────────────────────────────┐
│  EntraAuthGuard   JWKS 서명·iss·aud·scp 검증           │
│                   → oid/tid/name 을 req.user 에        │
│  AgentController  POST /agent/search                    │
└────────────────────────┬───────────────────────────────┘
                         │ ③ x-service-token + 검증된 신원
                         ▼
┌─ FastAPI (apps/agent-service) ─ 내부망 ────────────────┐
│  POST /agent/message                                    │
│    internal_user_id / org_id / roles  ← ②에서 확정된 값 │
│    → ToolRegistry.execute() 가 inject_context 로 주입   │
└─────────────────────────────────────────────────────────┘
```

**Bot Framework를 붙이지 않는다.** 탭 앱은 봇이 아니다. 설계문서 130행의 "Bot Framework
불필요(확정)" 결정과 충돌하지 않으며, 오히려 그 결정을 유지한 채로 pull 경로를 얻는다.

---

## 3. 인증

### 3.1 흐름

1. iframe 로드 → `microsoftTeams.app.initialize()`
2. `microsoftTeams.authentication.getAuthToken()`
   → Entra가 **사용자 동의 없이(silent)** 액세스 토큰 발급
   → `aud = api://<도메인>/<appId>`, `scp = access_as_user`
3. 브라우저가 그 토큰을 `Authorization: Bearer`로 Next BFF에 전달
4. Next BFF가 그대로 NestJS에 중계
5. NestJS `EntraAuthGuard`가 검증 — 여기가 **신뢰 경계**다

### 3.2 검증 항목 (하나라도 빠지면 통과시키지 않는다)

| 항목 | 값 |
|---|---|
| 서명 | `https://login.microsoftonline.com/{tid}/discovery/v2.0/keys` (테넌트별 JWKS, 캐시) |
| `iss` | `https://login.microsoftonline.com/{tid}/v2.0` — **토큰의 `tid` 로 조립해서 대조** |
| `aud` | 우리 API ID URI와 정확히 일치 (등록 형태에 따라 1개 또는 2개 허용) |
| `scp` | `access_as_user` 포함 |
| `tid` | **허용 테넌트 2개(에어키/지니) 중 하나.** 목록에 없으면 즉시 거부 |
| `exp`/`nbf` | 시계 오차 허용 60초 이내 |

`ServiceTokenGuard`와 나란히 `apps/api/src/common/guards/entra-auth.guard.ts`로 둔다.
둘은 성격이 다르다 — ServiceToken은 "호출자가 우리 BFF인가", Entra는 "사용자가 누구인가".
Teams 경로는 **둘 다** 통과해야 한다.

### 3.2.1 ★ 멀티테넌트에서 가장 흔한 구멍

테넌트가 둘이므로 검증기가 `/common` 엔드포인트를 쓰고 싶어진다. **그때 `tid` 검사를
빼면 전 세계 아무 Microsoft 테넌트나 우리 API 토큰을 받을 수 있게 된다.** `aud` 는
"이 토큰이 우리 API용인가"만 말하지 "발급한 조직이 우리 조직인가"는 말하지 않는다.

따라서 순서가 중요하다:

1. 토큰을 **디코드만** 해서 `tid` 를 꺼낸다 (아직 신뢰하지 않음)
2. `tid` 가 허용 목록 2개에 있는지 확인 — 없으면 여기서 끝
3. 그 `tid` 로 JWKS URL과 기대 `iss` 문자열을 **조립**해서 서명·발급자 검증

`iss` 를 고정 문자열로 비교하면 두 번째 테넌트가 통째로 막히고, 아예 검증에서 빼면
1단계가 무의미해진다. 둘 다 흔한 실수다.

```ini
ENTRA_ALLOWED_TENANTS=<에어키 tid>,<지니 tid>   # 쉼표 구분. 비면 부팅 실패시킨다
```

값이 없을 때 통과시키지 않는 건 `ServiceTokenGuard` 가 이미 세운 규칙이다 —
"설정 안 했으니 열어둔다"가 이 시스템의 원래 문제였다.

### 3.3 왜 쿠키가 아니라 Bearer인가

Teams iframe은 `teams.microsoft.com` 안에 우리 도메인을 띄우는 **서드파티 컨텍스트**다.
기존 `apps/web/src/lib/auth/session.ts`의 세션 쿠키 방식을 그대로 쓰면 브라우저의
서드파티 쿠키 차단에 걸려 조용히 로그아웃된 것처럼 보인다. 요청마다 Bearer를 싣는다.

단, **BFF 경유는 유지한다.** 브라우저가 NestJS를 직접 부르면 `CORS_ORIGINS`를 넓혀야 하고
CSP `connect-src`도 손대야 한다. Next route handler를 거치면 둘 다 `'self'`로 남는다.

### 3.4 신원 매핑 — 테넌트가 둘이라 앞당겨진다

설계문서 660행은 `agent_identities`(채널 신원 → 사람)를 "테넌트가 둘 이상 되는 시점"의
과제로 미뤄뒀다. **그 시점이 1일차다.**

**`oid` 단독을 키로 쓰지 않는다.** `oid` 는 테넌트 안에서만 유일하다. 같은 사람이
에어키와 지니 양쪽에 계정이 있으면 `oid` 가 서로 다르고, 반대로 서로 다른 사람이
충돌할 여지도 원칙적으로 남는다. 키는 **`(tid, oid)` 복합**이다.

| 필드 | MVP 값 |
|---|---|
| `internal_user_id` | `{tid}:{oid}` — 복합키를 문자열로 접은 형태 |
| `org_id` | `tid` (에어키 / 지니를 가르는 유일한 값) |
| `roles` | 빈 배열. Entra `groups` 클레임 승격은 설계문서 796행 ACL과 함께 |

`{tid}:{oid}` 는 `agent_identities` 가 생기기 전까지의 **자리표시자**이며, 그 성질이
그대로 이행 경로다 — 나중에 테이블이 생기면 이 문자열이 `(channel, external_id)` 행으로
풀리고, 한 사람의 두 테넌트 계정에 같은 `internal_user_id` 를 매달면 대화 이력이 이어진다.
설계문서 660행이 말한 "행 하나만 추가하면 같은 사람" 이 바로 이 상황이다.

> 지금 대화 이력 테이블이 없으므로 이행 부담은 사실상 없다. 단 **로그·트레이스에
> `internal_user_id` 가 남기 시작하는 순간부터** 형식을 바꾸기 어려워지므로, 처음부터
> 복합키로 시작한다.

---

## 4. 지금 막혀 있는 것 — 구현 전에 반드시 푼다

### 4.1 iframe이 아예 렌더되지 않는다 — **해결 (2026-08-16)**

> `headers()` 를 두 블록으로 쪼갰다. 일반 블록의 `source` 를
> `/((?!teams(?:/|$)).*)` 로 좁혀 `/teams` 를 제외하고, `/teams/:path*` 블록에는
> `X-Frame-Options` 를 아예 넣지 않는다. CSP 는 `frame-ancestors` 하나만 다르므로
> 문자열 두 벌을 따로 두지 않고 조립한다 (한쪽만 고치는 사고 방지).
>
> **실제 응답 헤더로 검증** (dev 서버 + 운영 분기 양쪽):
>
> | 경로 | `X-Frame-Options` | `frame-ancestors` |
> |---|---|---|
> | `/`, `/insights`, `/admin/login` | `SAMEORIGIN` | `'self'` |
> | `/teams`, `/teams/search` | **없음** | Teams 도메인 4개 |
> | `/teamsomething`, `/team` | `SAMEORIGIN` | `'self'` |
>
> 마지막 줄이 `(?:/|$)` 를 넣은 이유다 — `/((?!teams).*)` 로 썼으면
> `/teamsomething` 까지 프레임 예외로 새어나간다.
>
> 아래는 원래 분석이다.

`apps/web/next.config.mjs`가 **전 경로**에 다음을 박고 있다:

```
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: ... frame-ancestors 'self'; ...
```

Teams가 iframe에 넣는 순간 백지가 된다. `X-Frame-Options`는 소스 목록을 못 받으므로
완화가 불가능하다 — **해당 경로에서 헤더 자체를 빼야 한다.**

`headers()`를 두 블록으로 쪼갠다:

```js
// 기존 블록의 source 를 '/:path*' → 부정 매칭으로 좁히거나,
// /teams/:path* 블록을 뒤에 두고 XFO 를 제거 + frame-ancestors 를 교체한다.
{
  source: '/teams/:path*',
  headers: [
    // X-Frame-Options 를 넣지 않는다 (SAMEORIGIN 이면 Teams 가 못 띄운다)
    {
      key: 'Content-Security-Policy',
      value: "default-src 'self'; ... frame-ancestors https://teams.microsoft.com " +
             "https://*.teams.microsoft.com https://*.skype.com https://*.microsoft.com;",
    },
  ],
}
```

> Next.js `headers()`는 먼저 매칭된 규칙이 이기는 게 아니라 **같은 키를 뒤 규칙이 덮어쓴다**.
> XFO는 "덮어쓰기"로 지울 수 없으니 기존 `/:path*` 블록의 source에서 `/teams`를 제외해야 한다.
> 구현 때 실제 응답 헤더를 `curl -I`로 확인하고 넘어갈 것.

Outlook/Microsoft 365 앱에서도 열 계획이면 `outlook.office.com`, `outlook.office365.com`,
`*.microsoft365.com`을 추가해야 한다. MVP는 Teams만.

### 4.2 FastAPI가 호스트 포트에 열려 있다 ★

`docker-compose.yml`이 `ports: "${AGENT_PORT:-8000}:8000"`으로 8000을 퍼블리시한다.
`main.py` 서두의 "인터넷에 직접 노출되지 않는다"는 주석과 실제 설정이 어긋나 있고,
FastAPI에는 **인증이 전혀 없다.** Teams 경로가 붙으면 이게 실제 우회로가 된다.

- 개발 편의상 포트는 남기되, FastAPI에 `x-service-token` 검증 미들웨어를 추가한다
  (`AGENT_SERVICE_TOKEN`, NestJS의 `ADMIN_SERVICE_TOKEN`과 다른 값).
- 배포 compose에서는 `ports`를 빼고 `expose`만 둔다.

### 4.3 `internal_user_id`의 기본값

`main.py:MessageRequest.internal_user_id = "dev-user"`. 기본값이 있으면 인증을 안 붙인
클라이언트도 통과한다. Teams 경로가 생기는 순간 **기본값을 제거하고 필수 필드로** 바꾼다.
`core.py`의 `AgentContext`가 이미 "모델은 이 값을 지정할 수 없다(원칙③)"를 강제하고
있으므로 그릇은 맞다 — 채우는 쪽만 고치면 된다.

### 4.4 ★★ 검색이 `org_id` 를 거르지 않는다 — 테넌트 간 정보 유출

> **상태: 해결 (2026-08-16).** RAG 세션 커밋을 머지하고 필터를 붙인 뒤,
> 기존 20건을 에어키(AQV)로 백필하고 교차 검증까지 마쳤다. 아래는 이력이다.

**원래 문제 (이력):**

스키마는 이걸 예상하고 만들어져 있다:

```sql
-- db/init/02-knowledge.sql:46,67
org_id  uuid,
CREATE INDEX kb_documents_live_idx ON kb_documents (org_id) WHERE superseded_at IS NULL;
```

인덱스 이름이 `live_idx` 인데 선두 컬럼이 `org_id` 다 — "유효본을 org 로 걸러 찾는다"를
전제한 인덱스다. 그런데 실제 코드는 그 컬럼을 쓰지 않는다:

| 위치 | 상태 |
|---|---|
| `kb/search.py` `_SCOPED` | `superseded_at IS NULL` + `role_scope && :roles` 뿐. **`org_id` 조건 없음** |
| `kb/search.py:search()` | 시그니처에 `org_id` 파라미터 자체가 없음 |
| `tools/knowledge.py:search()` | `org_id` 를 인자로 **받아서 쓰지 않고 버린다** (`search_kb(query, roles=…)`) |
| `search_knowledge.yaml` | `inject_context` 에 `org_id` 가 이미 있음 — 값은 잘 흘러온다 |

즉 **주입 경로는 완성돼 있고 소비 지점만 비어 있다.** 지금은 무해하다. 인증이 없어서
모두가 `dev-user` 이고 코퍼스도 한 덩어리이기 때문이다. 그러나 Teams 탭이 두 테넌트에
배포되는 순간, **에어키 직원이 지니 사규를 검색 결과로 받는다.** 회사가 다른 법인이므로
이건 버그가 아니라 사고다.

`search.py` 주석이 "필터 두 개는 **모든 갈래에** 건다. 한 갈래라도 새면 인가가 뚫린다"
라고 적어둔 그 규칙이, 세 번째 필터에는 아직 적용되지 않은 상태다.

**적용한 수정 (2026-08-16):**

1. `kb/search.py` — `org_id` 를 **기본값 없는 필수 키워드 인자**로. 빈 값이면 `ValueError`.
   기본값을 주면 안 넘겨도 통과하고, 그게 정확히 이 필터가 막으려는 상황이다.
2. `_SCOPED` / `_LEX_CTE` **세 갈래 전부**에 `AND d.org_id = %(org_id)s`.
   테스트가 `role_scope` 필터 개수와 `org_id` 필터 개수가 같은지로 검증한다 —
   갈래가 늘어도 한쪽만 빠지면 깨진다.
3. `tools/knowledge.py` — 받은 `org_id` 를 전달하고, **비어 있으면 검색하지 않고 거부**.
   여기가 인가 경계다. "결과 없음"으로 처리하지 않는 이유: 모델이 그걸 "그런 규정이
   없다"로 읽고 자신 있게 없다고 답한다. 조회를 못 한 것과 없는 것은 다르다.
4. `kb/ingest.py` — `--org-id` **필수 CLI 인자**. `org_id` 를 INSERT/UPDATE 에 포함.
   이게 없으면 새 문서가 계속 NULL 로 들어가 색인은 성공하고 조회만 안 되는,
   가장 찾기 어려운 상태가 만들어진다.
5. `eval/search_eval.py` — `EVAL_ORG_ID` 환경변수 요구. 하네스도 예외가 아니다.

**공통 사규 정책 (2026-08-16 결정)**: 양사 공통 문서가 있는지 아직 확인되지 않았다.
그러면 **좁은 쪽으로 시작한다** — `AND d.org_id = %(org_id)s`, `IS NULL` 예외 없음.

비대칭이라서 그렇다. 나중에 공통 문서가 나오면 조건을 **넓히는** 건 안전하지만,
반대로 열어두고 시작했다가 좁히는 건 그 사이에 이미 새어나간 뒤다. 열어두는 쪽이
아니라 좁히는 쪽이 기본값 — `search.py:FALLBACK_ROLES` 가 이미 세운 원칙이다.

#### 백필 (완료 2026-08-16)

색인분 20건 / 청크 232건이 전부 `org_id = NULL` 이었다 — 예상대로 그대로 두면
검색이 전원 0건이 되는 상태였다.

```sql
UPDATE kb_documents SET org_id = '<에어키 tid>' WHERE org_id IS NULL;   -- 20건
```

코퍼스는 **에어키(AQV) 소유**다 (`[Draft] AQV - Businesstrip SOP - 2025`,
`해외법인 시행세칙`, `Decision No. …/QĐTC…`). 지니는 아직 사규가 없다.

#### 교차 검증 (완료)

"0건이라 안전해 보이는" 상태와 "제대로 걸러서 안전한" 상태는 다르다.
같은 질의를 세 신원으로 던져 갈리는지 확인했다:

| 신원 | 결과 | 1위 |
|---|---|---|
| 에어키 (코퍼스 소유) | **8건** | 질의별로 정확 — 식대 질의 → 식대 결정문, 다기능 수당 질의 → 다기능 수당 결정문 |
| 지니 (사규 없음) | **0건** | — |
| 외부 테넌트 UUID | **0건** | — |

에어키 쪽이 8건 나오므로 "필터가 전부 막아서 0건"이 아니고, 지니·외부가 0건이므로
"필터가 안 걸려서 다 보인다"도 아니다. 두 방향이 같이 확인돼야 의미가 있다.

### 4.4.1 유니크 인덱스가 org 로 안 나뉜다 — **해결 (2026-08-16, B안)**

`db/init/02-knowledge.sql` 의 유니크 인덱스는 **org 를 모른다**:

```sql
CREATE UNIQUE INDEX kb_documents_source_url_uniq
    ON kb_documents (source, source_url) WHERE source_url IS NOT NULL;
```

`ingest.py` 의 `ON CONFLICT (source, source_url) DO UPDATE` 가 이 키를 쓴다.
따라서 **같은 파일 경로를 다른 `--org-id` 로 색인하면 새 행이 아니라 기존 행이
갱신된다** — `org_id` 까지 덮어써서 에어키 문서 20건이 통째로 지니로 넘어간다.
색인 로그에는 `reindexed` 로만 찍히고 아무 경고도 없다.

지니 사규를 **에어키 문서의 복제본**으로 만들 계획이므로 이 문이 바로 앞에 있다.
두 갈래:

| | 방법 | 성질 |
|---|---|---|
| **A** | 복제본을 다른 경로에 둔다 (`regulations/genie/…`) | `source_url` 이 달라 충돌이 없다. 코드·스키마 변경 0. 규율에 의존 — 누가 같은 경로로 한 번 돌리면 그대로 사고 |
| **B** | 유니크 인덱스를 `(org_id, source, source_url)` 로 바꾼다 | 구조적으로 막힌다. 같은 파일을 두 org 로 각각 색인해도 두 행이 된다. DDL 필요 (인덱스 교체 + `org_id NOT NULL`), `ON CONFLICT` 절도 같이 수정 |

**B 를 택했다.** A 는 "그 경로로 돌리지 마세요"를 사람이 기억하는 데 기대는데,
이 저장소가 지금까지 택해온 방향(원칙③, `FALLBACK_ROLES`, `org_id` 기본값 없음)은
일관되게 "구조로 막고 규율에 기대지 않는다" 였다. 백필이 끝나 전 행에 `org_id` 가
차 있는 시점이 `NOT NULL` 을 거는 가장 싼 순간이기도 했다.

적용 내용:

```sql
ALTER TABLE kb_documents ALTER COLUMN org_id SET NOT NULL;
DROP INDEX kb_documents_source_url_uniq;
CREATE UNIQUE INDEX kb_documents_org_source_url_uniq
    ON kb_documents (org_id, source, source_url) WHERE source_url IS NOT NULL;
```

`ingest.py` 는 세 곳이 같이 바뀐다 — 하나만 바꾸면 조용히 깨진다:

1. `ON CONFLICT (org_id, source, source_url)` — 새 키를 쓴다
2. `DO UPDATE` 에서 `org_id` 제거 — 이제 키의 일부라 갱신 대상이 아니다
3. **재색인 사전 조회에 `org_id` 조건 추가** ← 이게 빠지면 다른 법인의 같은 파일이
   걸려서 해시가 같다는 이유로 `unchanged` 로 건너뛴다. 그 법인 코퍼스는 영원히
   비어 있는데 색인 로그는 정상으로 보인다. 인덱스만 고치고 여기를 놓치기 쉽다.

> ⚠ `db/init/*.sql` 은 **빈 DB 초기화 때만** 돈다 (`docker-entrypoint-initdb.d`).
> 기존 DB 에는 위 DDL 을 따로 적용해야 한다. kb 테이블은 TypeORM 마이그레이션
> 대상이 아니므로(스키마 주석의 "소유권" 참조) 자동 반영 경로가 없다.

**검증 (실측):** 같은 파일을 에어키 → 지니 순으로 색인해 두 행이 되는지 확인했다.
두 번째가 `indexed`(≠`unchanged`)로 나오고 두 행이 공존하며, 지니 행만 지웠을 때
에어키 행이 남는 것까지 봤다. 검증 문서는 삭제했다 (최종 20건 / 232청크 / org 1개).

---

## 5. 작업 단위 (커밋 순서)

| # | 커밋 | 파일 |
|---|---|---|
| 1 | `fix(security)`: FastAPI 서비스 토큰 + `internal_user_id` 필수화 | `agent-service/src/main.py`, `config.py`, `docker-compose.yml` |
| 2 | `feat(api)`: Entra JWT 가드 | `api/src/common/guards/entra-auth.guard.ts` + spec |
| 3 | `feat(api)`: 에이전트 프록시 모듈 | `api/src/agent/{agent.module,agent.controller,agent.service}.ts` |
| 4 | `fix(web)`: `/teams/*` 프레임 헤더 예외 | `web/next.config.mjs` |
| 5 | `feat(web)`: Teams 탭 화면 + BFF | `web/src/app/teams/search/page.tsx`, `web/src/app/api/teams/search/route.ts`, `web/src/lib/teams/` |
| 6 | `feat(teams)`: 앱 패키지 | `apps/teams-app/manifest.json`, `color.png`(192²), `outline.png`(32², 투명) |
| 7 | `docs`: 로컬 실행 + Entra 설정 절차 | `docs/DEV_SETUP.md` |

1~3은 4~5와 독립이라 병렬 가능. 각 커밋은 단독으로 기존 테스트를 깨지 않아야 한다.

### 의존 패키지

- `apps/api`: `jwks-rsa`, `jsonwebtoken` (또는 `@nestjs/passport` + `passport-azure-ad`)
  → 가드 하나 붙이는 데 passport 전체를 끌어올 이유가 없으므로 **전자를 권함**
- `apps/web`: `@microsoft/teams-js`

---

## 6. 환경변수 (추가분)

```ini
# apps/api/.env
ENTRA_ALLOWED_TENANTS=      # 에어키,지니 두 tid 를 쉼표로. ★ 비면 부팅 실패 (3.2.1)
ENTRA_CLIENT_ID=            # Application (client) ID
ENTRA_API_AUDIENCE=         # Application ID URI 1개 (등록이 멀티테넌트 1개이므로)
AGENT_SERVICE_TOKEN=        # NestJS → FastAPI. openssl rand -base64 32
# RAG_SERVICE_URL 은 이미 있음 (http://127.0.0.1:8000)

# apps/web/.env
NEXT_PUBLIC_TEAMS_APP_ID=   # manifest 의 id (GUID)

# 루트 .env (docker-compose → agent-service)
AGENT_SERVICE_TOKEN=        # apps/api 와 같은 값
```

`ENTRA_CLIENT_SECRET`은 Phase 2(OBO)에서만 필요하다. 지금 넣지 않는다.

---

## 7. Teams 앱 매니페스트 요점

사이드바에 꽂히는 **개인 앱**이므로 `staticTabs` + `scopes: ["personal"]`.
(`configurableTabs`는 채널에 탭을 추가하는 경우다 — 지금 필요 없다.)

```jsonc
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.17/MicrosoftTeams.schema.json",
  "manifestVersion": "1.17",
  "id": "<앱 GUID>",
  "staticTabs": [{
    "entityId": "yuna-search",
    "name": "사규검색",
    "contentUrl": "https://geniein.com/teams/search",
    "websiteUrl": "https://geniein.com/teams/search",
    "scopes": ["personal"]
  }],
  "validDomains": ["geniein.com"],
  "webApplicationInfo": {
    "id": "<Application (client) ID>",
    "resource": "api://geniein.com/<clientId>"
  }
}
```

- `webApplicationInfo`가 없으면 `getAuthToken()`이 **조용히 실패**한다. SSO의 핵심 필드.
- `validDomains`에 우리 도메인이 없으면 iframe이 차단된다 (4.1과 별개의 두 번째 관문).
- manifest 스키마 버전은 실제 Teams 클라이언트에서 렌더 확인 후 확정 — 설계문서 997행이
  Adaptive Card에 대해 남긴 경고가 매니페스트에도 그대로 적용된다.

### 멀티테넌트라서 추가로 필요한 것

앱 등록이 하나여도 **매니페스트 배포는 테넌트마다** 해야 한다. 그리고 앱 등록이
살고 있지 **않은** 쪽 테넌트에는 서비스 주체(service principal)가 없으므로, 관리자
동의를 한 번 받아 만들어줘야 한다. 안 하면 그 테넌트 사용자의 `getAuthToken()` 이
실패하는데, **에러 메시지가 SSO 설정 오류와 구분되지 않아** 원인을 찾는 데 시간을 버린다.

```
https://login.microsoftonline.com/{두 번째 tid}/adminconsent?client_id={clientId}
```

Application ID URI 도 제약이 있다 — 멀티테넌트 앱은 `api://{clientId}` 형태이거나,
**홈 테넌트에서 소유권이 검증된 도메인**이어야 한다. `api://geniein.com/{clientId}` 를
쓰고 있다면 `geniein.com` 이 앱 등록이 있는 테넌트에 verified domain 으로 등록돼
있는지 확인이 필요하다. 이미 Expose an API 가 저장됐다면 통과했다는 뜻이긴 하다.

체크리스트:

- [ ] 앱 등록 `signInAudience` = 여러 조직 디렉터리 (`AzureADMultipleOrgs`)
- [ ] 두 번째 테넌트에 관리자 동의 → 서비스 주체 생성
- [ ] Teams 앱 패키지를 **두 테넌트 카탈로그에 각각** 업로드
- [ ] 양쪽 테넌트 계정으로 각각 로그인해 `tid` 가 실제로 다르게 들어오는지 확인

### 로컬 개발

Teams는 `contentUrl`에 **HTTPS만** 허용한다. `localhost:3000`을 그대로 못 쓴다.
`devtunnel` 또는 ngrok으로 터널을 뚫고, 개발용 매니페스트의 `contentUrl`/`validDomains`를
터널 도메인으로 바꿔 사이드로드한다. 터널 URL은 재시작마다 바뀌므로 매니페스트를
`manifest.json`(운영) / `manifest.dev.json`(로컬)로 나눈다.

---

## 8. Phase 2 — SharePoint 조회를 위한 사전 정렬

지금 코드를 쓰진 않지만, **인증 구조가 이걸 못 받으면 나중에 전부 뜯어야 하므로** 여기서 맞춘다.

### 8.1 OBO(On-Behalf-Of)

NestJS가 검증한 사용자 토큰을 Entra에 다시 제출해 **그 사용자 자격의 Graph 토큰**으로 교환한다.

```
POST https://login.microsoftonline.com/{tid}/oauth2/v2.0/token
  grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
  assertion=<사용자 토큰>
  requested_token_use=on_behalf_of
  scope=https://graph.microsoft.com/Sites.Read.All
  client_id / client_secret=<우리 앱>
```

필요한 것: Entra 앱에 **Graph 위임 권한**(`Sites.Read.All`, `Files.Read.All`) + 관리자 동의,
그리고 **클라이언트 시크릿**. 지금 Expose an API까지만 되어 있으므로 이 둘은 추가 작업이다.

### 8.2 ACL이 공짜로 풀린다 (중요)

| 경로 | 권한 판정 주체 |
|---|---|
| 사규 RAG (`kb_chunks`) | **우리**가 해야 함 — 색인 시점에 권한이 박제되므로 `acl_group` 필터 필요 (설계문서 796) |
| SharePoint 조회 (Graph OBO) | **Microsoft**가 함 — 사용자가 못 보는 파일은 Graph가 404를 준다 |

즉 SharePoint 쪽은 우리가 권한 로직을 짤 필요가 없고, 짜면 안 된다. 앱 권한
(application permission)으로 구현하면 이 이점이 사라지고 전사 문서를 우리가 재판하게 된다.
**반드시 위임 권한 + OBO.**

### 8.3 도구는 어디에 붙나

`search_sharepoint` YAML을 추가하고 Graph 토큰을 `inject_context`로 받는다:

```yaml
inject_context:
  - internal_user_id
  - graph_access_token   # ★ input_schema 에 절대 넣지 않는다
```

`registry.py:_validate()`가 `inject_context` 키가 `input_schema.properties`에 노출되면
**로드를 거부**하므로, 모델이 "누구의 토큰으로" 를 지정할 경로가 구조적으로 막힌다.
원칙③이 여기서 실제로 값을 한다.

이때 `AgentContext`(frozen dataclass)에 `graph_access_token` 필드가 추가된다.
`as_dict()`가 그 값을 그대로 실어 나르므로 **로그에 컨텍스트를 통째로 찍는 코드가
생기지 않게** 주의 — 지금은 없다.

---

## 9. 확정되지 않은 것 / 확인 필요

1. **앱 배포 방식.** 조직 앱 카탈로그 업로드(전사) vs 개별 사이드로드. 어느 쪽이든
   **두 테넌트에 각각** 올려야 한다 — Teams 앱 카탈로그는 테넌트 경계를 넘지 않는다.
   앱 등록이 하나여도 이건 두 번 해야 한다.
2. **검색 결과 UI.** 출처 표시 형식(문서명·조항·개정일)은 RAG 세션의 반환 스키마가
   확정된 뒤에 맞춘다. 그 전까지 BFF는 통과만 시킨다.
3. 레이트 리밋. `apps/web/src/lib/auth/rate-limit.ts`를 재사용할지, NestJS 단에서 걸지.

---

## 10. 결정 기록

| 날짜 | 결정 | 근거 |
|---|---|---|
| 2026-08-16 | 별도 worktree(`feat/teams-tab`)에서 작업 | RAG 하이브리드 세션이 같은 워킹트리에 커밋 전 작업물 보유 |
| 2026-08-16 | 베이스는 `main` 이 아니라 `feat/yuna-agent-core` | `main` 에 `apps/agent-service` 자체가 없음 |
| 2026-08-16 | MVP = 사규검색 전용. 에이전트 채팅은 Phase 3 | 응답 1~2초 경로로 인증·iframe·배포를 먼저 검증 |
| 2026-08-16 | 세션 쿠키 대신 Bearer, 단 BFF 경유 유지 | Teams iframe 은 서드파티 컨텍스트 (3.3) |
| 2026-08-16 | **Entra 앱 등록 = 멀티테넌트 1개** | clientId·aud 하나, 매니페스트 1벌. 가드는 `tid` 만 허용목록 |
| 2026-08-16 | `internal_user_id = {tid}:{oid}` 복합키 | `oid` 는 테넌트 내에서만 유일 (3.4) |
| 2026-08-16 | 사규 격리는 **완전 분리**로 시작 (`org_id` 일치만) | 나중에 넓히는 건 안전, 좁히는 건 이미 샌 뒤 (4.4) |
| 2026-08-16 | 사규 코퍼스 20건 = **에어키(AQV)** 소유. 지니는 아직 없음 | 문서가 AQV 를 직접 달고 있다. 지니 사규는 에어키 문서를 복제해 만들 예정 |
| 2026-08-16 | `kb_documents.org_id` **NOT NULL** + 유니크 인덱스에 `org_id` 선두 편입 | 복제본을 쓰는 계획상 같은 파일 경로가 두 법인에 존재한다. 인덱스가 org 를 모르면 재색인이 한쪽 코퍼스를 통째로 다른 쪽으로 옮긴다 (4.4.1). 규율이 아니라 구조로 막는다 |
| 2026-08-16 | Phase 2 SharePoint 는 위임 권한 + OBO | 앱 권한으로 가면 ACL 을 우리가 재판하게 됨 (8.2) |
| 2026-08-16 | MVP 도 에이전트 루프를 탄다 (`/agent/search` → 뇌 `/agent/message`) | 뇌에 검색 직행 엔드포인트가 없다. 인용 품질은 오히려 낫고, 대가는 지연 — 로딩 UX 를 커밋 5에 포함 |
| 2026-08-16 | BFF→게이트웨이 토큰은 `ADMIN_SERVICE_TOKEN` 재사용 | 같은 두 당사자의 같은 관계다. 토큰을 하나 더 만들어도 새 경계가 생기지 않는다 |
| 2026-08-16 | 검색 경로 모델 = **`claude-sonnet-5`**, effort `medium` | 사규 검색은 청크를 읽고 인용하는 작업이지 난제가 아니다. Opus 5 대비 지연·비용이 낮고 코드 변경이 0 — 어댑터가 지키는 제약이 두 모델에 동일하다. `low` 는 근거를 얕게 읽을 위험이 있어 쓰지 않는다 |
| 2026-08-16 | thinking 은 끄지 않는다 | Opus 5·Sonnet 5 모두 기본 ON. 끄면 도구 호출이 평문으로 새어 **검색 없이 답이 나가는** 무증상 실패가 있다. 지연은 effort 로만 조절 |
| 2026-08-16 | Fast mode 미사용 | Opus 전용이고 가격이 2배. 현재 레버로 충분하다고 판단 |
| 2026-08-16 | 운영 도메인 = **`genie.geniein.com`** | Application ID URI 에 이미 박혀 있음 (`api://genie.geniein.com/{clientId}`). 사실상 고정값이며 `contentUrl`·`validDomains` 가 여기서 따라온다. 브라우저는 BFF 만 부르므로 `CORS_ORIGINS` 는 늘지 않는다 |
