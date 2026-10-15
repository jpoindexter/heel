import { Button, Text } from "@radix-ui/themes";
import type { ParkedIdeaDto } from "../../shared/api";

type Props = { parked: readonly ParkedIdeaDto[]; onPromote: (idea: ParkedIdeaDto) => void };

/** Ideas set aside for later: a quiet section under the tasks, dimmer so it never competes. "Make task" shows on hover or focus. */
export function ParkedList({ parked, onPromote }: Props) {
  if (parked.length === 0) return null;
  return (
    <section aria-label="Parked" className="parked">
      <Text size="1" weight="medium" color="gray" className="section-label">Parked</Text>
      <ul className="rows">
        {parked.map((idea) => (
          <li key={idea.id} className="task-row parked-row">
            <Text size="2" color="gray" className="grow task-text clamp-1">{idea.idea}</Text>
            <Button size="1" variant="ghost" className="row-action" aria-label={`Make a task: ${idea.idea}`} onClick={() => onPromote(idea)}>Make task</Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
