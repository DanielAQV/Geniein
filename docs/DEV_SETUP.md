# 로컬 개발 환경 (agent-service)

작성일: 2026-08-02

`apps/agent-service`(유나의 뇌)를 로컬에서 돌리기 위한 구성. **개발 전용**이고
배포(AWS) 구성이 아니다. 배포는 `docker-compose.yml` / `Dockerfile` 을 쓴다.

---

## 결론부터

```
코드 편집   Windows  (C:\Projects\Geniein — IDE)
코드 실행   WSL2 Ubuntu 26.04
Postgres    WSL2 Ubuntu 안 (systemd 자동 시작)
GPU         WSL2 CUDA 패스스루 — 추가 설치 없음
```

**Docker 를 로컬 개발에 쓰지 않는다.** `docker-compose.yml` 은 지우지 않았고
배포 산출물로 유지한다 (설계문서 Phase 0 "배포 코드화").

---

## 왜 이 구성인가

| 결정 | 이유 |
|---|---|
| 로컬에서 Docker 미사용 | 노트북 자원 부담. 그리고 Windows 컨테이너에 GPU 를 넘기려면 WSL2 백엔드 + NVIDIA Container Toolkit 이 추가로 필요하다 |
| Python 을 Windows 가 아니라 WSL 에 | **Windows→WSL 포트 접근이 이 PC 에서 신뢰할 수 없다** (아래 "알려진 함정"). Postgres 와 같은 리눅스 안에 두면 이 문제가 사라진다 |
| Postgres 를 WSL 에 | Windows 네이티브 Postgres 에 pgvector 를 붙이려면 MSVC 빌드가 필요하다. Ubuntu 는 `apt install postgresql-18-pgvector` 한 줄 |
| venv 를 `/opt/geniein/venv` 에 | `/mnt/c` 위에 두면 파일 I/O 가 크게 느려진다. 코드만 `/mnt/c` 에서 읽는다 |

배포 대상이 리눅스이므로 **개발 환경이 배포 환경과 같아지는 이점**도 있다.

---

## 구성 요소 위치

| 항목 | 위치 |
|---|---|
| 코드 | `C:\Projects\Geniein` = `/mnt/c/Projects/Geniein` |
| venv | `/opt/geniein/venv` (WSL 내부) |
| Python | 3.14.4 (Ubuntu 26.04 기본) |
| Postgres | WSL 내부 `localhost:5432`, DB `geniein_db` |
| 환경변수 | 저장소 루트 `.env` — `src/config.py` 가 파일 위치 기준으로 찾는다 |
| WSL 설정 | `C:\Users\<user>\.wslconfig` (NAT 모드, 메모리 8GB 상한 — 아래 함정 6번) |
| 임베딩 모델 | `~/.cache/huggingface` (BGE-M3, 2.2GB) |

`src/config.py` 의 `SERVICE_ROOT` / `REPO_ROOT` 는 `__file__` 기준이라
**실행 위치(CWD)와 무관**하고, 컨테이너(`/app`)에서도 같은 상대 구조라 그대로 맞는다.

---

## 실행

```bash
# 서버 기동
wsl -d Ubuntu -u root -- bash -c \
  "cd /mnt/c/Projects/Geniein/apps/agent-service && \
   /opt/geniein/venv/bin/python -m uvicorn src.main:app --host 0.0.0.0 --port 8000"

# 확인 (WSL 안에서)
curl -s http://127.0.0.1:8000/health          # /health 만 토큰 없이 열려 있다

# /agent/message 와 /tools 는 서비스 토큰이 필요하다.
# 루트 .env 의 AGENT_SERVICE_TOKEN 과 같은 값을 헤더로 넘긴다.
#   토큰 생성: openssl rand -base64 32
curl -s -X POST http://127.0.0.1:8000/agent/message \
  -H 'Content-Type: application/json' \
  -H "x-service-token: $AGENT_SERVICE_TOKEN" \
  -d '{"text":"안녕","internal_user_id":"dev:local"}'
```

