import { useState } from "react";
import { Text } from "@radix-ui/themes";
import { FocusForm } from "../focus/FocusForm";
import { LaterList, NowRow } from "./TaskRows";
import { ParkedFold } from "./ParkedFold";
import type { useTodayState } from "./useTodayState";

/** Now, the rest, and the parked fold. Starting a time-box opens its small form right under the Now row. */
export function TaskSection({ state }: { state: ReturnType<typeof useTodayState> }) {
  const { tasks, ready, now, focus } = state;
  const [starting, setStarting] = useState(false);
  const complete = (t: Parameters<typeof tasks.complete>[0]) => void tasks.complete(t);
  const remove = (t: Parameters<typeof tasks.remove>[0]) => void tasks.remove(t);
  return (
    <>
      <NowRow now={now} canTimebox={!focus.session && !starting} onStartBox={() => setStarting(true)} onComplete={complete} onRemove={remove} />
      {starting && now && !focus.session && (
        <FocusForm
          initialGoal={now.text}
          onCancel={() => setStarting(false)}
          onStart={(goal, realisticMin) => void focus.start({ goal, taskId: now.task.id, realisticMin }).then((started) => started && setStarting(false))}
        />
      )}
      <LaterList tasks={ready ? ready.tasks.slice(1) : []} onComplete={complete} onRemove={remove} />
      {ready && ready.tasks.length === 0 && <Text size="2" color="gray" className="tasks-empty">Nothing on your list. Add one below.</Text>}
      <ParkedFold parked={ready?.parked ?? []} onPromote={(idea) => void tasks.promote(idea)} />
    </>
  );
}
