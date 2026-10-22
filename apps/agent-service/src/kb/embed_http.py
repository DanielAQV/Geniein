"""HTTP 임베딩 백엔드 — 같은 상자에서 이미 돌고 있는 BGE-M3 서버를 빌려 쓴다.

왜 있나: EC2(t4g.medium, 4GB)에는 torch + BGE-M3 를 한 번 더 올릴 자리가 없다.
그런데 같은 상자에 princess 가 BGE-M3(int8 ONNX)를 `127.0.0.1:8090` 에 띄워 두고
있다. 모델이 같고(1024차원, CLS 풀링, 정규화) 인터페이스가 OpenAI 모양
(`POST /v1/embeddings {"input": [...]}`)이라 그대로 쓴다.

★ 로컬 백엔드(fp16 sentence-transformers)와 int8 ONNX 는 벡터가 미세하게 다르다.
  색인과 질의가 **같은 백엔드**여야 한다 — 백엔드를 바꾸면 전체 재색인이 함께 간다.
  (embed.py 의 EMBED_DTYPE 과 같은 규칙.)

외부로 나가지 않는다: 주소는 루프백이다. 설계문서 3.5 의 "문서 원문을 외부 임베딩
API 에 보내지 않는다"는 그대로 지켜진다.
"""

from __future__ import annotations

import logging
import os
from typing import Sequence

import httpx

logger = logging.getLogger(__name__)

EXPECTED_DIM = 1024
DEFAULT_URL = "http://127.0.0.1:8090/v1/embeddings"

# int8 ONNX 서버는 요청 하나를 한 스레드에서 순서대로 돈다. 청크를 너무 많이
# 한 번에 보내면 응답이 분 단위가 되므로 쪼개서 보낸다.
BATCH = 16


class EmbeddingUnavailable(RuntimeError):
    """임베딩 서버에 닿지 못했거나 모양이 다르다."""


def _url() -> str:
    return os.environ.get("EMBED_HTTP_URL", DEFAULT_URL).strip() or DEFAULT_URL


def encode(texts: Sequence[str], *, is_query: bool = False) -> list[list[float]]:
    if not texts:
        return []

    url = _url()
    out: list[list[float]] = []
    items = list(texts)
    try:
        with httpx.Client(timeout=httpx.Timeout(120.0, connect=5.0)) as client:
            for start in range(0, len(items), BATCH):
                batch = items[start : start + BATCH]
                resp = client.post(url, json={"input": batch})
                resp.raise_for_status()
                data = resp.json().get("data") or []
                if len(data) != len(batch):
                    raise EmbeddingUnavailable(
                        f"임베딩 서버가 {len(batch)}개를 받고 {len(data)}개를 돌려줬습니다"
                    )
                for row in sorted(data, key=lambda r: r.get("index", 0)):
                    vec = row.get("embedding")
                    if not isinstance(vec, list) or len(vec) != EXPECTED_DIM:
                        raise EmbeddingUnavailable(
                            f"임베딩 차원이 {len(vec) if isinstance(vec, list) else '?'} 입니다. "
                            f"kb_chunks.embedding 은 vector({EXPECTED_DIM}) 입니다."
                        )
                    out.append([float(x) for x in vec])
    except httpx.HTTPError as exc:
        raise EmbeddingUnavailable(f"임베딩 서버({url})에 닿지 못했습니다: {exc}") from exc

    return out


def count_tokens(texts: Sequence[str]) -> list[int]:
    """서버는 토큰 수를 돌려주지 않는다. 통계 컬럼이라 0 으로 둔다 (embed.py 와 같은 규칙)."""
    return [0] * len(texts)
