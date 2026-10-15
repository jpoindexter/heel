//! Everything that runs once at startup, in order.

use tauri::App;
use tauri_plugin_global_shortcut::GlobalShortcutExt;

use crate::dock::{place_mascot, watch_moves};
use crate::menus::{build_app_menu, build_tray};
use crate::panel_window::restore_panel_size;
use crate::{hit_region, hotkey};

pub(crate) fn setup(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let handle = app.handle().clone();
    restore_panel_size(&handle);
    let home = place_mascot(&handle);
    crate::appear::start_up(&handle, home);
    watch_moves(&handle);
    hit_region::start_polling(&handle);
    build_app_menu(&handle)?;
    build_tray(&handle)?;
    // Isolation switches for hunting input/focus conflicts with other apps (see DECISIONS: B1).
    if std::env::var_os("HEEL_NO_HOTKEY").is_none() {
        app.global_shortcut().register(hotkey())?;
    }
    #[cfg(target_os = "macos")]
    if std::env::var_os("HEEL_ACCESSORY").is_some() {
        app.set_activation_policy(tauri::ActivationPolicy::Accessory);
    }
    Ok(())
}
