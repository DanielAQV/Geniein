"""회사 어휘 사전 — 질의 확장 (설계문서 5.1 검색의 재현율 쪽).

코퍼스는 영어·베트남어인데 질문은 한국어로 온다. '일비' 는 문서 어디에도 없고
문서에는 'daily allowance' 라고 적혀 있다. 지금 그 다리를 놓는 것은 **벡터 갈래
하나뿐**이고, 어휘·트라이그램 갈래는 그런 질의에서 0건이다. 벡터가 흔들리는 날
검색 전체가 같이 흔들린다는 뜻이다. 사전은 그 두 갈래에 문서 표기를 넣어준다.

★ **확장어는 어휘(BM25) 갈래에만 넣는다.**
  · 벡터: 원 질의를 그대로 임베딩한다. 교차언어는 원래 이 갈래의 일이고, 검색어를
    덧붙이면 문장 뜻이 오히려 흐려진다.
  · 트라이그램: 사용자가 쓴 단어만 쓴다. 이 갈래는 'simple' 사전이 조사를 못 떼는
    한국어를 메우려고 있는 것인데, 확장어는 이미 문서 표기 그대로라 어휘 갈래가
    정확히 잡는다. 게다가 트라이그램은 질의어 유사도를 **합산**하므로 'per' 같은
    짧은 낱말 하나가 수십 개 청크를 동시에 밀어 올린다.

★ **여러 낱말로 된 표기는 구(句)로 넣는다** — 'OT payment request' 는 tsquery 의
  인접 연산자로 `ot<->payment<->request` 가 된다. 낱말로 쪼개 OR 로 넣으면
  'plan'·'request'·'payment' 같은 흔한 단어가 홀로 검색어가 되어 수백 청크를
  똑같이 긁고, 그러면 어휘 갈래의 순위가 평평해진다. 붙어 있는 표기를 찾는 것이
  애초에 이 사전의 목적이다.

★ 활용형은 **표기마다 따로 적는다** (approval / approve / approved). 색인이
  'simple' 사전이라 어간을 자르지 않아서, 셋은 서로 다른 토큰이다.

★ 사전은 **재현율을 넓히는 장치이지 필터가 아니다.** 확장어가 늘어도 유효본·역할·
  org_id 필터는 갈래마다 그대로 걸린다. 이 파일이 인가 경계를 건드릴 수 있는
  경로는 없다.

★ `kb/` 아래 두지 않는다. 여기에는 DB·파서 의존이 전혀 없는데(설정 한 장을 읽어
  문자열을 늘릴 뿐이다), `kb` 패키지를 임포트하면 `psycopg` 와 `pdfplumber` 가
  따라온다. 기동 시 사전을 검사하려면 그 무게를 지면 안 된다.

★ 틀린 확장은 조용히 비싸다. 엉뚱한 조항이 근거로 올라오고, 모델은 그걸 성실하게
  인용한다. 그래서 뜻을 모르는 약어는 사전에 적지 않는다 (glossary.yaml 주석).
"""

from __future__ import annotations

import logging
import re
from functools import lru_cache
from pathlib import Path

import yaml

logger = logging.getLogger(__name__)

#: 질의 하나에 덧붙일 수 있는 최대 단어 수. 사전이 커져도 한 질의가 검색어 수십 개로
#: 부풀지 않게 한다 — tsquery 가 길어지면 어휘 갈래의 순위가 평평해진다.
MAX_EXPANSION_TERMS = 16

#: 홑낱말 표기 중 확장어로 넣지 않을 것. 문서 어디에나 있어서 순위를 평평하게 만든다.
#: 여러 낱말 표기는 구로 묶이므로 이 목록과 무관하다 ('per diem' → `per<->diem`).
#: 사용자가 **직접 친** 단어도 이 목록과 무관하게 그대로 쓴다 (search.py).
_NOISE = {"the", "of", "for", "and", "in", "on", "to", "a", "an"}

