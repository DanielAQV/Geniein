"""지식베이스 — 파싱 · 청킹 · 임베딩 · 검색 (설계문서 5.1).

`embed` 는 여기서 재노출하지 않는다. torch 를 끌고 오는 무거운 모듈이므로
필요한 쪽에서 명시적으로 임포트하게 둔다.

★ `search` 함수도 재노출하지 않는다. 서브모듈 이름이 `kb.search` 라
재노출하면 **함수가 같은 이름의 모듈을 가린다** — `from ..kb import search` 가
모듈처럼 보이는데 함수를 받아서 `search.search(...)` 가 AttributeError 로 죽는다.
호출부는 `from ..kb.search import search` 로 명시적으로 가져간다.
"""

from .parse import Chunk, ParsedDoc, chunk_document, load_any
from .search import Hit

__all__ = ["Chunk", "ParsedDoc", "chunk_document", "load_any", "Hit"]
