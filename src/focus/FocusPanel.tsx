import { useState } from "react";
import { Button } from "@radix-ui/themes";
import type { NowCard } from "../today/today-model";
import { CheckIn } from "./CheckIn";
import { FocusBar } from "./FocusBar";
import { FocusForm } from "./FocusForm";
import "./focus.css";
import type { useFocus } from "./useFocus";

type Props = { focus: ReturnType<typeof useFocus>; now: NowCard | null };

/** Under the Now strip: start a box, see the one that is running, or answer its check-in. One of the three, never a stack. */
export function FocusPanel({ focus, now }: Props) {
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);
  const { session } = focus;

  if (session && focus.due) {
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
  if (session) return <FocusBar session={session} onStop={() => void focus.stop()} />;
  if (!now) return null;
  if (!starting) {
    return (
      <Button className="focus-start" size="2" variant="soft" color="gray" onClick={() => setStarting(true)}>Start a time-box</Button>
    );
  }
  return (
    <FocusForm
      initialGoal={now.text}
      onCancel={() => setStarting(false)}
      onStart={(goal, realisticMin) => void focus.start({ goal, taskId: now.task.id, realisticMin }).then((started) => started && setStarting(false))}
    />
  );
}
