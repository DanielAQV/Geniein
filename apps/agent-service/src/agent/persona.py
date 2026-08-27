"""인격 로더 — 인격은 요구사항이므로 설정이어야 한다 (3.2.5).

에이전트는 브랜드 자산이고 장기적으로 고객사에 함께 나간다. 말투는 조직별로
조정 가능해야 하지만, 안전 규칙은 조정 대상이 아니다.

★ 지금 코어(default.yaml)에 있는 인격은 **지니와 마이키가 함께 쓴다.** org 파일은
  이름과 소속(identity)만 덮고 tone/behavior 는 코어를 그대로 쓴다 — 두 법인이
  같은 성격을 쓰기로 했기 때문이다. 그래서 identity 기본값도 지니로 둔다.

★ constraints 는 병합하지 않는다. org 오버라이드에 constraints 가 들어와도
  무시하고 항상 코어 값을 쓴다. 이 분리가 없으면 "설정으로 안전 규칙을
  무력화하는 경로"가 생긴다.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger(__name__)

CORE_PERSONA = "default"

#: 인격 키로 허용하는 모양. 키가 그대로 파일 이름(`{키}.yaml`)이 되므로 경로가
#: 될 수 있는 문자를 막는다. 값이 .env 에서 오더라도 오타 하나가 디렉터리 밖을
#: 가리키게 두지 않는다.
_KEY_RE = re.compile(r"[a-z0-9][a-z0-9_-]*")


class Persona:
    def __init__(self, data: dict[str, Any], core_constraints: list[str]) -> None:
        self._data = data
        self._constraints = core_constraints

    @property
    def name(self) -> str:
        return (self._data.get("identity") or {}).get("name", "지니")

    def system_prompt(self, *, tool_count: int) -> str:
        identity = self._data.get("identity") or {}
        tone = self._data.get("tone") or {}
        behavior = self._data.get("behavior") or {}

        parts: list[str] = []

        parts.append(
            f"당신은 {identity.get('name', '지니')}입니다. "
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


def parse_org_map(raw: str) -> dict[str, str]:
    """`tid:키,tid:키` → `{소문자 tid: 키}`.

    ★ 못 알아먹을 항목은 버리고 경고만 남긴다. 표 하나가 어긋났다고 뇌 전체가
      안 뜨면 멀쩡한 테넌트까지 같이 죽는다. 반대로 **매핑된 인격 파일이 없는
      것**은 기동을 막는다 (load_org_personas) — 그건 오타가 아니라 배포 누락이고,
      조용히 넘어가면 사용자가 다른 이름의 에이전트를 만나게 된다.
    """
    mapping: dict[str, str] = {}
    for entry in raw.split(","):
        entry = entry.strip()
        if not entry:
            continue
        tid, _, key = entry.partition(":")
        tid, key = tid.strip().lower(), key.strip().lower()
        if not tid or not key:
            logger.warning("PERSONA_ORG_MAP 항목을 읽을 수 없습니다: %r (형식은 `tid:키`)", entry)
            continue
        if not _KEY_RE.fullmatch(key):
            logger.warning("인격 키로 쓸 수 없는 값입니다: %r", key)
            continue
        if tid in mapping and mapping[tid] != key:
            logger.warning("테넌트 %s… 가 두 번 나옵니다. 뒤엣것(%s)을 씁니다.", tid[:8], key)
        mapping[tid] = key
    return mapping


def load_org_personas(directory: Path, org_map: dict[str, str]) -> dict[str, Persona]:
    """기동 시 1회. 코어 + 매핑에 나온 인격을 전부 읽어 둔다.

    요청마다 디스크를 읽지 않는 이유는 지연이 아니라 **일관성**이다. 대화 중간에
    파일이 바뀌면 한 대화 안에서 인격이 갈린다.
    """
    personas = {CORE_PERSONA: load_persona(directory)}
    for key in sorted(set(org_map.values())):
        if key == CORE_PERSONA:
            continue
        if not (directory / f"{key}.yaml").exists():
            raise FileNotFoundError(
                f"PERSONA_ORG_MAP 이 가리키는 인격 파일이 없습니다: {directory / f'{key}.yaml'}"
            )
        personas[key] = load_persona(directory, key)
    return personas
