import requests
from bs4 import BeautifulSoup
import time
import urllib3

# SSL 경고 메시지 끄기
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class KoicaCrawler:
    def __init__(self):
        self.base_url = "https://www.koica.go.kr"
        self.list_url = f"{self.base_url}/koica_kr/990/subview.do"
        self.session = requests.Session()
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        }

    def fetch_latest_news(self):
        print(f"🔍 Fetching KOICA news list: {self.list_url}")
        try:
            # SSL 검증 무시하고 접속
            response = self.session.get(self.list_url, headers=self.headers, verify=False, timeout=15)
            if response.status_code != 200:
                print(f"❌ Failed to fetch list: {response.status_code}")
                return []

            soup = BeautifulSoup(response.text, 'html.parser')
            news_items = []
            
            # KOICA 보도자료 게시판 테이블 파싱
            table_rows = soup.select("table.board-list tbody tr") or soup.select(".board-list tbody tr")
            
            for row in table_rows:
                try:
                    title_elem = row.select_one("td.subject a") or row.select_one("a")
                    if not title_elem:
                        continue
                    
                    title = title_elem.get_text(strip=True)
                    href = title_elem['href']
                    link = href if href.startswith('http') else self.base_url + href
                    
                    date_elem = row.select_one("td.date") or row.select_one(".date")
                    date = date_elem.get_text(strip=True) if date_elem else ""
                    
                    news_items.append({
                        "title": title,
                        "url": link,
                        "date": date
                    })
                except Exception:
                    continue
                    
            return news_items
        except Exception as e:
            print(f"❌ Error fetching list: {e}")
            return []

    def fetch_content(self, url):
        print(f"📄 Fetching content: {url}")
        time.sleep(2)
        try:
            response = self.session.get(url, headers=self.headers, verify=False, timeout=15)
            if response.status_code != 200:
                return ""

            soup = BeautifulSoup(response.text, 'html.parser')
            content_area = soup.select_one(".view-content") or soup.select_one(".board-view-content") or soup.select_one("#content")
            return content_area.get_text(strip=True) if content_area else ""
        except Exception as e:
            print(f"⚠️ Error fetching content: {e}")
            return ""
