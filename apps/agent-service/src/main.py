"""에이전트의 뇌 — FastAPI.

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
from typing import Any, Iterator, Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from .agent import CORE_PERSONA, Agent, AgentContext, load_org_personas, parse_org_map
from .agent.wire import error_json, event_json
from .config import get_settings
from .llm.anthropic_llm import AnthropicLLM
from .tools.registry import ToolRegistry

settings = get_settings()
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)-7s %(name)s | %(message)s",
)
logger = logging.getLogger("brain")

_state: dict[str, Any] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 도구와 인격은 기동 시 1회 로드한다.
    # 대화 중 도구를 동적으로 추가/제거하지 않는다 — 프롬프트 캐시가 전멸한다 (3.2.1).
    registry = ToolRegistry.load(settings.tools_dir)
    llm = AnthropicLLM(settings)

    # ★ 인격은 **테넌트마다 다르다.** 지니(코어)와 마이키(AQV)는 같은 뇌·같은 성격을
    #   쓰고 이름과 소속만 다르다 (personas/aqv.yaml). 어느 테넌트가 누구인지는
    #   PERSONA_ORG_MAP 이 정하고, 그 값은 .env 에만 있다 (config.py).
    #
    #   Agent 는 llm/registry/persona 를 들고 있는 얇은 객체라 인격 수만큼 만들어도
    #   비용이 없다. 요청마다 조립하지 않는 이유는 대화 도중 인격이 바뀌지 않게
    #   하기 위해서다.
    org_map = parse_org_map(settings.persona_org_map)
    personas = load_org_personas(settings.personas_dir, org_map)

    _state["registry"] = registry
    _state["llm"] = llm
    _state["personas"] = personas
    _state["persona_org_map"] = org_map
    _state["unmapped_orgs"] = set()
    _state["agents"] = {
        key: Agent(
            llm=llm,
            registry=registry,
            persona=persona,
            max_iterations=settings.max_tool_iterations,
        )
        for key, persona in personas.items()
    }
    logger.info(
        "뇌 기동 — 모델=%s effort=%s 도구=%d개 %s",
        settings.anthropic_model,
        settings.anthropic_effort,
        len(registry),
        [s.name for s in registry.specs],
    )
    logger.info(
        "인격 %d개 — %s",
        len(personas),
        ", ".join(f"{key}({persona.name})" for key, persona in personas.items()),
    )
    # tid 는 앞 8자만 남긴다. 어느 테넌트가 어느 인격인지 확인하는 데는 충분하고,
    # 로그가 흘러도 식별자 전체가 같이 흐르지는 않는다.
    for tid, key in org_map.items():
        logger.info("테넌트 %s… → 인격 %s(%s)", tid[:8], key, personas[key].name)
    if not org_map:
        logger.info("PERSONA_ORG_MAP 이 비어 있어 모든 테넌트가 %s 인격을 씁니다.", CORE_PERSONA)

    yield
    _state.clear()


app = FastAPI(title="Agent Brain", version="0.1.0", lifespan=lifespan)


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


def _agent_for(org_id: str | None) -> Agent:
    """이 요청에 답할 에이전트(=인격)를 고른다.

    ★ 고르는 근거는 **게이트웨이가 검증한 `tid`** 하나다. 클라이언트가 인격을
      지정하는 필드는 없다 — 있으면 남의 회사 에이전트 이름을 뒤집어쓸 수 있다.
      (인격이 데이터를 여는 것은 아니지만, 신원은 신원이다.)

    ★ 매핑에 없는 테넌트는 코어(지니)로 떨어진다. 열리는 쪽이 아니라 **이름만**
      기본값이 되는 것이라 요청을 막지 않는다. 다만 처음 한 번은 경고를 남긴다 —
      "마이키가 왜 안 나오지"의 답이 대개 여기 있다.
    """
    agents: dict[str, Agent] | None = _state.get("agents")
    if not agents:
        raise HTTPException(status_code=503, detail="agent not ready")

    key = _state["persona_org_map"].get((org_id or "").lower())
    if key is None:
        seen: set[str] = _state["unmapped_orgs"]
        if org_id and org_id not in seen:
            seen.add(org_id)
            logger.warning(
                "테넌트 %s… 에 매핑된 인격이 없어 %s 를 씁니다 (PERSONA_ORG_MAP 확인)",
                org_id[:8],
                CORE_PERSONA,
            )
        key = CORE_PERSONA

    return agents[key]


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

    # 사용자가 탭에서 직접 고른 언어 (`ko`/`vi`/`en`). 계정 언어보다 강한 근거다
    # (뇌의 _language_hint 참조). 신원이 아니라 표시 설정이므로 클라이언트에서 와도 된다.
    #
    # ★ 모르는 값이 와도 400 을 내지 않는다. 이 값은 인가 경계가 아니고, 표시 설정
    #   하나 때문에 검색이 실패하는 것이 더 나쁘다. 판정 함수가 조용히 다음 근거로
    #   넘어간다. 길이만 막는다 — 프롬프트에 긴 문자열이 실리지 않게.
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
    # 인격 **키**만 싣는다 (이름도, 테넌트 GUID 도 아니다). 배포 후 "마이키가 실렸나"를
    # 토큰 없이 확인할 수 있으면 충분하고, 그 이상은 이 공개 엔드포인트의 몫이 아니다.
    return {
        "status": "ok",
        "model": settings.anthropic_model,
        "tools": [s.name for s in registry.specs] if registry else [],
        "tool_count": len(registry) if registry else 0,
        "personas": sorted(_state.get("personas") or {}),
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
    agent = _agent_for(req.org_id)

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


# ── 스트리밍 ───────────────────────────────────────────────────────────
#
# **NDJSON** 이다 (한 줄에 JSON 하나). SSE 가 아닌 이유:
#
#   · 브라우저의 EventSource 는 POST 도 Authorization 헤더도 못 보낸다. 이 경로는
#     둘 다 필요하므로 어차피 fetch + ReadableStream 으로 읽는다. 그러면 SSE 의
#     `event:`/`data:` 규약은 파싱 부담만 남는다.
#   · 중간 계층이 둘(NestJS, Next BFF)이고 둘 다 바이트를 그대로 흘린다. 줄 단위
#     포맷이면 계층마다 재조립할 필요가 없다.
#
# ★ `X-Accel-Buffering: no` 를 붙인다. 두 nginx 는 `proxy_buffering off` 가 이미
#   들어가 있지만, 설정이 한 번 어긋나면 스트리밍이 조용히 사라진다 —
#   증상이 "느려졌다"로만 보여서 원인을 찾기 어렵다. 헤더로 한 겹 더 잠근다.


@app.post("/agent/message/stream", dependencies=[Depends(require_service_token)])
def agent_message_stream(req: MessageRequest) -> StreamingResponse:
    # ★ 인격은 스트림을 열기 **전에** 고른다. 제너레이터 안에서 고르면 예외가
    #   200 헤더 뒤에 터진다.
    agent = _agent_for(req.org_id)

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
            # ★ 여기서 예외를 밖으로 내보내면 안 된다. 헤더는 이미 200 으로 나갔으므로
            #   HTTP 상태로는 실패를 알릴 수 없고, 커넥션만 끊기면 화면에는 "답변이
            #   중간에 멈춘" 것으로 보인다. 실패도 스트림 안에서 말해야 한다.
            logger.exception("스트리밍 중 실패")
            yield error_json("internal") + "\n"

    return StreamingResponse(
        lines(),
        media_type="application/x-ndjson",
        headers={"X-Accel-Buffering": "no", "Cache-Control": "no-store"},
    )
