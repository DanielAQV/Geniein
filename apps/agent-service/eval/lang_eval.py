"""언어 판정 회귀 검사 — `src/agent/language.py` 의 근거."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

# 패키지로 import 하지 않는다. `src/agent/__init__.py` 가 색인 의존성까지 끌어온다.
_PATH = Path(__file__).resolve().parents[1] / "src" / "agent" / "language.py"
_spec = importlib.util.spec_from_file_location("language", _PATH)
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
detect = _module.detect

#: (발언, 기대 판정). `None` 은 "가릴 수 없음" — 호출부가 계정 언어로 넘어간다.
CASES: list[tuple[str, str | None]] = [
    # ── 한국어
    ("해외 출장 일비 얼마예요?", "ko"),
    ("야근하면 식대 나와요?", "ko"),
    ("일비?", "ko"),  # 두 글자여도 한국어다. 라틴이면 근거가 부족한 길이
    ("OT 규정?", "ko"),  # 약어는 언어 신호가 아니다
    ("연차 15 days?", "ko"),  # 한국어에 영어 낱말이 섞이는 쪽이 흔하다
    # ── 베트남어
    ("Công tác nước ngoài thì tiền phụ cấp một ngày là bao nhiêu ạ?", "vi"),
    ("Cong tac nuoc ngoai thi tien phu cap mot ngay la bao nhieu a?", "vi"),  # 성조 없이
    ("일비 bao nhiêu ạ?", "vi"),  # 한국어 용어를 그대로 쓴다. 그래도 베트남어다
    ("Tôi muốn hỏi về 연차", "vi"),
    ("Phụ cấp OT là bao nhiêu?", "vi"),
    # ── 영어
    ("How much is the daily allowance?", "en"),
    ("overtime meal allowance policy", "en"),
    ("Can I carry over unused annual leave?", "en"),
    ("What is the OT rate?", "en"),
    # ── 가릴 수 없음 → 계정 언어로 넘어가야 하는 것들
    ("100 USD?", None),  # 통화코드를 영어로 읽으면 안 된다
    ("150?", None),
    ("???", None),
    ("", None),
    # ── 나머지
    ("残業手当はありますか", "ja"),
    ("出差补贴标准是多少", "zh"),
]


def main() -> int:
    failed = 0
    for text, want in CASES:
        got = detect(text)
        ok = got == want
        failed += not ok
        mark = "ok  " if ok else "FAIL"
        print(f"{mark} {str(got):5} (기대 {str(want):5}) {text[:52]!r}")

    print(f"\n{len(CASES) - failed}/{len(CASES)} 통과")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

# 여기까지는 판정만 본다. 모델이 실제로 그 언어로 답하는지는 배포 뒤 탭에서 확인한다.
