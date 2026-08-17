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

★★ **이 서버에는 이미 다른 서비스(gnom estimator)의 Postgres 가 돌고 있다.**
살아 있는 남의 데이터가 있는 서버다. 여기서 하는 일은 전부 **덧붙이기**여야 하고,
기존 DB·역할·설정은 건드리지 않는다. 특히 `ALTER USER postgres PASSWORD` 처럼
공용 계정을 바꾸는 조작은 하지 않는다 — 다른 서비스가 그 자격으로 붙어 있을 수 있다.

★★ **포트가 5432 가 아니다.** 실측(2026-08-17): `Ver 16 / Cluster main / Port 5433`.
우분투는 설치 시점에 5432 가 점유돼 있으면 다음 포트로 클러스터를 만든다. 뇌의
기본값은 5432 이므로(`config.py`) **`DB_PORT=5433` 을 명시하지 않으면 붙지 않거나,
더 나쁘게는 5432 에 있는 다른 것에 붙는다.** 아래 명령들도 전부 `-p 5433` 이 붙어 있다.

먼저 읽기만 해서 현황을 본다:

```bash
pg_lsclusters
sudo -u postgres psql -p 5433 -c "SELECT version();"
sudo -u postgres psql -p 5433 -c "\l"          # 기존 DB 목록 — 여기 있는 것은 건드리지 않는다
sudo -u postgres psql -p 5433 -c \
  "SELECT name, default_version, installed_version FROM pg_available_extensions
   WHERE name IN ('vector','pg_trgm');"
```

`vector` 의 `default_version` 이 비어 있으면 확장 패키지가 없다는 뜻이다. 서버
메이저 버전에 맞는 것을 깐다 (기존 DB 에 영향 없는 추가 설치다):

```bash
PGVER=$(pg_lsclusters -h | awk '{print $1}' | head -1)
sudo apt install -y "postgresql-${PGVER}-pgvector"   # 실측: PGVER=16
```

우리 것만 **별도 DB · 별도 역할**로 만든다. 확장은 DB 단위라 여기서 켜도 다른
DB 에는 영향이 없다.

```bash
sudo -u postgres psql -p 5433 <<'SQL'
CREATE ROLE genie LOGIN PASSWORD '<새 비밀번호>';
CREATE DATABASE geniein_db OWNER genie;
SQL

sudo -u postgres psql -p 5433 -d geniein_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
sudo -u postgres psql -p 5433 -d geniein_db -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

> 역할을 나누는 이유는 사고 범위를 좁히기 위해서다. 뇌가 `postgres` 수퍼유저로
> 붙으면 실수 한 번이 estimator 의 데이터까지 닿는다. `genie` 는 자기 DB 밖을
> 볼 이유가 없다.

★ **pgvector 0.5 이상이어야 한다.** 스키마가 `USING hnsw` 를 쓰는데 그 인덱스는
0.5 에서 들어왔다. 낮으면 테이블 생성이 인덱스 단계에서 실패한다.

```bash
sudo -u postgres psql -p 5433 -d geniein_db -c \
  "SELECT extname, extversion FROM pg_extension WHERE extname IN ('vector','pg_trgm');"
# vector 가 0.5.0 미만이면 apt 패키지 대신 소스로 빌드해야 한다
```

스키마를 올린다. **`genie` 역할로** 올려야 테이블 소유자가 그 역할이 된다:

```bash
PGPASSWORD='<위에서 정한 비밀번호>' psql -h 127.0.0.1 -p 5433 -U genie -d geniein_db \
  -f /home/dev_admin/genie/db/init/02-knowledge.sql
```

★ `hnsw` 인덱스가 만들어지는 단계가 여기다. pgvector 가 0.5 미만이면 이 명령이
실패한다 — 그때는 스키마를 고치는 게 아니라 pgvector 를 올려야 한다.

### 2.2 코드와 파이썬

★ **`--depth 1` 로 받는다.** 저장소 팩이 180MB 인데, 그 대부분이 지금 트리에는 없는
과거 커밋의 업로드 이미지(`apps/web/public/uploads/`)다. 커밋했다가 지운 파일이라
작업 트리에는 안 보이지만 **히스토리에는 영구히 남아 있어 전체 clone 이 매번 그
값을 치른다.** 이 서버에 실제로 필요한 것(`apps/agent-service` + `db`)은 0.1MB 다.

```bash
cd ~
git clone --depth 1 -b feat/teams-tab <저장소> genie
cd /home/dev_admin/genie/apps/agent-service

