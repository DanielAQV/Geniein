"""유나의 뇌 — FastAPI.

이 서비스는 인터넷에 직접 노출되지 않는다. NestJS(게이트웨이)가 앞에 서고,
이쪽은 내부망에서만 호출된다 (RAG_SERVICE_URL / AI_ALLOWED_IPS 의 원래 의도).

★ 그 "내부망에서만"이 오래 배치 설정에만 의존해 있었고, compose 는 8000 을 호스트에
  퍼블리시한다. Teams 탭이 붙으면서 실제 우회로가 되므로, 여기서도 호출자를 확인한다
  (docs/TEAMS_TAB_DESIGN.md 4.2). 방어는 한 겹이면 배치 실수 한 번에 무너진다.
"""

from __future__ import annotations

import hmac
import logging
from contextlib import asynccontextmanager
from typing import Any, Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from .agent import Agent, AgentContext, load_persona
from .config import get_settings
from .llm.anthropic_llm import AnthropicLLM
from .tools.registry import ToolRegistry

settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)-7s %(name)s | %(message)s",
)
logger = logging.getLogger("yuna")

_state: dict[str, Any] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 도구와 인격은 기동 시 1회 로드한다.
    # 대화 중 도구를 동적으로 추가/제거하지 않는다 — 프롬프트 캐시가 전멸한다 (3.2.1).
    registry = ToolRegistry.load(settings.tools_dir)
    persona = load_persona(settings.personas_dir)
    _state["registry"] = registry
    _state["persona"] = persona
    _state["llm"] = AnthropicLLM(settings)
    _state["agent"] = Agent(
        llm=_state["llm"],
        registry=registry,
        persona=persona,
        max_iterations=settings.max_tool_iterations,
    )
    logger.info(
        "유나 기동 — 모델=%s effort=%s 도구=%d개 %s",
        settings.anthropic_model,
        settings.anthropic_effort,
        len(registry),
        [s.name for s in registry.specs],
    )
    yield
    _state.clear()


app = FastAPI(title="Yuna Brain", version="0.1.0", lifespan=lifespan)


def require_service_token(x_service_token: str = Header(default="")) -> None:
    """호출자가 우리 게이트웨이인가.

    apps/api 의 `ServiceTokenGuard` 와 같은 성격이고 규칙도 같게 맞춘다:
    설정이 없으면 통과시키지 않는다. "설정 안 했으니 열어둔다"가 이 시스템이
    원래 갖고 있던 문제였다.

    `/health` 에는 걸지 않는다 — compose healthcheck 와 로드밸런서가 토큰 없이
    불러야 하고, 그 응답에는 모델명과 도구 이름만 있다.
    """
    expected = settings.agent_service_token
    if not expected:
        logger.error("AGENT_SERVICE_TOKEN 이 설정되지 않아 요청을 차단합니다")
        raise HTTPException(status_code=503, detail="service token is not configured")

    # bytes 로 비교한다. compare_digest 는 비ASCII str 을 받으면 TypeError 를 내는데,
    # 그러면 401 이어야 할 것이 500 이 된다.
    if not hmac.compare_digest(x_service_token.encode("utf-8"), expected.encode("utf-8")):
        raise HTTPException(status_code=401, detail="unauthorized")


class HistoryTurn(BaseModel):
    """이전 대화 한 마디. 클라이언트가 들고 있다가 다시 보낸다."""

    role: Literal["user", "assistant"]
    text: str = Field(min_length=1, max_length=8000)


def _to_provider_messages(turns: list[HistoryTurn]) -> list[dict[str, str]]:
    """대화 이력을 모델이 받는 메시지로 옮긴다.

    ★ **평문 발언만 주고받는다.** 내부 표현(thinking 블록, tool_use/tool_result)을
      브라우저까지 왕복시키면 두 가지가 동시에 깨진다 — 검색해 온 문서 원문이
      클라이언트로 새고, 클라이언트가 도구 결과를 위조해 넣을 수 있게 된다.
      모델은 자기가 이전에 한 **답변**만 기억하고, 근거가 다시 필요하면 도구를
      다시 부른다. 맥락은 이어지면서 경계는 그대로다.

    ★ 순서를 여기서 바로잡는다. Anthropic 은 user 로 시작하는 교대 배열을 요구하고
      어긋나면 400 이 난다. 클라이언트가 보낸 배열을 그대로 믿으면 사용자 입력만으로
      API 를 깨뜨릴 수 있다 — 앞쪽 assistant 는 버리고, 같은 역할이 연달아 오면
      뒤엣것을 버린다.
    """
    messages: list[dict[str, str]] = []
    for turn in turns:
        if not messages and turn.role != "user":
            continue
        if messages and messages[-1]["role"] == turn.role:
            continue
        messages.append({"role": turn.role, "content": turn.text})

    # 이력의 끝은 assistant 여야 한다 — 뒤에 이번 사용자 발언이 붙기 때문이다.
    if messages and messages[-1]["role"] == "user":
        messages.pop()

    return messages


