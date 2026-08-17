"""문서 계층 인식 — Word heading 스타일이 아니라 **본문 관례**로 (설계문서 5.1).

설계문서는 "docx 를 받으면 heading 계층을 획득한다"를 전제했다. 실측 코퍼스에서
그 전제가 깨졌다:

    General Regulation and Company Regime_2019.docx
        스타일 분포 = {Normal: 287, List Paragraph: 71, Normal (Web): 28}
        Heading 1~6 / Title = **0개**

22개 파일 전부 같다. 계층은 스타일이 아니라 `PART I`, `I – PURPOSE:`, `제 1조 (목적)`,
`Step 1:` 처럼 **본문 텍스트의 번호 관례**로만 표현돼 있다. 스타일만 보면 문서 하나가
섹션 하나가 되고, 그러면 청킹이 1400자 기계 절단으로 퇴화하며 조항 인용이 불가능해진다.

그래서 계층 판별을 텍스트 관례 기반으로 두고, docx·PDF 양쪽 로더가 공유한다.
같은 문서가 두 포맷으로 존재하기 때문이다 (2019=docx / 2021·2023=PDF).

★ PDF 와 docx 에 **다른 기준**을 적용한다. 근거의 강도가 다르기 때문이다:

  · PDF 는 모호하지 않은 구조 표시만 신뢰한다. `1.` 로 시작하는 줄이 조항 제목인지
    본문 열거항인지 텍스트만으로는 구분이 안 되고, 실제로 시행세칙에는 둘 다 있다
    ("1. 주재원으로서 담당업무를…" 은 열거항이다). 잘못 끊으면 조항 하나가 여러
    섹션으로 흩어져 표·금액 맥락이 끊긴다.

    ★ "짧다 + 종결부호 없다" 로 가를 수 있을 것 같지만 실측에서 안 된다.
      영문 사규(2023)에서는 잘 듣는데, 한국어에서 **PDF 줄바꿈이 문장을 중간에
      자르기 때문에** 열거항의 첫 줄이 그대로 "짧고 종결부호 없는 줄"이 된다:

          "1. 해외법인의 직원이 직무상 이유로 주재국 이외의 제3국 출장을 하고자"
          "   할 경우 관할 법인장 혹은 지사장의 허가를 받아 시행한다."

      앞줄만 보면 제목과 구별할 수 없다. 그래서 이 판단을 포기하고 조를 통째로
      둔다. 영문 사규를 절 단위까지 쪼개고 싶으면 휴리스틱을 정교하게 만들 것이
      아니라 **HR 에게 .docx 원본을 받는 것**이 설계문서 5.1 의 답이다 —
      같은 문서의 2019 docx 는 서식이 있어서 22개 섹션으로 정확히 갈린다.

  · docx 는 여기에 서식을 보조 신호로 더한다. 볼드·자동번호가 있으면 같은 `1.` 도
    제목으로 승격할 수 있다. 사람이 제목으로 보이게 만들어 둔 흔적이기 때문이다.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# 제목 후보의 길이 상한. 이보다 길면 본문 문장으로 본다.
MAX_HEADING_CHARS = 100
# 서식 기반(docx) 승격은 더 짧은 것만 허용한다.
MAX_FORMATTED_HEADING_CHARS = 80

# ★ 볼드 임계값 두 개는 실측에서 나온 값이다. 하나로 합치면 둘 중 하나가 깨진다.
#
#   0.8 — 번호 항목(`1. General Understanding`)의 승격 기준.
#         2019 사규의 진짜 절 제목은 전부 b=4/4·6/6 처럼 완전 볼드인 반면,
#         본문인 `1.1. The name of the Company is "AirQuay VINA"` 는 b=5/9(0.56)다.
#         0.5 로 잡으면 이 본문까지 제목으로 올라간다.
#
#   0.0 초과 — Word 자동번호 항목의 기준. SOP 의 절 제목은 b=1/4·1/5 로 비율이
#         낮은데(Word 가 run 을 잘게 쪼갠다), 같은 문서의 본문 열거항은 b=0/3 으로
#         볼드가 아예 없다. 그래서 "볼드가 하나라도 있는가"가 정확히 가른다.
NUMBERED_BOLD_RATIO = 0.8
AUTO_NUMBERED_BOLD_RATIO = 0.0


@dataclass(frozen=True)
class Heading:
    level: int
    text: str
    # `PART I` 처럼 번호만 있고 제목이 다음 줄에 따로 있는 경우.
    # 호출부가 다음 줄을 흡수해 `PART I — GENERAL PROVISIONS` 로 만든다.
    wants_title: bool = False


# ── 텍스트 관례 (docx · PDF 공통, 모호하지 않은 것만) ──────────────────
#
# 순서가 곧 우선순위다. 위에서 먼저 걸리면 아래는 보지 않는다.
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

    # ★ 문장으로 끝나면 제목이 아니라 본문의 상호참조다. 실측 오탐:
    #   "Article 14,15,16,17 of this Regulation." (2023 사규 본문 중간)
    #   제목은 마침표로 끝나지 않는다 — "제 1조 (목적)", "PART I", "I – PURPOSE:".
    if _SENTENCE_END_RE.search(text):
        return None

    for level, pattern in _TEXT_PATTERNS:
        if pattern.match(text):
            return Heading(level, text, wants_title=bool(_NUMBER_ONLY_RE.match(text)))
    return None


def looks_like_title(line: str) -> bool:
    """`PART I` 다음 줄이 그 편의 제목인가.

    `PART II` / `GENERAL PROVISIONS` 처럼 번호와 제목이 갈려 있는 경우를 잇는다.
    떼어두면 breadcrumb 이 "PART II" 뿐이라 무슨 편인지 알 수 없다.
    """
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
    """`PART V:` + `ANNUAL LEAVE` → `PART V — ANNUAL LEAVE`.

    번호 쪽의 꼬리 구두점을 떼고 잇는다. 안 떼면 "PART V: — ANNUAL LEAVE" 가 된다.
    """
    base = _TRAILING_PUNCT_RE.sub("", heading.text)
    return Heading(heading.level, f"{base} — {_clean(title)}")


def detect_formatted(
    line: str,
    *,
    bold_ratio: float,
    auto_numbered: bool = False,
) -> Heading | None:
    """docx 전용 — 텍스트 관례에 서식을 보조 신호로 더한다.

    `bold_ratio` 는 문단 안에서 볼드인 run 의 비율이다. 문서 작성자가 제목으로
    보이게 만들어 둔 흔적이므로, 텍스트만으로는 모호한 번호를 여기서 승격한다.

    `auto_numbered` 는 Word 자동번호(`numPr`) 여부다. SOP 문서가 이 경우인데,
    번호가 본문에 없어서(`Mục đích / Purpose:`) 텍스트 관례로는 잡을 길이 없다.
    """
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
    # 번호가 본문에 없는 자동번호 항목. 콜론으로 끝나는 것만 — SOP 의
    # "Lưu hồ sơ / Record storage:" 같은 절 제목이 전부 이 형태다.
    if auto_numbered and bold_ratio > AUTO_NUMBERED_BOLD_RATIO and text.endswith(":"):
        return Heading(2, text)
    return None
