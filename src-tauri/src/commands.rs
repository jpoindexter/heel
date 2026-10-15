//! Commands the webviews can invoke (names are checked against the frontend by src/invoke-contract.test.ts).

use tauri::{AppHandle, Manager};

use crate::constants::SIDECAR_FILE;
use crate::panel_window::toggle_panel;

#[tauri::command]
pub(crate) fn toggle_panel_command(app: AppHandle) {
    toggle_panel(&app);
}

/// Port and token of the local helper, written by the sidecar into the app data dir.
/// The panel reads it through here so a web page can never learn the token.
#[tauri::command]
pub(crate) fn sidecar_info(app: AppHandle) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    std::fs::read_to_string(dir.join(SIDECAR_FILE))
        .map_err(|_| crate::sidecar_process::last_error(&app).unwrap_or_else(|| "Heel's helper isn't running. Restart Heel.".to_string()))
}
