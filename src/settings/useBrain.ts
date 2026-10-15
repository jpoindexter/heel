import { useCallback, useEffect, useRef, useState } from "react";
import { BrainSettingsSchema, BrainStateSchema, ModelsSchema, TestResultSchema, type BrainSettingsDto, type BrainStateDto } from "../../shared/api";
import type { ProviderId } from "../../shared/providers";
import type { Client } from "../api/client";
import { changeMessage } from "./brain-model";

export type BrainView =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; state: BrainStateDto; models: string[] | null };

export type Notice = { message: string; tone: "info" | "error"; undo?: () => void };
export type TestState = { phase: "idle" } | { phase: "running" } | { phase: "done"; ok: boolean; message: string };

const NOTICE_MS = 8_000;

/** `onSaved` runs after a change is stored, so other views (the header chip) can reload without waiting for a focus event. */
export function useBrain(client: Client, active: boolean, onSaved?: () => void) {
  const [view, setView] = useState<BrainView>({ phase: "loading" });
  const [notice, setNotice] = useState<Notice | null>(null);
  const [test, setTest] = useState<TestState>({ phase: "idle" });
  const ready = useRef<Extract<BrainView, { phase: "ready" }> | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  const show = useCallback((next: BrainView) => {
    ready.current = next.phase === "ready" ? next : null;
    setView(next);
  }, []);

  const fetchModels = useCallback(
    async (provider: ProviderId): Promise<string[]> => {
      const result = await client.get(`/brain/models?provider=${provider}`, ModelsSchema);
      if (!result.ok) {
        setNotice({ message: result.error.message, tone: "error" });
        return [];
      }
      return result.data.models;
    },
    [client],
  );

  const load = useCallback(async () => {
    const result = await client.get("/brain", BrainStateSchema);
    if (!result.ok) return show({ phase: "error", message: result.error.message });
    const { provider } = result.data.settings;
    show({ phase: "ready", state: result.data, models: provider ? await fetchModels(provider) : null });
  }, [client, fetchModels, show]);

  const save = useCallback(
    async (next: BrainSettingsDto, withUndo = true) => {
      const current = ready.current;
      if (!current) return;
      const result = await client.put("/brain", BrainSettingsSchema, next);
      if (!result.ok) return setNotice({ message: result.error.message, tone: "error" });
      const previous = current.state.settings;
      const models = result.data.provider ? await fetchModels(result.data.provider) : null;
      show({ phase: "ready", state: { ...current.state, settings: result.data }, models });
      onSaved?.();
      setTest({ phase: "idle" });
      setNotice({
        message: changeMessage(current.state, result.data),
        tone: "info",
        undo: withUndo ? () => void save(previous, false) : undefined,
      });
    },
    [client, fetchModels, onSaved, show],
  );

  const runTest = useCallback(async () => {
    setTest({ phase: "running" });
    const result = await client.post("/brain/test", TestResultSchema);
    setTest({ phase: "done", ok: result.ok, message: result.ok ? result.data.detail : result.error.message });
  }, [client]);

  useEffect(() => {
    // The panel window stays alive between uses: check providers again whenever it is focused (while this tab shows).
    const onFocus = () => {
      if (activeRef.current) void load();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return {
    view,
    notice,
    test,
    refresh: load,
    runTest,
    dismissNotice: () => setNotice(null),
    choose: (provider: ProviderId) => save({ provider, model: null }),
    setModel: (model: string | null) => {
      const provider = ready.current?.state.settings.provider ?? null;
      return provider ? save({ provider, model }) : Promise.resolve();
    },
  };
}
