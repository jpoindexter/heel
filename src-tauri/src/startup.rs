//! Startup (N10): launch at login through macOS's own login item (SMAppService, so it shows in System Settings ›
//! General › Login Items only while on), Heel in the Dock or not, and the data folder in Finder.

use tauri::AppHandle;
use tauri::Manager;

use crate::shell_settings::Shell;

/// What the switch shows: on, off, or macOS still waiting for the person's approval in System Settings.
pub fn describe_login_status(enabled: bool, requires_approval: bool) -> &'static str {
    match (enabled, requires_approval) {
        (true, _) => "on",
        (false, true) => "needs-approval",
        (false, false) => "off",
    }
}

#[cfg(target_os = "macos")]
fn login_status() -> &'static str {
    use objc2_service_management::{SMAppService, SMAppServiceStatus};
    // SAFETY: a class method with no arguments; the status is a plain integer.
    let status = unsafe { SMAppService::mainAppService().status() };
    describe_login_status(status == SMAppServiceStatus::Enabled, status == SMAppServiceStatus::RequiresApproval)
}

#[tauri::command]
pub(crate) fn launch_at_login() -> &'static str {
    login_status()
}

/// Register or unregister the main app as a login item. macOS's own words come back when it refuses
/// (a dev build outside a .app bundle, an unsigned copy it does not trust).
#[cfg(target_os = "macos")]
#[tauri::command]
pub(crate) fn set_launch_at_login(on: bool) -> Result<&'static str, String> {
    use objc2_service_management::SMAppService;
    // SAFETY: the service object is Apple's own singleton for this bundle; both calls take no pointers of ours.
    let result = unsafe {
        let service = SMAppService::mainAppService();
        if on { service.registerAndReturnError() } else { service.unregisterAndReturnError() }
    };
    result.map_err(|error| error.localizedDescription().to_string())?;
    Ok(login_status())
}

/// Heel's Dock icon. Accessory means no Dock tile and no menu bar of its own; Greg and the menu-bar icon stay.
#[cfg(target_os = "macos")]
pub(crate) fn activation_policy(dock_icon: bool) -> tauri::ActivationPolicy {
    if dock_icon { tauri::ActivationPolicy::Regular } else { tauri::ActivationPolicy::Accessory }
}

#[cfg(target_os = "macos")]
#[tauri::command]
pub(crate) fn set_dock_icon(app: AppHandle, on: bool) -> Result<(), String> {
    if let Ok(mut state) = app.state::<Shell>().0.lock() {
        state.dock_icon = on;
    }
    crate::shell_settings::save(&app);
    app.set_activation_policy(activation_policy(on)).map_err(|error| error.to_string())
}

/// "Show data folder": the app data directory in Finder, through macOS `open`.
#[tauri::command]
pub(crate) fn reveal_data_folder(app: AppHandle) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    // `open` returns as soon as Finder has the request; waiting reaps it (a spawned-and-dropped Child stays defunct until Heel quits).
    std::process::Command::new("open").arg(&dir).status().map(|_| ()).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn says_on_off_or_that_macos_still_wants_approval() {
        assert_eq!(describe_login_status(true, false), "on");
        assert_eq!(describe_login_status(false, false), "off");
        assert_eq!(describe_login_status(false, true), "needs-approval");
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn the_dock_switch_maps_to_the_activation_policy() {
        assert!(matches!(activation_policy(true), tauri::ActivationPolicy::Regular));
        assert!(matches!(activation_policy(false), tauri::ActivationPolicy::Accessory));
    }
}
