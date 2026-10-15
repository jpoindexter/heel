import { useCallback, useState } from "react";
import { BrainSettingsSchema, TestResultSchema, type BrainSettingsDto } from "../../shared/api";
import type { ProviderId } from "../../shared/providers";
import type { Client } from "../api/client";
import type { Notice } from "../ui/Notifier";
import { useFocusRefresh } from "../ui/useFocusRefresh";
import { changeMessage } from "./brain-model";
import { useBrainView } from "./useBrainView";

export type { BrainView } from "./useBrainView";
export type TestState = { phase: "idle" } | { phase: "running" } | { phase: "done"; ok: boolean; message: string };

/** `onSaved` runs after a change is stored, so other views (the header chip) can reload without waiting for a focus event. */
export function useBrain(client: Client, active: boolean, onSaved?: () => void) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [test, setTest] = useState<TestState>({ phase: "idle" });
  const { view, ready, show, fetchModels, load } = useBrainView(client, setNotice);
  useFocusRefresh(load, active);

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
      setNotice({ message: changeMessage(current.state, result.data), tone: "info", undo: withUndo ? () => void save(previous, false) : undefined });
    },
    [client, fetchModels, onSaved, ready, show],
  );

  const runTest = useCallback(async () => {
    setTest({ phase: "running" });
    const result = await client.post("/brain/test", TestResultSchema);
    setTest({ phase: "done", ok: result.ok, message: result.ok ? result.data.detail : result.error.message });
  }, [client]);

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
