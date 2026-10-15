/**
 * The JXA that talks to Apple Mail. Each script reads one JSON argument and prints one JSON line.
 * Kept as plain strings so the Node side can be tested without Mail, and so what Heel asks Mail is readable here.
 */

/** Unread mail from the inbox of every account, newest first. Only headers and the first part of the text come back. */
export const LIST_UNREAD = `
function run(argv) {
  const input = JSON.parse(argv[0]);
  const Mail = Application("Mail");
  const since = new Date(Date.now() - input.days * 86400000);
  const items = [];
  for (const box of Mail.inbox().mailboxes()) {
    const messages = box.messages.whose({ readStatus: false, dateReceived: { _greaterThan: since } })();
    for (const m of messages) {
      let preview = "";
      try { preview = String(m.content()).replace(/\\s+/g, " ").trim().slice(0, input.previewChars); } catch (e) {}
      items.push({ id: String(m.messageId()), from: String(m.sender()), subject: String(m.subject()), date: m.dateReceived().toISOString(), preview });
    }
  }
  items.sort((a, b) => (a.date < b.date ? 1 : -1));
  return JSON.stringify({ items: items.slice(0, input.limit), accounts: Mail.accounts().length });
}
`;

/**
 * Reply to one message. With send=false the reply opens in Mail for the person to finish (nothing goes out);
 * with send=true it is sent at once: the route only sets that after the person pressed Send on the preview.
 * The person's words go above Mail's own quoted original.
 */
export const REPLY = `
function run(argv) {
  const input = JSON.parse(argv[0]);
  const Mail = Application("Mail");
  let target = null;
  for (const box of Mail.inbox().mailboxes()) {
    const found = box.messages.whose({ messageId: input.id })();
    if (found.length > 0) { target = found[0]; break; }
  }
  if (!target) return JSON.stringify({ ok: false, error: "not_found" });
  const reply = target.reply({ openingWindow: !input.send });
  let quoted = "";
  try { quoted = String(reply.content()); } catch (e) {}
  reply.content = input.body + "\\n\\n" + quoted;
  if (input.send) { reply.send(); } else { Mail.activate(); }
  return JSON.stringify({ ok: true, sent: Boolean(input.send) });
}
`;

/** A new draft, addressed and filled in, opened in Mail. Never sent: the person reads it there and presses Mail's own Send, or closes it. */
export const NEW_DRAFT = `
function run(argv) {
  const input = JSON.parse(argv[0]);
  const Mail = Application("Mail");
  const draft = Mail.OutgoingMessage({ subject: input.subject, content: input.body, visible: true });
  Mail.outgoingMessages.push(draft);
  if (input.to) { draft.toRecipients.push(Mail.ToRecipient({ address: input.to })); }
  Mail.activate();
  return JSON.stringify({ ok: true });
}
`;
