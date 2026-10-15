import { Button, Card, Text } from "@radix-ui/themes";
import type { PomodoroViewDto } from "../../shared/api";
import { describePomodoro, nextPhase } from "../../shared/pomodoro";
import type { Move } from "./usePomodoro";

type Props = { view: PomodoroViewDto; onMove: (move: Move) => void; onDone: () => void };

const NEXT_LABEL = { work: "Start the next work", short: "Take the break", long: "Take the long break" } as const;

/** A Pomodoro in flight: the phase and the minutes left with Pause, Skip and Stop; at a phase's end, what comes next. */
export function PomodoroStatus({ view, onMove, onDone }: Props) {
  const { state, config } = view;
  if (!state) return null;
  const { title, detail } = describePomodoro(state, config, Date.now());
  if (state.waiting) {
    const next = nextPhase(state, config);
    return (
      <Card size="2" variant="surface" role="region" aria-live="polite" aria-label="Pomodoro" className="check-in">
        <Text size="3" weight="medium">{title} {detail}.</Text>
        <div className="focus-actions">
          <Button size="2" highContrast onClick={() => onMove("next")}>{NEXT_LABEL[next]}</Button>
          {state.phase === "work" && state.taskId && <Button size="2" variant="soft" onClick={onDone}>Task done</Button>}
          <Button size="2" variant="soft" color="gray" onClick={() => onMove("stop")}>Stop</Button>
        </div>
      </Card>
    );
  }
  return (
    <Card size="1" variant="surface" role="region" aria-label="Pomodoro" className="focus-bar">
      <Text size="2" className="focus-line">
        <Text size="1" color="gray" weight="medium" className="focus-label">{title.toUpperCase()}</Text> {state.phase === "work" ? state.goal : ""}
        <Text size="1" color="gray" className="focus-until"> · {detail}</Text>
      </Text>
      <Button size="1" variant="soft" color="gray" onClick={() => onMove(state.paused ? "resume" : "pause")}>{state.paused ? "Resume" : "Pause"}</Button>
      <Button size="1" variant="ghost" color="gray" onClick={() => onMove("skip")}>Skip</Button>
      <Button size="1" variant="ghost" color="gray" onClick={() => onMove("stop")}>Stop</Button>
    </Card>
  );
}
