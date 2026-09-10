"""ai_posts 의 국문 제목·요약을 영문·베트남어로 몰아서 채우는 수동 도구.

배경: 스키마에는 title/summary 의 en·vn 컬럼이 처음부터 있었지만 생성 파이프라인이
국문만 넣어서, 발행글 274건 전부 en·vn 이 NULL 이었다.

평소에는 이 스크립트가 필요 없다 — 워커가 발행이 확정되는 순간 번역하고, 회차마다
번역이 빠진 발행글을 보충한다(main.py). 이 스크립트는 한 번에 많은 양을 몰아서
처리해야 할 때(초기 백필, 초안 대량 발행 예정 등) 쓰는 수동 도구다.

설계 메모
- 한 글당 한 번만 호출한다. 영문·베트남어를 같은 응답에서 받아 문단 구분과 용어가
  서로 어긋나지 않게 한다.
- 이미 채워진 글은 건너뛴다. 중간에 끊겨도 다시 돌리면 이어서 진행된다.
- 실패한 글은 건너뛰고 계속한다. 한 건의 오류로 전체가 멈추면 재실행 비용이 크다.
- 진행 상황을 한 줄씩 stdout 에 흘린다. nohup 으로 띄워 tail 로 지켜볼 수 있다.

사용법 (서버):
    cd /var/www/Geniein/apps/ai-worker
    ./venv/bin/python scripts/backfill_translations.py --limit 3   # 표본 확인
    ./venv/bin/python scripts/backfill_translations.py            # 발행글 전체
    ./venv/bin/python scripts/backfill_translations.py --include-drafts
"""

import argparse
import os
import sys
import threading
from concurrent.futures import ThreadPoolExecutor

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

# apps/ai-worker 를 import 경로에 넣어 워커와 같은 번역 프롬프트를 쓴다.
# 프롬프트를 복사해두면 한쪽만 손봤을 때 언어별 표기가 갈린다.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.processor import AIProcessor  # noqa: E402

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

print_lock = threading.Lock()


def log(msg):
    with print_lock:
        print(msg, flush=True)


def connect():
    return psycopg.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "postgres"),
        user=os.getenv("DB_USER") or os.getenv("DB_USERNAME", "postgres"),
        password=os.getenv("DB_PASSWORD"),
        autocommit=True,
    )


def fetch_targets(conn, include_drafts, limit):
    where = [
        "title_kr is not null",
        "summary_kr is not null",
        "(title_en is null or title_vn is null or summary_en is null or summary_vn is null)",
    ]
    if not include_drafts:
        where.append("publish_status = 'published'")
    sql = f"""
        select id, title_kr, summary_kr
        from ai_posts
        where {' and '.join(where)}
        order by published_at desc nulls last, created_at desc
    """
    if limit:
        sql += f" limit {int(limit)}"
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(sql)
        return cur.fetchall()


def save(conn, post_id, out):
    with conn.cursor() as cur:
        cur.execute(
            """
            update ai_posts
               set title_en = %s, title_vn = %s,
                   summary_en = %s, summary_vn = %s,
                   updated_at = now()
             where id = %s
            """,
            (out["title_en"], out["title_vn"], out["summary_en"], out["summary_vn"], post_id),
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="이만큼만 처리 (표본 확인용)")
    parser.add_argument("--include-drafts", action="store_true", help="초안까지 처리")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--dry-run", action="store_true", help="번역만 하고 저장하지 않는다")
    args = parser.parse_args()

    if not os.getenv("OPENAI_API_KEY"):
        sys.exit("OPENAI_API_KEY 가 없다 (.env 확인)")

    processor = AIProcessor()
    conn = connect()
    rows = fetch_targets(conn, args.include_drafts, args.limit)
    total = len(rows)
    log(f"대상 {total}건 · 모델 {os.getenv('TRANSLATE_MODEL', 'gpt-5.4-nano')} · 워커 {args.workers}"
        + (" · DRY RUN" if args.dry_run else ""))
    if not total:
        return

    counters = {"done": 0, "failed": 0}

    def work(index_row):
        i, row = index_row
        try:
            out = processor.translate_to_en_vn(row["title_kr"], row["summary_kr"])
            if not args.dry_run:
                save(conn, row["id"], out)
            with print_lock:
                counters["done"] += 1
                n = counters["done"] + counters["failed"]
            log(f"[{n}/{total}] ok  {row['title_kr'][:28]} → {out['title_en'][:40]}")
        except Exception as exc:  # 한 건 실패로 전체를 멈추지 않는다
            with print_lock:
                counters["failed"] += 1
                n = counters["done"] + counters["failed"]
            log(f"[{n}/{total}] FAIL {row['id']} {row['title_kr'][:24]} :: {exc}")

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        list(pool.map(work, enumerate(rows)))

    log(f"끝 · 성공 {counters['done']} · 실패 {counters['failed']}")
    if counters["failed"]:
        log("실패분은 다시 실행하면 이어서 처리된다 (채워진 글은 건너뛴다)")
    conn.close()


if __name__ == "__main__":
    main()
