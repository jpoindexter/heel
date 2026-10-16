//! Names, ids and layout numbers shared by the shell modules.

pub(crate) const MASCOT_LABEL: &str = "main";
pub(crate) const PANEL_LABEL: &str = "panel";
pub(crate) const SIDECAR_FILE: &str = "sidecar.json";
/// Tells the panel to show Settings. Must equal OPEN_SETTINGS_EVENT in src/events.ts (a test enforces it).
pub(crate) const OPEN_SETTINGS_EVENT: &str = "heel:open-settings";
pub(crate) const SETTINGS_VIEW: &str = "settings";
/// Menu item ids. The app menu and the tray menu both have "Settings…"; separate ids so neither handler fires for the other.
pub(crate) const APP_SETTINGS_ID: &str = "app-settings";
pub(crate) const TRAY_SETTINGS_ID: &str = "settings";
/// Menu-bar icon: 44x44 raw RGBA, a black silhouette that macOS recolours for light and dark menu bars.
pub(crate) const TRAY_ICON_RGBA: &[u8] = include_bytes!("../icon-source/tray.rgba");
pub(crate) const TRAY_ICON_PX: u32 = 44;
pub(crate) const MARGIN_LOGICAL_PX: f64 = 24.0;
pub(crate) const PANEL_GAP_LOGICAL_PX: f64 = 8.0;
pub(crate) const DOCK_CLEARANCE_MULTIPLIER: i32 = 3;
/// A resize fires per pixel; the docked panel snaps back onto Greg once no resize has come for this long.
pub(crate) const RESIZE_SETTLE_MS: u64 = 350;
/// Where the pointer is, in Greg's window frame (N25). Must equal POINTER_EVENT in src/events.ts (a test enforces it).
pub(crate) const POINTER_EVENT: &str = "heel:pointer";
/// The pointer must move at least this far (logical px) before Greg's window hears about it again.
pub(crate) const POINTER_MIN_MOVE_LOGICAL_PX: f64 = 3.0;
/// Right-click menu on Greg, and the tray's "Show Greg". One id each.
pub(crate) const MASCOT_MENU_TOGGLE_ID: &str = "mascot-toggle";
pub(crate) const MASCOT_MENU_SETTINGS_ID: &str = "mascot-settings";
pub(crate) const MASCOT_MENU_HIDE_ID: &str = "mascot-hide";
pub(crate) const MASCOT_MENU_QUIT_ID: &str = "mascot-quit";
pub(crate) const TRAY_SHOW_GREG_ID: &str = "tray-show-greg";
/// Greg's life. Must equal PANEL_VISIBLE_EVENT / LIFE_COMMAND_EVENT in src/events.ts (a test enforces it).
pub(crate) const PANEL_VISIBLE_EVENT: &str = "heel:panel-visible";
pub(crate) const LIFE_COMMAND_EVENT: &str = "heel:life-command";
pub(crate) const MASCOT_MENU_NAP_ID: &str = "mascot-nap";
pub(crate) const MASCOT_MENU_QUIET_ID: &str = "mascot-quiet";
pub(crate) const MASCOT_MENU_WALK_ID: &str = "mascot-walk";
pub(crate) const MASCOT_MENU_PLAY_ID: &str = "mascot-play";
/// Greg walking (A4b). Must equal WALK_FINISHED_EVENT in src/events.ts (a test enforces it).
pub(crate) const WALK_FINISHED_EVENT: &str = "heel:walk-finished";
/// How fast he walks (logical px per second), the longest a walk may take, and how often the window is nudged.
pub(crate) const WALK_SPEED_PX_PER_S: f64 = 140.0;
pub(crate) const WALK_MAX_MS: u64 = 6_000;
pub(crate) const WALK_STEP_MS: u64 = 16;
/// A walk shorter than this is not worth starting (he is against a wall).
pub(crate) const WALK_MIN_PX: f64 = 40.0;
/// Greg running (sprite pose) while the shell moves his window for hide / show / quit. Must equal RUN_EVENT in src/events.ts (a test enforces it).
pub(crate) const RUN_EVENT: &str = "heel:run";
/// Leaving and arriving are brisk: faster than a stroll, capped so hiding never makes anyone wait.
pub(crate) const EXIT_SPEED_PX_PER_S: f64 = 520.0;
pub(crate) const EXIT_MAX_MS: u64 = 1_200;
/// Quitting must feel immediate: he still runs off, but never for longer than this.
pub(crate) const QUIT_MAX_MS: u64 = 500;
/// Whether Greg was hidden when Heel last quit, so a restart keeps him hidden.
pub(crate) const HIDDEN_FILE: &str = "mascot-hidden.json";
/// At launch he waits for his window to finish loading, then walks on. Must be longer than the page takes to start.
pub(crate) const LAUNCH_DELAY_MS: u64 = 1_500;
/// With reduced motion he fades instead of running. Must equal FADE_EVENT in src/events.ts (a test enforces it).
pub(crate) const FADE_EVENT: &str = "heel:fade";
pub(crate) const FADE_MS: u64 = 200;
/// Tells the panel which edge faces Greg and where his centre is, so its tail can point at him. Must equal PANEL_ANCHOR_EVENT in src/events.ts (a test enforces it).
pub(crate) const PANEL_ANCHOR_EVENT: &str = "heel:panel-anchor";
/// The packaged helper: where Tauri puts the bundled resources (tried in order), its log, and how long it gets to finish on quit.
pub(crate) const SIDECAR_BUNDLE_DIRS: [&str; 2] = ["resources/sidecar", "sidecar"];
pub(crate) const SIDECAR_LOG_FILE: &str = "sidecar.log";
pub(crate) const SIDECAR_STOP_GRACE_MS: u64 = 1_500;
/// Helper supervision (N5): how often it is checked, how long a fresh start may take, how long it must run before past crashes are forgotten.
/// The event must equal HELPER_STATUS_EVENT in src/events.ts (a test enforces it).
pub(crate) const HELPER_STATUS_EVENT: &str = "heel:helper-status";
pub(crate) const HEALTH_INTERVAL_MS: u64 = 3_000;
pub(crate) const STARTUP_GRACE_MS: u64 = 10_000;
pub(crate) const HEALTHY_RESET_MS: u64 = 60_000;
pub(crate) const TRAY_RESTART_HELPER_ID: &str = "tray-restart-helper";
/// Greg's notice bubble (N12): its window, the event that fills it (must equal NOTICE_EVENT in src/events.ts; a test enforces it), and its gap above his head.
pub(crate) const NOTICE_LABEL: &str = "notice";
pub(crate) const NOTICE_EVENT: &str = "heel:notice";
pub(crate) const NOTICE_GAP_LOGICAL_PX: f64 = 4.0;
/// Attention sense (N24): the event the panel receives (must equal ATTENTION_EVENT in src/events.ts; a test enforces it) and the sample interval.
pub(crate) const ATTENTION_EVENT: &str = "heel:attention";
pub(crate) const ATTENTION_INTERVAL_MS: u64 = 5_000;
