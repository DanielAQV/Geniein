"""연결 점검. 시크릿을 넣은 직후 한 번 돌려 보는 용도다.

    python -m src.graph.check                       # 토큰 + Graph
    python -m src.graph.check "OT Plan" 12          # 첨부까지

각 단계를 따로 찍는 이유는, 막히는 지점이 셋 중 하나로 갈리기 때문이다:
  ① 토큰      → 시크릿·테넌트 문제
  ② Graph     → Graph 쪽 Sites.Selected 또는 사이트 부여 문제
  ③ SP REST   → SharePoint Online API 쪽 Sites.Selected 가 없는 것
"""

from __future__ import annotations

import sys

from . import client


def main() -> int:
    try:
        print("① 토큰 …", end=" ", flush=True)
        client._token("https://graph.microsoft.com")  # noqa: SLF001 — 점검 스크립트다
        print("ok")

        print("② Graph 리스트 …", end=" ", flush=True)
        names = [x.get("displayName") for x in client.lists()]
        print(f"ok — {len(names)}개")
        for name in names:
            print(f"     · {name}")
    except Exception as exc:  # noqa: BLE001 — 점검이므로 원인을 그대로 보여준다
        print(f"실패\n     {exc}")
        return 1

    # 첨부는 실패해도 치명적이지 않다. 리스트 이름을 인자로 받아 있을 때만 본다.
    # 항목 ID 를 생략하면 최신 항목을 잡는다 — 사람이 ID 를 알고 있을 이유가 없다.
    if len(sys.argv) > 1:
        list_name = sys.argv[1]
        try:
            if len(sys.argv) > 2:
                item_id = int(sys.argv[2])
            else:
                items = client.list_items(list_name, top=1, order_by="id desc")
                if not items:
                    print(f"③ 첨부 — {list_name} 에 항목이 없습니다")
                    return 0
                item_id = int(items[0]["id"])

            print(f"③ 첨부 ({list_name} #{item_id}) …", end=" ", flush=True)
            files = client.attachments(list_name, item_id)
            print(f"ok — {len(files)}개")
            for f in files:
                print(f"     · {f.get('FileName')}")
        except Exception as exc:  # noqa: BLE001
            print(f"실패\n     {exc}")
            print("     → SharePoint Online API 쪽 Sites.Selected 동의를 확인하세요.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
