import { useCallback, useRef, useState } from "react";
import { SplitProposalSchema, SplitResultSchema, UnsplitResultSchema, type TaskDto } from "../../shared/api";
import type { Client } from "../api/client";
import type { Notice } from "../ui/notice-model";
import { undoThen } from "../ui/undo-said";

export type SplitState = { task: TaskDto; phase: "asking" | "ready" | "error"; steps: string[]; message: string | null } | null;

type Deps = { client: Client; refresh: () => Promise<void>; notify: (notice: Notice) => void };

/** Splitting a task (N23): Heel proposes steps, the person trims the list, "Add these" writes them in one go, with Undo. Nothing is written before that. */
export function useSplit({ client, refresh, notify }: Deps) {
  const [state, setState] = useState<SplitState>(null);
  const latest = useRef(0);

  const propose = useCallback(
    async (task: TaskDto) => {
      const mine = ++latest.current;
      setState({ task, phase: "asking", steps: [], message: null });
      const result = await client.post(`/tasks/${task.id}/split/propose`, SplitProposalSchema, {});
      if (mine !== latest.current) return;
      setState(result.ok ? { task, phase: "ready", steps: result.data.steps, message: null } : { task, phase: "error", steps: [], message: result.error.message });
    },
    [client],
  );

  const remove = useCallback((index: number) => setState((s) => (s ? { ...s, steps: s.steps.filter((_, i) => i !== index) } : s)), []);
  const cancel = useCallback(() => {
    latest.current += 1;
    setState(null);
  }, []);

  const apply = useCallback(async () => {
    if (!state || state.phase !== "ready" || state.steps.length === 0) return;
    const { task, steps } = state;
    const result = await client.post(`/tasks/${task.id}/split`, SplitResultSchema, { titles: steps });
    if (!result.ok) return setState({ ...state, phase: "error", message: result.error.message });
    setState(null);
    await refresh();
    const n = result.data.children.length;
    notify({ message: `${n} step${n === 1 ? "" : "s"} under “${task.title}”`, tone: "info", undo: undoThen(() => client.post(`/tasks/${task.id}/unsplit`, UnsplitResultSchema, {}), refresh, (message) => notify({ message, tone: "error" })) });
  }, [client, notify, refresh, state]);

  return { state, propose, remove, cancel, apply };
}
