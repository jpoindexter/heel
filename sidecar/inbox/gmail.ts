import { z } from "zod";

const API = "https://gmail.googleapis.com/gmail/v1/users/me";
/** Recent mail that still needs the person: unread or starred, not the promotional tabs. */
const QUERY = "(is:unread OR is:starred) newer_than:7d -category:promotions -category:social";
const MAX_CANDIDATES = 15;

export type Candidate = { id: string; from: string; subject: string; date: string; snippet: string };

const Profile = z.object({ emailAddress: z.string() });
const List = z.object({ messages: z.array(z.object({ id: z.string() })).optional() });
const Message = z.object({
  id: z.string(),
  snippet: z.string().default(""),
  payload: z.object({ headers: z.array(z.object({ name: z.string(), value: z.string() })).default([]) }).default({ headers: [] }),
});

type Fetcher = typeof fetch;

/** Gmail, read-only: every request here is a GET, and only headers and Google's own preview snippet are fetched, never bodies. */
export function gmailApi(fetcher: Fetcher, accessToken: () => Promise<string>) {
  async function get<T extends z.ZodType>(path: string, schema: T): Promise<z.output<T>> {
    const response = await fetcher(`${API}${path}`, { method: "GET", headers: { authorization: `Bearer ${await accessToken()}` } });
    if (!response.ok) throw new Error(`Gmail answered with status ${response.status}. If this keeps happening, disconnect and connect again in Settings.`);
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) throw new Error("Gmail sent something Heel couldn't read.");
    return parsed.data;
  }

  return {
    async account(): Promise<string> {
      return (await get("/profile", Profile)).emailAddress;
    },
    async candidates(): Promise<Candidate[]> {
      const list = await get(`/messages?${new URLSearchParams({ q: QUERY, maxResults: String(MAX_CANDIDATES) })}`, List);
      const query = "format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date";
      const messages = await Promise.all((list.messages ?? []).map((m) => get(`/messages/${encodeURIComponent(m.id)}?${query}`, Message)));
      return messages.map((m) => {
        const header = (name: string) => m.payload.headers.find((h) => h.name.toLowerCase() === name)?.value ?? "";
        return { id: m.id, from: header("from"), subject: header("subject"), date: header("date"), snippet: m.snippet };
      });
    },
  };
}
