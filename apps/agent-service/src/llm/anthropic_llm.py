"""Claude 구현.

여기서만 Anthropic SDK를 안다. 호출부(agent/core.py)는 이 파일을 import 하지 않는다.

주의사항 (2026 기준). 아래는 Sonnet 5 와 Opus 5 에 **모두** 해당하므로,
모델을 갈아끼워도 이 파일은 그대로다:
  · temperature / top_p / top_k  → 400. 사용하지 않는다
  · thinking budget_tokens        → 400. adaptive 사용
  · assistant prefill             → 400
  · thinking 은 기본 ON. max_tokens 가 thinking + 응답을 합쳐 제한하므로 여유가 필요
  · stop_reason == "refusal" 을 content 읽기 전에 확인

★ thinking 을 끄지 않는다. 껐을 때 모델이 도구 호출을 tool_use 블록이 아니라
  사람이 읽는 텍스트로 흘리는 경우가 있는데, 그러면 core.py 의 `wants_tools` 가
  False 가 되어 **검색을 안 한 답변이 정상 응답으로 나간다** — 에러도 로그도 없다.
  비용·지연은 thinking 스위치가 아니라 effort 로 조절한다.
"""

from __future__ import annotations

import logging
from typing import Any

import anthropic

from ..config import Settings
from .base import LLM, ToolCall, ToolResult, Turn, Usage

logger = logging.getLogger(__name__)


class AnthropicLLM(LLM):
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = anthropic.Anthropic(api_key=settings.anthropic_api_key or None)

    # ── 메시지 조립 (provider 형태를 어댑터가 소유) ──────────────────

    def user_message(self, text: str) -> dict[str, Any]:
        return {"role": "user", "content": text}

    def append_assistant_turn(self, messages: list[Any], turn: Turn) -> list[Any]:
        # thinking 블록을 포함한 content 를 그대로 되돌린다.
        # 편집하거나 텍스트만 추출해서 넣으면 이후 턴이 깨진다.
        if turn.raw_content is not None:
            messages.append({"role": "assistant", "content": turn.raw_content})
        elif turn.text:
            messages.append({"role": "assistant", "content": turn.text})
        return messages

    def append_tool_results(self, messages: list[Any], results: list[ToolResult]) -> list[Any]:
        # 여러 도구 결과는 반드시 "하나의" user 메시지에 모아 넣는다.
        # 나눠 넣으면 모델이 병렬 도구 호출을 하지 않도록 학습된다.
        messages.append(
            {
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": r.tool_call_id,
                        "content": r.content,
                        **({"is_error": True} if r.is_error else {}),
                    }
                    for r in results
                ],
            }
        )
        return messages

    # ── 유스케이스 ────────────────────────────────────────────────

    def run_agent_turn(
        self,
        *,
        system: str,
        messages: list[Any],
        tools: list[dict[str, Any]],
        effort: str | None = None,
    ) -> Turn:
        request: dict[str, Any] = {
            "model": self._settings.anthropic_model,
            "max_tokens": self._settings.anthropic_max_tokens,
            # 시스템 프롬프트(인격 + 사규 프리픽스)는 고정이므로 캐싱한다.
            # 캐시 읽기가 약 0.1배 — 도구 연쇄 N+1 호출에서 결정적이다.
            "system": [
                {
                    "type": "text",
                    "text": system,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            "messages": messages,
            "output_config": {"effort": effort or self._settings.anthropic_effort},
        }
        if tools:
            request["tools"] = tools

        response = self._client.messages.create(**request)

        # refusal 은 HTTP 200 으로 온다. content 읽기 전에 확인해야 한다.
        if response.stop_reason == "refusal":
            logger.warning("model refused the request: %s", getattr(response, "stop_details", None))
            return Turn(
                text="",
                stop_reason="refusal",
                usage=_usage(response),
                raw_content=None,
            )

        text_parts: list[str] = []
        tool_calls: list[ToolCall] = []
        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_calls.append(
                    ToolCall(id=block.id, name=block.name, arguments=dict(block.input or {}))
                )

        return Turn(
            text="\n".join(p for p in text_parts if p).strip(),
            tool_calls=tool_calls,
            stop_reason=response.stop_reason or "end_turn",
            usage=_usage(response),
            raw_content=response.content,
        )


def _usage(response: Any) -> Usage:
    u = getattr(response, "usage", None)
    if u is None:
        return Usage()
    return Usage(
        input_tokens=getattr(u, "input_tokens", 0) or 0,
        output_tokens=getattr(u, "output_tokens", 0) or 0,
        cache_read_tokens=getattr(u, "cache_read_input_tokens", 0) or 0,
        cache_write_tokens=getattr(u, "cache_creation_input_tokens", 0) or 0,
    )
