#!/usr/bin/env python3
"""
One 2x grid per clip from the puppy-v1 pack (assets/heel/puppy-v1/final/frames-2x/<clip>/NNN.png), as lossless WebP
(up to COLUMNS frames per row, wrapping; WebP caps a side at 16383 px), plus src/mascot/manifests/puppy.json with each
clip's frame count, columns, per-frame durations and loop flag.

The app shows a strip at its logical size (192x208 per cell), so a 2x strip is crisp on Retina and the hit region keeps
working in logical px. Only the clip being played is decoded by the webview, which keeps memory to one clip.

Run from the repo root:  python3 scripts/build-puppy-strips.py
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT / "assets/heel/puppy-v1/final"
OUT_IMAGES = ROOT / "public/mascot/puppy"
OUT_MANIFEST = ROOT / "src/mascot/manifests/puppy.json"
CELL = (192, 208)
SCALE = 2
COLUMNS = 16


def main() -> int:
    source = json.loads((PACK / "manifest.json").read_text())
    if source["logicalFrame"] != list(CELL):
        print(f"pack frames are {source['logicalFrame']}, expected {list(CELL)}", file=sys.stderr)
        return 1
    OUT_IMAGES.mkdir(parents=True, exist_ok=True)
    clips = {}
    total_bytes = 0
    for name, clip in source["animations"].items():
        frames = clip["frames"]
        folder = PACK / "frames-2x" / name
        files = sorted(folder.glob("*.png"))
        if len(files) != len(frames):
            print(f"{name}: {len(files)} frame files but {len(frames)} timed frames", file=sys.stderr)
            return 1
        columns = min(COLUMNS, len(frames))
        rows = -(-len(frames) // columns)
        strip = Image.new("RGBA", (CELL[0] * SCALE * columns, CELL[1] * SCALE * rows), (0, 0, 0, 0))
        for index, file in enumerate(files):
            frame = Image.open(file).convert("RGBA")
            if frame.size != (CELL[0] * SCALE, CELL[1] * SCALE):
                print(f"{name}/{file.name}: {frame.size}, expected {(CELL[0] * SCALE, CELL[1] * SCALE)}", file=sys.stderr)
                return 1
            strip.paste(frame, ((index % columns) * CELL[0] * SCALE, (index // columns) * CELL[1] * SCALE))
        out = OUT_IMAGES / f"{name}.webp"
        strip.save(out, "WEBP", lossless=True, quality=100, method=4)
        total_bytes += out.stat().st_size
        clips[name] = {
            "frames": len(frames),
            "columns": columns,
            "durationsMs": [f["durationMs"] for f in frames],
            "loop": bool(clip["loop"]),
            "rootX": [f.get("rootX", 0) for f in frames] if any(f.get("rootX", 0) for f in frames) else None,
            "label": clip["label"],
        }
    manifest = {
        "source": "assets/heel/puppy-v1/final/manifest.json",
        "cellWidth": CELL[0],
        "cellHeight": CELL[1],
        "scale": SCALE,
        "clips": clips,
    }
    OUT_MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"{len(clips)} clips, {sum(c['frames'] for c in clips.values())} frames, {total_bytes / 1e6:.1f} MB of WebP -> {OUT_IMAGES}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
