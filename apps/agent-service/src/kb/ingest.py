"""색인 파이프라인 (설계문서 5.1)."""

from __future__ import annotations

import argparse
import logging
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from ..config import REPO_ROOT
from ..db import connect, to_vector_literal
from . import embed
from .parse import ParsedDoc, chunk_document, load_any

logger = logging.getLogger(__name__)

ALL_ROLES = ["requester", "approver", "admin"]

# 파일명이 역할을 명시하는 경우에만 좁힌다. 추측하지 않는다 —
# 일반 직원 질문에 Admin 가이드가 걸리면 존재하지 않는 메뉴를 설명하게 된다 (5.1).
ROLE_HINTS = {
    "requester": ["requester"],
    "approver": ["approver"],
    "admin": ["admin"],
}


def detect_format(path: Path) -> str:
    """포맷 등급 판별. 확장자가 아니라 내용으로 본다."""
    if path.suffix.lower() == ".md":
        # 전사본. 원본 등급은 frontmatter 가 들고 있다.
        return "pdf_scan"

    head = path.read_bytes()[:8]
    if head.startswith(b"PK\x03\x04"):
        return "docx"
    if head.startswith(b"\xd0\xcf\x11\xe0"):
        return "hwp"  # HWP 5.x OLE
    if not head.startswith(b"%PDF"):
        raise ValueError(f"알 수 없는 포맷입니다: {path.name}")

    raw = path.read_bytes()
    font_count = raw.count(b"/Font")
    image_count = sum(raw.count(marker) for marker in (b"DCTDecode", b"CCITTFaxDecode", b"JPXDecode"))
    if font_count == 0 and image_count > 0:
        return "pdf_scan"
    return "pdf_text"


def infer_role_scope(path: Path, metadata: dict[str, Any]) -> list[str]:
    declared = metadata.get("role_scope")
    if declared:
        return [str(r) for r in declared]

    name = path.name.lower()
    for role, hints in ROLE_HINTS.items():
        if any(h in name for h in hints):
            logger.info("  role_scope 를 파일명에서 좁힘: %s → [%s]", path.name, role)
            return [role]

    return list(ALL_ROLES)


def _as_date(value: Any) -> date | None:
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None
    return None


def _document_row(path: Path, doc: ParsedDoc, source_format: str, org_id: str) -> dict[str, Any]:
    meta = doc.metadata
    try:
        source_url = str(path.resolve().relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        source_url = str(path.resolve()).replace("\\", "/")

    return {
        "org_id": org_id,
        "source": str(meta.get("source") or "upload"),
        "source_url": source_url,
        "title": doc.title,
        "content_hash": doc.content_hash,
        "role_scope": infer_role_scope(path, meta),
        "lang": [str(x) for x in (meta.get("lang") or [])],
        "source_format": str(meta.get("source_format") or source_format),
        "ocr_used": bool(meta.get("ocr_used", False)),
        "citation_scheme": meta.get("citation_scheme"),
        "effective_date": _as_date(meta.get("effective_date")),
        "source_modified_at": datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc),
    }


# org_id 는 NOT NULL 로 취급한다 (스키마는 nullable 이지만 여기서 항상 채운다).
# NULL 로 들어간 문서는 검색 필터에 영원히 안 걸린다 — 색인만 성공하고 조회는 안 된다.
UPSERT_DOC = """
INSERT INTO kb_documents (
    org_id, source, source_url, title, content_hash, role_scope, lang,
    source_format, ocr_used, citation_scheme, effective_date,
    source_modified_at, indexed_at
) VALUES (
    %(org_id)s, %(source)s, %(source_url)s, %(title)s, %(content_hash)s, %(role_scope)s, %(lang)s,
    %(source_format)s, %(ocr_used)s, %(citation_scheme)s, %(effective_date)s,
    %(source_modified_at)s, now()
)
-- org_id 가 키에 들어 있으므로 다른 법인의 같은 파일은 충돌하지 않고 별도 행이 된다.
-- (그래서 DO UPDATE 에 org_id 가 없다 — 키의 일부라 갱신 대상이 아니다)
ON CONFLICT (org_id, source, source_url) WHERE source_url IS NOT NULL
DO UPDATE SET
    title = EXCLUDED.title,
    content_hash = EXCLUDED.content_hash,
    role_scope = EXCLUDED.role_scope,
    lang = EXCLUDED.lang,
    source_format = EXCLUDED.source_format,
    ocr_used = EXCLUDED.ocr_used,
    citation_scheme = EXCLUDED.citation_scheme,
    effective_date = EXCLUDED.effective_date,
    source_modified_at = EXCLUDED.source_modified_at,
    indexed_at = now()
RETURNING id
"""


