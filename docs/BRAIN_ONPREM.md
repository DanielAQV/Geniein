# 뇌(RAG)를 사내 물리 서버로

EC2(t3.small)에는 BGE-M3 가 들어가지 않는다 (`TEAMS_DEPLOY.md` 5장). 웹·게이트웨이는
EC2 에 그대로 두고 **뇌와 벡터 DB 만** 사내 물리 서버(64GB / 1TB)로 옮긴다.

## 0. 무엇이 어디로

| | 어디 | 왜 |
|---|---|---|
| Next 탭 (`genie-web`) | EC2 유지 | `genie.geniein.com` 오리진을 바꿀 수 없다 — Teams SSO 가 App ID URI 도메인과 iframe 오리진의 일치를 요구한다 (설계문서 §4.6) |
| NestJS (`genie-api`) | EC2 유지 | 인터넷 노출면. 이미 검증 끝난 경로다 |
| **뇌 (agent-service)** | **물리 서버** | BGE-M3 가 3GB+ 를 쓴다 |
| **Postgres + pgvector** | **물리 서버** | 벡터 검색이 뇌 바로 옆에 있어야 한다 |
| 색인(ingest) | 물리 서버 | 지금까지 로컬 GPU 에서 돌렸다. 옮기면 한곳에서 끝난다 |

---

## 1. ★ 노출 설계 — 여기가 본체다

옮기는 순간 뇌는 **인터넷에 놓인다.** 지금 상태 그대로 열면 안 되는 이유가 둘이다.

- **평문이다.** 뇌는 HTTP 로 뜬다. 그대로 노출하면 `x-service-token` 이 네트워크에
  그냥 흘러간다. 토큰이 유일한 자물쇠인데 그 자물쇠를 공개하는 셈이다.
- **`AI_ALLOWED_IPS` 는 구현이 없다.** `main.py` 주석에 이름만 있고 코드 어디에서도
  IP 를 거르지 않는다. "설정해 뒀으니 막혀 있다"고 믿으면 안 된다.

그래서 세 겹으로 간다. 한 겹이 뚫려도 나머지가 남는다.

| 겹 | 무엇 | 어디서 |
|---|---|---|
| ① 네트워크 | **EC2 주소(54.89.239.197)에서 온 것만 허용** | 방화벽 + nginx `allow/deny` |
| ② 전송 | **TLS** — 토큰이 평문으로 흐르지 않게 | nginx + Let's Encrypt |
| ③ 신원 | `x-service-token` (이미 있음, 없으면 401) | 뇌 자체 |

★ 뇌 자신은 **`127.0.0.1` 에만 바인딩한다.** nginx 만 통하게 해서, 방화벽 설정이
한 번 어긋나도 8001 이 직접 열리지 않게 한다.

> `/health` 는 토큰 없이 열려 있다 (compose healthcheck 용). 모델명과 도구 이름이
> 드러나므로, ① 의 IP 허용목록이 그 노출까지 같이 막아준다.

---

## 2. 물리 서버 준비

### 2.1 Postgres + 확장

스키마가 `vector(1024)` 와 trigram 인덱스를 쓴다 (`db/init/02-knowledge.sql`).

```bash
sudo -u postgres psql -c "CREATE DATABASE geniein_db;"
sudo -u postgres psql -d geniein_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
sudo -u postgres psql -d geniein_db -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

확인 — 셋 다 나와야 한다:

```bash
sudo -u postgres psql -d geniein_db -c "SELECT extname FROM pg_extension;"
```

### 2.2 코드와 파이썬

```bash
sudo mkdir -p /srv/genie && sudo chown "$USER" /srv/genie
git clone -b feat/teams-tab <저장소> /srv/genie
cd /srv/genie/apps/agent-service

python3 -m venv /srv/genie/venv
/srv/genie/venv/bin/pip install -r requirements.txt
```

### 2.3 임베딩 스택 (torch)

★ `requirements-embed.txt` 는 torch 를 고정하지 않는다. 환경마다 인덱스가 다르다.

```bash
# GPU 가 있으면 (CUDA 12.6 기준)
TMPDIR=/var/tmp/pip /srv/genie/venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cu126
# GPU 가 없으면
TMPDIR=/var/tmp/pip /srv/genie/venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu

/srv/genie/venv/bin/pip install -r requirements-embed.txt
```

첫 실행에서 모델 2.3GB 를 받는다. 64GB 램이면 CPU 로도 질의는 돌지만, **색인은
GPU 가 있는 쪽이 비교가 안 되게 빠르다.**

---

## 3. 데이터 이관

사규 20건 / 232청크가 이미 색인돼 있다. **다시 색인하지 말고 옮긴다** — 재색인은
느리고, 무엇보다 같은 결과가 나온다는 보장이 없다.

옮기는 쪽(현재 색인이 있는 곳)에서:

```bash
pg_dump -h <현재DB> -U postgres -d geniein_db \
        -t kb_documents -t kb_chunks --no-owner --no-acl \
        -f kb.sql
