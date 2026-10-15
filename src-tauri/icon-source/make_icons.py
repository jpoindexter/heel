"""Builds Heel's app icon and menu-bar icon from Greg's canonical art.

Source (not committed): assets/heel/animation-v1/references/canonical-base.png, Greg on a #FF00FF key.
Outputs here: app-icon.png (1024, input for `npx tauri icon`), tray.png (preview) and tray.rgba (raw 44x44 RGBA
that lib.rs embeds as the menu-bar template icon).
Run: python3 src-tauri/icon-source/make_icons.py
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/heel/animation-v1/references/canonical-base.png"
OUT = Path(__file__).resolve().parent

CANVAS = 1024
TILE = 824  # macOS icon grid: the tile sits inside a 1024 canvas with transparent margin
TILE_RADIUS = 185
TILE_COLOR = (239, 236, 228, 255)
TRAY_PX = 44
KEY = (255, 0, 255)


def keyed(path: Path) -> Image.Image:
    """Greg with the magenta key removed. Magenta is high red + blue and low green; the dog and its outline are not."""
    rgb = Image.open(path).convert("RGB")
    r, g, b = rgb.split()
    magenta = ImageChops.subtract(ImageChops.lighter(r, b), g)  # ~255 on the key, ~0 on grey/cream/black
    alpha = magenta.point(lambda m: 255 if m < 70 else 0 if m > 190 else int((190 - m) * 255 / 120))
    # De-spill edge pixels: pull red/blue down to green so no pink fringe survives.
    r = ImageChops.darker(r, ImageChops.add(g, Image.new("L", g.size, 24)))
    b = ImageChops.darker(b, ImageChops.add(g, Image.new("L", g.size, 24)))
    out = Image.merge("RGB", (r, g, b)).convert("RGBA")
    out.putalpha(alpha)
    return out


def app_icon(greg: Image.Image) -> Image.Image:
    bust = greg.crop((270, 80, 940, 750))  # head, chest bib, shoulders
    size = int(TILE * 0.95)
    bust = bust.resize((size, size), Image.LANCZOS)
    tile = Image.new("RGBA", (TILE, TILE), TILE_COLOR)
    tile.alpha_composite(bust, ((TILE - size) // 2, int(TILE * 0.12)))
    mask = Image.new("L", (TILE, TILE), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, TILE - 1, TILE - 1), radius=TILE_RADIUS, fill=255)
    tile.putalpha(ImageChops.multiply(tile.getchannel("A"), mask))
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    canvas.alpha_composite(tile, ((CANVAS - TILE) // 2, (CANVAS - TILE) // 2))
    return canvas


def tray_icon(greg: Image.Image) -> Image.Image:
    """Black dog face for the menu bar: macOS recolours a template image to fit the bar.

    A flat silhouette of Greg reads as a ghost at 22px (no ears, no muzzle), so the inner outline strokes and the bright
    areas (muzzle, chest bib, eye highlights) are carved out of it: that is what makes ears, eyes and nose show.
    """
    box = (300, 80, 930, 700)  # head and shoulders, source coordinates
    pad = 2
    body = greg.crop(box)
    silhouette = body.getchannel("A").filter(ImageFilter.GaussianBlur(1.0)).point(lambda a: 255 if a > 110 else 0)
    luma = body.convert("L")
    inner = silhouette.filter(ImageFilter.MinFilter(9))  # never carve the outer edge
    carve = ImageChops.lighter(luma.point(lambda v: 255 if v > 175 else 0), luma.point(lambda v: 255 if v < 60 else 0))
    carve = ImageChops.multiply(carve, inner).filter(ImageFilter.MaxFilter(3))
    face = ImageChops.subtract(silhouette, carve)
    side = max(face.size)
    square = Image.new("L", (side, side), 0)
    square.paste(face, ((side - face.width) // 2, (side - face.height) // 2))
    layer = Image.new("L", (TRAY_PX, TRAY_PX), 0)
    layer.paste(square.resize((TRAY_PX - 2 * pad,) * 2, Image.LANCZOS), (pad, pad))
    icon = Image.new("RGBA", (TRAY_PX, TRAY_PX), (0, 0, 0, 0))
    icon.putalpha(layer)
    return icon


if __name__ == "__main__":
    greg = keyed(SOURCE)
    app_icon(greg).save(OUT / "app-icon.png")
    tray = tray_icon(greg)
    tray.save(OUT / "tray.png")
    (OUT / "tray.rgba").write_bytes(tray.tobytes())
    print("wrote app-icon.png, tray.png, tray.rgba")
