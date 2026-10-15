import type { BrainSummary } from "../settings/brain-summary";

type Props = { summary: Extract<BrainSummary, { kind: "setup" }>; onOpenSettings: () => void };

/** Shown instead of a dead text box until an AI is chosen and ready. Two steps; the first has the one button that fixes it. */
export function FirstRun({ summary, onOpenSettings }: Props) {
  return (
    <section aria-labelledby="first-run-heading" className="first-run">
      <h2 id="first-run-heading">Set up Heel</h2>
      <ol>
        <li>
          <span className="mark" data-ready="false" aria-hidden="true">1</span>
          <div>
            <p className="first-run-step">Pick your AI</p>
            <p className="helper">{summary.reason === "none" ? "Heel needs one to answer. Local keeps everything on this Mac." : summary.detail}</p>
            <button type="button" className="button button-primary" onClick={onOpenSettings}>Choose AI</button>
          </div>
        </li>
        <li>
          <span className="mark" data-ready="false" aria-hidden="true">2</span>
          <div>
            <p className="first-run-step">Say what's on your mind</p>
            <p className="helper">Type below. Heel turns it into one small first step.</p>
          </div>
        </li>
      </ol>
    </section>
  );
}
