"""Postgres 연결."""

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
    """pgvector 리터럴. `%s::vector` 로 바인딩해서 쓴다."""
    return "[" + ",".join(f"{v:.7g}" for v in values) + "]"


def fetch_all(conn: psycopg.Connection, sql: str, params: Any = None) -> list[tuple]:
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()
