# Teams 탭 배포 절차 — `genie.geniein.com`

Teams 탭을 실제 호스트에 올리는 순서. 한 번 해두면 그 주소가 그대로 운영 주소가 된다.

## 0. 왜 서브도메인이 필요한가

Teams 는 SSO 토큰을 내주기 전에 **Application ID URI 의 도메인**과 **탭 iframe 의 오리진**이
같은지 본다. 다르면 이렇게 거절한다:

```
App resource defined in manifest and iframe origin do not match
```

`validDomains` 를 맞춰도 소용없다 — 별개의 검사다. 자세한 배경은
[TEAMS_TAB_DESIGN.md §4.6](TEAMS_TAB_DESIGN.md).

현재 App ID URI 가 `api://genie.geniein.com/<clientId>` 이므로, 탭은 반드시
`https://genie.geniein.com` 에서 서빙돼야 한다.

### 실측한 현황 (2026-08-16)

| 항목 | 값 |
|---|---|
| `geniein.com` | `54.89.239.197` (EC2, us-east-1) |
| 웹 서버 | nginx/1.28.3 (Ubuntu) |
| 돌고 있는 것 | **이 저장소의 Next 앱** — 응답 헤더가 `next.config.mjs` 산출물과 일치 |
| 배포된 브랜치 | `main` 계열 (`frame-ancestors 'self'` → `/teams` 분리가 없음) |
| DNS 관리 | Route53 아님. **whois.com 레지스트라 네임서버** (`ns1~4.whois.com`) |
| `genie.geniein.com` | 아직 없음 (`www` 만 같은 IP) |

---

## 1. DNS — whois.com 관리 페이지

`geniein.com` 존에 A 레코드 추가:

| 이름 | 타입 | 값 | TTL |
|---|---|---|---|
| `genie` | A | `54.89.239.197` | 300 |

전파 확인 (**2 단계 전에 반드시**):

```bash
nslookup genie.geniein.com
dig +short genie.geniein.com     # 54.89.239.197 이 나와야 한다
```

> ★ 전파 전에 certbot 을 돌리면 도메인 검증이 실패한다. A 레코드가 보인 뒤에 진행할 것.

---

## 2. nginx + TLS (EC2)

### 2.1 먼저 확인 — nginx 가 보안 헤더를 직접 붙이고 있는가

```bash
sudo grep -rn "add_header" /etc/nginx/
```

보안 헤더는 Next 앱이 만든다 (`apps/web/next.config.mjs`). 확인할 것은 **`http` 블록
(`nginx.conf`) 수준의 `add_header`** 다 — 그건 새로 만들 서버 블록에도 상속된다.
다른 `server` 블록(홈페이지) 안에 있는 건 우리와 무관하다.

> ★ `http` 수준에 `add_header X-Frame-Options SAMEORIGIN always;` 같은 게 있으면
> **Teams 탭이 백지로 뜬다.** `X-Frame-Options` 는 소스 목록을 못 받아 완화할 방법이 없고,
> 앱이 헤더를 빼도 nginx 가 도로 붙여버린다. 이 경우 우리 블록 안에
> `proxy_hide_header X-Frame-Options;` 를 넣는다.
>
> 참고: 한 컨텍스트에 `add_header` 를 하나라도 쓰면 **상위 컨텍스트의 `add_header` 는
> 전부 무시된다.** 그래서 우리 블록에서는 아예 안 쓰는 편이 안전하다.

### 2.2 프로세스 배치 — 홈페이지를 건드리지 않는다

그 EC2 에는 **회사 홈페이지가 이미 돌고 있고, 그것도 이 저장소의 앱이다.**
실측한 배치 (2026-08-16):

| | |
|---|---|
| 체크아웃 | `/var/www/Geniein` — `apps/{ai-worker,api,web}`. `agent-service`·`teams-app` 이 없는 **옛 main** |
| 프로세스 매니저 | **pm2** (`~/.pm2`) |
| Next (홈페이지) | `localhost:3000` ← nginx `location /` |
| NestJS | `localhost:3001` ← nginx `location /api/` (**이미 공개돼 있다**) |

Teams 탭 때문에 홈페이지를 feature 브랜치로 갈아엎을 이유는 없으므로 **따로 띄운다.**

| 무엇 | 브랜치 | 주소 | nginx 로 노출? |
|---|---|---|---|
| 회사 홈페이지 | `main` (기존 `/var/www/Geniein`) | `127.0.0.1:3000` | `geniein.com` — **손대지 않음** |
| 유나 Teams 탭 | `feat/teams-tab` (새 `/var/www/yuna`) | `127.0.0.1:3100` | `genie.geniein.com` (새 블록) |
| 유나 NestJS | 〃 | `127.0.0.1:3101` | **안 함** |
| 뇌 (FastAPI) | 〃 | `127.0.0.1:8001` | **절대 안 함** |

> ★ NestJS 도 새로 띄운다. 3001 에 떠 있는 것은 옛 main 이라 `/agent/search` 도,
> Entra 가드도 없다. 포트를 나눠야 홈페이지 API 가 안 흔들린다.

