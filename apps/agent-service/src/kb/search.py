"""지식베이스 검색 — 벡터·BM25·트라이그램 3갈래를 RRF 로 합친다 (설계문서 5.1).

필터(superseded_at / role_scope / org_id)는 모든 갈래에 건다. 한 갈래라도 새면 인가가 뚫린다.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import date
from functools import lru_cache

from ..db import connect, to_vector_literal
from . import embed

logger = logging.getLogger(__name__)

DEFAULT_LIMIT = 8

# 신원이 비어 있으면 최소 권한으로 떨어진다. 열어두는 쪽이 아니라 좁히는 쪽이 기본값이다.
FALLBACK_ROLES = ["requester"]

# RRF 상수. 원 논문(Cormack 2009)의 k=60.
RRF_K = 60

# 갈래별로 몇 건까지 후보로 볼 것인가. 최종 limit 보다 넉넉해야 융합이 의미를 갖는다.
CANDIDATE_POOL = 40

# 갈래 가중치. 벡터 단독이 기본값 — eval/search_eval.py 실측에서 미검출 0건(recall@8 100%)이고
# 융합은 순위만 바꿨다. 0 인 갈래는 SQL 조립 단계에서 아예 빠진다(_build_sql).
# ⚠ 청크 232개 기준이다. 코퍼스가 커지면 다시 재고 켜라 — 그래서 지우지 않고 가중치로 남겼다.
WEIGHT_VECTOR = 1.0
WEIGHT_LEXICAL = 0.0
WEIGHT_TRIGRAM = 0.0

# 트라이그램에 넘길 단어의 최소 길이. 한 글자짜리("왜", "뭐")는 아무 데나 걸린다.
MIN_TRIGRAM_TERM = 2

# 트라이그램 하한. 실측 최저선이 0.333('일비')이라 그보다 조금 위에 둔다.
TRIGRAM_FLOOR = 0.4

# 순위는 breadcrumb 을 뺀 본문에만 매긴다. 그대로 두면 문서 제목이 그 문서의 모든 청크에
# 1.000 으로 걸려 조항을 못 가른다. WHERE 절은 인덱스가 걸린 원본 컬럼에 그대로 둔다.
BODY_SQL = "substr(c.content, strpos(c.content, chr(10)) + 1)"

# 필터는 갈래마다 되풀이한다. 공통 CTE 로 묶으면 중간 테이블이 되어 HNSW·GIN 인덱스를 못 쓴다.
_SCOPED = """
    FROM kb_chunks c
    JOIN kb_documents d ON d.id = c.document_id
    WHERE d.superseded_at IS NULL
      AND d.role_scope && %(roles)s
      AND d.org_id = %(org_id)s
"""

_LEX_RANK = f"ts_rank_cd(to_tsvector('simple', {BODY_SQL}), tsq.q)"

_VEC_CTE = f"""
vec AS (
    SELECT c.id, row_number() OVER (ORDER BY c.embedding <=> %(vec)s::vector) AS rank
    {_SCOPED}
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> %(vec)s::vector
    LIMIT %(pool)s
)"""

_TSQ_CTE = """
tsq AS (
    SELECT to_tsquery('simple', array_to_string(%(terms)s::text[], ' | ')) AS q
)"""

_LEX_CTE = f"""
lex AS (
    SELECT c.id, row_number() OVER (ORDER BY {_LEX_RANK} DESC, c.id) AS rank
    FROM kb_chunks c
    JOIN kb_documents d ON d.id = c.document_id
    CROSS JOIN tsq
    WHERE d.superseded_at IS NULL
      AND d.role_scope && %(roles)s
      AND d.org_id = %(org_id)s
      AND c.tsv @@ tsq.q
    ORDER BY {_LEX_RANK} DESC, c.id
    LIMIT %(pool)s
)"""

_TRG_CTE = f"""
scored_trg AS (
    -- max 가 아니라 합이다. max 면 질의어 하나만 있어도 1.000 이라 동점이 쏟아진다.
    SELECT c.id,
           (SELECT coalesce(sum(s), 0)
              FROM (SELECT word_similarity(t, {BODY_SQL}) AS s
                      FROM unnest(%(trigram_terms)s::text[]) AS t) AS per_term
             WHERE s >= %(trigram_floor)s) AS sim
    {_SCOPED}
),
trg AS (
    SELECT id, row_number() OVER (ORDER BY sim DESC, id) AS rank
    FROM scored_trg
    WHERE sim > 0
    ORDER BY sim DESC, id
    LIMIT %(pool)s
)"""

# ::float8 를 빼면 정수 나눗셈이 되어 모든 점수가 0 이 되고 순위가 조용히 무너진다.
_PART_SQL = {
    "vector": "SELECT id, %(w_vec)s::float8 / (%(k)s + rank) AS w, 'vector' AS src FROM vec",
    "lexical": "SELECT id, %(w_lex)s::float8 / (%(k)s + rank) AS w, 'lexical' AS src FROM lex",
    "trigram": "SELECT id, %(w_trg)s::float8 / (%(k)s + rank) AS w, 'trigram' AS src FROM trg",
}

_TAIL_SQL = """
SELECT
    d.title,
    d.effective_date,
    d.citation_scheme,
    d.ocr_used,
    d.source_url,
    c.content,
    f.score,
    f.sources,
    c.document_id,
    c.ordinal
