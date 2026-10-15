use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager, PhysicalPosition,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

const MASCOT_LABEL: &str = "main";
const PANEL_LABEL: &str = "panel";
const MARGIN_LOGICAL_PX: f64 = 24.0;
const DOCK_CLEARANCE_MULTIPLIER: i32 = 3;

fn hotkey() -> Shortcut {
    Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyH)
}

/// Show the panel above the mascot, or hide it if already visible.
fn toggle_panel(app: &AppHandle) {
    let Some(panel) = app.get_webview_window(PANEL_LABEL) else {
        return;
    };
    if panel.is_visible().unwrap_or(false) {
        let _ = panel.hide();
        return;
    }
    if let Some(mascot) = app.get_webview_window(MASCOT_LABEL) {
        if let (Ok(pos), Ok(size)) = (mascot.outer_position(), panel.outer_size()) {
            let y = (pos.y - size.height as i32).max(0);
            let _ = panel.set_position(PhysicalPosition::new(pos.x, y));
        }
    }
    let _ = panel.show();
    let _ = panel.set_focus();
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
            build_tray(handle)?;
            app.global_shortcut().register(hotkey())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Heel");
}