> `internal_user_id` 는 **필수**다. 예전 기본값 `"dev-user"` 를 없앴다 — 신원을 안 붙인
> 호출자가 통과하면 감사 로그와 테넌트 격리가 같이 무너진다. 운영에서는 게이트웨이가
> Entra 토큰을 검증해 `{tid}:{oid}` 를 채운다 (`docs/TEAMS_TAB_DESIGN.md` 3.4).
>
> 토큰이 틀리면 `401`, 서버에 `AGENT_SERVICE_TOKEN` 자체가 없으면 `503` 이다.
> 503 은 "인증이 꺼져 있다"가 아니라 "설정이 빠졌다"는 뜻이며, 그 상태에서도 열리지 않는다.

---

## 임베딩 스택 (GPU)

설치는 `apps/agent-service/requirements-embed.txt` 상단 주석 참조.
`requirements.txt` 와 분리한 이유는 torch + CUDA 휠이 3GB 대라 API 이미지에
넣을 수 없기 때문이다.

**GPU 는 WSL2 에서 그대로 잡힌다.** Windows 드라이버(561.00)가 있으면
CUDA Toolkit 을 따로 설치할 필요가 없다 — `nvidia-smi` 가 WSL 안에서 바로 동작하고,
PyTorch 는 pip 휠 안에 CUDA 런타임을 포함한다.

실측 (RTX 3050 6GB Laptop):

| 항목 | 값 |
|---|---|
| torch | 2.13.0+cu126 / CUDA 12.6 |
| BGE-M3 차원 | 1024 (`kb_chunks.embedding` 과 일치) |
| VRAM 사용 | 2.12 GB / 6.00 GB |
| 모델 최초 로드 | 743s (2.3GB 다운로드 포함) |
| 캐시 후 로드 | 10.4s |
| 임베딩 처리량 | 101건/초 (GPU) — CPU 대비 **10.9배** |

`regulations/` 전체가 청크 120~160건 규모이므로 **전체 재색인이 2초 미만**이다.
설계문서 5.1 이 우려한 "초기 전체 색인이 CPU 에서 느리다"는 이 코퍼스 규모에서는
문제가 되지 않는다.

> sentence-transformers 5.x 에서 `get_sentence_embedding_dimension()` 은
> `get_embedding_dimension()` 으로 이름이 바뀌었다 (구 이름은 경고 후 동작).

---

## 관리자 인증 (apps/web)

설계문서 Phase 0 의 하드코딩 자격증명 제거에 따라 **환경변수 없이는 admin 로그인이 동작하지 않는다.**
기본 계정을 만들어주지 않는 게 의도다 — 설정을 안 했을 때 열려 있는 것이 원래의 취약점이었다.

```bash
# 인자 없이 실행하면 비밀번호를 숨겨서 입력받는다 (셸 기록에 남지 않는다).
# ADMIN_PASSWORD_HASH / AUTH_SECRET / ADMIN_SERVICE_TOKEN 을 한 번에 출력한다.
node apps/web/scripts/hash-password.mjs
```

```
비밀번호: ********
비밀번호 확인: ********
```

비밀번호는 12자 이상이어야 하고, 화면에 안 보이므로 확인 입력으로 오타를 잡는다.
CI 처럼 대화형 입력이 불가능한 환경에서만 인자로 넘긴다 — 그 경우 셸 기록에 남는다.

전체 변수 목록은 `apps/web/.env.example` / `apps/api/.env.example` 참조.

| 변수 | 어디에 | 역할 |
|---|---|---|
| `AUTH_SECRET` | web | 세션 쿠키 서명. 바꾸면 기존 세션 전부 무효 |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` | web | 관리자 계정. 평문은 저장하지 않는다 |
| `ADMIN_SERVICE_TOKEN` | web + api | BFF → NestJS 서비스 간 인증. **양쪽 값이 같아야 한다** |
| `CORS_ORIGINS` | api | 허용 오리진. 비우면 CORS 비활성 |

> **로컬에서 `next start`(프로덕션 모드)로 테스트하면 로그인이 안 풀린다.**
> 세션 쿠키가 `Secure` 로 발급되는데 `http://localhost` 는 평문이라 브라우저가 되돌려 보내지 않는다.
> 로컬 검증은 `next dev` 로 한다 (개발 모드에서는 `Secure` 가 꺼진다).

