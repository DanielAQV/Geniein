# 마이키 봇 채널 — 먼저 말 걸기

> 상태 (2026-08-28): **코드 완료, 봇 등록에서 막힘.**
> Azure 구독을 AQV 테넌트에 만드는 단계에서 멈춰 있다. 자격증명이 없으면 봇만
> 꺼지고 탭은 그대로 돌기 때문에, 이 상태로 배포해도 깨지는 것은 없다.

## 1. 왜 봇인가 — 설계문서 3.1 의 결정을 바꾼다

설계문서는 "Bot Framework 불필요 (확정)" 이라고 적었다. 그 전제는 **Teams 를
대화창으로 쓰지 않는다** 였고, 카드만 던지면 되니 Power Automate 로 충분하다는
판단이었다.

전제가 바뀌었다. 마이키 탭이 실제로 사내 소통 창구가 됐고, 알림이 플로우봇에서
오면 "시스템이 또 뭐라 한다" 가 된다. 마이키 이름으로 오고 **그 자리에서 되물을
수 있어야** 채널이 하나로 모인다.

우회로는 셋을 검토했고 둘은 막혀 있다.

| 방법 | 결과 |
|---|---|
| Graph 로 앱 전용 채팅 발신 | **불가.** `POST /chats/{id}/messages` 앱 전용은 마이그레이션 용도(`Teamwork.Migrate.All`)로만 열려 있다 |
| Teams 활동 피드 (`sendActivityNotification`) | 가능. 마이키 이름으로 뜨고 탭으로 딥링크된다. 다만 **그 자리에서 답장이 안 된다** |
| Bot Framework | 채택. 유일하게 스레드가 이어진다 |

활동 피드는 봇이 막힐 경우의 대안으로 남겨 둔다 — 구독도 봇 등록도 필요 없고,
앱 권한 `TeamsActivity.Send` 하나로 된다.

## 2. 지금 붙어 있는 것

설계문서 3.1 이 정한 "몸은 얇게" 를 그대로 따른다. 봇에는 라우팅 판단이 없다.

```
① 사용자 발언을 그대로 뇌에 올린다          bot.service.ts onTurn
② conversationReference 를 저장한다          bot_conversations
③ 뇌가 내려준 것을 그대로 렌더한다           sendActivity
```

| 파일 | 역할 |
|---|---|
| `apps/api/src/bot/bot.service.ts` | CloudAdapter, 수신 턴, `notify()` |
| `apps/api/src/bot/bot.controller.ts` | `/bot/messages`, `/bot/notify` |
| `apps/api/src/bot/bot-conversation.entity.ts` | 손잡이 저장소 |
| `apps/api/src/migrations/1756370000000-BotConversations.ts` | 표 생성 |
| `apps/teams-app/build.mjs` | `BOT_APP_ID` 가 있을 때만 `bots` 블록을 얹는다 |
| `deploy/nginx/genie.geniein.com.conf` | `location /bot/` → NestJS(:3001) |

### 경계가 둘이고 방향이 반대다

```
/bot/messages   가드 없음.  부르는 쪽이 Bot Framework 라 우리 토큰이 없다.
                            인증은 활동에 실린 JWT 로 SDK 가 한다.
                            ★ 여기에 ServiceTokenGuard 를 붙이면 한 통도 못 받는다.

/bot/notify     서비스 토큰. 우리 뒷단(플로우 → 게이트웨이)만 부른다.
                            ★ 이 문이 열려 있으면 아무나 마이키 이름으로
                              직원에게 말을 걸 수 있다. 봇에서 가장 위험한 표면이다.
```

### 손잡이 표를 따로 둔 이유

설계문서 4장의 `agent_conversations`(대화 로그)와 **다른 표**다. 하나로 합치면
로그 보존정책이 발신 능력을 지운다 — 오래된 대화를 지우는 순간 그 사람에게
다시는 말을 못 걸게 된다.

## 3. 막힌 곳 — 봇 등록

포털에서 **다중 테넌트 봇 생성 옵션이 사라졌다.** 남은 것은 단일 테넌트와
사용자 할당 관리 ID 뿐이다. 단일 테넌트 봇은 그 테넌트 안에서만 동작하므로,
**봇은 AQV 테넌트에 있어야 한다.**

그런데 Azure Bot 리소스에는 구독이 필요하고, 지금 구독은 geniein 에 있다.

