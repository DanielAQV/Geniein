"""문서 파싱 + 청킹 (설계문서 5.1 "색인 파이프라인").

핵심 규율 두 개:

  ① **구조를 보존한다.** heading 계층이 있어야 인용이 성립하고, 표가 표로 남아야
     직급×금액 매트릭스가 무너지지 않는다. 그래서 docx 를 ZIP+XML 그대로 읽고
     PDF 텍스트 추출을 A등급으로 취급하지 않는다.

  ② **표를 청크 경계로 쪼개지 않는다.** 금액 표가 반으로 갈리면 직급과 금액이
     서로 다른 청크로 흩어져 "부장 일비" 질문에 답할 수 없게 된다.

②를 지키려면 청킹이 "글자 수로 자르기"일 수 없다. 그래서 섹션을 **블록 배열**로
표현하고, `table` 블록은 크기와 무관하게 원자 단위로 둔다. markdown 전사본과
docx 가 같은 블록 표현으로 수렴하므로 청킹 로직은 하나만 있으면 된다.
"""

from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator, Literal

import yaml

from . import headings

logger = logging.getLogger(__name__)

BlockKind = Literal["text", "table"]

HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
TABLE_LINE_RE = re.compile(r"^\s*\|")
FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)

# 이 지점부터 문서 끝까지는 색인 대상이 아니다 (전사자 메모 · 검토 이력 등)
IGNORE_MARKER_RE = re.compile(r"^<!--\s*ingest:ignore\s*-->\s*$", re.MULTILINE)
HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)

# 청크 목표 크기. 표는 이 값을 넘겨도 쪼개지 않는다.
DEFAULT_MAX_CHARS = 1400


@dataclass(frozen=True)
class Block:
    kind: BlockKind
    text: str

    @property
    def atomic(self) -> bool:
        """표는 절대 쪼개지 않는다."""
        return self.kind == "table"


@dataclass
class Section:
    heading_path: tuple[str, ...]
    blocks: list[Block] = field(default_factory=list)


@dataclass
class ParsedDoc:
    title: str
    metadata: dict[str, Any]
    sections: list[Section]
    content_hash: str
    source_path: Path


@dataclass(frozen=True)
class Chunk:
    ordinal: int
    content: str
    heading_path: tuple[str, ...]


# ── markdown 전사본 (C등급 vision 전사 결과) ─────────────────────────────


def parse_markdown(text: str) -> tuple[dict[str, Any], list[Section]]:
    metadata: dict[str, Any] = {}
    match = FRONTMATTER_RE.match(text)
    if match:
        metadata = yaml.safe_load(match.group(1)) or {}
        text = text[match.end() :]

    # ★ 전사자 주석은 색인하지 않는다. 전사본에는 원문과 "우리가 원문에 대해 적어둔
    #   메모"가 한 파일에 섞여 있는데, 후자가 색인되면 유나가 우리 코멘터리를
    #   사규인 것처럼 인용하게 된다. 근거와 메모는 섞이면 안 된다.
    text = IGNORE_MARKER_RE.split(text, maxsplit=1)[0]
    text = HTML_COMMENT_RE.sub("", text)

    sections: list[Section] = []
    heading_stack: list[tuple[int, str]] = []
    current = Section(heading_path=())
    pending: list[str] = []
    table_buffer: list[str] = []

    def flush_text() -> None:
        joined = "\n".join(pending).strip()
        pending.clear()
        if joined:
            current.blocks.append(Block("text", joined))

    def flush_table() -> None:
        if table_buffer:
            current.blocks.append(Block("table", "\n".join(table_buffer).strip()))
            table_buffer.clear()

    def close_section() -> None:
        flush_table()
        flush_text()
        if current.blocks:
            sections.append(current)

    for line in text.splitlines():
        heading = HEADING_RE.match(line)
        if heading:
            close_section()
            level = len(heading.group(1))
            title = heading.group(2).strip()
            current = Section(
                heading_path=_push_heading(heading_stack, headings.Heading(level, title))
            )
            continue

        if TABLE_LINE_RE.match(line):
            flush_text()
            table_buffer.append(line.rstrip())
            continue

        flush_table()
        if line.strip():
            pending.append(line.rstrip())
        else:
            flush_text()

    close_section()
    return metadata, sections


