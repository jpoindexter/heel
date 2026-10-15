import { useId, useState } from "react";
import type { ParkedIdeaDto, TaskDto } from "../../shared/api";

type Props = {
  tasks: readonly TaskDto[];
  parked: readonly ParkedIdeaDto[];
  onComplete: (task: TaskDto) => void;
  onRemove: (task: TaskDto) => void;
  onPromote: (idea: ParkedIdeaDto) => void;
};

/** Everything open and everything parked, folded away by default so the conversation keeps the room (nd-choicereduce). */
export function TaskDrawer({ tasks, parked, onComplete, onRemove, onPromote }: Props) {
  const [open, setOpen] = useState(false);
  const regionId = useId();
  return (
    <section aria-label="Tasks and parked ideas" className="drawer">
      <button type="button" className="drawer-toggle" aria-expanded={open} aria-controls={regionId} onClick={() => setOpen((value) => !value)}>
        <span>Tasks {tasks.length}{parked.length > 0 && ` · Parked ${parked.length}`}</span>
        <span aria-hidden="true" className="chevron" data-open={open || undefined}>›</span>
      </button>
      <div id={regionId} hidden={!open} className="drawer-body">
        {tasks.length === 0 ? (
          <p className="helper">Nothing open.</p>
        ) : (
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
        )}
        {parked.length > 0 && (
          <>
            <h3 className="drawer-heading">Parked ideas</h3>
            <ul className="tasks">
              {parked.map((idea) => (
                <li key={idea.id} className="task parked">
                  <span className="task-title">{idea.idea}</span>
                  <button type="button" className="button button-quiet" aria-label={`Make a task: ${idea.idea}`} onClick={() => onPromote(idea)}>
                    Make task
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
