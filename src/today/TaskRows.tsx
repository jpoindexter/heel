import { Cross2Icon, ScissorsIcon, TimerIcon } from "@radix-ui/react-icons";
import { Checkbox, IconButton, Text } from "@radix-ui/themes";
import type { ReactNode } from "react";
import type { TaskDto } from "../../shared/api";
import "./rows.css";
import type { Method } from "../../shared/method";
import { groupTasks } from "./method-model";
import { hueFor } from "./colour-model";
import { nest, progressLabel } from "./split-model";
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
  /** Ask Heel for steps (N23). A step of a task cannot be split again. */
  onSplit: (task: TaskDto) => void;
  /** Something to show right under a task's row (the steps card). */
  after?: (task: TaskDto) => ReactNode;
};

function RemoveButton({ task, onRemove }: { task: TaskDto; onRemove: (task: TaskDto) => void }) {
  return (
    <IconButton size="1" variant="ghost" color="gray" className="row-action" aria-label={`Remove: ${task.title}`} onClick={() => onRemove(task)}>
      <Cross2Icon aria-hidden="true" />
    </IconButton>
  );
}

function SplitButton({ task, onSplit }: { task: TaskDto; onSplit: (task: TaskDto) => void }) {
  if (task.parentId) return null;
  return (
    <IconButton size="1" variant="ghost" color="gray" className="row-action" aria-label={`Split into steps: ${task.title}`} onClick={() => onSplit(task)}>
      <ScissorsIcon aria-hidden="true" />
    </IconButton>
  );
}

type NowProps = Common & { now: NowCard | null; /** The task the Now step belongs to, when it is a step. */ nowParent?: TaskDto | null; /** No box is running, so one can start. */ canTimebox: boolean; onStartBox: () => void };

/** The one thing to do now: a quiet tinted row. Its clock starts a time-box on it. */
export function NowRow({ now, nowParent, leavingId, foundId, canTimebox, onStartBox, onComplete, onRemove, method, onPatch, onSplit, after }: NowProps) {
  if (!now) return null;
  const { task } = now;
  const leaving = leavingId === task.id;
  const hue = hueFor(task, { structure: method.structure, parent: nowParent });
  return (
    <>
      <section aria-label="Now" className="task-row" data-now data-hue={hue} data-leaving={leaving || undefined} data-found={foundId === task.id || undefined}>
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
        <SplitButton task={task} onSplit={onSplit} />
        <RemoveButton task={task} onRemove={onRemove} />
      </section>
      {after?.(task)}
    </>
  );
}

type RowProps = Common & { task: TaskDto; /** Open steps under this task, for "2 of 5". */ openSteps: number; /** The task this row is a step of. */ parent?: TaskDto };

/** One open task (or one step of a task, indented, in its task's colour): tick it off; the cross and the scissors appear on hover or keyboard focus. */
function TaskRow({ task, openSteps, parent, leavingId, foundId, onComplete, onRemove, method, onPatch, onSplit }: RowProps) {
  const step = parent !== undefined;
  const progress = step ? null : progressLabel(task, openSteps);
  const hue = hueFor(task, { structure: method.structure, parent });
  return (
    <li className="task-row" data-hue={hue} data-step={step || undefined} data-leaving={leavingId === task.id || undefined} data-found={foundId === task.id || undefined}>
      <Checkbox size="2" checked={leavingId === task.id} aria-label={`Complete: ${task.title}`} onCheckedChange={() => onComplete(task)} />
      <div className="grow">
        <Text size="2" as="p" className="task-text clamp-2">
          {task.title}
          {progress && <Text size="1" color="gray" as="span" className="task-progress" aria-label={`${progress} steps done`}>{progress}</Text>}
        </Text>
        <TaskBadges task={task} method={method} onPatch={onPatch} onSplit={onSplit} />
      </div>
      <SplitButton task={task} onSplit={onSplit} />
      <RemoveButton task={task} onRemove={onRemove} />
    </li>
  );
}

/** The rest of the open tasks, one line each, steps indented under their task. With a structure on, in its groups. */
export function LaterList({ tasks, ...common }: Common & { tasks: readonly TaskDto[] }) {
  if (tasks.length === 0) return null;
  const nodes = new Map(nest(tasks).map((node) => [node.task.id, node]));
  const parents = [...nodes.values()].map((node) => node.task);
  return (
    <>
      {groupTasks(parents, common.method.structure).map((group) => (
        <div key={group.key} className="task-group">
          {group.label && <Text size="1" weight="medium" color="gray" className="section-label">{group.label}</Text>}
          <ul className="rows" aria-label={group.label || "Open tasks"}>
            {group.tasks.map((task) => {
              const steps = nodes.get(task.id)?.steps ?? [];
              return [
                <TaskRow key={task.id} task={task} openSteps={steps.length} {...common} />,
                ...(common.after?.(task) ? [<li key={`${task.id}-after`}>{common.after(task)}</li>] : []),
                ...steps.map((child) => <TaskRow key={child.id} task={child} openSteps={0} parent={task} {...common} />),
              ];
            })}
          </ul>
        </div>
      ))}
    </>
  );
}
