import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const VERIFIER_BYTES = 48;
const STATE_BYTES = 16;

const base64Url = (buffer: Buffer): string => buffer.toString("base64url");

/** PKCE: a random secret kept here, and its hash sent to Google, so a stolen redirect can't be redeemed. */
export function pkcePair(): { verifier: string; challenge: string } {
  const verifier = base64Url(randomBytes(VERIFIER_BYTES));
  return { verifier, challenge: base64Url(createHash("sha256").update(verifier).digest()) };
}

export const newState = (): string => base64Url(randomBytes(STATE_BYTES));

export function authUrl(input: { clientId: string; redirectUri: string; challenge: string; state: string }): string {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE,
    code_challenge: input.challenge,
    code_challenge_method: "S256",
    state: input.state,
    access_type: "offline",
    prompt: "consent",
  }).toString();
  return url.toString();
}

export type Callback = { ok: true; code: string } | { ok: false; message: string };

/** What Google sends back to the loopback address: a code, or a refusal. The state must be the one we made. */
export function parseCallback(requestUrl: string, expectedState: string): Callback {
  const params = new URL(requestUrl, "http://127.0.0.1").searchParams;
  if (params.get("error")) return { ok: false, message: `Google said: ${params.get("error")}. Nothing was connected.` };
  if (params.get("state") !== expectedState) return { ok: false, message: "That sign-in didn't match the one Heel started. Try Connect again." };
  const code = params.get("code");
  return code ? { ok: true, code } : { ok: false, message: "Google sent no code. Try Connect again." };
}

const TokenResponse = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
});

export type Tokens = { accessToken: string; expiresAt: number; refreshToken: string };
export type Client = { clientId: string; clientSecret: string };
type Fetcher = typeof fetch;

async function postToken(fetcher: Fetcher, body: Record<string, string>): Promise<z.output<typeof TokenResponse>> {
  const response = await fetcher(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });
  const parsed = TokenResponse.safeParse(await response.json().catch(() => null));
  if (!response.ok || !parsed.success) throw new Error(`Google refused the sign-in (status ${response.status}). Check the client ID and secret in Settings.`);
  return parsed.data;
}

export async function exchangeCode(fetcher: Fetcher, client: Client, input: { code: string; verifier: string; redirectUri: string }, now: number): Promise<Tokens> {
  const token = await postToken(fetcher, {
    client_id: client.clientId,
    client_secret: client.clientSecret,
    code: input.code,
    code_verifier: input.verifier,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
  });
  if (!token.refresh_token) throw new Error("Google didn't allow Heel to stay connected. Remove Heel from your Google account's third-party access and connect again.");
  return { accessToken: token.access_token, expiresAt: now + token.expires_in * 1000, refreshToken: token.refresh_token };
}

export async function refreshTokens(fetcher: Fetcher, client: Client, refreshToken: string, now: number): Promise<Tokens> {
  const token = await postToken(fetcher, {
    client_id: client.clientId,
    client_secret: client.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  return { accessToken: token.access_token, expiresAt: now + token.expires_in * 1000, refreshToken: token.refresh_token ?? refreshToken };
}
