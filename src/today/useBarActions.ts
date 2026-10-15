import { useCallback } from "react";
import type { TrayAction } from "./bar-model";
import { useBar } from "./useBar";
import { usePointerOutside } from "./usePointerOutside";
import type { useTodayState } from "./useTodayState";

/** The bar wired to what it does: the four buttons, Enter, ⌘↩, Esc, and when the card folds back. */
export function useBarActions(state: ReturnType<typeof useTodayState>, onOpenSettings: () => void) {
  const { chat, inbox, digest } = state;
  const bar = useBar(chat.isDraftEmpty);
  const { closeTray, collapseSoon, openComposer, closeComposer } = bar;

  const send = useCallback(() => {
    if (chat.send()) collapseSoon("sent");
  }, [chat, collapseSoon]);

  const add = useCallback(() => {
    void chat.addTyped().then((done) => done && collapseSoon("added"));
  }, [chat, collapseSoon]);

  const park = useCallback(() => {
    void chat.parkTyped().then((done) => done && collapseSoon("added"));
  }, [chat, collapseSoon]);

  const email = useCallback(() => {
    if (inbox.status?.connected) void digest.check();
    else onOpenSettings();
  }, [digest, inbox.status?.connected, onOpenSettings]);

  /** Every button rolls the tray back first, then runs. */
  const onAction = useCallback(
    (action: TrayAction) => {
      const run: Record<TrayAction, () => void> = {
        plan: () => chat.askChip("plan"),
        stuck: () => chat.askChip("stuck"),
        email,
        chat: openComposer,
        add,
        park,
      };
      closeTray(run[action]);
    },
    [add, chat, closeTray, email, openComposer, park],
  );

  const close = useCallback(() => closeTray(closeComposer), [closeComposer, closeTray]);

  const onPointerOutside = usePointerOutside(bar.composerOpen, chat.isDraftEmpty, close);
  const onBlur = useCallback(() => {
    if (!bar.trayOpen) collapseSoon("blur");
  }, [bar.trayOpen, collapseSoon]);

  return { ...bar, send, add, close, onAction, onBlur, onPointerOutside };
}
