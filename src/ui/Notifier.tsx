import { Badge, Button, Text } from "@radix-ui/themes";
import { Toast } from "radix-ui";
import { NOTICE_MS, type ShownNotice } from "./notice-model";
import "./toast.css";

export type { Notice } from "./notice-model";

type Props = { notice: ShownNotice | null; onDismiss: () => void };

/**
 * The toast: drops in from the panel's top edge, stays NOTICE_MS (longer while hovered or focused), fades out.
 * Radix announces it and keeps Undo reachable by keyboard (F8 jumps to it). Its viewport floats, so nothing below moves.
 * One at a time: a newer notice replaces this one and shows how many it stands for.
 */
export function Notifier({ notice, onDismiss }: Props) {
  return (
    <Toast.Provider duration={NOTICE_MS} swipeDirection="up" label="Notice">
      {notice && (
        <Toast.Root
          key={notice.id}
          type={notice.tone === "error" ? "foreground" : "background"}
          className="toast"
          data-tone={notice.tone}
          onOpenChange={(open) => !open && onDismiss()}
        >
          <Toast.Description asChild>
            <Text size="2" className="toast-text">{notice.message}</Text>
          </Toast.Description>
          {notice.count > 1 && (
            <Badge size="1" variant="soft" color="gray" radius="full" aria-label={`${notice.count} notices, latest shown`}>
              {notice.count}
            </Badge>
          )}
          {notice.undo && (
            <Toast.Action altText="Undo" asChild>
              <Button
                size="1"
                variant="soft"
                highContrast
                onClick={() => {
                  notice.undo?.();
                  onDismiss();
                }}
              >
                Undo
              </Button>
            </Toast.Action>
          )}
        </Toast.Root>
      )}
      <Toast.Viewport className="toast-viewport" />
    </Toast.Provider>
  );
}
