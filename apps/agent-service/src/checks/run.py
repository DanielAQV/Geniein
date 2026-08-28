"""첨부 대조를 손으로 한 번 돌려 본다.

    python -m src.checks.run 83

★ 결과만 찍는다. 여기에는 발신 경로가 없다 — 그래서 허용목록을 지나가도 아무에게도
  메시지가 가지 않는다. 실제 발신은 게이트웨이의 /bot/notify 만 한다.
"""

from __future__ import annotations

import json
import logging
import sys

from ..config import get_settings
from ..llm.anthropic_llm import AnthropicLLM
from . import purchase_request


def main() -> int:
    if len(sys.argv) < 2:
        print("사용법: python -m src.checks.run <항목ID>")
        return 2

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    settings = get_settings()
    result = purchase_request.check(
        int(sys.argv[1]),
        requester_email=None,
        llm=AnthropicLLM(settings),
        enforce_allowlist=False,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
