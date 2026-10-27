//! Everything that runs once at startup, in order.

use tauri::App;
use tauri_plugin_global_shortcut::GlobalShortcutExt;

use crate::dock::{place_mascot, watch_moves};
use crate::menus::{build_app_menu, build_tray};
use crate::panel_window::restore_panel_size;
use crate::{hit_region, hotkey};

pub(crate) fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle().clone();
    crate::sidecar_process::start(&handle);
    restore_panel_size(&handle);
    let settings = crate::shell_settings::load(&handle);
    crate::undock::restore_place(&handle);
    crate::window_level::apply_panel_level(&handle);
    let home = place_mascot(&handle);
    crate::appear::start_up(&handle, home);
    watch_moves(&handle);
    hit_region::start_watching(&handle);
    crate::attention::start(&handle);
    crate::system_notice::test_on_launch();
    build_app_menu(&handle)?;
    build_tray(&handle)?;
    // Isolation switches for hunting input/focus conflicts with other apps (see DECISIONS: B1).
    if std::env::var_os("HEEL_NO_HOTKEY").is_none() {
        app.global_shortcut().register(hotkey())?;
    }
    // The Dock icon is a setting (N10); HEEL_ACCESSORY still forces it off for the B1 test.
    #[cfg(target_os = "macos")]
    app.set_activation_policy(crate::startup::activation_policy(settings.dock_icon && std::env::var_os("HEEL_ACCESSORY").is_none()));
    Ok(())
}
