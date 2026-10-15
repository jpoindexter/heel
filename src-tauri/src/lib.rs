mod placement;

use std::sync::Mutex;

use placement::{follow_target, panel_origin, Follower, Point, Rect};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, PhysicalPosition, WebviewWindow, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

const MASCOT_LABEL: &str = "main";
const PANEL_LABEL: &str = "panel";
const MARGIN_LOGICAL_PX: f64 = 24.0;
const PANEL_GAP_LOGICAL_PX: f64 = 8.0;
const DOCK_CLEARANCE_MULTIPLIER: i32 = 3;

/// Panel position minus mascot position, captured when the panel opens, so the two move as one.
struct DockOffset(Mutex<Point>);

fn hotkey() -> Shortcut {
    Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyH)
}

fn window_point(window: &WebviewWindow) -> Option<Point> {
    window.outer_position().ok().map(|p| (p.x, p.y))
}

/// Where the panel should open for the mascot's current position, inside the mascot's monitor.
fn docked_origin(mascot: &WebviewWindow, panel: &WebviewWindow) -> Option<Point> {
    let pos = mascot.outer_position().ok()?;
    let size = mascot.outer_size().ok()?;
    let panel_size = panel.outer_size().ok()?;
    let monitor = mascot.current_monitor().ok()??;
    let gap = (PANEL_GAP_LOGICAL_PX * monitor.scale_factor()) as i32;
    let mascot_rect = Rect { x: pos.x, y: pos.y, width: size.width as i32, height: size.height as i32 };
    let monitor_rect = Rect {
        x: monitor.position().x,
        y: monitor.position().y,
        width: monitor.size().width as i32,
        height: monitor.size().height as i32,
    };
    Some(panel_origin(mascot_rect, (panel_size.width as i32, panel_size.height as i32), monitor_rect, gap))
}

/// Show the panel docked to the mascot, or hide it if already visible.
fn toggle_panel(app: &AppHandle) {
    let Some(panel) = app.get_webview_window(PANEL_LABEL) else {
        return;
    };
    if panel.is_visible().unwrap_or(false) {
        let _ = panel.hide();
        return;
    }
    if let Some(mascot) = app.get_webview_window(MASCOT_LABEL) {
        if let (Some(origin), Some(mascot_at)) = (docked_origin(&mascot, &panel), window_point(&mascot)) {
            if let Ok(mut offset) = app.state::<DockOffset>().0.lock() {
                *offset = (origin.0 - mascot_at.0, origin.1 - mascot_at.1);
            }
            let _ = panel.set_position(PhysicalPosition::new(origin.0, origin.1));
        }
    }
    let _ = panel.show();
    let _ = panel.set_focus();
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
    let Ok(offset) = app.state::<DockOffset>().0.lock().map(|o| *o) else {
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
        window.on_window_event(move |event| {
            if let WindowEvent::Moved(_) = event {
                keep_docked(&handle, label);
            }
        });
    }
}

#[tauri::command]
fn toggle_panel_command(app: AppHandle) {
    toggle_panel(&app);
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let toggle = MenuItem::with_id(app, "toggle", "Show / hide panel", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Heel", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle, &quit])?;
    let mut tray = TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "toggle" => toggle_panel(app),
            "quit" => app.exit(0),
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(DockOffset(Mutex::new((0, 0))))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed && shortcut == &hotkey() {
                        toggle_panel(app);
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![toggle_panel_command])
        .setup(|app| {
            // No Dock icon: Heel lives as a mascot + tray item.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let handle = app.handle();
            place_mascot(handle);
            watch_moves(handle);
            build_tray(handle)?;
            app.global_shortcut().register(hotkey())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Heel");
}
