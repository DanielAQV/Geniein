#!/usr/bin/env bash
# 뇌(agent-service)를 EC2 에 올린다 — 물리 서버(AQV-DEV01-SRV) 대신.
#
#   bash deploy/brain-ec2.sh setup    # pgvector · 스키마 · venv · .env · systemd (몇 번 돌려도 됨)
#   bash deploy/brain-ec2.sh ingest   # regulations/ 를 AQV 테넌트로 색인 (LLM 호출 없음, 과금 없음)
#   bash deploy/brain-ec2.sh switch   # 게이트웨이가 EC2 뇌를 보게 한다 (RAG_SERVICE_URL)
#
# 왜 EC2 에 올라가나 (2026-10-22):
#   docs/BRAIN_ONPREM.md 는 "t3.small 에 BGE-M3 가 안 들어간다"로 물리 서버를 골랐다.
#   그런데 같은 EC2(t4g.medium) 에 princess 가 BGE-M3(int8 ONNX)를 127.0.0.1:8090 에
#   이미 띄워 두고 있다. 뇌는 그 서버를 빌려 쓴다 (EMBED_BACKEND=http, src/kb/embed_http.py).
#   그래서 torch 없이 뇌 프로세스 하나(~150MB)만 더 뜬다.
#
# 전제: /var/www/genie 체크아웃, /var/www/genie/apps/api/.env 에 ANTHROPIC_API_KEY ·
#       AGENT_SERVICE_TOKEN · DB_* · ENTRA_ALLOWED_TENANTS 가 있다. 비밀은 화면에 찍지 않는다.
set -euo pipefail

ROOT=/var/www/genie
SVC=$ROOT/apps/agent-service
API_ENV=$ROOT/apps/api/.env
BRAIN_ENV=$ROOT/.env                 # config.py 가 저장소 루트 .env 를 읽는다. systemd 도 같은 파일.
EMBED_URL=http://127.0.0.1:8090/v1/embeddings
BRAIN_PORT=8001

# 없는 키는 빈 값으로 돌려준다. `|| true` 가 없으면 grep 의 1 이 set -e 를 죽인다 (실제로 당했다).
val() { grep -E "^$1=" "$API_ENV" | head -1 | cut -d= -f2- | tr -d '\r' || true; }
need() { [ -n "$(val "$1")" ] || { echo "✗ $API_ENV 에 $1 이 없습니다"; exit 1; }; }

phase=${1:-}

case "$phase" in
setup)
  need ANTHROPIC_API_KEY; need AGENT_SERVICE_TOKEN; need DB_USERNAME; need DB_PASSWORD; need DB_NAME; need ENTRA_ALLOWED_TENANTS

  echo "== 0. 임베딩 서버 (princess BGE-M3)"
  curl -sf -m 5 http://127.0.0.1:8090/ | grep -q "bge-m3" || { echo "✗ 127.0.0.1:8090 에 BGE-M3 서버가 없습니다"; exit 1; }
  echo "   ok"

  echo "== 1. pgvector"
  if ! dpkg -s postgresql-18-pgvector >/dev/null 2>&1; then
    sudo apt-get update -qq && sudo apt-get install -y -qq postgresql-18-pgvector
  fi
  sudo -u postgres psql -d "$(val DB_NAME)" -v ON_ERROR_STOP=1 -q \
    -c 'CREATE EXTENSION IF NOT EXISTS vector;' \
    -c 'CREATE EXTENSION IF NOT EXISTS pg_trgm;' \
    -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
  echo "   ok"

  echo "== 2. 스키마 (kb_documents · kb_chunks)"
  PGPASSWORD="$(val DB_PASSWORD)" psql -h 127.0.0.1 -p 5432 -U "$(val DB_USERNAME)" -d "$(val DB_NAME)" \
    -v ON_ERROR_STOP=1 -q -f "$ROOT/db/init/02-knowledge.sql"
  echo "   ok"

  echo "== 3. venv + 의존성 (torch 없음)"
  [ -x "$SVC/.venv/bin/python" ] || python3 -m venv "$SVC/.venv"
  "$SVC/.venv/bin/pip" install -q --upgrade pip
  "$SVC/.venv/bin/pip" install -q -r "$SVC/requirements.txt"
  echo "   ok ($("$SVC/.venv/bin/python" --version))"

  echo "== 4. 뇌 .env ($BRAIN_ENV)"
  if [ ! -f "$BRAIN_ENV" ]; then
    AQV_TID=$(val ENTRA_ALLOWED_TENANTS | cut -d, -f1)
    MODEL=$(val ANTHROPIC_MODEL); MODEL=${MODEL:-claude-sonnet-5}
    EFFORT=$(val ANTHROPIC_EFFORT); EFFORT=${EFFORT:-medium}
    umask 077
    cat > "$BRAIN_ENV" <<EOF
