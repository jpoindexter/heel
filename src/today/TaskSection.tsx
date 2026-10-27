import { useEffect, useRef, useState } from "react";
import { Text } from "@radix-ui/themes";
import type { TaskDto } from "../../shared/api";
import { FocusForm } from "../focus/FocusForm";
import { LEAVE_MS } from "./bar-model";
import { ParkedList } from "./ParkedList";
import { SplitCard } from "./SplitCard";
import type { EditField } from "./RowMenu";
import { LaterList, NowRow } from "./TaskRows";
import { useSplit } from "./useSplit";
import { client } from "../api/default-client";
import type { useTodayState } from "./useTodayState";
import { useMethod } from "../ui/method";
import { JarMeter } from "./JarMeter";
import { dropsOnBucket } from "./eisenhower-model";
import { bucketPatches } from "./method-model";
import { boxMinutes } from "./two-minute-model";
import { emptyListLine } from "./today-model";

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

/** N7: the words and the order are the person's to change, each with Undo in its toast. */
function useRowEditing(tasks: ReturnType<typeof useTodayState>["tasks"]) {
  const [editing, setEditing] = useState<{ id: string; field: EditField } | null>(null);
  return {
    editing,
    onEdit: (task: TaskDto, field: EditField | null) => setEditing(field ? { id: task.id, field } : null),
    onRename: (task: TaskDto, title: string) => (setEditing(null), void tasks.rename(task, title)),
    onStep: (task: TaskDto, step: string) => (setEditing(null), void tasks.setStep(task, step)),
    onMove: (task: TaskDto, place: number) => void tasks.move(task, place),
  };
}

/** Now, the rest, and the parked ideas. Starting a time-box opens its small form right under the Now row. */
export function TaskSection({ state, foundId = null }: { state: ReturnType<typeof useTodayState>; foundId?: string | null }) {
  const { tasks, ready, now, focus, pomodoro, thread } = state;
  const [starting, setStarting] = useState(false);
  const rows = useLeavingRow((task, action) => void (action === "complete" ? tasks.complete(task) : tasks.remove(task)));
  const { method, numbers } = useMethod();
  const ask = (prompt: string, label: string) => void thread.send(prompt, label);
  const split = useSplit({ client, refresh: tasks.refresh, notify: (notice) => tasks.showNotice(notice.message, notice.tone, notice.undo) });
  const marks = {
    method,
    onPatch: async (task: TaskDto, change: Parameters<typeof tasks.patch>[1]) => {
      if (change.bucket === undefined) return tasks.patch(task, change);
      if (dropsOnBucket(method.structure, change.bucket)) return tasks.remove(task);
      // A bucket tap may write two tasks (the frog demotes the old one); one at a time, so the last refresh sees both.
      for (const p of bucketPatches(method.structure, ready?.tasks ?? [], task, change.bucket)) await tasks.patch(p.task, { bucket: p.bucket });
    },
    onSplit: (task: TaskDto) => void split.propose(task),
    after: (task: TaskDto) => (split.state?.task.id === task.id ? <SplitCard split={split} /> : null),
    open: ready?.tasks ?? [],
    ...useRowEditing(tasks),
  };
  return (
    <>
      <JarMeter tasks={ready?.tasks ?? []} method={method} numbers={numbers} onAsk={ask} />
      <NowRow
        now={now}
        nowParent={now?.task.parentId ? ready?.tasks.find((task) => task.id === now.task.parentId) ?? null : null}
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
          initialMinutes={boxMinutes(now.task, method, numbers)}
          onCancel={() => setStarting(false)}
          onStart={(goal, realisticMin) => void focus.start({ goal, taskId: now.task.id, realisticMin }).then((started) => started && setStarting(false))}
        />
      )}
      <LaterList tasks={ready ? ready.tasks.filter((task) => task.id !== now?.task.id) : []} leavingId={rows.leavingId} foundId={foundId} onComplete={rows.complete} onRemove={rows.remove} {...marks} />
      {ready && ready.tasks.length === 0 && <Text size="2" color="gray" className="tasks-empty in">{emptyListLine(ready.doneToday)}</Text>}
      <ParkedList parked={ready?.parked ?? []} onPromote={(idea) => void tasks.promote(idea)} />
    </>
  );
}
