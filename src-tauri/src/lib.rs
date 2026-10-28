mod anchor;
mod attention;
mod app_setup;
mod appear;
mod commands;
mod constants;
mod dock;
mod hidden_state;
mod helper_health;
mod helper_watch;
mod hit_region;
mod hotkey;
mod mascot_menu;
mod menus;
mod notice_window;
mod panel_size;
mod panel_window;
mod placement;
mod pointer_sense;
mod panel_place;
mod save_file;
mod shell_settings;
mod sidecar_process;
mod startup;
mod system_notice;
mod undock;
mod walk;
mod window_level;

use anchor::panel_anchor;
use appear::{hide_greg, show_greg, Departure};
use attention::{set_attention_enabled, Attention};
use commands::{panel_visible, sidecar_info, toggle_panel_command};
use notice_window::{hide_notice, show_notice};
use dock::Dock;
use hit_region::{set_mascot_hit_region, set_mascot_pressed, HitRegion};
use mascot_menu::{set_life_flags, show_mascot_menu, LifeFlags};
use menus::{take_pending_view, PendingView};
use walk::{start_walk, stop_walk, Walker};
use panel_window::{panel_is_visible, reveal_panel, show_panel, toggle_panel};
use helper_watch::{helper_status, restart_helper};
use sidecar_process::SidecarProc;
use system_notice::system_notify;
use undock::{dock_panel_command, panel_offset};
use shell_settings::{shell_settings, Shell};
use window_level::set_always_on_top;
use startup::{launch_at_login, reveal_data_folder, set_dock_icon, set_launch_at_login};
use hotkey::set_hotkey;
use tauri_plugin_global_shortcut::ShortcutState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // Must be the first plugin. A second launch exits at once and asks the running Heel to show its panel.
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        helper_watch::revive_if_stopped(app);
        reveal_panel(app);
    }));

    builder
        .manage(Attention::default())
        .manage(Dock::new())
        .manage(PendingView::new())
        .manage(HitRegion::default())
        .manage(pointer_sense::PointerSense::default())
        .manage(LifeFlags::default())
        .manage(Walker::default())
        .manage(Departure::default())
        .manage(SidecarProc::default())
        .manage(Shell::default())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                // One shortcut is registered at a time (hotkey.rs), so any press is the panel's.
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_panel(app);
                    }
                })
                .build(),
        )
        .on_menu_event(|app, event| mascot_menu::on_menu_event(app, event.id().as_ref()))
        .invoke_handler(tauri::generate_handler![toggle_panel_command, sidecar_info, take_pending_view, set_mascot_hit_region, set_mascot_pressed, show_mascot_menu, set_life_flags, start_walk, stop_walk, hide_greg, show_greg, panel_anchor, helper_status, restart_helper, panel_visible, show_notice, hide_notice, set_attention_enabled, dock_panel_command, panel_offset, system_notify, shell_settings, set_always_on_top, launch_at_login, set_launch_at_login, set_dock_icon, reveal_data_folder, set_hotkey])
        .setup(app_setup::setup)
        .build(tauri::generate_context!())
        .expect("error while building Heel")
        .run(on_run_event);
}

fn on_run_event(app: &tauri::AppHandle, event: tauri::RunEvent) {
    // The packaged app's own helper ends with the app; a parked panel's place is written one last time.
    if let tauri::RunEvent::Exit = event {
        undock::save_place(app);
        sidecar_process::stop(app);
    }
    // Clicking the Dock icon opens the panel if it is hidden.
    #[cfg(target_os = "macos")]
    if let tauri::RunEvent::Reopen { .. } = event {
        helper_watch::revive_if_stopped(app);
        if !panel_is_visible(app) {
            show_panel(app);
        }
    }
    #[cfg(not(target_os = "macos"))]
    let _ = (app, event);
}
