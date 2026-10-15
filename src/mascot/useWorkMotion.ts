import { useEffect, useState } from "react";
import { MOTIONS } from "./life/config";
import { startWalk, stopWalk, walkFinished, type Direction } from "./life/walk";
import { HEEL_STATES, type MotionId } from "./sheets";
import { nextPaceLeg, PACE_DISTANCE_PX, PACE_PAUSE_MS, workVisual, type WorkContext, type WorkVisual } from "./work";

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** Short legs left and right until told to stop; between legs he stands and thinks. */
function usePacing(active: boolean): Direction | null {
  const [leg, setLeg] = useState<Direction | null>(null);
  useEffect(() => {
    if (!active) return;
    let alive = true;
    let last: Direction | null = null;
    const pace = async () => {
      while (alive) {
        last = nextPaceLeg(last);
        const started = await startWalk(last, () => 0, PACE_DISTANCE_PX);
        if (!alive) return;
        if (started) {
          setLeg(started.direction);
          await walkFinished(started.duration_ms);
          setLeg(null);
        }
        await wait(PACE_PAUSE_MS);
      }
    };
    void pace();
    return () => {
      alive = false;
      stopWalk();
      setLeg(null);
    };
  }, [active]);
  return leg;
}

/**
 * What Greg shows while Heel works: the thought bubble, and either pacing (window travel), a sway in place,
 * or nothing beyond his thinking pose. The pose itself is returned so the mascot can give it precedence.
 */
export function useWorkMotion(context: WorkContext): WorkVisual & { motion: MotionId | null } {
  const visual = workVisual(context);
  const leg = usePacing(visual.move === "pace");
  const motion = !context.working ? null : leg === "left" ? MOTIONS.runLeft : leg === "right" ? MOTIONS.runRight : HEEL_STATES.thinking;
  return { ...visual, motion };
}
