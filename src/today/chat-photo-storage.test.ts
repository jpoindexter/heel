import { expect, it, vi } from "vitest";
import { createClient } from "../api/client";
import { saveMessage } from "./thread-storage";
import { answerFrom } from "./thread-model";
import { StoredMessageSchema } from "../../shared/api";

it("keeps image retry bytes in memory while storing only the missing-image marker", async () => {
  const image = { data: "AAAA", mimeType: "image/png" as const, width: 1, height: 1 };
  const failed = answerFrom({ ok: false, error: { code: "failed", message: "Try later" } }, 2, "Describe", image);
  expect(failed).toMatchObject({ imageRequired: true, retryImage: image });
  const stored = StoredMessageSchema.parse(failed);
  expect(stored).toMatchObject({ imageRequired: true }); expect(stored).not.toHaveProperty("retryImage");
  const fetch = vi.fn<typeof globalThis.fetch>(async (_url, init) => {
    const body = JSON.parse(String(init?.body)); expect(body.message).not.toHaveProperty("image"); expect(body.message).not.toHaveProperty("retryImage");
    return new Response(JSON.stringify({ ok: true, data: { id: 1 } }));
  });
  const client = createClient({ readInfo: async () => ({ port: 4000, token: "synthetic-token-for-test" }), fetch });
  saveMessage(client, { id: 1, role: "user", text: "Describe", image }); saveMessage(client, failed);
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
});
