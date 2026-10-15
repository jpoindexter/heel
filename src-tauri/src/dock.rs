//! Keeps Greg and the panel together: which side the panel docks on, following when either is dragged,
//! and learning the offset again after the person resizes the panel.

use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, LogicalSize, Manager, PhysicalPosition, WebviewWindow, WindowEvent};

use crate::constants::{DOCK_CLEARANCE_MULTIPLIER, MARGIN_LOGICAL_PX, MASCOT_LABEL, PANEL_GAP_LOGICAL_PX, PANEL_LABEL};
use crate::panel_size::{self, classify_panel_change, clamp_size, fit_height, should_save, PanelChange, SELF_RESIZE_QUIET_MS};
use crate::panel_window::save_panel_size;
use crate::placement::{choose_side, fits_inside, follow_target, panel_origin, Follower, Point, Rect, Side};

/// What keeps the panel and Greg moving as one, and what lets the panel be resized without dragging Greg.
pub(crate) struct DockState {
    /// Panel position minus mascot position.
    offset: Point,
    /// Panel outer size (physical px) at the last sync; a change means "resized", not "moved".
    panel_size: (u32, u32),
    /// Ignore resize events (and don't save) until this time: Heel just resized the panel itself.
    ignore_resize_until: u64,
    last_saved: u64,
    /// The size the person chose (logical px). Docking may shrink the panel to fit; it grows back to this when there is room.
    pub(crate) desired: (f64, f64),
}

pub(crate) struct Dock(pub(crate) Mutex<DockState>);

pub(crate) fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

pub(crate) fn window_point(window: &WebviewWindow) -> Option<Point> {
    window.outer_position().ok().map(|p| (p.x, p.y))
}

/// Where the panel should open for the mascot's current position, inside the mascot's monitor.
/// `panel_size` is the size the panel will have (physical px), which may not be applied yet.
pub(crate) fn docked_origin(mascot: &WebviewWindow, panel_size: (i32, i32)) -> Option<Point> {
    let pos = mascot.outer_position().ok()?;
    let size = mascot.outer_size().ok()?;
    let monitor = mascot.current_monitor().ok()??;
    let gap = (PANEL_GAP_LOGICAL_PX * monitor.scale_factor()) as i32;
    let mascot_rect = Rect { x: pos.x, y: pos.y, width: size.width as i32, height: size.height as i32 };
    Some(panel_origin(mascot_rect, panel_size, work_rect(&monitor), gap))
}

/// The part of the monitor windows may use: below the menu bar, above the Dock.
pub(crate) fn work_rect(monitor: &tauri::Monitor) -> Rect {
    let area = monitor.work_area();
    Rect { x: area.position.x, y: area.position.y, width: area.size.width as i32, height: area.size.height as i32 }
}

/// Room above and below Greg inside the usable screen area, in logical px.
pub(crate) fn spaces_around_mascot(mascot: &WebviewWindow) -> Option<(f64, f64)> {
    let pos = mascot.outer_position().ok()?;
    let size = mascot.outer_size().ok()?;
    let monitor = mascot.current_monitor().ok()??;
    let scale = monitor.scale_factor();
    let area = work_rect(&monitor);
    let gap = PANEL_GAP_LOGICAL_PX * scale;
    let above = (pos.y - area.y) as f64 - gap;
    let below = (area.y + area.height) as f64 - (pos.y + size.height as i32) as f64 - gap;
    Some((above / scale, below / scale))
}

pub(crate) fn panel_logical_size(panel: &WebviewWindow) -> Option<(f64, f64)> {
    let scale = panel.scale_factor().ok()?;
    let inner = panel.inner_size().ok()?;
    Some((inner.width as f64 / scale, inner.height as f64 / scale))
}

/// Fit the panel above Greg (shrinking its height on a short screen), place it, and learn the dock offset.
pub(crate) fn dock_panel(app: &AppHandle, mascot: &WebviewWindow, panel: &WebviewWindow) {
    let (Some(current), Some((above, below)), Ok(scale), Some(mascot_at)) = (
        panel_logical_size(panel),
        spaces_around_mascot(mascot),
        panel.scale_factor(),
        window_point(mascot),
    ) else {
        return;
    };
    let (width, height) = match app.state::<Dock>().0.lock() {
        Ok(state) if state.desired.0 > 0.0 => state.desired,
        _ => current,
    };
    let space = match choose_side(above, below, panel_size::MIN_SIZE.1) {
        Side::Above => above,
        Side::Below => below,
    };
    let fitted = fit_height(height, space);
    let resized_here = (fitted - current.1).abs() > 0.5 || (width - current.0).abs() > 0.5;
    if resized_here {
        let _ = panel.set_size(LogicalSize::new(width, fitted));
    }
    let size_px = ((width * scale).round() as i32, (fitted * scale).round() as i32);
    let Some(origin) = docked_origin(mascot, size_px) else {
        return;
    };
    let _ = panel.set_position(PhysicalPosition::new(origin.0, origin.1));
    if let Ok(mut state) = app.state::<Dock>().0.lock() {
        state.offset = (origin.0 - mascot_at.0, origin.1 - mascot_at.1);
        state.panel_size = (size_px.0 as u32, size_px.1 as u32);
        if state.desired.0 <= 0.0 {
            state.desired = (width, height);
        }
        if resized_here {
            state.ignore_resize_until = now_ms() + SELF_RESIZE_QUIET_MS;
        }
    }
}

