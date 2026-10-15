import { useEffect, useRef, useState } from "react";
import { Text } from "@radix-ui/themes";
import type { TaskDto } from "../../shared/api";
import { FocusForm } from "../focus/FocusForm";
import { LEAVE_MS } from "./bar-model";
import { ParkedList } from "./ParkedList";
import { LaterList, NowRow } from "./TaskRows";
import type { useTodayState } from "./useTodayState";
import { useMethod } from "../ui/method";
import { JarMeter } from "./JarMeter";
import { minutesForSize, splitPrompt } from "./size-model";

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
export function TaskSection({ state, foundId = null }: { state: ReturnType<typeof useTodayState>; foundId?: string | null }) {
  const { tasks, ready, now, focus, pomodoro, thread } = state;
  const [starting, setStarting] = useState(false);
  const rows = useLeavingRow((task, action) => void (action === "complete" ? tasks.complete(task) : tasks.remove(task)));
  const { method, numbers } = useMethod();
  const ask = (prompt: string, label: string) => void thread.send(prompt, label);
  const marks = { method, onPatch: (task: TaskDto, change: Parameters<typeof tasks.patch>[1]) => void tasks.patch(task, change), onSplit: (task: TaskDto) => ask(splitPrompt(task.title), "Split") };
  return (
    <>
      <JarMeter tasks={ready?.tasks ?? []} method={method} numbers={numbers} onAsk={ask} />
      <NowRow
        now={now}
        leavingId={rows.leavingId}
        foundId={foundId}
        canTimebox={!focus.session && !pomodoro.view?.state && !starting}
        onStartBox={() => (method.timer === "pomodoro" && now ? void pomodoro.start(now.text, now.task.id) : setStarting(true))}
        onComplete={rows.complete}
        onRemove={rows.remove}
        {...marks}
      />
      {starting && now && !focus.session && (
        <FocusForm
          initialGoal={now.text}
          initialMinutes={minutesForSize(now.task.size, numbers)}
          onCancel={() => setStarting(false)}
          onStart={(goal, realisticMin) => void focus.start({ goal, taskId: now.task.id, realisticMin }).then((started) => started && setStarting(false))}
        />
      )}
      <LaterList tasks={ready ? ready.tasks.slice(1) : []} leavingId={rows.leavingId} foundId={foundId} onComplete={rows.complete} onRemove={rows.remove} {...marks} />
      {ready && ready.tasks.length === 0 && <Text size="2" color="gray" className="tasks-empty in">Nothing on your list. Tell Heel, or + › Add task.</Text>}
      <ParkedList parked={ready?.parked ?? []} onPromote={(idea) => void tasks.promote(idea)} />
    </>
  );
}
