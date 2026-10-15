import { Button, Text } from "@radix-ui/themes";
import { Toast } from "radix-ui";

export type Notice = { message: string; tone: "info" | "error"; undo?: () => void };

export const NOTICE_MS = 8_000;

type Props = { notice: Notice | null; onDismiss: () => void };

/**
 * The one transient message: what just happened, with Undo when it can be undone.
 * Radix Toast announces it, keeps it open while hovered or focused, and closes it after NOTICE_MS.
 * Its viewport floats above whatever sits below it, so showing and hiding never moves anything.
 */
export function Notifier({ notice, onDismiss }: Props) {
  return (
    <Toast.Provider duration={NOTICE_MS} swipeDirection="down" label="Notice">
      {notice && (
        <Toast.Root
          key={notice.message}
          type={notice.tone === "error" ? "foreground" : "background"}
          className="toast"
          data-tone={notice.tone}
          onOpenChange={(open) => !open && onDismiss()}
        >
          <Toast.Description asChild>
            <Text size="2">{notice.message}</Text>
          </Toast.Description>
          {notice.undo && (
            <Toast.Action altText="Undo" asChild>
              <Button
                size="2"
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
