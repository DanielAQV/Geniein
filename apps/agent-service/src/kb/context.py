"""부모-섹션 주입 — 검색은 청크로, 근거는 섹션으로 (설계문서 5.1)."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date

from ..db import connect
from .search import Hit

logger = logging.getLogger(__name__)

# 섹션 하나가 컨텍스트를 독식하지 못하게 하는 상한.
MAX_SECTION_CHARS = 6000

# 주입 총량 상한. 넘으면 순위가 낮은 섹션부터 버린다.
MAX_TOTAL_CHARS = 20000

# 섹션 전문을 되찾는 질의. 청크 첫 줄(breadcrumb)이 같으면 같은 섹션이다.
# unnest 를 두 배열로 돌려 짝을 맞춘다. 각각 = ANY() 로 걸면 교차곱이 되어
# 다른 문서의 같은 이름 섹션까지 딸려온다.
SECTION_SQL = """
SELECT c.document_id, want.crumb, c.ordinal, c.content
FROM kb_chunks c
JOIN unnest(%(doc_ids)s::uuid[], %(crumbs)s::text[]) AS want(doc_id, crumb)
  ON want.doc_id = c.document_id
 AND want.crumb = split_part(c.content, chr(10), 1)
ORDER BY c.document_id, c.ordinal
"""


@dataclass(frozen=True)
class Evidence:
    """모델에게 넘길 근거 한 덩어리 = 문서의 한 섹션."""

    title: str
    breadcrumb: str
    effective_date: date | None
    citation_scheme: str | None
    ocr_used: bool
    source_url: str | None
    text: str
    # 섹션이 상한을 넘어 일부만 넣었는가. 모델에게 밝혀야 "전문을 봤다"고 착각하지 않는다.
    truncated: bool
    chunk_count: int
    score: float
    sources: tuple[str, ...]


def _body(chunk_content: str) -> str:
    """청크에서 breadcrumb 줄을 뗀 본문."""
    parts = chunk_content.split("\n", 1)
    return parts[1] if len(parts) == 2 else chunk_content


def _window(chunks: list[tuple[int, str]], matched: set[int]) -> tuple[str, bool]:
    """상한을 넘는 섹션에서 걸린 청크 주변만 남긴다."""
    by_ordinal = {ordinal: text for ordinal, text in chunks}
    keep = sorted(o for o in matched if o in by_ordinal)
    if not keep:
        keep = [chunks[0][0]]

    total = sum(len(by_ordinal[o]) for o in keep)
    low, high = min(keep), max(keep)
    ordinals = [o for o, _ in chunks]

    # 앞뒤로 한 칸씩 번갈아 넓힌다.
    while total < MAX_SECTION_CHARS:
        grew = False
        for candidate in (low - 1, high + 1):
            if candidate not in by_ordinal or candidate in keep:
                continue
            if total + len(by_ordinal[candidate]) > MAX_SECTION_CHARS:
                continue
            keep.append(candidate)
            total += len(by_ordinal[candidate])
            low, high = min(low, candidate), max(high, candidate)
            grew = True
        if not grew:
            break

    kept = sorted(keep)
    text = "\n\n".join(_body(by_ordinal[o]) for o in kept)
    return text, len(kept) < len(ordinals)


def build(hits: list[Hit]) -> list[Evidence]:
    """검색 결과(청크)를 근거(섹션)로 바꾼다. 순서는 검색 순위를 따른다."""
    if not hits:
        return []

    # 섹션별로 접는다. 대표값은 가장 잘 걸린 청크의 것을 쓴다.
    order: list[tuple[str, str]] = []
    best: dict[tuple[str, str], Hit] = {}
    matched: dict[tuple[str, str], set[int]] = {}
    fused_sources: dict[tuple[str, str], set[str]] = {}

    for hit in hits:
        key = (hit.document_id, hit.breadcrumb)
        if key not in best:
            order.append(key)
            best[key] = hit
            matched[key] = set()
            fused_sources[key] = set()
        matched[key].add(hit.ordinal)
        fused_sources[key].update(hit.sources)

    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            SECTION_SQL,
            {
                "doc_ids": [doc_id for doc_id, _ in order],
                "crumbs": [crumb for _, crumb in order],
            },
        )
        rows = cur.fetchall()

    sections: dict[tuple[str, str], list[tuple[int, str]]] = {}
    for document_id, crumb, ordinal, content in rows:
        sections.setdefault((str(document_id), crumb), []).append((int(ordinal), content))

    evidence: list[Evidence] = []
    budget = MAX_TOTAL_CHARS
    for key in order:
        chunks = sorted(sections.get(key, []))
        if not chunks:
            continue

        full = "\n\n".join(_body(text) for _, text in chunks)
        if len(full) <= MAX_SECTION_CHARS:
            text, truncated = full, False
        else:
            text, truncated = _window(chunks, matched[key])

        if len(text) > budget:
            logger.info("주입 예산 소진 — 섹션 %d개에서 끊었습니다", len(evidence))
            break
        budget -= len(text)

        head = best[key]
        evidence.append(
            Evidence(
                title=head.title,
                breadcrumb=key[1].strip("[]"),
                effective_date=head.effective_date,
                citation_scheme=head.citation_scheme,
                ocr_used=head.ocr_used,
                source_url=head.source_url,
                text=text,
                truncated=truncated,
                chunk_count=len(chunks),
                score=head.score,
                sources=tuple(sorted(fused_sources[key])),
            )
        )

    logger.info(
        "근거 조립 — 청크 %d개 → 섹션 %d개 (%d자, 발췌 %d개) 상위=%s",
        len(hits),
        len(evidence),
        sum(len(e.text) for e in evidence),
        sum(1 for e in evidence if e.truncated),
        # 1위 근거가 어느 갈래에서 왔는지. 검색 품질 신고가 들어왔을 때 첫 단서다.
        f"{evidence[0].breadcrumb[:48]}({'+'.join(evidence[0].sources)})" if evidence else "-",
    )
    return evidence
