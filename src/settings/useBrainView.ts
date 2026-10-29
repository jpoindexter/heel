import { useCallback, useRef, useState } from "react";
import { BrainStateSchema, type BrainStateDto } from "../../shared/api";
import type { Client } from "../api/client";

export type BrainView = { phase: "loading" } | { phase: "error"; message: string } | { phase: "ready"; state: BrainStateDto };

export type ReadyBrain = Extract<BrainView, { phase: "ready" }>;

/** What the Brain settings show: every provider with its models. `fresh` skips the helper's 30 s status cache ("Check again"). */
export function useBrainView(client: Client) {
  const [view, setView] = useState<BrainView>({ phase: "loading" });
  const ready = useRef<ReadyBrain | null>(null);

  const show = useCallback((next: BrainView) => {
    ready.current = next.phase === "ready" ? next : null;
    setView(next);
  }, []);

  const load = useCallback(
    async (fresh = false) => {
      const result = await client.get(fresh ? "/brain?fresh=1" : "/brain", BrainStateSchema);
      if (!result.ok) return show({ phase: "error", message: result.error.message });
      show({ phase: "ready", state: result.data });
    },
    [client, show],
  );

  return { view, ready, show, load };
}
