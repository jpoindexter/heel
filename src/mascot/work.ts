import { z } from "zod";
import type { Direction } from "./life/walk";

/** Sent by the panel when something starts or ends: a turn, a digest, a draft. `id` tells two flights apart. */
export const WorkPayloadSchema = z.object({ id: z.string().min(1), active: z.boolean() });
export type WorkPayload = z.output<typeof WorkPayloadSchema>;

export type WorkSet = ReadonlySet<string>;

/** The flights in the air after this message. Two at once is still one state: "working" until the last one lands. */
export function applyWork(current: WorkSet, { id, active }: WorkPayload): WorkSet {
  const next = new Set(current);
  if (active) next.add(id);
  else next.delete(id);
  return next;
}

export const isWorking = (set: WorkSet): boolean => set.size > 0;

/** No flight may be forgotten forever: a begin with no end (the panel reloaded mid-turn) is dropped after this. */
export const WORK_MAX_MS = 180_000;

export type WorkVisual = {
  /** The thought bubble over his head. */
  bubble: boolean;
  /** How he moves: pacing (his window travels), swaying in place (the panel is docked to him), or not at all. */
  move: "pace" | "sway" | "none";
};

export type WorkContext = { working: boolean; panelOpen: boolean; reducedMotion: boolean; quiet: boolean };

/** What Greg shows while Heel works: always the bubble; travel only when nothing speaks against it. */
export function workVisual({ working, panelOpen, reducedMotion, quiet }: WorkContext): WorkVisual {
  if (!working) return { bubble: false, move: "none" };
  if (reducedMotion || quiet) return { bubble: true, move: "none" };
  return { bubble: true, move: panelOpen ? "sway" : "pace" };
}

/** A pace is short legs back and forth, never a trek across the screen. */
export const PACE_DISTANCE_PX = 96;
export const PACE_PAUSE_MS = 600;

export const nextPaceLeg = (last: Direction | null): Direction => (last === "left" ? "right" : "left");
