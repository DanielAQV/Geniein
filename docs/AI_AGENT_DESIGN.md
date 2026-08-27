# Geniein AI Agent 설계

작성일: 2026-07-30

---

## 1. 현황 진단

### 지금 있는 것
| 영역 | 상태 |
|---|---|
| `apps/web` | Next.js 16 App Router. i18n(kr/en/vn)은 클라이언트 Context + localStorage. shadcn 프리미티브는 `button`, `dropdown-menu` **2개만** 남아있음 (커밋 `c97775f`에서 ~45개 삭제됨 — `apps/web/CLAUDE.md`의 "50개 스캐폴딩" 기술은 stale) |
| `apps/api` | NestJS 11 + TypeORM. 엔티티 1개(`ai_posts`), 스키마는 `synchronize: true`만. 마이그레이션 인프라 **없음** |
| `apps/ai-worker` | Python. RSS → OpenAI(`gpt-5.4-nano`) → 요약/이미지 → DB. **1회 실행 후 종료**, 스케줄러 없음 (`CRAWL_INTERVAL_SECONDS`는 dead config) |
| 배포 | **없음.** Dockerfile/vercel.json/CI/pm2/nginx 전부 부재. 3개 앱 모두 이 로컬 머신에서만 동작 |

### 이미 씨앗은 뿌려져 있음
`apps/api/.env`에 코드 참조가 **0건**인 변수들:
```
ANTHROPIC_API_KEY / ANTHROPIC_MODEL=claude-sonnet-5 / ANTHROPIC_EFFORT
RAG_SERVICE_URL=http://127.0.0.1:8000   ← FastAPI 기본 포트
AI_ALLOWED_IPS=                          ← 내부 서비스 IP 화이트리스트 의도
```
`insight.entity.ts:104` 에는 pgvector 주석까지 있음. 즉 **"NestJS가 게이트웨이, Python이 AI 서비스"** 라는 구조를 이미 한 번 구상했었고, 이 설계는 그 방향을 그대로 완성한다.

### 착수 전 반드시 막아야 할 것 (Phase 0)
1. **`apps/web/src/app/admin/login/page.tsx:22` 에 `connext / 123456789` 하드코딩** + `admin/layout.tsx`가 `localStorage.getItem("admin_auth")`만 검사. 자격증명이 JS 번들로 배포됨. 이력서·인보이스·사규가 흐르는 시스템을 이 인증 위에 올릴 수 없음.
2. **`GET /insights/admin`은 인증 없음** + `main.ts:8`이 `app.enableCors()` (origin 무제한).
3. **`.env` 4개 파일에 실키처럼 보이는 값** (ANTHROPIC / OPENAI / TOGETHER / RESEND / DB 비밀번호). git 추적은 안 되지만 **전부 로테이션 권장**.
4. **`next.config.mjs:40-43` 프로덕션 CSP에 `connect-src` 없음** → `default-src 'self'` 적용. 브라우저에서 크로스오리진 API/스트리밍 호출이 프로덕션에서 막힘. → 챗봇은 **반드시 Next.js route handler(BFF) 경유**.
5. **`synchronize: true` + 마이그레이션 없음.** pgvector 컬럼을 추가하면 synchronize가 이를 "미지의 컬럼"으로 보고 drop을 시도함. **먼저 마이그레이션으로 전환**해야 함.

> **해결 현황 (2026-08-04)** — 위 진단은 2026-07-30 기준이다.
> **1·2·4·5 해결됨.** 1은 Entra ID 가 아니라 서버 세션 브리지로 (9장 Phase 0 참조 — 교체 경계는 `session.ts` 에 고정).
> **3(키 로테이션)만 남아 있다.** `.env` 4개 파일의 실키는 여전히 유효하므로 전량 교체가 필요하다.

---

## 2. 핵심 설계 통찰

세 가지 초기 기능을 각각 만들면 세 개의 별도 시스템이 된다. 하지만 실제로는 **같은 모양**이다:

```
수신 → 분류 → 추출 → 산출물 생성 → 사람 승인 → 액션 실행 → 감사기록
```

| 기능 | 분류 | 추출 | 산출물 | 액션 |
|---|---|---|---|---|
| 이력서 분석 | "이력서인가?" | 경력/기술/학력 | 비교표 xlsx | 회신 메일 |
| 경비 결재 | "인보이스인가?" | 공급자/금액/VAT/계정 | 경비 초안 | Power Automate HTTP 트리거 |
| **반려 사전경고** | "어느 규정 영역인가?" | 상신 내용 필드 | Adaptive Card | **없음 (조언 전용)** |
| 계약 검토 (장기) | "계약서인가?" | 조항 단위 | 리스크 리포트 | 회신 / 코멘트 |
| 사내 챗봇 | — | — | 답변 | 없음 (읽기 전용) |

→ **파이프라인 1개 + Handler(=Skill) N개**로 설계한다. 계약서·견적서를 나중에 붙일 때 Handler 하나만 추가하면 된다.

두 번째 통찰: **트리거는 웹이 아니다.** 기능 2·3은 Outlook에서 시작한다. geniein.com 하위페이지는 **트리거가 아니라 콘솔** — 승인 대기함, 처리 이력, 지식베이스 관리, 프롬프트 설정.

세 번째 통찰: **Power Automate와의 접점이 3가지 모드다.**

| 모드 | 방향 | 예 | 우리 API가 하는 일 |
|---|---|---|---|
| **입구 (ingress)** | PA → 우리 | 메일 수신 → 이력서/인보이스 처리 | 작업 큐에 적재 |
| **출구 (egress)** | 우리 → PA | 승인 클릭 → 기존 결재 플로우 트리거 | HTTP POST |
| **사이드카 (observer)** | PA ⇄ 우리, **병렬** | 결재 상신 → 반려 위험 분석 → Teams 카드 | 조언만 반환. 아무것도 막지 않음 |

사이드카 모드가 중요한 이유: **기존 플로우를 건드리지 않고 가치를 붙일 수 있다.** 우리 API가 죽어도 결재는 그대로 흐른다. M365 승인 플로우를 이미 직접 구축했으므로 그 기술을 재사용한다 — Graph API webhook은 Azure AD 앱 등록 + admin consent + 3일마다 subscription 갱신이 필요한데, Power Automate 트리거는 그게 다 처리된 상태다.

---

## 3. 유나 — 하나의 에이전트 (몸 / 뇌 분리)

### 3.0 이건 기능 모음이 아니다

5장의 기능 목록은 **별개 제품이 아니라 한 에이전트("유나")가 할 줄 아는 일들**이다. 주어가 전부 유나 하나다.

| 문서상 표현 | 사용자가 체감하는 것 |
|---|---|
| 사내 지식조회 챗봇 (5.1) | 유나한테 물어보면 안다 |
| 이력서 분석 (5.2) | 유나가 이력서도 정리해준다 |
| 경비 결재 (5.3) | 유나가 결재도 올려준다 |
| 반려 사전경고 (5.4) | 유나가 먼저 챙겨준다 |
| 계약 검토 (5.5) | 유나가 계약도 봐준다 |

따라서 5장의 목록은 **기능 명세가 아니라 유나의 성장 단계표**다:

```
① 말 걸면 답한다      (호출·대화형 / 읽기)   → 5.1
② 던지면 처리한다      (반응형 / 초안)        → 5.2, 5.3
③ 안 시켜도 챙긴다     (감시형 / 읽기)        → 5.4
④ 대화하며 대신 해준다  (대화형 / 실행)        → 대화로 정보 수집 → 기존 플로우 깨우기
```

### 3.1 몸 / 뇌 분리 — 최상위 아키텍처 결정

```
┌──────────────────────────────────────────────┐
│  몸 (입) — 교체 가능                          │
│  · Teams (AQV 테넌트)  ← push 전용. 카드로 스며듦 │
│  · geniein.com          ← 대화가 일어나는 곳    │
│  · 향후: 지니비나 Teams / Connext 고객사 채널   │
└──────────────────┬───────────────────────────┘
                   │  HTTP  (얇은 프로토콜)
                   │  올림: 사용자 발언 / 트리거
                   │  내림: 답변 / 알림 카드
                   ▼
┌──────────────────────────────────────────────┐
│  뇌 — geniein.com (고정, 지니비나 자산)        │
│  · 유나 코어 (에이전트 루프 + 인격 + 도구)      │
│  · 기억 (대화 맥락 · 신원 매핑)                │
│  · RAG (kb_chunks, 임베딩 파이프라인)          │
│  · 판정 (반려위험 · 정책검증)                  │
│  · 액션 (기존 M365 플로우 깨우기)              │
└──────────────────────────────────────────────┘
```

#### ★ 진입 전략: pull이 아니라 push — Teams는 대화창이 아니다

이게 채택 전략의 핵심이고, 역할 분담을 결정한다.

| 채널 | 역할 | 하지 않는 것 |
|---|---|---|
| **Teams** | **스며들기.** 이미 일이 흐르는 곳에 유나가 카드로 나타난다 (반려경고·처리결과·이슈알림) | 대화. 채팅 봇으로 쓰지 않는다 |
| **geniein.com** | **대화.** "더 물어보고 싶으면 여기서 얘기해" 로 유도되는 곳 | push 알림 |

**사내 AI 도구가 죽는 가장 흔한 이유는 습관 변경을 요구하기 때문이다** — "새로운 곳에 가서 물어보세요". 유나는 반대로 간다. 아무도 부르지 않아도 이미 흐르는 업무(메일 수신, 결재 상신) 위에 카드로 먼저 나타나고, 대화는 필요해진 사람만 웹으로 온다. **습관 변경 요구량이 0이다.**

이 결정이 세 가지를 정리한다:

1. **Bot Framework 불필요 (확정).** Teams가 대화창이 아니므로 카드 게시만 하면 되고, 그건 Power Automate 액션으로 충분하다. `Action.Execute`·메시지 갱신·토큰 스트리밍 전부 필요 없다.
2. **3.4의 비동기 지연 문제가 소멸한다.** 카드는 사용자가 기다리는 응답이 아니라 push다. 뇌가 30초를 쓰든 3분을 쓰든 UX에 영향이 없다. 반면 대화(geniein.com)는 웹이라 SSE 스트리밍이 자연스럽다. **각 채널이 자기가 잘하는 것만 한다.**
3. **로드맵 함의: 챗봇 UI는 1단계가 아니다.** RAG는 1단계지만, 그 첫 소비자는 챗봇 화면이 아니라 **카드의 근거 생성기**다. 사람들이 "이거 어디서 더 물어봐?" 하기 시작할 때 채팅 화면을 붙인다. 아무도 안 오는 채팅 페이지를 먼저 만들 이유가 없다.

#### 카드 → 웹 컨텍스트 인계 (하나의 기억을 지키는 지점)

채널이 갈리면 기억이 갈릴 위험이 생긴다. 카드를 Teams에서 보고 웹에 와서 "그거 뭐였어?" 하면 이어져야 한다. **카드 딥링크에 컨텍스트 참조를 실어서 해결한다:**

```
Teams 카드의 [자세히 보기] → https://geniein.com/console/chat?ref=advisory_01H...
                                                                  ↑
   웹에 도착하면 유나가 이미 그 건을 알고 있는 상태로 대화가 시작된다.
   "출장 결재 건 말씀이시죠. 사규 12조 3항 한도 초과가 잡혔습니다" 부터 시작
```

`ref`로 `approval_advisories` / `agent_jobs` 를 조회해 대화 첫 컨텍스트로 주입한다. 이게 없으면 사용자가 웹에서 처음부터 상황을 설명해야 하고, 그 순간 유나는 두 명이 된다.

**철칙: 몸은 얇게, 뇌는 두껍게.**

Teams 봇에는 **로직을 넣지 않는다.** "이 질문은 RAG로, 저건 결재 조회로" 같은 라우팅 판단조차 뇌가 한다. 봇이 하는 일은 정확히 세 가지다:

```
① 사용자 발언을 그대로 뇌에 올린다
② conversationReference 를 저장한다 (뇌가 나중에 먼저 말 걸 수 있도록)
③ 뇌가 내려준 것을 그대로 렌더한다
```

봇이 똑똑해지는 순간 뇌가 두 군데로 쪼개지고, 몸을 갈아끼울 때 그 로직을 또 옮겨야 한다. 이는 인입 처리에서 "M365 하드코딩 말고 어댑터로 분리"와 같은 원리다.

**이 분리가 사는 이유**
- **자산 주권**: 지금 AQV 테넌트를 빌려 쓰지만 지적 자산(RAG·프롬프트·기억·판정로직)은 100% geniein.com에 남는다. 얼굴만 빌려주는 것이고 언제든 회수 가능.
- **몸 교체**: 지니비나 자체 테넌트가 생기거나 Connext 고객사에 심을 때, 뇌는 그대로 두고 어댑터만 추가한다.
- **일관성**: 4장의 `org_id`와 같은 논리 — 지금 비용 0으로 나중의 전환 비용을 없앤다.

### 3.2 뇌 내부: 인텐트 라우터가 아니라 도구를 쥔 한 명

**이게 "한 명처럼 느껴지게 만드는" 핵심 구현 결정이다.**

