import { ChevronRightIcon } from "@radix-ui/react-icons";
import { Button, Text } from "@radix-ui/themes";
import { Collapsible } from "radix-ui";
import type { ParkedIdeaDto } from "../../shared/api";
import "./drawer.css";

type Props = { parked: readonly ParkedIdeaDto[]; onPromote: (idea: ParkedIdeaDto) => void };

/** Ideas set aside for later, folded away so they never compete with the tasks. */
export function ParkedFold({ parked, onPromote }: Props) {
  if (parked.length === 0) return null;
  return (
    <Collapsible.Root className="drawer">
      <Collapsible.Trigger asChild>
        <Button size="1" variant="ghost" color="gray" className="drawer-toggle">
          <ChevronRightIcon aria-hidden="true" className="chevron" /> Parked ({parked.length})
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content className="drawer-body">
        <ul className="rows">
          {parked.map((idea) => (
            <li key={idea.id} className="row-item">
              <Text size="2" className="grow">{idea.idea}</Text>
              <Button size="1" variant="ghost" aria-label={`Make a task: ${idea.idea}`} onClick={() => onPromote(idea)}>Make task</Button>
            </li>
          ))}
        </ul>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
