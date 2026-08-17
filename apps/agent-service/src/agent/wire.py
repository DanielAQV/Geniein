"""스트리밍 이벤트의 와이어 형태 (NDJSON 한 줄).

## 왜 이 파일이 따로 있는가

이건 HTTP 관심사가 아니라 **계약**이다. 화면(apps/web 의 chat-view)이 여기 적힌
필드 이름을 그대로 읽고, 중간의 두 계층(NestJS·Next BFF)은 바이트를 그대로 흘린다.
main.py 안에 두면 FastAPI 없이 검증할 수 없어서, 계약을 바꿀 때마다 서비스를 띄워야
한다. 순수 함수로 떼어두면 스텁 루프만으로 확인된다.

## 왜 NDJSON 인가 (SSE 가 아니라)

  · 브라우저 EventSource 는 POST 도 Authorization 헤더도 못 보낸다. 이 경로는 둘 다
    필요하므로 어차피 fetch + ReadableStream 으로 읽는다. 그러면 SSE 의
    `event:`/`data:` 규약은 파싱 부담만 남는다.
  · 중간 계층이 둘이고 둘 다 재조립하지 않는다. 줄 단위면 계층마다 파서가 필요 없다.

★ `ensure_ascii=False` 로 내보낸다. 한국어·베트남어가 유니코드 이스케이프(`\\uXXXX`)로
  부풀면 스트림 용량이 세 배가 되고, 델타를 눈으로 따라 읽을 수도 없게 된다.
"""

from __future__ import annotations

import json
from typing import Any

from .core import (
    AgentEvent,
    DoneEvent,
    StatusEvent,
    TextEvent,
    ToolEndEvent,
    ToolStartEvent,
)


def _tool_detail(arguments: dict[str, Any]) -> str | None:
    """도구 인자에서 화면에 보여줄 한 조각.

    검색어를 보여주면 사용자가 "무엇을 찾고 있는지" 안다. 인자 전체를 넘기지 않는
    것은 도구가 늘어도 화면이 안 깨지게 하기 위해서다 — 문자열 값 하나만 고른다.
    """
    return next((str(v) for v in arguments.values() if isinstance(v, str)), None)


def event_json(event: AgentEvent) -> str:
    """이벤트 하나를 한 줄 JSON 으로. 개행은 붙이지 않는다 (호출부가 붙인다)."""
    if isinstance(event, StatusEvent):
        return json.dumps({"type": "status", "phase": event.phase})

    if isinstance(event, ToolStartEvent):
        return json.dumps(
            {
                "type": "tool_start",
                "name": event.name,
                "detail": _tool_detail(event.arguments),
                "position": event.chain_position,
            },
            ensure_ascii=False,
        )

    if isinstance(event, ToolEndEvent):
        return json.dumps(
            {
                "type": "tool_end",
                "name": event.name,
                "outcome": event.outcome,
                "ms": event.latency_ms,
                "position": event.chain_position,
            }
        )

    if isinstance(event, TextEvent):
        return json.dumps({"type": "text", "delta": event.delta}, ensure_ascii=False)

    if isinstance(event, DoneEvent):
        result = event.response
        return json.dumps(
            {
                "type": "done",
                "refused": result.refused,
                "iterations": result.iterations,
                # 값이 있으면 화면에 쌓인 글자를 이것으로 바꾼다 (core.DoneEvent 주석).
                "replace_text": event.replace_text,
                # 검색이 실제로 돌았는지 보여주는 칩. 비용·지연은 넣지 않는다 —
                # 브라우저로 내려보내지 않는다는 규칙이 그대로다 (설계문서 10.2).
                "tools": [{"name": t.name, "outcome": t.outcome} for t in result.tool_trace],
                # ★ usage 는 여기 담아 **게이트웨이가 로그로 쓴다.** 스트리밍이 되면
                #   NestJS 가 본문을 파싱하지 않으므로, 이 줄이 없으면 토큰 사용량과
                #   `lang=` 관측이 통째로 사라진다.
                "usage": {
                    "input_tokens": result.usage.input_tokens,
                    "output_tokens": result.usage.output_tokens,
                    "cache_read_tokens": result.usage.cache_read_tokens,
                    "cache_write_tokens": result.usage.cache_write_tokens,
                },
            },
            ensure_ascii=False,
        )

    raise TypeError(f"모르는 이벤트: {type(event).__name__}")


def error_json(code: str) -> str:
    """스트림 도중의 실패.

    ★ 헤더는 이미 200 으로 나갔다. HTTP 상태로는 실패를 알릴 수 없고, 커넥션만 끊으면
      화면에는 "답변이 중간에 멈춘" 것으로 보인다. 실패도 스트림 안에서 말해야 한다.
    """
    return json.dumps({"type": "error", "code": code})
