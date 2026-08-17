"""BGE-M3 임베딩 (설계문서 3.5).

왜 로컬 모델인가: Anthropic 은 임베딩 엔드포인트를 제공하지 않는다. 외부 임베딩
API 를 쓰면 **색인 단계에서 문서 원문이 통째로 외부로 나간다** — 답변 생성보다
먼저 새는 경로다. BGE-M3 는 이 경로를 없애면서 한국어·베트남어 성능도 강하다.

차원 1024 는 `kb_chunks.embedding vector(1024)` 와 맞아야 한다. 모델을 바꾸면
전체 재색인이므로 여기서 검증하고 어긋나면 즉시 실패시킨다.

★ 지연 로드다. torch + CUDA 휠이 3GB 대라 이 모듈을 임포트하는 것만으로
대화 경로가 무거워지면 안 된다. 실제 로드는 첫 encode() 에서 일어난다.
"""

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

        # ★ fp16 으로 올린다. fp32 는 가중치만 2.2GB 라 WSL 기본 메모리 상한(4GB)에서
        #   OOM 으로 죽는다 (실측: anon-rss 2.4GB 에서 oom-kill). fp16 은 그 절반이고
        #   검색 품질 차이는 코사인 유사도 소수 셋째 자리 수준이다.
        #
        #   ⚠ 색인과 질의가 **같은 정밀도**여야 한다. 정밀도를 바꾸면 이미 색인된
        #     벡터와 미세하게 어긋나므로 전체 재색인이 따라와야 한다.
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
    """텍스트를 1024차원 벡터로.

    코사인 유사도로 검색하므로 정규화해서 내보낸다 — pgvector 의
    `vector_cosine_ops` 인덱스와 짝이 맞는다.

    is_query 는 지금 동작을 바꾸지 않는다. BGE-M3 는 비대칭 프리픽스(E5 계열의
    "query:"/"passage:")를 요구하지 않기 때문이다. 인자를 남겨두는 것은 호출부가
    의도를 드러내게 하기 위해서다 — 프리픽스가 필요한 모델로 갈아끼울 때
    호출부를 고치지 않고 이 함수 안에서 끝난다.
    """
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
