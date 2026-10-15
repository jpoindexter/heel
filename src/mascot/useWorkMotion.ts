import { useEffect, useState } from "react";
import { CLIP_MS, MOTIONS } from "./life/config";
import { startWalk, stopWalk, walkFinished, type Direction } from "./life/walk";
import { HEEL_STATES, type MotionId } from "./sheets";
import { nextPaceLeg, PACE_DISTANCE_PX, PACE_PAUSE_MS, workVisual, type WorkContext, type WorkVisual } from "./work";

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

type Leg = Direction | "turn" | null;

/** Short legs left and right until told to stop. After a leg to the right he turns around (the authored turn faces right to left); after a leg to the left he just pauses and thinks. */
function usePacing(active: boolean): Leg {
  const [leg, setLeg] = useState<Leg>(null);
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
          if (!alive) return;
          if (started.direction === "right") {
            setLeg("turn");
            await wait(CLIP_MS.turnAround);
          }
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
  const still = context.panelOpen ? HEEL_STATES.reviewing : HEEL_STATES.thinking;
  const motion = !context.working ? null : leg === "left" ? MOTIONS.runLeft : leg === "right" ? MOTIONS.runRight : leg === "turn" ? MOTIONS.turnAround : still;
  return { ...visual, motion };
}
