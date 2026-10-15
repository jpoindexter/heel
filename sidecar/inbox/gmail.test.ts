import { describe, expect, it } from "vitest";
import { gmailApi } from "./gmail";

function fakeGmail() {
  const calls: { url: string; method: string; auth: string | null }[] = [];
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    calls.push({ url: u, method: init?.method ?? "GET", auth: new Headers(init?.headers).get("authorization") });
    if (u.includes("/profile")) return new Response(JSON.stringify({ emailAddress: "jo@example.com" }));
    if (u.includes("/messages?")) return new Response(JSON.stringify({ messages: [{ id: "m1" }, { id: "m2" }] }));
    const id = u.includes("/messages/m1") ? "m1" : "m2";
    return new Response(JSON.stringify({
      id,
      snippet: id === "m1" ? "Can you send the invoice by Friday?" : "FYI",
      payload: { headers: [{ name: "From", value: "Aoi <aoi@example.com>" }, { name: "Subject", value: `Subject ${id}` }, { name: "Date", value: "Thu, 15 Oct 2026" }] },
    }));
  }) as typeof fetch;
  return { fetcher, calls };
}

describe("gmailApi", () => {
  it("reads who is connected", async () => {
    const { fetcher } = fakeGmail();
    expect(await gmailApi(fetcher, async () => "tok").account()).toBe("jo@example.com");
  });

  it("returns headers and the preview snippet of recent unread or starred mail", async () => {
    const { fetcher } = fakeGmail();
    expect(await gmailApi(fetcher, async () => "tok").candidates()).toEqual([
      { id: "m1", from: "Aoi <aoi@example.com>", subject: "Subject m1", date: "Thu, 15 Oct 2026", snippet: "Can you send the invoice by Friday?" },
      { id: "m2", from: "Aoi <aoi@example.com>", subject: "Subject m2", date: "Thu, 15 Oct 2026", snippet: "FYI" },
    ]);
  });

  it("is read-only: every request is a GET to Gmail, with the token, and none asks for message bodies", async () => {
    const { fetcher, calls } = fakeGmail();
    await gmailApi(fetcher, async () => "tok").candidates();
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call.method).toBe("GET");
      expect(call.url.startsWith("https://gmail.googleapis.com/gmail/v1/users/me/")).toBe(true);
      expect(call.auth).toBe("Bearer tok");
      expect(call.url).not.toContain("format=full");
      expect(call.url).not.toContain("format=raw");
    }
  });

  it("says what went wrong in a sentence when Gmail refuses", async () => {
    const fetcher = (async () => new Response("{}", { status: 403 })) as typeof fetch;
    await expect(gmailApi(fetcher, async () => "tok").account()).rejects.toThrow("Gmail answered with status 403");
  });

  it("handles an empty inbox", async () => {
    const fetcher = (async () => new Response(JSON.stringify({}))) as typeof fetch;
    expect(await gmailApi(fetcher, async () => "tok").candidates()).toEqual([]);
  });
});
