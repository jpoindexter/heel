import { z } from "zod";
import type { InboxStatusDto } from "../../shared/api";
import { startCallbackServer, type CallbackServer } from "./callback-server";
import { gmailApi, type Candidate } from "./gmail";
import type { SecretStore } from "./keychain";
import { authUrl, exchangeCode, newState, pkcePair, refreshTokens, type Client, type Tokens } from "./oauth";

/** An expected failure is a value with a sentence a person can act on (the route shows it as is). */
export type Outcome<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } };
const ok = <T>(value: T): Outcome<T> => ({ ok: true, value });
const fail = (code: string, message: string): Outcome<never> => ({ ok: false, error: { code, message } });

const CLIENT_KEY = "gmail-client";
const TOKENS_KEY = "gmail-tokens";
const CONNECT_TIMEOUT_MS = 5 * 60 * 1000;
/** Refresh the access token a little before it ends rather than failing a request on it. */
const REFRESH_MARGIN_MS = 60_000;

const ClientBlob = z.object({ clientId: z.string(), clientSecret: z.string() });
const TokensBlob = z.object({ accessToken: z.string(), expiresAt: z.number(), refreshToken: z.string(), account: z.string() });
type Stored = Tokens & { account: string };

export type InboxDeps = {
  fetch: typeof fetch;
  secrets: SecretStore;
  now: () => number;
  /** Open the Google sign-in page in the person's browser. */
  openUrl: (url: string) => Promise<void>;
  startCallback?: (state: string, timeoutMs: number) => Promise<CallbackServer>;
};

async function readJson<T extends z.ZodType>(secrets: SecretStore, key: string, schema: T): Promise<z.output<T> | null> {
  const raw = await secrets.get(key);
  if (!raw) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const readClient = (secrets: SecretStore) => readJson(secrets, CLIENT_KEY, ClientBlob);
const readTokens = (secrets: SecretStore) => readJson(secrets, TOKENS_KEY, TokensBlob);

/** A valid access token: the stored one, or a fresh one (saved) when it is about to end. */
function accessTokenFrom(deps: InboxDeps): () => Promise<string> {
  const { secrets, now } = deps;
  return async () => {
    const [credentials, tokens] = await Promise.all([readClient(secrets), readTokens(secrets)]);
    if (!credentials || !tokens) throw new Error("Gmail isn't connected. Connect it in Settings.");
    if (tokens.expiresAt - REFRESH_MARGIN_MS > now()) return tokens.accessToken;
    const fresh: Stored = { ...(await refreshTokens(deps.fetch, credentials as Client, tokens.refreshToken, now())), account: tokens.account };
    await secrets.set(TOKENS_KEY, JSON.stringify(fresh));
    return fresh.accessToken;
  };
}

/** The sign-in page in the browser. When the Mac refuses, the listener is closed at once rather than left waiting for a redirect that can't come. */
async function openSignIn(deps: InboxDeps, server: CallbackServer, url: string): Promise<Outcome<true>> {
  try {
    await deps.openUrl(url);
    return ok(true);
  } catch (error) {
    server.close();
    return fail("failed", `Couldn't open your browser for Google sign-in (${error instanceof Error ? error.message : String(error)}). Try Connect again.`);
  }
}

/** Wait for Google to send the person back, trade the code for tokens, and keep them. Returns what went wrong, or null. */
async function finishConnect(deps: InboxDeps, server: CallbackServer, credentials: Client, verifier: string): Promise<string | null> {
  const callback = await server.result;
  if (!callback.ok) return callback.message;
  try {
    const tokens = await exchangeCode(deps.fetch, credentials, { code: callback.code, verifier, redirectUri: server.redirectUri }, deps.now());
    const account = await gmailApi(deps.fetch, async () => tokens.accessToken).account();
    await deps.secrets.set(TOKENS_KEY, JSON.stringify({ ...tokens, account }));
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Connecting to Gmail failed.";
  }
}

/** Gmail, read-only. Credentials and tokens live in the Keychain, never in the database or the webview. */
export function createInbox(deps: InboxDeps) {
  const { secrets } = deps;
  let problem: string | null = null;
  const [client, stored] = [() => readClient(secrets), () => readTokens(secrets)];

  return {
    async status(): Promise<InboxStatusDto> {
      const [credentials, tokens] = await Promise.all([client(), stored()]);
      return { configured: credentials !== null, connected: tokens !== null, account: tokens?.account ?? null, problem };
    },

    async setClient(input: { clientId: string; clientSecret: string }): Promise<Outcome<true>> {
      const [clientId, clientSecret] = [input.clientId.trim(), input.clientSecret.trim()];
      if (!clientId || !clientSecret) return fail("invalid", "Paste both the client ID and the client secret from Google Cloud.");
      await secrets.set(CLIENT_KEY, JSON.stringify({ clientId, clientSecret }));
      await secrets.remove(TOKENS_KEY); // tokens belong to the old client
      problem = null;
      return ok(true);
    },

    /** Opens Google's sign-in page and returns at once; the connection completes in the background when Google redirects back. */
    async connect(): Promise<Outcome<{ url: string }>> {
      const credentials = await client();
      if (!credentials) return fail("not_ready", "Add your Google client ID and secret first.");
      const state = newState();
      const { verifier, challenge } = pkcePair();
      const server = await (deps.startCallback ?? startCallbackServer)(state, CONNECT_TIMEOUT_MS);
      const url = authUrl({ clientId: credentials.clientId, redirectUri: server.redirectUri, challenge, state });
      problem = null;
      const opened = await openSignIn(deps, server, url);
      if (!opened.ok) return opened;
      void finishConnect(deps, server, credentials, verifier).then((message) => (problem = message));
      return ok({ url });
    },

    async disconnect(options: { forgetClient?: boolean } = {}): Promise<void> {
      await Promise.all([secrets.remove(TOKENS_KEY), options.forgetClient ? secrets.remove(CLIENT_KEY) : undefined]);
      problem = null;
    },

    async candidates(): Promise<Outcome<Candidate[]>> {
      try {
        return ok(await gmailApi(deps.fetch, accessTokenFrom(deps)).candidates());
      } catch (error) {
        const message = error instanceof Error ? error.message : "Couldn't read Gmail.";
        return fail(message.includes("isn't connected") ? "not_connected" : "failed", message);
      }
    },
  };
}

export type InboxService = ReturnType<typeof createInbox>;
