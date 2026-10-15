import { Cross2Icon, TimerIcon } from "@radix-ui/react-icons";
import { Checkbox, IconButton, Text } from "@radix-ui/themes";
import type { TaskDto } from "../../shared/api";
import type { NowCard } from "./today-model";
import "./drawer.css";

type Common = { onComplete: (task: TaskDto) => void; onRemove: (task: TaskDto) => void };

function RemoveButton({ task, onRemove }: { task: TaskDto; onRemove: (task: TaskDto) => void }) {
  return (
    <IconButton size="1" variant="ghost" color="gray" className="row-action" aria-label={`Remove: ${task.title}`} onClick={() => onRemove(task)}>
      <Cross2Icon aria-hidden="true" />
    </IconButton>
  );
}

type NowProps = Common & { now: NowCard | null; /** No box is running, so one can start. */ canTimebox: boolean; onStartBox: () => void };

/** The one thing to do now: a quiet highlighted row. Its clock starts a time-box on it. */
export function NowRow({ now, canTimebox, onStartBox, onComplete, onRemove }: NowProps) {
  if (!now) return null;
  const { task } = now;
  return (
    <section aria-label="Now" className="task-row" data-now>
      <Checkbox size="2" checked={false} aria-label={`Complete: ${task.title}`} onCheckedChange={() => onComplete(task)} />
      <div className="grow">
        <Text size="2" weight="medium" as="p" className="task-text">{now.text}</Text>
        {now.taskTitle && <Text size="1" color="gray" as="p" className="task-text">{now.taskTitle}</Text>}
      </div>
      {canTimebox && (
        <IconButton size="1" variant="ghost" color="gray" aria-label="Start a time-box on this" onClick={onStartBox}>
          <TimerIcon aria-hidden="true" />
        </IconButton>
      )}
      <RemoveButton task={task} onRemove={onRemove} />
    </section>
  );
}

/** The rest of the open tasks, one line each: tick it off; the cross appears on hover or focus. */
export function LaterList({ tasks, onComplete, onRemove }: Common & { tasks: readonly TaskDto[] }) {
  if (tasks.length === 0) return null;
  return (
    <ul className="rows" aria-label="Open tasks">
      {tasks.map((task) => (
        <li key={task.id} className="task-row">
          <Checkbox size="2" checked={false} aria-label={`Complete: ${task.title}`} onCheckedChange={() => onComplete(task)} />
          <Text size="2" className="grow task-text">{task.title}</Text>
          <RemoveButton task={task} onRemove={onRemove} />
        </li>
      ))}
    </ul>
  );
}
