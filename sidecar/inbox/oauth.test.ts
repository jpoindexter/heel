import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { GMAIL_SCOPE, authUrl, exchangeCode, parseCallback, pkcePair, refreshTokens } from "./oauth";

const CLIENT = { clientId: "id.apps.googleusercontent.com", clientSecret: "shh" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("pkcePair", () => {
  it("makes a challenge that is the hash of the verifier, differently each time", () => {
    const a = pkcePair();
    expect(a.challenge).toBe(createHash("sha256").update(a.verifier).digest("base64url"));
    expect(pkcePair().verifier).not.toBe(a.verifier);
  });
});

describe("authUrl", () => {
  it("asks for read-only Gmail and nothing else, with PKCE and offline access", () => {
    const url = new URL(authUrl({ clientId: CLIENT.clientId, redirectUri: "http://127.0.0.1:5555/callback", challenge: "c", state: "s" }));
    expect(url.searchParams.get("scope")).toBe(GMAIL_SCOPE);
    expect(GMAIL_SCOPE).toBe("https://www.googleapis.com/auth/gmail.readonly");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("redirect_uri")).toBe("http://127.0.0.1:5555/callback");
  });
});

describe("parseCallback", () => {
  it("accepts a code with the right state", () => expect(parseCallback("/callback?code=abc&state=s1", "s1")).toEqual({ ok: true, code: "abc" }));
  it("refuses a different state", () => expect(parseCallback("/callback?code=abc&state=evil", "s1")).toMatchObject({ ok: false }));
  it("reports a refusal from Google", () => expect(parseCallback("/callback?error=access_denied&state=s1", "s1")).toMatchObject({ ok: false, message: expect.stringContaining("access_denied") }));
  it("needs a code", () => expect(parseCallback("/callback?state=s1", "s1")).toMatchObject({ ok: false }));
});

describe("token calls", () => {
  it("exchanges a code for tokens and computes when the access token ends", async () => {
    const fetcher = (async () => json({ access_token: "a", expires_in: 3600, refresh_token: "r" })) as typeof fetch;
    expect(await exchangeCode(fetcher, CLIENT, { code: "c", verifier: "v", redirectUri: "http://127.0.0.1:1/callback" }, 1_000)).toEqual({ accessToken: "a", expiresAt: 3_601_000, refreshToken: "r" });
  });

  it("explains when Google gives no refresh token, instead of silently losing access tomorrow", async () => {
    const fetcher = (async () => json({ access_token: "a", expires_in: 3600 })) as typeof fetch;
    await expect(exchangeCode(fetcher, CLIENT, { code: "c", verifier: "v", redirectUri: "x" }, 0)).rejects.toThrow("didn't allow Heel to stay connected");
  });

  it("names the likely cause when Google refuses", async () => {
    const fetcher = (async () => json({ error: "invalid_client" }, 401)) as typeof fetch;
    await expect(refreshTokens(fetcher, CLIENT, "r", 0)).rejects.toThrow("Check the client ID and secret in Settings");
  });

  it("keeps the old refresh token when a refresh doesn't send a new one", async () => {
    const fetcher = (async () => json({ access_token: "a2", expires_in: 100 })) as typeof fetch;
    expect((await refreshTokens(fetcher, CLIENT, "r-old", 0)).refreshToken).toBe("r-old");
  });
});
