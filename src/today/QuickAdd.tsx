import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Text, TextField } from "@radix-ui/themes";
import { VisuallyHidden } from "radix-ui";
import { MAX_TASK_TITLE, isNewTaskKey, titleFromInput } from "./quick-add";

type Props = {
  /** This view is the one showing. */
  active: boolean;
  /** Add the task; resolves true when it was added (the box then clears). */
  onAdd: (title: string) => Promise<boolean>;
  /** Cmd+N from any screen: show the Tasks screen first, so there is a field to focus. */
  onNeedVisible: () => void;
};

/** Type a task, press Enter: no AI, so it is instant. Cmd+N brings you here from anywhere in the panel. */
export function QuickAdd({ active, onAdd, onNeedVisible }: Props) {
  const box = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState("");
  const title = titleFromInput(typed);

  const [wantFocus, setWantFocus] = useState(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!isNewTaskKey(event)) return;
      event.preventDefault();
      onNeedVisible();
      setWantFocus((count) => count + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNeedVisible]);

  // Focus once the Tasks screen is showing (it may have been hidden when the key was pressed), and whenever it is opened.
  useEffect(() => {
    if (active) box.current?.focus();
  }, [active, wantFocus]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title) return;
    void onAdd(title).then((added) => added && setTyped(""));
  };

  return (
    <form className="quick-add" onSubmit={submit}>
      <VisuallyHidden.Root asChild><label htmlFor="quick-add">Add a task (no AI)</label></VisuallyHidden.Root>
      <TextField.Root
        id="quick-add"
        ref={box}
        size="2"
        maxLength={MAX_TASK_TITLE}
        placeholder="Add a task"
        value={typed}
        aria-describedby="quick-add-help"
        onChange={(event) => setTyped(event.target.value)}
      />
      <Button type="submit" size="2" variant="soft" disabled={!title}>Add</Button>
      <VisuallyHidden.Root asChild><Text id="quick-add-help">Enter adds it. Command N brings you here.</Text></VisuallyHidden.Root>
    </form>
  );
}
