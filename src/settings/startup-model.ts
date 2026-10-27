import { z } from "zod";

/** What the shell says about the login item (src-tauri/src/startup.rs). */
export const LoginStatusSchema = z.enum(["on", "off", "needs-approval"]);
export type LoginStatus = z.infer<typeof LoginStatusSchema>;

export function parseLoginStatus(payload: unknown): LoginStatus {
  const parsed = LoginStatusSchema.safeParse(payload);
  return parsed.success ? parsed.data : "off";
}

/** One line under the switch when macOS has not finished with it; nothing otherwise. */
export function loginNote(status: LoginStatus): string | null {
  return status === "needs-approval" ? "macOS is waiting for you to allow it: System Settings › General › Login Items." : null;
}