python3 -m venv /home/dev_admin/genie/venv
/home/dev_admin/genie/venv/bin/pip install -r requirements.txt
```

얕은 저장소도 `git pull` 은 그대로 된다. 더 줄이려면 필요한 경로만 받는다:

```bash
git clone --depth 1 --filter=blob:none --sparse -b feat/teams-tab <저장소> ~/genie
cd ~/genie && git sparse-checkout set apps/agent-service db
```

### 2.3 임베딩 스택 (torch — CPU)

★ `requirements-embed.txt` 는 torch 를 고정하지 않는다. 환경마다 인덱스가 다르다.
이 서버는 GPU 가 없으므로 **CPU 휠**을 쓴다 — 기본 인덱스로 깔면 CUDA 휠(3GB대)이
딸려 와서 디스크와 시간만 먹는다.

```bash
TMPDIR=/var/tmp/pip /home/dev_admin/genie/venv/bin/pip install torch \
  --index-url https://download.pytorch.org/whl/cpu

/home/dev_admin/genie/venv/bin/pip install -r /home/dev_admin/genie/apps/agent-service/requirements-embed.txt
```

첫 실행에서 모델 2.3GB 를 내려받는다.

#### CPU 라서 달라지는 것

64GB 면 메모리는 문제가 아니다. 바뀌는 건 속도다.

| | CPU 에서 | 판단 |
|---|---|---|
| **질의 임베딩** (짧은 문장 1개) | 수백 ms | 답변이 원래 40~60초라 묻히는 수준. 문제 없다 |
| **색인** (현재 232청크) | 수 분 | 한 번 하면 끝이라 견딜 만하다 |
| **색인** (코퍼스가 크게 늘면) | 선형으로 늘어남 | 그때는 GPU 있는 노트북에서 색인하고 `pg_dump` 로 옮기는 편이 낫다 (3장과 같은 방법) |

★ **첫 질문이 모델 로딩 값을 치른다.** `embed.py` 는 지연 로드라, 기동 후 첫 요청이
2.3GB 를 올리는 동안 그만큼 더 기다린다. 서비스 시작 직후 아무 질문이나 한 번
던져 예열해 두면 실제 사용자가 그 값을 안 낸다. (기동 시 자동 예열은 코드 변경이
필요하다 — 필요해지면 그때 넣는다.)

---

## 3. 데이터 이관

사규 20건 / 232청크가 이미 색인돼 있다. **다시 색인하지 말고 옮긴다** — 재색인은
느리고, 무엇보다 같은 결과가 나온다는 보장이 없다.

★ **두 파일로 나눠 뜬다.** 한 파일에 `--data-only` 로 담으면 pg_dump 가 알파벳순으로
`kb_chunks` 를 먼저 쓰는데, 그 테이블이 `kb_documents` 를 참조해서 복원이 **외래키
위반으로 깨진다.** 번호를 붙여 순서를 강제한다.

★ `--data-only` 인 이유는 스키마를 이미 `02-knowledge.sql` 로 올렸기 때문이다.
전체 덤프를 넣으면 `relation already exists` 로 깨진다. 둘 중 하나만 해야 한다.

옮기는 쪽(현재 색인이 있는 곳)에서:

```bash
sudo -u postgres pg_dump -d geniein_db --data-only --no-owner --no-acl \
  -t kb_documents -f 01-kb_documents.sql
sudo -u postgres pg_dump -d geniein_db --data-only --no-owner --no-acl \
  -t kb_chunks -f 02-kb_chunks.sql
```

받는 쪽(물리 서버)에서 — **순서대로**:

```bash
PGPASSWORD='<genie 비밀번호>' psql -h 127.0.0.1 -p 5433 -U genie -d geniein_db \
  -v ON_ERROR_STOP=1 -f 01-kb_documents.sql
