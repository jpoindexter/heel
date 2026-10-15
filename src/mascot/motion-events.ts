import { emit } from "@tauri-apps/api/event";
import { MOTION_EVENT, WORK_EVENT } from "../events";
import { HEEL_STATES, motionDuration, type MotionId } from "./sheets";

/** Tell the mascot window what to do. A plain browser preview has no mascot window, so failures are ignored. */
export function setMotion(motion: MotionId): Promise<void> {
  return emit(MOTION_EVENT, motion).catch(() => undefined);
}

/** Play a one-shot pose, then go back to idle. */
export async function playOnce(motion: MotionId): Promise<void> {
  await setMotion(motion);
  window.setTimeout(() => void setMotion(HEEL_STATES.idle), motionDuration(motion));
}

let flights = 0;

/** Heel started doing something (a turn, a digest, a draft): Greg shows work until the returned function says it ended. */
export function beginWork(kind: string): () => void {
  const id = `${kind}-${++flights}`;
  void emit(WORK_EVENT, { id, active: true }).catch(() => undefined);
  return () => void emit(WORK_EVENT, { id, active: false }).catch(() => undefined);
}
/** Back to sitting, with no fuss (the person stopped him). */
export const settle = () => setMotion(HEEL_STATES.idle);
export const celebrate = () => playOnce(HEEL_STATES.done);
export const stumble = () => playOnce(HEEL_STATES.error);
