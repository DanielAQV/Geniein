import feedparser
import time

class RSSCrawler:
    def __init__(self):
        # 25년 4분기 전략 키워드 (AI/5G/DX/반도체/인프라) 반영 정밀 쿼리
        self.feeds = {
            "google_oda": "https://news.google.com/rss/search?q=(Korea+OR+Vietnam)+(AI+OR+5G+OR+DX+OR+\"Smart+City\"+OR+\"Digital+Government\"+OR+Semiconductor)+ODA+-Japan+-Tokyo&hl=en-US&gl=US&ceid=US:en",
            "tech_strategy": "https://www.technologyreview.com/feed/",
            "ai_business": "https://venturebeat.com/category/ai/feed/",
            "google_it": "https://news.google.com/rss/search?q=(Korea+OR+Vietnam)+(\"Open+RAN\"+OR+\"Data+Center\"+OR+\"Digital+Economy\"+OR+Blockchain+OR+VNeID+OR+Viettel+OR+VNPT)+Strategy+-Japan+-Tokyo&hl=en-US&gl=US&ceid=US:en",
            "google_infra": "https://news.google.com/rss/search?q=(\"Data+Center\"+OR+Cloud+OR+Cybersecurity+OR+Infrastructure+OR+SI+OR+NI)+Strategy+(Korea+OR+Vietnam+OR+Global)+-Japan&hl=en-US&gl=US&ceid=US:en"
        }
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

    def fetch_latest_news(self):
        import requests
        print("Fetching AI & ODA Strategic feeds...")
        all_items = []
        
        category_map = {
            "tech_strategy": "IT",
            "ai_business": "IT",
            "google_it": "IT",
            "google_infra": "IT",
            "google_oda": "ODA"
        }

        for category, url in self.feeds.items():
            print(f"Reading feed: {category}...")
            try:
                response = requests.get(url, headers=self.headers, timeout=10)
                feed = feedparser.parse(response.text)
                print(f"Found {len(feed.entries)} items in this feed.")
                
                for entry in feed.entries[:10]: # 각 피드당 최신 10개씩
                    all_items.append({
                        "title": entry.title,
                        "url": entry.link,
                        "date": entry.get('published', 'NOW()'),
                        "content": entry.get('summary', entry.get('description', '')),
                        "feed_category": category_map.get(category, "IT")
                    })
            except Exception as e:
                print(f"Error reading {category}: {e}")
                
        return all_items

    def fetch_content(self, url):
        # RSS는 이미 요약본(summary)이 들어있어서 추가 크롤링 없이 바로 반환 가능
        return ""
