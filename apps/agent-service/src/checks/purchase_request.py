"""구매요청 첨부 대조.

**받는 사람은 요청자다.** 승인자가 아니다. 승인자에게 "이 요청 이상합니다" 를
보내면 그건 승인자의 판단을 지적하는 것이고, 정작 고칠 수 있는 사람은 요청자다.
요청자가 원하는 것은 반려당하지 않는 것이고, 원하지 않는 것은 이미 맞게 낸 것에
대한 잔소리다. 그래서 이 검사는 **어긋난 게 없으면 아무 말도 하지 않는다.**

마이키만 할 수 있는 일에 한정한다. 단가가 정수인지, 합계가 맞는지는 플로우가
이미 본다 — 그걸 또 보면 두더지잡기가 된다. 여기서 보는 것은 **자유 형식 문서와
구조화된 값의 대조**다. 견적서는 베트남어에 표와 도장이 섞여 있어서 규칙으로는
읽히지 않는다.

★ 판단하지 않는 것들: 가격이 적정한가, 이 구매가 필요한가, 규정에 맞는가.
  "견적서에 8,000,000 인데 폼에 800,000 이 들어갔습니다" 까지가 전부다.

★ 확신이 없으면 침묵한다. 놓치는 쪽의 비용은 지금과 같은 상태이고, 잘못 짚는
  쪽의 비용은 정당하게 낸 사람을 의심한 것이 된다. 둘은 크기가 다르다.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from ..config import get_settings
from ..graph import client
from ..graph.client import GraphUnavailable
from ..llm.base import LLM, Document

logger = logging.getLogger(__name__)

LIST_NAME = "Purchase Request"

# 첨부 상한. 한 요청에 파일이 여러 개 붙는 것은 정상이지만, 전부 모델에 넣으면
# 비용과 지연이 요청자마다 달라진다.
MAX_DOCUMENTS = 5
MAX_TOTAL_BYTES = 12 * 1024 * 1024

#: 확장자 → media type. 모델이 볼 수 있는 것만 있다. 엑셀이 없는 것은 의도다 —
#: 결재 엑셀은 플로우가 이미 파싱해서 컬럼에 넣어 두었고, 그 값을 텍스트로 넣는다.
_MEDIA_TYPES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
}

#: 폼 값 중 사람이 낸 것이 아닌 것들. 모델에 넣어봐야 대조할 상대가 없다.
_SKIP_FIELDS = {
    "ContentType",
    "Attachments",
    "Edit",
    "LinkTitle",
    "LinkTitleNoMenu",
    "ItemChildCount",
    "FolderChildCount",
    "_ComplianceFlags",
    "_ComplianceTag",
    "AppAuthor",
    "AppEditor",
}

#: 엑셀 파싱 결과가 들어오는 컬럼. 길어질 수 있어 따로 자른다.
_CHILD_FIELD = "ChildDataJSON"
_MAX_CHILD_CHARS = 20_000

SYSTEM = """You compare a purchase request form against the documents attached to it.

Your only job is to find concrete, checkable differences between the two:
item description, quantity, unit price, currency, total amount, supplier name.

Rules:
- Report a difference only when you can point at both sides of it.
- If the attachments support the form values, report nothing.
- If the attachments do not cover a value at all, that is not a difference.
- Never judge whether a price is reasonable, whether the purchase is needed,
  or whether the request follows any policy. That is not your call.
- Never give advice, instructions, or reminders. State the difference and stop.
- When you are unsure, report nothing.

Answer with JSON only, no prose around it:
  {"notify": false}
  {"notify": true, "message": "<at most 3 short lines, English>"}

