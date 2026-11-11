import { useState } from "react";
import { Button } from "@radix-ui/themes";
import type { ApplicationView } from "../../shared/applications";

export function ApplicationControls({ application: app, disabled, onReview }: { application: ApplicationView; disabled: boolean; onReview: (input: { button: string; final: boolean; review: string }) => void }) {
  const [button, setButton] = useState("");
  const [final, setFinal] = useState(false);
  return <>
    <label>Site button to use<select value={button} disabled={disabled} onChange={e => setButton(e.target.value)}><option value="">Choose a site control</option>{app.buttons.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</select></label>
    <label className="application-check"><input type="checkbox" checked={final} disabled={disabled} onChange={e => setFinal(e.target.checked)} />This is the final application submission</label>
    <Button disabled={disabled || !button || !app.review} onClick={() => onReview({ button, final, review: app.review! })}>Review {final ? "submission" : "next step"}</Button>
  </>;
}
