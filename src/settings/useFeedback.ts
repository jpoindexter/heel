import { useCallback, useState } from "react";
import { FEEDBACK_TO } from "../../shared/feedback";
import type { Client } from "../api/client";
import { copyText } from "../ui/debug-log-report";
import { feedbackMail, mailAsText, openFeedbackMail, reportNow, type FeedbackDraft } from "../ui/feedback-mail";

type Sending = Omit<FeedbackDraft, "report"> & { withReport: boolean };

/** Settings › About › Send feedback: build the email, open it in the mail app, or hand it over as text when that fails. */
export function useFeedback(client: Client) {
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);
  /** The whole email as text, kept only while the mail app could not be opened. */
  const [fallback, setFallback] = useState<string | null>(null);

  const send = useCallback(
    async ({ withReport, ...draft }: Sending): Promise<boolean> => {
      setBusy(true);
      const mail = feedbackMail({ ...draft, report: withReport ? await reportNow(client) : null });
      const opened = await openFeedbackMail(client, mail);
      setBusy(false);
      setFallback(opened ? null : mailAsText(mail));
      setSaid(opened ? `An email to ${FEEDBACK_TO} is open in your mail app. Read it over, then press Send there.` : `Couldn't open a mail app. Copy the email and send it to ${FEEDBACK_TO} yourself.`);
      return opened;
    },
    [client],
  );

  const copyFallback = useCallback(async () => {
    if (fallback === null) return;
    setSaid((await copyText(fallback)) ? `Copied, with the address. Paste it into any email to ${FEEDBACK_TO}.` : "Couldn't copy. Export report… under Debug saves the logs to a file.");
  }, [fallback]);

  return { busy, said, fallback, send, copyFallback };
}
