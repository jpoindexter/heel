import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { DigestSchema, InboxConnectSchema, InboxStatusSchema, type InboxStatusDto } from "../../shared/api";
import type { Client } from "../api/client";
import { beginWork } from "../mascot/motion-events";
import { afterAddTask, type DigestState } from "./digest-model";

/** After Connect the person is in their browser; look again this often (and for this long) until Google has sent them back. */
const WATCH_MS = 2_000;
const WATCH_FOR_MS = 5 * 60 * 1000;

const AddedSchema = z.object({ id: z.string() });

export type InboxActions = {
  status: InboxStatusDto | null;
  error: string | null;
  saveClient: (clientId: string, clientSecret: string) => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
};

/** Gmail connection state and its actions (read-only: Heel can read recent mail, never send or change it). */
export function useInboxConnection(client: Client, active: boolean): InboxActions {
  const [status, setStatus] = useState<InboxStatusDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watching = useRef<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    const result = await client.get("/inbox/status", InboxStatusSchema);
    if (result.ok) setStatus(result.data);
  }, [client]);

  useEffect(() => {
    if (active) void refresh();
  }, [active, refresh]);

  useEffect(() => () => window.clearInterval(watching.current), []);

  const watchUntilDone = useCallback(() => {
    window.clearInterval(watching.current);
    const started = Date.now();
    watching.current = window.setInterval(async () => {
      const result = await client.get("/inbox/status", InboxStatusSchema);
      if (result.ok) setStatus(result.data);
      const done = result.ok && (result.data.connected || result.data.problem !== null);
      if (done || Date.now() - started > WATCH_FOR_MS) window.clearInterval(watching.current);
    }, WATCH_MS);
  }, [client]);

  const saveClient = useCallback(
    async (clientId: string, clientSecret: string) => {
      const result = await client.put("/inbox/client", InboxStatusSchema, { clientId, clientSecret });
      if (result.ok) setStatus(result.data);
      setError(result.ok ? null : result.error.message);
    },
    [client],
  );

  const connect = useCallback(async () => {
    const result = await client.post("/inbox/connect", InboxConnectSchema);
    setError(result.ok ? null : result.error.message);
    if (result.ok) watchUntilDone();
  }, [client, watchUntilDone]);

  const disconnect = useCallback(async () => {
    const result = await client.post("/inbox/disconnect", InboxStatusSchema);
    if (result.ok) setStatus(result.data);
  }, [client]);

  return { status, error, saveClient, connect, disconnect, refresh };
}

export type { DigestState } from "./digest-model";

/** "Email": ask for the digest (Apple Mail on this Mac) and add items as tasks, once each. */
export function useDigest(client: Client, onTaskAdded: () => void) {
  const [state, setState] = useState<DigestState>({ phase: "idle" });

  const check = useCallback(async () => {
    setState({ phase: "loading" });
    const endWork = beginWork("digest");
    const result = await client.post("/mail/digest", DigestSchema);
    endWork();
    setState(result.ok ? { phase: "ready", digest: result.data, added: [], error: null } : { phase: "error", message: result.error.message });
  }, [client]);

  const addTask = useCallback(
    async (messageId: string, title: string) => {
      const result = await client.post("/inbox/add-task", AddedSchema, { messageId, title });
      setState((s) => afterAddTask(s, messageId, result));
      if (result.ok) onTaskAdded();
    },
    [client, onTaskAdded],
  );

  const dismiss = useCallback(() => setState({ phase: "idle" }), []);
  return { state, check, addTask, dismiss };
}

