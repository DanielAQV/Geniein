"""유나 코어 — 도구를 쥔 한 명 (3.2).

인텐트 분류기가 아니라 도구 루프다. 도구가 YAML 로 동적 정의되고 inject_context
주입·tier 게이팅이 실행 직전에 서버에서 일어나야 해서 SDK tool runner 를 안 쓴다.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Iterator

from ..llm.base import LLM, TextDelta, ToolResult, Turn, Usage
from ..tools.registry import ToolRegistry
from .language import detect as detect_language
from .persona import Persona

logger = logging.getLogger(__name__)


#: 계정 언어 태그의 앞부분 → 사람이 읽는 이름. "vi" 만 주면 모델이 흔들린다.
_LANGUAGE_NAMES = {
    "ko": "한국어",
    "vi": "베트남어",
    "en": "영어",
    "ja": "일본어",
    "zh": "중국어",
}


def _language_hint(user_text: str, chosen_lang: str | None, locale: str | None) -> str:
    """시스템 프롬프트에 붙일 답변 언어 확정.

    규칙이 아니라 사실을 쓴다 — 조건문으로 주면 모델이 판단을 미루고 그 판단이
    프롬프트의 한국어 편향에 먹힌다 (실측). 근거 순서는 발언 언어 > 고른 값 >
    계정 언어이고, 셋 다 없으면 빈 문자열로 모델에게 맡긴다.
    """
    name = None
    for value in (detect_language(user_text), chosen_lang, locale):
        name = _LANGUAGE_NAMES.get((value or "").split("-")[0].lower())
        if name:
            break
    if not name:
        return ""

    head = f"## 답변 언어\n이번 답변은 **{name}**로 씁니다."
    if name == "한국어":
        # 한국어면 편향과 방향이 같아서 덧붙일 말이 없다. 토큰도 아낀다.
        return head

    return (
        f"{head}\n"
        "이 지시문과 근거 문서가 한국어인 것은 답변 언어와 무관합니다 — 근거가 "
        f"한국어여도 내용을 {name}로 옮겨 답합니다. 조항 이름·금액처럼 원문 표기가 "
        "중요한 것은 괄호로 함께 보여도 됩니다."
    )


@dataclass(frozen=True)
class AgentContext:
    """서버가 아는 호출 맥락. 모델은 이 값을 지정할 수 없다 (원칙③)."""

    internal_user_id: str
    org_id: str | None = None
    roles: tuple[str, ...] = ()
    # 계정 언어. Entra 클레임 `xms_pl` 에서 오고 없을 수 있다. 답변 언어를 이 값으로
    # 먼저 정하지 않는다 — 방금 말한 언어가 우선이다 (_language_hint).
    locale: str | None = None
    # 탭에서 직접 고른 언어. 계정 언어보다 강한 근거다. 신원이 아니므로 클라이언트가 보내도 된다.
    chosen_lang: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "internal_user_id": self.internal_user_id,
            "org_id": self.org_id,
            "roles": list(self.roles),
            "locale": self.locale,
            "chosen_lang": self.chosen_lang,
        }


@dataclass
class ToolTrace:

    name: str
    tier: str
    arguments: dict[str, Any]
    outcome: str
    latency_ms: int
    chain_position: int


@dataclass
class AgentResponse:
    text: str
    tool_trace: list[ToolTrace] = field(default_factory=list)
    usage: Usage = field(default_factory=Usage)
    refused: bool = False
    iterations: int = 0


# 스트리밍 이벤트. 텍스트만 흘리면 안 된다 — 40~60초 중 생성은 마지막 5~10초뿐이라
# 진행 단계를 같은 스트림으로 내보내야 대기가 채워진다.


@dataclass(frozen=True)
class StatusEvent:
    """모델 호출이 시작됐다. `phase` 는 화면 문구를 고르는 데만 쓴다."""

    phase: str


@dataclass(frozen=True)
class ToolStartEvent:
    name: str
    arguments: dict[str, Any]
    chain_position: int


@dataclass(frozen=True)
class ToolEndEvent:
    name: str
    outcome: str
    latency_ms: int
    chain_position: int


@dataclass(frozen=True)
class TextEvent:
    """모델이 방금 쓴 글자들."""

    delta: str


@dataclass(frozen=True)
class DoneEvent:
    """끝. `replace_text` 가 있으면 화면에 쌓인 글자를 그것으로 바꾼다.

    정상 경로에서는 None 이다. 거절·중단처럼 서버가 지어낸 문장일 때만 실린다.
    """

    response: AgentResponse
    replace_text: str | None = None


AgentEvent = StatusEvent | ToolStartEvent | ToolEndEvent | TextEvent | DoneEvent


class Agent:
    def __init__(
        self,
        *,
        llm: LLM,
        registry: ToolRegistry,
        persona: Persona,
        max_iterations: int = 8,
    ) -> None:
        self._llm = llm
        self._registry = registry
        self._persona = persona
        self._max_iterations = max_iterations

    def run(
        self,
        *,
        user_text: str,
        context: AgentContext,
        history: list[Any] | None = None,
    ) -> AgentResponse:
        """한 번에 답을 돌려주는 경로. 루프를 복제하지 않고 `stream()` 을 모아 준다."""
        for event in self.stream(user_text=user_text, context=context, history=history):
            if isinstance(event, DoneEvent):
                return event.response
        raise RuntimeError("스트림이 DoneEvent 없이 끝났습니다")

    def stream(
        self,
        *,
        user_text: str,
        context: AgentContext,
        history: list[Any] | None = None,
    ) -> Iterator[AgentEvent]:
        system = self._persona.system_prompt(tool_count=len(self._registry))

        # 시스템 프롬프트가 언어별로 갈리므로 캐시도 언어 수만큼 나뉜다. 사용자 수가
        # 아니라 언어 수라 두세 갈래에 그친다 — 사용자별 값을 여기 넣으면 안 된다.
        hint = _language_hint(user_text, context.chosen_lang, context.locale)
        if hint:
            system += "\n\n" + hint

        tools = self._registry.to_api_schema()

        messages: list[Any] = list(history or [])
        messages.append(self._llm.user_message(user_text))

        trace: list[ToolTrace] = []
        totals = Usage()
        chain_position = 0

        for iteration in range(1, self._max_iterations + 1):
            # 도구를 한 번이라도 돌린 뒤의 턴은 "근거를 읽는" 중이다. 같은 문구를
            # 계속 보여주면 멈춘 것처럼 보이므로 단계를 갈라 준다.
            yield StatusEvent(phase="thinking" if chain_position == 0 else "reading")

            turn: Turn | None = None
            for event in self._llm.stream_agent_turn(
                system=system, messages=messages, tools=tools
            ):
                if isinstance(event, TextDelta):
                    yield TextEvent(delta=event.text)
                else:
                    turn = event.turn
            if turn is None:  # 어댑터가 계약을 지키지 않은 것 (base.py 참조)
                raise RuntimeError("턴이 TurnComplete 없이 끝났습니다")

            totals = _accumulate(totals, turn.usage)

            if turn.is_refusal:
                yield DoneEvent(
                    response=AgentResponse(
                        text="요청하신 내용은 답변드리기 어렵습니다.",
                        tool_trace=trace,
                        usage=totals,
                        refused=True,
                        iterations=iteration,
                    ),
                    # 거절 전에 흘린 조각과 안내 문장이 나란히 남으면 무엇이 답인지 모른다.
                    replace_text="요청하신 내용은 답변드리기 어렵습니다.",
                )
                return

            self._llm.append_assistant_turn(messages, turn)

            if not turn.wants_tools:
                yield DoneEvent(
                    response=AgentResponse(
                        text=turn.text,
                        tool_trace=trace,
                        usage=totals,
                        iterations=iteration,
                    )
                )
                return

            results: list[ToolResult] = []
            for call in turn.tool_calls:
                chain_position += 1
                spec = self._registry.get(call.name)
                started = time.perf_counter()

                yield ToolStartEvent(
                    name=call.name, arguments=call.arguments, chain_position=chain_position
                )

                result = self._registry.execute(
                    name=call.name,
                    tool_call_id=call.id,
                    arguments=call.arguments,
                    context=context.as_dict(),
                    # commit 등급은 승인 게이트를 통과해야 실행된다 — 대화 경로에서는 항상 False.
                    approval_granted=False,
                )
                results.append(result)
                latency_ms = int((time.perf_counter() - started) * 1000)
                outcome = "error" if result.is_error else "ok"
                trace.append(
                    ToolTrace(
                        name=call.name,
                        tier=spec.tier if spec else "unknown",
                        arguments=call.arguments,
                        outcome=outcome,
                        latency_ms=latency_ms,
                        chain_position=chain_position,
                    )
                )
                yield ToolEndEvent(
                    name=call.name,
                    outcome=outcome,
                    latency_ms=latency_ms,
                    chain_position=chain_position,
                )

            self._llm.append_tool_results(messages, results)

        logger.warning("도구 연쇄가 %d회를 초과했습니다. 루프를 중단합니다.", self._max_iterations)
        stopped = "처리가 예상보다 길어져 중단했습니다. 질문을 조금 더 좁혀서 다시 물어봐 주세요."
        yield DoneEvent(
            response=AgentResponse(
                text=stopped,
                tool_trace=trace,
                usage=totals,
                iterations=self._max_iterations,
            ),
            replace_text=stopped,
        )


def _accumulate(a: Usage, b: Usage) -> Usage:
    return Usage(
        input_tokens=a.input_tokens + b.input_tokens,
        output_tokens=a.output_tokens + b.output_tokens,
        cache_read_tokens=a.cache_read_tokens + b.cache_read_tokens,
        cache_write_tokens=a.cache_write_tokens + b.cache_write_tokens,
    )
