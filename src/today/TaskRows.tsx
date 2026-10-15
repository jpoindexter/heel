import { Cross2Icon, TimerIcon } from "@radix-ui/react-icons";
import { Checkbox, IconButton, Text } from "@radix-ui/themes";
import type { TaskDto } from "../../shared/api";
import "./rows.css";
import type { Method } from "../../shared/method";
import { groupTasks } from "./method-model";
import { TaskBadges, type Patch } from "./TaskBadges";
import type { NowCard } from "./today-model";

type Common = {
  /** The row fading out before it goes. */
  leavingId: string | null;
  /** The row search just led to, tinted for a moment. */
  foundId?: string | null;
  onComplete: (task: TaskDto) => void;
  onRemove: (task: TaskDto) => void;
  method: Method;
  onPatch: Patch;
  onSplit: (task: TaskDto) => void;
};

function RemoveButton({ task, onRemove }: { task: TaskDto; onRemove: (task: TaskDto) => void }) {
  return (
    <IconButton size="1" variant="ghost" color="gray" className="row-action" aria-label={`Remove: ${task.title}`} onClick={() => onRemove(task)}>
      <Cross2Icon aria-hidden="true" />
    </IconButton>
  );
}

type NowProps = Common & { now: NowCard | null; /** No box is running, so one can start. */ canTimebox: boolean; onStartBox: () => void };

/** The one thing to do now: a quiet tinted row. Its clock starts a time-box on it. */
export function NowRow({ now, leavingId, foundId, canTimebox, onStartBox, onComplete, onRemove, method, onPatch, onSplit }: NowProps) {
  if (!now) return null;
  const { task } = now;
  const leaving = leavingId === task.id;
  return (
    <section aria-label="Now" className="task-row" data-now data-leaving={leaving || undefined} data-found={foundId === task.id || undefined}>
      <Checkbox size="2" checked={leaving} aria-label={`Complete: ${task.title}`} onCheckedChange={() => onComplete(task)} />
      <div className="grow">
        <Text size="2" weight="medium" as="p" className="task-text clamp-2">{now.text}</Text>
        {now.taskTitle && <Text size="1" color="gray" as="p" className="task-text clamp-1">{now.taskTitle}</Text>}
        <TaskBadges task={task} method={method} onPatch={onPatch} onSplit={onSplit} />
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

/** The rest of the open tasks, one line each: tick it off; the cross appears on hover or keyboard focus. With a structure on, in its groups. */
export function LaterList({ tasks, leavingId, foundId, onComplete, onRemove, method, onPatch, onSplit }: Common & { tasks: readonly TaskDto[] }) {
  if (tasks.length === 0) return null;
  return (
    <>
      {groupTasks(tasks, method.structure).map((group) => (
        <div key={group.key} className="task-group">
          {group.label && <Text size="1" weight="medium" color="gray" className="section-label">{group.label}</Text>}
          <ul className="rows" aria-label={group.label || "Open tasks"}>
            {group.tasks.map((task) => (
              <li key={task.id} className="task-row" data-leaving={leavingId === task.id || undefined} data-found={foundId === task.id || undefined}>
                <Checkbox size="2" checked={leavingId === task.id} aria-label={`Complete: ${task.title}`} onCheckedChange={() => onComplete(task)} />
                <div className="grow">
                  <Text size="2" as="p" className="task-text clamp-2">{task.title}</Text>
                  <TaskBadges task={task} method={method} onPatch={onPatch} onSplit={onSplit} />
                </div>
                <RemoveButton task={task} onRemove={onRemove} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
