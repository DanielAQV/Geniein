"""스트리밍 이벤트의 와이어 형태 (NDJSON 한 줄).

화면(apps/web 의 chat-view)이 여기 적힌 필드 이름을 그대로 읽고, 중간 두 계층은
바이트를 그대로 흘린다. `ensure_ascii=False` 로 내보낸다 — 유니코드 이스케이프로
부풀면 스트림 용량이 세 배가 된다.
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
    """도구 인자에서 화면에 보여줄 한 조각. 문자열 값 하나만 골라 화면이 안 깨지게 한다."""
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
                # 검색이 실제로 돌았는지 보여주는 칩. 비용·지연은 넣지 않는다.
                "tools": [{"name": t.name, "outcome": t.outcome} for t in result.tool_trace],
                # usage 는 게이트웨이가 로그로 쓴다. 스트리밍이면 NestJS 가 본문을
                # 파싱하지 않으므로 이 줄이 없으면 토큰 사용량 관측이 사라진다.
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
    """스트림 도중의 실패. 헤더가 이미 200 으로 나갔으므로 스트림 안에서 말해야 한다."""
    return json.dumps({"type": "error", "code": code})
