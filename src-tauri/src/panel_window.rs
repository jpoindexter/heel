//! The panel window's life: shown, hidden, brought forward, and its remembered size.

use tauri::{AppHandle, Emitter, LogicalSize, Manager};

use crate::constants::{MASCOT_LABEL, PANEL_LABEL, PANEL_VISIBLE_EVENT};
use crate::dock::{dock_panel, panel_logical_size, Dock};
use crate::panel_size::{self, clamp_size, parse_saved};

fn size_file(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_data_dir().ok().map(|dir| dir.join(panel_size::SAVE_FILE))
}

pub(crate) fn save_panel_size(app: &AppHandle) {
    let (Some(panel), Some(path)) = (app.get_webview_window(PANEL_LABEL), size_file(app)) else {
        return;
    };
    let Some(size) = panel_logical_size(&panel) else {
        return;
    };
    if let Some(dir) = path.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    let _ = std::fs::write(path, panel_size::serialize(clamp_size(size)));
}

/// Apply the remembered size (if any) before the panel is first shown.
pub(crate) fn restore_panel_size(app: &AppHandle) {
    let (Some(panel), Some(path)) = (app.get_webview_window(PANEL_LABEL), size_file(app)) else {
        return;
    };
    if let Some((width, height)) = std::fs::read_to_string(path).ok().and_then(|json| parse_saved(&json)) {
        let _ = panel.set_size(LogicalSize::new(width, height));
        if let Ok(mut state) = app.state::<Dock>().0.lock() {
            state.desired = (width, height);
        }
    }
}

pub(crate) fn panel_is_visible(app: &AppHandle) -> bool {
    app.get_webview_window(PANEL_LABEL)
        .and_then(|panel| panel.is_visible().ok())
        .unwrap_or(false)
}

/// Show the panel docked to the mascot, or hide it if already visible.
pub(crate) fn toggle_panel(app: &AppHandle) {
    if panel_is_visible(app) {
        save_panel_size(app);
        if let Some(panel) = app.get_webview_window(PANEL_LABEL) {
            let _ = panel.hide();
        }
        announce_panel(app, false);
    } else {
        show_panel(app);
    }
}

/// Greg needs to know whether the panel is open: he stays still while it is.
pub(crate) fn announce_panel(app: &AppHandle, visible: bool) {
    let _ = app.emit_to(MASCOT_LABEL, PANEL_VISIBLE_EVENT, visible);
}

pub(crate) fn show_panel(app: &AppHandle) {
    let Some(panel) = app.get_webview_window(PANEL_LABEL) else {
        return;
    };
    crate::mascot_menu::show_mascot(app);
    if let Some(mascot) = app.get_webview_window(MASCOT_LABEL) {
        dock_panel(app, &mascot, &panel);
    }
    let _ = panel.show();
    let _ = panel.set_focus();
    announce_panel(app, true);
}

/// Bring the panel forward: show it if hidden, focus it if already open.
pub(crate) fn reveal_panel(app: &AppHandle) {
    if panel_is_visible(app) {
        if let Some(panel) = app.get_webview_window(PANEL_LABEL) {
            let _ = panel.set_focus();
        }
    } else {
        show_panel(app);
    }
}
