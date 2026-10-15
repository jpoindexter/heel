import { useState } from "react";
import { CheckIn } from "./CheckIn";
import { FocusBar } from "./FocusBar";
import "./focus.css";
import { PomodoroStatus } from "./PomodoroStatus";
import type { useFocus } from "./useFocus";
import type { usePomodoro } from "./usePomodoro";

type Props = { focus: ReturnType<typeof useFocus>; pomodoro: ReturnType<typeof usePomodoro>; onTaskDone: (taskId: string) => void };

/** A running Pomodoro or time-box, or its check-in when it is up. Shown above both screens: it needs you whichever one you are on. */
export function FocusStatus({ focus, pomodoro, onTaskDone }: Props) {
  const [busy, setBusy] = useState(false);
  const { session } = focus;
  const cycle = pomodoro.view?.state;
  if (cycle) {
    return (
      <PomodoroStatus
        view={pomodoro.view!}
        onMove={(move) => void pomodoro.move(move)}
        onDone={() => {
          if (cycle.taskId) onTaskDone(cycle.taskId);
          void pomodoro.move("stop");
        }}
      />
    );
  }
  if (!session) return null;
  if (!focus.due) return <FocusBar session={session} onStop={() => void focus.stop()} />;
  return (
    <CheckIn
      session={session}
      busy={busy}
      onAnswer={(choice, idea) => {
        setBusy(true);
        void focus.answer(choice, idea).finally(() => setBusy(false));
      }}
    />
  );
}
