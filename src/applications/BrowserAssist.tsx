import { useEffect, useRef, useState } from "react";
import { Button, Text } from "@radix-ui/themes";
import { BrowserViewSchema } from "../../shared/applications";
import { client } from "../api/default-client";

type Props = { facts: string; disabled: boolean; onBusy: (busy: boolean) => void; onChanged: () => Promise<void> };
export function BrowserAssist({ facts, disabled, onBusy, onChanged }: Props) {
  const [goal, setGoal] = useState("Fill this application from my facts and attachments. Prepare the next step or final submission for my review.");
  const [view, setView] = useState<{ image: string; note: string } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => { controller.current?.abort(); onBusy(false); }, [onBusy]);
  const run = async (action: "view" | "assist") => {
    const stop = new AbortController(); controller.current = stop;
    onBusy(true); setProblem(null);
    try {
      const result = await client.post(`/applications/${action}`, BrowserViewSchema, action === "assist" ? { goal, facts } : {}, stop.signal);
      if (result.ok) setView(result.data);
      else if (!stop.signal.aborted) setProblem(result.error.message);
      await onChanged();
    } finally { onBusy(false); }
  };
  return <details className="browser-assist">
    <summary>Help with an unfamiliar page</summary>
    <Text as="p" size="1">Heel can look at the page and try its controls. This sends a screenshot and your facts to the selected AI. Outgoing requests still wait for Allow once.</Text>
    <label>What to prepare<textarea rows={3} value={goal} maxLength={2000} disabled={disabled} onChange={e => setGoal(e.target.value)} /></label>
    <div className="row"><Button size="1" variant="soft" disabled={disabled} onClick={() => void run("view")}>See page</Button><Button size="1" disabled={disabled || !goal.trim()} onClick={() => void run("assist")}>Let Heel prepare this page</Button></div>
    {problem && <Text as="p" role="alert" color="amber">{problem}</Text>}
    {view && <><Text as="p" size="1" role="status">{view.note}</Text><img className="browser-page-image" src={`data:image/png;base64,${view.image}`} alt="Current application page in Heel's browser" /></>}
  </details>;
}