#: 라틴 문자로만 된 표기는 단어 경계로 찾는다 — 'OT' 가 'NOTE' 안에서 걸리면 안 된다.
#: 한국어·베트남어는 조사와 성조 부호가 붙으므로 부분 문자열로 찾는다.
_LATIN = re.compile(r"^[a-z0-9][a-z0-9 ./-]*$")

_WORD = re.compile(r"\w+", re.UNICODE)


def _tokens(text: str) -> list[str]:
    """`search._terms` 와 같은 규칙. tsquery 연산자가 섞여 들어갈 수 없다."""
    return _WORD.findall(text)


@lru_cache(maxsize=4)
def load_groups(path: str) -> tuple[tuple[str, ...], ...]:
    """동의어 묶음을 읽는다. 파일이 없으면 빈 사전으로 조용히 돈다.

    ★ 없는 것이 오류는 아니다. 사전은 검색 품질 장치라 없으면 예전 동작(벡터 갈래가
      혼자 다리를 놓는 상태)으로 돌아갈 뿐이고, 그것 때문에 뇌가 안 뜨면 안 된다.
      반대로 **형식이 깨진 줄은 버리고 경고**한다 — 조용히 무시하면 사전을 고쳤는데
      아무 일도 일어나지 않는 상황이 된다.
    """
    file = Path(path)
    if not file.exists():
        logger.info("어휘 사전이 없습니다 (%s). 질의 확장 없이 검색합니다.", path)
        return ()

    data = yaml.safe_load(file.read_text(encoding="utf-8")) or {}
    groups: list[tuple[str, ...]] = []
    for raw in data.get("groups") or []:
        if not isinstance(raw, list):
            logger.warning("어휘 사전의 줄이 목록이 아닙니다: %r", raw)
            continue
        words = tuple(str(w).strip() for w in raw if str(w).strip())
        if len(words) < 2:
            logger.warning("동의어가 둘 미만인 줄은 쓸모가 없습니다: %r", raw)
            continue
        groups.append(words)

    logger.info("어휘 사전 %d묶음 로드 (%s)", len(groups), path)
    return tuple(groups)


def _hits(query_lower: str, word: str) -> bool:
    w = word.lower()
    if _LATIN.match(w):
        return re.search(rf"\b{re.escape(w)}\b", query_lower) is not None
    return w in query_lower


def expand(query: str, *, path: str) -> list[str]:
    """질의에 나온 회사 어휘를 **문서 표기**로 넓혀 추가 검색어를 만든다.

    돌려주는 것은 tsquery 에 그대로 실을 수 있는 항목들이다. 홑낱말은 그대로,
    여러 낱말은 인접 연산자로 묶은 구다 ('daily allowance' → `daily<->allowance`).
    항목은 전부 `_tokens()` 가 뽑은 낱말로만 조립되므로 tsquery 연산자가 섞여 들어갈 수 없다.

    이미 질의에 있는 표기는 뺀다 — 같은 것을 두 번 넣어도 얻는 게 없다.
    """
    groups = load_groups(path)
    if not groups:
        return []

    lowered = query.lower()
    query_words = {t.lower() for t in _tokens(query)}

    extra: list[str] = []
    seen: set[str] = set()
    for words in groups:
        if not any(_hits(lowered, w) for w in words):
            continue
        for word in words:
            tokens = _tokens(word)
            if not tokens:
                continue
            if len(tokens) == 1:
                low = tokens[0].lower()
                if low in query_words or low in _NOISE:
                    continue
                atom = tokens[0]
            else:
                # 구는 질의에 그대로 들어 있을 때만 건너뛴다. 낱말이 흩어져 있는
                # 것과 붙어 있는 것은 다른 신호다.
                if " ".join(t.lower() for t in tokens) in lowered:
                    continue
                atom = "<->".join(tokens)
            if atom.lower() in seen:
                continue
            seen.add(atom.lower())
            extra.append(atom)

    if len(extra) > MAX_EXPANSION_TERMS:
        logger.info("확장어가 %d개라 %d개로 자릅니다", len(extra), MAX_EXPANSION_TERMS)
        extra = extra[:MAX_EXPANSION_TERMS]
    return extra