# 뇌(agent-service) 환경. deploy/brain-ec2.sh 가 apps/api/.env 에서 옮겨 적었다.
ANTHROPIC_API_KEY=$(val ANTHROPIC_API_KEY)
ANTHROPIC_MODEL=$MODEL
ANTHROPIC_EFFORT=$EFFORT
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=$(val DB_USERNAME)
DB_PASSWORD=$(val DB_PASSWORD)
DB_NAME=$(val DB_NAME)
AGENT_SERVICE_TOKEN=$(val AGENT_SERVICE_TOKEN)
# 같은 상자의 princess BGE-M3(int8 ONNX)를 빌린다. 바꾸면 전체 재색인.
EMBED_BACKEND=http
EMBED_HTTP_URL=$EMBED_URL
# 비워 둔다 — 모든 테넌트가 Genie(코어 인격). AQV/마이키는 옛 회사 이름이라 매핑하지 않는다.
PERSONA_ORG_MAP=
LOG_LEVEL=INFO
EOF
    echo "   만들었습니다"
  else
    echo "   이미 있습니다 (손대지 않음)"
  fi

  echo "== 5. systemd genie-brain"
  sudo tee /etc/systemd/system/genie-brain.service >/dev/null <<EOF
[Unit]
Description=Genie brain (agent-service)
After=network.target postgresql.service

[Service]
User=ubuntu
WorkingDirectory=$SVC
EnvironmentFile=$BRAIN_ENV
ExecStart=$SVC/.venv/bin/python -m uvicorn src.main:app --host 127.0.0.1 --port $BRAIN_PORT
Restart=always
RestartSec=3
# 4GB 상자에 princess · next · nest 가 같이 산다. 뇌가 새면 뇌만 죽는다.
MemoryMax=1G

[Install]
WantedBy=multi-user.target
EOF
  sudo systemctl daemon-reload
  sudo systemctl enable -q genie-brain
  sudo systemctl restart genie-brain
  sleep 4
  echo "== 6. health"
  curl -sf -m 10 "http://127.0.0.1:$BRAIN_PORT/health" || { echo; journalctl -u genie-brain -n 30 --no-pager; exit 1; }
  echo
  echo "✓ setup 끝. 다음: bash deploy/brain-ec2.sh ingest"
  ;;

ingest)
  need ENTRA_ALLOWED_TENANTS
  AQV_TID=$(val ENTRA_ALLOWED_TENANTS | cut -d, -f1)
  cd "$SVC"
  # README.md 는 전사 작업 노트라 뺀다 (parse.py 가 frontmatter 없는 md 를 거부하지만, 애초에 안 넘긴다)
  mapfile -t FILES < <(ls "$ROOT"/regulations/*.docx "$ROOT"/regulations/*.pdf "$ROOT"/regulations/transcripts/*.md 2>/dev/null | grep -v '/README\.md$')
  echo "== ${#FILES[@]}개 파일을 org=$AQV_TID 로 색인 (임베딩은 8090, LLM 호출 없음)"
  set -a; . "$BRAIN_ENV"; set +a
  "$SVC/.venv/bin/python" -m src.kb.ingest "${FILES[@]}" --org-id "$AQV_TID" --log-level INFO
  echo "== 결과"
  PGPASSWORD="$(val DB_PASSWORD)" psql -h 127.0.0.1 -U "$(val DB_USERNAME)" -d "$(val DB_NAME)" -tA \
    -c "select 'docs='||count(*) from kb_documents" \
    -c "select 'chunks='||count(*)||' null_emb='||count(*) filter (where embedding is null) from kb_chunks"
  ;;

switch)
  if grep -q '^RAG_SERVICE_URL=' "$API_ENV"; then
    sed -i "s|^RAG_SERVICE_URL=.*|RAG_SERVICE_URL=http://127.0.0.1:$BRAIN_PORT|" "$API_ENV"
  else
    echo "RAG_SERVICE_URL=http://127.0.0.1:$BRAIN_PORT" >> "$API_ENV"
  fi
  grep -E '^RAG_SERVICE_URL=' "$API_ENV"
  pm2 restart genie-api --update-env >/dev/null
  sleep 3
  curl -sf -m 10 "http://127.0.0.1:$BRAIN_PORT/health" >/dev/null && echo "뇌 health ok"
  echo "✓ switch 끝. Zalo 에 다시 물어보면 됩니다."
  ;;

*)
  echo "사용법: bash deploy/brain-ec2.sh setup | ingest | switch"; exit 2 ;;
esac