```
❌ 인텐트 라우터 (하면 안 되는 것)
   발언 → 분류기 → switch(intent) {
              case '규정질문': ragHandler()
              case '결재질문': approvalHandler()
              ...
           }
   → 핸들러끼리 서로를 모른다. 전화 ARS가 된다.
   → 한 문 뒤에 봇 여러 명이 서 있는 구조. 3.1이 해결한 문제가
     한 계층 아래에서 그대로 재발한다.

✅ 도구를 쥔 한 명 (권장)
   발언 → 유나 = Claude 1회 호출
            system  = 유나의 인격·역할·경계
            messages = 이 사람과의 대화 이력 (기억)
            tools    = [search_knowledge, get_approval_status,
                        check_expense_policy, list_expiring_items,
                        find_candidates, ...]
        → Claude가 필요한 도구를 스스로 고르고, 필요하면 여러 개를
          연달아/동시에 호출한 뒤 종합해서 답한다
```

**판정 테스트 케이스**: *"내 출장 결재 반려됐어? 왜?"*

이 한 문장이 `get_approval_status` + `search_knowledge(출장규정)` + `approval_history(선례)` 세 개를 요구한다. 인텐트 라우터는 분기 하나만 고르므로 여기서 무너진다. 도구 방식은 자연스럽게 연쇄된다. **복합 질문이 들어오는 순간 두 설계의 차이가 사용자에게 그대로 보인다.**

구현은 Anthropic SDK의 tool runner(`client.beta.messages.tool_runner`)를 기본으로 한다 — 루프를 직접 쓰지 않고도 승인 게이트·로깅·결과 가공을 턴별 훅으로 끼울 수 있다. 5장의 각 기능은 **핸들러가 아니라 도구(tool)로 등록**된다.

**도구 등급은 4장/7장의 read·draft·commit 티어를 그대로 쓴다.** `commit` 등급 도구는 tool runner의 실행 함수 안에서 `agent_approvals` 승인 여부를 확인하고, 미승인이면 "승인 대기 중" 결과를 반환한다. 즉 **유나는 승인 없이 실행하는 도구를 애초에 성공적으로 호출할 수 없다.**

#### 라우팅 비용의 실제 모양 — 2배가 아니라 N+1이다

"라우터는 LLM 호출이 2배"라는 통설은 **방식 1(별도 분류 LLM)에만 해당한다.** 툴콜은 분류를 위한 별도 호출이 없다 — 도구 선택이 응답을 만드는 **같은 호출 안에서** 일어난다. 따라서 방식 2를 고르면 그 2배 비용을 애초에 내지 않는다.

대신 실제 비용은 **연쇄 깊이**에서 나온다:

```
도구 0개 사용 (잡담)        → 1회 호출
도구 1개 사용               → 2회 (판단+호출 / 결과받고 답변)
도구 3개 연쇄               → 4회
```

즉 `N개 도구 사용 = N+1회 호출`이다. 그리고 **매 호출이 같은 프리픽스(시스템프롬프트 + 도구목록 + 사규)를 다시 읽는다.** 그래서 프롬프트 캐싱이 여기서 결정적이다 — 캐시 읽기가 약 0.1배이므로 연쇄가 깊어져도 비용이 선형으로 터지지 않는다. 3.5에서 어댑터가 캐싱을 포기하면 안 된다고 한 이유가 여기서 완결된다.

### 3.2.1 도구 설계 5원칙

**① 도구는 "기능"이 아니라 "능력"으로 쪼갠다.**
`경비_처리` 처럼 크게 잡으면 재조합이 안 된다. `get_expense_history`(조회)와 `check_expense_policy`(검증)를 따로 두어야 유나가 세 가지 질문에 각각 대응한다:

| 질문 | 호출되는 도구 |
|---|---|
| "내 경비 얼마 썼어?" | 조회만 |
| "이거 규정 맞아?" | 검증만 |
| "지난달 경비 규정 맞게 썼나 봐줘" | **둘 다 (유나가 알아서 조합)** |

**단, 무한히 쪼개면 안 된다.** 도구가 많아지면 모델이 헷갈리기 시작하고, 그 신호가 3.2의 "엉뚱한 도구를 부를 때"다. 그리고 도구 목록은 프롬프트 프리픽스의 맨 앞(position 0)에 렌더되므로 **도구를 늘리면 캐시가 전멸한다.** 실무 규칙 두 개:

```
· 도구를 대화 중 동적으로 추가/제거하지 않는다 (캐시 무효화)
· 도구 목록 직렬화는 결정론적으로 (이름순 정렬). 순서가 흔들리면 캐시가 안 붙는다
```

**② read / draft / commit 티어를 정의 시점에 태그로 박는다.**
7장의 등급을 도구 메타데이터에 넣어두면 "commit 도구는 무조건 승인 게이트" 같은 규칙을 일괄로 걸 수 있다. 나중에 도구별로 분기 짜는 게 아니라 **티어로 일괄 처리**한다.

**③ ★ 도구 인자에 신원을 넣지 않는다 — 편의가 아니라 권한 경계다.**

```
❌ get_expense_history(employee_id, period)
   → "김대리 경비 내역 조회해줘" 로 남의 데이터를 볼 수 있다.
     employee_id 가 모델 출력이므로 프롬프트 인젝션 표면이 된다

✅ get_expense_history(period)
   → 신원은 서버가 호출 맥락(agent_identities)에서 주입한다.
     모델은 "누구"를 지정할 능력이 없다
```

이건 인자 개수를 줄이는 UX 문제가 아니라 **인가(authorization) 설계**다. 원칙: **모델 출력이 권한 결정에 관여하는 경로를 만들지 않는다.** 타인 데이터 조회가 정당한 요건이 되면(예: 팀장이 팀원 경비 확인) 별도 도구 + 서버측 권한 검사로 분리한다. 같은 도구에 `employee_id`를 열어주는 방식은 안 된다.

**④ 이름은 ASCII, 설명은 한국어.**
도구 `name`은 API 검증 패턴(`^[a-zA-Z0-9_-]{1,64}$`)을 따라야 하므로 **한글 도구명은 쓸 수 없다.** 로컬 LLM 스왑 시 호환성 위험도 있다. 반면 `description`은 **한국어여야 한다** — 사용자가 한국어로 말하고, 라우팅 판단이 이 설명에 걸리기 때문이다.

```
name        : search_knowledge          ← ASCII snake_case, 동사_명사
description : 한국어 + 언제 쓰는지 + 실제 사용자 말투 예시
```

**⑤ commit 도구는 상태를 직접 바꾸지 않고 워크플로우를 깨운다.**

```
❌ create_approval_record(...)   에이전트가 직접 쓰기
✅ wake_approval_flow(payload)   검증된 기존 플로우를 트리거
```

이름부터 이 규율이 드러나야 한다. 2장의 "Power Automate 출구 모드"와 같은 원리이고, 실무에서 **워크플로우 / 에이전트**를 가르는 기준과 정확히 일치한다 — 위험하고 예측 가능해야 하는 것은 레일 위에, 유연해야 하는 대화는 에이전트로.

| | 무엇 | 어디 |
|---|---|---|
| 에이전트 (동적) | 대화, 도구 선택, 정보 수집 | 유나 코어 |
| 워크플로우 (레일) | 결재 실행, 승인 단계 | 기존 M365 플로우 (검증됨) |

### 3.2.2 도구 정의는 선언적으로 (결정: 선언 파일 분리)

도구를 코드에 하드코딩하지 않고 선언 파일로 분리한다. 도구 추가가 **"설정 편집"** 이 되고, 3.5의 뇌 스왑 시에도 도구 정의는 건드리지 않는다.

```yaml
# tools/search_knowledge.yaml
name: search_knowledge
tier: read                        # read | draft | commit
description: |
  회사 규정·정책·업무 절차에 대한 질문에 답할 때 사용한다.
  사내 문서를 검색해 근거 조항과 함께 답한다.
  예: "출장 일비 규정이 어떻게 돼?"
      "연차 며칠까지 당겨쓸 수 있어?"
      "경조사 지원 기준 알려줘"
input_schema:
  type: object
  properties:
    query:
      type: string
      description: 검색할 질문 내용
  required: [query]
  additionalProperties: false
handler: agent.tools.knowledge:search    # 구현 위치
inject_context: [internal_user_id, org_id]   # ★ 원칙③ — 서버가 주입, 모델은 못 건드림
```

`inject_context` 가 원칙 ③의 구현이다. 스키마에 없으므로 모델은 이 값을 지정할 수 없고, 실행 시 서버가 세션에서 채운다.

**MCP로의 승격 경로**: 이 스키마를 `name` / `description` / `input_schema` 로 잡아두면 각 항목이 MCP 툴 하나에 1:1 대응한다. 다만 **MCP는 지금 필요하지 않다** — MCP의 가치는 *우리 도구를 다른 에이전트/클라이언트가 쓸 때* 나온다. 유나가 유일한 소비자인 동안은 오버엔지니어링이다. 승격 트리거는 **"Connext 고객사나 GNOM이 같은 도구를 호출해야 할 때"** 이고, 그때 YAML → MCP 서버는 껍데기 교체 수준이 된다.

### 3.2.3 첫 도구 세트 (MVP)

**도구는 하나면 충분하다.** 나머지는 폴백이다.

| # | name | tier | 내용 |
|---|---|---|---|
| 1 | `search_knowledge` | read | 사규·정책 RAG. Phase 1의 결과물 그 자체 |
| — | (폴백) | — | 위에 해당 없는 인사·잡담·일반 질문은 **도구 없이 직접 답한다** |

**폴백을 시스템 프롬프트에 명시하는 게 포인트다.** 안 넣으면 유나가 "안녕", "고마워"에도 억지로 `search_knowledge`를 부른다. 도구를 안 쓰는 것도 유효한 선택이라고 알려줘야 한다.

### 3.2.4 도구 로드맵 (명명 일관성 확인용)

지금 만들지 않지만, 이름을 미리 늘어놓으면 **명명 규칙이 유지되는지**와 **읽기가 쓰기보다 먼저 쌓이는지**가 검증된다:

| tier | 도구 | 대응 기능 |
|---|---|---|
| read | `search_knowledge` | 5.1 ← **MVP** |
| read | `get_approval_status` | 5.4 |
| read | `search_reject_history` | 5.4 |
| read | `check_expense_policy` | 5.3 |
| read | `get_expense_history` | 5.3 |
| read | `list_expiring_items` | 만료 감시 |
| read | `find_candidates` | 인재풀 (5.2의 부산물) |
| draft | `draft_expense_report` | 5.3 |
| draft | `build_resume_matrix` | 5.2 |
| draft | `draft_contract_review` | 5.5 |
| commit | `wake_approval_flow` | 5.3 실행 |
| commit | `send_email_reply` | 5.2 회신 |

**읽기 7개 / 초안 3개 / 실행 2개.** 3.0의 성장 단계표가 도구 목록만 봐도 읽힌다 — 이게 명명 규칙이 제대로 잡혔다는 신호다.

### 3.2.5 인격은 요구사항이다 — 따라서 설정이어야 한다

**"한 명처럼 느껴지는 것"은 UX 취향이 아니라 제품 요구사항이다.** 에이전트는 지니인의 브랜드 자산이고, 장기적으로 Connext 고객사에 함께 나간다. 인격 일관성이 흔들리면 브랜드가 흔들린다. `PERSONA.md` 사업축 3번(AI & Intelligent Engineering)과 4장의 `org_id` 헤지가 여기서 만난다.

그리고 **말투는 커스터마이즈 가능해야 한다** — 조직마다, 사용자 요청에 따라. 그러면 결론은 하나다: **시스템 프롬프트를 하드코딩하면 안 된다.** 3.2.2의 도구 선언과 같은 원리로 설정으로 빼야 한다.

```yaml
# personas/default.yaml   (org_id 별로 오버라이드)
identity:
  name: 지니
  role: 지니비나의 사내 규정 안내 에이전트
tone:                         # ★ 테넌트가 조정 가능
  register: 존댓말, 격식체
  verbosity: 간결
  address: 직함 호출
behavior:                     # ★ 테넌트가 조정 가능
  opinion: 안을 늘어놓고, 그중 하나를 고르고, 근거를 댄다
  fallback: 인사·잡담은 도구를 부르지 않고 직접 답한다
  citation: 규정 답변에는 조항 번호와 개정일을 반드시 붙인다
constraints:                  # ★★ 고정. 테넌트가 덮어쓸 수 없다
  - commit 등급 도구는 승인 없이 실행하지 않는다
  - 조회 권한 밖의 데이터를 요청받으면 거절한다
  - 근거를 찾지 못하면 모른다고 답한다. 추측하지 않는다
```

**`constraints` 를 `tone`/`behavior` 와 분리하는 것이 핵심이다.** 인격이 테넌트 설정이 되는 순간, 설정으로 안전 규칙을 무력화할 수 있는 경로가 생긴다. 로더에서 `constraints` 는 병합 대상이 아니라 **항상 코어 값을 사용**하도록 강제한다 — 오버라이드 키가 들어와도 무시한다.

#### 두 에이전트, 하나의 인격 코어

