import type { NowCard } from "./today-model";

/** One line: the single thing to do now. The circle completes that task (with Undo). */
export function NowStrip({ now, onComplete }: { now: NowCard | null; onComplete: () => void }) {
  if (!now) return null;
  return (
    <section aria-label="Now" className="now-strip">
      <button type="button" role="checkbox" aria-checked="false" aria-label={`Complete: ${now.task.title}`} className="icon-button" onClick={onComplete}>
        <span className="check" aria-hidden="true" />
      </button>
      <p className="now-line">
        <span className="now-label">Now</span> {now.text}
        {now.taskTitle && <span className="now-for"> · {now.taskTitle}</span>}
      </p>
    </section>
  );
}
