import { useCallback, useRef, useState } from "react";
import { titleFromInput } from "./quick-add";
import { CHIPS } from "./today-model";
import type { useTasks } from "./useTasks";
import type { useThread } from "./useThread";

type Deps = { thread: ReturnType<typeof useThread>; tasks: ReturnType<typeof useTasks> };

/** What the box does: Enter talks to Heel; Add and Park act on the typed text at once, no AI. Plan and Stuck ask with a fixed prompt. */
export function useChatActions({ thread, tasks }: Deps) {
  const [draft, setDraft] = useState("");
  const inFlight = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const isDraftEmpty = useCallback(() => draftRef.current.trim().length === 0, []);

  const ask = (text: string, label?: string) => {
    if (!text.trim() || thread.busy) return false;
    void thread.send(text, label);
    return true;
  };

  /** Enter. Returns true when a turn started (the box then clears). */
  const send = (): boolean => {
    if (isDraftEmpty() || thread.busy) return false;
    const text = draftRef.current;
    setDraft("");
    return ask(text);
  };

  const askChip = (id: "plan" | "stuck") => {
    const chip = CHIPS.find((c) => c.id === id);
    if (chip) ask(chip.prompt, chip.label);
  };

  const settle = async (run: (text: string) => Promise<boolean>, hint: string): Promise<boolean> => {
    const text = draftRef.current;
    if (!text.trim()) return tasks.showNotice(hint), false;
    if (inFlight.current) return false;
    inFlight.current = true;
    try {
      const done = await run(text);
      if (done) setDraft("");
      return done;
    } finally {
      inFlight.current = false;
    }
  };

  const addTyped = () => settle((text) => tasks.add(titleFromInput(text) ?? ""), "Type the task, then press ⌘↩ or + › Add task.");
  const parkTyped = () => settle((text) => tasks.park(text), "Type the idea, then + › Park.");

  return { draft, setDraft, isDraftEmpty, send, askChip, addTyped, parkTyped };
}
