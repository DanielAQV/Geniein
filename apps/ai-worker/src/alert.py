import os

import requests


def notify(text):
    """ALERT_WEBHOOK_URL(Slack·Teams incoming webhook)로 한 줄 보낸다. 없으면 출력만 한다.

    알림 실패로 회차가 죽지 않게 예외는 삼킨다.
    """
    print(f"🔔 {text}")
    url = os.getenv('ALERT_WEBHOOK_URL')
    if not url:
        return
    try:
        requests.post(url, json={'text': text}, timeout=15).raise_for_status()
    except requests.RequestException as e:
        print(f"⚠️  알림 전송 실패: {e}")
