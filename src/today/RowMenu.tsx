import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { DropdownMenu, IconButton } from "@radix-ui/themes";
import type { TaskDto } from "../../shared/api";

export type EditField = "title" | "nowStep";

type Props = {
  task: TaskDto;
  /** Where the task sits among its siblings, for Move up / Move down / Make this Now. */
  at: { index: number; count: number };
  onEdit: (task: TaskDto, field: EditField) => void;
  onMove: (task: TaskDto, place: number) => void;
};

/** The rest of what a row can do (N7): rename, set the next step, move, make it Now. One ⋯, keyboard-driven like every Radix menu. */
export function RowMenu({ task, at, onEdit, onMove }: Props) {
  const top = task.parentId === null;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton size="1" variant="ghost" color="gray" className="row-action" aria-label={`More: ${task.title}`}>
          <DotsHorizontalIcon aria-hidden="true" />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content size="1">
        <DropdownMenu.Item onSelect={() => onEdit(task, "title")}>Rename</DropdownMenu.Item>
        <DropdownMenu.Item onSelect={() => onEdit(task, "nowStep")}>{task.nowStep ? "Change next step" : "Set next step"}</DropdownMenu.Item>
        <DropdownMenu.Separator />
        {top && at.index > 0 && <DropdownMenu.Item onSelect={() => onMove(task, 0)}>Make this Now</DropdownMenu.Item>}
        <DropdownMenu.Item disabled={at.index === 0} onSelect={() => onMove(task, at.index - 1)}>Move up</DropdownMenu.Item>
        <DropdownMenu.Item disabled={at.index >= at.count - 1} onSelect={() => onMove(task, at.index + 1)}>Move down</DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
