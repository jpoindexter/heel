//! The panel window's life: shown, hidden, brought forward, and its remembered size.

use tauri::{AppHandle, Emitter, LogicalSize, Manager};

use crate::constants::{MASCOT_LABEL, PANEL_LABEL, PANEL_VISIBLE_EVENT};
use crate::dock::{dock_panel, panel_logical_size, Dock};
use crate::undock::{save_place, show_parked};
use crate::panel_size::{self, clamp_size, parse_saved};
use crate::window_level::{click_action, panel_floats_now, PanelClick};

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
    let _ = crate::save_file::write(&path, &panel_size::serialize(clamp_size(size)));
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

/// Show the panel next to Greg or where it was parked; hide it if it is up; bring a parked one forward if another app covers it (B9).
pub(crate) fn toggle_panel(app: &AppHandle) {
    let panel = app.get_webview_window(PANEL_LABEL);
    let focused = panel.as_ref().and_then(|panel| panel.is_focused().ok()).unwrap_or(false);
    match click_action(panel_is_visible(app), focused, panel_floats_now(app)) {
        PanelClick::Show => show_panel(app),
        PanelClick::Forward => {
            if let Some(panel) = panel {
                let _ = panel.set_focus();
            }
        }
        PanelClick::Hide => {
            save_panel_size(app);
            save_place(app);
            if let Some(panel) = panel {
                let _ = panel.hide();
            }
            announce_panel(app, false);
        }
    }
}

/// Every window hears whether the panel is open: Greg stays still while it is; the panel routes its notices by it.
pub(crate) fn announce_panel(app: &AppHandle, visible: bool) {
    let _ = app.emit(PANEL_VISIBLE_EVENT, visible);
}

pub(crate) fn show_panel(app: &AppHandle) {
    let Some(panel) = app.get_webview_window(PANEL_LABEL) else {
        return;
    };
    crate::appear::reveal_mascot(app);
    crate::notice_window::hide(app);
    if let Some(mascot) = app.get_webview_window(MASCOT_LABEL) {
        let docked = app.state::<Dock>().0.lock().map(|state| state.docked).unwrap_or(true);
        if docked {
            dock_panel(app, &mascot, &panel);
        } else {
            show_parked(app, &mascot, &panel);
        }
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
