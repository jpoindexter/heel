//! Settings the shell keeps for itself (B9, N10): whether a parked panel still floats, and whether Heel shows in the
//! Dock. One small file next to the panel's size and place; a missing file, garbage, or a missing field means the default.

use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

pub const SAVE_FILE: &str = "shell-settings.json";

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(default, rename_all = "camelCase")]
pub struct ShellSettings {
    /// A parked panel keeps floating over other apps (B9). Off: it is an ordinary window.
    pub always_on_top: bool,
    /// Heel in the Dock (N10). Off: menu-bar icon and Greg only.
    pub dock_icon: bool,
}

impl Default for ShellSettings {
    fn default() -> Self {
        ShellSettings { always_on_top: false, dock_icon: true }
    }
}

#[derive(Default)]
pub struct Shell(pub Mutex<ShellSettings>);

pub fn serialize(settings: ShellSettings) -> String {
    serde_json::to_string(&settings).unwrap_or_default()
}

/// What was saved. Unreadable means the defaults; a field that is missing keeps its own default.
pub fn parse_saved(json: &str) -> ShellSettings {
    serde_json::from_str(json).unwrap_or_default()
}

fn file(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_data_dir().ok().map(|dir| dir.join(SAVE_FILE))
}

/// At launch: read the file into the shared state and hand the settings back for the startup steps that need them.
pub(crate) fn load(app: &AppHandle) -> ShellSettings {
    let settings = file(app).and_then(|path| std::fs::read_to_string(path).ok()).map(|json| parse_saved(&json)).unwrap_or_default();
    if let Ok(mut state) = app.state::<Shell>().0.lock() {
        *state = settings;
    }
    settings
}

pub(crate) fn save(app: &AppHandle) {
    let (Some(path), Ok(settings)) = (file(app), app.state::<Shell>().0.lock().map(|state| *state)) else {
        return;
    };
    let _ = crate::save_file::write(&path, &serialize(settings));
}

/// The panel asks when Settings opens.
#[tauri::command]
pub(crate) fn shell_settings(app: AppHandle) -> ShellSettings {
    app.state::<Shell>().0.lock().map(|state| *state).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_and_defaults_to_floating_off_and_dock_on() {
        let chosen = ShellSettings { always_on_top: true, dock_icon: false };
        assert_eq!(parse_saved(&serialize(chosen)), chosen);
        assert_eq!(parse_saved("not json"), ShellSettings::default());
        assert_eq!(ShellSettings::default(), ShellSettings { always_on_top: false, dock_icon: true });
    }

    #[test]
    fn a_field_that_is_missing_or_unknown_keeps_the_rest() {
        assert_eq!(parse_saved(r#"{"alwaysOnTop": true}"#), ShellSettings { always_on_top: true, dock_icon: true });
        assert_eq!(parse_saved(r#"{"dockIcon": false, "later": 1}"#), ShellSettings { always_on_top: false, dock_icon: false });
    }
}