- 시도 1: geniein 구독 → AQV 직원이 못 쓴다
- 시도 2: 구독을 AQV 디렉터리로 이전 → 소유자 계정이 양쪽 디렉터리에 있어야 한다
- **선택: AQV 계정(`info@airquayvina.com`)으로 구독을 새로 만든다.** 여기서 멈춤

대안으로 `az bot create --app-type MultiTenant` 는 CLI 에 남아 있지만, 포털이
밀어내고 있는 경로라 나중에 막힐 수 있다. 봇은 원래 테넌트마다 하나씩이고
마이키는 AQV 것이므로, AQV 에 두는 쪽이 맞다.

## 4. 남은 절차

### ① Azure (AQV 계정으로)

```
portal.azure.com → 리소스 만들기 → "Azure Bot"
  봇 핸들          mikey-bot
  가격 책정 계층    F0 (기본이 S1 이니 바꿔야 한다)
  앱 유형          단일 테넌트
  Microsoft 앱 ID  새로 만들기      ← Genie 앱을 재사용하지 않는다

만든 뒤:
  구성 → 메시징 엔드포인트  https://genie.geniein.com/bot/messages
  채널 → Microsoft Teams 추가
  구성 → [관리] → 인증서 및 비밀 → 새 클라이언트 암호
```

★ 봇 앱을 탭 SSO 앱(`62a46191-…`)과 나눈다. 봇은 인터넷에서 직접 두드려지는
표면이라, 자격증명을 공유하면 하나가 새는 순간 둘 다 샌다.

### ② EC2 (`apps/api/.env`)

```
MICROSOFT_APP_ID=<봇 앱 ID>
MICROSOFT_APP_PASSWORD=<시크릿>
MICROSOFT_APP_TYPE=SingleTenant
MICROSOFT_APP_TENANT_ID=3685a694-9c78-4783-ada9-5c1e8d5f769b
BOT_APP_ID=<봇 앱 ID>
```

> ★ `MICROSOFT_APP_TYPE` 이 `SingleTenant` 면 `MICROSOFT_APP_TENANT_ID` 가
> **필수**다. MultiTenant 로 만들었다면 반대로 비워야 한다. 어긋나면 토큰
> audience 가 맞지 않아 401 이 나는데, 로그에는 그냥 인증 실패로만 보인다.

### ③ 배포

```
pnpm --filter @geniein/api build
pnpm --filter @geniein/api migration:run      # bot_conversations
pm2 restart genie-api

sudo cp deploy/nginx/genie.geniein.com.conf /etc/nginx/sites-available/genie
sudo nginx -t && sudo systemctl reload nginx  # ★ -t 통과할 때만
```

### ④ Teams 앱 재업로드

```
node apps/teams-app/build.mjs      # BOT_APP_ID 가 있으면 bots 블록이 붙는다
```

`dist/` 를 zip 으로 묶어 다시 올린다. 매니페스트 버전이 이전보다 커야 Teams 가
받는다 (`build.mjs` 의 버전 주석 참조).

### ⑤ 확인

봇에게 개인 채팅으로 아무 말이나 건다. 그 순간 손잡이가 저장된다.

```sql
SELECT tenant_id, object_id, updated_at FROM bot_conversations;
```

행이 생기면 선제 발신을 시험할 수 있다.

```bash
curl -X POST https://genie.geniein.com/bot/notify \
  -H "x-service-token: $ADMIN_SERVICE_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"tenantId":"3685a694-…","objectId":"…","text":"테스트"}'
```

## 5. 그 위에 올라갈 것 — 첨부 대조

봇이 붙으면 마지막 한 줄이 이어진다.

```
Purchase Request 제출
  → 플로우가 HTTP 액션으로 게이트웨이를 부른다
  → 뇌: POST /check/purchase-request   (apps/agent-service/src/checks/)
  → 어긋난 게 없으면 {"notify": false} — 아무 일도 일어나지 않는다
  → 있으면 게이트웨이가 /bot/notify 로 요청자에게
```

검사 로직은 이미 올라가 있고 봇 없이도 돌려볼 수 있다.

```
python -m src.checks.run <항목ID>
```

시험 계정 제한은 **양쪽에** 건다 — 플로우 조건으로 한 번, 뇌의
`PR_CHECK_ALLOWED_EMAILS` 로 한 번. 플로우를 잘못 건드려도 전 직원에게 나가지
않게 한다. 이 값이 비어 있으면 전원 허용이 아니라 **전원 차단**이다.
