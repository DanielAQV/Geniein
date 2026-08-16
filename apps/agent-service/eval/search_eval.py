"""검색 구성 평가 — 가중치를 감이 아니라 측정으로 정하기 위한 하네스.

`src/kb/search.py` 의 갈래 가중치 기본값이 왜 그 값인지에 대한 근거이고,
**코퍼스가 커지면 다시 돌려서 다시 정하라고** 저장소에 둔다.

    cd apps/agent-service && python eval/search_eval.py

질의 세 묶음을 따로 재는 것이 중요하다. 한 묶음만 보면 결론이 뒤집힌다 —
자연어만 보면 벡터 단독이 압도적이지만, 그것만 보고 정하면 희귀토큰 조회가
얼마나 나쁜지 모른 채 넘어간다.

평가 방식: 질의마다 '정답 청크'를 breadcrumb 부분문자열로 정의하고, 상위 K건
안에서 몇 번째로 나오는지 본다. MRR 과 미검출 건수를 함께 낸다.

★ 미검출(회수 실패)이 MRR 보다 중요하다. 도구가 상위 K건을 통째로 모델에
  넘기므로, 8건 안에 들어오기만 하면 그 안에서 1위인지 3위인지는 답변 품질에
  거의 영향이 없다. 반대로 8건 밖으로 밀리면 모델은 그 근거를 아예 못 본다.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.kb import search as S  # noqa: E402

TOP_K = 8
ROLES = ["requester"]

# (질의, 정답 breadcrumb 에 반드시 들어있어야 할 문자열)
QUERY_SETS: dict[str, list[tuple[str, str]]] = {
    # 실제 사용자가 던지는 형태. tools/search_knowledge.yaml 의 예시와 같은 결.
    "자연어": [
        ("출장 일비 얼마야?", "Business Trip Allowance"),
        ("해외 출장 숙박비 한도 얼마까지야?", "Business Trip Allowance"),
        ("야근하면 식대 나와요?", "Meal Allowance"),
        ("다기능 수당 받으려면 조건이 뭐야?", "Multi-task"),
        ("근태수당 깎이는 경우 알려줘", "Attendance"),
        ("주재원 자녀 학비 보조 얼마야?", "제 20조"),
        ("주재원 선발 TOEIC 기준 점수", "제 9조"),
        ("공용 식사비 한도", "제 27조"),
        ("연차 신청 절차 알려줘", "Requester_Guide"),
        ("단신부임이 원칙이야?", "제 17조"),
    ],
    # 설계문서가 BM25 의 존재 이유로 든 유형 — 철자가 정확히 맞아야 하는 것.
    "희귀토큰": [
        ("QĐTCAC", "Meal Allowance"),
        ("06/2025/QĐTCAC", "Meal Allowance"),
        ("0107718442", "General Regulation"),
        ("45/2019/QH14", "General Regulation"),
        ("TOEIC Speaking", "제 9조"),
        ("QĐTC/CC-KL", "Attendance"),
    ],
    # 이 코퍼스에서 가장 위험한 유형. 틀린 금액이 나가면 직원이 그걸 믿고 신청한다.
    "금액": [
        ("40,000 VND", "Meal Allowance"),
        ("250,000 VND 일비", "Business Trip Allowance"),
        ("1,000,000 VND 수당", "Multi-task"),
        ("500,000 VND 근태", "Attendance"),
        ("150 USD 숙박", "Business Trip Allowance"),
        ("300,000 VND General Director", "Business Trip Allowance"),
    ],
}

# ★ 가중치는 **반드시 float** 로 쓴다. int 로 주면 SQL 에서 `1 / (60 + rank)` 이
#   정수 나눗셈이 되어 모든 점수가 0 이 된다. search.py 가 ::float8 로 막아두긴
#   했지만, 여기서도 습관을 남긴다.
CONFIGS: list[tuple[str, float, float, float]] = [
    ("벡터 단독", 1.0, 0.0, 0.0),
    ("어휘 단독", 0.0, 1.0, 0.0),
    ("트그램 단독", 0.0, 0.0, 1.0),
    ("1:0.05:0.05", 1.0, 0.05, 0.05),
    ("1:0.20:0.20", 1.0, 0.20, 0.20),
    ("1:1:1", 1.0, 1.0, 1.0),
]


def _ranks(cases: list[tuple[str, str]]) -> list[int | None]:
    out: list[int | None] = []
    for query, needle in cases:
        found = None
        for position, hit in enumerate(S.search(query, roles=ROLES, limit=TOP_K), 1):
            breadcrumb = hit.content.split("]")[0]
            if needle in breadcrumb:
                found = position
                break
        out.append(found)
    return out


def main() -> int:
    logging.disable(logging.INFO)
    names = list(QUERY_SETS)

    header = " | ".join(f"{n:<13}" for n in names)
    print(f"{'구성':<13} | {header} | {'미검출':>6}")
    print("-" * (18 + 16 * len(names)))

    for label, w_vec, w_lex, w_trg in CONFIGS:
        S.WEIGHT_VECTOR, S.WEIGHT_LEXICAL, S.WEIGHT_TRIGRAM = w_vec, w_lex, w_trg
        cells, misses, mrrs = [], 0, []
        for name in names:
            ranks = _ranks(QUERY_SETS[name])
            mrr = sum(1.0 / r for r in ranks if r) / len(ranks)
            mrrs.append(mrr)
            misses += sum(1 for r in ranks if r is None)
            cells.append(f"{mrr:6.3f}       ")
        macro = sum(mrrs) / len(mrrs)
        print(f"{label:<13} | {' | '.join(cells)} | {misses:>6}   (평균 {macro:.3f})")

    print()
    print("미검출 = 상위 %d건 안에 정답이 아예 없던 질의 수. 이 값이 0 인지가 먼저다." % TOP_K)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