### DB 마이그레이션

`synchronize` 를 껐으므로 스키마는 마이그레이션으로만 바뀐다.

```bash
cd apps/api
pnpm migration:show      # 적용 상태 확인
pnpm migration:run       # 적용
pnpm migration:generate src/migrations/<이름>   # 엔티티 변경 후 diff 생성
```

`kb_documents` / `kb_chunks` 는 여기 포함되지 않는다 — agent-service 소유이고 `db/init/*.sql` 이 관리한다.

---

## 알려진 함정

### 0. `/tmp` 이 tmpfs 2GB — 큰 pip 설치가 죽는다

`/tmp` 는 `.wslconfig` 의 `memory` 값에서 파생된 **RAM 기반 tmpfs** 다 (4GB 시절 2GB,
8GB 로 올린 뒤에도 절반이라 넉넉하지 않다). torch + nvidia 휠은 이걸 넘어서
`OSError: [Errno 28] No space left on device` 로 죽는다. `/` 에 900GB 넘게 남아 있어도 그렇다.

```bash
export TMPDIR=/var/tmp/pip && mkdir -p "$TMPDIR"     # 디스크 기반
```

### 1. Windows → WSL 포트 접근이 안 된다

두 경로 모두 막힌다. **해결한 게 아니라 비켜간 것**이다 — 모든 것을 WSL 안에
두어서 이 경계를 넘지 않는다.

| 경로 | 증상 | 원인 |
|---|---|---|
| `127.0.0.1` (NAT localhost 릴레이) | 포트 바인딩 직후 잠깐만 되고 끊김 | WSL 릴레이 불안정 |
| WSL IP 직접 / mirrored 모드 | 무응답 드롭 | Hyper-V 방화벽 `DefaultInboundAction: Block` |

포트 단위 `New-NetFirewallHyperVRule` 을 넣어도(`EnforcementStatus: OK`) 통하지 않았다.

> **Next.js BFF 를 붙일 때 이 문제를 다시 만난다.** 그때는 Node 도 WSL 로 넣는 것이
> 자연스럽다. 배포 대상이 리눅스이므로 방향도 맞다.

### 2. systemd 가 WSL 릴레이보다 먼저 Postgres 를 띄운다

WSL 콜드 스타트 시 Postgres 가 릴레이보다 먼저 뜨면 포트 등록을 놓친다.
모든 것을 WSL 안에서 실행하는 현재 구성에서는 영향이 없지만,
Windows 쪽에서 붙어야 할 일이 생기면 `systemctl restart postgresql@18-main` 이 필요하다.

### 3. Ubuntu 에 일반 사용자가 없다

`wsl --install` 이 계정 생성 단계에서 중단되어 **root 만 있다.**
Postgres 와 개발 용도로는 문제없다. 필요해지면 그때 만든다.

### 4. ★ 기본 WSL 배포판이 Ubuntu 가 아니다

Docker Desktop 이 자기 배포판을 설치하면서 **기본값을 가져갔다.**

```
$ wsl -l -v
*  docker-desktop    Running    2      ← 기본. sh 이고 psql 이 없다
   Ubuntu            Stopped    2      ← 우리가 쓰는 쪽
```

그냥 `wsl` 을 치면 docker-desktop 으로 들어가고, 거기서 `psql` 을 부르면
`-sh: psql: not found` 가 난다. **설치가 안 된 게 아니라 다른 리눅스에 있는 것이다.**

```powershell
wsl -d Ubuntu -u root          # 항상 -d 를 붙인다
wsl --set-default Ubuntu       # 또는 기본값을 바꾼다 (Docker Desktop 은 영향 없음)
```

