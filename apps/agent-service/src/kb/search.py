"""지식베이스 검색 — 하이브리드 + 필터 (설계문서 5.1 "검색: 하이브리드 + 필터").

세 갈래로 찾아 **RRF(Reciprocal Rank Fusion)** 로 합친다. 각 갈래가 못 찾는 것이
서로 다르기 때문이고, 셋 다 이 코퍼스에서 실측으로 필요성이 확인됐다:

  ① 벡터 (pgvector cosine)
     자연어 질문을 잡는다. "야근하면 식대 나와요?" → Meal Allowance 결정문.
     한국어 질문으로 영어·베트남어 문서를 찾는 교차언어 검색도 이쪽이 한다.

  ② BM25 (tsvector, 'simple')
     고유번호·금액·영문 용어처럼 **철자가 정확히 일치해야 하는 것**을 잡는다.
     벡터가 가장 약한 지점이다. 실측 토큰화:
         'Decision No. 06/2025/QĐTCAC — 40,000 VND' → '06/2025/q' 'đtcac' '40' '000'

  ③ 트라이그램 (pg_trgm word_similarity, **단어 단위**)
     ②가 한국어에서 못 하는 것을 메운다. 'simple' 사전은 조사를 떼지 않아서
     본문이 '해외법인의' '출장비용을' 로 토큰화되고, 질의 '해외법인' 이 걸리지 않는다.
     부분일치가 되는 트라이그램이 이걸 메운다.

     ★ 질문 전체가 아니라 단어별로 돌린다. 실측:
         word_similarity('부장이 국내 출장 가면 일비 얼마 나와요?', 본문) → 0.130 (변별 없음)
         word_similarity('일비', 본문)                                  → 0.333
       질문이 길수록 트라이그램 집합이 희석돼서 전부 고만고만해진다.

필터 세 개는 **모든 갈래에** 건다. 한 갈래라도 새면 인가가 뚫린다:

  · `superseded_at IS NULL`  — 유효본만. 구버전 사규를 자신 있게 인용하는 것이
                                read 티어의 진짜 위험이다.
  · `role_scope && :roles`   — 편의가 아니라 정확도 요구사항이다. 일반 직원에게
                                Admin 가이드가 걸리면 존재하지 않는 메뉴를 설명한다.
  · `org_id = :org_id`       — 테넌트 격리. 에어키와 지니는 **다른 법인**이고,
                                한쪽 직원에게 다른 쪽 사규가 걸리면 버그가 아니라
                                사고다 (docs/TEAMS_TAB_DESIGN.md 4.4).

★ `org_id` 에 기본값을 두지 않는다. 기본값이 있으면 호출자가 안 넘겨도 통과하고,
  그게 정확히 이 필터가 막으려는 상황이다. 누구의 문서를 찾는지 말하지 않고는
  이 함수를 부를 수 없다.
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

# RRF 상수. 원 논문(Cormack 2009)의 k=60 을 그대로 쓴다. 이 값은 상위 몇 건에
# 쏠리는 정도를 정하는데, 크면 순위 차이가 완만해져 한 갈래의 오판이 덜 치명적이다.
RRF_K = 60

# 갈래별로 몇 건까지 후보로 볼 것인가. 최종 limit 보다 넉넉해야 융합이 의미를 갖는다.
CANDIDATE_POOL = 40

# ── 갈래 가중치 ─────────────────────────────────────────────────────────
#
# ★ 기본값이 벡터 단독인 것은 게으름이 아니라 **측정 결과**다. 0 인 갈래는 아예
#   실행하지 않으므로(_build_sql), 지금 설정은 순수 벡터 검색의 비용 그대로다.
#
# `eval/search_eval.py` 로 22개 질의(자연어 10 · 희귀토큰 6 · 금액 6)를 재면:
#
#     구성            자연어   희귀토큰   금액    미검출
#     벡터 단독        0.950   0.667   0.700     0      ← 기본값
#     트라이그램 단독    0.383   1.000   0.857     4
#     1:0.05:0.05    0.800   0.833   0.700     0
#     1:1:1          0.587   0.792   0.792     2
#
# 평균 MRR 최고는 1:0.05:0.05(0.778)이지만 벡터 단독(0.772)과의 차이가 0.006 로
# 이 표본에서는 잡음이다. 반면 **자연어 0.950 → 0.800 은 분명한 손실**이고, 그게
# 사용자가 실제로 던지는 유형이다 (도구 description 의 예시가 전부 그 형태다).
#
# 결정적으로 **벡터 단독은 세 유형 모두 미검출 0건**이다 — recall@8 이 100% 다.
# 도구가 8건을 통째로 모델에 넘기므로 실제로 중요한 건 상위 8건 안에 들어오는가지
# 그 안에서 1위인가가 아니다. 융합은 순위를 바꿀 뿐 회수율을 못 올린다.
#
# ⚠ 이 결론은 **청크 232개** 기준이다. 8건은 코퍼스의 3.4% 다. SharePoint 동기화로
#   코퍼스가 커지면 그 비율이 떨어지고 벡터 단독의 회수율도 같이 떨어진다. 설계문서
#   5.1 이 BM25 를 필수라고 한 것은 그 구간 얘기로 보인다. **다시 재고 켜라** —
#   그러라고 갈래를 지우지 않고 가중치로 남겼다.
WEIGHT_VECTOR = 1.0
WEIGHT_LEXICAL = 0.0
WEIGHT_TRIGRAM = 0.0

# 트라이그램에 넘길 단어의 최소 길이. 한 글자짜리("왜", "뭐")는 아무 데나 걸린다.
MIN_TRIGRAM_TERM = 2

# 트라이그램 하한. 이 아래는 후보로 치지 않는다.
#
# 정확히 들어있는 단어는 1.000, 조사가 붙은 부분일치('해외법인' vs '해외법인의')는
# 0.8 근처가 나온다. 실측에서 의미 있는 최저선이 '일비' → 0.333 이었으므로 그보다
# 조금 위에 둔다. 너무 낮추면 아무 단어나 걸려 RRF 에 잡음을 밀어 넣는다.
TRIGRAM_FLOOR = 0.4

# ★ 청크 본문 = breadcrumb 을 뺀 나머지. 청크는 `[문서 > 장 > 조]\n본문` 형태다.
#
#   어휘 검색을 본문에만 걸어야 한다. breadcrumb 에 문서 제목이 들어 있어서,
#   그대로 두면 '해외법인' 질의가 그 문서 **48개 청크 전부**에 word_similarity 1.000
#   으로 걸려 순위가 무의미해진다 (실측). 문서를 고르는 데는 도움이 되지만 문서 안에서
#   어느 조항인지는 전혀 가르지 못한다.
#
#   반면 `WHERE` 절은 인덱스가 걸린 원본 컬럼(`tsv`, `content`)에 그대로 둔다 —
#   후보를 넓게 잡고 순위만 본문으로 매기면 인덱스와 정확도를 둘 다 가져간다.
BODY_SQL = "substr(c.content, strpos(c.content, chr(10)) + 1)"

# 필터는 갈래마다 되풀이한다. 공통 CTE 로 한 번만 거르면 편하지만, 그러면 결과가
# 중간 테이블이 되어 HNSW·GIN 인덱스를 못 쓴다. 되풀이가 낫다.
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
    -- ★ max 가 아니라 **합**이다. max 로 하면 질의어 중 하나만 들어있어도 1.000 이
    --   되어 수십 개 청크가 동점이 되고, 그 임의 순서가 그대로 RRF 에 잡음으로
    --   들어간다 (실측: '해외법인 주재원 자녀 학비' 에서 정답인 제20조가 top5 밖).
    --   합이면 "질의어를 더 많이 담은 청크"가 앞선다.
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

# ★ ::float8 를 빼면 안 된다. 가중치가 정수로 넘어오는 순간 `1 / (60 + rank)` 이
#   **정수 나눗셈**이 되어 모든 점수가 0 이 되고, 순위가 조용히 c.id 순으로 무너진다
#   (평가 중에 실제로 이것 때문에 "벡터와 트라이그램 결과가 완전히 동일한" 불가능한
#   표를 보고 한참 헤맸다).
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
    """쓰는 갈래만 넣어 SQL 을 조립한다.

    가중치가 0 인 갈래를 그대로 두면 점수에는 0 을 더하지만 **질의는 그대로 돈다.**
    특히 트라이그램은 청크마다 질의어 수만큼 word_similarity 를 계산하는 상관
    서브쿼리라, 켜두고 0 을 곱하는 것과 빼는 것의 비용 차이가 크다. 그래서 기본값인
    벡터 단독은 순수 벡터 검색과 같은 비용으로 돈다.
    """
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
    """질의를 안전한 단어 목록으로.

    `\\w+` 로만 뽑으므로 tsquery 연산자(`&` `|` `!` `:` `*`)가 섞여 들어갈 수 없다 —
    to_tsquery 에 사용자 입력을 그대로 넘기지 않기 위한 것이다.
    """
    return re.findall(r"\w+", query, flags=re.UNICODE)


def search(
    query: str,
    *,
    org_id: str,
    roles: list[str] | None = None,
    limit: int = DEFAULT_LIMIT,
) -> list[Hit]:
    # roles 는 비면 최소 권한으로 떨어지지만, org_id 는 그렇게 할 수 없다.
    # "최소 권한 org" 같은 건 없고, 빈 값을 허용하면 그 순간 필터가 사라진다.
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
        # 단어가 하나도 없으면 to_tsquery('') 가 에러다. 아무것도 안 맞는 값을 넣어
        # 그 갈래만 비게 한다 — 나머지 두 갈래는 정상 동작해야 한다.
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

    # 갈래별 기여도를 남긴다. "검색이 이상하다"는 신고가 왔을 때 어느 갈래가
    # 엉뚱한 걸 올렸는지 로그만으로 좁힐 수 있어야 한다.
    contributions = {src: sum(1 for h in hits if src in h.sources)
                     for src in ("vector", "lexical", "trigram")}
    logger.info(
        "검색 %r org=%s roles=%s → %d건 (갈래별 %s)",
        query[:40], org_id, effective_roles, len(hits), contributions,
    )
    return hits
