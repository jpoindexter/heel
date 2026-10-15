import { describe, expect, it } from "vitest";
import { createClient } from "../api/client";
import { runUndo } from "./undo";

function recorder() {
  const urls: string[] = [];
  const client = createClient({
    readInfo: async () => ({ port: 4000, token: "0123456789abcdefTOKEN" }),
    fetch: async (url) => {
      urls.push(String(url).replace("http://127.0.0.1:4000", ""));
      const task = { id: "a", title: "t", status: "todo", nowStep: null, source: "manual", sourceRef: null, position: 1, createdAt: 1, updatedAt: 1, completedAt: null, size: null, bucket: null, estimateMin: null };
      return new Response(JSON.stringify({ ok: true, data: String(url).includes("unpark") ? { id: "a" } : { task } }));
    },
  });
  return { client, urls };
}

describe("runUndo", () => {
  it("restores a completed or removed task", async () => {
    const { client, urls } = recorder();
    expect(await runUndo(client, { kind: "restore_task", id: "a" })).toMatchObject({ ok: true });
    expect(urls).toEqual(["/tasks/a/restore"]);
  });

  it("removes a task the AI added", async () => {
    const { client, urls } = recorder();
    await runUndo(client, { kind: "drop_task", id: "a" });
    expect(urls).toEqual(["/tasks/a/drop"]);
  });

  it("forgets a parked idea", async () => {
    const { client, urls } = recorder();
    expect(await runUndo(client, { kind: "unpark", id: "a" })).toMatchObject({ ok: true, data: { id: "a" } });
    expect(urls).toEqual(["/parked/a/unpark"]);
  });
});
