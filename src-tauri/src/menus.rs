//! The macOS app menu and the menu-bar (tray) menu, and how "Settings…" reaches the panel.

use std::sync::Mutex;

use tauri::{
    image::Image,
    menu::{Menu, MenuItem, MenuItemKind, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager,
};

use crate::constants::{APP_SETTINGS_ID, OPEN_SETTINGS_EVENT, PANEL_LABEL, SETTINGS_VIEW, TRAY_ICON_PX, TRAY_ICON_RGBA, TRAY_RESTART_HELPER_ID, TRAY_SETTINGS_ID, TRAY_SHOW_GREG_ID};
use crate::panel_window::{reveal_panel, toggle_panel};

/// A view the panel should open on next (set by the menu bar before the panel is shown or loaded).
pub(crate) struct PendingView(Mutex<Option<&'static str>>);

impl PendingView {
    pub(crate) fn new() -> Self {
        PendingView(Mutex::new(None))
    }
}

/// Open the panel on Settings. The pending flag covers a panel that has not loaded yet; the event covers one that has.
pub(crate) fn open_settings(app: &AppHandle) {
    if let Ok(mut pending) = app.state::<PendingView>().0.lock() {
        *pending = Some(SETTINGS_VIEW);
    }
    reveal_panel(app);
    let _ = app.emit_to(PANEL_LABEL, OPEN_SETTINGS_EVENT, ());
}

/// The panel asks for its starting view once it is up (and again after the event); asking clears it.
#[tauri::command]
pub(crate) fn take_pending_view(app: AppHandle) -> Option<String> {
    app.state::<PendingView>().0.lock().ok().and_then(|mut pending| pending.take()).map(str::to_string)
}

/// The standard macOS app menu plus "Settings…" (Cmd+,), placed under "About" the way other Mac apps do.
pub(crate) fn build_app_menu(app: &AppHandle) -> tauri::Result<()> {
    let menu = Menu::default(app)?;
    if let Some(MenuItemKind::Submenu(app_menu)) = menu.items()?.into_iter().next() {
        let settings = MenuItem::with_id(app, APP_SETTINGS_ID, "Settings…", true, Some("CmdOrCtrl+,"))?;
        app_menu.insert(&PredefinedMenuItem::separator(app)?, 1)?;
        app_menu.insert(&settings, 2)?;
    }
    app.set_menu(menu)?;
    Ok(())
}

pub(crate) fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let toggle = MenuItem::with_id(app, "toggle", "Show / hide panel", true, None::<&str>)?;
    let show_greg = MenuItem::with_id(app, TRAY_SHOW_GREG_ID, "Show Greg", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, TRAY_SETTINGS_ID, "Settings…", true, Some("CmdOrCtrl+,"))?;
    let restart = MenuItem::with_id(app, TRAY_RESTART_HELPER_ID, "Restart Heel's helper", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit Heel", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle, &show_greg, &settings, &restart, &PredefinedMenuItem::separator(app)?, &quit])?;
    TrayIconBuilder::new()
        .icon(Image::new(TRAY_ICON_RGBA, TRAY_ICON_PX, TRAY_ICON_PX))
        .icon_as_template(true)
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "toggle" => toggle_panel(app),
            TRAY_SHOW_GREG_ID => crate::appear::show_mascot(app),
            TRAY_SETTINGS_ID => open_settings(app),
            TRAY_RESTART_HELPER_ID => drop(crate::helper_watch::restart_helper(app.clone())),
            "quit" => crate::appear::goodbye(app),
            _ => {}
        })
        .build(app)?;
    Ok(())
}
