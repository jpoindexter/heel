import type { TaskDto } from "../../shared/api";
import type { NowCard } from "./today-model";

export function NowSection({ now }: { now: NowCard | null }) {
  return (
    <section aria-labelledby="now-heading" className="now">
      <h2 id="now-heading">Now</h2>
      {now ? (
        <>
          <p className="now-text">{now.text}</p>
          {now.taskTitle && <p className="helper">For: {now.taskTitle}</p>}
        </>
      ) : (
        <p className="helper">Nothing queued yet. Type what's on your mind and I'll turn it into a first step.</p>
      )}
    </section>
  );
}

type ListProps = {
  tasks: TaskDto[];
  hiddenCount: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  onComplete: (task: TaskDto) => void;
  onRemove: (task: TaskDto) => void;
};

export function TaskList({ tasks, hiddenCount, expanded, onToggleExpanded, onComplete, onRemove }: ListProps) {
  if (tasks.length === 0) return null;
  return (
    <section aria-labelledby="tasks-heading">
      <h2 id="tasks-heading" className="visually-hidden">Tasks</h2>
      <ul className="tasks">
        {tasks.map((task) => (
          <li key={task.id} className="task">
            <button type="button" role="checkbox" aria-checked="false" aria-label={`Complete: ${task.title}`} className="icon-button" onClick={() => onComplete(task)}>
              <span className="check" aria-hidden="true" />
            </button>
            <span className="task-title">{task.title}</span>
            <button type="button" aria-label={`Remove: ${task.title}`} className="icon-button" onClick={() => onRemove(task)}>
              <span aria-hidden="true">×</span>
            </button>
          </li>
        ))}
      </ul>
      {(hiddenCount > 0 || expanded) && (
        <button type="button" className="button button-quiet" aria-expanded={expanded} onClick={onToggleExpanded}>
          {expanded ? "Show fewer" : `${hiddenCount} more`}
        </button>
      )}
    </section>
  );
}
