"""Teams 아이콘 생성 — AI 반짝이 두 개가 살짝 겹친 모양.

**빌드에 포함되지 않는다.** color.png / outline.png 는 저장소에 커밋돼 있고,
모양이나 색을 바꾸고 싶을 때만 이 스크립트를 돌린다.

    python make-icons.py          # Pillow 필요

만드는 것:
  color.png    192x192 불투명. 어두운 배경 + 흰 큰 반짝이 + 브랜드색 작은 반짝이
  outline.png   32x32  투명 배경 + 흰 실루엣 (Teams 좌측 앱 바)

★ 색을 지어내지 않는다. apps/web/src/app/globals.css 다크 테마의 `--primary` 와
  `--background` 를 oklch 에서 그대로 변환한다. 사이트 테마가 바뀌면 아래 두
  상수만 맞추면 된다.

★ outline 은 단색이라 두 모양이 겹치면 한 덩어리로 보인다. 작은 반짝이를 키운
  모양으로 큰 쪽에 구멍을 내서 틈을 만든다 — 앱 바에서 "두 개"로 읽혀야 한다.
"""

import math
import pathlib

from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent
SS = 4  # 슈퍼샘플링 배율. 곡선을 크게 그린 뒤 줄여 계단을 없앤다

# globals.css 다크 테마 값 (oklch)
PRIMARY_OKLCH = (0.60, 0.18, 270)
BACKGROUND_HEX = (3, 8, 28)  # #03081c

# 배치 — 캔버스 크기에 대한 비율 (중심 x, 중심 y, 반지름)
BIG = (0.41, 0.57, 0.33)
SMALL = (0.685, 0.305, 0.20)
PINCH = 3.4  # 허리가 잘록한 정도. 3 이면 아스트로이드, 클수록 뾰족하다
GAP = 0.05  # outline 에서 두 모양 사이 틈 (반지름 비율)


def oklch_to_rgb(L: float, C: float, hue_deg: float) -> tuple[int, int, int]:
    h = math.radians(hue_deg)
    a, b = C * math.cos(h), C * math.sin(h)
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_**3, m_**3, s_**3
    linear = (
        +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    )
    channels = []
    for value in linear:
        value = max(0.0, min(1.0, value))
        value = 12.92 * value if value <= 0.0031308 else 1.055 * (value ** (1 / 2.4)) - 0.055
        channels.append(round(max(0.0, min(1.0, value)) * 255))
    return tuple(channels)


def sparkle(cx: float, cy: float, r: float, steps: int = 240) -> list[tuple[float, float]]:
    """네 꼭짓점 반짝이의 외곽선 좌표."""
    points = []
    for i in range(steps):
        t = 2 * math.pi * i / steps
        ct, st = math.cos(t), math.sin(t)
        points.append(
            (
                cx + r * math.copysign(abs(ct) ** PINCH, ct),
                cy + r * math.copysign(abs(st) ** PINCH, st),
            )
        )
    return points


def render(size: int, *, transparent: bool) -> Image.Image:
    s = size * SS
    big = sparkle(BIG[0] * s, BIG[1] * s, BIG[2] * s)
    small = sparkle(SMALL[0] * s, SMALL[1] * s, SMALL[2] * s)

    if transparent:
        mask = Image.new("L", (s, s), 0)
        drawer = ImageDraw.Draw(mask)
        drawer.polygon(big, fill=255)
        drawer.polygon(sparkle(SMALL[0] * s, SMALL[1] * s, (SMALL[2] + GAP) * s), fill=0)
        drawer.polygon(small, fill=255)
        white = Image.new("L", (s, s), 255)
        canvas = Image.merge("RGBA", (white, white, white, mask))
    else:
        canvas = Image.new("RGBA", (s, s), (*BACKGROUND_HEX, 255))
        drawer = ImageDraw.Draw(canvas)
        drawer.polygon(big, fill=(255, 255, 255, 255))
        drawer.polygon(small, fill=(*oklch_to_rgb(*PRIMARY_OKLCH), 255))

    return canvas.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    primary = oklch_to_rgb(*PRIMARY_OKLCH)
    print(f"브랜드 primary = #{'%02X%02X%02X' % primary}")

    render(192, transparent=False).convert("RGB").save(HERE / "color.png")
    print("color.png   192x192")

    render(32, transparent=True).save(HERE / "outline.png")
    print("outline.png  32x32 (투명)")
