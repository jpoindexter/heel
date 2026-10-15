import { describe, expect, it } from "vitest";
import { ClearedSchema, MessagesStateSchema, envelope } from "../../shared/api";
import { setup } from "./test-app";

const state = envelope(MessagesStateSchema);
const cleared = envelope(ClearedSchema);
const hello = { id: 1, role: "user", text: "hello" };

describe("messages routes", () => {
  it("starts empty, saves a message by its id, and returns it on the next load", async () => {
    const { json, call } = setup();
    expect(state.parse(await json("/messages"))).toEqual({ ok: true, data: { messages: [], nextId: 1 } });
    const put = await call("/messages/1", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: hello }) });
    expect(await put.json()).toEqual({ ok: true, data: { id: 1 } });
    expect(state.parse(await json("/messages"))).toEqual({ ok: true, data: { messages: [hello], nextId: 2 } });
  });

  it("refuses an id that does not match the message, and a malformed message", async () => {
    const { call } = setup();
    const send = async (path: string, body: unknown) =>
      (await call(path, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
    expect(await send("/messages/2", { message: hello })).toMatchObject({ ok: false, error: { code: "invalid" } });
    expect(await send("/messages/1", { message: { id: 1, role: "user" } })).toMatchObject({ ok: false });
  });

  it("clear then restore round-trips", async () => {
    const { store, post, json } = setup();
    store.messages.save(hello);
    const result = cleared.parse(await post("/messages/clear"));
    expect(result).toMatchObject({ ok: true, data: { count: 1 } });
    expect(state.parse(await json("/messages"))).toMatchObject({ data: { messages: [] } });
    if (!result.ok || result.data.clearedAt === null) throw new Error("setup");
    expect(await post("/messages/restore", { clearedAt: result.data.clearedAt })).toEqual({ ok: true, data: { count: 1 } });
    expect(state.parse(await json("/messages"))).toMatchObject({ data: { messages: [hello] } });
  });
});
