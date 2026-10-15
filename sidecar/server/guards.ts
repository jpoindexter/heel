import { timingSafeEqual } from "node:crypto";
import type { Hono } from "hono";
import { cors } from "hono/cors";
import { TOKEN_HEADER } from "../../shared/api";

/** Only loopback hostnames may reach the server; stops DNS-rebinding from a web page. */
const LOOPBACK_HOST = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/;

function tokenMatches(given: string | undefined, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Guard = { token: string; allowedOrigins: readonly string[] };

/** The three doors every request must pass, in order: loopback Host, allowed browser origin (CORS), the token. */
export function applyGuards(app: Hono, { token, allowedOrigins }: Guard): void {
  app.use("*", async (c, next) => {
    if (!LOOPBACK_HOST.test(c.req.header("host") ?? "")) return c.json({ error: "Forbidden host." }, 403);
    await next();
  });

  app.use(
    "*",
    cors({
      origin: (origin) => (allowedOrigins.includes(origin) ? origin : null),
      allowHeaders: ["content-type", TOKEN_HEADER],
      allowMethods: ["GET", "PUT", "POST", "PATCH", "OPTIONS"],
    }),
  );

  app.use("*", async (c, next) => {
    if (!tokenMatches(c.req.header(TOKEN_HEADER), token)) return c.json({ error: "Missing or wrong token." }, 401);
    await next();
  });
}
