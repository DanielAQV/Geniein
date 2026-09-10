import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()

class Database:
    def __init__(self):
        self.conn = psycopg.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432'),
            dbname=os.getenv('DB_NAME', 'postgres'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD'),
            autocommit=True
        )

    def get_cursor(self):
        return self.conn.cursor(row_factory=dict_row)

    def insert_insight(self, data):
        query = """
        INSERT INTO ai_posts (
            id, source_document_id,
            title_kr, title_en, title_vn,
            summary_kr, summary_en, summary_vn,
            perspective_kr,
            category, tags, confidence_score, relevance_score, thumbnail_url,
            publish_status, published_at, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), %s,
            %s, %s, %s,
            %s, %s, %s,
            %s,
            %s, %s, %s, %s, %s,
            %s, %s, NOW(), NOW()
        )
        """
        with self.get_cursor() as cur:
            cur.execute(query, (
                data.get('source_document_id'),
                data.get('title_kr'),
                data.get('title_en'),
                data.get('title_vn'),
                data.get('summary_kr'),
                data.get('summary_en'),
                data.get('summary_vn'),
                data.get('perspective_kr'),
                data.get('category', 'oda'),
                data.get('tags', []),
                0.9, # default confidence
                data.get('relevance_score', 0),
                data.get('thumbnail_url'),
                data.get('publish_status', 'draft'),
                data.get('published_at', 'NOW()')
            ))

    # 발행 상태인데 번역이 빠진 글. 초안은 대상이 아니다 — 노출되지 않는 글을
    # 번역해두면 대부분 버려진다(초안은 발행글보다 많다). 수동으로 발행 상태를
    # 바꾼 글은 워커가 다음 회차에 이걸로 주워서 채운다.
    def find_published_missing_translations(self, limit=25):
        query = """
        SELECT id, title_kr, summary_kr
          FROM ai_posts
         WHERE publish_status = 'published'
           AND title_kr IS NOT NULL AND summary_kr IS NOT NULL
           AND (title_en IS NULL OR title_vn IS NULL
                OR summary_en IS NULL OR summary_vn IS NULL)
         ORDER BY published_at DESC NULLS LAST, created_at DESC
         LIMIT %s
        """
        with self.get_cursor() as cur:
            cur.execute(query, (limit,))
            return cur.fetchall()

    def update_translations(self, post_id, t):
        query = """
        UPDATE ai_posts
           SET title_en = %s, title_vn = %s,
               summary_en = %s, summary_vn = %s,
               updated_at = NOW()
         WHERE id = %s
        """
        with self.get_cursor() as cur:
            cur.execute(query, (
                t['title_en'], t['title_vn'],
                t['summary_en'], t['summary_vn'],
                post_id,
            ))

    def is_duplicate(self, source_url):
        query = "SELECT id FROM ai_posts WHERE source_document_id = %s LIMIT 1"
        with self.get_cursor() as cur:
            cur.execute(query, (source_url,))
            return cur.fetchone() is not None

    def close(self):
        self.conn.close()
