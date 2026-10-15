import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { WALK_FINISHED_EVENT } from "../../events";
import { WALK_DISTANCE_PX, WALK_GRACE_MS } from "./config";

export type Direction = "left" | "right";
export type WalkStarted = { direction: Direction; duration_ms: number };

/** Ask the shell to glide Greg's window along the screen. Null when there is no room, or no shell (browser preview). */
export async function startWalk(direction: Direction, rng: () => number, distancePx?: number): Promise<WalkStarted | null> {
  const [min, max] = WALK_DISTANCE_PX;
  const distance = distancePx ?? min + rng() * (max - min);
  return invoke<WalkStarted | null>("start_walk", { direction, distance }).catch(() => null);
}

export const stopWalk = () => void invoke("stop_walk").catch(() => undefined);

/** Resolves when the shell says the walk ended, or a little after it should have. */
export async function walkFinished(plannedMs: number): Promise<void> {
  let stop: (() => void) | undefined;
  const arrived = new Promise<void>((resolve) => {
    void listen(WALK_FINISHED_EVENT, () => resolve()).then((off) => (stop = off)).catch(() => resolve());
  });
  const late = new Promise<void>((resolve) => window.setTimeout(resolve, plannedMs + WALK_GRACE_MS));
  await Promise.race([arrived, late]);
  stop?.();
}
