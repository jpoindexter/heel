import { useCallback, useEffect, useState } from "react";
import { BrainStateSchema } from "../../shared/api";
import type { Client } from "../api/client";
import { summarizeBrain, type BrainSummary } from "./brain-summary";

/** Which AI answers, for the header chip and the first-run step. Re-checked when the window is focused or Settings closes. */
export function useBrainSummary(client: Client, recheckKey: unknown) {
  const [summary, setSummary] = useState<BrainSummary | null>(null);

  const refresh = useCallback(async () => {
    const result = await client.get("/brain", BrainStateSchema);
    if (result.ok) setSummary(summarizeBrain(result.data));
  }, [client]);

  useEffect(() => {
    void refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh, recheckKey]);

  return { summary, refresh };
}
