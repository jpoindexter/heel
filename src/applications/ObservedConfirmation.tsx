import { useState } from "react";
import { Button, Text } from "@radix-ui/themes";

export function ObservedConfirmation({ busy, onConfirm, onShow }: { busy: boolean; onShow: () => void; onConfirm: (quote: string) => void }) {
  const [quote, setQuote] = useState("");
  const [accepted, setAccepted] = useState(false);
  return <section aria-label="Check the application result">
    <Text as="p" size="2">Check the browser before retrying. If the site has accepted the application, copy its confirmation here in any language.</Text>
    <Button disabled={busy} variant="soft" onClick={onShow}>Show browser</Button>
    <label htmlFor="site-confirmation">Site's acceptance message</label><textarea id="site-confirmation" rows={3} maxLength={1200} disabled={busy} value={quote} onChange={e => setQuote(e.target.value)} />
    <label className="application-check"><input type="checkbox" disabled={busy} checked={accepted} onChange={e => setAccepted(e.target.checked)} />I can see that the site accepted the application</label>
    <Button disabled={busy || !accepted || !quote.trim()} onClick={() => onConfirm(quote)}>Record the site confirmation</Button>
  </section>;
}
