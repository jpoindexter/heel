import { useRef, useState } from "react";
import { DEFAULT_MODE, modeAfterSubmit, type ComposeMode } from "./compose-model";
import { titleFromInput } from "./quick-add";
import type { Chip } from "./today-model";
import type { useTasks } from "./useTasks";
import type { useThread } from "./useThread";

type Deps = { thread: ReturnType<typeof useThread>; tasks: ReturnType<typeof useTasks> };

/** What the one input and the chips do: add a task, park an idea, or ask the AI. Enter does whatever the mode says. */
export function useChatActions({ thread, tasks }: Deps) {
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<ComposeMode>(DEFAULT_MODE);
  const inFlight = useRef(false);

  const ask = (text: string, label?: string) => {
    if (!text.trim() || thread.busy) return;
    void thread.send(text, label);
  };

  const submit = async () => {
    if (inFlight.current || !draft.trim()) return;
    if (mode === "ask") {
      if (thread.busy) return;
      const text = draft;
      setDraft("");
      return ask(text);
    }
    inFlight.current = true;
    try {
      const done = mode === "add" ? await tasks.add(titleFromInput(draft) ?? "") : await tasks.park(draft);
      if (!done) return;
      setDraft("");
      setMode(modeAfterSubmit(mode));
    } finally {
      inFlight.current = false;
    }
  };

  const onChip = (chip: Chip) => ask(chip.prompt, chip.label);

  return { draft, setDraft, mode, setMode, submit, onChip };
}
