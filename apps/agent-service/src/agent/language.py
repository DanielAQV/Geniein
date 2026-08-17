"""사용자 발언의 언어 판정.

## 왜 서버가 판정하는가

프롬프트·도구 결과·근거 문서가 **전부 한국어**다. 그 안에 "질문한 언어로 답한다"
한 줄을 넣어도 모델이 한국어로 답하는 일이 실측으로 확인됐다 (계정 언어를 영어로
둔 직원이 베트남어로 물었는데 한국어로 답한 사건). 조건문으로 쓰면 더 나쁘다 —
"질문만으로 언어를 알기 어려울 때만" 같은 문장은 모델에게 판단을 미루는데, 그
판단이 한국어 편향에 먹힌다.

    구성                                        베트남어 질문 → 답변 언어
    "질문한 언어로 답한다" (조건문)              한국어 2/2      ← 사건 재현
    "이번 답변은 베트남어로 씁니다" (사실)        베트남어

그래서 판정은 코드가 하고, 프롬프트에는 **결론만** 사실로 박는다 (agent/core.py).

## 왜 문자 기반인가

라이브러리를 붙이지 않는다. 우리가 가리는 언어는 다섯 개뿐이고, 그 다섯은 **쓰는
문자가 서로 다르다** — 통계 모델이 필요한 문제가 아니다. 짧은 발언("일비 얼마?")에서
오히려 문자 판정이 더 안정적이다. langdetect 계열은 짧은 입력에서 흔들린다.

★ 섞인 발언이 기본이다. 베트남 직원이 한국어 용어를 그대로 쓴다:
      "일비 bao nhiêu ạ?"
  첫 글자로 정하면 한국어가 된다. 그래서 **글자 수를 세어 우세한 쪽**으로 정한다.
"""

from __future__ import annotations

import re
import unicodedata

#: 판정 결과. `None` 은 "알 수 없음"이고, 호출부가 계정 언어로 넘어간다.
Lang = str

# 베트남어 전용 글자. 라틴 문자를 쓰는 두 언어(vi/en)를 가르는 근거다.
# 성조 부호가 붙은 모음과 đ/ơ/ư 계열은 영어에 나오지 않는다.
_VI_CHARS = set("ăâđêôơưÁÀẢÃẠáàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ")

# 성조 부호 없이 쓰는 베트남어도 있다 (키보드 설정 탓에 흔하다). 그때는 기능어로 잡는다.
# 영어 문장에 우연히 섞일 수 없는 것들만 골랐다.
_VI_WORDS = {
    "không", "khong", "được", "duoc", "là", "la", "bao", "nhiêu", "nhieu",
    "của", "cua", "cho", "với", "voi", "này", "nay", "thì", "thi", "và",
    "em", "anh", "chị", "chi", "ạ", "ngày", "ngay", "tiền", "tien", "công",
    "cong", "ty", "phép", "phep", "lương", "luong", "làm", "lam", "nào", "nao",
}


# 약어·통화코드. 언어 신호가 아니다 — "100 USD?" 를 영어로 읽으면 계정 언어로
# 넘어가야 할 발언이 영어로 확정된다. 우리 대화에 실제로 나오는 것들이 다 여기 걸린다:
# USD, VND, KRW, OT, HR, KPI, PC, IT.
#
# ⚠ 대문자만으로 쓴 영어 문장은 이 규칙에 전부 지워져 `None` 이 된다. 그때는 계정
#   언어로 넘어가므로 최악은 아니고, 실제로 오는 발언도 아니다.
_ACRONYM = re.compile(r"\b[A-Z]{2,5}\b")

# 한글·가나·한자는 라틴 글자보다 무겁게 센다.
#
# ★ 한국어 문장에 영어 낱말이 섞이는 일은 흔하지만("연차 15 days?"), 그 반대는
#   드물다. 글자를 1:1 로 세면 한글 두 자가 영어 한 낱말에 밀려서, 한국어 질문이
#   영어로 판정된다. 실측으로 이 값이 필요했다.
_CJK_WEIGHT = 2


def _script_counts(text: str) -> dict[str, int]:
    """글자를 문자 체계별로 센다. 숫자·기호·공백은 세지 않는다 — 어느 언어에나 있다."""
    counts = {"hangul": 0, "kana": 0, "han": 0, "latin": 0}
    for ch in _ACRONYM.sub(" ", text):
        if not ch.isalpha():
            continue
        try:
            name = unicodedata.name(ch)
        except ValueError:  # 이름 없는 코드포인트
            continue
        if "HANGUL" in name:
            counts["hangul"] += 1
        elif "HIRAGANA" in name or "KATAKANA" in name:
            counts["kana"] += 1
        elif "CJK" in name:
            counts["han"] += 1
        elif "LATIN" in name:
            counts["latin"] += 1
    return counts


def detect(text: str) -> Lang | None:
    """발언의 언어. 가릴 수 없으면 `None`.

    `None` 을 돌려주는 경우가 실제로 있다 — "100 USD?", "150?", 이모지만 있는 발언.
    그때 아무 언어나 고르는 대신 호출부가 계정 언어로 넘어가야 한다.
    """
    if not text or not text.strip():
        return None

    counts = _script_counts(text)
    total = sum(counts.values())
    if total == 0:
        # 숫자·기호뿐. 언어를 주장할 근거가 없다.
        return None

    # 한글·가나가 조금이라도 섞인 게 아니라 **우세해야** 그 언어로 본다 (가중치 적용).
    # 베트남어 발언에 한국어 용어 하나가 섞이는 쪽("일비 bao nhiêu ạ?")이 그 반대보다
    # 훨씬 흔하므로, 가중치를 줘도 그 발언은 베트남어로 남아야 한다.
    latin = counts["latin"]
    if counts["kana"] > 0 and (counts["kana"] + counts["han"]) * _CJK_WEIGHT >= latin:
        return "ja"
    if counts["hangul"] > 0 and counts["hangul"] * _CJK_WEIGHT >= latin:
        return "ko"
    # 한자만 쓰는 발언. ★ 한글 분기보다 뒤에 두되 **독립 조건**이어야 한다 —
    #   `hangul >= latin` 안에 묶으면 한글이 0 인 중국어가 그 분기에 삼켜진다.
    if counts["han"] > 0 and counts["hangul"] == 0 and counts["han"] * _CJK_WEIGHT >= latin:
        return "zh"

    # 여기부터 라틴 우세 — vi 와 en 을 가른다.
    lowered = text.lower()
    if any(ch in _VI_CHARS for ch in lowered):
        return "vi"
    words = set(re.findall(r"[a-zà-ỹ]+", lowered))
    if words & _VI_WORDS:
        return "vi"
    return "en"