프롬프트로 구분한다 — `root@LAPTOP-...` 면 Ubuntu, `LAPTOP-...` 만 있으면 docker-desktop.
그리고 `wsl` 은 Windows 명령이므로 **WSL 안에서는 부를 수 없다** (`-sh: wsl: not found`).
먼저 `exit` 로 PowerShell 로 나와야 한다.

### 5. 비밀번호에 `!` 가 있으면 bash 가 먼저 가로챈다

```bash
psql "postgresql://postgres:pw!@localhost:5432/geniein_db"
# -bash: !@localhost: event not found     ← psql 이 실행조차 안 된다
```

큰따옴표 안에서 `!` 는 히스토리 확장으로 해석된다. 작은따옴표를 쓰거나,
**아예 비밀번호를 명령줄에 적지 않는 게 낫다** — 셸 히스토리에도 남지 않는다.

```bash
psql -h localhost -U postgres -d geniein_db -c 'select 1'   # 프롬프트로 입력받는다
```

역할 비밀번호 변경도 같은 이유로 `\password` 를 쓴다. `ALTER ROLE ... PASSWORD '...'`
는 따옴표 문제에 더해 비밀번호가 셸 히스토리와 Postgres 로그에 남는다.

```bash
sudo -u postgres psql
postgres=# \password postgres      # 가려서 두 번 입력받는다
```

> **`.env` 를 바꿔도 DB 는 안 바뀐다.** 둘은 별개다 —
> `.env` 3곳(루트 / `apps/api` / `apps/ai-worker`)과 Postgres 역할을 **같이** 바꿔야 한다.
> 한쪽만 하면 `password authentication failed` 가 난다.

### 6. ★ 메모리 4GB 로는 BGE-M3 를 못 올린다 — 그리고 WSL 전체가 멎는다

`.wslconfig` 의 `memory=4GB` 는 **"이 인스턴스는 Postgres 만 돌린다"** 는 전제로
잡힌 값이다. 임베딩 스택이 들어오면서 그 전제가 깨졌다.

실측 (2026-08-06):

| 항목 | 메모리 |
|---|---|
| `import sentence_transformers` (torch 포함) | **759 MB** |
| BGE-M3 가중치 로드 후 피크 | 약 2.9 GB |
| 그때 가용 메모리 | 2.4 GB |

**★ WSL2 는 모든 배포판과 Docker Desktop 이 하나의 유틸리티 VM 메모리를 공유한다.**
그래서 다른 프로젝트의 컨테이너(connext-\*)가 뜨면 이쪽 여유가 그만큼 줄어든다.
`docker stats` 의 분모가 `3.825GiB` 로 찍히는 게 그 증거다.

증상이 고약하다. 커널 OOM 킬러가 python 을 죽이는 데서 끝나지 않고 **Ubuntu 배포판
자체가 응답하지 않는다:**

```
wsl -l -v          → Ubuntu   Running     (살아 있는 것처럼 보인다)
wsl -d Ubuntu ...  → Catastrophic failure / Wsl/Service/E_UNEXPECTED
```

복구는 `wsl --shutdown`(전체)이 아니라 **`wsl --terminate Ubuntu`** 로 충분하다.
Docker Desktop 배포판과 그 컨테이너들은 그대로 살아 있다. Postgres 는 크래시
복구로 정상 기동하고 데이터도 남는다 (실측: 4문서 / 47청크 / 임베딩 47 전부 보존).

**메모리를 실험할 때는 상한을 걸어라.** 상한 없이 돌리면 커널이 VM 을 흔들지만,
scope 안에서는 프로세스만 깔끔하게 죽는다:

```bash
systemd-run --quiet --scope -p MemoryMax=2200M -p MemorySwapMax=0 \
  /opt/geniein/venv/bin/python -u <스크립트>
```

`python -u` 를 빼면 SIGKILL 에 stdout 버퍼가 통째로 날아가 **어디서 죽었는지
알 수 없다.** 로그도 `/tmp`(tmpfs 2GB) 가 아니라 `/var/tmp` 로 받는다.

> **이건 색인만의 문제가 아니다.** 질의 임베딩도 같은 모델을 쓰므로 유나가 검색에
> 답하는 내내 BGE-M3 가 메모리에 상주해야 한다. 상시 요구량이지 일회성이 아니다.