def load_transcript(path: Path) -> ParsedDoc:
    raw = path.read_text(encoding="utf-8")
    metadata, sections = parse_markdown(raw)

    # ★ frontmatter 가 없으면 전사본이 아니라 우리가 쓴 노트다. 거부한다.
    #
    #   실제로 당했다: `python -m src.kb.ingest regulations/transcripts/*.md` 는
    #   이 독스트링에 적힌 사용법 그대로인데, 글롭이 `README.md`(전사 작업 노트)까지
    #   집어삼켜 색인해 버렸다. 그러면 유나가 "미해결 — 출장규정 유효본 판정" 같은
    #   **우리 코멘터리를 사규처럼 인용**하게 된다. 근거와 메모는 섞이면 안 된다.
    #
    #   전사본은 ocr_used·citation_scheme·effective_date 를 frontmatter 로 들고
    #   오므로, 그게 없다는 건 색인에 필요한 판정 정보가 없다는 뜻이기도 하다.
    if not metadata:
        raise ValueError(
            f"{path.name}: frontmatter 가 없습니다. 전사본이 아니라 노트로 보고 "
            f"건너뜁니다 — 색인 대상이면 title/source_format/ocr_used 를 넣으세요."
        )

    return ParsedDoc(
        title=str(metadata.get("title") or path.stem),
        metadata=metadata,
        sections=sections,
        content_hash=hashlib.sha256(raw.encode("utf-8")).hexdigest(),
        source_path=path,
    )


# ── docx (A등급) ─────────────────────────────────────────────────────────


def _iter_block_items(document: Any) -> Iterator[Any]:
    """본문 요소를 **문서 순서대로** 훑는다.

    python-docx 의 `document.paragraphs` / `document.tables` 는 각각 따로 주기
    때문에 표가 어느 문단 사이에 있었는지가 사라진다. 그러면 "제12조 아래의 표"
    라는 관계가 끊어져 heading 계층에 표를 붙일 수 없다.
    """
    from docx.document import Document as DocxDocument
    from docx.oxml.table import CT_Tbl
    from docx.oxml.text.paragraph import CT_P
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    body = document.element.body if isinstance(document, DocxDocument) else document._tc
    for child in body.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, document)
        elif isinstance(child, CT_Tbl):
            yield Table(child, document)


def _table_to_markdown(table: Any) -> str:
    rows: list[list[str]] = []
    for row in table.rows:
        cells = [" ".join(c.text.split()) for c in row.cells]
        rows.append(cells)
    if not rows:
        return ""

    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]

    lines = ["| " + " | ".join(rows[0]) + " |"]
    lines.append("|" + "---|" * width)
    for row in rows[1:]:
        lines.append("| " + " | ".join(row) + " |")
    return "\n".join(lines)


def _style_heading_level(paragraph: Any) -> int | None:
    """Word heading 스타일에서 계층을 읽는다. 없으면 None.

    ★ 이 코퍼스에는 하나도 없다 (22개 파일 전부 Normal / List Paragraph).
    그래도 남겨둔다 — HR 이 앞으로 스타일을 제대로 쓴 문서를 올리면 그게 가장
    강한 신호이고, 그때는 본문 관례 추측보다 우선해야 한다.
    """
    name = (getattr(paragraph.style, "name", "") or "").strip()
    match = re.match(r"^Heading (\d)$", name)
    if match:
        return int(match.group(1))
    if name == "Title":
        return 1
    return None


def _bold_ratio(paragraph: Any) -> float:
    """문단에서 볼드인 run 의 비율. 서식 기반 제목 판별의 입력이다."""
    runs = [r for r in paragraph.runs if r.text.strip()]
    if not runs:
        return 0.0
    return sum(1 for r in runs if r.bold) / len(runs)


def _is_auto_numbered(paragraph: Any) -> bool:
    """Word 자동번호(`numPr`) 여부.

    SOP 문서가 이 경우인데, 화면에는 "1. Mục đích / Purpose:" 로 보이지만
    `paragraph.text` 에는 번호가 없다 — 번호를 Word 가 렌더링 시점에 붙이기
    때문이다. 텍스트만 보면 계층 신호가 통째로 사라진다.
    """
    pr = paragraph._p.pPr
    return pr is not None and pr.numPr is not None


