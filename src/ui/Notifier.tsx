import { Badge, Button, Text } from "@radix-ui/themes";
import { Toast } from "radix-ui";
import type { ShownNotice } from "./notice-model";
import "./toast.css";

export type { Notice } from "./notice-model";

/** Radix never closes a toast by itself: the provider's clock does (Radix pauses its own while the window is unfocused). */
const NEVER_MS = 2 ** 31 - 1;

type Props = { notice: ShownNotice | null; onDismiss: () => void; onHold: () => void; onRelease: () => void };

/** The toast's buttons: a nudge's choices, or Undo. Each one closes the toast. */
function ToastButtons({ notice, onDismiss }: { notice: ShownNotice; onDismiss: () => void }) {
  const act = (run: () => void) => () => {
    run();
    onDismiss();
  };
  if (notice.choices) {
    return notice.choices.map((choice) => (
      <Toast.Action key={choice.label} altText={choice.label} asChild>
        <Button size="1" variant="soft" color="gray" onClick={act(choice.run)}>{choice.label}</Button>
      </Toast.Action>
    ));
  }
  if (!notice.undo) return null;
  return (
    <Toast.Action altText="Undo" asChild>
      <Button size="1" variant="soft" highContrast onClick={act(notice.undo)}>Undo</Button>
    </Toast.Action>
  );
}

/**
 * The toast: drops in from the panel's top edge, stays NOTICE_MS (held while hovered or focused), fades out.
 * Radix announces it and keeps Undo reachable by keyboard (F8 jumps to it). Its viewport floats, so nothing below moves.
 * One at a time: a newer notice replaces this one and shows how many it stands for.
 */
export function Notifier({ notice, onDismiss, onHold, onRelease }: Props) {
  return (
    <Toast.Provider duration={NEVER_MS} swipeDirection="up" label="Notice">
      {notice && (
        <Toast.Root
          key={notice.id}
          type={notice.tone === "error" ? "foreground" : "background"}
          className="toast"
          data-tone={notice.tone}
          data-choices={notice.choices ? true : undefined}
          onOpenChange={(open) => !open && onDismiss()}
          onPointerEnter={onHold}
          onPointerLeave={onRelease}
          onFocus={onHold}
          onBlur={onRelease}
        >
          <Toast.Description asChild>
            <Text size="2" className="toast-text">{notice.message}</Text>
          </Toast.Description>
          {notice.count > 1 && (
            <Badge size="1" variant="soft" color="gray" radius="full" aria-label={`${notice.count} notices, latest shown`}>
              {notice.count}
            </Badge>
          )}
          <ToastButtons notice={notice} onDismiss={onDismiss} />
        </Toast.Root>
      )}
      <Toast.Viewport className="toast-viewport" />
    </Toast.Provider>
  );
}
