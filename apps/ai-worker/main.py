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

def backfill_missing_translations(db, processor, limit=25):
    """발행 상태인데 번역이 빠진 글을 채운다.

    초안을 수동으로 발행 상태로 바꾼 경우처럼, 워커의 발행 경로를 타지 않고
    공개된 글을 여기서 주워 담는다. 한 회차에 처리량을 제한해 크롤링이 밀리지
    않게 한다 — 남은 건 다음 회차가 이어서 한다.
    """
    try:
        rows = db.find_published_missing_translations(limit)
    except Exception as e:
        print(f"⚠️  번역 보충 대상 조회 실패: {e}")
        return

    if not rows:
        return

    print(f"🌏 번역이 빠진 발행글 {len(rows)}건 보충")
    for row in rows:
        try:
            db.update_translations(
                row['id'],
                processor.translate_to_en_vn(row['title_kr'], row['summary_kr']),
            )
            print(f"   ok  {row['title_kr'][:30]}")
        except Exception as e:
            print(f"   FAIL {row['id']} :: {e}")


def main():
    print("🚀 Geniein Strategic AI Worker Started!")
    
    current_file = Path(__file__).resolve()
    project_root = current_file.parent.parent.parent
    upload_dir = project_root / "apps" / "web" / "public" / "uploads" / "insights"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    if not os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY") == "your_openai_api_key_here":
        print("❌ Error: OPENAI_API_KEY is not set in .env")
        return

    db = Database()
    crawler = RSSCrawler()
    processor = AIProcessor()

    try:
        # 0. 지난 회차에서 번역이 빠진 발행글 보충 (수동 발행분 포함)
        backfill_missing_translations(db, processor)

        # 1. RSS 피드 가져오기
        news_list = crawler.fetch_latest_news()
        print(f"✅ Found {len(news_list)} potential strategic items.")

        for item in news_list:
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
            if relevance >= 75:
                print(f"🚀 High relevance ({relevance}) - Auto Publishing!")

                # 이미지 생성 및 다운로드
                image_url = processor.generate_image(
                    processed_data['title_kr'],
                    processed_data.get('category', 'it')
                )
                thumbnail_url = None
                if image_url:
                    try:
                        img_filename = f"{uuid.uuid4()}.png"
                        img_path = upload_dir / img_filename
                        # 타임아웃이 없으면 응답이 안 오는 동안 크론이 그대로 매달린다
                        resp = requests.get(image_url, timeout=60)
                        resp.raise_for_status()
                        with open(img_path, 'wb') as f:
                            f.write(resp.content)
                        thumbnail_url = f"/uploads/insights/{img_filename}"
                        print(f"📸 Image saved: {thumbnail_url}")
                    except Exception as e:
                        print(f"❌ Failed to download image: {e}")

                # 썸네일 없이 발행하지 않는다.
                #
                # 2026-08-20 에 Together 가 FLUX.1-schnell 서버리스 제공을 중단한 뒤
                # 이미지 생성이 매일 실패했는데, 발행이 그대로 진행되는 바람에
                # 썸네일 NULL 인 글이 계속 공개됐고 20일간 아무도 눈치채지 못했다.
                # 발행을 막으면 관리자 목록에 draft 로 쌓여 바로 드러난다.
                if thumbnail_url:
                    processed_data['thumbnail_url'] = thumbnail_url
                    processed_data['publish_status'] = 'published'
                    processed_data['published_at'] = 'NOW()'
                    # 발행이 확정된 지금 번역한다. 초안으로 남는 글은 번역하지 않는다 —
                    # 노출되지 않는 글이고, 초안이 발행글보다 많아서 대부분 버려진다.
                    try:
                        processed_data.update(processor.translate_to_en_vn(
                            processed_data['title_kr'],
                            processed_data['summary_kr'],
                        ))
                        print("🌏 영문·베트남어 번역 완료")
                    except Exception as e:
                        # 번역 실패로 발행을 막지는 않는다. 국문으로 폴백해 보이고,
                        # 다음 회차의 보충 단계가 다시 집어간다.
                        print(f"⚠️  번역 실패 — 국문만 저장한다: {e}")
                else:
                    processed_data['publish_status'] = 'draft'
                    print("⚠️  이미지가 없어 draft 로 저장한다 — 확인 후 수동 발행 필요")
            else:
                processed_data['publish_status'] = 'draft'
                print(f"📝 Medium relevance ({relevance}) - Saved as Draft.")

            # 7. DB 저장
            processed_data['source_document_id'] = item['url']
            db.insert_insight(processed_data)
            print(f"🎉 Successfully processed: {processed_data['title_kr']}")

            time.sleep(5)

    except Exception as e:
        print(f"❌ Critical Error: {e}")
    finally:
        db.close()
        print("🏁 AI Worker Finished!")

if __name__ == "__main__":
    main()