def ingest_file(
    path: Path, *, org_id: str, force: bool = False, dry_run: bool = False
) -> dict[str, Any]:
    source_format = detect_format(path)
    if source_format == "hwp":
        raise ValueError(
            f"{path.name}: HWP 는 파싱하지 않습니다. 같은 문서의 텍스트 PDF 가 있으면 "
            f"그걸 넣으세요 (설계문서 5.1.1)."
        )

    doc = load_any(path)
    chunks = chunk_document(doc)
    if not chunks:
        raise ValueError(f"{path.name}: 추출된 텍스트가 없습니다. 스캔본이면 vision 전사가 필요합니다.")

    row = _document_row(path, doc, source_format, org_id)
    summary = {
        "file": path.name,
        "title": doc.title,
        "format": row["source_format"],
        "ocr_used": row["ocr_used"],
        "role_scope": row["role_scope"],
        "sections": len(doc.sections),
        "chunks": len(chunks),
        "tables": sum(1 for c in chunks if c.content.lstrip().startswith("|") or "\n|" in c.content),
    }

    if dry_run:
        summary["status"] = "dry-run"
        return summary

    with connect() as conn, conn.cursor() as cur:
        # org_id 를 조건에 넣지 않으면 다른 법인의 같은 파일이 해시가 같다는 이유로
        # "unchanged" 로 건너뛰어, 그 법인 코퍼스가 영원히 비어 있게 된다.
        cur.execute(
            "SELECT id, content_hash FROM kb_documents "
            "WHERE org_id = %s AND source = %s AND source_url = %s",
            (row["org_id"], row["source"], row["source_url"]),
        )
        existing = cur.fetchone()
        if existing and existing[1] == doc.content_hash and not force:
            summary["status"] = "unchanged"
            return summary

        cur.execute(UPSERT_DOC, row)
        document_id = cur.fetchone()[0]

        # 재색인은 삭제 후 재삽입이다. append 하면 구버전이 계속 검색된다 (5.1).
        cur.execute("DELETE FROM kb_chunks WHERE document_id = %s", (document_id,))

        texts = [c.content for c in chunks]
        vectors = embed.encode(texts)
        token_counts = embed.count_tokens(texts)

        cur.executemany(
            """
            INSERT INTO kb_chunks (document_id, ordinal, content, embedding, token_count)
            VALUES (%s, %s, %s, %s::vector, %s)
            """,
            [
                (document_id, chunk.ordinal, chunk.content, to_vector_literal(vec), tokens)
                for chunk, vec, tokens in zip(chunks, vectors, token_counts)
            ],
        )

    summary["status"] = "reindexed" if existing else "indexed"
    summary["document_id"] = str(document_id)
    return summary


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="지식베이스 색인")
    parser.add_argument("paths", nargs="+", type=Path)
    # 필수다. 기본값을 주면 그 값이 조용히 전사 기본이 되고 테넌트 격리가 무너진다.
    # 값은 Entra 테넌트 ID(tid)와 같다.
    parser.add_argument("--org-id", required=True, help="문서를 소유한 법인의 테넌트 ID (UUID)")
    parser.add_argument("--force", action="store_true", help="해시가 같아도 다시 색인한다")
    parser.add_argument("--dry-run", action="store_true", help="청킹 결과만 보고 DB 는 건드리지 않는다")
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), logging.INFO),
        format="%(levelname)-7s %(name)s | %(message)s",
    )

    files: list[Path] = []
    for raw in args.paths:
        files.extend(sorted(raw.parent.glob(raw.name)) if any(ch in raw.name for ch in "*?") else [raw])

    failed = 0
    for path in files:
        if not path.is_file():
            logger.error("파일이 없습니다: %s", path)
            failed += 1
            continue
        try:
            result = ingest_file(
                path, org_id=args.org_id, force=args.force, dry_run=args.dry_run
            )
        except Exception as exc:  # noqa: BLE001 — 한 파일 실패가 배치를 죽이지 않는다
            logger.error("색인 실패 %s: %s", path.name, exc)
            failed += 1
            continue

        logger.info(
            "%-9s %-46s %-9s ocr=%-5s 섹션=%-3d 청크=%-3d roles=%s",
            result["status"],
            result["file"][:46],
            result["format"],
            result["ocr_used"],
            result["sections"],
            result["chunks"],
            ",".join(result["role_scope"]),
        )

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