지금 이 코어를 쓰는 에이전트는 둘이다 — **지니**(지니비나)와 **마이키**(AQV, 이름은 과거 MyQuay 브랜드에서 왔다). 다른 법인, 다른 이름, 다른 문서 권한이지만 **성격은 같다.** 그래서 `aqv.yaml` 은 `identity` 만 덮고 `tone`/`behavior` 는 코어를 그대로 쓴다. 톤을 두 파일에 복제하면 한쪽만 고쳐지는 날이 온다.

인격의 뼈대는 다섯 줄이다.

1. **격식체 존댓말.** 친근한 톤을 쓰지 않는다.
2. **감정을 연기하지 않는다.** 공감·격려·이모지·리액션 없음.
3. **취향을 말하지 않는다.** "제가 더 좋아합니다" 는 근거가 아니다.
4. **근거가 있는 의견은 낸다.** 판단 회피는 도움이 아니다.
5. **의견은 여지를 남기는 형태로.** `안 나열 → 그중 하나 선택 → 근거` 순서를 지키고, 확정형("이건 위반입니다")으로 끊지 않는다.

4와 5가 한 쌍이라는 점이 중요하다. 5만 있으면 "선택해 주십시오"로 끝나는 회피형 에이전트가 되고, 4만 있으면 규정을 단정하는 에이전트가 된다. 판단은 하되 강제하지 않는다.

**어느 테넌트가 누구인가는 `.env` 가 정한다.** 로더는 `{org}.yaml` 을 찾는데 `org` 자리에 오는 값은 Entra `tid`(GUID) 라, 저장소에 GUID 를 넣지 않으면서 인격 파일 이름은 읽을 수 있게 두려면 표가 하나 필요하다 — `PERSONA_ORG_MAP=<tid>:aqv` 다. 기동 시 코어와 매핑에 나온 인격을 전부 읽어 인격마다 `Agent` 를 하나씩 만들어 두고(얇은 객체다), 요청마다 `org_id` 로 고른다.

- **인격을 고르는 근거는 검증된 `tid` 하나다.** 요청에 인격 필드는 없다 — 있으면 남의 회사 에이전트 이름을 뒤집어쓸 수 있다 (원칙③).
- **매핑에 없는 테넌트는 코어(지니)로 떨어진다.** 요청을 막지 않는다. 이름이 기본값이 될 뿐이고, 기동 로그와 첫 요청의 `WARNING` 이 매핑 누락을 알린다.
- **매핑이 가리키는 인격 파일이 없으면 기동하지 않는다.** 그건 오타가 아니라 배포 누락이고, 조용히 넘어가면 사용자가 다른 이름의 에이전트를 만난다.
- 시스템 프롬프트가 인격마다 갈리므로 **프롬프트 캐시도 인격 수만큼 나뉜다.** 테넌트 수만큼이지 사용자 수만큼이 아니다 (언어 분기와 같은 성질이다).

#### 능동형 발언도 이 프롬프트를 통과해야 한다

이게 가장 조용히 깨지는 지점이다. 알림을 만들 때 템플릿 하드코딩이 너무 쉽다:

```
❌ f"[알림] {item}이 {days}일 후 만료됩니다"
   → 같은 카드에 있어도 말투가 달라서 다른 애로 느껴진다. 브랜드가 갈린다
✅ 알림 내용도 유나가 직접 쓴다. agent_messages.initiated_by='proactive' 로만 구분
```

입구와 기억은 구조로 강제되지만 **목소리는 규율로만 지켜진다.** 카드 문구를 템플릿으로 찍는 순간 유나가 두 명이 된다.

### 3.3 능동형(먼저 말 걸기)은 같은 대화창으로 들어간다

`③ 안 시켜도 챙긴다`는 위 루프와 트리거가 다르다(스케줄/웹훅). 하지만 **출력은 반드시 같은 대화 스레드**여야 한다.

```
스케줄러 / PA 사이드카 → 뇌: 이슈 감지
                            ↓
                    agent_conversations 에서 대상자의
                    conversationReference 조회
                            ↓
                    Teams proactive message 로 같은 스레드에 게시
                            ↓
                    이 발언도 대화 이력에 append
```

알림을 별도 채널로 쏘면 유나가 두 명이 된다. 그리고 이력에 append 해야 **"어제 알려준 그거 어떻게 됐어?"** 가 성립한다.

### 3.4 연결선의 기술적 제약 — 비동기가 필수다

Teams 봇은 활동에 대해 **즉시** 응답을 요구한다. 반면 뇌는 RAG 검색 + Claude(적응형 사고) + 도구 연쇄로 수십 초가 걸린다. 따라서 동기 요청/응답으로 설계할 수 없다.

```
① Teams 봇 → 뇌:  POST /agent/message   → 즉시 202 {jobId}
② Teams 봇:       typing indicator 표시
③ 뇌:            에이전트 루프 실행 (수 초 ~ 수십 초)
④ 뇌 → Teams:    proactive message 로 결과 게시
                 (①에서 저장한 conversationReference 사용)
```

**이 비동기 구조가 비용이 아니라 이득이다.** ④의 "뇌가 먼저 Teams에 말 거는 경로"를 한 번 뚫으면, 3.3의 능동형 알림이 **같은 메커니즘을 공짜로 재사용**한다. 즉 `③ 안 시켜도 챙긴다` 단계의 기술적 전제가 `① 말 걸면 답한다` 를 만들 때 이미 갖춰진다.

> **인바운드 경로**: 몸은 Microsoft 클라우드, 뇌는 geniein.com이다. ④(뇌 → Teams)는 아웃바운드라 문제없고, ①(Teams → 뇌)은 **인바운드**다. **geniein.com이 AWS에서 운영되고 있으므로 이건 해결된 문제다** — ALB / API Gateway + HTTPS 엔드포인트면 끝이고, 별도 터널이 필요 없다. 이 우려는 뇌를 온프레미스로 옮길 때만 부활한다 (3.5 참조).

### 3.5 언어능력도 교체 가능한 부품 — 주권 3분리와 LLM 어댑터

**시간축이 두 개다.**

| | MVP (현재) | 주권 단계 (나중) |
|---|---|---|
| 답변 생성 | Claude API (상용) | 로컬 LLM |
| 도구 판단 | Claude API | 로컬 LLM (같이 내려온다) |
| 임베딩 | **BGE-M3 로컬** | BGE-M3 로컬 (변화 없음) |

즉 3.1의 몸/뇌 분리를 **뇌 안에서 한 번 더** 한다. 유나의 언어능력이 갈아끼울 수 있는 부품이 된다.

#### "로컬 LLM"과 "온프레미스"는 다른 얘기다 — 세 가지를 분리할 것

이 셋이 자주 뒤섞이는데, 요구사항이 다르고 비용이 완전히 다르다.

| | 무엇 | 로컬 LLM on AWS | 온프레미스 |
|---|---|---|---|
| **① 제3자 전송 차단** | 문서가 Anthropic/OpenAI에 가나 | ✅ 해결 | ✅ 해결 |
| **② 모델 주권** | 모델이 우리 통제 하에 있나 | ✅ 해결 | ✅ 해결 |
| **③ 데이터 거주성** | 데이터가 물리적으로 어디 있나 | AWS 리전 | 사옥 |

**실제 우려는 ①이다** — "사내 문서가 외부 API로 나가는 게 꺼려진다". 그리고 **①은 AWS 위의 GPU 인스턴스에서 로컬 LLM을 돌리는 것으로 완전히 해결된다.** 온프레미스까지 갈 필요가 없다.

이게 중요한 이유: 온프레미스로 가면 3.4의 **인바운드 경로 문제가 부활**하고 (Teams 클라우드 → 사옥), GPU 하드웨어 구매·운영 부담이 생긴다. 반면 뇌가 AWS에 남아 있으면 인바운드는 ALB/API Gateway로 끝이고, GPU는 필요할 때 인스턴스 타입만 올리면 된다. **주권 서사를 얻으면서 온프레미스 비용을 안 내는 경로가 있다.**

③(거주성)이 실제 요건이 되는 건 별개 트리거다 — 베트남 고객사 납품이나 공공 프로젝트 계약 조건. 그때는 리전 선택 또는 온프레미스가 협상 대상이 되지만, **지금 미리 지불할 비용이 아니다.**

#### 데이터가 외부로 나가는 지점은 두 개다

로컬 이전을 "생성 모델 스왑"으로만 생각하기 쉬운데, 실제 유출 경로는 두 개다:

```
① 답변 생성 — 검색된 문서 원문 + 질문이 LLM으로 감
② 임베딩   — 색인 시 문서 전문이 임베딩 API로 감  ← 자주 잊는다
```

②를 BGE-M3 로컬로 잡은 것은 **주권의 절반을 MVP 시점에 이미 확보하는 것**이다. 그리고 ②는 나중에 바꾸기가 ①보다 훨씬 비싸다 — 모델을 바꾸면 전체 재색인이다. 처음부터 로컬로 가는 게 맞다.

#### LLM 어댑터 — 단, 최소공통분모로 감싸지 말 것

Claude 호출을 코드 곳곳에 흩어놓지 말고 한 겹 감싼다. 인입 처리의 "M365 하드코딩 말고 어댑터" 와 같은 습관이다. **다만 경계를 잘못 자르면 Claude의 핵심 기능을 잃는다.**

```
❌ llm.generate(prompt) -> str
   최소공통분모 래퍼. 스왑은 쉬워지지만 아래를 전부 포기한다:
   · 프롬프트 캐싱 (cache_control)  ← 사규 고정 프리픽스에서 캐시읽기 약 0.1배.
                                     RAG 비용의 최대 절감 레버다. 이걸 포기하면 안 된다
   · 적응형 사고 (adaptive thinking) / effort
   · structured outputs (strict 스키마 강제)

✅ 유스케이스 단위로 자른다
   answer_with_context(question, chunks, history) -> Answer
   extract_structured(doc, schema)               -> dict
   classify(text, labels)                        -> label
   run_agent_turn(messages, tools)               -> Turn

   → provider별 최적화를 어댑터 "안에서" 한다.
     Claude 구현: cache_control + adaptive thinking + strict tool
     로컬 구현:   해당 스택에 맞는 방식
   → 호출부는 두 경우 모두 같은 시그니처를 본다
```

**도구 사용(tool use)은 공통분모라 살아남는다.** vLLM/Ollama의 OpenAI 호환 API에도 `tools` 파라미터가 있고, tool use로 파인튜닝된 로컬 모델(Qwen, Llama 3.1+ 계열)은 같은 구조로 동작한다. 따라서 3.2의 도구 설계는 **스왑을 견딘다** — 엔드포인트와 모델명만 바뀐다.

스왑이 깨지는 유일한 경우는 모델이 작아서(3B 이하) 툴콜 JSON을 안정적으로 못 뱉을 때다. 그때는 객관식 분류(단일 라벨 선택)로 후퇴하는데, **복합 질문 처리를 잃는다** — 3.2의 판정 테스트 케이스가 다시 무너진다. 그러므로 **로컬 이전 시 모델 선택 기준 1번은 "툴콜이 안정적인가"** 이고, 파라미터 크기나 벤치마크 점수보다 이게 앞선다.

### 3.6 서비스 구성

```
   Outlook (M365)
        │  ① 새 메일 (첨부 포함)
        ▼
   Power Automate  ──── HTTP POST ────┐
   ("메일 수신 시" 트리거)              │  x-agent-signature: HMAC
                                      ▼
                            apps/api (NestJS :3001)
                            · Entra ID 세션 검증
                            · agent_jobs 큐에 INSERT
                            · agent_audit_log 기록
                                      │
                                      │ ② 내부 호출 (RAG_SERVICE_URL, AI_ALLOWED_IPS)
                                      ▼
                    apps/agent-service (FastAPI :8000)  ← 신규
                    · 문서 파싱 (pdf/docx/xlsx/hwp)
                    · Claude 호출 (분류 → 추출 → 생성)
                    · openpyxl 산출물 생성
                    · pgvector 임베딩/검색
                                      │
                                      ▼
                            agent_approvals ("경비 결재 올릴까요?")
                                      │
   geniein.com/console/inbox ─────────┘
   (Next.js BFF → NestJS)
        │  ③ 팀장이 [승인] 클릭
        ▼
   NestJS ── POST ──> Power Automate HTTP 트리거 (기존 결재 플로우)
          └─ Graph sendMail (xlsx 첨부 회신)


   ────────── 사이드카 모드 (5.4) — 위 흐름과 독립 ──────────

   결재 상신 (기존 승인 플로우)
        ├──────────────────────► [승인 플로우 그대로 진행]  ← 차단 없음
        │
        └─ 병렬 분기 / 20s 타임아웃 / 실패 시 무시
             POST /agent/advise ──> FastAPI
                                   · 사규 RAG (kb_chunks 재사용)
                                   · approval_history 선례 조회
                                   · 위험도 + 조항 인용
             <── Adaptive Card JSON
             Power Automate가 Teams에 게시
                        │
             승인/반려 확정 시
             POST /agent/advise/outcome ──> was_correct 기록 (피드백 루프)
```

### 왜 이 3계층인가

