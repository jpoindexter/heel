import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DigestItemDto } from "../../shared/api";
import { InboxPanel } from "./InboxPanel";
import type { useDigest } from "./useInbox";
import type { useReplyFlow } from "./useMail";

const item = (messageId: string, subject: string): DigestItemDto => ({ messageId, from: "Aoi <aoi@example.com>", subject, summary: "they ask for the invoice", taskTitle: "Send invoice" });
const noop = async () => undefined;
const reply = { state: { phase: "idle" } } as unknown as ReturnType<typeof useReplyFlow>;

function digest(state: ReturnType<typeof useDigest>["state"]): ReturnType<typeof useDigest> {
  return { state, check: noop, addTask: noop, dismiss: () => undefined };
}
const ready = (error: string | null = null) => ({ phase: "ready" as const, digest: { items: [item("m1", "Invoice"), item("m2", "Van")], considered: 4, sentToModel: "", checkedAt: 0 }, added: [], error });

describe("InboxPanel", () => {
  it("names Open and Reply after the email, so two items are not two identical buttons", () => {
    const html = renderToStaticMarkup(<InboxPanel digest={digest(ready())} reply={reply} onOpen={() => undefined} />);
    expect(html).toContain('aria-label="Open in Mail: Invoice"');
    expect(html).toContain('aria-label="Reply: Van"');
  });

  it("keeps the digest and shows the refusal when one Add task fails", () => {
    const html = renderToStaticMarkup(<InboxPanel digest={digest(ready("The helper did not answer."))} reply={reply} onOpen={() => undefined} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("The helper did not answer.");
    expect(html).toContain("Invoice");
  });
});
