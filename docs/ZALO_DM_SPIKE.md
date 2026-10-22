# Zalo DM 스파이크 — 지니에게 Zalo 로 묻기

작성일: 2026-10-22 · 브랜치 `feat/zalo-dm-spike`

## 왜

지니(Geniein 그룹)는 M365 를 사실상 메일로만 쓰고, 직원 대부분은 Zalo 를 쓴다.
`docs/AI_AGENT_DESIGN.md` 의 "push 는 Teams 카드" 전제가 지니에서는 성립하지 않는다.
Zalo 공식 Bot Platform(https://bot.zapps.me/docs) 이 있으므로, Teams 대신 Zalo DM 을 몸(입)으로 붙인다.
뇌·게이트웨이는 그대로다 — 몸은 얇게, 뇌는 두껍게.

```
Zalo 앱 ──DM──▶ Zalo 서버 ──webhook POST──▶ genie.geniein.com/zalo/webhook (nginx → Genie NestJS :3101)
                                              │  X-Bot-Api-Secret-Token 검증
                                              │  200 즉시 반환, 처리는 뒤에서
                                              ▼
                                      AgentService.ask()  →  뇌 /agent/message (org = ZALO_ORG_ID)
                                              │
                                              ▼
                                      POST bot-api.zapps.me/bot<TOKEN>/sendMessage {chat_id, text}
```

## 무엇이 들어갔나

| 파일 | 역할 |
|---|---|
| `apps/api/src/zalo/zalo.controller.ts` | `POST /zalo/webhook`. 시크릿 검증 → 텍스트 DM 만 추출 → 200 → 비동기 처리 |
| `deploy/nginx/genie.geniein.com.conf` | `location = /zalo/webhook` → 127.0.0.1:3101. 이 블록에서 NestJS 로 가는 유일한 경로 |
| `apps/api/src/zalo/zalo.service.ts` | 뇌 호출, 채팅별 이력(메모리, 10턴), 중복 웹훅 무시, 2,000자 제한, sendMessage |
| `apps/api/src/agent/agent.service.ts` | `ask(question, identity)` 추가. Teams 의 `search()` 는 이걸 감싼다 |
| `apps/api/scripts/zalo-bot.mjs` | getMe / setWebhook / getWebhookInfo / deleteWebhook / send CLI |
| `apps/api/.env.example` | `ZALO_BOT_TOKEN` `ZALO_WEBHOOK_SECRET` `ZALO_ORG_ID` |

스파이크라서 **안 한 것**: 그룹 채팅(Beta, @멘션 필요), 신원 매핑(Entra ↔ Zalo), 이력 영속화, 콘솔 딥링크.
신원은 `zalo:<user id>` 로 뇌에 넘긴다. 나중에 매핑 표가 생기면 접두사로 구분된다.

## 해보는 순서 (약 1시간)

1. **봇 만들기** — https://bot.zaloplatforms.com 에서 봇 생성, 토큰 복사. (요금제 화면이 있으면 무료 한도를 같이 적어 둔다.)
2. **서버 `/var/www/genie/apps/api/.env`** (Genie NestJS, 3101) 에 추가. `/var/www/Geniein` 쪽(홈페이지, 3001)이 아니다:
   ```
   ZALO_BOT_TOKEN=<1에서 받은 토큰>
   ZALO_WEBHOOK_SECRET=<openssl rand -hex 24>
   ZALO_ORG_ID=<지니 테넌트 id — ENTRA_ALLOWED_TENANTS 두 값 중 지니 쪽>
   ```
   `RAG_SERVICE_URL` / `AGENT_SERVICE_TOKEN` 은 이미 Teams 탭용으로 있어야 한다.
3. **`/var/www/genie` 에 이 브랜치 체크아웃 → Genie NestJS 재빌드·재시작** (pm2). nginx 블록에 `location = /zalo/webhook` 을 넣고 `sudo nginx -t && sudo systemctl reload nginx`.
4. **봇 확인 → 웹훅 등록**:
   ```
   cd apps/api
   node scripts/zalo-bot.mjs me
   node scripts/zalo-bot.mjs set-webhook https://genie.geniein.com/zalo/webhook
   node scripts/zalo-bot.mjs webhook-info
   ```
5. **베트남 팀원 한 명이 Zalo 에서 봇을 찾아 "xin chào"** 를 보낸다. NestJS 로그에
   `검색 완료 user=zalo:…` 가 찍히고 Zalo 로 답이 오면 통과.
   - 봇에게 먼저 말을 걸어야 DM 이 열리는지(텔레그램 방식)가 여기서 확인된다.
6. **사규 질문 한 개** (예: "Phụ cấp công tác là bao nhiêu?"). 답에 출처가 붙는지 본다.

뇌 호출은 질문마다 Anthropic 과금이 있다. 스파이크는 질문 5~10개면 충분하다.

## 통과하면 다음

- 조직도 페이지의 1단계 "사규 Q&A 입구를 Zalo DM 으로"가 끝난 것이다.
- 다음은 push 방향: 메일 인보이스 → 경비 초안 → CSO 에게 Zalo DM. 그때 `sendMessage` 를 그대로 재사용한다.
- 신원 매핑 표(`channel_identities`: entra_oid · zalo_user_id · slack_user_id)를 뇌 쪽에 둔다.