/// The panel changed size (user dragged an edge). Re-learn its offset from Greg instead of moving Greg,
/// and remember the size for next time.
pub(crate) fn on_panel_resized(app: &AppHandle) {
    let (Some(mascot), Some(panel)) = (
        app.get_webview_window(MASCOT_LABEL),
        app.get_webview_window(PANEL_LABEL),
    ) else {
        return;
    };
    if !panel.is_visible().unwrap_or(false) {
        return;
    }
    let (Some(mascot_at), Some(panel_at), Ok(size)) = (window_point(&mascot), window_point(&panel), panel.outer_size()) else {
        return;
    };
    let now = now_ms();
    let save = match app.state::<Dock>().0.lock() {
        Ok(mut state) => {
            state.panel_size = (size.width, size.height);
            state.offset = (panel_at.0 - mascot_at.0, panel_at.1 - mascot_at.1);
            if now >= state.ignore_resize_until {
                if let Some(logical) = panel_logical_size(&panel) {
                    state.desired = clamp_size(logical);
                }
            }
            let save = should_save(now, state.last_saved, state.ignore_resize_until);
            if save {
                state.last_saved = now;
            }
            save
        }
        Err(_) => false,
    };
    if save {
        save_panel_size(app);
    }
}

/// Keep the visible panel and the mascot moving together, whichever one the user drags.
pub(crate) fn keep_docked(app: &AppHandle, moved_label: &str) {
    let (Some(mascot), Some(panel)) = (
        app.get_webview_window(MASCOT_LABEL),
        app.get_webview_window(PANEL_LABEL),
    ) else {
        return;
    };
    if !panel.is_visible().unwrap_or(false) {
        return;
    }
    let (Some(mascot_at), Some(panel_at)) = (window_point(&mascot), window_point(&panel)) else {
        return;
    };
    // Dragging the panel's top or left edge to resize also "moves" it. Greg must stay where he is.
    if moved_label == PANEL_LABEL {
        if let Ok(size) = panel.outer_size() {
            let resized = app
                .state::<Dock>()
                .0
                .lock()
                .map(|state| classify_panel_change(state.panel_size, (size.width, size.height)) == PanelChange::Resized)
                .unwrap_or(false);
            if resized {
                return on_panel_resized(app);
            }
        }
    }
    let Ok(offset) = app.state::<Dock>().0.lock().map(|state| state.offset) else {
        return;
    };
    // Greg was dragged somewhere the panel no longer fits on its current side: dock again (flip above/below, refit)
    // instead of following with a stale offset, which would push the panel under the menu bar and Greg back.
    if moved_label == MASCOT_LABEL {
        if let (Ok(size), Ok(Some(monitor))) = (panel.outer_size(), mascot.current_monitor()) {
            let target = (mascot_at.0 + offset.0, mascot_at.1 + offset.1);
            if !fits_inside(target, (size.width as i32, size.height as i32), work_rect(&monitor)) {
                return dock_panel(app, &mascot, &panel);
            }
        }
    }
    match follow_target(moved_label == MASCOT_LABEL, mascot_at, panel_at, offset) {
        Some((Follower::Panel, (x, y))) => {
            let _ = panel.set_position(PhysicalPosition::new(x, y));
        }
        Some((Follower::Mascot, (x, y))) => {
            let _ = mascot.set_position(PhysicalPosition::new(x, y));
        }
        None => {}
    }
}

/// Put the mascot in the bottom-right corner of the primary monitor, above the Dock.
pub(crate) fn place_mascot(app: &AppHandle) {
    let (Some(mascot), Ok(Some(monitor))) = (app.get_webview_window(MASCOT_LABEL), app.primary_monitor())
    else {
        return;
    };
    let Ok(size) = mascot.outer_size() else {
        return;
    };
    let margin = (MARGIN_LOGICAL_PX * monitor.scale_factor()) as i32;
    let screen = monitor.size();
    let origin = monitor.position();
    let x = origin.x + screen.width as i32 - size.width as i32 - margin;
    let y = origin.y + screen.height as i32 - size.height as i32 - margin * DOCK_CLEARANCE_MULTIPLIER;
    let _ = mascot.set_position(PhysicalPosition::new(x, y));
}

pub(crate) fn watch_moves(app: &AppHandle) {
    for label in [MASCOT_LABEL, PANEL_LABEL] {
        let Some(window) = app.get_webview_window(label) else {
            continue;
        };
        let handle = app.clone();
        window.on_window_event(move |event| match event {
            WindowEvent::Moved(_) => keep_docked(&handle, label),
            WindowEvent::Resized(_) if label == PANEL_LABEL => on_panel_resized(&handle),
            _ => {}
        });
    }
}

impl Dock {
    pub(crate) fn new() -> Self {
        Dock(Mutex::new(DockState { offset: (0, 0), panel_size: (0, 0), ignore_resize_until: 0, last_saved: 0, desired: (0.0, 0.0) }))
    }
}
