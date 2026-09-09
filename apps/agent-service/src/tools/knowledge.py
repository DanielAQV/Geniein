"""`search_knowledge` 핸들러 — 유나의 첫 도구 (설계문서 3.2.3).

도구 함수의 반환값은 **모델이 읽는 텍스트**다. 그래서 검색 결과를 그냥 이어
붙이지 않고, 답변에 필요한 메타데이터(개정일·인용체계·전사 여부)를 근거마다
붙여 내보낸다. `personas/default.yaml` 의 `behavior.citation` 이 "조항과 개정일을
밝혀라" 라고 요구하는데, 그 정보가 컨텍스트에 없으면 지킬 수가 없다.

★ 내보내는 단위는 검색된 청크가 아니라 **그 청크가 속한 섹션 전문**이다
(`kb/context.py`). 청크는 "이 조항에 답이 있다"는 신호일 뿐이고, 답변은 조항
전체를 봐야 표와 단서 조항이 함께 딸려 온다.

신원(`roles`)은 서버가 주입한다. 도구 스키마에 없으므로 모델은 이 값을 지정할
수 없다 (원칙③ — 인가 경계이지 인자 개수 문제가 아니다).
"""

from __future__ import annotations

import logging
from typing import Any

# 서브모듈에서 직접 가져온다 — 패키지 재노출을 거치면 함수가 동명의 모듈을 가린다 (kb/__init__.py)
from ..kb import context
from ..kb.context import Evidence
from ..kb.search import search as search_kb

logger = logging.getLogger(__name__)

# 검색은 청크 단위로 넓게 훑는다. 상당수가 같은 섹션으로 접히므로 모델이 실제로
# 받는 근거 덩어리 수는 이보다 적다.
MAX_RESULTS = 8


def _format(index: int, item: Evidence) -> str:
    # 제목이 아니라 breadcrumb 을 머리로 쓴다 — "어느 문서의 몇 조" 가 곧 인용 단위다.
    lines = [f"[{index}] {item.breadcrumb}"]

    meta = []
    if item.effective_date:
        meta.append(f"시행일 {item.effective_date.isoformat()}")
    if item.citation_scheme:
        meta.append(f"인용체계 {item.citation_scheme}")
    if item.truncated:
        # 전문이 아니라는 것을 밝힌다. 안 밝히면 모델이 "규정에 없다"고 단정한다.
        meta.append("※ 섹션이 길어 관련 부분만 발췌")
    if meta:
        lines.append("    " + " · ".join(meta))

    if item.ocr_used:
        # ⚠ 설계문서 5.1 은 ocr_used 문서의 청크 텍스트를 근거로 쓰지 말고 원본
        #   이미지를 주입하라고 한다. 이미지 주입 경로가 아직 없으므로 텍스트를
        #   내보내되, 불확실성을 모델에게 명시적으로 넘긴다. 이미지 주입이
        #   붙으면 이 분기가 그 자리다.
        lines.append(
            "    ⚠ 스캔 원본을 읽어 옮긴 전사본입니다. 사람이 숫자를 대조하지 "
            "않았으므로, 금액·기한을 인용할 때는 원본 확인을 함께 권하세요."
        )
    lines.append(item.text)
    return "\n".join(lines)


def search(query: str, roles: Any = None, internal_user_id: Any = None, org_id: Any = None) -> str:
    """사내 문서 검색. 인자 중 query 만 모델이 채우고 나머지는 서버가 주입한다."""
    role_list = [str(r) for r in roles] if roles else None

    # ★ 여기가 인가 경계다. org_id 는 게이트웨이가 Entra 토큰의 tid 에서 확정해
    #   inject_context 로 넣어준다 (search_knowledge.yaml). 비어 있다는 건 신원이
    #   확인되지 않은 호출이라는 뜻이므로, 전사 검색으로 넘어가지 않고 막는다.
    #
    #   "결과 없음"으로 처리하지 않는 이유: 모델이 그걸 "그런 규정이 없다"로 읽고
    #   자신 있게 없다고 답한다. 조회를 못 한 것과 없는 것은 다르다.
    if not org_id:
        logger.error("org_id 없이 search_knowledge 가 호출됐습니다 — 인가 경계 위반")
        return (
            "소속 정보가 확인되지 않아 검색할 수 없습니다. "
            "내용을 추측해서 답하지 말고, 조회에 실패했다고 알려주세요."
        )

    try:
        hits = search_kb(query, org_id=str(org_id), roles=role_list, limit=MAX_RESULTS)
    except Exception as exc:  # noqa: BLE001
        logger.exception("지식베이스 검색 실패")
        return (
            f"지식베이스를 조회하지 못했습니다 ({exc.__class__.__name__}). "
            f"내용을 추측해서 답하지 말고, 조회에 실패했다고 알려주세요."
        )

    if not hits:
        return (
            "검색 결과가 없습니다. 색인된 문서 중에 관련 내용이 없거나, "
            "조회 권한 범위 밖일 수 있습니다. 모른다고 답하고 담당자 확인을 권하세요."
        )

    try:
        evidence = context.build(hits)
    except Exception as exc:  # noqa: BLE001 — 근거 조립 실패도 추측의 빌미가 되면 안 된다
        logger.exception("근거 조립 실패")
        return (
            f"검색 결과의 원문을 불러오지 못했습니다 ({exc.__class__.__name__}). "
            f"내용을 추측해서 답하지 말고, 조회에 실패했다고 알려주세요."
        )

    body = "\n\n".join(_format(i, item) for i, item in enumerate(evidence, 1))
    return (
        f"검색어: {query}\n"
        f"근거 {len(evidence)}건 — 각 항목은 해당 조항·절의 **전문**입니다 "
        f"(유효본만, 조회 권한 범위 내)\n\n"
        f"{body}"
    )
