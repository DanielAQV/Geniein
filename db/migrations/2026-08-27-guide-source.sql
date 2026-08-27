-- 가이드를 색인하려면 두 제약을 넓혀야 한다.
--
--   source        'repo'      — 저장소에 텍스트로 사는 문서 (git 이 갱신 경로다)
--   source_format 'markdown'  — 실제 포맷. 'pdf_scan' 으로 위장하면 나중에 그 값을
--                               믿는 코드가 스캔본처럼 다룬다.
--
-- 운영 DB 에 한 번 적용한다. db/init 은 새 DB 에만 실행되므로 기존 DB 는 이 파일로.
--
--   psql -h 127.0.0.1 -p 5433 -U genie -d geniein_db -f db/migrations/2026-08-27-guide-source.sql

BEGIN;

ALTER TABLE kb_documents DROP CONSTRAINT IF EXISTS kb_documents_source_chk;
ALTER TABLE kb_documents ADD  CONSTRAINT kb_documents_source_chk
    CHECK (source IN ('upload', 'sharepoint', 'repo'));

ALTER TABLE kb_documents DROP CONSTRAINT IF EXISTS kb_documents_format_chk;
ALTER TABLE kb_documents ADD  CONSTRAINT kb_documents_format_chk
    CHECK (source_format IS NULL
           OR source_format IN ('docx', 'pdf_text', 'pdf_scan', 'hwp', 'markdown'));

COMMIT;