> ★★ `genie.geniein.com` 을 **FastAPI(8000/8001)로 프록시하면 안 된다.** 탭은 FastAPI 가
> 아니라 Next 앱의 `/teams/search` 라우트다. 뇌를 그대로 공개하면 설계문서 §4.2 가 닫아둔
> 구멍이 도로 열린다 — 뇌에는 `x-service-token` 검사밖에 없다. 브라우저는 그 토큰을 붙일
> 수 없으므로 탭도 어차피 안 돈다.

### 2.3 서버 블록 (새 파일)

기존 `sites-available/default` 는 **건드리지 않는다.** nginx 는 `server_name` 으로 갈라주므로
블록이 둘이면 서로 간섭하지 않는다.

> ★★ **기존 블록의 `location /api/` 규칙을 복사하지 말 것.**
>
> 홈페이지 블록에는 이런 게 있다:
> ```nginx
> location /api/ { proxy_pass http://localhost:3001/; }   # → NestJS
> ```
> 그런데 우리 BFF 는 **Next 앱 안에 있는** `/api/teams/search` 다. 이 규칙을 새 블록에
> 옮겨 붙이면 탭의 검색 요청이 NestJS 로 새서 404 가 나고, 화면에는 "검색 서버에 연결하지
> 못했습니다"만 뜬다 — 원인을 찾기 아주 어려운 형태로 죽는다.
> **새 블록에는 `location /` 하나만 둔다.**

`/etc/nginx/sites-available/genie`:

```nginx
server {
    listen 80;
    server_name genie.geniein.com;

    # ★ 여기에 add_header 를 쓰지 않는다.
    #   보안 헤더·CSP 는 Next 앱이 경로별로 만든다 (/teams 만 Teams 프레임 허용).
    #   nginx 가 CSP 를 하나 더 붙이면 헤더가 두 벌이 되고, 브라우저는 **둘 다**
    #   만족시켜야 하므로 교집합이 좁아져 조용히 막힌다.

    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";

        # 에이전트 루프가 도는 동안 응답이 수십 초 걸린다. 기본 60s 면 끊긴다.
        proxy_read_timeout 300s;
        proxy_buffering off;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/genie /etc/nginx/sites-enabled/genie
sudo nginx -t && sudo systemctl reload nginx
```

### 2.4 인증서

블록이 따로이므로 인증서도 따로 받는다 — **기존 홈페이지 인증서를 건드리지 않는다.**

```bash
sudo certbot --nginx -d genie.geniein.com
```

certbot 이 위 블록에 443 리스너와 인증서 경로를 직접 써 넣고 80 → 443 리다이렉트를 붙인다.

> ★ HSTS 가 `includeSubDomains; preload` 로 걸려 있다. 즉 브라우저는
> `genie.geniein.com` 에 **평문 HTTP 로 접속하지 않는다.** 인증서가 붙기 전까지는
> 아예 안 열린다 — "DNS 는 됐는데 페이지가 안 뜬다"의 원인이 대개 이것이다.
> Teams 도 공개 CA 인증서를 요구한다 (자체 서명 불가).

확인:

```bash
curl -sSI https://genie.geniein.com | head -1        # HTTP/2 200
```

---

## 3. 웹 앱 배포

**이 브랜치를 올려야 한다.** `main` 에는 `/teams/*` 라우트도, `frame-ancestors` 분리도 없다.

홈페이지가 쓰는 체크아웃과 **별도 디렉터리**에 받는다. 같은 작업트리에서 브랜치를 바꾸면
홈페이지까지 같이 바뀐다.

```bash
sudo git clone -b feat/teams-tab <저장소> /var/www/yuna
sudo chown -R ubuntu:ubuntu /var/www/yuna
cd /var/www/yuna
pnpm install --frozen-lockfile
pnpm --filter web build

cd apps/web
PORT=3100 pm2 start pnpm --name yuna-web -- start
pm2 save
```

`apps/web/.env` 에 필요한 값:

| 변수 | 값 | 없으면 |
|---|---|---|
| `ADMIN_SERVICE_TOKEN` | NestJS 쪽과 **같은 값** | 503 `upstream_not_configured` |
| `API_INTERNAL_URL` | `http://127.0.0.1:3101` | ★ `http://localhost:3001` 로 기본값이 잡힌다 |
| `NEXT_PUBLIC_TEAMS_DEBUG` | 첫 배포 동안 `1` | 오류 원문이 화면에 안 나온다 |

> ★ `NEXT_PUBLIC_TEAMS_DEBUG=1` 은 **처음 올릴 때 켜 둔다.** 탭은 크로스 오리진 iframe
> 이라 밖에서 콘솔을 읽을 수 없어서, 이게 없으면 SSO 가 실패해도 "로그인 정보를 받지
> 못했습니다"만 보이고 원인을 알 수 없다. 통과를 확인하면 지우고 다시 빌드한다.
> (`NEXT_PUBLIC_*` 는 빌드 타임에 박히므로 값을 바꾸면 재빌드해야 한다.)

