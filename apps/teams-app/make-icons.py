"""Teams 아이콘 생성 — 탭 헤더와 **같은 반짝이**."""

import math
import pathlib

from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent
SS = 8  # 슈퍼샘플링 배율. 크게 그린 뒤 줄여 계단을 없앤다

VIEWBOX = 24.0
STROKE_UNITS = 2.0  # lucide 기본 stroke-width
MARGIN = 0.06  # 캔버스 여백 비율. 앱 바에서 가장자리에 붙지 않게

# globals.css 다크 테마 값 (oklch)
PRIMARY_OKLCH = (0.60, 0.18, 270)

# 큰 별: 시작점 뒤로 (원호, 직선)이 번갈아 나온다.
STAR_START = (11.017, 2.814)
STAR_SEGMENTS = [
    ("a", 1, 1, 0, 1, 1.966, 0),
    ("l", 1.051, 5.558),
    ("a", 2, 2, 0, 0, 1.594, 1.594),
    ("l", 5.558, 1.051),
    ("a", 1, 1, 0, 1, 0, 1.966),
    ("l", -5.558, 1.051),
    ("a", 2, 2, 0, 0, -1.594, 1.594),
    ("l", -1.051, 5.558),
    ("a", 1, 1, 0, 1, -1.966, 0),
    ("l", -1.051, -5.558),
    ("a", 2, 2, 0, 0, -1.594, -1.594),
    ("l", -5.558, -1.051),
    ("a", 1, 1, 0, 1, 0, -1.966),
    ("l", 5.558, -1.051),
    ("a", 2, 2, 0, 0, 1.594, -1.594),
]
# 오른쪽 위 작은 십자, 왼쪽 아래 작은 원
CROSS = [((20, 2), (20, 6)), ((22, 4), (18, 4))]
DOT = (4, 20, 2)  # cx, cy, r


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


def arc_points(
    p0: tuple[float, float],
    rx: float,
    ry: float,
    large_arc: int,
    sweep: int,
    p1: tuple[float, float],
    steps: int = 16,
) -> list[tuple[float, float]]:
    """SVG 원호(A/a)를 점열로 편다."""
    x0, y0 = p0
    x1, y1 = p1
    if (x0, y0) == (x1, y1) or rx == 0 or ry == 0:
        return [p1]

    dx2, dy2 = (x0 - x1) / 2.0, (y0 - y1) / 2.0

    # 반지름이 두 점을 잇기에 모자라면 명세대로 키운다
    lam = dx2**2 / rx**2 + dy2**2 / ry**2
    if lam > 1:
        scale = math.sqrt(lam)
        rx, ry = rx * scale, ry * scale

    num = rx**2 * ry**2 - rx**2 * dy2**2 - ry**2 * dx2**2
    den = rx**2 * dy2**2 + ry**2 * dx2**2
    coef = math.sqrt(max(0.0, num / den))
    if large_arc == sweep:
        coef = -coef

    cxp, cyp = coef * rx * dy2 / ry, -coef * ry * dx2 / rx
    cx, cy = cxp + (x0 + x1) / 2.0, cyp + (y0 + y1) / 2.0

    theta0 = math.atan2((dy2 - cyp) / ry, (dx2 - cxp) / rx)
    theta1 = math.atan2((-dy2 - cyp) / ry, (-dx2 - cxp) / rx)
    delta = theta1 - theta0
    if sweep and delta < 0:
        delta += 2 * math.pi
    elif not sweep and delta > 0:
        delta -= 2 * math.pi

    return [
        (cx + rx * math.cos(theta0 + delta * i / steps), cy + ry * math.sin(theta0 + delta * i / steps))
        for i in range(1, steps + 1)
    ]


def star_outline() -> list[tuple[float, float]]:
    """큰 별 윤곽을 viewBox 좌표의 점열로."""
    points = [STAR_START]
    cursor = STAR_START
    for segment in STAR_SEGMENTS:
        if segment[0] == "l":
            cursor = (cursor[0] + segment[1], cursor[1] + segment[2])
            points.append(cursor)
        else:
            _, rx, ry, large_arc, sweep, dx, dy = segment
            end = (cursor[0] + dx, cursor[1] + dy)
            points.extend(arc_points(cursor, rx, ry, large_arc, sweep, end))
            cursor = end
    return points


def render(size: int, color: tuple[int, int, int]) -> Image.Image:
    """배경도 면도 없이 **선으로만** 그린다."""
    s = size * SS
    inner = s * (1 - 2 * MARGIN)
    scale = inner / VIEWBOX
    offset = s * MARGIN

    def to_px(point: tuple[float, float]) -> tuple[float, float]:
        return (offset + point[0] * scale, offset + point[1] * scale)

    width = max(2, round(STROKE_UNITS * scale))
    radius = width / 2.0

    mask = Image.new("L", (s, s), 0)
    drawer = ImageDraw.Draw(mask)

    def round_cap(point: tuple[float, float]) -> None:
        # PIL 의 선은 끝이 각지다. lucide 는 둥근 끝이라 끝점에 원을 찍어 맞춘다.
        x, y = point
        drawer.ellipse((x - radius, y - radius, x + radius, y + radius), fill=255)

    star = [to_px(p) for p in star_outline()]
    drawer.line([*star, star[0]], fill=255, width=width, joint="curve")

    for start, end in CROSS:
        a, b = to_px(start), to_px(end)
        drawer.line([a, b], fill=255, width=width)
        round_cap(a)
        round_cap(b)

    cx, cy, r = DOT
    center = to_px((cx, cy))
    rr = r * scale
    drawer.ellipse(
        (center[0] - rr, center[1] - rr, center[0] + rr, center[1] + rr),
        outline=255,
        width=width,
    )

    solid = Image.new("RGB", (s, s), color)
    canvas = Image.merge("RGBA", (*solid.split(), mask))
    return canvas.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    primary = oklch_to_rgb(*PRIMARY_OKLCH)
    print(f"브랜드 primary = #{'%02X%02X%02X' % primary}")

    # color.png 는 라이트·다크 표면 양쪽에 놓인다. 무배경이라
    # 흰 선은 라이트에서 사라지므로 브랜드색으로 그린다.
    render(192, primary).save(HERE / "color.png")
    print("color.png   192x192 (무배경, 브랜드색 선)")

    # outline.png 는 Teams 가 규정한 대로 흰색이어야 한다 (앱 바에서 렌더).
    render(32, (255, 255, 255)).save(HERE / "outline.png")
    print("outline.png  32x32 (무배경, 흰 선)")
