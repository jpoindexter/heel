import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AttentionSettingsSchema, AttentionViewSchema, DEFAULT_ATTENTION_SETTINGS, type AttentionSettings, type AttentionViewDto } from "../../shared/api";
import type { Client } from "../api/client";

export type AttentionState = {
  settings: AttentionSettings;
  day: AttentionViewDto["day"] | null;
  /** Save the switch and the wander list; the shell is told at once. Returns the sentence when the helper refuses. */
  change: (next: AttentionSettings) => Promise<string | null>;
  reloadDay: () => Promise<void>;
};

const AttentionContext = createContext<AttentionState | null>(null);

/** Tell the shell whether to read anything at all. Outside Tauri there is no shell. */
const tellShell = (enabled: boolean) => void invoke("set_attention_enabled", { enabled }).catch(() => undefined);

/** Attention sense's switch and today's seconds per app, read from the helper once and kept for the panel. */
export function AttentionProvider({ client, children }: { client: Client; children: ReactNode }) {
  const [settings, setSettings] = useState<AttentionSettings>(DEFAULT_ATTENTION_SETTINGS);
  const [day, setDay] = useState<AttentionViewDto["day"] | null>(null);

  const reloadDay = useCallback(async () => {
    const result = await client.get("/attention", AttentionViewSchema);
    if (!result.ok) return;
    setSettings(result.data.settings);
    setDay(result.data.day);
  }, [client]);

  useEffect(() => {
    void reloadDay();
  }, [reloadDay]);

  useEffect(() => tellShell(settings.enabled), [settings.enabled]);

  const change = useCallback(
    async (next: AttentionSettings): Promise<string | null> => {
      const result = await client.put("/attention/settings", AttentionSettingsSchema, next);
      if (!result.ok) return result.error.message;
      setSettings(result.data);
      return null;
    },
    [client],
  );

  const value = useMemo<AttentionState>(() => ({ settings, day, change, reloadDay }), [settings, day, change, reloadDay]);
  return <AttentionContext.Provider value={value}>{children}</AttentionContext.Provider>;
}

export function useAttentionSettings(): AttentionState {
  const state = useContext(AttentionContext);
  if (!state) throw new Error("useAttentionSettings needs an <AttentionProvider> above it (the panel renders one).");
  return state;
}
