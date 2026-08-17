"""인격 로더 — 인격은 요구사항이므로 설정이어야 한다 (3.2.5).

유나는 지니인의 브랜드 자산이고 장기적으로 고객사에 함께 나간다.
말투는 조직별로 조정 가능해야 하지만, 안전 규칙은 조정 대상이 아니다.

★ constraints 는 병합하지 않는다. org 오버라이드에 constraints 가 들어와도
  무시하고 항상 코어 값을 쓴다. 이 분리가 없으면 "설정으로 안전 규칙을
  무력화하는 경로"가 생긴다.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger(__name__)

CORE_PERSONA = "default"


class Persona:
    def __init__(self, data: dict[str, Any], core_constraints: list[str]) -> None:
        self._data = data
        self._constraints = core_constraints

    @property
    def name(self) -> str:
        return (self._data.get("identity") or {}).get("name", "유나")

    def system_prompt(self, *, tool_count: int) -> str:
        identity = self._data.get("identity") or {}
        tone = self._data.get("tone") or {}
        behavior = self._data.get("behavior") or {}

        parts: list[str] = []

        parts.append(
            f"당신은 {identity.get('name', '유나')}입니다. "
            f"{identity.get('role', '업무 지원 에이전트')}."
        )
        if identity.get("intro"):
            parts.append(str(identity["intro"]).strip())

        tone_lines = [
            f"- 말투: {tone['register']}" if tone.get("register") else None,
            f"- 분량: {tone['verbosity']}" if tone.get("verbosity") else None,
            f"- 호칭: {tone['address']}" if tone.get("address") else None,
        ]
        tone_lines = [t for t in tone_lines if t]
        if tone.get("guidance"):
            tone_lines.append(str(tone["guidance"]).strip())
        if tone_lines:
            parts.append("## 대화 방식\n" + "\n".join(tone_lines))

        behavior_lines = [str(v).strip() for v in behavior.values() if v]
        if behavior_lines:
            parts.append("## 행동 지침\n" + "\n\n".join(behavior_lines))

        # 도구가 없을 때 "도구를 쓰려 시도하지 말라"를 명시한다.
        # 폴백을 명시하지 않으면 "안녕"에도 억지로 도구를 부른다 (3.2.3).
        if tool_count == 0:
            parts.append(
                "## 도구\n"
                "현재 사용할 수 있는 도구가 없습니다. "
                "규정 조회처럼 근거가 필요한 질문을 받으면, 아직 자료를 조회할 수 없다고 "
                "솔직히 밝히고 담당자 확인을 안내하세요. 내용을 지어내지 마세요."
            )
        else:
            parts.append(
                "## 도구\n"
                "질문에 답하는 데 필요하면 도구를 사용하세요. 여러 도구를 이어서 "
                "사용해도 됩니다. 반대로 인사·잡담처럼 도구가 필요 없는 대화에는 "
                "도구를 호출하지 마세요."
            )

        # ★ 항상 마지막에, 항상 코어 값으로
        parts.append("## 반드시 지킬 것\n" + "\n".join(f"- {c}" for c in self._constraints))

        return "\n\n".join(parts)


def load_persona(directory: Path, org: str | None = None) -> Persona:
    core_path = directory / f"{CORE_PERSONA}.yaml"
    if not core_path.exists():
        raise FileNotFoundError(f"코어 인격 파일이 없습니다: {core_path}")

    core: dict[str, Any] = yaml.safe_load(core_path.read_text(encoding="utf-8")) or {}
    core_constraints: list[str] = list(core.get("constraints") or [])

    data = {k: v for k, v in core.items()}

    if org:
        override_path = directory / f"{org}.yaml"
        if override_path.exists():
            override: dict[str, Any] = yaml.safe_load(override_path.read_text(encoding="utf-8")) or {}
            if "constraints" in override:
                logger.warning(
                    "인격 오버라이드 '%s' 가 constraints 를 덮어쓰려 했습니다. 무시합니다.", org
                )
            for key in ("identity", "tone", "behavior"):
                if key in override:
                    data[key] = {**(data.get(key) or {}), **(override[key] or {})}

    # constraints 는 병합 대상이 아니다 — 항상 코어 값
    data["constraints"] = core_constraints
    return Persona(data, core_constraints)