```

받는 쪽(물리 서버)에서:

```bash
psql -U postgres -d geniein_db -f kb.sql
```

검증 — 두 숫자가 옮기기 전과 같아야 한다:

```bash
psql -U postgres -d geniein_db -c "SELECT count(*) FROM kb_documents;"   -- 20
psql -U postgres -d geniein_db -c "SELECT count(*) FROM kb_chunks;"      -- 232
psql -U postgres -d geniein_db -c "SELECT count(DISTINCT org_id) FROM kb_documents;"  -- 1
```

> ★ 임베딩이 실제로 살아 있는지도 본다. 벡터 열이 NULL 로 넘어오면 검색이
> 조용히 어휘 검색만 하게 된다:
> ```sql
> SELECT count(*) FROM kb_chunks WHERE embedding IS NULL;   -- 0 이어야 한다
> ```

---

## 4. 뇌 기동

`/srv/genie/.env` (또는 `apps/agent-service/.env`):

| 키 | 값 |
|---|---|
| `ANTHROPIC_API_KEY` | 기존 값 |
| `AGENT_SERVICE_TOKEN` | **새로 만든다** (`openssl rand -hex 32`). 이 대화에 노출된 값은 쓰지 않는다 |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USERNAME` / `DB_PASSWORD` | 물리 서버 Postgres |

★ `127.0.0.1` 에만 바인딩한다:

```bash
/srv/genie/venv/bin/python -m uvicorn src.main:app --host 127.0.0.1 --port 8001
```

systemd 로 상주시키고(`Restart=always`), 부팅 시 자동 시작을 켠다.

---

## 5. 앞단 nginx (TLS + IP 허용목록)

`brain.geniein.com` 처럼 별도 이름을 쓴다. DNS A 레코드를 물리 서버 공인 IP 로.

```nginx
server {
    listen 443 ssl;
    server_name brain.geniein.com;

    # ★ ① 네트워크 겹. 부르는 곳은 EC2 하나뿐이므로 그 주소만 허용한다.
    allow 54.89.239.197;
    deny  all;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 뇌가 도구 연쇄 + LLM 을 도는 동안 수십 초 걸린다.
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_buffering off;
    }
}
```

```bash
sudo certbot --nginx -d brain.geniein.com
```

> certbot 의 HTTP-01 검증은 80 으로 들어온다. `allow/deny` 를 80 블록에도 그대로
> 걸면 **인증서 발급·갱신이 실패한다.** 80 은 열어두고 443 만 제한하거나,
> DNS-01 방식으로 발급한다. 갱신은 90일마다 돌아오므로 여기서 막히면 나중에
> 조용히 만료된다.

---

## 6. EC2 전환

```bash
cd /var/www/genie
sed -i '/^RAG_SERVICE_URL=/d; /^AGENT_SERVICE_TOKEN=/d' apps/api/.env
echo 'RAG_SERVICE_URL=https://brain.geniein.com' >> apps/api/.env
echo 'AGENT_SERVICE_TOKEN=<물리서버와 같은 값>' >> apps/api/.env
pm2 restart genie-api
```

---

## 7. 검증 — 순서대로

세 개가 다 맞아야 한다. 하나라도 어긋나면 다음으로 넘어가지 않는다.

1. **밖에서는 안 보인다** — 사무실 밖 회선(휴대폰 테더링 등)에서:
   ```bash
   curl -sS -m 10 https://brain.geniein.com/health    # 403 또는 무응답이어야 정상
   ```
2. **토큰 없이는 막힌다** — EC2 에서:
   ```bash
   curl -sS -o /dev/null -w '%{http_code}\n' -X POST https://brain.geniein.com/agent/message \
        -H 'content-type: application/json' -d '{"text":"x","internal_user_id":"probe"}'
   # 401
   ```
3. **탭이 답한다** — Teams 에서 검색. `pm2 logs genie-api` 에 `검색 완료` 가 찍히면 끝.

---

## 8. 되돌리기

EC2 쪽 `RAG_SERVICE_URL` 만 되돌리면 된다. 물리 서버 쪽은 그대로 둬도 무해하다.
데이터는 옮긴 것이 아니라 **복사**한 것이므로 원본이 남아 있다 — 확인이 끝나기
전까지 원본을 지우지 않는다.