def _push_heading(
    stack: list[tuple[int, str]], heading: headings.Heading
) -> tuple[str, ...]:
    """계층 스택을 갱신하고 새 heading_path 를 낸다.

    ★ 스택은 레벨을 함께 들고 있어야 한다. 텍스트만 쌓고 `del stack[level-1:]` 로
    자르면, 실제 문서처럼 깊이가 건너뛸 때(PART=1 다음에 곧바로 `1.`=3) 레벨과
    인덱스가 어긋나 **형제가 자식으로 중첩된다.** 실측 증상:

        PART II > 1. General Understanding > 2. Principles of Task Performance
                                             ^ 2번은 1번의 하위가 아니라 형제다

    레벨을 들고 있으면 "나보다 깊거나 같은 것을 모두 걷어낸다"로 정확히 처리된다.
    """
    while stack and stack[-1][0] >= heading.level:
        stack.pop()
    stack.append((heading.level, heading.text))
    return tuple(text for _, text in stack)


def load_docx(path: Path) -> ParsedDoc:
    import docx

    document = docx.Document(str(path))

    sections: list[Section] = []
    heading_stack: list[tuple[int, str]] = []
    current = Section(heading_path=())
    pending: list[str] = []
    # `PART I` 처럼 번호만 나온 헤딩. 다음 줄이 제목이면 흡수하려고 붙들어 둔다.
    held: headings.Heading | None = None

    def flush_text() -> None:
        joined = "\n".join(pending).strip()
        pending.clear()
        if joined:
            current.blocks.append(Block("text", joined))

    def open_section(heading: headings.Heading) -> None:
        nonlocal current
        flush_text()
        if current.blocks:
            sections.append(current)
        current = Section(heading_path=_push_heading(heading_stack, heading))

    def release_held() -> None:
        """붙들고 있던 헤딩을 제목 없이 확정한다."""
        nonlocal held
        if held is not None:
            heading, held = held, None
            open_section(heading)

    for item in _iter_block_items(document):
        if hasattr(item, "rows"):  # Table
            release_held()
            flush_text()
            markdown = _table_to_markdown(item)
            if markdown:
                current.blocks.append(Block("table", markdown))
            continue

        style_level = _style_heading_level(item)
        ratio = _bold_ratio(item)
        numbered = _is_auto_numbered(item)

        # ★ 문단 안에 줄바꿈이 있을 수 있다 — 2019 사규의 "PART II\nFORMATION OF
        #   ORGANIZATION" 이 한 문단이다. 줄 단위로 봐야 번호와 제목이 이어진다.
        for line in item.text.splitlines():
            text = line.strip()
            if not text:
                continue

            if held is not None:
                if headings.looks_like_title(text):
                    merged = headings.merge_title(held, text)
                    held = None
                    open_section(merged)
                    continue
                release_held()

            if style_level is not None:
                heading = headings.Heading(style_level, text)
            else:
                heading = headings.detect_formatted(
                    text, bold_ratio=ratio, auto_numbered=numbered
                )

            if heading is not None:
                if heading.wants_title:
                    held = heading
                else:
                    open_section(heading)
                continue

            pending.append(text)

    release_held()
    flush_text()
    if current.blocks:
        sections.append(current)

    # ★ 제목은 파일명으로 둔다. 첫 헤딩("PART I")은 문서 제목이 아니고, 본문 첫 줄은
    #   레터헤드일 때가 있다. 그리고 파일명이 "[Draft]" 나 개정연도 같은 판정 정보를
    #   들고 있어서(전사본 README 의 2018 vs 2025 Draft 문제) 버리면 손해다.
    return ParsedDoc(
        title=path.stem,
        metadata={},
        sections=sections,
        content_hash=hashlib.sha256(path.read_bytes()).hexdigest(),
        source_path=path,
    )


# ── PDF 텍스트본 (B등급) ─────────────────────────────────────────────────


# 머리말·꼬리말 잡음. 조항 사이에 끼면 문단이 끊어진다.
_PAGE_NOISE_RE = re.compile(
    r"^(?:-\s*\d+\s*-|\d+\s*\|\s*Page|Page\s*\d*|\|)$", re.IGNORECASE
)

# 새 문단이 시작되는 표식. 이게 아니면 앞 줄이 줄바꿈으로 갈린 것으로 본다.
_LIST_START_RE = re.compile(
    r"^(?:\d+\.\d*\.?\s|\d+[.)]\s|\(\w{1,3}\)\s|[-–—•*]\s|[①-⑳]|[ⅰ-ⅹ]\s*[.)])"
)


def _is_cjk(ch: str) -> bool:
    return (
        "가" <= ch <= "힣"  # 한글 음절
        or "一" <= ch <= "鿿"  # 한자
        or "぀" <= ch <= "ヿ"  # 가나
    )


