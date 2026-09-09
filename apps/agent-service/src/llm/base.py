"""LLM 어댑터 경계.

설계 문서 3.5 — 경계는 유스케이스 단위로 자른다.

    ❌ generate(prompt) -> str
       최소공통분모 래퍼. 스왑은 쉬워지지만 프롬프트 캐싱·적응형 사고·
       structured outputs 를 전부 포기하게 된다. 사규 고정 프리픽스 캐싱은
       이 시스템 비용 레버 1순위이므로 포기할 수 없다.

    ✅ run_agent_turn / answer_with_context / extract_structured
       provider별 최적화는 어댑터 "안에서" 한다. 호출부는 같은 시그니처만 본다.

나중에 로컬 LLM으로 뇌를 갈아끼울 때 이 프로토콜 구현체만 새로 쓰면 된다.
"""

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
    """에이전트 한 턴의 결과.

    raw_content 는 provider 고유 블록 배열이다. 호출부는 이걸 해석하지 않고
    append_assistant_turn 에 그대로 되돌려주기만 한다 (thinking 블록 보존 필요).
    """

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
    """한 턴의 끝. 스트리밍 중에도 호출부는 결국 `Turn` 이 필요하다 —
    도구 호출 목록과 `raw_content`(thinking 블록 포함)가 다음 턴의 입력이기 때문이다."""

    turn: Turn


#: 스트리밍 한 턴이 내보내는 것. 마지막은 반드시 `TurnComplete` 다.
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
        """`run_agent_turn` 과 같은 한 턴을, 쓰이는 대로 내보내면서.

        ★ 두 메서드가 따로 있는 것은 어댑터의 사정이다. 위쪽(agent/core.py)에는
          루프가 하나뿐이고, 그 루프는 항상 이 스트리밍 쪽을 쓴다 — `run_agent_turn`
          은 그 결과를 모아 주는 얇은 껍데기로 남는다. 루프가 둘이면 반드시 갈라진다.
        """
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
