"""유나의 뇌 — FastAPI.

이 서비스는 인터넷에 직접 노출되지 않는다. NestJS(게이트웨이)가 앞에 서고,
이쪽은 내부망에서만 호출된다 (RAG_SERVICE_URL / AI_ALLOWED_IPS 의 원래 의도).
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
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


class MessageRequest(BaseModel):
    text: str = Field(min_length=1, max_length=8000)
    # 신원은 게이트웨이가 세션에서 넘긴다. 클라이언트가 자유롭게 주장하는 값이 아니다.
    # (0단계에서는 인증 전이므로 기본값을 쓴다 — SSO 도입 시 게이트웨이가 채운다)
    internal_user_id: str = "dev-user"
    org_id: str | None = None
    roles: list[str] = Field(default_factory=list)


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


@app.get("/tools")
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


@app.post("/agent/message", response_model=MessageResponse)
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
        ),
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
