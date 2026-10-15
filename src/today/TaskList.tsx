import { Cross2Icon } from "@radix-ui/react-icons";
import { Checkbox, IconButton, Text } from "@radix-ui/themes";
import type { TaskDto } from "../../shared/api";
import "./drawer.css";

type Props = { tasks: readonly TaskDto[]; onComplete: (task: TaskDto) => void; onRemove: (task: TaskDto) => void };

/** The rest of the open tasks, one line each: tick it off, or remove it. */
export function TaskList({ tasks, onComplete, onRemove }: Props) {
  if (tasks.length === 0) return null;
  return (
    <ul className="rows" aria-label="Open tasks">
      {tasks.map((task) => (
        <li key={task.id} className="row-item">
          <Checkbox size="2" checked={false} aria-label={`Complete: ${task.title}`} onCheckedChange={() => onComplete(task)} />
          <Text size="2" className="grow">{task.title}</Text>
          <IconButton size="1" variant="ghost" color="gray" aria-label={`Remove: ${task.title}`} onClick={() => onRemove(task)}>
            <Cross2Icon aria-hidden="true" />
          </IconButton>
        </li>
      ))}
    </ul>
  );
}
