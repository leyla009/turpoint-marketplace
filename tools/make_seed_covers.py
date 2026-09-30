"""
Generates illustrated cover images for the demo seed tours that have no real
photo in frontend/public/pictures.

    python3 tools/make_seed_covers.py  <output_dir>

Needs: Pillow + numpy.  Output: tour-NN.jpg, 1200x900 (4:3, the tour card ratio).
Everything is drawn at 2x and downsampled, which gives smooth anti-aliased
edges.  Random details use a fixed seed, so re-running gives identical files.
"""
import math
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 2400, 1800          # drawn size; saved at half of this
OUT_SIZE = (1200, 900)


# ---------- small helpers -------------------------------------------------
def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(stops, size=(W, H), horizontal=False):
    """Vertical (or horizontal) multi-stop gradient. stops = [(pos0..1, '#hex'), ...]"""
    n = size[0] if horizontal else size[1]
    col = np.zeros((n, 3), dtype=np.float32)
    pos = [s[0] for s in stops]
    for c in range(3):
        col[:, c] = np.interp(np.linspace(0, 1, n), pos, [rgb(s[1])[c] for s in stops])
    arr = np.tile(col[None, :, :], (size[1], 1, 1)) if horizontal else np.tile(col[:, None, :], (1, size[0], 1))
    return Image.fromarray(arr.astype(np.uint8), 'RGB')


def glow(img, xy, r, color, strength=0.9, blur=None):
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x, y = xy
    d.ellipse([x - r, y - r, x + r, y + r], fill=color + (int(255 * strength),))
    layer = layer.filter(ImageFilter.GaussianBlur(blur or r * 0.6))
    img.paste(layer, (0, 0), layer)


def ridge(base_y, amp, seed, rough=(1, 2.3, 5.1), x0=0, x1=W, step=12):
    rnd = random.Random(seed)
    ph = [rnd.uniform(0, 6.28) for _ in rough]
    pts = []
    for x in range(x0, x1 + step, step):
        y = base_y
        for k, r in enumerate(rough):
            y -= amp / (k + 1) ** 1.15 * (0.5 + 0.5 * math.sin(x / W * r * 6.28 + ph[k]))
        pts.append((x, y))
    return pts


def fill_ridge(d, pts, color, bottom=H):
    d.polygon(pts + [(pts[-1][0], bottom), (pts[0][0], bottom)], fill=color)


def pine(d, x, base, h, color, snow=None):
    w = h * 0.36
    for i in range(4):
        top = base - h + i * h * 0.2
        bw = w * (0.45 + i * 0.2)
        d.polygon([(x, top), (x - bw, top + h * 0.34), (x + bw, top + h * 0.34)], fill=color)
    d.rectangle([x - h * 0.03, base - h * 0.08, x + h * 0.03, base], fill=lerp(color, (30, 20, 10), 0.6))


def round_tree(d, x, base, h, color, trunk='#4a3320'):
    d.rectangle([x - h * 0.04, base - h * 0.45, x + h * 0.04, base], fill=rgb(trunk))
    for dx, dy, r in [(0, -0.62, 0.32), (-0.2, -0.5, 0.24), (0.2, -0.5, 0.24), (0, -0.78, 0.22)]:
        cx, cy, rr = x + dx * h, base + dy * h, r * h
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=color)


def stars(img, count, seed, ymax):
    d = ImageDraw.Draw(img)
    rnd = random.Random(seed)
    for _ in range(count):
        x, y = rnd.randint(0, W), rnd.randint(0, ymax)
        r = rnd.choice([2, 2, 3, 4])
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255 - rnd.randint(0, 40)))


