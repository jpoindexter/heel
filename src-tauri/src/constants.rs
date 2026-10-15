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
/// Right-click menu on Greg, and the tray's "Show Greg". One id each.
pub(crate) const MASCOT_MENU_TOGGLE_ID: &str = "mascot-toggle";
pub(crate) const MASCOT_MENU_SETTINGS_ID: &str = "mascot-settings";
pub(crate) const MASCOT_MENU_HIDE_ID: &str = "mascot-hide";
pub(crate) const MASCOT_MENU_QUIT_ID: &str = "mascot-quit";
pub(crate) const TRAY_SHOW_GREG_ID: &str = "tray-show-greg";
