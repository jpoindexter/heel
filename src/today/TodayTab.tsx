import { useEffect, useRef, useState } from "react";
import { client } from "../api/default-client";
import { Compose } from "./Compose";
import { revealBlock } from "./focus-rules";
import { ReplyArea } from "./ReplyArea";
import { NowSection, TaskList } from "./TaskList";
import { PARK_HINT, todayView, type Chip } from "./today-model";
import { useToday } from "./useToday";

export function TodayTab({ active, onOpenSettings }: { active: boolean; onOpenSettings: () => void }) {
  const today = useToday(client, active);
  const replyRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const { state, notice } = today;

  const send = async (text: string) => {
    if (await today.send(text)) setDraft("");
  };

  const onChip = async (chip: Chip) => {
    if (chip.prompt) return void send(chip.prompt);
    if (!draft.trim()) return today.showHint(PARK_HINT);
    if (await today.park(draft)) setDraft("");
  };

  const view = state.phase === "ready" ? todayView(state.tasks, expanded) : null;

  // The answer (or the "Thinking…" line) is the point of the exchange: never leave it below the fold.
  useEffect(() => {
    if (!today.reply && !today.busy) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    replyRef.current?.scrollIntoView({ block: revealBlock(today.reply !== null), behavior: reduced ? "auto" : "smooth" });
  }, [today.reply, today.busy]);

  return (
    <div className="today">
      <div className="today-body">
        {state.phase === "loading" && <p role="status">Loading your tasks…</p>}
        {state.phase === "error" && (
          <div role="alert" className="callout">
            <p>{state.message}</p>
            <button type="button" className="button" onClick={() => void today.refresh()}>Try again</button>
          </div>
        )}
        {view && (
          <>
            <NowSection now={view.now} />
            <TaskList
              tasks={view.visible}
              hiddenCount={view.hiddenCount}
              expanded={expanded}
              onToggleExpanded={() => setExpanded((value) => !value)}
              onComplete={(task) => void today.complete(task)}
              onRemove={(task) => void today.remove(task)}
            />
          </>
        )}
        <ReplyArea ref={replyRef} reply={today.reply} busy={today.busy} onOpenSettings={onOpenSettings} />
      </div>

      {notice && (
        <div role="status" className="toast" data-tone={notice.tone}>
          <span>{notice.message}</span>
          {notice.undo && (
            <button type="button" className="button button-quiet" onClick={() => { notice.undo?.(); today.dismissNotice(); }}>Undo</button>
          )}
        </div>
      )}

      <Compose active={active} draft={draft} busy={today.busy} onDraft={setDraft} onSend={() => void send(draft)} onChip={(chip) => void onChip(chip)} />
    </div>
  );
}