class MessageRequest(BaseModel):
    text: str = Field(min_length=1, max_length=8000)

    # 대화 이력. 상한을 두는 이유는 비용이다 — 매 턴마다 전체가 다시 청구되므로
    # 길이를 클라이언트에 맡기면 한 사람이 요금을 무한정 늘릴 수 있다.
    history: list[HistoryTurn] = Field(default_factory=list, max_length=20)

    # 신원은 게이트웨이가 Entra 토큰을 검증해서 넘긴다. 클라이언트의 주장이 아니다.
    #
    # ★ 기본값을 두지 않는다. "dev-user" 가 기본값이던 동안에는 신원을 안 붙인
    #   호출자도 그냥 통과했고, 그 상태로 Teams 가 붙으면 감사 로그와 org 격리가
    #   동시에 무의미해진다 (TEAMS_TAB_DESIGN.md 4.3).
    #   형식은 `{tid}:{oid}` — oid 는 테넌트 안에서만 유일하다 (같은 문서 3.4).
    internal_user_id: str = Field(min_length=1, max_length=200)

    # 테넌트 식별자(Entra tid). 지금은 검색이 이 값을 쓰지 않지만, org 필터가
    # 붙고 나면 None 은 "결과 0건"이 된다 — 열리는 쪽이 아니라 닫히는 쪽이다.
    org_id: str | None = None
    roles: list[str] = Field(default_factory=list)

    # 계정 언어 (`ko-kr`). 게이트웨이가 Entra 클레임 `xms_pl` 에서 뽑아 넘긴다.
    # 없을 수 있고, 없으면 인격의 기본 규칙(질문한 언어로 답한다)만 적용된다.
    locale: str | None = Field(default=None, max_length=35)


class ToolTraceOut(BaseModel):
    name: str
    tier: str
    outcome: str
    latency_ms: int
    chain_position: int


class MessageResponse(BaseModel):
    text: str
    refused: bool
    iterations: int
    tool_trace: list[ToolTraceOut]
    usage: dict[str, int]


@app.get("/health")
def health() -> dict[str, Any]:
    registry: ToolRegistry | None = _state.get("registry")
    return {
        "status": "ok",
        "model": settings.anthropic_model,
        "tools": [s.name for s in registry.specs] if registry else [],
        "tool_count": len(registry) if registry else 0,
    }


@app.get("/tools", dependencies=[Depends(require_service_token)])
def list_tools() -> list[dict[str, Any]]:
    registry: ToolRegistry = _state["registry"]
    return [
        {
            "name": s.name,
            "tier": s.tier,
            "description": s.description,
            "inject_context": list(s.inject_context),
        }
        for s in registry.specs
    ]


@app.post(
    "/agent/message",
    response_model=MessageResponse,
    dependencies=[Depends(require_service_token)],
)
def agent_message(req: MessageRequest) -> MessageResponse:
    agent: Agent | None = _state.get("agent")
    if agent is None:
        raise HTTPException(status_code=503, detail="agent not ready")

    if not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY is not configured")

    result = agent.run(
        user_text=req.text,
        context=AgentContext(
            internal_user_id=req.internal_user_id,
            org_id=req.org_id,
            roles=tuple(req.roles),
            locale=req.locale,
        ),
        history=_to_provider_messages(req.history),
    )

    return MessageResponse(
        text=result.text,
        refused=result.refused,
        iterations=result.iterations,
        tool_trace=[
            ToolTraceOut(
                name=t.name,
                tier=t.tier,
                outcome=t.outcome,
                latency_ms=t.latency_ms,
                chain_position=t.chain_position,
            )
            for t in result.tool_trace
        ],
        usage={
            "input_tokens": result.usage.input_tokens,
            "output_tokens": result.usage.output_tokens,
            "cache_read_tokens": result.usage.cache_read_tokens,
            "cache_write_tokens": result.usage.cache_write_tokens,
        },
    )
