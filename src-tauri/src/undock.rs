//! The panel on its own (B5): the person's drag parks it where they put it, Greg stops following and the tail hides;
//! "Back to Greg" docks it again. The parked place survives a close and a relaunch; a resize while docked snaps the
//! panel back onto Greg's head once the edge drag has settled.

use std::time::Duration;

use tauri::{AppHandle, Manager, WebviewWindow};

use crate::constants::{MASCOT_LABEL, PANEL_LABEL, RESIZE_SETTLE_MS};
use crate::dock::{dock_panel, move_panel, now_ms, work_rect, Dock};
use crate::panel_place::{self, restore_origin, Place};
use crate::panel_size::should_save;
use crate::placement::{Point, Rect};

fn place_file(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_data_dir().ok().map(|dir| dir.join(panel_place::SAVE_FILE))
}

pub(crate) fn save_place(app: &AppHandle) {
    let Some(path) = place_file(app) else {
        return;
    };
    let Ok(place) = app.state::<Dock>().0.lock().map(|state| {
        let (x, y) = state.place.unwrap_or((0, 0));
        Place { docked: state.docked, x, y }
    }) else {
        return;
    };
    if let Some(dir) = path.parent() {
        let _ = std::fs::create_dir_all(dir);
    }
    let _ = std::fs::write(path, panel_place::serialize(place));
}

/// At launch: docked unless the person left the panel parked, in which case its place waits for the first show.
pub(crate) fn restore_place(app: &AppHandle) {
    let Some(saved) = place_file(app).and_then(|path| std::fs::read_to_string(path).ok()).and_then(|json| panel_place::parse_saved(&json)) else {
        return;
    };
    if let Ok(mut state) = app.state::<Dock>().0.lock() {
        state.docked = saved.docked;
        state.place = (!saved.docked).then_some((saved.x, saved.y));
    }
}

/// The person dragged the docked panel: from here on it is parked, Greg walks alone and the tail is gone.
pub(crate) fn park(app: &AppHandle, panel_at: Point) {
    if let Ok(mut state) = app.state::<Dock>().0.lock() {
        state.docked = false;
        state.place = Some(panel_at);
        state.last_place_saved = now_ms();
    }
    crate::anchor::announce_parked(app);
    save_place(app);
}

/// A parked panel moved again: remember where, writing at most every few hundred ms (the hide and the exit write the rest).
pub(crate) fn parked_panel_moved(app: &AppHandle, panel_at: Point) {
    let now = now_ms();
    let save = match app.state::<Dock>().0.lock() {
        Ok(mut state) => {
            state.place = Some(panel_at);
            let save = should_save(now, state.last_place_saved, 0);
            if save {
                state.last_place_saved = now;
            }
            save
        }
        Err(_) => false,
    };
    if save {
        save_place(app);
    }
}

/// Show a parked panel where it was left when that still lies on a screen; otherwise it docks to Greg.
pub(crate) fn show_parked(app: &AppHandle, mascot: &WebviewWindow, panel: &WebviewWindow) {
    let place = app.state::<Dock>().0.lock().ok().and_then(|state| state.place);
    let areas: Vec<Rect> = app.available_monitors().map(|monitors| monitors.iter().map(work_rect).collect()).unwrap_or_default();
    let size = panel.outer_size().map(|size| (size.width as i32, size.height as i32)).unwrap_or((0, 0));
    match place.and_then(|place| restore_origin(place, size, &areas)) {
        Some(origin) => {
            move_panel(app, panel, origin);
            crate::anchor::announce_parked(app);
        }
        None => dock_panel(app, mascot, panel),
    }
}

/// "Back to Greg" in the panel's header.
#[tauri::command]
pub(crate) fn dock_panel_command(app: AppHandle) {
    if let (Some(mascot), Some(panel)) = (app.get_webview_window(MASCOT_LABEL), app.get_webview_window(PANEL_LABEL)) {
        dock_panel(&app, &mascot, &panel);
        save_place(&app);
    }
}

/// A resize while docked fires per pixel; once the edge drag has settled, put the panel back onto Greg's head at its
/// new size (a bottom-edge resize otherwise leaves it floating above him for good).
pub(crate) fn snap_after_resize(app: &AppHandle) {
    let Ok(generation) = app.state::<Dock>().0.lock().map(|mut state| {
        state.resize_gen += 1;
        state.resize_gen
    }) else {
        return;
    };
    let handle = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(RESIZE_SETTLE_MS));
        let latest = handle.state::<Dock>().0.lock().map(|state| state.resize_gen == generation && state.docked).unwrap_or(false);
        if !latest {
            return;
        }
        let app = handle.clone();
        let _ = handle.run_on_main_thread(move || {
            if let (Some(mascot), Some(panel)) = (app.get_webview_window(MASCOT_LABEL), app.get_webview_window(PANEL_LABEL)) {
                dock_panel(&app, &mascot, &panel);
            }
        });
    });
}
