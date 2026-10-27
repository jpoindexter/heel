import { describe, expect, it } from "vitest";
import { z } from "zod";
import { TOKEN_HEADER, type ConnectionInfo } from "../../shared/api";
import { createClient } from "./client";

const INFO: ConnectionInfo = { port: 4000, token: "0123456789abcdefTOKEN" };
const Hello = z.object({ hello: z.string() });
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("api client", () => {
  it("sends the token and returns validated data", async () => {
    const seen: { url: string; token: string | null }[] = [];
    const client = createClient({
      readInfo: async () => INFO,
      fetch: async (url, init) => {
        seen.push({ url: String(url), token: new Headers(init?.headers).get(TOKEN_HEADER) });
        return reply({ ok: true, data: { hello: "world" } });
      },
    });
    expect(await client.get("/x", Hello)).toEqual({ ok: true, data: { hello: "world" } });
    expect(seen).toEqual([{ url: "http://127.0.0.1:4000/x", token: INFO.token }]);
  });

  it("sends a JSON body with POST when given one, and none otherwise", async () => {
    const bodies: (BodyInit | null | undefined)[] = [];
    const client = createClient({
      readInfo: async () => INFO,
      fetch: async (_url, init) => {
        bodies.push(init?.body);
        return reply({ ok: true, data: { hello: "x" } });
      },
    });
    await client.post("/turn", Hello, { text: "hi" });
    await client.post("/tasks/1/complete", Hello);
    expect(bodies).toEqual(['{"text":"hi"}', undefined]);
  });

  it("passes a server-side failure through as a value", async () => {
    const client = createClient({
      readInfo: async () => INFO,
      fetch: async () => reply({ ok: false, error: { code: "not_ready", message: "Not signed in." } }),
    });
    expect(await client.put("/brain", Hello, { provider: "codex" })).toEqual({ ok: false, error: { code: "not_ready", message: "Not signed in." } });
  });

  it("says the helper isn't running when there is no connection file, and points at the Restart helper button rather than giving a second instruction", async () => {
    const client = createClient({ readInfo: async () => null, fetch: async () => reply({}) });
    expect(await client.get("/x", Hello)).toEqual({ ok: false, error: { code: "offline", message: "Heel's helper isn't running. Use Restart helper above." } });
  });

  it("says the helper isn't running when the connection is refused, and re-reads the file next time", async () => {
    let reads = 0;
    const client = createClient({
      readInfo: async () => (reads += 1, INFO),
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    });
    expect(await client.get("/x", Hello)).toMatchObject({ ok: false, error: { code: "offline" } });
    await client.get("/x", Hello);
    expect(reads).toBe(2);
  });

  it("re-reads the connection once on 401 (helper restarted with a new token) and then succeeds", async () => {
    const infos = [INFO, { port: 4001, token: "SECONDTOKEN0123456789" }];
    let call = 0;
    const urls: string[] = [];
    const client = createClient({
      readInfo: async () => infos[Math.min(call++, 1)]!,
      fetch: async (url) => {
        urls.push(String(url));
        return urls.length === 1 ? reply({ error: "Missing or wrong token." }, 401) : reply({ ok: true, data: { hello: "again" } });
      },
    });
    expect(await client.get("/x", Hello)).toEqual({ ok: true, data: { hello: "again" } });
    expect(urls).toEqual(["http://127.0.0.1:4000/x", "http://127.0.0.1:4001/x"]);
  });

  it("does not loop on repeated 401s", async () => {
    let calls = 0;
    const client = createClient({
      readInfo: async () => INFO,
      fetch: async () => (calls += 1, reply({ error: "no" }, 401)),
    });
    const result = await client.get("/x", Hello);
    expect(calls).toBe(2);
    expect(result).toMatchObject({ ok: false, error: { code: "bad_response" } });
  });

  it("rejects a response that doesn't match the schema", async () => {
    const client = createClient({ readInfo: async () => INFO, fetch: async () => reply({ ok: true, data: { hello: 5 } }) });
    expect(await client.get("/x", Hello)).toMatchObject({ ok: false, error: { code: "bad_response" } });
  });

  it("answers a stopped request with 'aborted' and keeps using the same helper connection", async () => {
    let reads = 0;
    const stop = new AbortController();
    const client = createClient({
      readInfo: async () => (reads++, INFO),
      fetch: (async (_url: unknown, init?: RequestInit) => {
        const signal = init?.signal;
        if (signal) return new Promise<Response>((_ok, reject) => (signal.aborted ? reject(new DOMException("x", "AbortError")) : signal.addEventListener("abort", () => reject(new DOMException("x", "AbortError")))));
        return reply({ ok: true, data: { hello: "again" } });
      }) as typeof fetch,
    });
    const pending = client.post("/turn", Hello, {}, stop.signal);
    stop.abort();
    expect(await pending).toEqual({ ok: false, error: { code: "aborted", message: "Stopped." } });
    expect(await client.get("/x", Hello)).toEqual({ ok: true, data: { hello: "again" } });
    expect(reads).toBe(1);
  });
});
