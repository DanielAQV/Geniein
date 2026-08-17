"""언어 판정 회귀 검사 — `src/agent/language.py` 의 근거.

    cd apps/agent-service && python eval/lang_eval.py

API 를 부르지 않는다. 판정은 순수 함수라서 비용 없이 어디서나 돌고, 그래서 배포
전에 습관적으로 돌릴 수 있다. 모델 응답 언어까지 보는 검사는 별개다 (맨 아래 주석).

## 왜 이 표가 저장소에 있는가

계정 언어를 영어로 둔 직원이 베트남어로 물었더니 **한국어로** 답한 사건에서 나왔다.
원인이 둘이었고 둘 다 이 표와 관계된다:

  ① 프롬프트·도구 결과·근거 문서가 전부 한국어여서, "질문한 언어로 답한다" 한 줄이
     그 무게에 밀린다. → 코드가 언어를 확정하고 프롬프트에는 사실만 남긴다
  ② 조건문("알기 어려울 때만")은 모델이 판단을 미루고, 그 판단이 편향에 먹힌다
     → `None` 판정과 계정 언어 폴백을 **코드가** 결정한다

★ 각 줄이 실제로 온 발언 유형이다. 지어낸 문장을 넣지 말 것 — 표가 커지는 대신
  덜 정확해진다. 새 사건이 생기면 그 발언을 그대로 한 줄 추가한다.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

# ★ 패키지로 import 하지 않는다. `src/agent/__init__.py` 가 core → registry → yaml 을
#   끌어와서, 판정만 보려는데 색인 의존성이 없으면 못 돌게 된다.
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

# ── 여기까지는 판정만 본다 ─────────────────────────────────────────────────
#
# 모델이 실제로 그 언어로 답하는지는 별개의 검사이고, API 를 부르므로 여기 섞지
# 않았다. 배포 뒤 탭에서 직접 확인하는 편이 빠르다:
#
#   1. Teams 앱 언어를 한국어로 두고 베트남어로 묻는다 → 베트남어로 답해야 한다
#   2. "100 USD?" 만 보낸다 → 계정 언어(xms_pl)로 답해야 한다. 없으면 Teams locale
#   3. NestJS 로그의 `lang=` 로 계정 언어가 실제로 실려 오는지 함께 본다
#      (apps/api/src/agent/agent.service.ts)
