"""회사 어휘 사전 회귀 검사 — `src/glossary.py` + `glossary.yaml` 의 근거.

    cd apps/agent-service && python eval/glossary_eval.py

API 도 DB 도 부르지 않는다. 확장은 순수 함수라서 비용 없이 돌고, 그래서 사전을
고칠 때마다 습관적으로 돌릴 수 있다. **검색 품질 자체**를 보는 것은 별개다
(eval/search_eval.py — 그쪽은 색인된 DB 가 필요하다).

★ 지어낸 질의를 넣지 말 것. 각 줄은 실제로 온 발언이거나 탭의 예시 질문이다.
  사전에 새 묶음을 추가할 때, 그 묶음을 쓰게 만든 발언을 한 줄 같이 추가한다.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("glossary", _ROOT / "src" / "glossary.py")
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
expand = _module.expand

GLOSSARY = str(_ROOT / "glossary.yaml")

#: (발언, 반드시 확장어로 나와야 하는 것들)
CASES: list[tuple[str, set[str]]] = [
    # ── 한국어로 묻고 영어·베트남어 문서를 찾아야 하는 경우. 사전이 있는 이유다.
    ("일비 얼마예요?", {"daily", "allowance", "phụ", "cấp"}),
    ("야근하면 식대 나와요?", {"overtime", "meal", "allowance"}),
    ("연차는 언제부터 쓸 수 있나요?", {"annual", "leave", "nghỉ", "phép"}),
    ("해외 출장 숙박비 한도가 얼마인가요?", {"business", "trip", "accommodation", "tiền", "phòng"}),
    # ── 베트남어 질의도 같은 다리를 건넌다 (묶음에 방향이 없다)
    ("Hạn mức tiền phòng khi đi công tác nước ngoài là bao nhiêu?",
     {"숙박비", "accommodation", "출장", "business"}),
    # ── 약어는 단어 경계로만 걸린다
    ("OT 규정?", {"overtime", "야근"}),
]

#: 확장이 **일어나면 안 되는** 발언. 잘못된 확장은 엉뚱한 조항을 근거로 끌어올린다.
NEGATIVE: list[str] = [
    "NOTE 에 뭐라고 적어야 하나요?",   # 'OT' 가 NOTE 안에서 걸리면 안 된다
    "출력물 보관 기간이 어떻게 되나요?",  # 사전에 없는 주제는 조용히 지나가야 한다
]


def main() -> int:
    failures = 0

    for query, expected in CASES:
        got = {t.lower() for t in expand(query, path=GLOSSARY)}
        missing = {e.lower() for e in expected} - got
        mark = "OK " if not missing else "FAIL"
        if missing:
            failures += 1
        print(f"{mark} {query[:44]:<46} → {sorted(got)}")
        if missing:
            print(f"     빠진 확장어: {sorted(missing)}")

    for query in NEGATIVE:
        got = expand(query, path=GLOSSARY)
        mark = "OK " if not got else "FAIL"
        if got:
            failures += 1
        print(f"{mark} {query[:44]:<46} → {got} (확장 없어야 함)")

    print(f"\n{len(CASES) + len(NEGATIVE)}건 중 {failures}건 실패")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