def noise_grain(img, amount=7, seed=1):
    rnd = np.random.default_rng(seed)
    arr = np.asarray(img).astype(np.int16)
    arr += rnd.integers(-amount, amount + 1, size=arr.shape[:2])[:, :, None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGB')


def vignette(img, strength=0.35):
    y, x = np.ogrid[:H, :W]
    d = np.sqrt(((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2)
    m = 1 - strength * np.clip(d - 0.55, 0, 1) ** 1.4
    arr = np.asarray(img).astype(np.float32) * m[:, :, None]
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGB')


def reflect(img, horizon, tint, alpha=0.55, blur=6):
    """Mirror everything above `horizon` into the area below it (lake water)."""
    top = img.crop((0, 0, W, horizon))
    flipped = top.transpose(Image.FLIP_TOP_BOTTOM).resize((W, H - horizon))
    flipped = flipped.filter(ImageFilter.GaussianBlur(blur))
    tint_layer = Image.new('RGB', flipped.size, tint)
    flipped = Image.blend(flipped, tint_layer, 1 - alpha)
    # gentle horizontal ripples
    arr = np.asarray(flipped).astype(np.float32)
    for y in range(0, arr.shape[0], 14):
        arr[y:y + 3] *= 1.10
    img.paste(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)), (0, horizon))


def new(stops):
    img = gradient(stops)
    return img, ImageDraw.Draw(img)


# ---------- the 13 scenes --------------------------------------------------
def s02_sheki_palace():
    """Sheki Khan's-Palace style facade: stone wall, arches, stained-glass windows."""
    img, d = new([(0, '#f4c98a'), (0.55, '#e9a26a'), (1, '#b56a4a')])
    glow(img, (1750, 420), 260, (255, 240, 190), 0.9)
    fill_ridge(d, ridge(1000, 260, 5), rgb('#7a5a55'))
    fill_ridge(d, ridge(1150, 200, 9), rgb('#5e4443'))
    d.rectangle([260, 760, 2140, 1800], fill=rgb('#8b3a2c'))              # brick wall
    for row in range(0, 22):                                              # brick courses
        y = 760 + row * 48
        d.line([(260, y), (2140, y)], fill=rgb('#6f2c20'), width=3)
        off = 0 if row % 2 else 60
        for x in range(260 + off, 2140, 120):
            d.line([(x, y), (x, y + 48)], fill=rgb('#6f2c20'), width=3)
    d.polygon([(200, 760), (2200, 760), (2100, 660), (300, 660)], fill=rgb('#3f2a28'))   # roof
    d.rectangle([300, 640, 2100, 668], fill=rgb('#2c1c1a'))
    for k, cx in enumerate([640, 1200, 1760]):                            # three arched windows
        d.rectangle([cx - 150, 900, cx + 150, 1500], fill=rgb('#2c1c1a'))
        d.pieslice([cx - 150, 750, cx + 150, 1050], 180, 360, fill=rgb('#2c1c1a'))
        cols = ['#d93b3b', '#2f6fd0', '#e8b923', '#2a9d6f', '#8a3fc4', '#f07d2a']
        rnd = random.Random(40 + k)
        for gx in range(6):
            for gy in range(9):
                x0, y0 = cx - 130 + gx * 43, 800 + gy * 76
                if gy < 2 and abs(gx - 2.5) > (gy + 1.6):
                    continue
                d.rectangle([x0 + 3, y0 + 3, x0 + 40, y0 + 73], fill=rgb(rnd.choice(cols)))
        glow(img, (cx, 1150), 260, (255, 200, 120), 0.35)
    d.rectangle([0, 1500, W, H], fill=rgb('#7d6a58'))                     # courtyard
    for x in range(0, W, 210):
        d.line([(x, 1500), (x - 300, H)], fill=rgb('#66574a'), width=4)
    return img


def s04_tea_baklava():
    img, d = new([(0, '#5a3a2a'), (0.5, '#8a5a3a'), (1, '#3b2418')])
    for i in range(14):                                                   # warm bokeh
        rnd = random.Random(i)
        glow(img, (rnd.randint(100, W - 100), rnd.randint(80, 700)), rnd.randint(50, 110), (255, 210, 130), 0.28)
    d.rectangle([0, 1080, W, H], fill=rgb('#7a4a2b'))                     # table
    for y in range(1100, H, 46):
        d.line([(0, y), (W, y)], fill=rgb('#6a3f24'), width=3)
    d.ellipse([1100, 1420, 2100, 1700], fill=rgb('#2e1b10'))              # plate shadow
    d.ellipse([1080, 1330, 2080, 1640], fill=rgb('#f3ead9'))
    d.ellipse([1150, 1370, 2010, 1590], fill=rgb('#e6d8bf'))
    rnd = random.Random(3)
    for i, (cx, cy) in enumerate([(1350, 1430), (1560, 1400), (1770, 1440), (1460, 1510), (1670, 1520)]):
        d.polygon([(cx, cy - 55), (cx + 90, cy), (cx, cy + 55), (cx - 90, cy)], fill=rgb('#d9a441'))
        d.polygon([(cx, cy - 40), (cx + 64, cy), (cx, cy + 40), (cx - 64, cy)], fill=rgb('#e9bd5a'))
        d.ellipse([cx - 11, cy - 11, cx + 11, cy + 11], fill=rgb('#7fa650'))
    # armudu (pear-shaped) tea glass on a saucer
    d.ellipse([260, 1560, 1000, 1760], fill=rgb('#2e1b10'))
    d.ellipse([250, 1470, 990, 1690], fill=rgb('#f3ead9'))
    gx = 620
    glass = [(gx - 95, 1000), (gx + 95, 1000), (gx + 105, 1130), (gx + 170, 1300), (gx + 130, 1500),
             (gx - 130, 1500), (gx - 170, 1300), (gx - 105, 1130)]
    d.polygon(glass, fill=rgb('#c8741f'))
    d.polygon([(gx - 95, 1000), (gx + 95, 1000), (gx + 100, 1060), (gx - 100, 1060)], fill=rgb('#e6a24a'))
    d.polygon([(gx - 120, 1330), (gx + 120, 1330), (gx + 112, 1490), (gx - 112, 1490)], fill=rgb('#a85a12'))
    d.line([(gx - 120, 1150), (gx - 150, 1300)], fill=(255, 235, 200), width=10)
    for k in range(3):                                                    # steam
        glow(img, (gx + (k - 1) * 40, 900 - k * 70), 55, (255, 255, 255), 0.22)
    d.ellipse([1450, 1030, 1900, 1170], fill=rgb('#a83b2b'))              # dried-fruit bowl
    for i, cx in enumerate(range(1500, 1860, 60)):
        d.ellipse([cx - 32, 1010, cx + 32, 1075], fill=rgb(['#8b4a2b', '#c98a2e', '#5a3a26'][i % 3]))
    return img


def s05_ilisu_waterfall():
    img, d = new([(0, '#cfe6dc'), (0.4, '#8fbf9f'), (1, '#2f5a45')])
    fill_ridge(d, ridge(700, 240, 12), rgb('#6f9a80'))
    d.polygon([(0, 0), (720, 0), (520, 800), (360, 1500), (0, 1800)], fill=rgb('#24402f'))      # canyon walls
    d.polygon([(W, 0), (1680, 0), (1880, 800), (2040, 1500), (W, 1800)], fill=rgb('#1c3626'))
    for x in (120, 300, 2150, 2300, 1960):
        pine(d, x, 1250 + (x % 200), 640, rgb('#1d4a34'))
    d.rectangle([880, 0, 1520, 1180], fill=rgb('#3d5b4a'))                # back rock face
    for x0 in (990, 1090, 1190, 1290):                                    # falls
        d.rectangle([x0, 0, x0 + 70, 1180], fill=(246, 251, 250))
        d.rectangle([x0 + 18, 0, x0 + 30, 1180], fill=(255, 255, 255))
    glow(img, (1200, 1180), 320, (255, 255, 255), 0.75, blur=90)          # mist
    d.polygon([(0, 1300), (W, 1300), (W, H), (0, H)], fill=rgb('#2a5b62'))                 # pool
    for y in range(1320, H, 34):
        d.line([(500, y), (1900, y + 6)], fill=rgb('#6fb0a8'), width=4)
    for cx, cy, r in [(500, 1550, 150), (1800, 1620, 190), (1000, 1720, 130), (1500, 1500, 90)]:
        d.ellipse([cx - r, cy - r * 0.55, cx + r, cy + r * 0.55], fill=rgb('#3d4a45'))
        d.ellipse([cx - r * 0.7, cy - r * 0.5, cx + r * 0.6, cy + r * 0.1], fill=rgb('#56655e'))
    return img


def s06_coastal_fortress():
    img, d = new([(0, '#2d3a6b'), (0.35, '#d9738a'), (0.6, '#f6b06a'), (1, '#f7d79a')])
    glow(img, (1500, 1010), 300, (255, 236, 180), 0.95)
    d.ellipse([1400, 910, 1600, 1110], fill=(255, 248, 220))
    d.rectangle([0, 1040, W, H], fill=rgb('#2b5a78'))                     # sea
    for y in range(1060, H, 30):
        span = (y - 1040) / 760
        d.line([(1500 - 500 * span - 200, y), (1500 + 500 * span + 200, y)], fill=rgb('#f6c98a'), width=3 + int(span * 4))
    d.polygon([(0, 1900), (0, 1150), (300, 1080), (900, 1130), (1300, 1500), (1500, 1800)], fill=rgb('#2c2a33'))  # rock headland
    # watchtower
    d.polygon([(420, 1100), (760, 1100), (740, 500), (440, 500)], fill=rgb('#a89478'))
    d.polygon([(600, 1100), (760, 1100), (740, 500), (600, 500)], fill=rgb('#8c7a62'))
    for x in range(440, 740, 60):
        d.rectangle([x, 440, x + 34, 500], fill=rgb('#a89478'))          # crenellations
    d.rectangle([520, 700, 590, 830], fill=rgb('#2b2222'))
    d.pieslice([520, 660, 590, 740], 180, 360, fill=rgb('#2b2222'))
    d.polygon([(760, 1100), (1220, 1130), (1200, 900), (1100, 860), (960, 940), (860, 880), (760, 940)], fill=rgb('#a08c70'))  # ruined wall
    for x in range(780, 1200, 70):
        d.line([(x, 940), (x, 1120)], fill=rgb('#7d6c56'), width=3)
    for (x, y, r) in [(330, 1210, 45), (240, 1290, 60)]:
        d.ellipse([x - r, y - r, x + r, y + r], fill=rgb('#3a3640'))
    for i in range(6):                                                    # gulls
        rnd = random.Random(i)
        gx, gy = rnd.randint(1400, 2200), rnd.randint(300, 700)
        d.arc([gx - 30, gy - 14, gx, gy + 14], 200, 340, fill=(40, 40, 60), width=5)
        d.arc([gx, gy - 14, gx + 30, gy + 14], 200, 340, fill=(40, 40, 60), width=5)
    return img


def s08_copper_halva():
    img, d = new([(0, '#3a2a22'), (1, '#20150f')])
    for i in range(10):
        rnd = random.Random(20 + i)
        glow(img, (rnd.randint(100, W - 100), rnd.randint(60, 600)), rnd.randint(60, 120), (255, 190, 110), 0.22)
    d.rectangle([0, 1200, W, H], fill=rgb('#6b4429'))
    for y in range(1220, H, 52):
        d.line([(0, y), (W, y)], fill=rgb('#583620'), width=3)
    # copper kettle (kuza-style)
    cop = [(0, '#f0a468'), (0.45, '#c8672e'), (1, '#8e3c17')]
    kettle = gradient(cop, size=(W, H), horizontal=True)
    mask = Image.new('L', (W, H), 0)
    m = ImageDraw.Draw(mask)
    m.ellipse([320, 880, 980, 1500], fill=255)                            # body
    m.polygon([(560, 900), (740, 900), (700, 560), (600, 560)], fill=255)  # neck
    m.ellipse([560, 500, 740, 610], fill=255)
    m.polygon([(950, 1120), (1180, 960), (1220, 1010), (990, 1220)], fill=255)   # spout
    img.paste(kettle, (0, 0), mask)
    d.arc([300, 640, 720, 1140], 200, 350, fill=rgb('#8e3c17'), width=26)         # handle
    d.ellipse([640, 470, 740, 520], fill=rgb('#8e3c17'))
    d.arc([430, 1030, 860, 1470], 200, 260, fill=(255, 220, 170), width=12)       # highlight
    d.ellipse([260, 1430, 1040, 1560], fill=rgb('#2e1c10'))
    d.ellipse([320, 1390, 980, 1510], fill=rgb('#a6521f'))
    # tray with halva slices
    d.ellipse([1180, 1300, 2260, 1640], fill=rgb('#2b1a0f'))
    d.ellipse([1160, 1220, 2240, 1560], fill=rgb('#c9a24a'))
    d.ellipse([1200, 1250, 2200, 1510], fill=rgb('#e8d9b0'))
    for i, cx in enumerate(range(1350, 2100, 160)):
        d.polygon([(cx - 60, 1330), (cx + 60, 1310), (cx + 70, 1430), (cx - 50, 1450)], fill=rgb('#b5762b'))
        d.polygon([(cx - 60, 1330), (cx + 60, 1310), (cx + 66, 1345), (cx - 56, 1365)], fill=rgb('#d99a45'))
        for k in range(3):
            d.ellipse([cx - 30 + k * 26, 1350 + k * 4, cx - 16 + k * 26, 1364 + k * 4], fill=rgb('#7fa650'))
    return img


def s11_night_camping():
    img, d = new([(0, '#070b21'), (0.5, '#16265a'), (0.8, '#3b4a86'), (1, '#1a2245')])
    stars(img, 380, 4, 1000)
    band = Image.new('RGBA', (W, H), (0, 0, 0, 0))                        # milky way
    ImageDraw.Draw(band).polygon([(300, 0), (700, 0), (2100, 900), (1700, 1000)], fill=(190, 200, 255, 90))
    band = band.filter(ImageFilter.GaussianBlur(90))
    img.paste(band, (0, 0), band)
    stars(img, 200, 8, 900)
    d = ImageDraw.Draw(img)
    fill_ridge(d, ridge(1250, 360, 22), rgb('#101a3a'))
    fill_ridge(d, ridge(1420, 260, 27), rgb('#0a1230'))
    d.rectangle([0, 1450, W, H], fill=rgb('#0c1b1f'))
    for x in (100, 280, 2200, 2050, 1900):
        pine(d, x, 1560, 560 + x % 90, rgb('#06110f'))
    glow(img, (1200, 1420), 420, (255, 150, 60), 0.55, blur=140)          # tent glow
    d.polygon([(880, 1620), (1200, 1130), (1520, 1620)], fill=rgb('#e07a2c'))
    d.polygon([(1200, 1130), (1520, 1620), (1250, 1620)], fill=rgb('#b85a1a'))
    d.polygon([(1080, 1620), (1200, 1330), (1320, 1620)], fill=rgb('#ffcf7a'))
    glow(img, (1720, 1560), 200, (255, 140, 50), 0.7, blur=70)            # campfire
    d.polygon([(1690, 1600), (1720, 1470), (1750, 1600)], fill=rgb('#ffb13d'))
    d.polygon([(1705, 1600), (1722, 1520), (1740, 1600)], fill=rgb('#fff1a8'))
    d.line([(1640, 1620), (1800, 1590)], fill=rgb('#2a1a10'), width=16)
    d.line([(1640, 1590), (1800, 1620)], fill=rgb('#2a1a10'), width=16)
    return img


def s12_tea_plantation_dish():
    img, d = new([(0, '#d8ecf0'), (0.4, '#a9d6c2'), (1, '#4d8a3f')])
    fill_ridge(d, ridge(620, 200, 33), rgb('#7bb39a'))
    fill_ridge(d, ridge(720, 140, 37), rgb('#5c9a7c'))
    for i in range(14):                                                   # tea terraces
        y = 740 + i * 46
        col = lerp(rgb('#3f8a3a'), rgb('#1f5a2a'), i / 14)
        pts = [(x, y + math.sin(x / 260 + i) * 18) for x in range(0, W + 40, 40)]
        d.polygon(pts + [(W, y + 60), (0, y + 60)], fill=col)
        for x in range(30, W, 46):
            yy = y + math.sin(x / 260 + i) * 18
            d.ellipse([x - 14, yy - 8, x + 14, yy + 8], fill=lerp(col, (200, 240, 140), 0.25))
    d.rectangle([0, 1330, W, H], fill=rgb('#6a4a2e'))                     # table
    for y in range(1350, H, 50):
        d.line([(0, y), (W, y)], fill=rgb('#573b23'), width=3)
    d.ellipse([340, 1340, 1500, 1760], fill=rgb('#26170d'))               # plate
    d.ellipse([320, 1250, 1480, 1690], fill=rgb('#f4eee0'))
    d.ellipse([400, 1300, 1400, 1630], fill=rgb('#e9dfc6'))
    d.ellipse([500, 1350, 1300, 1560], fill=rgb('#c98a2e'))               # fish body
    d.polygon([(1270, 1455), (1400, 1380), (1400, 1530)], fill=rgb('#b4741f'))
    d.ellipse([560, 1420, 610, 1470], fill=rgb('#2a1a10'))
    for x in range(700, 1200, 90):
        d.arc([x, 1370, x + 110, 1540], 300, 60, fill=rgb('#e0a24a'), width=8)
    d.ellipse([830, 1330, 940, 1400], fill=rgb('#efd44a'))                # lemon
    for cx in (640, 760, 1000, 1120):
        d.ellipse([cx - 40, 1560, cx + 40, 1610], fill=rgb('#4d9a3c'))
    gx = 1800                                                             # tea glass
    d.ellipse([gx - 190, 1560, gx + 190, 1700], fill=rgb('#f4eee0'))
    d.polygon([(gx - 95, 1180), (gx + 95, 1180), (gx + 150, 1320), (gx + 110, 1560), (gx - 110, 1560), (gx - 150, 1320)], fill=rgb('#b8641a'))
    d.polygon([(gx - 95, 1180), (gx + 95, 1180), (gx + 100, 1230), (gx - 100, 1230)], fill=rgb('#e6a24a'))
    return img


def s14_shebeke_window():
    """Close-up of a shebeke (wood-lattice stained-glass) window filling the whole frame."""
    img = Image.new('RGB', (W, H), rgb('#241611'))
    d = ImageDraw.Draw(img)
    cols = ['#d93b3b', '#2f6fd0', '#e8b923', '#2a9d6f', '#8a3fc4', '#f07d2a', '#38b6c9']
    rnd = random.Random(14)
    cx, cy, half = W // 2, H // 2, 130          # `half` = half-diagonal of one glass diamond
    for gy in range(-11, 12):
        for gx in range(-14, 15):
            if (gx + gy) % 2:
                continue
            x, y = cx + gx * half, cy + gy * half
            base = cols[(abs(gx) * 2 + abs(gy) * 3) % len(cols)]
            if rnd.random() < 0.16:
                base = rnd.choice(cols)
            d.polygon([(x, y - half), (x + half, y), (x, y + half), (x - half, y)], fill=rgb(base))
            d.polygon([(x, y - half * 0.55), (x + half * 0.55, y), (x, y + half * 0.55), (x - half * 0.55, y)],
                      fill=lerp(rgb(base), (255, 255, 255), 0.35))
            d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=(255, 250, 230))
    for gy in range(-12, 13):                    # wooden bars between the glass pieces
        for gx in range(-15, 16):
            x, y = cx + gx * half, cy + gy * half
            d.line([(x - half, y), (x, y - half), (x + half, y)], fill=rgb('#2d1b12'), width=18)
            d.line([(x - half, y), (x, y + half), (x + half, y)], fill=rgb('#2d1b12'), width=18)
    glow(img, (W // 2, H // 2), 800, (255, 240, 200), 0.16, blur=280)
    frame = 120                                   # window frame
    for box in ([0, 0, W, frame], [0, H - frame, W, H], [0, 0, frame, H], [W - frame, 0, W, H]):
        d.rectangle(box, fill=rgb('#3a2417'))
    d.rectangle([frame, frame, W - frame, frame + 14], fill=rgb('#1c110b'))
    d.rectangle([frame, H - frame - 14, W - frame, H - frame], fill=rgb('#1c110b'))
    return img


def s15_zipline_canopy():
    img, d = new([(0, '#bfe6f2'), (0.45, '#e9f6df'), (1, '#8fd08a')])
    glow(img, (1900, 300), 240, (255, 250, 210), 0.9)
    fill_ridge(d, ridge(900, 260, 44), rgb('#7fb79c'))
    for layer, (base, col, hmin, hmax) in enumerate([(1150, '#3f8f4a', 300, 420), (1350, '#2f7a3f', 380, 520),
                                                     (1600, '#1f6532', 460, 640), (1850, '#134f27', 560, 760)]):
        rnd = random.Random(60 + layer)
        x = -40
        while x < W + 80:
            round_tree(d, x, base, rnd.randint(hmin, hmax), rgb(col))
            x += rnd.randint(150, 240)
    d.rectangle([180, 500, 260, 1500], fill=rgb('#7a4f2b'))               # platform tower
    d.rectangle([120, 470, 420, 520], fill=rgb('#9b6a3c'))
    d.rectangle([2080, 900, 2140, 1700], fill=rgb('#7a4f2b'))
    d.rectangle([1980, 880, 2240, 920], fill=rgb('#9b6a3c'))
    d.line([(260, 500), (2080, 900)], fill=(40, 40, 40), width=8)         # cable
    px, py = 1180, 500 + (1180 - 260) * (400 / 1820)
    d.line([(px, py), (px, py + 60)], fill=(40, 40, 40), width=6)
    d.ellipse([px - 26, py + 50, px + 26, py + 102], fill=rgb('#e7a984'))   # rider
    d.polygon([(px - 34, py + 100), (px + 34, py + 100), (px + 46, py + 260), (px - 46, py + 260)], fill=rgb('#e0483a'))
    d.line([(px - 30, py + 120), (px - 10, py + 40)], fill=rgb('#e0483a'), width=14)
    d.line([(px + 30, py + 120), (px + 10, py + 40)], fill=rgb('#e0483a'), width=14)
    d.line([(px - 24, py + 260), (px - 44, py + 400)], fill=rgb('#2a3a6a'), width=22)
    d.line([(px + 24, py + 260), (px + 44, py + 400)], fill=rgb('#2a3a6a'), width=22)
    d.pieslice([px - 32, py + 40, px + 32, py + 100], 180, 360, fill=rgb('#f2c230'))   # helmet
    return img


def s16_breakfast_spread():
    img, d = new([(0, '#8a5a3a'), (1, '#6a4028')])
    for x in range(0, W, 150):                                            # tablecloth checks
        for y in range(0, H, 150):
            if (x // 150 + y // 150) % 2 == 0:
                d.rectangle([x, y, x + 150, y + 150], fill=rgb('#9c6a44'))
    d.rectangle([0, 0, W, H], outline=None)
    def plate(cx, cy, r, rim='#f5efe2', inner='#ece2cd'):
        d.ellipse([cx - r + 14, cy - r + 24, cx + r + 14, cy + r + 24], fill=rgb('#4a2c18'))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=rgb(rim))
        d.ellipse([cx - r * 0.78, cy - r * 0.78, cx + r * 0.78, cy + r * 0.78], fill=rgb(inner))
    plate(650, 620, 330)                                                  # tandir bread
    d.ellipse([430, 470, 870, 770], fill=rgb('#d99a4a'))
    d.ellipse([470, 500, 830, 740], fill=rgb('#e9b565'))
    for k in range(9):
        d.arc([500 + k * 32, 520, 560 + k * 32, 720], 250, 110, fill=rgb('#b8742a'), width=7)
    plate(1650, 560, 290)                                                 # white cheese + herbs
    for i in range(4):
        d.rectangle([1500 + i * 70, 500 + (i % 2) * 40, 1560 + i * 70, 590 + (i % 2) * 40], fill=rgb('#faf6ea'))
    for cx in (1480, 1560, 1780, 1840):
        d.ellipse([cx - 40, 660, cx + 40, 710], fill=rgb('#4d9a3c'))
    plate(640, 1290, 300)                                                 # tomatoes + cucumber
    for cx, cy in [(520, 1230), (660, 1210), (760, 1320), (580, 1380)]:
        d.ellipse([cx - 62, cy - 62, cx + 62, cy + 62], fill=rgb('#d63a2e'))
        d.ellipse([cx - 36, cy - 44, cx - 10, cy - 20], fill=(255, 190, 180))
    for cx in (820, 470):
        d.ellipse([cx - 55, 1320, cx + 55, 1380], fill=rgb('#7fbf5a'))
        d.ellipse([cx - 38, 1332, cx + 38, 1368], fill=rgb('#d9f0b0'))
    d.ellipse([1490, 1090, 1870, 1470], fill=rgb('#4a2c18'))              # honey jar + jam
    d.ellipse([1470, 1070, 1850, 1450], fill=rgb('#e6a41c'))
    d.ellipse([1520, 1120, 1800, 1400], fill=rgb('#f5c14a'))
    d.ellipse([1560, 1150, 1650, 1200], fill=(255, 235, 170))
    d.ellipse([1990, 1200, 2290, 1500], fill=rgb('#4a2c18'))
    d.ellipse([1970, 1180, 2270, 1480], fill=rgb('#8a1f36'))
    d.ellipse([2010, 1220, 2230, 1440], fill=rgb('#b23049'))
    gx, gy = 1100, 1000                                                   # tea glass top-down
    d.ellipse([gx - 150 + 12, gy - 150 + 20, gx + 150 + 12, gy + 150 + 20], fill=rgb('#4a2c18'))
    d.ellipse([gx - 150, gy - 150, gx + 150, gy + 150], fill=rgb('#f5efe2'))
    d.ellipse([gx - 95, gy - 95, gx + 95, gy + 95], fill=rgb('#b8641a'))
    d.ellipse([gx - 60, gy - 70, gx + 20, gy - 30], fill=rgb('#e6a24a'))
    return img


def s17_mossy_bridge():
    img, d = new([(0, '#dfeee6'), (0.35, '#a9cbb4'), (1, '#4a7a5e')])
    fill_ridge(d, ridge(800, 300, 51), rgb('#7fa892'))
    for x in range(-60, W + 100, 170):
        pine(d, x, 1000 + (x % 3) * 30, 520 + (x * 7 % 160), rgb('#2f6a4a'))
    for x in range(-20, W + 100, 230):
        pine(d, x, 1100, 640 + (x * 3 % 120), rgb('#1f5238'))
    glow(img, (1200, 900), 700, (235, 245, 240), 0.55, blur=200)          # mist
    d.rectangle([0, 1060, W, H], fill=rgb('#3d6f66'))                     # river
    for y in range(1080, H, 36):
        d.line([(0, y), (W, y + 8)], fill=rgb('#6aa89c'), width=4)
    stone = rgb('#7d8577')
    d.polygon([(220, 1060), (600, 760), (1800, 760), (2180, 1060), (2180, 1120), (220, 1120)], fill=stone)     # bridge deck
    d.rectangle([220, 1060, 2180, 1240], fill=stone)
    for cx, r in [(700, 250), (1200, 300), (1700, 250)]:                  # arches
        d.pieslice([cx - r, 1240 - r, cx + r, 1240 + r], 180, 360, fill=rgb('#3d6f66'))
        d.rectangle([cx - r, 1240, cx + r, 1300], fill=rgb('#3d6f66'))
    rnd = random.Random(17)
    for _ in range(320):                                                  # stone blocks + moss
        x, y = rnd.randint(230, 2170), rnd.randint(780, 1230)
        c = rnd.choice(['#5e8a4a', '#6d9a55', '#4d7a3c', '#8b9384', '#6f7869'])
        d.ellipse([x - 22, y - 12, x + 22, y + 12], fill=rgb(c))
    d.rectangle([220, 740, 2180, 780], fill=rgb('#5e8a4a'))               # mossy parapet
    d.rectangle([0, 1300, W, H], fill=rgb('#2b5a56'))
    for cx, cy, r in [(300, 1620, 130), (900, 1700, 100), (2000, 1650, 150)]:
        d.ellipse([cx - r, cy - r * 0.5, cx + r, cy + r * 0.5], fill=rgb('#5f6b5a'))
        d.ellipse([cx - r * 0.7, cy - r * 0.45, cx + r * 0.3, cy], fill=rgb('#6f9a55'))
    return img


def s18_khanbulag_lake():
    img, d = new([(0, '#a8d8e0'), (0.35, '#e8f2d8'), (0.5, '#f7e8b8'), (1, '#f7e8b8')])
    glow(img, (1750, 700), 300, (255, 250, 210), 0.9)
    fill_ridge(d, ridge(860, 220, 71), rgb('#93c2ae'), bottom=1020)
    fill_ridge(d, ridge(940, 160, 77), rgb('#6ea88a'), bottom=1020)
    d.rectangle([0, 1015, W, 1030], fill=rgb('#5b9a7c'))
    reflect(img, 1020, rgb('#5b9aa0'), alpha=0.6, blur=10)
    d = ImageDraw.Draw(img)
    for y in range(1080, H, 40):
        d.line([(0, y), (W, y)], fill=rgb('#a9d6d2'), width=2)
    d.polygon([(0, 1500), (600, 1420), (1100, 1600), (1500, 1800), (0, 1800)], fill=rgb('#1f5a2f'))   # shore
    for x, h in [(1500, 460), (1620, 560), (1740, 480), (1880, 620), (2000, 520), (2130, 600), (2280, 480)]:   # reeds
        d.line([(x, 1800), (x + 40, 1800 - h)], fill=rgb('#5a8a35'), width=14)
        d.ellipse([x + 26, 1800 - h - 90, x + 62, 1800 - h + 10], fill=rgb('#7a5a34'))
    def leaf(x, y, length, ang, col):
        a = math.radians(ang)
        tip = (x + math.cos(a) * length, y - math.sin(a) * length)
        n = (-math.sin(a), -math.cos(a))
        w = length * 0.28
        mid = (x + math.cos(a) * length * 0.55, y - math.sin(a) * length * 0.55)
        d.polygon([(x, y), (mid[0] + n[0] * w, mid[1] + n[1] * w), tip, (mid[0] - n[0] * w, mid[1] - n[1] * w)], fill=col)
        d.line([(x, y), tip], fill=lerp(col, (255, 255, 255), 0.35), width=6)
    for ang, ln, col in [(60, 700, '#2d8a3a'), (40, 800, '#237a34'), (85, 640, '#3aa044'), (110, 720, '#2d8a3a'), (130, 640, '#237a34')]:
        leaf(260, 1800, ln, ang, rgb(col))
    for ang, ln, col in [(120, 560, '#2f8a3c'), (95, 520, '#3aa044'), (145, 480, '#237a34')]:
        leaf(2180, 1800, ln, ang, rgb(col))
    return img


def s20_samovar_garden():
    img, d = new([(0, '#cfe8b8'), (0.5, '#9ccf8a'), (1, '#4f8a45')])
    rnd = random.Random(90)
    for _ in range(26):                                                   # garden bokeh + blossoms
        x, y = rnd.randint(0, W), rnd.randint(0, 950)
        glow(img, (x, y), rnd.randint(50, 130), rnd.choice([(255, 250, 200), (255, 190, 210), (255, 255, 255)]), 0.3)
    d = ImageDraw.Draw(img)
    for x in range(-40, W + 100, 200):
        round_tree(d, x, 1000, rnd.randint(500, 700), rgb('#3d8a3f'))
    for _ in range(90):
        x, y = rnd.randint(0, W), rnd.randint(150, 900)
        d.ellipse([x - 16, y - 16, x + 16, y + 16], fill=rgb(rnd.choice(['#ffd5e2', '#ffffff', '#ffc0d4'])))
    d.rectangle([0, 1250, W, H], fill=rgb('#a8794a'))                     # wooden table
    for y in range(1270, H, 56):
        d.line([(0, y), (W, y)], fill=rgb('#8a5f37'), width=4)
    steel = gradient([(0, '#f4f7fa'), (0.45, '#aeb7c2'), (1, '#6b7482')], horizontal=True)
    mask = Image.new('L', (W, H), 0)
    m = ImageDraw.Draw(mask)
    m.rounded_rectangle([760, 560, 1200, 1140], 130, fill=255)            # samovar body
    m.rectangle([900, 470, 1060, 590], fill=255)                          # neck
    m.ellipse([880, 400, 1080, 500], fill=255)                            # lid
    m.rectangle([700, 1100, 1260, 1190], fill=255)                        # base
    img.paste(steel.transform(steel.size, Image.AFFINE, (1, 0, -180, 0, 1, 0)), (0, 0), mask)
    d = ImageDraw.Draw(img)
    d.rectangle([690, 1180, 1270, 1260], fill=rgb('#5a6270'))
    d.ellipse([950, 350, 1010, 410], fill=rgb('#3a2a1a'))
    d.rectangle([1180, 800, 1320, 830], fill=rgb('#5a6270'))              # tap
    d.ellipse([1290, 780, 1350, 850], fill=rgb('#3a2a1a'))
    d.line([(800, 620), (800, 1090)], fill=(255, 255, 255), width=12)     # highlight
    d.rounded_rectangle([1130, 300, 1430, 400], 40, fill=rgb('#d9a441'))   # teapot on top
    d.ellipse([1180, 210, 1380, 330], fill=rgb('#e6bd5c'))
    for gx in (1560, 1780, 2000):                                         # tea glasses
        d.ellipse([gx - 110, 1230, gx + 110, 1330], fill=rgb('#f4eee0'))
        d.polygon([(gx - 62, 1040), (gx + 62, 1040), (gx + 96, 1140), (gx + 74, 1270), (gx - 74, 1270), (gx - 96, 1140)], fill=rgb('#b8641a'))
        d.polygon([(gx - 62, 1040), (gx + 62, 1040), (gx + 66, 1080), (gx - 66, 1080)], fill=rgb('#e6a24a'))
    glow(img, (1780, 990), 90, (255, 255, 255), 0.25)
    return img


SCENES = {2: s02_sheki_palace, 4: s04_tea_baklava, 5: s05_ilisu_waterfall, 6: s06_coastal_fortress,
          8: s08_copper_halva, 11: s11_night_camping, 12: s12_tea_plantation_dish, 14: s14_shebeke_window,
          15: s15_zipline_canopy, 16: s16_breakfast_spread, 17: s17_mossy_bridge, 18: s18_khanbulag_lake,
          20: s20_samovar_garden}

if __name__ == '__main__':
    out = Path(sys.argv[1] if len(sys.argv) > 1 else 'seed_out')
    out.mkdir(parents=True, exist_ok=True)
    for n, fn in SCENES.items():
        img = noise_grain(vignette(fn(), 0.3), 5, n)
        img = img.resize(OUT_SIZE, Image.LANCZOS)
        img.save(out / f'tour-{n:02d}.jpg', quality=82, optimize=True, progressive=True)
        print('wrote', out / f'tour-{n:02d}.jpg')
