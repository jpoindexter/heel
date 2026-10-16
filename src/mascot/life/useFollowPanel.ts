import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { FOLLOW_MIN_PX, FOLLOW_STOP_PX } from "./config";
import type { Direction } from "./walk";

type Options = { panelOpen: boolean; follow: (direction: Direction, distancePx: number) => boolean };

/** How far the parked panel's middle is from Greg's, in logical px (positive = to his right); null when docked or hidden. */
export function followLeg(offsetPx: number | null): { direction: Direction; distancePx: number } | null {
  if (offsetPx === null || Math.abs(offsetPx) < FOLLOW_MIN_PX) return null;
  return { direction: offsetPx > 0 ? "right" : "left", distancePx: Math.abs(offsetPx) - FOLLOW_STOP_PX };
}

/** When the parked panel opens a stride away he trots to it (N25); when it closes he wanders back the way he came. */
export function useFollowPanel({ panelOpen, follow }: Options): void {
  const latest = useRef(follow);
  latest.current = follow;
  const walked = useRef<{ direction: Direction; distancePx: number } | null>(null);
  useEffect(() => {
    if (panelOpen) {
      void invoke<number | null>("panel_offset")
        .then((offset) => {
          const leg = followLeg(offset);
          if (leg && latest.current(leg.direction, leg.distancePx)) walked.current = leg;
        })
        .catch(() => undefined);
      return;
    }
    const leg = walked.current;
    walked.current = null;
    if (leg) latest.current(leg.direction === "left" ? "right" : "left", leg.distancePx);
  }, [panelOpen]);
}
