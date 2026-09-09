"""BGE-M3 임베딩 (설계문서 3.5)."""

from __future__ import annotations

import logging
import threading
from typing import Any, Sequence

logger = logging.getLogger(__name__)

MODEL_NAME = "BAAI/bge-m3"
EXPECTED_DIM = 1024

_model: Any = None
_lock = threading.Lock()


class EmbeddingUnavailable(RuntimeError):
    """임베딩 스택이 설치되지 않았다. requirements-embed.txt 참조."""


def _load() -> Any:
    global _model
    if _model is not None:
        return _model

    with _lock:
        if _model is not None:  # 락 대기 중에 다른 스레드가 로드했을 수 있다
            return _model

        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:  # noqa: TRY003
            raise EmbeddingUnavailable(
                "sentence-transformers 가 없습니다. "
                "apps/agent-service/requirements-embed.txt 상단 주석을 참조해 "
                "torch 와 함께 설치하세요."
            ) from exc

        logger.info("BGE-M3 로드 중 (최초 실행은 모델 2.3GB 다운로드로 오래 걸립니다)")

        # fp16 으로 올린다. fp32 는 WSL 기본 메모리 상한에서 OOM 으로 죽는다.
        # ⚠ 색인과 질의가 같은 정밀도여야 한다. 바꾸면 전체 재색인이 따라온다.
        try:
            model = SentenceTransformer(MODEL_NAME, model_kwargs={"dtype": "float16"})
        except Exception as exc:  # noqa: BLE001 — 옵션 이름은 라이브러리 버전을 탄다
            logger.warning("fp16 로드 실패(%s). 기본 정밀도로 재시도합니다.", exc)
            model = SentenceTransformer(MODEL_NAME)

        # sentence-transformers 5.x 에서 이름이 바뀌었다 (구 이름은 경고 후 동작)
        get_dim = getattr(model, "get_embedding_dimension", None) or getattr(
            model, "get_sentence_embedding_dimension"
        )
        dim = get_dim()
        if dim != EXPECTED_DIM:
            raise EmbeddingUnavailable(
                f"임베딩 차원이 {dim} 입니다. kb_chunks.embedding 은 vector({EXPECTED_DIM}) 이므로 "
                f"이대로 색인하면 삽입이 실패합니다. 모델을 바꿨다면 스키마와 전체 재색인이 함께 가야 합니다."
            )

        device = getattr(model, "device", "?")
        logger.info("BGE-M3 준비 완료 — 차원=%d device=%s", dim, device)
        _model = model
        return _model


def encode(texts: Sequence[str], *, is_query: bool = False) -> list[list[float]]:
    """텍스트를 1024차원 벡터로."""
    if not texts:
        return []
    model = _load()
    vectors = model.encode(list(texts), normalize_embeddings=True)
    return [[float(x) for x in row] for row in vectors]


def count_tokens(texts: Sequence[str]) -> list[int]:
    """청크 토큰 수. kb_chunks.token_count 용이고 실패해도 색인을 막지 않는다."""
    if not texts:
        return []
    try:
        tokenizer = _load().tokenizer
        return [len(tokenizer.encode(t, add_special_tokens=False)) for t in texts]
    except Exception:  # noqa: BLE001 — 통계 컬럼이 색인을 막을 이유는 없다
        logger.warning("토큰 수 계산에 실패했습니다. token_count 는 NULL 로 둡니다.")
        return [0] * len(texts)
