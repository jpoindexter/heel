export type StoredReport = { id: string; digest: string; stored_at: string; notification: "sent" | "pending" | "failed" | "uncertain" };
export type Statement = {
  bind: (...values: unknown[]) => Statement;
  first: <T>() => Promise<T | null>;
  run: () => Promise<{ meta: { changes: number } }>;
};
export type ReceiverEnv = {
  DB: { prepare: (sql: string) => Statement };
  REPORT_LIMITER: { limit: (input: { key: string }) => Promise<{ success: boolean }> };
  EMAIL: { send: (message: { to: string; from: string; subject: string; text: string }) => Promise<{ messageId: string }> };
  FEEDBACK_FROM: string;
};
