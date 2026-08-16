"""Postgres 연결.

소유권: `kb_documents` / `kb_chunks` 는 agent-service 가 소유한다 (db/init/02-knowledge.sql).
NestJS 엔티티가 없으므로 TypeORM synchronize 가 이 테이블을 건드리지 않는다.

커넥션 풀을 두지 않는다 — 현재 부하에서는 이른 최적화이고, 색인 CLI 와 API 가
같은 헬퍼를 공유하는 편이 낫다. 부하가 보이면 psycopg_pool 로 이 파일 안에서만 바꾼다.

pgvector 파이썬 어댑터를 쓰지 않는 이유: 의존성 하나를 아끼기 위해 벡터를
`'[0.1,0.2,...]'::vector` 리터럴로 넘긴다. Postgres 가 파싱하는 형식 그대로다.
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator, Sequence

import psycopg

from .config import get_settings


@contextmanager
def connect() -> Iterator[psycopg.Connection]:
    """트랜잭션 1개짜리 연결. 블록을 정상 종료하면 커밋, 예외면 롤백된다."""
    with psycopg.connect(get_settings().dsn) as conn:
        yield conn


def to_vector_literal(values: Sequence[float]) -> str:
    """pgvector 리터럴. `%s::vector` 로 바인딩해서 쓴다.

    repr(float) 대신 반복 가능한 표현을 쓴다 — 같은 입력이 같은 문자열이 되어야
    재색인 시 불필요한 diff 가 생기지 않는다.
    """
    return "[" + ",".join(f"{v:.7g}" for v in values) + "]"


def fetch_all(conn: psycopg.Connection, sql: str, params: Any = None) -> list[tuple]:
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()
