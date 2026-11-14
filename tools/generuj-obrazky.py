"""Generuje og.png a ikony. Spust z korene repozitare: python tools/generuj-obrazky.py"""
import os
from PIL import Image, ImageDraw, ImageFont

TILE = "#e6f1f2"
GROUT = "#cfe0e2"
PORCELAIN = "#ffffff"
INK = "#0e3b43"
MUTED = "#4d6f75"
BRASS = "#a8761c"
BRASS_ICON = "#e2b45a"  # svetlejsi mosaz, lepsi kontrast na tmavem podkladu

FONTS = ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf"]


def font(size):
    for path in FONTS:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def centered(draw, cx, cy, text, fnt, fill):
    """Vykresli text opticky na stred (cx, cy) podle skutecneho ohraniceni."""
    l, t, r, b = draw.textbbox((0, 0), text, font=fnt)
    draw.text((cx - (l + r) / 2, cy - (t + b) / 2), text, font=fnt, fill=fill)


def og():
    w, h = 1200, 630
    img = Image.new("RGB", (w, h), TILE)
    d = ImageDraw.Draw(img)
    for x in range(0, w, 60):
        d.line([(x, 0), (x, h)], fill=GROUT, width=2)
    for y in range(0, h, 60):
        d.line([(0, y), (w, y)], fill=GROUT, width=2)
    d.rounded_rectangle([90, 90, w - 90, h - 90], radius=36, fill=PORCELAIN)

    title_f, sub_f, pill_f = font(84), font(40), font(40)
    title, sub = "Záchodová kalkulačka", "Kolik ti zaplatí za čas na porcelánu?"
    l, t, r, b = d.textbbox((0, 0), title, font=title_f)
    tw = r - l
    cx = w / 2
    centered(d, cx, 285, title, title_f, INK)
    centered(d, cx, 395, sub, sub_f, MUTED)
    # mosazna pilulka vpravo nahore od nadpisu
    pw, ph = 96, 56
    px1 = cx + tw / 2 + 4
    px1 = min(px1, w - 90 - 20)
    px0, py0 = px1 - pw, 132
    d.rounded_rectangle([px0, py0, px1, py0 + ph], radius=ph // 2, fill=BRASS)
    centered(d, (px0 + px1) / 2, py0 + ph / 2, "Kč", pill_f, "#ffffff")
    img.save("og.png")


def icon(size, maskable=False, opaque=False):
    s = size * 4  # supersampling pro hladke hrany
    mode = "RGB" if (maskable or opaque) else "RGBA"
    img = Image.new(mode, (s, s), INK if mode == "RGB" else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if mode == "RGBA":
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.12), fill=INK)
    # sirka glyfu: 60 % u plne plochy (bezpecna zona 80 %), 64 % u ostatnich
    target = s * (0.5 if maskable else 0.62)
    fs = 100
    f = font(fs)
    l, t, r, b = d.textbbox((0, 0), "Kč", font=f)
    f = font(int(fs * target / (r - l)))
    centered(d, s / 2, s / 2, "Kč", f, BRASS_ICON)
    return img.resize((size, size), Image.LANCZOS)


def favicon_svg():
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
        f'<rect width="512" height="512" rx="61" fill="{INK}"/>'
        f'<text x="256" y="256" text-anchor="middle" dominant-baseline="central" '
        f'font-family="\'Segoe UI\', Arial, sans-serif" font-weight="700" font-size="200" '
        f'fill="{BRASS_ICON}">Kč</text></svg>\n'
    )
    with open("icons/favicon.svg", "w", encoding="utf-8") as fh:
        fh.write(svg)


if __name__ == "__main__":
    os.makedirs("icons", exist_ok=True)
    og()
    icon(512).save("icons/icon-512.png")
    icon(192).save("icons/icon-192.png")
    icon(512, maskable=True).save("icons/icon-maskable-512.png")
    icon(180, opaque=True).save("icons/apple-touch-icon.png")
    icon(32).save("icons/favicon-32.png")
    favicon_svg()
