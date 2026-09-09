"""LLM 어댑터 경계."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterator, Protocol


@dataclass(frozen=True)
class ToolCall:
    """모델이 요청한 도구 호출. provider 중립."""

    id: str
    name: str
    arguments: dict[str, Any]


@dataclass(frozen=True)
class ToolResult:
    tool_call_id: str
    content: str
    is_error: bool = False


@dataclass(frozen=True)
class Usage:
    input_tokens: int = 0
    output_tokens: int = 0
    cache_read_tokens: int = 0
    cache_write_tokens: int = 0


@dataclass
class Turn:
    """에이전트 한 턴의 결과."""

    text: str
    tool_calls: list[ToolCall] = field(default_factory=list)
    stop_reason: str = "end_turn"
    usage: Usage = field(default_factory=Usage)
    raw_content: Any = None

    @property
    def wants_tools(self) -> bool:
        return self.stop_reason == "tool_use" and bool(self.tool_calls)

    @property
    def is_refusal(self) -> bool:
        return self.stop_reason == "refusal"


@dataclass(frozen=True)
class TextDelta:
    """모델이 방금 쓴 글자들. 화면에 그대로 이어 붙인다."""

    text: str


@dataclass(frozen=True)
class TurnComplete:
    """한 턴의 끝. 도구 호출 목록과 raw_content 가 다음 턴의 입력이다."""

    turn: Turn


TurnEvent = TextDelta | TurnComplete


class LLM(Protocol):
    """유나의 언어능력. 교체 가능한 부품 (3.5)."""

    def run_agent_turn(
        self,
        *,
        system: str,
        messages: list[Any],
        tools: list[dict[str, Any]],
        effort: str | None = None,
    ) -> Turn:
        """도구를 쥔 한 턴. 툴콜 판단이 이 호출 안에서 일어난다 (별도 분류 호출 없음)."""
        ...

    def stream_agent_turn(
        self,
        *,
        system: str,
        messages: list[Any],
        tools: list[dict[str, Any]],
        effort: str | None = None,
    ) -> Iterator[TurnEvent]:
        """`run_agent_turn` 과 같은 한 턴을, 쓰이는 대로 내보내면서."""
        ...

    def append_assistant_turn(self, messages: list[Any], turn: Turn) -> list[Any]:
        """어시스턴트 응답을 대화 이력에 추가. provider 메시지 형태는 어댑터가 소유한다."""
        ...

    def append_tool_results(self, messages: list[Any], results: list[ToolResult]) -> list[Any]:
        """도구 결과를 대화 이력에 추가. 여러 결과는 한 턴에 함께 넣는다."""
        ...

    def user_message(self, text: str) -> Any:
        """사용자 발언을 provider 메시지 형태로."""
        ...
