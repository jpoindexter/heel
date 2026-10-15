import { useCallback, useEffect, useRef, useState } from "react";
import { ParkedResultSchema, TaskResultSchema, TasksStateSchema, TurnResultSchema, type TaskDto } from "../../shared/api";
import type { Client } from "../api/client";
import { celebrate, stumble, thinking } from "../mascot/motion-events";
import { appliedLines, replyError, type AppliedLine } from "./today-model";

export type TodayState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; tasks: TaskDto[]; parkedCount: number };

export type Reply =
  | { kind: "say"; say: string; lines: AppliedLine[] }
  | { kind: "error"; message: string; offerSettings: boolean };

export type Notice = { message: string; tone: "info" | "error"; undo?: () => void };

const NOTICE_MS = 8_000;

export function useToday(client: Client) {
  const [state, setState] = useState<TodayState>({ phase: "loading" });
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<Reply | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    const result = await client.get("/tasks", TasksStateSchema);
    setState(result.ok ? { phase: "ready", ...result.data } : { phase: "error", message: result.error.message });
  }, [client]);

  useEffect(() => {
    void refresh();
    // The panel window stays alive between uses: reload whenever it is focused.
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /** Ask the AI. Returns true when it answered, so the caller can clear the ask box. */
  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed || busyRef.current) return false;
      busyRef.current = true;
      setBusy(true);
      setReply(null);
      void thinking();
      const result = await client.post("/turn", TurnResultSchema, { text: trimmed });
      busyRef.current = false;
      setBusy(false);
      if (result.ok) {
        setReply({ kind: "say", say: result.data.say, lines: appliedLines(result.data.applied) });
        void celebrate();
      } else {
        setReply({ kind: "error", ...replyError(result.error.code, result.error.message) });
        void stumble();
      }
      await refresh();
      return result.ok;
    },
    [client, refresh],
  );

  const park = useCallback(
    async (text: string): Promise<boolean> => {
      const result = await client.post("/parked", ParkedResultSchema, { text });
      if (!result.ok) {
        setNotice({ message: result.error.message, tone: "error" });
        return false;
      }
      setNotice({ message: `Parked: ${text.trim()}`, tone: "info" });
      await refresh();
      return true;
    },
    [client, refresh],
  );

  /** Complete or remove a task right away; Undo restores it. */
  const settle = useCallback(
    async (task: TaskDto, action: "complete" | "drop") => {
      setState((current) => (current.phase === "ready" ? { ...current, tasks: current.tasks.filter((t) => t.id !== task.id) } : current));
      const result = await client.post(`/tasks/${task.id}/${action}`, TaskResultSchema);
      if (!result.ok) {
        setNotice({ message: result.error.message, tone: "error" });
        return refresh();
      }
      const undo = async () => {
        await client.post(`/tasks/${task.id}/restore`, TaskResultSchema);
        await refresh();
      };
      setNotice({ message: `${action === "complete" ? "Completed" : "Removed"}: ${task.title}`, tone: "info", undo: () => void undo() });
    },
    [client, refresh],
  );

  return {
    state,
    busy,
    reply,
    notice,
    send,
    park,
    complete: (task: TaskDto) => settle(task, "complete"),
    remove: (task: TaskDto) => settle(task, "drop"),
    refresh,
    dismissNotice: () => setNotice(null),
    clearReply: () => setReply(null),
    showHint: (message: string) => setNotice({ message, tone: "info" }),
  };
}
