"""문서 계층 인식 — Word heading 스타일이 아니라 **본문 관례**로 (설계문서 5.1)."""

from __future__ import annotations

import re
from dataclasses import dataclass

# 제목 후보의 길이 상한. 이보다 길면 본문 문장으로 본다.
MAX_HEADING_CHARS = 100
# 서식 기반(docx) 승격은 더 짧은 것만 허용한다.
MAX_FORMATTED_HEADING_CHARS = 80

NUMBERED_BOLD_RATIO = 0.8
AUTO_NUMBERED_BOLD_RATIO = 0.0


@dataclass(frozen=True)
class Heading:
    level: int
    text: str
    # `PART I` 처럼 번호만 있고 제목이 다음 줄에 따로 있는 경우.
    wants_title: bool = False


_TEXT_PATTERNS: list[tuple[int, re.Pattern[str]]] = [
    # L1 — 편/장
    (1, re.compile(r"^PART\s+[IVXLCDM]+\b", re.IGNORECASE)),
    (1, re.compile(r"^CHAPTER\s+(\d+|[IVXLCDM]+)\b", re.IGNORECASE)),
    (1, re.compile(r"^제\s*\d+\s*장(?![가-힣])")),
    # L2 — 조/절
    (2, re.compile(r"^제\s*\d+\s*조(?![가-힣])")),
    (2, re.compile(r"^ARTICLE\s+\d+\b", re.IGNORECASE)),
    # "I – PURPOSE:" / "III — SCOPE OF APPLICATION:"
    (2, re.compile(r"^[IVXLCDM]+\s*[–—-]\s*\S.*:\s*$")),
    # "Step 1: Access the Form" — 가이드 문서의 계층 전부가 이 형태다
    (2, re.compile(r"^STEP\s+\d+\s*[:.]", re.IGNORECASE)),
]

# 번호만 있고 제목이 따로 오는 형태 (`PART I`, `CHAPTER 2`)
_NUMBER_ONLY_RE = re.compile(
    r"^(PART\s+[IVXLCDM]+|CHAPTER\s+(?:\d+|[IVXLCDM]+))[\s.:—–-]*$", re.IGNORECASE
)

# docx 서식 승격용 번호 관례
_NUMBERED_L3_RE = re.compile(r"^\d+\.\s*\S")           # "1. General Understanding"
_NUMBERED_L4_RE = re.compile(r"^\d+\.\d+\.?\s*\S")     # "1.1. The name of the Company"

# 본문 문장으로 끝나면 제목이 아니다 (한국어 종결형 포함)
_SENTENCE_END_RE = re.compile(r"(?:[.;]|다\.|한다\.|된다\.)\s*$")


def _clean(line: str) -> str:
    return re.sub(r"\s+", " ", line).strip()


def detect(line: str) -> Heading | None:
    """텍스트 관례만으로 계층을 판별한다. PDF·docx 공통이고 보수적이다."""
    text = _clean(line)
    if not text or len(text) > MAX_HEADING_CHARS:
        return None

    # 문장으로 끝나면 제목이 아니라 본문의 상호참조다.
    if _SENTENCE_END_RE.search(text):
        return None

    for level, pattern in _TEXT_PATTERNS:
        if pattern.match(text):
            return Heading(level, text, wants_title=bool(_NUMBER_ONLY_RE.match(text)))
    return None


def looks_like_title(line: str) -> bool:
    """`PART I` 다음 줄이 그 편의 제목인가."""
    text = _clean(line)
    if not text or len(text) > 60 or _SENTENCE_END_RE.search(text):
        return False
    if detect(text):  # 다음 줄이 그 자체로 헤딩이면 흡수하지 않는다
        return False
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return False
    # 전부 대문자이거나(영문 제목 관례) 한글 제목이면 통과
    return all(c.isupper() for c in letters) or any("가" <= c <= "힣" for c in text)


_TRAILING_PUNCT_RE = re.compile(r"[\s.:;,—–-]+$")


def merge_title(heading: Heading, title: str) -> Heading:
    """`PART V:` + `ANNUAL LEAVE` → `PART V — ANNUAL LEAVE`."""
    base = _TRAILING_PUNCT_RE.sub("", heading.text)
    return Heading(heading.level, f"{base} — {_clean(title)}")


def detect_formatted(
    line: str,
    *,
    bold_ratio: float,
    auto_numbered: bool = False,
) -> Heading | None:
    """docx 전용 — 텍스트 관례에 서식을 보조 신호로 더한다."""
    heading = detect(line)
    if heading:
        return heading

    text = _clean(line)
    if not text or len(text) > MAX_FORMATTED_HEADING_CHARS:
        return None
    if _SENTENCE_END_RE.search(text):
        return None

    if bold_ratio >= NUMBERED_BOLD_RATIO:
        if _NUMBERED_L4_RE.match(text):
            return Heading(4, text)
        if _NUMBERED_L3_RE.match(text):
            return Heading(3, text)
    # 번호가 본문에 없는 자동번호 항목. 콜론으로 끝나는 것만.
    if auto_numbered and bold_ratio > AUTO_NUMBERED_BOLD_RATIO and text.endswith(":"):
        return Heading(2, text)
    return None
