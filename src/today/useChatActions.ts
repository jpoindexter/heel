import { useState } from "react";
import { PARK_HINT, type Chip } from "./today-model";
import type { useTasks } from "./useTasks";
import type { useThread } from "./useThread";

type Deps = { thread: ReturnType<typeof useThread>; tasks: ReturnType<typeof useTasks> };

/** What the ask box and the chips do: ask the AI (clearing the box), or park what is typed. */
export function useChatActions({ thread, tasks }: Deps) {
  const [draft, setDraft] = useState("");

  const send = (text: string, label?: string) => {
    if (!text.trim() || thread.busy) return;
    void thread.send(text, label);
  };

  const onSend = () => {
    const text = draft;
    if (!text.trim() || thread.busy) return;
    setDraft("");
    send(text);
  };

  const onChip = async (chip: Chip) => {
    if (chip.prompt) return send(chip.prompt, chip.label);
    if (!draft.trim()) return tasks.showNotice(PARK_HINT);
    if (await tasks.park(draft)) setDraft("");
  };

  return { draft, setDraft, onSend, onChip };
}
