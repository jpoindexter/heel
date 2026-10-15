import { useEffect, useRef, useState } from "react";
import { Text } from "@radix-ui/themes";
import type { TaskDto } from "../../shared/api";
import { FocusForm } from "../focus/FocusForm";
import { LEAVE_MS } from "./bar-model";
import { ParkedList } from "./ParkedList";
import { LaterList, NowRow } from "./TaskRows";
import type { useTodayState } from "./useTodayState";

/** A ticked or removed row fades out first, then the write happens (it is the write that shows Undo). */
function useLeavingRow(run: (task: TaskDto, action: "complete" | "remove") => void) {
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const leave = (task: TaskDto, action: "complete" | "remove") => {
    if (leavingId) return;
    setLeavingId(task.id);
    timer.current = window.setTimeout(() => {
      setLeavingId(null);
      run(task, action);
    }, LEAVE_MS);
  };
  return { leavingId, complete: (t: TaskDto) => leave(t, "complete"), remove: (t: TaskDto) => leave(t, "remove") };
}

/** Now, the rest, and the parked ideas. Starting a time-box opens its small form right under the Now row. */
export function TaskSection({ state }: { state: ReturnType<typeof useTodayState> }) {
  const { tasks, ready, now, focus } = state;
  const [starting, setStarting] = useState(false);
  const rows = useLeavingRow((task, action) => void (action === "complete" ? tasks.complete(task) : tasks.remove(task)));
  return (
    <>
      <NowRow now={now} leavingId={rows.leavingId} canTimebox={!focus.session && !starting} onStartBox={() => setStarting(true)} onComplete={rows.complete} onRemove={rows.remove} />
      {starting && now && !focus.session && (
        <FocusForm
          initialGoal={now.text}
          onCancel={() => setStarting(false)}
          onStart={(goal, realisticMin) => void focus.start({ goal, taskId: now.task.id, realisticMin }).then((started) => started && setStarting(false))}
        />
      )}
      <LaterList tasks={ready ? ready.tasks.slice(1) : []} leavingId={rows.leavingId} onComplete={rows.complete} onRemove={rows.remove} />
      {ready && ready.tasks.length === 0 && <Text size="2" color="gray" className="tasks-empty in">Nothing on your list. Tell Heel, or + › Add task.</Text>}
      <ParkedList parked={ready?.parked ?? []} onPromote={(idea) => void tasks.promote(idea)} />
    </>
  );
}
