import { createClient } from "./client";

/** One shared client so the connection info is read once and re-read only when it goes stale. */
export const client = createClient();
