import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()

class Database:
    def __init__(self):
        # Psycopg 3 connection string or params
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
            id, source_document_id, title_kr, summary_kr, perspective_kr, 
            category, tags, confidence_score, relevance_score, thumbnail_url,
            publish_status, published_at, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), %s, %s, %s, %s, 
            %s, %s, %s, %s, %s,
            %s, %s, NOW(), NOW()
        )
        """
        with self.get_cursor() as cur:
            cur.execute(query, (
                data.get('source_document_id'),
                data.get('title_kr'),
                data.get('summary_kr'),
                data.get('perspective_kr'),
                data.get('category', 'oda'),
                data.get('tags', []),
                0.9, # default confidence
                data.get('relevance_score', 0),
                data.get('thumbnail_url'),
                data.get('publish_status', 'draft'),
                data.get('published_at', 'NOW()')
            ))

    def is_duplicate(self, source_url):
        query = "SELECT id FROM ai_posts WHERE source_document_id = %s LIMIT 1"
        with self.get_cursor() as cur:
            cur.execute(query, (source_url,))
            return cur.fetchone() is not None

    def close(self):
        self.conn.close()
