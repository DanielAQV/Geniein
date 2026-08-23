"""사용자 발언의 언어 판정.

프롬프트·도구 결과·근거 문서가 전부 한국어라, 프롬프트에 "질문한 언어로 답한다"
한 줄을 넣어도 모델이 한국어로 답한다 (실측). 그래서 코드가 판정하고 프롬프트에는
결론만 사실로 박는다 (agent/core.py). 문자 기반인 것은 우리가 가리는 다섯 언어가
쓰는 문자가 서로 다르고, 짧은 발언에서 통계 모델이 더 흔들리기 때문이다.
섞인 발언("일비 bao nhiêu ạ?")이 기본이라 글자 수를 세어 우세한 쪽으로 정한다.
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
_VI_WORDS = {
    "không", "khong", "được", "duoc", "là", "la", "bao", "nhiêu", "nhieu",
    "của", "cua", "cho", "với", "voi", "này", "nay", "thì", "thi", "và",
    "em", "anh", "chị", "chi", "ạ", "ngày", "ngay", "tiền", "tien", "công",
    "cong", "ty", "phép", "phep", "lương", "luong", "làm", "lam", "nào", "nao",
}


# 약어·통화코드. 언어 신호가 아니다 — "100 USD?" 를 영어로 읽으면 계정 언어로
# 넘어가야 할 발언이 영어로 확정된다.
_ACRONYM = re.compile(r"\b[A-Z]{2,5}\b")

# 한글·가나·한자는 라틴 글자보다 무겁게 센다. 1:1 로 세면 한글 두 자가 영어 한
# 낱말에 밀려서 한국어 질문이 영어로 판정된다 (실측).
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
    """발언의 언어. 가릴 수 없으면 `None` — 호출부가 계정 언어로 넘어간다."""
    if not text or not text.strip():
        return None

    counts = _script_counts(text)
    total = sum(counts.values())
    if total == 0:
        # 숫자·기호뿐. 언어를 주장할 근거가 없다.
        return None

    # 조금 섞인 게 아니라 우세해야 그 언어로 본다. 베트남어 발언에 한국어 용어가
    # 섞이는 쪽이 훨씬 흔하므로, 가중치를 줘도 그 발언은 베트남어로 남아야 한다.
    latin = counts["latin"]
    if counts["kana"] > 0 and (counts["kana"] + counts["han"]) * _CJK_WEIGHT >= latin:
        return "ja"
    if counts["hangul"] > 0 and counts["hangul"] * _CJK_WEIGHT >= latin:
        return "ko"
    # 한자만 쓰는 발언. 한글 분기 안에 묶으면 한글이 0 인 중국어가 삼켜진다.
    if counts["han"] > 0 and counts["hangul"] == 0 and counts["han"] * _CJK_WEIGHT >= latin:
        return "zh"

    lowered = text.lower()
    if any(ch in _VI_CHARS for ch in lowered):
        return "vi"
    words = set(re.findall(r"[a-zà-ỹ]+", lowered))
    if words & _VI_WORDS:
        return "vi"
    return "en"