def _join_wrapped(prev: str, nxt: str) -> str:
    """PDF 줄바꿈으로 갈린 한 문단을 다시 잇는다.

    영문은 공백을 넣는다. 한국어는 붙인다 — 다만 이건 **깨끗한 규칙이 아니라 선택**이고,
    근거를 남겨둔다:

      · 시행세칙의 줄바꿈에는 단어 중간("해외법" + "인”이라", "처우" + "에")과
        단어 경계("세칙이" + "정하는")가 섞여 있다. 붙이면 앞이 맞고 띄면 뒤가 맞다.
      · 좌표로 갈라보려 했으나 안 된다. 양쪽정렬이라 두 경우 모두 오른쪽 여백이
        0.1pt 로 똑같이 찍힌다 (실측: 줄바꿈 320곳 중 정렬된 이어짐 125곳이 전부
        여백 ≈ 0). 어느 쪽에서 공백이 소비됐는지는 텍스트에도 좌표에도 없다.
      · 대략 반반이라 정답이 없어서, **붙이는 쪽**을 골랐다. 붙여서 틀리면
        "세칙이정하는" 처럼 흔한 단어 둘이 붙을 뿐이지만, 띄어서 틀리면
        "해외법 인" 이 되어 이 코퍼스의 핵심 검색어가 사라지기 때문이다.
        BGE-M3 는 서브워드 토크나이저라 붙은 쪽의 손해가 더 작다.

    더 정확히 하려면 문서 자체에서 어휘집을 만들어(줄바꿈이 아닌 위치의 토큰들)
    `앞꼬리+뒷머리` 가 그 어휘집에 있으면 붙이는 방법이 있다. 검색 품질이 이걸
    요구하면 그때 넣는다.
    """
    if prev and nxt and _is_cjk(prev[-1]) and _is_cjk(nxt[0]):
        return prev + nxt
    return f"{prev} {nxt}"


def _page_lines(path: Path) -> list[list[str]]:
    """페이지별 정제된 줄 목록.

    ★ pypdf 가 아니라 pdfplumber 를 쓴다. 실측에서 pypdf 는 이 코퍼스의 두 PDF 를
    정반대 방식으로 망가뜨렸다:

      · 기본 모드 — 구조가 사라진다. "제 1 장 총 칙제 1조 (목적)본 세칙은…" 처럼
        장·조 제목과 본문이 한 줄에 붙는다.
      · layout 모드 — 구조는 살지만 단어가 깨진다. "compan y", "s ystem",
        "emplo yees" ('y' 글리프 위치가 원본에서 어긋나 있고 scale_weight 로도
        복구되지 않는다).

    pdfplumber 는 문자 좌표로 단어를 묶어 양쪽을 동시에 지킨다.
    """
    import pdfplumber

    pages: list[list[str]] = []
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            text = page.extract_text(x_tolerance=1.5) or ""
            lines = []
            for raw in text.splitlines():
                line = raw.strip()
                if line and not _PAGE_NOISE_RE.match(line):
                    lines.append(line)
            pages.append(lines)
    return pages


def load_pdf_text(path: Path) -> ParsedDoc:
    """텍스트 PDF (설계문서 5.1 B등급). **표 구조는 부분 손실을 감수한다.**

    계층은 `PART I` · `제 1 장` · `제 1조 (목적)` 같은 본문 관례에서 읽는다
    (`headings` 모듈). 관례가 하나도 없는 문서는 예전처럼 페이지를 섹션으로
    쓴다 — 스크린샷 위주 가이드가 그렇고, 그 문서의 citation_scheme 은 조항이
    아니라 `doc_no+page` 가 된다.

    ★ PDF 에서는 서식을 볼 수 없으므로 모호한 번호(`1.`)를 제목으로 올리지 않는다.
    시행세칙에는 조항 제목과 본문 열거항이 둘 다 `1.` 로 시작해서, 잘못 끊으면
    조항 하나가 여러 섹션으로 흩어진다.
    """
    pages = _page_lines(path)

    sections: list[Section] = []
    heading_stack: list[tuple[int, str]] = []
    current = Section(heading_path=())
    paragraphs: list[str] = []
    held: headings.Heading | None = None

    def flush_text() -> None:
        joined = "\n\n".join(p for p in paragraphs if p.strip())
        paragraphs.clear()
        if joined:
            current.blocks.append(Block("text", joined))

    def open_section(heading: headings.Heading) -> None:
        nonlocal current
        flush_text()
        if current.blocks:
            sections.append(current)
        current = Section(heading_path=_push_heading(heading_stack, heading))

    def release_held() -> None:
        nonlocal held
        if held is not None:
            heading, held = held, None
            open_section(heading)

    found_heading = False
    for lines in pages:
        for line in lines:
            if held is not None:
                if headings.looks_like_title(line):
                    merged = headings.merge_title(held, line)
                    held = None
                    open_section(merged)
                    continue
                release_held()

            heading = headings.detect(line)
            if heading is not None:
                found_heading = True
                if heading.wants_title:
                    held = heading
                else:
                    open_section(heading)
                continue

            if paragraphs and not _LIST_START_RE.match(line):
                paragraphs[-1] = _join_wrapped(paragraphs[-1], line)
            else:
                paragraphs.append(line)

    release_held()
    flush_text()
    if current.blocks:
        sections.append(current)

    if not found_heading:
        # 관례가 없는 문서. 페이지를 섹션으로 쓰던 기존 동작으로 되돌린다.
        sections = [
            Section(heading_path=(f"p.{n}",), blocks=[Block("text", "\n".join(lines))])
            for n, lines in enumerate(pages, 1)
            if lines
        ]

    return ParsedDoc(
        title=path.stem,
        metadata={},
        sections=sections,
        content_hash=hashlib.sha256(path.read_bytes()).hexdigest(),
        source_path=path,
    )