The message is read by the person who submitted the request, right after they
submitted it. Write only what differs and where, so they can look at it. No
greeting, no closing, no explanation of why it matters."""


def check(
    item_id: int,
    requester_email: str | None,
    llm: LLM,
    *,
    enforce_allowlist: bool = True,
) -> dict[str, Any]:
    """항목 하나를 본다. 돌려주는 것은 `{notify, message}` 다.

    실패는 조용하다. 첨부가 없거나 SharePoint 가 막혀 있는 것은 오류가 아니라
    "말할 게 없는" 상태이고, 그 때문에 제출 플로우가 흔들리면 안 된다.
    """
    settings = get_settings()

    # 허용목록은 **보내기** 를 막는 장치다. 결과만 보는 경로(CLI 점검)는 통과시키되,
    # 그 경로에는 발신이 없다 — 끄는 스위치를 발신 경로와 같은 곳에 두지 않는다.
    if enforce_allowlist:
        allowed = _allowlist(settings.pr_check_allowed_emails)
        if (requester_email or "").strip().lower() not in allowed:
            return {"notify": False, "reason": "허용목록 밖"}

    try:
        item = client.get_item(LIST_NAME, item_id)
        documents = _documents(item_id)
    except GraphUnavailable as exc:
        logger.warning("첨부 대조를 건너뜁니다 (item=%s): %s", item_id, exc)
        return {"notify": False, "reason": "SharePoint 접근 불가"}

    if not documents:
        return {"notify": False, "reason": "첨부 없음"}

    answer = llm.read_documents(
        system=SYSTEM,
        instruction=_instruction(item.get("fields") or {}),
        documents=documents,
    )
    result = _parse(answer)
    logger.info(
        "첨부 대조 item=%s 첨부=%d notify=%s",
        item_id,
        len(documents),
        result.get("notify"),
    )
    return result


# ── 내부 ──────────────────────────────────────────────────────────────


def _allowlist(raw: str) -> set[str]:
    """빈 값은 **전원 허용이 아니라 전원 차단**이다.

    반대로 두면 설정을 깜빡한 환경에서 전 직원에게 메시지가 나간다. 새 알림
    경로에서 기본값이 조용한 쪽이어야 한다.
    """
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def _documents(item_id: int) -> list[Document]:
    docs: list[Document] = []
    total = 0
    for meta in client.attachments(LIST_NAME, item_id):
        name = str(meta.get("FileName") or "")
        media_type = _MEDIA_TYPES.get(_extension(name))
        if not media_type:
            continue  # 엑셀·워드는 여기서 빠진다 (모듈 주석 참조)
        if len(docs) >= MAX_DOCUMENTS:
            logger.info("첨부가 %d개를 넘어 뒤쪽은 보지 않습니다 (item=%s)", MAX_DOCUMENTS, item_id)
            break

        data = client.attachment_bytes(str(meta.get("ServerRelativeUrl")))
        total += len(data)
        if total > MAX_TOTAL_BYTES:
            logger.info("첨부 용량 상한을 넘어 %s 부터는 보지 않습니다 (item=%s)", name, item_id)
            break
        docs.append(Document(name=name, media_type=media_type, data=data))
    return docs


def _extension(name: str) -> str:
    dot = name.rfind(".")
    return name[dot:].lower() if dot >= 0 else ""


def _instruction(fields: dict[str, Any]) -> str:
    """폼 값을 모델이 읽을 텍스트로.

    컬럼 이름을 고정하지 않는다. 리스트는 사람이 계속 고치는 물건이고, 여기에
    이름을 박아 두면 컬럼 하나 바뀔 때마다 조용히 대조가 빠진다.
    """
    lines = []
    for key, value in fields.items():
        if key in _SKIP_FIELDS or key.startswith("_") or key.startswith("@"):
            continue
        if value in (None, "", [], {}):
            continue
        text = json.dumps(value, ensure_ascii=False) if isinstance(value, (dict, list)) else str(value)
        if key == _CHILD_FIELD and len(text) > _MAX_CHILD_CHARS:
            text = text[:_MAX_CHILD_CHARS] + " …(truncated)"
        lines.append(f"{key}: {text}")

    return (
        "Request form values:\n"
        + "\n".join(lines)
        + "\n\nCompare these against the attached documents above and answer with JSON."
    )


def _parse(answer: str) -> dict[str, Any]:
    """모델 응답에서 JSON 을 꺼낸다.

    ★ 못 읽으면 **침묵 쪽으로 떨어진다.** 파싱 실패를 알림으로 바꾸면, 형식이
      틀어진 날 전원에게 이상한 메시지가 나간다.
    """
    match = re.search(r"\{.*\}", answer, re.DOTALL)
    if not match:
        logger.warning("첨부 대조 응답에서 JSON 을 찾지 못했습니다: %s", answer[:200])
        return {"notify": False, "reason": "응답 형식"}

    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError:
        logger.warning("첨부 대조 응답 JSON 파싱 실패: %s", match.group(0)[:200])
        return {"notify": False, "reason": "응답 형식"}

    message = str(parsed.get("message") or "").strip()
    if not parsed.get("notify") or not message:
        return {"notify": False}
    return {"notify": True, "message": message}
