"""도구 레지스트리 — 도구는 코드가 아니라 선언(YAML)이다.

설계 문서 3.2.1 / 3.2.2.

로드 시점에 설계 원칙을 "검증으로" 강제한다. 문서로만 적어두면 지켜지지 않는다:
  원칙③  inject_context 키가 input_schema 에 있으면 로드 거부
          → 모델이 신원을 지정할 수 있는 경로를 애초에 만들 수 없다
  원칙④  도구 이름은 ASCII snake_case (^[a-zA-Z0-9_-]{1,64}$)
          → 한글 이름은 API 검증에서 막히고 로컬 LLM 스왑 시에도 위험
"""

from __future__ import annotations

import importlib
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import yaml

from ..llm.base import ToolResult

logger = logging.getLogger(__name__)

NAME_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")
VALID_TIERS = ("read", "draft", "commit")


class ToolDefinitionError(ValueError):
    """도구 선언이 설계 원칙을 위반했다. 로드를 중단한다."""


@dataclass(frozen=True)
class ToolSpec:
    name: str
    tier: str
    description: str
    input_schema: dict[str, Any]
    handler: str
    inject_context: tuple[str, ...] = ()

    @property
    def requires_approval(self) -> bool:
        # commit 등급은 승인 없이 실행되지 않는다 (7장)
        return self.tier == "commit"


def _validate(raw: dict[str, Any], source: Path) -> ToolSpec:
    def fail(msg: str) -> None:
        raise ToolDefinitionError(f"{source.name}: {msg}")

    name = raw.get("name")
    if not name or not isinstance(name, str):
        fail("'name' 이 없습니다")
    if not NAME_PATTERN.match(name):
        fail(
            f"도구 이름 '{name}' 이 ASCII snake_case 규칙을 위반합니다 "
            f"(원칙④). 한글 이름은 API 검증에서 거부됩니다."
        )

    tier = raw.get("tier")
    if tier not in VALID_TIERS:
        fail(f"'tier' 는 {VALID_TIERS} 중 하나여야 합니다 (받은 값: {tier!r})")

    description = raw.get("description")
    if not description or not str(description).strip():
        fail("'description' 이 없습니다 — 설명이 곧 라우팅 정확도입니다 (원칙④)")

    schema = raw.get("input_schema") or {"type": "object", "properties": {}}
    if not isinstance(schema, dict):
        fail("'input_schema' 는 객체여야 합니다")

    handler = raw.get("handler")
    if not handler or ":" not in str(handler):
        fail("'handler' 는 'module.path:function' 형식이어야 합니다")

    inject = tuple(raw.get("inject_context") or ())

    # ★ 원칙③ 강제 — 주입 대상이 모델에게 노출되면 인가 경계가 무너진다
    properties = schema.get("properties") or {}
    leaked = [k for k in inject if k in properties]
    if leaked:
        fail(
            f"inject_context 키 {leaked} 가 input_schema.properties 에 노출돼 있습니다. "
            f"모델이 신원을 지정할 수 있게 되어 프롬프트 인젝션 표면이 됩니다 (원칙③). "
            f"input_schema 에서 제거하세요."
        )

    return ToolSpec(
        name=name,
        tier=tier,
        description=str(description).strip(),
        input_schema=schema,
        handler=str(handler),
        inject_context=inject,
    )


class ToolRegistry:
    def __init__(self, specs: list[ToolSpec]) -> None:
        # 이름순 정렬 — 도구 목록은 프롬프트 프리픽스 맨 앞에 렌더된다.
        # 순서가 흔들리면 프롬프트 캐시가 매번 깨진다 (3.2.1 ①).
        self._specs = sorted(specs, key=lambda s: s.name)
        self._by_name = {s.name: s for s in self._specs}
        self._handlers: dict[str, Callable[..., Any]] = {}

    @classmethod
    def load(cls, directory: Path) -> "ToolRegistry":
        specs: list[ToolSpec] = []
        if not directory.exists():
            logger.warning("도구 디렉터리가 없습니다: %s — 도구 0개로 시작합니다", directory)
            return cls(specs)

        for path in sorted(directory.glob("*.y*ml")):
            raw = yaml.safe_load(path.read_text(encoding="utf-8"))
            if not raw:
                continue
            specs.append(_validate(raw, path))

        logger.info("도구 %d개 로드: %s", len(specs), [s.name for s in specs])
        return cls(specs)

    # ── 조회 ──────────────────────────────────────────────────────

    def __len__(self) -> int:
        return len(self._specs)

    @property
    def specs(self) -> list[ToolSpec]:
        return list(self._specs)

    def get(self, name: str) -> ToolSpec | None:
        return self._by_name.get(name)

    def to_api_schema(self) -> list[dict[str, Any]]:
        """모델에 넘길 도구 정의. inject_context 는 여기 포함되지 않는다."""
        return [
            {
                "name": s.name,
                "description": s.description,
                "input_schema": s.input_schema,
            }
            for s in self._specs
        ]

    # ── 실행 ──────────────────────────────────────────────────────

    def _resolve(self, spec: ToolSpec) -> Callable[..., Any]:
        if spec.name not in self._handlers:
            module_path, _, func_name = spec.handler.partition(":")
            module = importlib.import_module(module_path)
            self._handlers[spec.name] = getattr(module, func_name)
        return self._handlers[spec.name]

    def execute(
        self,
        *,
        name: str,
        tool_call_id: str,
        arguments: dict[str, Any],
        context: dict[str, Any],
        approval_granted: bool = False,
    ) -> ToolResult:
        spec = self.get(name)
        if spec is None:
            return ToolResult(tool_call_id, f"알 수 없는 도구입니다: {name}", is_error=True)

        # commit 등급은 승인 없이 성공할 수 없다.
        # 유나는 승인되지 않은 실행 도구를 "성공적으로 호출"하는 것 자체가 불가능하다.
        if spec.requires_approval and not approval_granted:
            return ToolResult(
                tool_call_id,
                "승인 대기 중입니다. 이 작업은 사용자 승인 후에 실행됩니다.",
                is_error=False,
            )

        # ★ 신원은 서버가 주입한다. 모델 출력에서 오지 않는다 (원칙③)
        kwargs = dict(arguments)
        for key in spec.inject_context:
            kwargs[key] = context.get(key)

        try:
            result = self._resolve(spec)(**kwargs)
        except Exception as exc:  # noqa: BLE001 — 도구 실패는 대화를 죽이지 않는다
            logger.exception("도구 실행 실패: %s", name)
            return ToolResult(tool_call_id, f"도구 실행 중 오류: {exc}", is_error=True)

        return ToolResult(tool_call_id, result if isinstance(result, str) else str(result))
