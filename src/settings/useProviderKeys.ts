import { useCallback } from "react";
import { ProviderStatusSchema, type ProviderStatusDto } from "../../shared/api";
import type { KeyedProviderId } from "../../shared/providers";
import type { Client } from "../api/client";
import type { Notice } from "../ui/notice-model";
import type { ReadyBrain } from "./useBrainView";

type Deps = { client: Client; ready: React.RefObject<ReadyBrain | null>; show: (next: ReadyBrain) => void; notify: (notice: Notice) => void };

/** Save or forget an API key (V1-9). The helper checks the key with the provider before keeping it; the panel only ever sees the status back. */
export function useProviderKeys({ client, ready, show, notify }: Deps) {
  const settle = useCallback(
    (status: ProviderStatusDto, said: string) => {
      const current = ready.current;
      if (!current) return;
      const providers = current.state.providers.map((p) => (p.id === status.id ? status : p));
      show({ ...current, state: { ...current.state, providers } });
      notify({ message: said, tone: "info" });
    },
    [notify, ready, show],
  );

  const saveKey = useCallback(
    async (provider: KeyedProviderId, key: string): Promise<string | null> => {
      const result = await client.put("/brain/key", ProviderStatusSchema, { provider, key });
      if (!result.ok) return result.error.message;
      settle(result.data, `${result.data.label} key checked and kept in your Keychain.`);
      return null;
    },
    [client, settle],
  );

  const forgetKey = useCallback(
    async (provider: KeyedProviderId) => {
      const result = await client.post("/brain/key/forget", ProviderStatusSchema, { provider });
      if (!result.ok) return notify({ message: result.error.message, tone: "error" });
      settle(result.data, `${result.data.label} key removed from your Keychain.`);
    },
    [client, notify, settle],
  );

  return { saveKey, forgetKey };
}
