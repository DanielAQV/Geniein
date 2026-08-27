#!/usr/bin/env bash
#
# 가이드를 마이키 코퍼스에 반영한다. 물리 서버(뇌)에서 cron 으로 돈다.
#
#   */10 * * * * /home/dev_admin/genie/scripts/sync-guides.sh >> /var/log/sync-guides.log 2>&1
#
# ★ **뇌 저장소를 pull 하지 않는다.** 가이드 전용 체크아웃을 따로 두고 그쪽만 당긴다.
#   같은 체크아웃을 쓰면 cron 이 뇌 코드까지 끌어오는데, 서비스는 재시작되지 않으므로
#   "파일은 새것, 도는 건 옛것" 상태가 조용히 생긴다. 문서 동기화가 코드 배포를
#   건드리는 것은 값이 너무 크다.
#
#   최초 1회:
#     git clone --depth 1 --filter=blob:none --sparse -b feat/teams-tab <저장소> ~/genie-guides
#     cd ~/genie-guides && git sparse-checkout set apps/web/content/guides
#
# ★ 색인은 멱등이다. 내용 해시가 같으면 색인기가 건너뛰고, 바뀐 문서는 청크를
#   지우고 다시 넣는다 (kb/ingest.py). 그래서 실패해도 다음 회차가 복구한다.
#
set -euo pipefail

GUIDE_REPO=${GUIDE_REPO:-/home/dev_admin/genie-guides}
BRAIN_DIR=${BRAIN_DIR:-/home/dev_admin/genie/apps/agent-service}
VENV_PY=${VENV_PY:-/home/dev_admin/genie/venv/bin/python}
ENV_FILE=${ENV_FILE:-/home/dev_admin/genie/.env}

stamp() { date '+%Y-%m-%d %H:%M:%S'; }

# 어느 법인의 문서인가. 색인기는 이 값 없이는 돌지 않는다 — 기본값을 주면 그 값이
# 조용히 전사 기본이 되고, 그게 테넌트 격리가 무너지는 경로다.
ORG_ID=$(grep -m1 '^GUIDE_ORG_ID=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
if [ -z "${ORG_ID:-}" ]; then
  echo "$(stamp) GUIDE_ORG_ID 가 $ENV_FILE 에 없습니다"
  exit 1
fi

cd "$GUIDE_REPO"
before=$(git rev-parse HEAD)
git pull --ff-only --quiet
after=$(git rev-parse HEAD)

[ "$before" = "$after" ] && exit 0
if git diff --quiet "$before" "$after" -- apps/web/content/guides; then
  exit 0   # 다른 것만 바뀌었다
fi

echo "$(stamp) 가이드 변경 ${before:0:7} → ${after:0:7}"
cd "$BRAIN_DIR"
"$VENV_PY" -m src.kb.ingest "$GUIDE_REPO"/apps/web/content/guides/*.md --org-id "$ORG_ID"