> **3.1의 몸/뇌 분리에 따라 웹 콘솔의 위치가 바뀐다.** `/console/*`은 **주 창구가 아니다.** 유나를 만나는 곳은 Teams다. 콘솔의 역할은 세 가지로 축소된다 — ① Teams 카드의 딥링크 대상(근거 원문·xlsx 미리보기처럼 카드에 담기 어려운 것), ② 관리자 화면(프롬프트·임계값·색인 관리), ③ 감사 화면(비용·정확도·이력). 8장의 화면 목록을 이 기준으로 읽을 것.
>
> 단, `/console/chat`은 **뇌를 몸 없이 먼저 검증하는 용도**로 여전히 필요하다. Teams 봇을 붙이기 전에 에이전트 루프와 도구를 웹에서 확인하는 게 훨씬 빠르다.

| 계층 | 역할 | 이유 |
|---|---|---|
| Next.js route handler | 세션 검증, 프록시, 스트리밍 | 프로덕션 CSP가 크로스오리진을 막음 (Phase 0 항목 4). 얇은 BFF |
| NestJS | 상태 소유자 — 작업/승인/감사 테이블, 인증, 외부 액션 실행 | 이미 TypeORM + Postgres를 갖고 있음. 유일한 인터넷 노출면 |
| FastAPI (신규) | LLM 호출, 문서 파싱, Excel 생성, 임베딩 | **Python이어야 하는 이유**: `openpyxl`(기능2 필수), `python-docx`, `pypdf`, HWP 파서. Node에는 동급 라이브러리가 없음. 인터넷 미노출 (`AI_ALLOWED_IPS`가 이걸 위한 변수였음) |

**대안 검토**: FastAPI를 없애고 NestJS에 `@anthropic-ai/sdk`만 넣는 방안 — 런타임 1개가 줄지만 Excel 생성과 HWP 파싱이 막힌다. 기능 2가 "비교요약표 엑셀"이므로 이건 협상 불가.

### 비동기 처리
이력서 10장 파싱 + 분석 + Excel 생성은 30초~3분. 동기 HTTP로 불가능.
- **권장**: Postgres `agent_jobs` 테이블 + FastAPI 워커 폴링 (또는 `pg-boss`). 신규 인프라 0개.
- Redis/BullMQ는 배포 인프라가 아예 없는 현 상황에서 과함.

---

## 4. 데이터 모델 (신규 테이블)

먼저 `synchronize: false` + TypeORM 마이그레이션으로 전환. 그 다음:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- 작업 큐
agent_jobs(
  id uuid PK, kind text,               -- 'resume_analysis' | 'expense_draft' | 'contract_review'
  source text,                          -- 'outlook' | 'console' | 'api'
  idempotency_key text UNIQUE,          -- 메일 Message-ID. 같은 인보이스 이중 제출 방지
  status text,                          -- queued|running|awaiting_approval|done|failed
  payload jsonb, result jsonb, error text,
  requested_by uuid, org_id uuid,       -- org_id: 4장 참조
  created_at, updated_at, started_at, finished_at
)

-- 승인 게이트 (이 시스템의 심장)
agent_approvals(
  id uuid PK, job_id uuid FK,
  summary text,                         -- "출장비 342,000원 결재 올릴까요?"
  draft_payload jsonb,                  -- 실제로 실행될 내용 (편집 가능)
  status text,                          -- pending|approved|rejected|expired
  decided_by uuid, decided_at, executed_at,
  external_ref text                     -- Power Automate run id
)

-- 감사 로그 (append-only)
agent_audit_log(
  id bigserial PK, job_id uuid, actor uuid, action text,
  model text, effort text,
  input_tokens int, output_tokens int, cache_read_tokens int, cost_usd numeric,
  created_at
)

-- 지식베이스
kb_documents(
  id uuid PK, source text,              -- 'sharepoint' | 'upload'
  source_url text, title text, content_hash text,
  acl_group text[],                     -- 권한 인식 검색용 (5.1 참조)
  role_scope text[],                    -- ★ ['requester','approver','admin'] — 정확도 요구사항
  lang text[],                          -- ['ko','en','vi'] — 병기 문서가 기본
  source_format text,                   -- 'docx' | 'pdf_text' | 'pdf_scan' | 'hwp'
  ocr_used boolean DEFAULT false,        -- true면 답변 근거로 청크 텍스트를 쓰지 않는다
  citation_scheme text,                 -- 'PART/Article' | 'doc_no+page' — 계열마다 다르다
  effective_date date,                  -- 문서 내부 시행일 (파일명 날짜와 다를 수 있다)
  superseded_at timestamptz,            -- ★ NULL이면 유효본. 검색에서 이걸로 필터
  source_modified_at timestamptz,
  indexed_at timestamptz, org_id uuid
)
kb_chunks(
  id uuid PK, document_id uuid FK, ordinal int,
  content text, tsv tsvector,           -- BM25용
  embedding vector(1024),               -- pgvector. BGE-M3 = 1024차원 (3.5 참조)
  token_count int
)
CREATE INDEX ON kb_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON kb_chunks USING gin (tsv);

-- 반려 사전경고 (5.4)
approval_advisories(
  id uuid PK,
  approval_id text UNIQUE,              -- 기존 승인 플로우의 식별자
  requester uuid, approval_type text, amount numeric,
  risk_level text,                      -- high|medium|low
  cited_rules jsonb,                    -- [{doc_id, chunk_id, article:"제12조 3항", quote}]
  precedent_refs uuid[],                -- 참조한 approval_history 건들
  recommendation text,
  card_payload jsonb,                   -- 게시한 Adaptive Card 원본 (사후 검증용)
  notified_at timestamptz,
  -- 피드백 루프 (5.4의 자기실현 함정 대응)
  actual_outcome text,                  -- approved|rejected|withdrawn|null(미결)
  actual_reason text,
  intervened boolean,                   -- 카드 이후 기안자가 수정했나
  resubmitted boolean,                  -- 재상신 있었나
  outcome_class text,                   -- 예측적중_반려 | 개입후_통과 | 오탐 | 미탐
                                        --   ★ '개입후_통과'가 이 기능의 성공 지표다
  org_id uuid, created_at
)

-- 선례 베이스. 사규 텍스트가 모르는 실무 관행이 여기 쌓인다
approval_history(
  id uuid PK, approval_id text, approval_type text,
  requester uuid, approver uuid,
  amount numeric, fields jsonb,
  outcome text, reject_reason text,
  decided_at timestamptz, org_id uuid
)

-- ★ 신원 매핑 — "몸을 갈아끼울 수 있다"의 실제 구현 (3.1)
-- 몸이 바뀔 때 마이그레이션이 아니라 행 추가로 끝난다
agent_identities(
  id uuid PK,
  internal_user_id uuid,                -- 유나가 아는 "사람" (불변)
  channel text,                         -- 'teams_aqv' | 'teams_geniein' | 'web' | 'slack'
  external_id text,                     -- 해당 채널의 사용자 식별자 (AAD object id 등)
  display_name text, email text,
  org_id uuid, created_at,
  UNIQUE(channel, external_id)
)

-- 대화 = 유나의 기억. 사람 기준으로 잡는다 (채널 기준이 아니다)
agent_conversations(
  id uuid PK,
  internal_user_id uuid,                -- ★ 채널이 아니라 사람에 매달린다
  channel text, channel_thread_id text,
  conversation_reference jsonb,         -- ★ 뇌가 먼저 말 걸기 위한 핸들 (3.3, 3.4)
  last_active_at, org_id uuid, created_at
)
agent_messages(
  id bigserial PK, conversation_id uuid FK,
  role text,                            -- user | assistant | tool
  content jsonb,                         -- content block 배열 원본 그대로
  tool_calls jsonb, citations jsonb,
  initiated_by text,                    -- 'user' | 'proactive'  ← 능동형 발언 구분
  created_at
)
```

**`agent_conversations.internal_user_id` 가 채널이 아니라 사람에 매달려 있는 것이 핵심이다.** AQV Teams에서 지니비나 Teams로 몸이 옮겨가도 `agent_identities`에 행 하나만 추가하면 같은 사람으로 인식되고 대화 이력이 이어진다. 이게 3.1의 "몸 교체"가 말뿐이 아니게 되는 지점이다.

`conversation_reference` 는 3.4의 비동기 응답과 3.3의 능동형 알림이 **공유하는 단 하나의 핸들**이다. 이 컬럼 하나가 "먼저 말 걸기"의 전제 조건 전부다.

**`org_id`를 지금 넣어두는 이유**: `PERSONA.md`의 사업축 3번이 "AI & Intelligent Engineering — 지능형 소프트웨어 표준"이고 한국↔베트남 DX를 판다. 이 시스템은 사내용으로 만들지만 **레퍼런스 구현이자 상품 후보**다. 컬럼 하나 넣는 비용으로 나중에 멀티테넌트 전환 비용을 없앤다. 지금은 전부 고정값으로 두고 로직에 반영하지 않는다.

---

## 5. 기능별 상세 설계

### 5.1 사내 지식조회 챗봇

**경로**: `geniein.com/console/chat`

#### ★★ 정책: ingest는 Word(.docx) 원본만 받는다

**실측 코퍼스(22개 파일) 분석에서 나온 결정이다.** 상세는 5.1.1 참조.

| 이득 | 내용 |
|---|---|
| **구조 획득** ← 가장 큰 이득 | docx는 ZIP+XML이라 `<w:tbl>/<w:tr>/<w:tc>`로 **표가 표로**, heading 스타일로 **조항 계층**이 유지된다. PDF로 받으면 이게 다 날아간다 |
| 조항 인용 가능 | heading 계층이 있어야 5.4의 "제N조 M항" 인용이 성립한다 |
| 금액 매트릭스 보존 | 직급×지역×금액 표가 무너지지 않는다 |
| OCR 제거 | 파이프라인에서 OCR 단계 자체가 사라진다 |
| 의존성 최소 | 라이브러리 없이도 파싱 가능 (실증: PowerShell 단독으로 docx 텍스트 추출 성공, PDF는 전부 실패) |
| 조직 부담 0 | HR은 이미 Word로 만들고 PDF로 내보낸다. **내보내기 전 원본을 달라는 것**뿐 |

**포맷은 3단으로 나눈다. 텍스트 PDF와 스캔 PDF는 비용이 전혀 다르므로 같이 취급하지 않는다.**

| 등급 | 포맷 | 처리 | 비용 |
|---|---|---|---|
| **A. 권장** | `.docx` | 구조 보존 파싱 (heading + 표) | 낮음. 의존성 없음 |
| **B. 허용** | 텍스트 PDF (폰트 있음) | `pypdf`/`pdfplumber` 텍스트 추출. 표 구조는 부분 손실 감수 | 낮음. 라이브러리 하나 |
| **C. 예외** | 스캔 PDF (폰트 0) · HWP | 아래 vision ingest. 관리자 승인 경로 | 높음 → **자동 OCR 엔진은 도입하지 않는다** |

HR이 만드는 사내 문서는 A로 강제한다. 외부 문서(법률자문·서명계약·공문)는 원본이 PDF뿐인 것이 정상이므로 **B는 처음부터 허용한다.**

**등급 판별은 자동이다.** 업로더가 판단할 필요가 없다 — PDF 내부 구조로 판정한다:

```python
# 실측 검증된 판별법 (5.1.1의 22개 파일 분석에 사용한 방법)
if font_count == 0 and image_count > 0:
    return 'C'      # 스캔본. DCTDecode/CCITTFaxDecode 동반
else:
    return 'B'      # 텍스트 PDF
# 확장자 아니라 매직 바이트로 포맷 판별 (`.docx.pdf` 사례 존재)
```

**A/B가 아닌 경우의 업로드 안내에는 이유를 쓴다.** "규칙이라서"가 아니라 "정확도가 떨어져서"면 사람들이 납득하고 지킨다:
> "원본 Word 파일이 있으면 그걸 올려주세요. PDF는 표와 제목 구조가 손실되어 답변 정확도가 떨어집니다."

#### ★ C등급 처리: OCR 엔진 대신 Claude vision을 ingest에 쓴다

스캔본과 스크린샷은 **OCR 엔진이 아니라 ingest 시점의 Claude vision으로 검색용 텍스트를 생성**한다.

```
스캔 PDF / 스크린샷 페이지
   → ingest 시 Claude vision 으로 페이지를 읽고 검색용 서술 생성
   → 그 텍스트를 임베딩 (검색 인덱스)
   → ocr_used = true 로 표시
   → 답변 시에는 원본 이미지를 근거로 주입 (부모-문서 주입)
