import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CELL_H, CELL_W, COLUMNS, SHEET_H, SHEET_W, MOTIONS, type MotionName } from "./atlas";
import { opaqueBounds, sameBox, type Box } from "./hit-region";

const cache = new Map<string, Box | null>();
let sheet: Promise<ImageData | null> | null = null;

/** The sheet's pixels, read once. Null when it can't be read (then the whole window stays clickable). */
function loadSheet(url: string): Promise<ImageData | null> {
  sheet ??= new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = SHEET_W;
      canvas.height = SHEET_H;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context?.drawImage(image, 0, 0);
      resolve(context?.getImageData(0, 0, SHEET_W, SHEET_H) ?? null);
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
  return sheet;
}

function cellOf(motion: MotionName, frame: number): Box {
  const lookRow = motion === "look" ? Math.floor(frame / COLUMNS) : 0;
  return { x: CELL_W * (frame % COLUMNS), y: CELL_H * (MOTIONS[motion].row + lookRow), width: CELL_W, height: CELL_H };
}

/**
 * Tell the shell where the dog actually is in this frame so the rest of the transparent window is click-through.
 * Failures are quiet on purpose: the safe fallback is the old behaviour (whole window clickable).
 */
export function useHitRegion(sheetUrl: string, motion: MotionName, frame: number): void {
  const sent = useRef<Box | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadSheet(sheetUrl).then((pixels) => {
      if (cancelled || !pixels) return;
      const key = `${motion}:${frame}`;
      if (!cache.has(key)) cache.set(key, opaqueBounds(pixels, cellOf(motion, frame)));
      const box = cache.get(key) ?? null;
      if (sameBox(box, sent.current)) return;
      sent.current = box;
      void invoke("set_mascot_hit_region", box ?? { x: 0, y: 0, width: 0, height: 0 }).catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [sheetUrl, motion, frame]);
}
