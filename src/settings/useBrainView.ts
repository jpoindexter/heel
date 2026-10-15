import { useCallback, useRef, useState } from "react";
import { BrainStateSchema, ModelsSchema, type BrainStateDto } from "../../shared/api";
import type { ProviderId } from "../../shared/providers";
import type { Client } from "../api/client";
import type { Notice } from "../ui/Notifier";

export type BrainView =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; state: BrainStateDto; models: string[] | null };

export type ReadyBrain = Extract<BrainView, { phase: "ready" }>;

/** What the Brain settings show: the provider list, and the models of the chosen provider. */
export function useBrainView(client: Client, notify: (notice: Notice) => void) {
  const [view, setView] = useState<BrainView>({ phase: "loading" });
  const ready = useRef<ReadyBrain | null>(null);

  const show = useCallback((next: BrainView) => {
    ready.current = next.phase === "ready" ? next : null;
    setView(next);
  }, []);

  const fetchModels = useCallback(
    async (provider: ProviderId): Promise<string[]> => {
      const result = await client.get(`/brain/models?provider=${provider}`, ModelsSchema);
      if (result.ok) return result.data.models;
      notify({ message: result.error.message, tone: "error" });
      return [];
    },
    [client, notify],
  );

  const load = useCallback(async () => {
    const result = await client.get("/brain", BrainStateSchema);
    if (!result.ok) return show({ phase: "error", message: result.error.message });
    const { provider } = result.data.settings;
    show({ phase: "ready", state: result.data, models: provider ? await fetchModels(provider) : null });
  }, [client, fetchModels, show]);

  return { view, ready, show, fetchModels, load };
}