PGPASSWORD='<genie 비밀번호>' psql -h 127.0.0.1 -p 5433 -U genie -d geniein_db \
  -v ON_ERROR_STOP=1 -f 02-kb_chunks.sql
```

> `ON_ERROR_STOP=1` 을 붙인다. 없으면 psql 이 오류를 흘리며 계속 진행해서, 절반만
> 들어간 상태로 "끝났다"고 보이게 된다. 실제로 이 옵션이 아래 버전 문제를 잡아냈다.

★★ **pg_dump 버전이 대상 서버보다 높으면 그대로 안 들어간다.**
실측: 원본 PostgreSQL **18.4** → 대상 **16**. pg_dump 는 자기보다 낮은 서버로의
복원을 보장하지 않는다. 상위 버전에서만 있는 구문이 섞여 들어오기 때문이다.

이번에 걸린 것은 셋이었다:

| 구문 | 언제 생겼나 |
|---|---|
| `\restrict` / `\unrestrict` | psql 18 메타명령 |
| `SET transaction_timeout = 0;` | PostgreSQL 17 설정 |

증상은 `ERROR: unrecognized configuration parameter "transaction_timeout"` 이고,
`ON_ERROR_STOP=1` 덕에 **0건이 들어간 상태로 멈춘다** (그게 옳다 — 반만 들어가는
것보다 낫다). 단순한 data-only 덤프라면 그 줄들만 걷어내면 된다:

```bash
sed -i -e '/^\\restrict /d' -e '/^\\unrestrict /d' \
       -e '/^SET transaction_timeout = 0;$/d' \
       01-kb_documents.sql 02-kb_chunks.sql
```

> 원칙적으로는 **대상 버전에 맞는 pg_dump 로 뜨는 것**이 맞다. 위 방법은 두 테이블의
> data-only 라서 통하는 것이고, 스키마까지 담은 덤프나 타입이 복잡한 경우에는
> 이렇게 넘어가면 안 된다. 그때는 대상과 같은 메이저의 클라이언트를 깔아 다시 뜬다.

검증 — 두 숫자가 옮기기 전과 같아야 한다:

```bash
PGPASSWORD='<genie 비밀번호>' psql -h 127.0.0.1 -p 5433 -U genie -d geniein_db -c "SELECT count(*) FROM kb_documents;"   -- 20
PGPASSWORD='<genie 비밀번호>' psql -h 127.0.0.1 -p 5433 -U genie -d geniein_db -c "SELECT count(*) FROM kb_chunks;"      -- 232
PGPASSWORD='<genie 비밀번호>' psql -h 127.0.0.1 -p 5433 -U genie -d geniein_db -c "SELECT count(DISTINCT org_id) FROM kb_documents;"  -- 1
```

> ★ 임베딩이 실제로 살아 있는지도 본다. 벡터 열이 NULL 로 넘어오면 검색이
> 조용히 어휘 검색만 하게 된다:
> ```sql
> SELECT count(*) FROM kb_chunks WHERE embedding IS NULL;   -- 0 이어야 한다
> ```

---

## 4. 뇌 기동

`/home/dev_admin/genie/.env` (또는 `apps/agent-service/.env`):

| 키 | 값 |
|---|---|
| `ANTHROPIC_API_KEY` | 기존 값 |
| `AGENT_SERVICE_TOKEN` | **새로 만든다** (`openssl rand -hex 32`). 이 대화에 노출된 값은 쓰지 않는다 |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / **`5433`** ← 기본값 5432 가 아니다 |
| `DB_NAME` / `DB_USERNAME` / `DB_PASSWORD` | `geniein_db` / `genie` / 2.1 에서 정한 값 |

> ★ `postgres` 수퍼유저로 붙이지 않는다. 같은 서버에 estimator 의 DB 가 있어서,
> 뇌가 수퍼유저 자격을 들고 있으면 실수 한 번이 남의 데이터까지 닿는다.

★ `127.0.0.1` 에만 바인딩한다:

```bash
/home/dev_admin/genie/venv/bin/python -m uvicorn src.main:app --host 127.0.0.1 --port 8001
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
