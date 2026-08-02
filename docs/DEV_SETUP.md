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
| WSL 설정 | `C:\Users\<user>\.wslconfig` (NAT 모드, 메모리 4GB 상한) |
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
curl -s http://127.0.0.1:8000/health
curl -s -X POST http://127.0.0.1:8000/agent/message \
  -H 'Content-Type: application/json' -d '{"text":"안녕"}'
```

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

## 알려진 함정

### 0. `/tmp` 이 tmpfs 2GB — 큰 pip 설치가 죽는다

`.wslconfig` 의 `memory=4GB` 에서 파생되어 `/tmp` 가 **RAM 기반 2GB** 다.
torch + nvidia 휠은 이걸 넘어서 `OSError: [Errno 28] No space left on device` 로 죽는다.
`/` 에는 900GB 넘게 남아 있어도 그렇다.

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
