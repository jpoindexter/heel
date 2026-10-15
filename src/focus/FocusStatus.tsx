import { useState } from "react";
import { CheckIn } from "./CheckIn";
import { FocusBar } from "./FocusBar";
import "./focus.css";
import type { useFocus } from "./useFocus";

/** A running time-box, or its check-in when it is up. Shown above both screens: it needs you whichever one you are on. */
export function FocusStatus({ focus }: { focus: ReturnType<typeof useFocus> }) {
  const [busy, setBusy] = useState(false);
  const { session } = focus;
  if (!session) return null;
  if (!focus.due) return <FocusBar session={session} onStop={() => void focus.stop()} />;
  return (
    <CheckIn
      session={session}
      busy={busy}
      onAnswer={(choice, idea) => {
        setBusy(true);
        void focus.answer(choice, idea).finally(() => setBusy(false));
      }}
    />
  );
}
