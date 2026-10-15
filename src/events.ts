export const MOTION_EVENT = "heel:motion";
/** Sent by the menu bar's "Settings…" item. Must equal OPEN_SETTINGS_EVENT in src-tauri/src/lib.rs. */
export const OPEN_SETTINGS_EVENT = "heel:open-settings";
/** Sent to Greg's window when the panel opens or closes (payload: boolean). Must equal PANEL_VISIBLE_EVENT in src-tauri/src/constants.rs. */
export const PANEL_VISIBLE_EVENT = "heel:panel-visible";
/** Sent to Greg's window by his right-click menu (payload: "nap" | "wake" | "toggle-quiet"). Must equal LIFE_COMMAND_EVENT in constants.rs. */
export const LIFE_COMMAND_EVENT = "heel:life-command";
/** Sent to Greg's window when a walk ends or is stopped. Must equal WALK_FINISHED_EVENT in src-tauri/src/constants.rs. */
export const WALK_FINISHED_EVENT = "heel:walk-finished";
/** Sent to Greg's window while the shell moves him for hide / show / quit, so he can run. Must equal RUN_EVENT in src-tauri/src/constants.rs. */
export const RUN_EVENT = "heel:run";
/** Sent to Greg's window to fade him out or in (reduced motion). Must equal FADE_EVENT in src-tauri/src/constants.rs. */
export const FADE_EVENT = "heel:fade";
/** Sent to the panel: which edge faces Greg and where his centre is, for its tail. Must equal PANEL_ANCHOR_EVENT in src-tauri/src/constants.rs. */
export const PANEL_ANCHOR_EVENT = "heel:panel-anchor";
/** Sent to the panel when the helper's state changes (running, starting, restarting, stopped). Must equal HELPER_STATUS_EVENT in src-tauri/src/constants.rs. */
export const HELPER_STATUS_EVENT = "heel:helper-status";
/** Sent to the notice window with what to show next to Greg (id, message, tone, undoable). Must equal NOTICE_EVENT in src-tauri/src/constants.rs. */
export const NOTICE_EVENT = "heel:notice";
/** Sent by the notice window when its Undo is pressed (payload: the notice id). Webview to webview only. */
export const NOTICE_UNDO_EVENT = "heel:notice-undo";
/** Sent to Greg's window when something starts or ends (payload: { id, active }): a turn, a digest, a draft. Webview to webview only. */
export const WORK_EVENT = "heel:work";
/** Sent to the panel by the shell while attention sense is on (payload: { bundle, name, idle_sec }). Must equal ATTENTION_EVENT in src-tauri/src/constants.rs. */
export const ATTENTION_EVENT = "heel:attention";
/** Sent to Greg's window by the shell: where the pointer is in his window frame (payload: { x, y, bottom }). Must equal POINTER_EVENT in src-tauri/src/constants.rs. */
export const POINTER_EVENT = "heel:pointer";
/** Sent to Greg's window by the panel while the chat card holds text (payload: boolean). Webview to webview only. */
export const TYPING_EVENT = "heel:typing";
