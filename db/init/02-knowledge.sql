-- 지식베이스 스키마 — 설계문서 4장 / 5.1
--
-- ★ 소유권: 이 테이블들은 agent-service(Python) 가 소유한다.
--   NestJS/TypeORM 엔티티를 만들지 않는다. 엔티티가 없으므로
--   synchronize:true 가 이 테이블을 건드리지 않는다.
--
-- 멱등하게 작성한다 — 여러 번 적용해도 안전해야 한다.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ── 문서 ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kb_documents (
    id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    source              text NOT NULL,          -- 'upload' | 'sharepoint'
    source_url          text,
    title               text NOT NULL,

    -- 개정 감지 (5.1 "문서 최신성"). 원본 바이트 해시.
    content_hash        text,

    -- 권한 인식 검색 (5.1). 검색 시 필터로 쓴다.
    acl_group           text[] NOT NULL DEFAULT '{}',
    -- ★ 정확도 요구사항. Requester/Approver/Admin 가이드가 실제로 갈려 있다.
    role_scope          text[] NOT NULL DEFAULT '{}',
    lang                text[] NOT NULL DEFAULT '{}',   -- ['ko','en','vi']

    -- 포맷 등급 (5.1). A=docx / B=텍스트PDF / C=스캔·HWP
    source_format       text,                   -- 'docx'|'pdf_text'|'pdf_scan'|'hwp'
    -- true 면 청크 텍스트를 답변 근거로 쓰지 않는다 (원본 이미지를 주입)
    ocr_used            boolean NOT NULL DEFAULT false,

    -- 계열마다 조항 체계가 다르다 (5.1.1). 'PART/Article' | 'doc_no+page'
    citation_scheme     text,

    effective_date      date,                   -- 문서 내부 시행일
    -- ★ NULL 이면 유효본. 검색은 이걸로 필터한다 (구버전 병존 대응)
    superseded_at       timestamptz,

    source_modified_at  timestamptz,
    indexed_at          timestamptz,

    org_id              uuid,
    created_at          timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT kb_documents_source_chk
        CHECK (source IN ('upload', 'sharepoint')),
    CONSTRAINT kb_documents_format_chk
        CHECK (source_format IS NULL
               OR source_format IN ('docx', 'pdf_text', 'pdf_scan', 'hwp'))
);

-- 같은 출처의 같은 문서를 두 번 넣지 않는다 (source_url 이 있는 경우에만)
CREATE UNIQUE INDEX IF NOT EXISTS kb_documents_source_url_uniq
    ON kb_documents (source, source_url)
    WHERE source_url IS NOT NULL;

-- 개정 감지: 해시 비교
CREATE INDEX IF NOT EXISTS kb_documents_content_hash_idx
    ON kb_documents (content_hash);

-- 검색 필터: 유효본만
CREATE INDEX IF NOT EXISTS kb_documents_live_idx
    ON kb_documents (org_id)
    WHERE superseded_at IS NULL;


-- ── 청크 ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kb_chunks (
    id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 재색인은 "기존 청크 삭제 후 재삽입"이다. append 만 하면 구버전이 계속 걸린다 (5.1).
    document_id  uuid NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
    ordinal      int  NOT NULL,

    content      text NOT NULL,

    -- BM25 용. 한국어는 Postgres 내장 사전이 없으므로 'simple' 로 토큰화하고
    -- 고유명사·금액 재현율은 pg_trgm 이 보완한다 (5.1 "하이브리드 + 필터").
    tsv          tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,

    -- BGE-M3 = 1024차원 (3.5). 모델을 바꾸면 전체 재색인이므로 지금 확정.
    embedding    vector(1024),

    token_count  int,
    created_at   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT kb_chunks_ordinal_uniq UNIQUE (document_id, ordinal)
);

-- 벡터 검색
CREATE INDEX IF NOT EXISTS kb_chunks_embedding_idx
    ON kb_chunks USING hnsw (embedding vector_cosine_ops);

-- BM25 검색
CREATE INDEX IF NOT EXISTS kb_chunks_tsv_idx
    ON kb_chunks USING gin (tsv);

-- 한국어 부분일치 보완 (고유명사·사업명·금액)
CREATE INDEX IF NOT EXISTS kb_chunks_content_trgm_idx
    ON kb_chunks USING gin (content gin_trgm_ops);

-- 부모-문서 주입 시 문서 단위 조회 (5.1 "주입 단위: 청크가 아니라 부모 문서")
CREATE INDEX IF NOT EXISTS kb_chunks_document_idx
    ON kb_chunks (document_id, ordinal);


COMMENT ON TABLE  kb_documents IS '지식베이스 문서. 설계문서 4장 / 5.1';
COMMENT ON TABLE  kb_chunks    IS '문서 청크. 검색 단위이지 답변 근거 단위가 아니다 (부모-문서 주입)';
COMMENT ON COLUMN kb_documents.superseded_at IS 'NULL 이면 유효본. 검색에서 이 조건으로 필터한다';
COMMENT ON COLUMN kb_documents.ocr_used      IS 'true 면 청크 텍스트를 답변 근거로 쓰지 않는다';
COMMENT ON COLUMN kb_chunks.embedding        IS 'BGE-M3 1024차원. 모델 변경 시 전체 재색인 필요';
