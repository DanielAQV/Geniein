"""유나의 뇌 — FastAPI. 인터넷에 직접 노출되지 않고 NestJS 게이트웨이를 통해서만 불린다.

배치 설정만 믿지 않고 여기서도 호출자를 확인한다 (docs/TEAMS_TAB_DESIGN.md 4.2).
"""

from __future__ import annotations

import hmac
import logging
from contextlib import asynccontextmanager
from typing import Any, Iterator, Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .agent import Agent, AgentContext, load_persona
from .agent.wire import error_json, event_json
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
    # 도구·인격은 기동 시 1회 로드. 대화 중 바꾸면 프롬프트 캐시가 전멸한다.
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
    """호출자가 우리 게이트웨이인가. 설정이 없으면 통과시키지 않는다.

    `/health` 에는 걸지 않는다 — healthcheck 가 토큰 없이 불러야 한다.
    """
    expected = settings.agent_service_token
    if not expected:
        logger.error("AGENT_SERVICE_TOKEN 이 설정되지 않아 요청을 차단합니다")
        raise HTTPException(status_code=503, detail="service token is not configured")

    # bytes 로 비교한다. compare_digest 는 비ASCII str 에 TypeError 를 내서 401 이 500 이 된다.
    if not hmac.compare_digest(x_service_token.encode("utf-8"), expected.encode("utf-8")):
        raise HTTPException(status_code=401, detail="unauthorized")


class HistoryTurn(BaseModel):
    """이전 대화 한 마디. 클라이언트가 들고 있다가 다시 보낸다."""

    role: Literal["user", "assistant"]
    text: str = Field(min_length=1, max_length=8000)


def _to_provider_messages(turns: list[HistoryTurn]) -> list[dict[str, str]]:
    """대화 이력을 모델이 받는 메시지로 옮긴다.

    평문 발언만 오간다 — thinking/tool_result 를 왕복시키면 문서 원문이 새고
    클라이언트가 도구 결과를 위조할 수 있다. 순서도 여기서 바로잡는다
    (Anthropic 은 user 로 시작하는 교대 배열이 아니면 400 을 낸다).
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

    # 이력은 매 턴 통째로 재청구된다 — 길이를 클라이언트에 맡기지 않는다.
    history: list[HistoryTurn] = Field(default_factory=list, max_length=20)

    # 신원은 게이트웨이가 Entra 토큰에서 확정해 넘긴다. 기본값을 두지 않는다 —
    # 기본값이 있으면 신원을 안 붙인 호출자도 통과해 org 격리가 무의미해진다.
    internal_user_id: str = Field(min_length=1, max_length=200)

    # 테넌트 식별자(Entra tid). org 필터가 붙으면 None 은 "결과 0건"이다.
    org_id: str | None = None
    roles: list[str] = Field(default_factory=list)

    # 계정 언어 (`ko-kr`). Entra 클레임 `xms_pl` 에서 오고, 없을 수 있다.
    locale: str | None = Field(default=None, max_length=35)

    # 탭에서 직접 고른 언어. 계정 언어보다 강한 근거다. 모르는 값이 와도 400 을
    # 내지 않는다 — 표시 설정 하나 때문에 검색이 실패하면 안 된다. 길이만 막는다.
    chosen_lang: str | None = Field(default=None, max_length=16)


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
            chosen_lang=req.chosen_lang,
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


# 스트리밍은 NDJSON 이다. EventSource 로는 POST·Authorization 을 못 보내 어차피
# fetch 로 읽고, 중간 계층 둘이 바이트를 그대로 흘리므로 줄 단위가 편하다.
# `X-Accel-Buffering: no` 는 nginx 설정이 어긋났을 때를 위한 한 겹 더다.


@app.post("/agent/message/stream", dependencies=[Depends(require_service_token)])
def agent_message_stream(req: MessageRequest) -> StreamingResponse:
    agent: Agent | None = _state.get("agent")
    if agent is None:
        raise HTTPException(status_code=503, detail="agent not ready")

    if not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY is not configured")

    def lines() -> Iterator[str]:
        try:
            for event in agent.stream(
                user_text=req.text,
                context=AgentContext(
                    internal_user_id=req.internal_user_id,
                    org_id=req.org_id,
                    roles=tuple(req.roles),
                    locale=req.locale,
                    chosen_lang=req.chosen_lang,
                ),
                history=_to_provider_messages(req.history),
            ):
                yield event_json(event) + "\n"
        except Exception:  # noqa: BLE001
            # 헤더가 이미 200 으로 나갔으므로 실패도 스트림 안에서 말해야 한다.
            logger.exception("스트리밍 중 실패")
            yield error_json("internal") + "\n"

    return StreamingResponse(
        lines(),
        media_type="application/x-ndjson",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-store"},
    )
