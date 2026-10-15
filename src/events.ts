export const MOTION_EVENT = "heel:motion";
/** Sent by the menu bar's "Settings…" item. Must equal OPEN_SETTINGS_EVENT in src-tauri/src/lib.rs. */
export const OPEN_SETTINGS_EVENT = "heel:open-settings";
/** Sent to Greg's window when the panel opens or closes (payload: boolean). Must equal PANEL_VISIBLE_EVENT in src-tauri/src/constants.rs. */
export const PANEL_VISIBLE_EVENT = "heel:panel-visible";
/** Sent to Greg's window by his right-click menu (payload: "nap" | "wake" | "toggle-quiet"). Must equal LIFE_COMMAND_EVENT in constants.rs. */
export const LIFE_COMMAND_EVENT = "heel:life-command";
/** Sent to Greg's window when a walk ends or is stopped. Must equal WALK_FINISHED_EVENT in src-tauri/src/constants.rs. */
export const WALK_FINISHED_EVENT = "heel:walk-finished";
