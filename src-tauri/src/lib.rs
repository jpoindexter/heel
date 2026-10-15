mod panel_size;
mod placement;

use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use panel_size::{classify_panel_change, clamp_size, fit_height, parse_saved, should_save, PanelChange, SELF_RESIZE_QUIET_MS};
use placement::{follow_target, panel_origin, Follower, Point, Rect};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, WebviewWindow, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

const MASCOT_LABEL: &str = "main";
const PANEL_LABEL: &str = "panel";
const SIDECAR_FILE: &str = "sidecar.json";
/// Tells the panel to show Settings. Must equal OPEN_SETTINGS_EVENT in src/events.ts (a test enforces it).
const OPEN_SETTINGS_EVENT: &str = "heel:open-settings";
const SETTINGS_VIEW: &str = "settings";
/// Menu-bar icon: 44x44 raw RGBA, a black silhouette that macOS recolours for light and dark menu bars.
const TRAY_ICON_RGBA: &[u8] = include_bytes!("../icon-source/tray.rgba");
const TRAY_ICON_PX: u32 = 44;
const MARGIN_LOGICAL_PX: f64 = 24.0;
const PANEL_GAP_LOGICAL_PX: f64 = 8.0;
const DOCK_CLEARANCE_MULTIPLIER: i32 = 3;

/// What keeps the panel and Greg moving as one, and what lets the panel be resized without dragging Greg.
struct DockState {
    /// Panel position minus mascot position.
    offset: Point,
    /// Panel outer size (physical px) at the last sync; a change means "resized", not "moved".
    panel_size: (u32, u32),
    /// Ignore resize events (and don't save) until this time: Heel just resized the panel itself.
    ignore_resize_until: u64,
    last_saved: u64,
}

struct Dock(Mutex<DockState>);

/// A view the panel should open on next (set by the menu bar before the panel is shown or loaded).
struct PendingView(Mutex<Option<&'static str>>);

fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}

fn hotkey() -> Shortcut {
    Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyH)
}

fn window_point(window: &WebviewWindow) -> Option<Point> {
    window.outer_position().ok().map(|p| (p.x, p.y))
}

/// Where the panel should open for the mascot's current position, inside the mascot's monitor.
/// `panel_size` is the size the panel will have (physical px), which may not be applied yet.
fn docked_origin(mascot: &WebviewWindow, panel_size: (i32, i32)) -> Option<Point> {
    let pos = mascot.outer_position().ok()?;
    let size = mascot.outer_size().ok()?;
    let monitor = mascot.current_monitor().ok()??;
    let gap = (PANEL_GAP_LOGICAL_PX * monitor.scale_factor()) as i32;
    let mascot_rect = Rect { x: pos.x, y: pos.y, width: size.width as i32, height: size.height as i32 };
    let monitor_rect = Rect {
        x: monitor.position().x,
        y: monitor.position().y,
        width: monitor.size().width as i32,
        height: monitor.size().height as i32,
    };
    Some(panel_origin(mascot_rect, panel_size, monitor_rect, gap))
}

/// Room above Greg inside his monitor, in logical px (the panel is shrunk to this on short screens).
fn space_above_mascot(mascot: &WebviewWindow) -> Option<f64> {
    let pos = mascot.outer_position().ok()?;
    let monitor = mascot.current_monitor().ok()??;
    let scale = monitor.scale_factor();
    let gap = PANEL_GAP_LOGICAL_PX * scale;
    Some(((pos.y - monitor.position().y) as f64 - gap) / scale)
}

fn panel_logical_size(panel: &WebviewWindow) -> Option<(f64, f64)> {
    let scale = panel.scale_factor().ok()?;
    let inner = panel.inner_size().ok()?;
    Some((inner.width as f64 / scale, inner.height as f64 / scale))
}

fn size_file(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_data_dir().ok().map(|dir| dir.join(panel_size::SAVE_FILE))
}

