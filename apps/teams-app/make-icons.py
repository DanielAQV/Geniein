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
GAP = 0.045  # 겹치는 자리에서 큰 쪽 선을 끊는 폭 (반지름 비율)
STROKE = 0.055  # 선 굵기 (캔버스 크기 비율) — 192px 기준
STROKE_SMALL = 0.085  # 32px 용. 비례로 줄이면 선이 사라져서 따로 둔다


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


def render(size: int, color: tuple[int, int, int], stroke_ratio: float) -> Image.Image:
    """배경도 면도 없이 **선으로만** 그린다.

    Teams 앱 아이콘의 일반적인 결이 픽토그램이라 면을 채우지 않는다. 채도 높은
    사각형 하나가 앱 목록에서 유독 튀는 것도 피한다.
    """
    s = size * SS
    width = max(2, round(stroke_ratio * s))

    big = sparkle(BIG[0] * s, BIG[1] * s, BIG[2] * s)
    small = sparkle(SMALL[0] * s, SMALL[1] * s, SMALL[2] * s)

    mask = Image.new("L", (s, s), 0)
    drawer = ImageDraw.Draw(mask)

    # 큰 반짝이 윤곽. joint="curve" 가 없으면 꼭짓점에서 선이 끊겨 보인다.
    drawer.line([*big, big[0]], fill=255, width=width, joint="curve")

    # ★ 겹치는 자리에서 큰 쪽 선을 끊는다. 두 윤곽이 그냥 교차하면 매듭처럼
    #   보여서 "반짝이 두 개"가 아니라 정체불명의 도형이 된다.
    drawer.polygon(sparkle(SMALL[0] * s, SMALL[1] * s, (SMALL[2] + GAP) * s), fill=0)

    drawer.line([*small, small[0]], fill=255, width=width, joint="curve")

    solid = Image.new("RGB", (s, s), color)
    canvas = Image.merge("RGBA", (*solid.split(), mask))
    return canvas.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    primary = oklch_to_rgb(*PRIMARY_OKLCH)
    print(f"브랜드 primary = #{'%02X%02X%02X' % primary}")

    # color.png 는 라이트·다크 표면 **양쪽**에 놓인다. 무배경으로 가는 이상
    # 흰 선은 라이트에서 사라지므로 브랜드색으로 그린다.
    render(192, primary, STROKE).save(HERE / "color.png")
    print("color.png   192x192 (무배경, 브랜드색 선)")

    # outline.png 는 Teams 가 규정한 대로 흰색이어야 한다 (앱 바에서 렌더).
    # 32px 에서는 비례 굵기가 너무 얇아 사라지므로 굵게 잡는다.
    render(32, (255, 255, 255), STROKE_SMALL).save(HERE / "outline.png")
    print("outline.png  32x32 (무배경, 흰 선)")
