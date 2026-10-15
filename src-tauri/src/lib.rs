mod app_setup;
mod appear;
mod commands;
mod constants;
mod dock;
mod hidden_state;
mod hit_region;
mod mascot_menu;
mod menus;
mod panel_size;
mod panel_window;
mod placement;
mod walk;

use appear::{hide_greg, show_greg, Departure};
use commands::{sidecar_info, toggle_panel_command};
use dock::Dock;
use hit_region::{set_mascot_hit_region, set_mascot_pressed, HitRegion};
use mascot_menu::{set_life_flags, show_mascot_menu, LifeFlags};
use menus::{take_pending_view, PendingView};
use walk::{start_walk, stop_walk, Walker};
use panel_window::{panel_is_visible, reveal_panel, show_panel, toggle_panel};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

fn hotkey() -> Shortcut {
    Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyH)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // Must be the first plugin. A second launch exits at once and asks the running Heel to show its panel.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| reveal_panel(app)));

    builder
        .manage(Dock::new())
        .manage(PendingView::new())
        .manage(HitRegion::default())
        .manage(LifeFlags::default())
        .manage(Walker::default())
        .manage(Departure::default())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed && shortcut == &hotkey() {
                        toggle_panel(app);
                    }
                })
                .build(),
        )
        .on_menu_event(|app, event| mascot_menu::on_menu_event(app, event.id().as_ref()))
        .invoke_handler(tauri::generate_handler![toggle_panel_command, sidecar_info, take_pending_view, set_mascot_hit_region, set_mascot_pressed, show_mascot_menu, set_life_flags, start_walk, stop_walk, hide_greg, show_greg])
        .setup(app_setup::setup)
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
