import { FeedbackReportSchema, FeedbackReceiptSchema, type FeedbackReport, type FeedbackReceipt } from "../../shared/reports";

// Public HTTPS address, set at build time. Service credentials never enter the desktop app.
export const FEEDBACK_ENDPOINT: string | null = import.meta.env.VITE_FEEDBACK_ENDPOINT || "https://heel-feedback.jason-poindexter.workers.dev/reports";
type Result = { ok: true; data: FeedbackReceipt } | { ok: false; message: string };

export async function sendReport(report: FeedbackReport, options: { endpoint?: string | null; fetch?: typeof fetch } = {}): Promise<Result> {
  const endpoint = options.endpoint ?? FEEDBACK_ENDPOINT;
  if (!endpoint) return { ok: false, message: "Direct report delivery is not configured in this build. Your report is kept." };
  try {
    const response = await (options.fetch ?? fetch)(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(FeedbackReportSchema.parse(report)), signal: AbortSignal.timeout(20_000) });
    const receipt = FeedbackReceiptSchema.safeParse(await response.json());
    if (response.ok && receipt.success && receipt.data.id === report.id) return { ok: true, data: receipt.data };
    return { ok: false, message: response.status === 429 ? "Too many reports right now. Your report is kept; try again later." : "Sending was not confirmed. Your report is kept. Retry sends the same report ID." };
  } catch { return { ok: false, message: "Could not confirm delivery. Check your connection and retry. Your report is kept with the same ID." }; }
}

export const receiptMessage = (receipt: FeedbackReceipt) => `Report received. Reference: ${receipt.id}.${receipt.notification === "sent" ? " Jason has been notified." : " The email notification is pending; you do not need to send an email."}`;
