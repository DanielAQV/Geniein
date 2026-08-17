"""유나 코어 — 도구를 쥔 한 명 (3.2).

인텐트 분류기 + switch 문이 아니다. Claude 가 대화 맥락에서 필요한 도구를
스스로 고르고, 필요하면 여러 개를 연달아 호출한다.

    판정 케이스: "내 출장 결재 반려됐어? 왜?"
      → get_approval_status + search_knowledge + search_reject_history
      인텐트 라우터는 분기 하나만 고르므로 여기서 무너진다.

수동 루프를 쓰는 이유: 도구가 YAML 로 동적 정의되고, inject_context 주입과
tier 게이팅이 도구 실행 "직전"에 서버측에서 일어나야 하기 때문. SDK tool runner
는 데코레이터로 정의된 정적 도구를 전제한다.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any

from ..llm.base import LLM, ToolResult, Usage
from ..tools.registry import ToolRegistry
from .persona import Persona

logger = logging.getLogger(__name__)


#: 계정 언어 태그(`ko-kr`)의 앞부분 → 사람이 읽는 이름. 모델에게 "vi" 라고만
#: 말하면 무엇을 뜻하는지 흔들릴 수 있어 언어 이름으로 준다.
_LANGUAGE_NAMES = {
    "ko": "한국어",
    "vi": "베트남어",
    "en": "영어",
    "ja": "일본어",
    "zh": "중국어",
}


def _language_hint(locale: str) -> str:
    """시스템 프롬프트에 붙일 언어 안내.

    ★ **규칙이 아니라 기본값이다.** 질문한 언어로 답하는 것이 언제나 우선이고,
      이 값은 그것만으로 판단이 안 될 때 쓰인다 — "150 USD?" 나 "OT 규정?" 처럼
      언어를 알 수 없는 질문이 실제로 온다. 여기서 강하게 지시하면 베트남 직원이
      한국어로 물어도 베트남어로 답하는, 더 나쁜 동작이 된다.

    ★ 모르는 태그는 조용히 무시한다. 계정 설정은 우리가 통제하지 못하고,
      낯선 값 하나가 답변 언어를 망가뜨릴 이유는 없다.
    """
    name = _LANGUAGE_NAMES.get(locale.split("-")[0].lower())
    if not name:
        return ""

    return (
        "## 사용자 언어\n"
        f"이 사용자의 계정 언어는 {name}입니다. "
        "질문한 언어로 답하는 것이 우선이고, 질문만으로 언어를 알기 어려울 때만 "
        f"{name}로 답하세요."
    )


@dataclass(frozen=True)
class AgentContext:
    """서버가 아는 호출 맥락. 모델은 이 값을 지정할 수 없다 (원칙③)."""

    internal_user_id: str
    org_id: str | None = None
    roles: tuple[str, ...] = ()
    # 사용자 계정에 설정된 언어 (`ko-kr`, `vi-vn`). Entra 선택적 클레임 `xms_pl`
    # 에서 오고 **없을 수 있다.**
    #
    # ★ 답변 언어를 이 값으로 정하지 않는다. 질문한 언어가 언제나 우선이고
    #   (personas/default.yaml 의 language 규칙), 이것은 **판단이 안 설 때의 기준**
    #   이다. "150 USD?" 처럼 언어를 알 수 없는 질문이 실제로 온다.
    locale: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "internal_user_id": self.internal_user_id,
            "org_id": self.org_id,
            "roles": list(self.roles),
            "locale": self.locale,
        }


@dataclass
class ToolTrace:
    """관측용 (10.2). 라우팅이 틀렸나 도구가 틀렸나를 사후에 구분하려면 필요하다."""

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
        system = self._persona.system_prompt(tool_count=len(self._registry))

        # ★ 시스템 프롬프트가 언어별로 갈리므로 프롬프트 캐시도 언어 수만큼 나뉜다.
        #   사용자 수가 아니라 **언어 수**라 두세 갈래에 그치고, 각 갈래 안에서는
        #   캐시가 그대로 산다. 사용자별로 갈리는 값을 여기 넣으면 안 되는 이유이기도 하다.
        hint = _language_hint(context.locale) if context.locale else ""
        if hint:
            system += "\n\n" + hint

        tools = self._registry.to_api_schema()

        messages: list[Any] = list(history or [])
        messages.append(self._llm.user_message(user_text))

        trace: list[ToolTrace] = []
        totals = Usage()
        chain_position = 0

        for iteration in range(1, self._max_iterations + 1):
            turn = self._llm.run_agent_turn(system=system, messages=messages, tools=tools)
            totals = _accumulate(totals, turn.usage)

            if turn.is_refusal:
                return AgentResponse(
                    text="요청하신 내용은 답변드리기 어렵습니다.",
                    tool_trace=trace,
                    usage=totals,
                    refused=True,
                    iterations=iteration,
                )

            self._llm.append_assistant_turn(messages, turn)

            if not turn.wants_tools:
                return AgentResponse(
                    text=turn.text,
                    tool_trace=trace,
                    usage=totals,
                    iterations=iteration,
                )

            results: list[ToolResult] = []
            for call in turn.tool_calls:
                chain_position += 1
                spec = self._registry.get(call.name)
                started = time.perf_counter()

                result = self._registry.execute(
                    name=call.name,
                    tool_call_id=call.id,
                    arguments=call.arguments,
                    context=context.as_dict(),
                    # commit 등급은 승인 게이트를 통과해야 실행된다.
                    # 대화 경로에서는 항상 False — 승인은 /console/inbox 에서 일어난다.
                    approval_granted=False,
                )
                results.append(result)
                trace.append(
                    ToolTrace(
                        name=call.name,
                        tier=spec.tier if spec else "unknown",
                        arguments=call.arguments,
                        outcome="error" if result.is_error else "ok",
                        latency_ms=int((time.perf_counter() - started) * 1000),
                        chain_position=chain_position,
                    )
                )

            # 여러 결과는 한 턴에 함께 넣는다
            self._llm.append_tool_results(messages, results)

        logger.warning("도구 연쇄가 %d회를 초과했습니다. 루프를 중단합니다.", self._max_iterations)
        return AgentResponse(
            text="처리가 예상보다 길어져 중단했습니다. 질문을 조금 더 좁혀서 다시 물어봐 주세요.",
            tool_trace=trace,
            usage=totals,
            iterations=self._max_iterations,
        )


def _accumulate(a: Usage, b: Usage) -> Usage:
    return Usage(
        input_tokens=a.input_tokens + b.input_tokens,
        output_tokens=a.output_tokens + b.output_tokens,
        cache_read_tokens=a.cache_read_tokens + b.cache_read_tokens,
        cache_write_tokens=a.cache_write_tokens + b.cache_write_tokens,
    )