```

OCR 엔진보다 이 코퍼스에 확실히 유리하다:

| | Tesseract/PaddleOCR | Claude vision |
|---|---|---|
| 베트남어 성조 (ă â ê ô ơ ư đ + 5성조) | 저품질 팩스 스캔에서 탈락 빈발 | 훨씬 안정적 |
| 표 | 텍스트만. 행/열 관계 별도 문제 | "직급별 일비 표: 과장 X, 부장 Y" 로 서술 가능 |
| **스크린샷** | `제출 취소 승인 반려` **단어 나열** | **"1단계: 좌측 메뉴에서 출장신청 클릭"** ← OCR로는 불가능 |
| 엔진 운영 | 설치·언어팩·정확도 튜닝·지속 관리 | 없음 |

**스크린샷 케이스가 결정적이다.** 가이드 문서의 정보는 공간 관계(화살표가 어느 버튼을 가리키는가)에 있는데, OCR은 그걸 표현할 수 없고 vision은 서술할 수 있다.

비용은 문서당 **일회성**이다 — 23페이지 스캔본 전체를 처리해도 수 달러 수준. 지속 운영 비용이 0이라는 점이 엔진 도입과의 결정적 차이다.

**이 구조 덕분에 C등급을 안전하게 허용할 수 있다.** `ocr_used=true` 인 문서는 청크 텍스트를 답변 근거로 쓰지 않고 원본 이미지를 주입하므로, **생성된 검색 텍스트가 부정확해도 답변 인용이 오염되지 않는다.**

**레거시 스캔본 5개** (2018 출장규정, Allowance 3종 — **금액이 여기 있다**): HR에 Word 원본을 먼저 요청한다. 없으면 vision ingest로 처리하거나, 13페이지뿐이므로 사람이 타이핑해도 된다. 어느 쪽이든 OCR 엔진은 필요 없다.

**스크린샷은 Word 정책으로 풀리지 않는다.** `Requester_Guide_19Jan.docx`는 이미 Word인데 이미지 519KB / 텍스트 585자다. 두 가지로 대응한다:
- 가이드 작성 규칙에 **"각 스크린샷에 텍스트 설명 병기"** 추가 → 검색 가능해진다
- 검색은 캡션·제목으로, **주입은 이미지 포함 원본으로** (아래 부모-문서 주입)

#### 색인 파이프라인

```
HR 업로드 (.docx) 또는 SharePoint 동기화
   → 구조 보존 파싱 (heading 계층 + 표 마크업 유지)
   → 청킹 (heading 경계 기준. 표는 쪼개지 않는다)
   → BGE-M3 임베딩 (로컬/CPU)
   → kb_documents / kb_chunks
```

**표를 청크 경계로 쪼개지 않는 것**이 중요하다. 금액 표가 반으로 갈리면 직급과 금액이 다른 청크로 흩어진다.

#### 검색: 하이브리드 + 필터

```
사용자 질문
 ├─ BM25 (Postgres tsvector, 한국어는 pg_bigm 또는 n-gram)
 └─ 벡터 (pgvector cosine)
      → RRF(Reciprocal Rank Fusion) 병합
      → 필터:  role_scope && :user_roles      ← 신원 주입 (3.2.1 원칙③)
               AND superseded_at IS NULL      ← 유효본만
      → 상위 8~12 청크
```

순수 벡터만 쓰면 한국어 고유명사(사업명·계약번호·제품코드)와 금액에서 재현율이 크게 떨어진다. BM25 병행이 필수.

#### 회사 어휘 사전 — 질의 확장 (`glossary.yaml`)

**코퍼스는 영어·베트남어인데 질문은 한국어로 온다.** "일비 얼마예요?" 의 '일비' 는 문서 어디에도 없고, 문서에는 `daily allowance` 라고 적혀 있다. 그 다리를 지금은 **벡터 갈래 혼자** 놓고 있다 — 어휘·트라이그램 갈래는 그런 질의에서 0건이다. 벡터가 흔들리는 날 검색 전체가 같이 흔들린다는 뜻이고, 하이브리드를 세 갈래로 만든 이유가 무색해진다.

사전은 동의어 묶음의 목록이고 **방향이 없다.** 질의에 묶음의 어느 표기든 나오면 나머지가 함께 검색어가 된다 — 베트남어로 물어도 한국어·영어 표기가 붙는다.

```yaml
groups:
  - [일비, daily allowance, per diem, phụ cấp]
  - [숙박비, 호텔비, accommodation, tiền phòng]
```

**확장어는 어휘(BM25) 갈래에만 넣는다.** 세 갈래가 서로 다른 것을 잡으라고 나눠둔 것이라, 확장어를 전부에 뿌리면 그 분업이 무너진다.

| 갈래 | 확장어 | 이유 |
|---|---|---|
| 벡터 | ✗ | 교차언어는 원래 이 갈래의 일이다. 검색어를 덧붙이면 문장 뜻이 흐려진다 |
| BM25 | ✓ | 확장어는 **문서 표기 그대로**라 철자 일치 갈래가 정확히 잡는다 |
| 트라이그램 | ✗ | 조사 때문에 BM25 가 못 잡는 한국어를 메우는 갈래다. 게다가 유사도를 **합산**하므로 `per` 같은 짧은 낱말 하나가 수십 청크를 동시에 밀어 올린다 |

**사전은 재현율 장치이지 필터가 아니다.** 확장어가 늘어도 유효본·`role_scope`·`org_id` 필터는 갈래마다 그대로 걸린다. 이 파일이 인가 경계를 건드릴 수 있는 경로는 없다.

**틀린 확장은 조용히 비싸다.** 엉뚱한 조항이 근거로 올라오고 모델은 그것을 성실하게 인용한다. 그래서 **뜻을 확인한 표기만** 적는다 — 사내 약어(PR/PPL/PMR/BO)는 정식 명칭을 확인하기 전까지 비워둔다. 검색 로그에 `사전확장=[…]` 이 함께 남으므로, 근거가 이상할 때 사전이 범인인지 한 줄로 가려낼 수 있다.

회귀 검사는 `eval/glossary_eval.py` — API·DB 없이 도는 순수 함수 검사라 사전을 고칠 때마다 돌린다. 부정 사례(`NOTE` 안의 `OT` 가 걸리면 안 된다)를 같이 둔다.

**`role_scope` 필터는 정확도 요구사항이다.** 실측 코퍼스에 `Requester_Guide` / `Approver_Guide` / `Admin_Guide`가 역할별로 갈려 있다. 일반 직원 질문에 Admin 가이드 청크가 걸리면 **존재하지 않는 메뉴를 설명하게 된다.**

#### ★ 주입 단위: 청크가 아니라 부모 문서/섹션

```
❌ 검색된 청크만 컨텍스트에
   → 표·스크린샷 맥락이 없다. 청크 텍스트가 부정확하면 그게 답변 근거가 된다

✅ 청크로 찾고, 그 청크가 속한 원본 섹션/문서를 주입
   → 검색은 확장 가능하게(RAG), 근거는 원본으로
