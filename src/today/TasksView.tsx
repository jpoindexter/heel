import { Text } from "@radix-ui/themes";
import { FocusStarter } from "../focus/FocusStarter";
import { InboxPanel } from "../inbox/InboxPanel";
import { client } from "../api/default-client";
import { NowStrip } from "./NowStrip";
import { ParkedFold } from "./ParkedFold";
import { QuickAdd } from "./QuickAdd";
import { TaskList } from "./TaskList";
import type { useTodayState } from "./useTodayState";

type Props = { state: ReturnType<typeof useTodayState>; active: boolean; onNeedVisible: () => void };

/** The task app: add a task, see the one that is Now, see the rest, nothing else. */
export function TasksView({ state, active, onNeedVisible }: Props) {
  const { tasks, ready, now, focus, inbox } = state;
  const rest = ready ? ready.tasks.slice(1) : [];
  return (
    <div className="tasks-view">
      <QuickAdd active={active} onAdd={tasks.add} onNeedVisible={onNeedVisible} />
      <NowStrip now={now} onComplete={() => now && void tasks.complete(now.task)} />
      <FocusStarter focus={focus} now={now} />
      <TaskList tasks={rest} onComplete={(t) => void tasks.complete(t)} onRemove={(t) => void tasks.remove(t)} />
      {ready && ready.tasks.length === 0 && <Text size="2" color="gray" className="tasks-empty">Nothing to do. Add a task above.</Text>}
      <ParkedFold parked={ready?.parked ?? []} onPromote={(i) => void tasks.promote(i)} />
      <InboxPanel client={client} connected={inbox.status?.connected ?? false} onTaskAdded={() => void tasks.refresh()} />
    </div>
  );
}
