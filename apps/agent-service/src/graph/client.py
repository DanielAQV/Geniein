"""앱 전용 SharePoint 접근 (Graph + SharePoint REST).

인가 모델은 `Sites.Selected` 다. 앱에 테넌트 전체 권한을 주지 않고, **사이트 하나에**
`read` 를 부여해 둔다. 부여는 코드가 아니라 운영 작업이고 기록은 docs 에 있다.

  부여:  POST /sites/{siteId}/permissions   roles=["read"]
  회수:  DELETE /sites/{siteId}/permissions/{permissionId}

★ 토큰은 **AQV 테넌트**(`graph_tenant_id`)에서 받는다. 앱 등록은 geniein 테넌트에
  있지만(다중 테넌트), 자원이 AQV 에 있으므로 토큰 발급 권한도 AQV 가 준 동의를 탄다.

★ audience 별로 토큰이 다르다. `.default` 스코프는 "이 자원에 대해 동의된 앱 권한
  전부"라는 뜻이라, 자원을 바꾸면 다른 토큰이 나온다. 캐시를 자원별로 나눠 둔 이유다.
"""

from __future__ import annotations

import logging
import threading
import time
from typing import Any
from urllib.parse import quote

import httpx

from ..config import get_settings

logger = logging.getLogger(__name__)

GRAPH_ROOT = "https://graph.microsoft.com/v1.0"
# 만료 직전에 쓰다가 401 을 맞지 않게 미리 버린다.
_EXPIRY_SKEW = 300


class GraphUnavailable(RuntimeError):
    """자격증명이 없거나 토큰을 못 받았다. 호출부는 이걸 잡아 조용히 비활성으로 간다."""


_tokens: dict[str, tuple[str, float]] = {}
_lock = threading.Lock()


def _resource_of(url: str) -> str:
    """토큰 audience. Graph 냐 SharePoint 냐를 URL 로 정한다."""
    if url.startswith(GRAPH_ROOT):
        return "https://graph.microsoft.com"
    # https://<tenant>.sharepoint.com/... → https://<tenant>.sharepoint.com
    return "/".join(url.split("/", 3)[:3])


def _token(resource: str) -> str:
    cached = _tokens.get(resource)
    if cached and cached[1] - _EXPIRY_SKEW > time.time():
        return cached[0]

    s = get_settings()
    if not (s.graph_client_id and s.graph_client_secret and s.graph_tenant_id):
        raise GraphUnavailable(
            "GRAPH_CLIENT_ID / GRAPH_CLIENT_SECRET / GRAPH_TENANT_ID 가 없습니다."
        )

    with _lock:
        cached = _tokens.get(resource)
        if cached and cached[1] - _EXPIRY_SKEW > time.time():
            return cached[0]

        url = f"https://login.microsoftonline.com/{s.graph_tenant_id}/oauth2/v2.0/token"
        response = httpx.post(
            url,
            data={
                "client_id": s.graph_client_id,
                "client_secret": s.graph_client_secret,
                "scope": f"{resource}/.default",
                "grant_type": "client_credentials",
            },
            timeout=20,
        )
        if response.status_code != 200:
            # 본문에 AADSTS 코드가 들어 있다. 원인 진단이 여기서 끝나야 한다.
            raise GraphUnavailable(f"토큰 발급 실패({response.status_code}): {response.text[:400]}")

        payload = response.json()
        token = payload["access_token"]
        _tokens[resource] = (token, time.time() + int(payload.get("expires_in", 3600)))
        logger.info("앱 토큰 획득 — %s", resource)
        return token


def get(url: str, *, params: dict[str, Any] | None = None) -> dict[str, Any]:
    """GET 하나. 읽기만 한다 — 이 모듈에 쓰기 경로는 두지 않는다."""
    headers = {
        "Authorization": f"Bearer {_token(_resource_of(url))}",
        "Accept": "application/json;odata=nometadata",
    }
    response = httpx.get(url, headers=headers, params=params, timeout=60)
    if response.status_code == 403:
        raise GraphUnavailable(
            f"403 — 이 사이트에 앱 권한이 없습니다. Sites.Selected 부여를 확인하세요: {url}"
        )
    if response.status_code >= 400:
        # ★ 본문을 함께 던진다. Graph 의 400 은 상태코드만 봐서는 아무것도 알 수 없고,
        #   원인(`innerError.code`, 잘못된 $select 이름 등)이 전부 본문에 있다.
        raise GraphUnavailable(
            f"{response.status_code} {response.request.url} — {response.text[:600]}"
        )
    return response.json()


def get_bytes(url: str) -> bytes:
    """파일 본문. 첨부 다운로드용이다."""
    headers = {"Authorization": f"Bearer {_token(_resource_of(url))}"}
    response = httpx.get(url, headers=headers, timeout=120, follow_redirects=True)
    response.raise_for_status()
    return response.content


# ── Graph ────────────────────────────────────────────────────────────

def site_url() -> str:
    s = get_settings()
    if not s.graph_site_id:
        raise GraphUnavailable("GRAPH_SITE_ID 가 없습니다.")
    return f"{GRAPH_ROOT}/sites/{s.graph_site_id}"


def lists() -> list[dict[str, Any]]:
    return get(f"{site_url()}/lists").get("value", [])


def list_items(
    list_name: str,
    *,
    select: str | None = None,
    filter: str | None = None,  # noqa: A002 — OData 이름을 그대로 쓴다
    top: int = 50,
) -> list[dict[str, Any]]:
    """리스트 항목. `fields` 를 펼쳐서 컬럼 값이 바로 보이게 한다."""
    params: dict[str, Any] = {"$expand": "fields", "$top": top}
    if select:
        params["$expand"] = f"fields($select={select})"
    if filter:
        params["$filter"] = filter
    url = f"{site_url()}/lists/{quote(list_name)}/items"
    return get(url, params=params).get("value", [])


# ── SharePoint REST ──────────────────────────────────────────────────
#
# ★ 첨부파일은 Graph 에 없다. 여기만이 경로다.
#   SharePoint Online API 쪽 Sites.Selected 가 따로 동의돼 있어야 한다.

def attachments(list_name: str, item_id: int) -> list[dict[str, Any]]:
    """리스트 항목의 첨부 목록. 각 항목의 `ServerRelativeUrl` 로 본문을 받는다."""
    s = get_settings()
    url = (
        f"{s.sharepoint_site_url}/_api/web/lists/getbytitle('{list_name}')"
        f"/items({item_id})/AttachmentFiles"
    )
    payload = get(url)
    return payload.get("value", payload.get("d", {}).get("results", []))


def attachment_bytes(server_relative_url: str) -> bytes:
    s = get_settings()
    host = "/".join(s.sharepoint_site_url.split("/", 3)[:3])
    return get_bytes(f"{host}{server_relative_url}")