```

검색 인덱스의 텍스트 품질과 답변 근거의 정확도를 **분리**한다. 청크 텍스트가 조금 거칠어도 "이 문서에 출장 일비 얘기가 있다"는 신호로는 충분하고, 실제 답변은 원본을 보고 만든다. 레거시 스캔본을 부득이 OCR로 넣게 되는 경우에도 이 구조라면 **OCR 오류가 답변 인용을 오염시키지 않는다.**

> **임베딩: BGE-M3 로컬 (결정)** — Anthropic은 임베딩 엔드포인트를 제공하지 않는다. 외부 임베딩 API(OpenAI 등)를 쓰면 **문서 원문이 색인 단계에서 외부로 나간다.** BGE-M3를 Sentence Transformers로 자체 호스팅하면 이 경로가 애초에 없어지고, 한국어+베트남어 다국어 성능도 강하다 — 한↔베 조직에 정확히 맞는 선택이다. 3.5의 주권 논의 참조.
>
> 실무 주의사항:
> - **차원 1024** — 4장 스키마가 `vector(1024)`인 이유. 나중에 모델을 바꾸면 전체 재색인이 필요하니 지금 확정할 것.
> - `requirements.txt`에 `sentence-transformers` + `torch` 추가 → CPU 전용 torch도 이미지가 수백 MB 커진다. 배포 이미지 크기에 반영.
> - **초기 전체 색인은 CPU에서 느리다.** BGE-M3는 568M 파라미터급이다. 최초 색인은 배치 잡으로 돌리고, 이후 증분만 실시간 처리하는 구조로 잡을 것.
> - 현재 저장소에는 아직 없다 (`requirements.txt`에 미포함). **결정됨 / 미구현** 상태.

**★ 권한 인식 검색 — 가장 중요한 설계 결정**

SharePoint를 전부 색인하면 신입이 "대표 연봉 얼마야?"를 물어 답을 얻는다. 대응:
- **Phase 1**: 화이트리스트된 라이브러리만 색인 (사규, 제안서 템플릿, 기술자료, 공고 이력). HR/재무/급여 라이브러리는 **원천 제외**.
- **Phase 2**: `kb_documents.acl_group`에 SharePoint 권한 그룹을 저장하고, 검색 시 `WHERE acl_group && :user_groups`로 필터. 사용자 그룹은 Entra ID 토큰의 `groups` 클레임에서 획득.
- **절대 하지 말 것**: 전체 색인 + 프롬프트로 "민감정보는 답하지 마세요". LLM 지시로 접근제어를 대체할 수 없다.

**스트리밍**: `Next.js route handler → NestJS → FastAPI` SSE 릴레이. Claude는 `client.messages.stream()`, `max_tokens=64000`. (Teams는 push 전용이라 스트리밍이 필요 없다 — 3.1 참조)

#### ★ 문서 최신성 — read 티어의 진짜 위험

7장의 read/draft/commit 티어링은 **"읽기는 안전하다"** 를 전제한다. 그 전제에 균열이 있다:

> 직원이 출장 일비를 묻는다 → 유나가 **구 버전 사규**를 자신 있게 인용한다 → 직원이 믿고 신청한다 → 반려된다.

**commit 도구는 하나도 호출되지 않았는데 실제 피해가 발생했다.** 승인 게이트가 이걸 막지 못한다. 그리고 이건 5.4의 "조언이 게이트가 되는 것"보다 훨씬 흔한 실패 모드다.

따라서 최신성 관리가 설계 항목이다:

| 항목 | 설계 |
|---|---|
| 개정 감지 | `kb_documents.content_hash` + SharePoint `lastModifiedDateTime` 비교. Graph delta 쿼리 또는 주기 스캔 |
| 구버전 폐기 | 재색인 시 해당 문서의 기존 청크를 **삭제**한다. append만 하면 구버전이 검색에 계속 걸린다 |
| 개정일 노출 | 답변 인용에 조항 번호 + **문서 개정일**을 함께 표시. `personas/*.yaml` 의 `behavior.citation` 이 이걸 강제 |
| 신선도 경고 | 인용 문서가 오래됐으면(예: 1년 초과) 답변에 "최신 여부 확인 권장" 을 붙인다 |
| 색인 누락 감지 | 색인 대상 목록 vs `kb_documents` 대조. 새 문서가 색인 안 된 채 방치되는 것을 잡는다 |

`kb_documents` 에 `source_modified_at`, `indexed_at`, `superseded_at` 을 두고, 검색 시 `superseded_at IS NULL` 로 필터한다.

### 5.1.1 실측 코퍼스 분석 (2026-07-30, `regulations/` 22개 파일)

Word 정책과 부모-문서 주입이 여기서 도출됐다. 파일 내부 구조를 직접 분석한 결과다.

**포맷 분포**

| 구분 | 개수 | 상태 |
|---|---|---|
| PDF 스캔본 (폰트 0, 이미지만) | 5 | ❌ 추출 가능 텍스트 없음. DCTDecode/CCITTFaxDecode |
| PDF 텍스트본 | 6 | 🟡 파싱 가능하나 표·계층 손실 |
| docx (텍스트 위주) | 3 | ✅ 20,711 / 7,173 / 3,023자 |
| docx (스크린샷 위주) | 5 | ⚠️ **이미지가 83~90%**, 텍스트 585~1,919자 |
| hwp (HWP 5.x OLE, `D0CF11E0`) | 1 | ❌ 파싱 불가. **단 같은 문서의 텍스트 PDF가 있어 우회 가능** |

**핵심 발견 5개**

1. **금액이 전부 스캔본에 있다.** 2025 출장 SOP는 절차(flow chart)만 있고 금액 패턴 0건. Allowance 3종(Meal / Multi-task / Attendance)이 전부 스캔본. **가장 자주 묻는 질문의 답이 가장 접근 불가한 형태로 있다.**
2. **가이드가 스크린샷 83~90%.** 실제 정보(어디 클릭·어떤 순서)가 이미지 안의 화살표에 있다. 585자로는 "승인 방법"에 답할 수 없다. → 검색은 캡션, 주입은 원본.
3. **역할별로 문서가 갈린다.** Requester / Approver / Admin. → `role_scope` 필터가 편의가 아니라 정확도 요구사항.
4. **버전이 병존한다.** General Regulation 2019·2021·2023, 출장규정 2018 정식본 vs 2025 `[Draft]`(시행일 2025-06-01이 이미 경과). → `superseded_at` 필요. PoC에서는 최신 가정으로 진행하고, 유효본 대장은 운영 항목.
5. **가이드는 규정보다 훨씬 빨리 낡는다.** `19Jan → 26Feb2026 → 31mar2026` — 3개월에 3회 갱신. M365를 계속 개편하는 중이므로 가이드 최신성이 규정보다 중요하다.

**조항 체계가 계열마다 다르다**

```
General Regulation   PART I / Article / 4.3.        → 조항 인용 가능. 개정이력 표 내장
Business Trip SOP    문서번호 BT001 + 표 행         → 조항 없음
```

5.4의 "제N조 M항" 형태를 전 코퍼스에 일괄 적용할 수 없다. `kb_documents.citation_scheme` 으로 문서별 참조 스킴을 둔다.

**언어**: 베트남어/영어 병기가 기본. 출장규정에 **한국어 버전이 없다.** 한국 직원이 8년 전 영/베 스캔본을 물어보는 상황 — 유나의 첫 가치가 "검색"이 아니라 **"읽을 수 없는 문서를 읽어주기 + 번역"** 임을 시사한다.

**총량 추정** (텍스트 추출 불가 파일이 있어 추정치)

```
전체 22개 주입 시    ≈ 175~225K 토큰
유효본만 선별 시     ≈  60~80K
```

RAG를 채택한 이유는 총량이 아니라 **증가 추세**다 — 조직 개편 후 문서가 계속 갱신·추가되고 HR이 셀프서비스로 ingest한다는 전제.

### 5.2 이메일 분석 자동회신 (이력서 → 비교표)

**흐름**
```
① Power Automate: 특정 메일박스/폴더에 메일 도착
② POST /agent/ingest {kind:'resume_analysis', messageId, from, subject, attachments[]}
③ NestJS: idempotency_key = messageId 로 중복 차단 → agent_jobs INSERT
④ FastAPI 워커:
   a. 첨부 파싱 (pdf / docx / xlsx / hwp / hwpx)
   b. 문서별 구조화 추출 — Claude structured outputs (스키마 강제)
   c. 공통 스키마로 정규화 (경력 연수 계산, 기술스택 표준화)
   d. (선택) JD 대비 적합도 스코어링 + 근거
   e. openpyxl로 비교 매트릭스 xlsx 생성
⑤ agent_approvals 생성 → 콘솔에서 xlsx 미리보기 + [회신] / [수정] / [폐기]
⑥ 승인 시 Graph sendMail 로 원발신자에게 xlsx 첨부 회신
```

**추출 스키마** (structured outputs로 강제 — `output_config.format`)
```json
{
  "candidate_name": "string", "total_years": "number",
  "current_title": "string", "current_company": "string",
  "education": [{"degree":"","school":"","major":"","graduated":""}],
  "skills": [{"name":"","level":"주력|경험|학습","years":0}],
  "projects": [{"name":"","period":"","role":"","stack":[],"scale":""}],
  "certifications": ["string"],
  "notes_for_reviewer": "string"
}
```

**⚠ 실무 블로커 2개**
1. **HWP/HWPX**: 한국 이력서의 상당 비중. 순수 Python 파서(`hwp5`, `olefile`)는 커버리지가 불완전하다. 실전 대응은 **LibreOffice headless로 PDF 변환 후 파싱** — 서버에 LibreOffice 설치 필요. 배포 인프라 설계 시 반영.
2. **개인정보**: 이력서는 개인정보보호법 적용 대상. 필요 조치 —
   - 보관 기간 정책 (예: 처리 후 90일 자동 삭제, `agent_jobs.payload` 파기)
   - 저장 시 암호화, 접근 로그 (`agent_audit_log`가 이 역할)
   - Anthropic API는 학습에 사용되지 않음 — 조직 정책상 30일 보관 설정 확인
   - 채용 담당자 외 접근 차단 (Entra 그룹 기반 인가)

### 5.3 경비 결재 (인보이스 → 초안 → 승인 → 기존 플로우 트리거)

**이 기능을 기능 2보다 먼저 만드는 것을 권장한다.** 이유:
- 추출이 훨씬 단순 (인보이스 필드 vs 자유형식 이력서)
- 개인정보 리스크가 낮음
- HWP/Excel 생성 불필요
- **가장 중요**: "승인 → 외부 액션 실행" 왕복을 저위험 환경에서 먼저 검증한다. 이게 전체 아키텍처의 핵심 루프다.

**흐름**
```
① 인보이스 메일 도착 → Power Automate → /agent/ingest
② 분류: "이게 경비 청구 대상인가?" (Haiku 4.5 — 저비용 트리아지)
③ 추출: 공급자 / 금액 / VAT / 통화 / 일자 / 품목 / 사업자번호
④ 정책 검증: 경비규정을 RAG로 조회 (5.1의 kb_chunks 재사용!)
   → "숙박 1박 15만원 한도 초과", "증빙 누락" 등 플래그
⑤ 초안 생성 → agent_approvals
⑥ 콘솔: "출장비 342,000원 (숙박 2박 / 식비) 결재 올릴까요?" + 근거 + 위반 플래그
⑦ [승인] → NestJS가 기존 Power Automate 결재 플로우의 HTTP 트리거로 POST
   → run id를 agent_approvals.external_ref 에 저장 (추적)
```

**멱등성 필수**: 같은 메일이 재전송되거나 Power Automate가 재시도하면 같은 인보이스가 두 번 결재 올라간다. `idempotency_key = Message-ID`로 UNIQUE 제약.

**여기서 4장의 kb_chunks가 재사용된다는 점이 중요하다.** 챗봇용으로 만든 지식베이스가 경비규정 판정 엔진이 된다. 기능 1을 먼저 만들 두 번째 이유.

### 5.4 반려 사전경고 (승인 사이드카 → Teams Adaptive Card)

**기존 승인 플로우와 별도 플로우로**, 결재가 상신되는 순간 사규 RAG를 돌려 반려 위험을 판정하고 Teams 카드로 통보한다.

```
결재 상신 (기존 승인 플로우 시작)
   │
   ├─────────────────────────────► [기존 승인 플로우 그대로 진행] ← 절대 막지 않음
   │
   └─ 병렬 분기 (별도 플로우)
        POST /agent/advise {approvalId, requester, type, amount, fields, attachments[]}
                 │
                 ▼
        ① 로컬 결정론 판정 (LLM 없음)
             — 금액 한도 초과, 필수 필드 누락, 증빙 개수, 기간 중복
             — 코드로 계산. 싸고 빠르고 100% 정확하고 감사 가능
        ② 사규 RAG 조회 (kb_chunks — 챗봇/경비판정과 동일 인덱스)
        ③ 유사 과거 건 조회 (approval_history — 반려 선례)
        ④ 위험 판정 + 조항 인용 + 선례 근거 (LLM)
                 │
                 ▼
        Adaptive Card JSON 반환 → Power Automate가 Teams에 게시
```

**①을 LLM 앞에 두는 것이 중요하다.** "숙박 1박 15만원 한도, 신청 18.5만원"은 뺄셈이다 — LLM에 맡길 이유가 없다. 결정론 층에서 잡히는 위반은 근거가 명확하고 반박 불가하므로 **카드의 신뢰도가 올라간다.** LLM은 결정론으로 판정할 수 없는 것(맥락 해석, 선례 비교, 권고문 작성)만 담당한다. §10.3의 "정형 데이터에 LLM 쓰지 말기" 규율이 여기 적용된 형태다.

결정론 층이 아무것도 잡지 못하고 RAG도 관련 조항을 못 찾으면 **아예 카드를 보내지 않는다.** "이상 없음" 알림은 노이즈이고, 노이즈가 쌓이면 사람들이 카드를 무시하기 시작한다.

**★ 반드시 병렬 분기여야 한다.** 기존 승인 플로우의 크리티컬 패스에 우리 API를 넣으면, 우리가 죽었을 때 회사 결재가 멈춘다. Power Automate의 병렬 분기(parallel branch)로 붙이고, 타임아웃(예: 20초)과 실패 시 무시(configure run after: has failed → terminate 없이 종료)를 설정한다.

#### 확률을 숫자로 내지 말 것

`"반려 확률 73%"` 는 만들지 않는다. LLM은 확률 보정(calibration)이 나쁘고, 근거 없는 숫자는 사람을 잘못된 방향으로 확신시킨다. 대신:

```
위험도: 높음 | 중간 | 낮음
근거:  ① 사규 제12조 3항 — 숙박비 1박 한도 150,000원 (신청 185,000원)
       ② 유사 건 12건 중 3건 반려 — 사유 전부 "증빙 누락"
권고:  카드영수증 원본 첨부 후 재상신
```

**숫자를 쓸 수 있게 되는 조건**: `approval_history`에 실제 승인/반려 결과가 충분히 쌓이고, 우리 예측 대비 실제 결과를 대조해 정확도를 측정한 뒤. 그때 비로소 선례 기반 빈도("유사 건 반려율 25%")를 제시할 수 있다 — 이것도 LLM이 뽑은 확률이 아니라 **집계된 실측치**다.

#### 누구에게 보내는가 — 두 카드, 다른 가치

| 수신자 | 시점 | 카드 내용 | 가치 |
|---|---|---|---|
| **기안자** | 상신 직후 (또는 상신 전) | "이대로 올리면 반려 소지가 있습니다. 증빙을 추가하세요" | **반려-수정-재상신 왕복 자체를 없앤다. 가장 높음** |
| **결재자(팀장)** | 결재 대기 진입 시 | "이 건은 사규 12조 위반 소지. 유사 건 3건 반려됨" | 검토 시간 단축 |

기안자용이 더 가치가 크다. 더 나아가 **상신 전** 단계에 붙일 수 있다면(Teams에서 봇에게 초안을 던지거나 `/console`에서 사전 검토) 왕복이 아예 발생하지 않는다.

#### ⚠ 조언이 사실상 게이트가 되는 것을 막아야 한다

카드에 "위험도: 높음"이 뜨면 팀장이 내용을 보지 않고 반려를 누르기 시작한다. 그러면 LLM이 책임 없는 의사결정자가 된다. 설계 방어:

- 카드는 **항상 구체적 조항 번호와 선례를 인용**한다. 점수만 내보내지 않는다.
- 카드에 반려 버튼을 넣지 **않는다.** 판단은 기존 승인 플로우 UI에서만.
- 조언이 표시되었다는 사실을 `agent_audit_log`에 기록한다 (사후 검증 가능성 확보).
- 카드 하단에 "AI 참고 의견입니다. 최종 판단은 결재자에게 있습니다" 고정 문구.

#### Teams 게시 방법 — Bot Framework 없이

| 방법 | 가능한 것 | 판단 |
|---|---|---|
| Incoming Webhook | 카드 게시만 | 기능 제약이 큼 |
| **Power Automate "채팅/채널에 Adaptive Card 게시"** | 카드 게시 + `Action.OpenUrl` | **Phase 1 권장.** 사이드카 플로우가 이미 PA이므로 추가 인프라 0 |
| Bot Framework / Graph | `Action.Execute`로 카드 제자리 갱신, 대화형 응답 | 상호작용이 필요해지면 승격 |

**따라서**: 우리 API는 **Adaptive Card JSON을 반환**하고 Power Automate가 게시한다. 카드의 버튼은 `Action.OpenUrl`로 `/console/advisory/[id]` 딥링크 → 상세 근거와 인용 원문을 웹에서 본다. Bot Framework를 Phase 1에서 회피할 수 있다.

> Adaptive Card 스키마 버전은 Teams가 지원하는 범위를 확인해야 한다. 상위 버전 기능(예: `Action.Execute` 기반 카드 갱신)을 쓰면 조용히 렌더링이 깨진다. 보수적으로 낮은 버전 기능만 사용하고, 실제 Teams 클라이언트에서 렌더 확인 후 확정할 것.

#### ★ 피드백 루프 — 이 기능을 자기개선 시스템으로 만드는 부분

기존 승인 플로우가 **최종 결과(승인/반려 + 사유)** 를 우리에게 돌려주도록 한 줄 추가한다:

```
승인 플로우 종료 시 → POST /agent/advise/outcome {approvalId, outcome, reason}
```

**⚠ 그런데 `was_correct` 는 그대로 쓰면 성립하지 않는다 — 자기실현 함정이 있다.**

```
위험 높음 → 실제 반려   → 예측 맞음?
위험 높음 → 실제 승인   → 예측 틀림?
                        아니면 기안자가 카드를 보고 고쳐서 통과한 것 = 성공?
```

**카드가 효과적일수록 예측이 틀린 것처럼 보인다.** 성공과 오답이 구별되지 않으므로, 이 스키마로 정확도 대시보드를 만들면 숫자가 의미를 갖지 못한다. 최소 두 가지 중 하나가 필요하다:

| 방법 | 내용 |
|---|---|
| **개입 여부 기록** (권장) | 카드 발송 후 **수정·재상신이 있었는지**를 같이 기록. `was_correct` 를 `outcome_class` 로 대체 — `예측적중_반려` / `개입후_통과` / `오탐` / `미탐`. `개입후_통과` 가 이 기능의 **성공 지표**다 |
| A/B | 일부 건에만 카드 발송. 미발송군의 반려율과 비교. 표본이 필요해 초기에는 불가 |

즉 `approval_advisories` 에 `intervened boolean`(카드 이후 수정 있었나), `resubmitted boolean` 을 추가하고, `outcome_class` 를 이 셋의 조합으로 산출한다. **이 기능의 성공은 "예측이 맞았다"가 아니라 "반려를 미리 막았다"이므로, 측정 대상도 그것이어야 한다.**

이걸로 얻는 것:
1. **정확도 실측** — 단순 적중률이 아니라 위 `outcome_class` 분포로.
2. **선례 축적** — `approval_history`가 쌓여 다음 판정이 좋아진다. 사규 텍스트만으로는 알 수 없는 실무 관행("이 팀장은 증빙에 엄격")이 데이터로 들어온다.
3. **정지 조건** — 정확도가 낮으면 기능을 끄거나 프롬프트를 고칠 근거가 생긴다. 측정 없는 AI 기능은 신뢰를 잃는다.

이 한 줄이 있고 없고가 "그럴듯한 데모"와 "쓸수록 좋아지는 시스템"의 차이다.

#### 비용 · 모델

전 직원 결재마다 발동하므로 빈도가 가장 높다. 사규는 **고정 프리픽스**이므로 `cache_control`로 캐싱하면 캐시 읽기가 약 0.1배 비용이 된다.

| 단계 | 모델 |
|---|---|
| 규정 영역 분류 | `claude-haiku-4-5` |
| 위험 판정 + 근거 작성 | `claude-sonnet-5`, `effort: "medium"` — 조언이므로 Opus는 과함. 정확도가 부족하면 승격 |

### 5.5 장기: 계약서 / 견적서

`"이 계약은 지난 건보다 불리한 조항이 있습니다"` — 이건 **조항 단위 코퍼스**가 필요하다.

- 과거 계약서를 **조항 단위로 청킹**해서 같은 `kb_chunks`에 색인 (`kb_documents.source='contract'`)
- 표준계약서 조항 라이브러리를 기준선으로 등록
- 신규 계약 → 조항 분해 → 각 조항을 과거/표준 대비 검색 → 편차 리포트
- 산출물: 조항별 `유리 / 중립 / 불리 / 신규` 판정 + 비교 근거 인용

**설계상 요점**: 이건 새 시스템이 아니라 **Handler 추가 + 청킹 전략 변경**이다. 2장의 파이프라인 설계가 이걸 가능하게 한다. 지금 Handler 인터페이스만 제대로 잡아두면 된다.

```python
class AgentHandler(Protocol):
    kind: str
    def classify(self, doc: ParsedDoc) -> Confidence: ...
    def extract(self, doc: ParsedDoc) -> dict: ...        # structured outputs
    def build_artifact(self, data: dict) -> Artifact|None: ...  # xlsx/docx/None
    def propose(self, data: dict) -> ApprovalDraft: ...
    def execute(self, draft: ApprovalDraft) -> ExecutionResult: ...  # 승인 후에만
```

---

## 6. 모델 선택 · 비용

`.env`에 `ANTHROPIC_MODEL=claude-sonnet-5`가 있지만 단계별 분리를 권장한다:

| 단계 | 모델 | 근거 |
|---|---|---|
| 분류 / 트리아지 | `claude-haiku-4-5` ($1/$5) | "인보이스인가?" 수준. 고빈도·저난도 |
| 추출 | `claude-opus-5` ($5/$25) | 구조화 추출 정확도가 산출물 품질을 결정. structured outputs + `strict: true` |
| 챗봇 답변 | `claude-opus-5` | `effort: "medium"` 부터 스윕. Opus 5는 low/medium도 강함 |
| 계약 비교 | `claude-opus-5`, `effort: "high"` | 장문 컨텍스트 + 다중 비교 추론 |

**API 사용 시 주의사항** (모델이 2026년 기준으로 바뀐 부분):
- `temperature` / `top_p` / `top_k` → **Opus 5에서 400 에러**. 제거하고 프롬프트로 제어
- `thinking: {type:"enabled", budget_tokens:N}` → **400**. `{type:"adaptive"}` 사용
- Opus 5는 **thinking이 기본 ON**. `max_tokens`는 thinking + 응답을 합쳐 계산되므로 여유 필요
- Assistant prefill → **400**. `output_config.format` (structured outputs)로 대체
- `stop_reason == "refusal"` 을 `content` 읽기 **전에** 체크
- 프롬프트 캐싱: 사규/경비규정/PERSONA 등 고정 프리픽스에 `cache_control` → 캐시 읽기는 약 0.1배 비용. Opus 5는 최소 캐시 길이가 512토큰(4.8은 1024)이라 짧은 프롬프트도 캐싱됨

**비용 감각** (이력서 10장 1배치): 입력 ~30k + 출력 ~10k → Opus 5 기준 **약 $0.40**. 팀장 1명 한 시간을 아끼는 대가로 무시할 수준. 다만 `agent_audit_log`에 토큰/비용을 기록해 실측할 것.

### Claude 접근 경로 — AWS에서 운영하므로 선택지가 3개다

| 경로 | 인증·과금 | 모델 ID | 기능 |
|---|---|---|---|
| Anthropic API 직접 | API 키 | `claude-opus-5` | 전체 |
| **Claude Platform on AWS** | AWS SigV4 / IAM, AWS Marketplace 과금 | `claude-opus-5` (접두어 없음) | 전체 (당일 패리티) |
| Amazon Bedrock | AWS IAM, Bedrock 과금 | `anthropic.claude-opus-5` (접두어) | 일부 제외 |

**본 설계가 필요한 기능은 세 경로 모두 지원한다** — 도구 사용, structured outputs, 적응형 사고/effort, 프롬프트 캐싱(Bedrock은 수동 캐싱만, 자동 캐싱 미지원). 본 설계는 웹검색·코드실행·Batches를 쓰지 않으므로 Bedrock의 기능 공백이 걸리지 않는다.

**AWS 경로를 쓸 때의 실질적 이점은 기술이 아니라 명분이다.** IAM 인증 + AWS Marketplace 과금이면 호출이 이미 맺어진 AWS 계약 범위 안에서 일어나므로, 원시 API 키를 들고 외부로 나가는 것보다 **내부 설득이 훨씬 쉽다.**

> **다만 정직하게**: 세 경로 모두 3.5의 **①제3자 전송 차단을 해결하지 못한다.** Claude Platform on AWS는 Anthropic이 운영하고, Bedrock은 AWS가 운영한다 — 어느 쪽도 우리 인프라가 아니다. ①의 진짜 답은 로컬 LLM뿐이다. AWS 경로는 "주권 확보"가 아니라 **"주권 단계까지 가는 동안의 거버넌스 개선"** 으로 정확히 인식할 것. 이걸 주권 달성으로 포장하면 나중에 신뢰를 잃는다.

경로 전환은 3.5의 어댑터 안에서 클라이언트 클래스와 모델 ID만 바꾸면 되므로, **지금 결정하지 않아도 된다.** MVP는 가장 빠른 경로(API 키)로 시작해도 무방하다.

---

## 7. 보안 · 거버넌스

**설계 원칙: 에이전트는 사람 승인 없이 되돌릴 수 없는 외부 액션을 하지 않는다.**

툴을 3등급으로 분류하고 코드로 강제한다:
| 등급 | 예 | 승인 |
|---|---|---|
| `read` | 문서 검색, 파싱, 조회 | 불필요 |
| `draft` | 초안 생성, xlsx 생성, 스코어링 | 불필요 (콘솔에만 노출) |
| `commit` | 메일 발송, Power Automate 트리거, DB 쓰기 | **필수** |

`AgentHandler.execute()`는 `agent_approvals.status == 'approved'` 인 경우에만 호출되도록 서비스 레이어에서 게이팅.

**인증**: Entra ID(Azure AD) SSO. M365를 이미 구축했으므로 전 직원 계정이 존재한다. 이걸로 두 문제가 동시에 해결된다 — (a) 하드코딩 자격증명 제거, (b) "누구의 Outlook인가 / 누가 승인했는가"의 신원. Next.js에서 Auth.js(NextAuth) + `middleware.ts`로 `/console/*` 게이팅.

**웹 노출 구조**: geniein.com은 공개 기업 사이트다. 요청대로 하위경로(`/console`)로 두되 —
- `middleware.ts`로 서버사이드 차단 (현재 `middleware.ts` 파일 자체가 없음)
- `robots: index:false` (이미 layout metadata에 설정됨)
- CSP에 `connect-src 'self'` 추가
- *대안*: `app.geniein.com` 별도 앱(`apps/console`)으로 분리하면 번들·CSP·인증 경계가 훨씬 깔끔하다. 다만 "하위페이지" 요청에 맞춰 route group 방식을 기본안으로 둔다.

**Power Automate ↔ API 인증**: 공유 시크릿 HMAC 서명(`x-agent-signature`) + 타임스탬프 검증. Power Automate는 고정 IP가 아니므로 IP 화이트리스트만으로는 불충분.

---

## 8. 웹 콘솔 화면

```
/console                      대시보드 (대기 건수, 최근 처리, 이번달 비용)
/console/inbox          ★     승인 대기함 — 팀장의 메인 화면
/console/inbox/[id]           초안 상세: 원문 / 추출결과 / 근거 / 산출물 미리보기
                              → [승인] [수정 후 승인] [반려(사유)]
/console/chat                 지식조회 챗봇 (스트리밍 + 인용 링크)
/console/jobs                 처리 이력 · 실패 재시도
/console/knowledge            색인 문서 관리 · 재색인 · 제외 목록
/console/knowledge/upload  ★  HR 셀프서비스 업로드 (5.1의 Word 정책을 코드로 집행)
                              · .docx만 허용 (매직 바이트 판별)
                              · 메타데이터 입력: 역할범위 / 언어 / 시행일 / 대체대상
                                → 자동 추론 금지. 폼 필드 4개면 HR이 채운다
                              · 색인 후 "검색 잘 되나" 미리보기
/admin/agent/settings         프롬프트 / 임계값 / Power Automate 플로우 URL
```

> `apps/web/src/app/admin/layout.tsx:49`의 사이드바에 이미 **"AI Settings"** 링크가 있고 페이지는 없다. 자리가 이미 마련되어 있음.

**UI 부채**: shadcn 프리미티브가 2개뿐이므로 `input`, `textarea`, `card`, `table`, `dialog`, `scroll-area`, `badge`, `skeleton`, `tabs`를 재설치해야 한다 (`pnpm dlx shadcn@latest add ...`).

---

## 9. 로드맵

### Phase 0 — 선결 (약 1주) · 건너뛸 수 없음
- [x] ~~하드코딩 자격증명 제거~~, ~~`middleware.ts` 추가~~ / **Entra ID SSO 는 미도입**
  - 서버 세션 브리지로 대체 (2026-08-04). httpOnly 서명 쿠키 + scrypt 해시 + `apps/web/src/middleware.ts` 서버사이드 게이팅
  - `apps/web/src/lib/auth/session.ts` 가 **신원 발급자 경계**다. Entra 전환 시 `createSessionToken` 호출부만 바뀌고 `verifySessionToken` 소비자(middleware / BFF)는 그대로다
  - 남은 것: Azure AD 앱 등록(테넌트 관리자 권한) → Auth.js + Entra provider
- [x] `synchronize: false` + TypeORM 마이그레이션 인프라 구축
  - `apps/api/src/data-source.ts` + `src/migrations/` + `pnpm migration:run|generate|revert|show`
  - 베이스라인 마이그레이션은 멱등(`CREATE TABLE IF NOT EXISTS`) — 기존 DB 에서는 no-op
- [x] CORS origin 제한(`CORS_ORIGINS`), `/insights/admin`에 가드 추가(`ServiceTokenGuard`), CSP `connect-src` 추가
  - 관리자 데이터를 브라우저 직접 호출에서 **Next.js BFF(`/api/admin/*`) 경유**로 전환. 3.6 의 얇은 BFF 가 여기서 처음 실체화됐다
- [ ] API 키 전량 로테이션 ← **사용자 작업. 남아 있는 유일한 Phase 0 보안 항목**
- [x] `apps/agent-service` (FastAPI) 스켈레톤 + `/health`
- [x] **LLM 어댑터 경계 확정** (3.5) — 유스케이스 단위 함수. 최소공통분모 `generate()` 금지
  - `src/llm/base.py` + `anthropic_llm.py`. `run_agent_turn` 안에서 `cache_control` · adaptive effort · refusal 선체크를 유지
- [ ] 배포 코드화 — geniein.com은 AWS에서 돌지만 저장소에 CI/IaC가 없다. 뇌를 올리기 전 재현 가능한 배포 경로 확보
  - Dockerfile / docker-compose 는 있음. **CI·IaC 는 여전히 부재**

### Phase 1 — 유나 코어 + 첫 도구 (2~3주)
"챗봇을 만든다"가 아니라 **유나의 뇌를 만들고 도구 하나를 꽂는다**로 읽을 것 (3.2). 이 단계에서 만든 루프에 이후 모든 기능이 도구로 등록된다.
- [ ] **유나 코어**: 에이전트 루프(tool runner) + 시스템 프롬프트(인격 + **폴백 명시**) + 도구 레지스트리(YAML 로더)
- [ ] **기억**: `agent_identities` / `agent_conversations` / `agent_messages`
- [ ] 첫 도구 `search_knowledge` — pgvector 마이그레이션, `kb_*` 테이블
  - [ ] **A등급 docx ingest** — 구조 보존 파싱: heading 계층 + 표 마크업. **표를 청크 경계로 쪼개지 않는다**
  - [ ] **B등급 텍스트 PDF** — `pypdf` 추출. 외부 문서용이므로 처음부터 포함
  - [ ] 포맷 등급 자동 판별 (매직 바이트 + 폰트 개수). 업로더가 판단하지 않는다
  - [ ] 하이브리드 검색(BM25+벡터, RRF) + `role_scope` / `superseded_at` 필터
  - [ ] **부모-문서 주입** — 청크로 찾고 원본 섹션을 근거로 넣는다
  - [ ] `/console/knowledge/upload` — 등급 정책을 코드로 집행
  - [ ] C등급(스캔·스크린샷): **vision ingest** — OCR 엔진 도입하지 않음. `ocr_used=true`
  - [ ] 레거시 스캔본 5개: Word 원본 요청 → 없으면 vision ingest 또는 타이핑(13p)
- [ ] **`inject_context` 메커니즘** (3.2.1 원칙③) — 신원을 서버가 주입. 첫 도구부터 이 경로로
- [ ] `evals/routing.yaml` 질문 10개 (10.1) — 주로 폴백 검증
- [ ] `agent_audit_log` — 비용·토큰 + 도구 컬럼(`tool_name`/`tool_tier`/`tool_outcome`/`chain_position`, 10.2)
- [ ] `personas/default.yaml` (3.2.5) — 인격을 설정으로. `constraints` 는 오버라이드 불가로 로더에서 강제
- [ ] 문서 최신성 파이프라인 (5.1) — `content_hash` 비교, 구버전 청크 삭제, 개정일 노출
- [ ] `/console/chat` — **개발자 검증용.** 아직 사내 공개 아님 (3.1의 push-first 전략)

### Phase 1.2 — 몸 붙이기: Teams push 채널 (1주)
**대화 봇이 아니다 (3.1).** 카드 게시 경로만 뚫는다. Bot Framework 불필요 — Power Automate 카드 액션으로 충분하다.
- [ ] 뇌 → Adaptive Card JSON 반환 엔드포인트
- [ ] Power Automate가 Teams에 게시 (봇 등록·대화 처리 없음)
- [ ] 카드 딥링크에 `?ref=` 컨텍스트 인계 (3.1) — 웹에 오면 유나가 이미 그 건을 안다
- [ ] Teams 클라이언트에서 실제 렌더 확인 (스키마 버전 호환)

### Phase 1.5 — 반려 사전경고 사이드카 (1~2주) ★ 가치/위험 비율 최고
Phase 1의 사규 인덱스를 그대로 쓰고, **쓰기 액션이 0개**다. 전 직원이 Teams에서 보게 되므로 조직 내 체감 가치가 가장 크다.
- [ ] `POST /agent/advise` — 사규 RAG + 위험 판정 + Adaptive Card JSON 반환
- [ ] Power Automate 사이드카 플로우 (**병렬 분기 + 타임아웃 + 실패 무시**)
- [ ] Teams 카드 게시 (PA 액션. Bot Framework 불필요)
- [ ] `approval_advisories` / `approval_history` 테이블
- [ ] 판정 3계층: ① 로컬 결정론(한도·누락·개수 — LLM 없음) → ② 사규 RAG → ③ LLM 종합
- [ ] **아무것도 안 잡히면 카드를 보내지 않는다** — "이상 없음" 알림은 노이즈
- [ ] `POST /agent/advise/outcome` — 피드백 루프. **이걸 나중으로 미루지 말 것**
- [ ] `/console/advisory/[id]` 상세 근거 페이지 (카드 딥링크 `?ref=` 대상)
- [ ] 정확도 대시보드 — `outcome_class` 분포. **`개입후_통과`가 성공 지표** (단순 적중률 아님)

### Phase 2 — 승인 파이프라인 골격 + 경비 결재 (2~3주)
- [ ] `agent_jobs` / `agent_approvals` + Postgres 큐 워커
- [ ] `AgentHandler` 인터페이스 + `expense_draft` Handler
- [ ] Power Automate 인바운드(HMAC) + 아웃바운드(기존 플로우 트리거)
- [ ] `/console/inbox` 승인 화면
- [ ] 멱등성 검증 (같은 메일 2회 → 1건만)

### Phase 3 — 이력서 분석 회신 (2~3주)
> **이력서에는 5.1의 포맷 등급 정책을 적용할 수 없다** — 지원자가 보내는 것이므로 포맷을 강제할 수 없다. HWP·스캔PDF가 그대로 들어온다.
> **해법: LibreOffice의 역할을 "파싱"이 아니라 "렌더링"으로 바꾼다.** HWP/docx → PDF 렌더 → **vision으로 읽는다.** 텍스트 추출은 레이아웃이 손실되지만 렌더링은 사람이 보는 그대로이고, vision이 이력서의 표·2단 레이아웃을 이해한다. 5.1의 C등급 처리와 같은 원리.
- [ ] HWP/docx → PDF 렌더 (LibreOffice headless) → vision 읽기
- [ ] `resume_analysis` Handler + 추출 스키마 (structured outputs)
- [ ] openpyxl 비교 매트릭스
- [ ] Graph sendMail 첨부 회신
- [ ] 개인정보 보관정책 + 자동 파기 배치

### Phase 4 — 계약서 / 견적서 (장기)
- [ ] 조항 단위 청킹, 표준조항 라이브러리
- [ ] `contract_review` Handler
- [ ] 조항별 유리/불리 판정 리포트

---

## 10. 운영 — 라우팅 eval · 관측

지금까지의 설계는 **골격**이고, 실무에서 이 골격과 함께 반드시 따라오는 게 운영 영역이다. "도구 설명을 잘 쓰면 된다"에서 끝나지 않는다 — 설명이 맞는지를 **숫자로 확인**해야 한다.

다만 **지금 다 만들면 오버엔지니어링이다.** 아래는 각 장치의 도입 트리거를 명시한 것이다.

### 10.1 라우팅 eval — 가장 싸고 가장 먼저 필요하다

라우팅 평가는 답변 품질 평가보다 훨씬 싸다. **정답이 "어떤 도구를 불렀나" 하나라서 자동 채점이 되고, LLM judge가 필요 없다.**

```yaml
# evals/routing.yaml
- q: "출장 일비 규정 어떻게 돼?"
  expect: [search_knowledge]
- q: "안녕"
  expect: []                          # 도구 없이 답해야 함 — 폴백 검증
- q: "고마워 수고했어"
  expect: []
- q: "내 출장 결재 반려됐어? 왜?"
  expect: [get_approval_status, search_knowledge]   # 복합 — 3.2의 판정 케이스
- q: "지난달 경비 얼마 썼고 규정 한도는 뭐야?"
  expect: [get_expense_history, check_expense_policy]
```

채점은 **호출된 도구 이름의 집합 비교**다. 스크립트 하나면 되고 CI도 필요 없다.

**실제 목적은 회귀 방어다.** 도구를 3개 → 4개로 늘릴 때 **새 도구가 기존 도구의 호출을 잡아먹는 현상**이 실무에서 자주 일어난다. 예를 들어 `check_expense_policy`를 추가하면 원래 `search_knowledge`가 답했던 규정 질문을 가져가기 시작한다. eval 없이는 이걸 사용자 불만으로 알게 된다.

| 시점 | 할 것 |
|---|---|
| 도구 1개 (MVP) | 질문 10개. 대부분 폴백 검증용(잡담에 도구 안 부르나) |
| **설명이 겹치는 도구가 생기는 순간** | ★ 여기가 진짜 트리거. 질문 20~30개로 확장 |
| 도구 5~6개 초과 | 계층 라우팅 검토. 신호는 "엉뚱한 도구를 부를 때" |

**라우팅이 틀리면 코드를 고치는 게 아니라 `description`을 고친다.** 도구가 늘고 조합이 필요해질 때 설명글 튜닝의 효과가 실제로 커진다 — 그래서 eval이 있어야 튜닝의 효과를 확인할 수 있다.

### 10.2 관측 — "라우팅이 틀렸나, 도구가 틀렸나"

유나가 엉뚱한 답을 했을 때 원인이 두 곳 중 하나다. 이걸 구분하려면 로그가 남아야 한다. 4장의 `agent_audit_log`를 도구 단위로 확장한다:

```sql
agent_audit_log(
  ...기존 컬럼...,
  tool_name text,          -- 어떤 도구를 불렀나      → 라우팅 정확도
  tool_tier text,          -- read|draft|commit       → 등급별 집계
  tool_input jsonb,        -- 어떤 인자로             → 인자 채우기 품질
  tool_outcome text,       -- ok|error|denied         → denied는 승인 게이트 작동 기록
  latency_ms int,
  chain_position int       -- 연쇄 몇 번째 호출인가    → 3.2의 N+1 비용 실측
)
```

`chain_position` 이 있으면 **연쇄 깊이 분포**가 보이고, 그게 곧 비용 구조다. `tool_outcome='denied'` 집계는 7장 승인 게이트가 실제로 작동하는지의 증거가 된다.

MVP엔 과하지 않다 — 도구 실행 함수 한 곳에 로깅을 넣으면 끝이고, 5.4의 정확도 대시보드와 같은 인프라를 쓴다.

### 10.3 안 할 것 (지금)

| 항목 | 판단 |
|---|---|
| 계층 라우팅 (2단 분류) | 도구 5~6개까진 불필요. **"엉뚱한 도구 호출" 신호 전엔 손대지 말 것** |
| MCP 서버화 | 유나가 유일 소비자인 동안 오버. 3.2.2의 승격 트리거 참조 |
| 별도 분류 LLM (방식 1) | 툴콜이 이미 이 일을 한다. 호출 2배만 늘어남 |
| LLM judge 기반 답변 품질 eval | 라우팅 eval이 먼저다. 판정에 확률 요소를 더 넣지 말 것 |

> **가장 큰 실무 리스크는 기술적 복잡도가 아니다** — 기능적으로 필요 없는데 "에이전트"라 부를 수 있는 시스템을 만드는 것이다. 본 설계가 검증된 기존 자산(M365 플로우) 위에 얇게 올라가고 도구 1개로 시작하는 이유가 이것이다.

## 11. 확인이 필요한 사항

0. **뇌를 놓을 서버 — 해결됨 (AWS).** geniein.com이 AWS에서 운영 중이므로 뇌의 집이 이미 있고, 3.4의 인바운드 경로도 자연히 해결된다. 다만 **저장소에는 배포 산출물이 하나도 없다** (Dockerfile / CI / IaC 전부 부재) — 즉 배포가 저장소 밖에서 수동 또는 콘솔 설정으로 이뤄지고 있다. 뇌를 여기 올리기 전에 최소한 컨테이너화 + 재현 가능한 배포 경로가 필요하다. 확인 필요: 현재 어떤 방식인가 (EC2 / ECS / Amplify / Elastic Beanstalk), 어느 리전인가.
1. **배포 타깃**: web/api/worker/agent-service 각각의 배치. web은 Vercel(`@vercel/analytics`가 설치되어 있음)이 유력하지만 — **worker가 `apps/web/public/uploads/insights/`에 이미지를 직접 쓰고 있다** (`main.py:26`). Vercel 파일시스템은 읽기 전용이므로 분리 배포 시 즉시 깨진다. 오브젝트 스토리지(S3/Azure Blob) 전환이 선행되어야 한다.
2. **SharePoint 색인 범위**: 어떤 라이브러리를 포함/제외할지. HR·재무는 Phase 1 제외 권장.
3. **이력서 보관 기간**: 개인정보 파기 정책 (권장: 90일).
4. **Power Automate 기존 결재 플로우의 HTTP 트리거 페이로드 스키마** — 필드명을 알아야 execute()를 구현할 수 있다.
5. **기능 2·3 순서**: 본 문서는 3(경비) → 2(이력서)를 권장하지만 사업 우선순위가 다르면 조정 가능.
6. **사규 문서가 RAG에 넣을 만한 형태인가** (5.4의 전제) — 반려 경고는 "제12조 3항"처럼 **조항 단위 인용**이 가능해야 신뢰를 얻는다. 사규가 hwp/pdf 스캔본이면 조항 구조 추출이 선행 작업이 된다. 텍스트 기반 문서인지, 조항 번호 체계가 일관적인지 확인 필요.
7. **과거 결재 이력에 접근 가능한가** (5.4 선례 베이스) — Power Automate 승인 이력은 Dataverse에 남는다. 조회 가능하면 선례 베이스를 즉시 부트스트랩할 수 있고, 불가능하면 Phase 1.5 시점부터 우리가 직접 축적해야 한다(초기 몇 주는 사규 규칙 기반만으로 동작).
8. **반려 경고 카드의 1차 수신자**: 기안자 / 결재자 / 양쪽. 기안자를 권장(왕복 제거)하지만 조직 문화에 따라 "AI가 내 결재를 훑어봤다"는 반응이 나올 수 있다.
9. **결재 유형 범위**: 경비만인가, 휴가·구매·계약까지인가. 유형별로 적용 사규가 달라 인덱스 범위가 결정된다.
