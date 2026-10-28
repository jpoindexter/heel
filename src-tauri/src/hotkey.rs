//! The panel's global shortcut (B1 H2, N4): one of a short list in Settings › General, or off. Off is for a clash
//! with another app's shortcut (dictation, push-to-talk); the menu bar, the Dock and Greg still open the panel.

use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};

use crate::shell_settings::Shell;

pub const DEFAULT_HOTKEY: &str = "super+shift+h";

/// "" means off. Anything else must read as a shortcut the plugin can register.
pub fn parse_hotkey(value: &str) -> Result<Option<Shortcut>, String> {
    let value = value.trim();
    if value.is_empty() {
        return Ok(None);
    }
    value.parse::<Shortcut>().map(Some).map_err(|error| format!("{value} isn't a shortcut Heel can use ({error})."))
}

/// Make `value` the one registered shortcut (or none). Startup and the setting both come here.
pub(crate) fn apply(app: &AppHandle, value: &str) -> Result<(), String> {
    let shortcuts = app.global_shortcut();
    shortcuts.unregister_all().map_err(|error| error.to_string())?;
    match parse_hotkey(value)? {
        Some(shortcut) => shortcuts.register(shortcut).map_err(|error| format!("Couldn't take {value}: {error}")),
        None => Ok(()),
    }
}

/// The setting: kept, then applied. A shortcut macOS or another app will not give up puts the old one back and says so.
#[tauri::command]
pub(crate) fn set_hotkey(app: AppHandle, hotkey: String) -> Result<(), String> {
    let previous = app.state::<Shell>().0.lock().map(|state| state.hotkey.clone()).unwrap_or_else(|_| DEFAULT_HOTKEY.to_string());
    if let Err(error) = apply(&app, &hotkey) {
        let _ = apply(&app, &previous);
        return Err(error);
    }
    if let Ok(mut state) = app.state::<Shell>().0.lock() {
        state.hotkey = hotkey;
    }
    crate::shell_settings::save(&app);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_is_off_the_default_parses_and_nonsense_says_so() {
        assert!(matches!(parse_hotkey(""), Ok(None)));
        assert!(matches!(parse_hotkey("  "), Ok(None)));
        assert!(matches!(parse_hotkey(DEFAULT_HOTKEY), Ok(Some(_))));
        assert!(matches!(parse_hotkey("control+alt+space"), Ok(Some(_))));
        assert!(parse_hotkey("banana").unwrap_err().contains("banana"));
    }
}