> ★ `API_INTERNAL_URL` 을 반드시 적는다. 비워두면 BFF 가 **홈페이지용 NestJS(3001)** 를
> 부르게 된다. 거기엔 `/agent/search` 가 없어 404 → 502 로 바뀌어 나오는데, 화면 문구만
> 봐서는 "상류가 아직 없음"과 구분이 안 된다.

> `allowedDevOrigins` 는 개발 서버 전용이라 운영 빌드에 영향이 없다.

검증:

```bash
curl -sSI https://genie.geniein.com/teams/search | grep -i "frame"
# Content-Security-Policy 에 frame-ancestors https://*.cloud.microsoft ... 가 있고
# X-Frame-Options 는 아예 없어야 한다
```

---

## 4. 중간 점검 — 상류 없이 SSO 만 먼저 확인

NestJS·뇌를 아직 안 올렸어도 **SSO 성공 여부는 여기서 판정할 수 있다.**
탭에서 검색해 보고 오류 문구를 본다:

| 화면 문구 | 뜻 |
|---|---|
| 로그인 정보를 받지 못했습니다 | **SSO 실패.** 6장으로 |
| 아직 설정이 끝나지 않았습니다 | SSO 성공. `ADMIN_SERVICE_TOKEN` 이 없을 뿐 |
| 검색 서버에 연결하지 못했습니다 | SSO 성공. 상류(NestJS/뇌)가 없거나 못 닿음 |

**첫 줄이 아닌 무엇이든 나오면 도메인 문제는 끝난 것이다** — 토큰을 받아 BFF 까지 갔다는 뜻이다.
`docs/TEAMS_TAB_DESIGN.md` §4.6 이 닫힌다.

---

## 5. 상류 — NestJS + 뇌

Next 를 EC2 에 올리면 BFF 는 **서버에서** 상류를 부른다. 노트북에서 돌던 NestJS·뇌에는
EC2 가 닿을 수 없으므로 같이 올려야 한다.

`apps/api` (NestJS):

| 변수 | 값 |
|---|---|
| `ENTRA_ALLOWED_TENANTS` | 허용 테넌트 ID 들 (콤마 구분) |
| `ENTRA_API_AUDIENCE` | `api://genie.geniein.com/<clientId>` |
| `ADMIN_SERVICE_TOKEN` | web 과 같은 값 |
| `RAG_SERVICE_URL` | 뇌 주소 |
| `AGENT_SERVICE_TOKEN` | 뇌가 검사하는 토큰 |

> Teams 경로에서 NestJS 는 **브라우저가 직접 부르지 않는다** (BFF 가 서버에서 호출).
> 따라서 이 경로 때문에 `CORS_ORIGINS` 를 건드릴 필요는 없다.

뇌 (FastAPI):

- `ANTHROPIC_API_KEY`, `AGENT_SERVICE_TOKEN`, DB 접속 정보
- 배포 compose 에서는 `ports` 를 빼고 `expose` 만 둔다 (설계문서 §4.2)
- ★ BGE-M3 임베딩은 GPU 를 쓴다. EC2 에 GPU 가 없으면 CPU 로 떨어지는데, **질의**
  임베딩은 견딜 만해도 **색인**은 아니다. 색인은 로컬 GPU 에서 돌리고 DB 만 옮기는 게 낫다.

---

## 6. Entra 남은 설정

- **Application ID URI**: `api://genie.geniein.com/<clientId>` — 이미 이 값이면 손댈 것 없음
- **Expose an API**: `access_as_user` 스코프
- **클라이언트 응용 프로그램 승인** — 이게 빠지면 동의창 없이 토큰이 안 나온다:
  - `1fec8e78-bce4-4aaf-ab1b-5451cc387264` (Teams 웹)
  - `5e3ce6c0-2b1f-4285-8d4b-75ee78787346` (Teams 데스크톱/모바일)
- **두 번째 테넌트 관리자 동의**:
  `https://login.microsoftonline.com/<tenantId>/adminconsent?client_id=<clientId>`

---

## 7. 매니페스트 재빌드 & 업로드

```bash
pnpm --filter teams-app build
```

> ★ `CONTENT_HOST` 를 **주지 않는다.** 값을 주면 "개발 빌드"로 판정돼 버전이
> `1.<일>.<분>` 자동번호가 되고, 운영 패키지의 버전이 시각이 되어 버린다.
> 안 주면 Application ID URI 도메인에서 `https://genie.geniein.com` 을 유도하고
> 버전은 `1.0.0` (운영)이 된다. 값은 `apps/api/.env` 에서 읽는다.

`apps/teams-app/dist/teams-app.zip` 을 Teams 에 업로드한다.

> 업로드가 "새 앱 버전 번호가 필요합니다"를 내면 이미 같은 버전이 올라가 있다는 뜻이다.
> `TEAMS_APP_VERSION=1.0.1` 처럼 명시해서 다시 빌드한다.

---

## 8. 되돌리기

문제가 생기면 되돌릴 것은 두 개뿐이다.

- nginx: `server_name` 에서 `genie.geniein.com` 을 빼고 reload
- 앱: `main` 으로 되돌려 재빌드·재시작

DNS 레코드와 인증서는 남겨둬도 해가 없다.