fn save_panel_size(app: &AppHandle) {
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
fn restore_panel_size(app: &AppHandle) {
    let (Some(panel), Some(path)) = (app.get_webview_window(PANEL_LABEL), size_file(app)) else {
        return;
    };
    if let Some((width, height)) = std::fs::read_to_string(path).ok().and_then(|json| parse_saved(&json)) {
        let _ = panel.set_size(LogicalSize::new(width, height));
    }
}

fn panel_is_visible(app: &AppHandle) -> bool {
    app.get_webview_window(PANEL_LABEL)
        .and_then(|panel| panel.is_visible().ok())
        .unwrap_or(false)
}

/// Show the panel docked to the mascot, or hide it if already visible.
fn toggle_panel(app: &AppHandle) {
    if panel_is_visible(app) {
        save_panel_size(app);
        if let Some(panel) = app.get_webview_window(PANEL_LABEL) {
            let _ = panel.hide();
        }
    } else {
        show_panel(app);
    }
}

fn show_panel(app: &AppHandle) {
    let Some(panel) = app.get_webview_window(PANEL_LABEL) else {
        return;
    };
    if let Some(mascot) = app.get_webview_window(MASCOT_LABEL) {
        dock_panel(app, &mascot, &panel);
    }
    let _ = panel.show();
    let _ = panel.set_focus();
}

/// Fit the panel above Greg (shrinking its height on a short screen), place it, and learn the dock offset.
fn dock_panel(app: &AppHandle, mascot: &WebviewWindow, panel: &WebviewWindow) {
    let (Some((width, height)), Some(space), Ok(scale), Some(mascot_at)) = (
        panel_logical_size(panel),
        space_above_mascot(mascot),
        panel.scale_factor(),
        window_point(mascot),
    ) else {
        return;
    };
    let fitted = fit_height(height, space);
    let resized_here = (fitted - height).abs() > 0.5;
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
        if resized_here {
            state.ignore_resize_until = now_ms() + SELF_RESIZE_QUIET_MS;
        }
    }
}

/// Bring the panel forward: show it if hidden, focus it if already open.
fn reveal_panel(app: &AppHandle) {
    if panel_is_visible(app) {
        if let Some(panel) = app.get_webview_window(PANEL_LABEL) {
            let _ = panel.set_focus();
        }
    } else {
        show_panel(app);
    }
}

/// The panel changed size (user dragged an edge). Re-learn its offset from Greg instead of moving Greg,
/// and remember the size for next time.
fn on_panel_resized(app: &AppHandle) {
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
fn keep_docked(app: &AppHandle, moved_label: &str) {
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
fn place_mascot(app: &AppHandle) {
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

fn watch_moves(app: &AppHandle) {
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

#[tauri::command]
fn toggle_panel_command(app: AppHandle) {
    toggle_panel(&app);
}

/// Port and token of the local helper, written by the sidecar into the app data dir.
/// The panel reads it through here so a web page can never learn the token.
#[tauri::command]
fn sidecar_info(app: AppHandle) -> Result<String, String> {
    let dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    std::fs::read_to_string(dir.join(SIDECAR_FILE))
        .map_err(|_| "Heel's helper isn't running. Restart Heel.".to_string())
}

/// Open the panel on Settings. The pending flag covers a panel that has not loaded yet; the event covers one that has.
fn open_settings(app: &AppHandle) {
    if let Ok(mut pending) = app.state::<PendingView>().0.lock() {
        *pending = Some(SETTINGS_VIEW);
    }
    reveal_panel(app);
    let _ = app.emit_to(PANEL_LABEL, OPEN_SETTINGS_EVENT, ());
}

/// The panel asks for its starting view once it is up (and again after the event); asking clears it.
#[tauri::command]
fn take_pending_view(app: AppHandle) -> Option<String> {
    app.state::<PendingView>().0.lock().ok().and_then(|mut pending| pending.take()).map(str::to_string)
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let toggle = MenuItem::with_id(app, "toggle", "Show / hide panel", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings…", true, Some("CmdOrCtrl+,"))?;
    let quit = MenuItem::with_id(app, "quit", "Quit Heel", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle, &settings, &PredefinedMenuItem::separator(app)?, &quit])?;
    TrayIconBuilder::new()
        .icon(Image::new(TRAY_ICON_RGBA, TRAY_ICON_PX, TRAY_ICON_PX))
        .icon_as_template(true)
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "toggle" => toggle_panel(app),
            "settings" => open_settings(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // Must be the first plugin. A second launch exits at once and asks the running Heel to show its panel.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| reveal_panel(app)));

    builder
        .manage(Dock(Mutex::new(DockState { offset: (0, 0), panel_size: (0, 0), ignore_resize_until: 0, last_saved: 0 })))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed && shortcut == &hotkey() {
                        toggle_panel(app);
                    }
                })
                .build(),
        )
        .manage(PendingView(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![toggle_panel_command, sidecar_info, take_pending_view])
        .setup(|app| {
            let handle = app.handle();
            restore_panel_size(handle);
            place_mascot(handle);
            watch_moves(handle);
            build_tray(handle)?;
            app.global_shortcut().register(hotkey())?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Heel")
        .run(|app, event| {
            // Clicking the Dock icon opens the panel if it is hidden.
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Reopen { .. } = event {
                if !panel_is_visible(app) {
                    show_panel(app);
                }
            }
            #[cfg(not(target_os = "macos"))]
            let _ = (app, event);
        });
}
