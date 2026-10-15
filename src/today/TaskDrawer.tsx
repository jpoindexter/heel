import { ChevronRightIcon, Cross2Icon } from "@radix-ui/react-icons";
import { Button, Checkbox, Heading, IconButton, Text } from "@radix-ui/themes";
import { Collapsible } from "radix-ui";
import type { ParkedIdeaDto, TaskDto } from "../../shared/api";
import "./drawer.css";

type Props = {
  tasks: readonly TaskDto[];
  parked: readonly ParkedIdeaDto[];
  onComplete: (task: TaskDto) => void;
  onRemove: (task: TaskDto) => void;
  onPromote: (idea: ParkedIdeaDto) => void;
};

/** Everything open and everything parked, folded away by default so the conversation keeps the room (nd-choicereduce). */
export function TaskDrawer({ tasks, parked, onComplete, onRemove, onPromote }: Props) {
  return (
    <Collapsible.Root className="drawer" aria-label="Tasks and parked ideas">
      <Collapsible.Trigger asChild>
        <Button variant="surface" color="gray" size="3" className="drawer-toggle">
          <span>Tasks {tasks.length}{parked.length > 0 && ` · Parked ${parked.length}`}</span>
          <ChevronRightIcon aria-hidden="true" className="chevron" />
        </Button>
      </Collapsible.Trigger>
      <Collapsible.Content className="drawer-body">
        {tasks.length === 0 ? (
          <Text as="p" size="2" color="gray">Nothing open.</Text>
        ) : (
          <ul className="rows">
            {tasks.map((task) => (
              <li key={task.id} className="row-item">
                <Checkbox size="3" checked={false} aria-label={`Complete: ${task.title}`} onCheckedChange={() => onComplete(task)} />
                <Text size="2" className="grow">{task.title}</Text>
                <IconButton size="1" variant="ghost" color="gray" aria-label={`Remove: ${task.title}`} onClick={() => onRemove(task)}>
                  <Cross2Icon aria-hidden="true" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
        {parked.length > 0 && (
          <>
            <Heading as="h3" size="1" color="gray" className="drawer-heading">PARKED IDEAS</Heading>
            <ul className="rows">
              {parked.map((idea) => (
                <li key={idea.id} className="row-item">
                  <Text size="2" className="grow">{idea.idea}</Text>
                  <Button size="1" variant="ghost" aria-label={`Make a task: ${idea.idea}`} onClick={() => onPromote(idea)}>Make task</Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
