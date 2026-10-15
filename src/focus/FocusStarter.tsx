import { useState } from "react";
import { Button } from "@radix-ui/themes";
import type { NowCard } from "../today/today-model";
import { FocusForm } from "./FocusForm";
import "./focus.css";
import type { useFocus } from "./useFocus";

type Props = { focus: ReturnType<typeof useFocus>; now: NowCard | null };

/** Under the Now task: one small button to start a time-box on it. Nothing while a box is already running. */
export function FocusStarter({ focus, now }: Props) {
  const [starting, setStarting] = useState(false);
  if (focus.session || !now) return null;
  if (!starting) {
    return <Button className="focus-start" size="1" variant="ghost" color="gray" onClick={() => setStarting(true)}>Start a time-box</Button>;
  }
  return (
    <FocusForm
      initialGoal={now.text}
      onCancel={() => setStarting(false)}
      onStart={(goal, realisticMin) => void focus.start({ goal, taskId: now.task.id, realisticMin }).then((started) => started && setStarting(false))}
    />
  );
}
