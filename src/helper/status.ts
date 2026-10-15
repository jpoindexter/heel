import { z } from "zod";

const StatusSchema = z.object({ state: z.enum(["running", "starting", "restarting", "stopped"]), reason: z.string().nullable() });

export type HelperStatus = z.output<typeof StatusSchema>;

/** Until the shell says otherwise (or in a browser preview, which has no shell) the helper is taken to be running. */
export const ASSUMED_RUNNING: HelperStatus = { state: "running", reason: null };

export function statusFromPayload(payload: unknown): HelperStatus | null {
  const parsed = StatusSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

/** The one line under the panel header when the helper is not running; null when everything is fine. */
export function helperNotice(status: HelperStatus): { text: string; canRestart: boolean } | null {
  switch (status.state) {
    case "running":
      return null;
    case "starting":
      return { text: "Starting Heel's helper…", canRestart: false };
    case "restarting":
      return { text: "Heel's helper stopped and is starting again…", canRestart: false };
    case "stopped":
      return { text: status.reason ?? "Heel's helper isn't running.", canRestart: true };
  }
}