**→ 해결됨 (2026-08-16): `.wslconfig` 를 `memory=8GB` 로 올렸다.**

상한이지 예약이 아니다 — `autoMemoryReclaim=gradual` 이 안 쓰는 만큼 돌려주므로,
평소 Postgres 만 돌 때의 점유는 그대로다. 문제는 호스트 여유가 아니라 **cgroup
상한이 2.9GB 피크에서 프로세스를 죽이는 것**이었다. 호스트에 램이 남아 있어도
그 벽은 그대로여서, 여유가 생기길 기다리는 것으로는 해결되지 않는다.

적용에는 `wsl --shutdown` 이 필요하다 (전체 VM 재시작이라 Docker Desktop 배포판과
그 컨테이너도 함께 내려간다). 적용 후 확인:

```bash
wsl -d Ubuntu -u root -- free -h     # total 이 7.8Gi 로 나오면 반영된 것
```

> 같은 벽을 배포에서도 만났다. EC2 t3.small(2GB)에는 BGE-M3 가 들어가지 않고,
> **질의 경로가 임베딩을 무조건 호출하므로**(`kb/search.py` — 어휘 검색 폴백이 없다)
> "색인만 GPU 로" 로는 해결되지 않는다. `docs/TEAMS_DEPLOY.md` 5장 참조.

### 7. git worktree 는 `.env` 를 공유하지 않는다

브랜치를 워크트리로 나눠 쓰면(`C:\Projects\Geniein` / `Geniein-teams`) git 히스토리는
공유하지만 **작업 디렉터리는 완전히 별개**다. `.env` 는 애초에 추적되지 않으므로
워크트리마다 자기 사본을 갖는다. 한쪽에서 고친 값이 다른 쪽에 반영되지 않는다.

대부분은 **의도한 차이**다 — 예를 들어 두 세션이 각자 뇌를 띄우면 포트를 갈라야 하고
(`RAG_SERVICE_URL` 8000 vs 8001), 한쪽에만 있는 기능의 토큰은 한쪽에만 있어야 맞다.
실제로 포트를 안 갈랐다면 새 코드의 검증이 **옛 프로세스를 상대로 조용히 통과**했을 것이다.

위험한 것은 **공유돼야 할 값**(DB 접속, 임베딩 설정)이 한쪽에서만 바뀌는 경우다.
값이 아니라 **키 목록과 값의 일치 여부만** 비교하면 비밀을 화면에 띄우지 않고 확인할 수 있다:

```bash
for f in .env apps/api/.env apps/web/.env; do
  echo "=== $f ==="
  diff <(grep -oE '^[A-Z_]+=' ../Geniein/$f | sort) \
       <(grep -oE '^[A-Z_]+=' ./$f          | sort)
done
```

---

## 재현 (새 머신에서)

```powershell
# 1. Python 은 WSL 것을 쓴다 — Windows 에 설치할 필요 없다
wsl --install -d Ubuntu          # 대화형: UNIX 사용자명/비밀번호 입력

# 2. 아래는 WSL 안에서 (root)
```

```bash
apt-get update
apt-get install -y postgresql postgresql-18-pgvector python3-pip python3-venv

# Postgres
sed -i "s/^#\?listen_addresses.*/listen_addresses = '*'/" /etc/postgresql/18/main/postgresql.conf
service postgresql start
su - postgres -c "psql -c \"ALTER ROLE postgres WITH PASSWORD 'postgres';\""
su - postgres -c "createdb geniein_db"
su - postgres -c "psql -d geniein_db -f /mnt/c/Projects/Geniein/db/init/01-extensions.sql"

# systemd 자동 시작
printf '[boot]\nsystemd=true\n' >> /etc/wsl.conf     # 이후 wsl --shutdown 필요

# Python
python3 -m venv /opt/geniein/venv
/opt/geniein/venv/bin/python -m pip install -r /mnt/c/Projects/Geniein/apps/agent-service/requirements.txt
```