# ── 청킹 ────────────────────────────────────────────────────────────────


def _split_text_block(text: str, max_chars: int) -> list[str]:
    """긴 텍스트 블록을 문단 경계에서 자른다. 문단 안은 건드리지 않는다."""
    paragraphs = [p for p in re.split(r"\n\s*\n", text) if p.strip()]
    out: list[str] = []
    buffer = ""
    for para in paragraphs:
        candidate = f"{buffer}\n\n{para}" if buffer else para
        if len(candidate) > max_chars and buffer:
            out.append(buffer)
            buffer = para
        else:
            buffer = candidate
    if buffer:
        out.append(buffer)
    return out or [text]


def chunk_document(doc: ParsedDoc, *, max_chars: int = DEFAULT_MAX_CHARS) -> list[Chunk]:
    """섹션 → 청크. 표는 원자 단위로 남는다.

    각 청크 앞에 heading 경로를 붙인다. 청크 하나만 떼어 봐도 어느 문서 어느
    조항인지 읽히게 하려는 것이고, 임베딩 품질과 인용 정확도 양쪽에 기여한다.
    """
    chunks: list[Chunk] = []
    ordinal = 0

    for section in doc.sections:
        breadcrumb = " > ".join((doc.title,) + section.heading_path)
        pieces: list[str] = []
        buffer = ""
        caption = ""

        def flush() -> None:
            nonlocal buffer
            if buffer.strip():
                pieces.append(buffer.strip())
            buffer = ""

        for block in section.blocks:
            if block.atomic:
                # 표는 그대로 하나의 청크로 (크기 무관).
                # 단 표를 소개하는 직전 문장을 캡션으로 함께 넣는다 — "국내 일비 표"와
                # "해외 일비 표"를 가르는 정보가 대개 그 문장에만 있어서, 떼어놓으면
                # 표가 검색되고도 어느 표인지 알 수 없게 된다.
                flush()
                pieces.append(f"{caption}\n{block.text}" if caption else block.text)
                continue

            for part in _split_text_block(block.text, max_chars):
                candidate = f"{buffer}\n\n{part}" if buffer else part
                if len(candidate) > max_chars and buffer:
                    flush()
                    buffer = part
                else:
                    buffer = candidate

            # 다음 표의 캡션 후보 = 직전 텍스트의 마지막 줄
            tail = [ln.strip() for ln in block.text.splitlines() if ln.strip()]
            caption = tail[-1][:200] if tail else ""
        flush()

        for piece in pieces:
            chunks.append(
                Chunk(
                    ordinal=ordinal,
                    content=f"[{breadcrumb}]\n{piece}",
                    heading_path=section.heading_path,
                )
            )
            ordinal += 1

    return chunks


def load_any(path: Path) -> ParsedDoc:
    """확장자로 로더를 고른다. 포맷 등급 판별은 ingest 가 한다."""
    suffix = path.suffix.lower()
    if suffix == ".md":
        return load_transcript(path)
    if suffix == ".docx":
        return load_docx(path)
    if suffix == ".pdf":
        return load_pdf_text(path)
    raise ValueError(f"지원하지 않는 형식입니다: {path.name}")
