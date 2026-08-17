-- 유나 뇌가 쓰는 Postgres 확장.
-- docker-entrypoint-initdb.d 는 데이터 볼륨이 비어 있을 때만 실행된다.
-- 이미 초기화된 볼륨에 적용하려면: docker compose down -v (데이터 삭제 주의)

CREATE EXTENSION IF NOT EXISTS vector;      -- pgvector: kb_chunks.embedding
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- 한국어 n-gram 유사도 (BM25 보조)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
