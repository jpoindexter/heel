import { z } from "zod";
import { ClearedSchema, MessagesStateSchema } from "../../shared/api";
import type { Client } from "../api/client";
import type { Message } from "./thread-model";

const Saved = z.object({ id: z.number() });
const Restored = z.object({ count: z.number() });

/** Keep a message across restarts. A turn still waiting for the AI is not kept; a failure to save never interrupts the chat. */
export function saveMessage(client: Client, message: Message): void {
  if (message.role === "heel" && message.status === "pending") return;
  void client.put(`/messages/${message.id}`, Saved, { message });
}

/** What was kept, and the next free id. Null when the helper can't say (the thread then just starts empty). */
export async function loadMessages(client: Client): Promise<{ messages: Message[]; nextId: number } | null> {
  const result = await client.get("/messages", MessagesStateSchema);
  return result.ok ? result.data : null;
}

/** Hide the whole conversation. `restore` brings back exactly what this call hid. */
export async function clearConversation(client: Client): Promise<{ count: number; restore: () => Promise<boolean> } | { error: string }> {
  const result = await client.post("/messages/clear", ClearedSchema);
  if (!result.ok) return { error: result.error.message };
  const { clearedAt, count } = result.data;
  return { count, restore: async () => clearedAt !== null && (await client.post("/messages/restore", Restored, { clearedAt })).ok };
}
