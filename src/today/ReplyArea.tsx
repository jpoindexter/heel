import type { Ref } from "react";
import type { Reply } from "./useToday";

/** What Heel said and did. A live region, so it is announced without moving focus. */
export function ReplyArea({ reply, busy, onOpenSettings, ref }: { reply: Reply | null; busy: boolean; onOpenSettings: () => void; ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} role="status" aria-live="polite" className="reply" data-empty={!reply && !busy ? "" : undefined}>
      {busy && <p className="helper">Thinking…</p>}
      {reply?.kind === "say" && (
        <>
          {reply.say.split("\n\n").map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {reply.lines.length > 0 && (
            <ul className="applied">
              {reply.lines.map((line) => (
                <li key={line.text} data-ok={line.ok}>
                  <span className="mark" data-ready={line.ok} aria-hidden="true">{line.ok ? "✓" : "!"}</span>
                  {line.text}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {reply?.kind === "error" && (
        <div className="callout">
          <p>{reply.message}</p>
          {reply.offerSettings && (
            <button type="button" className="button" onClick={onOpenSettings}>Open Settings</button>
          )}
        </div>
      )}
    </div>
  );
}
