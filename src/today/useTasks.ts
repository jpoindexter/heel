import { useCallback, useEffect, useRef, useState } from "react";
import { ParkedListSchema, ParkedResultSchema, TaskResultSchema, TasksStateSchema, UnparkResultSchema, type ParkedIdeaDto, type TaskDto } from "../../shared/api";
import type { Client } from "../api/client";
import type { Notice } from "../ui/Notifier";

export type TasksState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; tasks: TaskDto[]; parked: ParkedIdeaDto[] };


/** Open tasks, parked ideas, and the Undo toast. `active` = this view is showing (hidden views stay mounted, so drafts survive). */
export function useTasks(client: Client, active: boolean) {
  const [state, setState] = useState<TasksState>({ phase: "loading" });
  const [notice, setNotice] = useState<Notice | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  const refresh = useCallback(async () => {
    const [tasks, parked] = await Promise.all([client.get("/tasks", TasksStateSchema), client.get("/parked", ParkedListSchema)]);
    // A failed reload keeps what is already on screen: stale tasks beat a blank panel. Only a first load can show the error.
    if (!tasks.ok) return setState((current) => (current.phase === "ready" ? current : { phase: "error", message: tasks.error.message }));
    setState({ phase: "ready", tasks: tasks.data.tasks, parked: parked.ok ? parked.data.parked : [] });
  }, [client]);

  useEffect(() => {
    void refresh();
    // The panel window stays alive between uses: reload whenever it is focused (while this view is showing).
    const onFocus = () => activeRef.current && void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  useEffect(() => {
    if (active) void refresh();
  }, [active, refresh]);

  const fail = useCallback((message: string) => setNotice({ message, tone: "error" }), []);

  /** Complete or remove a task right away; Undo restores it. */
  const settle = useCallback(
    async (task: TaskDto, action: "complete" | "drop") => {
      setState((s) => (s.phase === "ready" ? { ...s, tasks: s.tasks.filter((t) => t.id !== task.id) } : s));
      const result = await client.post(`/tasks/${task.id}/${action}`, TaskResultSchema);
      if (!result.ok) {
        fail(result.error.message);
        return refresh();
      }
      const undo = async () => {
        await client.post(`/tasks/${task.id}/restore`, TaskResultSchema);
        await refresh();
      };
      setNotice({ message: `${action === "complete" ? "Completed" : "Removed"}: ${task.title}`, tone: "info", undo: () => void undo() });
    },
    [client, fail, refresh],
  );

  /** Park what is in the ask box. Undo forgets it again. */
  const park = useCallback(
    async (text: string): Promise<boolean> => {
      const result = await client.post("/parked", ParkedResultSchema, { text });
      if (!result.ok) return fail(result.error.message), false;
      const undo = async () => {
        await client.post(`/parked/${result.data.id}/unpark`, UnparkResultSchema);
        await refresh();
      };
      setNotice({ message: `Parked: ${text.trim()}`, tone: "info", undo: () => void undo() });
      await refresh();
      return true;
    },
    [client, fail, refresh],
  );

  const promote = useCallback(
    async (idea: ParkedIdeaDto) => {
      const result = await client.post(`/parked/${idea.id}/promote`, TaskResultSchema);
      if (!result.ok) return fail(result.error.message);
      setNotice({ message: `Now a task: ${idea.idea}`, tone: "info" });
      await refresh();
    },
    [client, fail, refresh],
  );

  return {
    state,
    notice,
    refresh,
    park,
    promote,
    complete: (task: TaskDto) => settle(task, "complete"),
    remove: (task: TaskDto) => settle(task, "drop"),
    dismissNotice: () => setNotice(null),
    showNotice: (message: string, tone: Notice["tone"] = "info") => setNotice({ message, tone }),
  };
}
