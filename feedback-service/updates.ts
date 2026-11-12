import { z } from "zod";
import type { ReceiverEnv } from "./env";

export const UpdateManifestSchema = z.object({ version: z.string().regex(/^\d+\.\d+\.\d+$/), notes: z.string(), pub_date: z.iso.datetime(), platforms: z.object({ "darwin-aarch64": z.object({ url: z.string(), signature: z.string().min(1) }) }) }).refine(value => value.platforms["darwin-aarch64"].url === `https://github.com/jpoindexter/heel/releases/download/v${value.version}/Heel.app.tar.gz`);

export async function latestUpdate(env: ReceiverEnv): Promise<Response> {
  try {
    const row = await env.DB.prepare("SELECT payload FROM update_feed WHERE id = 'latest'").first<{ payload: string }>();
    if (!row) return new Response(null, { status: 204 });
    return Response.json(UpdateManifestSchema.parse(JSON.parse(row.payload)), { headers: { "Cache-Control": "public, max-age=300" } });
  } catch { return Response.json({ error: "Update service temporarily unavailable" }, { status: 503 }); }
}
