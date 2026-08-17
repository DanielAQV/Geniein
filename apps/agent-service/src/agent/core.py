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
from .language import detect as detect_language
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


def _language_hint(user_text: str, chosen_lang: str | None, locale: str | None) -> str:
    """시스템 프롬프트에 붙일 **답변 언어 확정**.

    ★ 규칙이 아니라 **사실**을 쓴다. 예전에는 "질문한 언어로 답하고, 알기 어려울
      때만 계정 언어로" 라고 조건문으로 줬는데, 그러면 모델이 판단을 미루고 그
      판단이 프롬프트의 한국어 편향에 먹힌다. 실측:

          계정 언어 en + 베트남어 질문 → **한국어** 답변 (2/2)   ← 조건문
          같은 조건, 사실 문장으로 확정 → 베트남어 답변

      프롬프트·도구 결과·근거 문서가 전부 한국어라서, 한 줄의 규칙은 그 무게를
      못 이긴다. 그래서 언어는 코드가 정하고(agent/language.py) 프롬프트에는
      결론만 남긴다.

    ★ 근거의 순서: **발언한 언어 > 탭에서 고른 값 > 계정 언어**.

      1. 발언한 언어    지금 이 사람이 방금 쓴 언어다. 계정 언어를 영어로 두고
                        베트남어로 묻는 사람이 실제로 있고(그게 이 함수를 고치게 만든
                        사건이다), 그 사람이 원한 것은 자기가 방금 쓴 언어다.
      2. 탭에서 고른 값  틀린 자동 판정을 사용자가 직접 고친 결과다. 계정 설정보다
                        나중에, 이 화면을 보면서 내린 결정이므로 더 강한 근거다.
      3. 계정 언어      Entra `xms_pl`. 검증된 토큰에서 오지만 "설정돼 있으면" 실린다.

    ★ 셋 다 없으면 빈 문자열이다. 아무 언어나 지정하는 것보다 모델에게 맡기는 편이
      낫다 — 대화 이력이 있으면 그쪽이 우리보다 나은 근거를 갖고 있다.

    ★ 모르는 값은 조용히 무시하고 다음 근거로 넘어간다. 계정 설정도 클라이언트가 보낸
      선택도 우리가 통제하지 못하고, 낯선 값 하나가 답변 언어를 망가뜨릴 이유는 없다.
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
    # 사용자 계정에 설정된 언어 (`ko-kr`, `vi-vn`). Entra 선택적 클레임 `xms_pl`
    # 에서 오고 **없을 수 있다.**
    #
    # ★ 답변 언어를 이 값으로 **먼저** 정하지 않는다. 방금 말한 언어가 우선이고
    #   (_language_hint), 이것은 그것을 가릴 수 없을 때의 기준이다 — "150 USD?"
    #   처럼 언어를 알 수 없는 발언이 실제로 온다.
    #
    #   계정을 영어로 두고 베트남어로 묻는 사람이 있다. 그 사람에게 영어로 답하면
    #   틀린 것이다.
    locale: str | None = None
    # 사용자가 탭에서 **직접 고른** 언어 (`ko`/`vi`/`en`). 자동 판정이 틀렸을 때의
    # 탈출구이고, 계정 언어보다 강한 근거다 — 이 화면을 보면서 내린 결정이기 때문이다.
    #
    # ★ 신원이 아니므로 클라이언트가 보내도 된다. 이 값으로 열리는 데이터가 없다
    #   (org_id·roles 와 나란히 두지만 성질이 다르다 — 그쪽은 토큰에서만 온다).
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
        #
        #   ★ 판정 근거가 발언 언어로 바뀌었으므로, 한 대화 안에서 사용자가 언어를
        #     바꾸면 그 턴은 캐시를 놓친다 (프리픽스가 달라진다). 프리픽스가 2천 토큰
        #     남짓이라 그 턴에 약 $0.005 이고, 자주 일어나는 일도 아니다. 반대로 답변
        #     언어를 틀리는 비용은 사용자가 도구를 안 쓰게 되는 것이다.
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