FROM fused f
JOIN kb_chunks c ON c.id = f.id
JOIN kb_documents d ON d.id = c.document_id
ORDER BY f.score DESC, c.id
LIMIT %(limit)s
"""


@dataclass(frozen=True)
class Hit:
    title: str
    effective_date: date | None
    citation_scheme: str | None
    ocr_used: bool
    source_url: str | None
    content: str
    score: float
    # 어느 갈래가 이 청크를 찾았는가. 검색이 나빴을 때 어느 쪽을 손볼지 알려준다 (10.2).
    sources: tuple[str, ...] = ()
    # 부모 섹션을 되찾는 데 쓴다 (kb/context.py). 검색은 청크로, 근거는 섹션으로.
    document_id: str = ""
    ordinal: int = -1

    @property
    def breadcrumb(self) -> str:
        """청크 첫 줄의 `[문서 > 장 > 조]`. 같은 값이면 같은 섹션이다."""
        return self.content.split("\n", 1)[0]


@lru_cache(maxsize=8)
def _build_sql(use_lexical: bool, use_trigram: bool) -> str:
    """쓰는 갈래만 넣어 SQL 을 조립한다. 가중치 0 인 갈래는 질의 자체를 돌리지 않는다."""
    ctes = [_VEC_CTE]
    parts = [_PART_SQL["vector"]]
    if use_lexical:
        ctes += [_TSQ_CTE, _LEX_CTE]
        parts.append(_PART_SQL["lexical"])
    if use_trigram:
        ctes.append(_TRG_CTE)
        parts.append(_PART_SQL["trigram"])

    fused = (
        "\nfused AS (\n"
        "    SELECT id, sum(w) AS score, array_agg(src ORDER BY src) AS sources\n"
        "    FROM (\n        "
        + "\n        UNION ALL\n        ".join(parts)
        + "\n    ) parts\n    GROUP BY id\n)"
    )
    return "WITH" + ",".join(ctes + [fused]) + _TAIL_SQL


def _terms(query: str) -> list[str]:
    r"""질의를 안전한 단어 목록으로. `\w+` 만 뽑아 tsquery 연산자가 섞여 들어가지 못하게 한다."""
    return re.findall(r"\w+", query, flags=re.UNICODE)


def search(
    query: str,
    *,
    org_id: str,
    roles: list[str] | None = None,
    limit: int = DEFAULT_LIMIT,
) -> list[Hit]:
    # roles 와 달리 org_id 에는 기본값이 없다. 빈 값을 허용하면 그 순간 필터가 사라진다.
    if not org_id:
        raise ValueError("org_id 없이 검색할 수 없습니다 — 어느 법인의 문서인지 지정해야 합니다")

    effective_roles = list(roles) if roles else list(FALLBACK_ROLES)

    terms = _terms(query)
    trigram_terms = [t for t in terms if len(t) >= MIN_TRIGRAM_TERM]

    vector = embed.encode([query], is_query=True)[0]

    params = {
        "vec": to_vector_literal(vector),
        "roles": effective_roles,
        "org_id": org_id,
        # to_tsquery('') 는 에러다. 안 맞는 값을 넣어 그 갈래만 비운다.
        "terms": terms or ["__no_terms__"],
        "trigram_terms": trigram_terms or ["__no_terms__"],
        "trigram_floor": TRIGRAM_FLOOR,
        "pool": CANDIDATE_POOL,
        "k": RRF_K,
        "w_vec": WEIGHT_VECTOR,
        "w_lex": WEIGHT_LEXICAL,
        "w_trg": WEIGHT_TRIGRAM,
        "limit": limit,
    }

    sql = _build_sql(WEIGHT_LEXICAL > 0, WEIGHT_TRIGRAM > 0)

    with connect() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()

    hits = [
        Hit(
            title=row[0],
            effective_date=row[1],
            citation_scheme=row[2],
            ocr_used=row[3],
            source_url=row[4],
            content=row[5],
            score=float(row[6]),
            sources=tuple(row[7] or ()),
            document_id=str(row[8]),
            ordinal=int(row[9]),
        )
        for row in rows
    ]

    # 갈래별 기여도. "검색이 이상하다"는 신고를 로그만으로 좁힐 수 있어야 한다.
    contributions = {src: sum(1 for h in hits if src in h.sources)
                     for src in ("vector", "lexical", "trigram")}
    logger.info(
        "검색 %r org=%s roles=%s → %d건 (갈래별 %s)",
        query[:40], org_id, effective_roles, len(hits), contributions,
    )
    return hits
