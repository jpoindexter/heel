import { useCallback, useEffect, useState } from "react";
import { DraftReplySchema, MailStatusSchema, SendReplySchema, type DigestItemDto } from "../../shared/api";
import { z } from "zod";
import type { Client } from "../api/client";
import { beginWork } from "../mascot/motion-events";
import { sentNotice } from "./reply-model";

const Opened = z.object({ opened: z.boolean() });

/** Is Apple Mail on this Mac? (Asked once; Mail itself is not touched until the person presses Email.) */
export function useMailStatus(client: Client, active: boolean): { available: boolean } {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!active) return;
    void client.get("/mail/status", MailStatusSchema).then((r) => r.ok && setAvailable(r.data.available));
  }, [active, client]);
  return { available };
}

export type ReplyState =
  | { phase: "idle" }
  | { phase: "asking"; item: DigestItemDto }
  | { phase: "drafting"; item: DigestItemDto; instruction: string }
  | { phase: "preview"; item: DigestItemDto; instruction: string; body: string; sentToModel: string }
  | { phase: "sending"; item: DigestItemDto; instruction: string; body: string; sentToModel: string }
  | { phase: "error"; item: DigestItemDto; instruction: string; message: string };

type Notify = (message: string, tone?: "info" | "error") => void;

/** Reply to one digest item: ask what to say → the AI drafts → preview → Send (or finish it in Mail). Nothing is sent before Send. */
export function useReplyFlow(client: Client, notify: Notify) {
  const [state, setState] = useState<ReplyState>({ phase: "idle" });

  const start = useCallback((item: DigestItemDto) => setState({ phase: "asking", item }), []);
  const cancel = useCallback(() => setState({ phase: "idle" }), []);
  const setBody = useCallback((body: string) => setState((s) => (s.phase === "preview" ? { ...s, body } : s)), []);

  const draft = useCallback(
    async (item: DigestItemDto, instruction: string) => {
      setState({ phase: "drafting", item, instruction });
      const endWork = beginWork("draft");
      const result = await client.post("/mail/reply/draft", DraftReplySchema, { messageId: item.messageId, from: item.from, subject: item.subject, summary: item.summary, instruction });
      endWork();
      setState(result.ok ? { phase: "preview", item, instruction, body: result.data.draft, sentToModel: result.data.sentToModel } : { phase: "error", item, instruction, message: result.error.message });
    },
    [client],
  );

  const send = useCallback(async () => {
    if (state.phase !== "preview") return;
    setState({ ...state, phase: "sending" });
    const result = await client.post("/mail/reply/send", SendReplySchema, { messageId: state.item.messageId, body: state.body });
    if (!result.ok) return setState({ phase: "error", item: state.item, instruction: state.instruction, message: result.error.message });
    notify(sentNotice(state.item.from));
    setState({ phase: "idle" });
  }, [client, notify, state]);

  const openInMail = useCallback(async () => {
    if (state.phase !== "preview") return;
    const result = await client.post("/mail/reply/open", SendReplySchema, { messageId: state.item.messageId, body: state.body });
    if (!result.ok) return notify(result.error.message, "error");
    notify("Opened in Mail. Nothing was sent.");
    setState({ phase: "idle" });
  }, [client, notify, state]);

  return { state, start, cancel, draft, setBody, send, openInMail };
}

/** Show a message in Mail. */
export function useOpenMail(client: Client, notify: Notify) {
  return useCallback(
    async (messageId: string) => {
      const result = await client.post("/mail/open", Opened, { messageId });
      if (!result.ok) notify(result.error.message, "error");
    },
    [client, notify],
  );
}
