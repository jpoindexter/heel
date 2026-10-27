"""Builds Heel's app icon and menu-bar icon from Greg's canonical art.

Sources (not committed): assets/heel/animation-v1/references/canonical-base.png (Greg on a #FF00FF key) for the app
icon, and assets/heel/puppy-v1/final/frames-2x/walk-right/012.png (the shipped puppy art, mid-stride) for the menu bar.
Outputs here: app-icon.png (1024, input for `npx tauri icon`), tray.png (preview), tray-preview.png (light and dark bars
at 1x and 2x) and tray.rgba (raw 44x44 RGBA that constants.rs embeds as the menu-bar template icon).
Run: python3 src-tauri/icon-source/make_icons.py
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "assets/heel/animation-v1/references/canonical-base.png"
# A walking dog in profile is the one dog shape everyone reads at 22px; a sitting face reads as a bear.
TRAY_SOURCE = ROOT / "assets/heel/puppy-v1/final/frames-2x/walk-right/012.png"
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


def tray_icon(frame: Image.Image) -> Image.Image:
    """Black dog in profile for the menu bar: macOS recolours a template image to fit the bar.

    The 2x walk frame's alpha is the shape. Limbs are thickened a little before the downscale so the legs and the tail
    survive at 22 points; the whole dog then fits a 44px square (22pt @2x) with a 2px margin.
    """
    pad = 2
    shape = frame.getchannel("A").filter(ImageFilter.GaussianBlur(0.8)).point(lambda a: 255 if a > 90 else 0)
    shape = shape.filter(ImageFilter.MaxFilter(5))  # ~2 source px of limb per side
    body = shape.crop(shape.getbbox())
    side = max(body.size)
    square = Image.new("L", (side, side), 0)
    square.paste(body, ((side - body.width) // 2, (side - body.height) // 2))
    layer = Image.new("L", (TRAY_PX, TRAY_PX), 0)
    layer.paste(square.resize((TRAY_PX - 2 * pad,) * 2, Image.LANCZOS), (pad, pad))
    icon = Image.new("RGBA", (TRAY_PX, TRAY_PX), (0, 0, 0, 0))
    icon.putalpha(layer)
    return icon


def tray_preview(tray: Image.Image) -> Image.Image:
    """What the bar will show: black on a light bar and white on a dark bar, at 1x (22px) and 2x (44px), zoomed 4x."""
    zoom = 4
    sizes = [22, 44]
    bars = [((236, 236, 236), (0, 0, 0)), ((30, 30, 32), (255, 255, 255))]
    cell = 44 * zoom + 16
    sheet = Image.new("RGB", (len(sizes) * cell + 16, len(bars) * cell + 16), (128, 128, 128))
    for column, size in enumerate(sizes):
        mask = tray.getchannel("A").resize((size, size), Image.LANCZOS)
        for row, (bg, fg) in enumerate(bars):
            tile = Image.new("RGB", (size, size), bg)
            tile.paste(Image.new("RGB", (size, size), fg), (0, 0), mask)
            tile = tile.resize((size * zoom, size * zoom), Image.NEAREST)
            sheet.paste(tile, (16 + column * cell, 16 + row * cell))
    return sheet


if __name__ == "__main__":
    if SOURCE.exists():
        app_icon(keyed(SOURCE)).save(OUT / "app-icon.png")
    tray = tray_icon(Image.open(TRAY_SOURCE).convert("RGBA"))
    tray_preview(tray).save(OUT / "tray-preview.png")
    tray.save(OUT / "tray.png")
    (OUT / "tray.rgba").write_bytes(tray.tobytes())
    print("wrote app-icon.png, tray.png, tray.rgba")
