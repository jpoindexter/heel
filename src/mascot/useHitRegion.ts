import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { opaqueBounds, sameBox, type Box } from "./hit-region";
import type { Sheet } from "./sheets";
import { cellOrigin } from "./timeline";

const cache = new Map<string, Box | null>();
const pixelsBySheet = new Map<string, Promise<ImageData | null>>();

/** A sheet's pixels, read once per image (the puppy clips share one id but each has its own file). Null when it can't be read (then the whole window stays clickable). */
function loadPixels(sheet: Sheet): Promise<ImageData | null> {
  const known = pixelsBySheet.get(sheet.url);
  if (known) return known;
  const { width, height } = sheet.manifest;
  const loading = new Promise<ImageData | null>((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      // Drawn at the manifest's logical size: a 2x sheet is sampled down, so the box comes out in logical px.
      context?.drawImage(image, 0, 0, width, height);
      resolve(context?.getImageData(0, 0, width, height) ?? null);
    };
    image.onerror = () => resolve(null);
    image.src = sheet.url;
  });
  pixelsBySheet.set(sheet.url, loading);
  return loading;
}

function boxFor(sheet: Sheet, pixels: ImageData, row: number, frame: number): Box | null {
  const key = `${sheet.url}:${row}:${frame}`;
  if (!cache.has(key)) {
    const { cellWidth, cellHeight } = sheet.manifest;
    cache.set(key, opaqueBounds(pixels, { ...cellOrigin(sheet.manifest, row, frame), width: cellWidth, height: cellHeight }));
  }
  return cache.get(key) ?? null;
}

/**
 * Tell the shell where the dog actually is in this frame so the rest of the transparent window is click-through.
 * Failures are quiet on purpose: the safe fallback is the old behaviour (whole window clickable).
 */
export function useHitRegion(sheet: Sheet, row: number, frame: number): void {
  const sent = useRef<Box | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadPixels(sheet).then((pixels) => {
      if (cancelled || !pixels) return;
      const box = boxFor(sheet, pixels, row, frame);
      if (sameBox(box, sent.current)) return;
      sent.current = box;
      void invoke("set_mascot_hit_region", box ?? { x: 0, y: 0, width: 0, height: 0 }).catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [sheet, row, frame]);
}
