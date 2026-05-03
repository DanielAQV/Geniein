import sys
import os
from src.crawlers.rss_crawler import RSSCrawler

# Windows 인코딩 에러 방지 (UTF-8 강제 설정)
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

from src.processor import AIProcessor
from src.db import Database
import time
import requests
import uuid
from pathlib import Path

def main():
    print("🚀 Geniein Strategic AI Worker Started!")
    
    # 이미지 저장 폴더 설정 (프로젝트 루트 기준 절대 경로)
    current_file = Path(__file__).resolve()
    project_root = current_file.parent.parent.parent
    upload_dir = project_root / "apps" / "web" / "public" / "uploads" / "insights"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # API 키 확인
    if not os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY") == "your_openai_api_key_here":
        print("❌ Error: OPENAI_API_KEY is not set in .env")
        return

    db = Database()
    crawler = RSSCrawler()
    processor = AIProcessor()

    try:
        # 1. RSS 피드 가져오기
        news_list = crawler.fetch_latest_news()
        print(f"✅ Found {len(news_list)} potential strategic items.")

        for item in news_list:
            # 2. 중복 체크 (URL 기준)
            if db.is_duplicate(item['url']):
                print(f"⏩ Skipping duplicate: {item['title']}")
                continue

            # 3. 본문 텍스트 (최대 10,000자로 제한하여 토큰 낭비 방지)
            content = item['content'][:10000]
            
            # 4. AI 전략적 가공 (지니인 관점 포함)
            processed_data = processor.process_news(item['title'], content, item.get('feed_category'))
            if not processed_data:
                continue

            # 5. 전략적 필터링
            relevance = processed_data.get('relevance_score', 0)
            if relevance < 60:
                print(f"📉 Skipping low relevance ({relevance}): {item['title']}")
                continue
            
            # 6. 자동 발행 결정 및 이미지 생성
            if relevance >= 85:
                processed_data['publish_status'] = 'published'
                processed_data['published_at'] = 'NOW()'
                print(f"🚀 High relevance ({relevance}) - Auto Publishing!")
                
                # 이미지 생성 및 다운로드
                image_url = processor.generate_image(
                    processed_data['title_kr'], 
                    processed_data.get('category', 'it')
                )
                if image_url:
                    try:
                        img_filename = f"{uuid.uuid4()}.png"
                        img_path = upload_dir / img_filename
                        img_data = requests.get(image_url).content
                        with open(img_path, 'wb') as f:
                            f.write(img_data)
                        processed_data['thumbnail_url'] = f"/uploads/insights/{img_filename}"
                        print(f"📸 Image saved: {processed_data['thumbnail_url']}")
                    except Exception as e:
                        print(f"❌ Failed to download image: {e}")
            else:
                processed_data['publish_status'] = 'draft'
                print(f"📝 Medium relevance ({relevance}) - Saved as Draft.")

            # 7. DB 저장
            processed_data['source_document_id'] = item['url']
            db.insert_insight(processed_data)
            print(f"🎉 Successfully processed: {processed_data['title_kr']}")

            # 기관 서버 부하 방지를 위해 잠깐 대기
            time.sleep(5)

    except Exception as e:
        print(f"❌ Critical Error: {e}")
    finally:
        db.close()
        print("🏁 AI Worker Finished!")

if __name__ == "__main__":
    main()
