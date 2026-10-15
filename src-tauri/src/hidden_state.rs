//! Remembering that Greg was hidden, across restarts. A tiny file in the app data folder.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::constants::HIDDEN_FILE;

#[derive(Serialize, Deserialize)]
struct Saved {
    hidden: bool,
}

pub(crate) fn serialize(hidden: bool) -> String {
    serde_json::to_string(&Saved { hidden }).unwrap_or_default()
}

/// Anything unreadable means "not hidden": a broken file must never leave Greg invisible with no way back.
pub(crate) fn parse(json: &str) -> bool {
    serde_json::from_str::<Saved>(json).map(|saved| saved.hidden).unwrap_or(false)
}

fn path(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_data_dir().ok().map(|dir| dir.join(HIDDEN_FILE))
}

pub(crate) fn save(app: &AppHandle, hidden: bool) {
    let Some(path) = path(app) else { return };
    if let Some(dir) = path.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    let _ = std::fs::write(path, serialize(hidden));
}

pub(crate) fn load(app: &AppHandle) -> bool {
    path(app).and_then(|path| std::fs::read_to_string(path).ok()).map(|json| parse(&json)).unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips() {
        assert!(parse(&serialize(true)));
        assert!(!parse(&serialize(false)));
    }

    #[test]
    fn garbage_means_not_hidden() {
        for bad in ["", "{", "null", "{\"hidden\":\"yes\"}", "{}"] {
            assert!(!parse(bad), "{bad:?}");
        }
    }
}
