//! The menu that pops up when you right-click Greg, and hiding / showing him.

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    AppHandle, Manager,
};

use crate::constants::{
    MASCOT_LABEL, MASCOT_MENU_HIDE_ID, MASCOT_MENU_QUIT_ID, MASCOT_MENU_SETTINGS_ID, MASCOT_MENU_TOGGLE_ID, PANEL_LABEL, TRAY_SHOW_GREG_ID,
};
use crate::menus::open_settings;
use crate::panel_window::{panel_is_visible, save_panel_size, toggle_panel};

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) enum Entry {
    Item { id: &'static str, label: String },
    Separator,
}

/// What the menu holds, in order. Kept separate from building it so the contents can be tested without a window.
pub(crate) fn entries(panel_open: bool) -> Vec<Entry> {
    let item = |id, label: &str| Entry::Item { id, label: label.to_string() };
    vec![
        item(MASCOT_MENU_TOGGLE_ID, if panel_open { "Close Heel" } else { "Open Heel" }),
        item(MASCOT_MENU_SETTINGS_ID, "Settings…"),
        Entry::Separator,
        item(MASCOT_MENU_HIDE_ID, "Hide Greg"),
        Entry::Separator,
        item(MASCOT_MENU_QUIT_ID, "Quit Heel"),
    ]
}

fn build(app: &AppHandle, entries: &[Entry]) -> tauri::Result<Menu<tauri::Wry>> {
    let menu = Menu::new(app)?;
    for entry in entries {
        match entry {
            Entry::Item { id, label } => menu.append(&MenuItem::with_id(app, *id, label, true, None::<&str>)?)?,
            Entry::Separator => menu.append(&PredefinedMenuItem::separator(app)?)?,
        }
    }
    Ok(menu)
}

/// Pop the menu at the pointer. Called by the mascot webview on right-click.
#[tauri::command]
pub(crate) fn show_mascot_menu(app: AppHandle) {
    let Some(mascot) = app.get_webview_window(MASCOT_LABEL) else {
        return;
    };
    if let Ok(menu) = build(&app, &entries(panel_is_visible(&app))) {
        let _ = mascot.popup_menu(&menu);
    }
}

/// Greg leaves (and the panel with him). The tray's "Show Greg" brings him back.
pub(crate) fn hide_mascot(app: &AppHandle) {
    if panel_is_visible(app) {
        save_panel_size(app);
    }
    for label in [PANEL_LABEL, MASCOT_LABEL] {
        if let Some(window) = app.get_webview_window(label) {
            let _ = window.hide();
        }
    }
}

pub(crate) fn show_mascot(app: &AppHandle) {
    if let Some(mascot) = app.get_webview_window(MASCOT_LABEL) {
        let _ = mascot.show();
    }
}

/// Every menu item click lands here (the app menu, Greg's menu and the tray share one event stream).
pub(crate) fn on_menu_event(app: &AppHandle, id: &str) {
    match id {
        crate::constants::APP_SETTINGS_ID | MASCOT_MENU_SETTINGS_ID => open_settings(app),
        MASCOT_MENU_TOGGLE_ID => toggle_panel(app),
        MASCOT_MENU_HIDE_ID => hide_mascot(app),
        TRAY_SHOW_GREG_ID => show_mascot(app),
        MASCOT_MENU_QUIT_ID => app.exit(0),
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ids(entries: &[Entry]) -> Vec<&'static str> {
        entries.iter().filter_map(|e| if let Entry::Item { id, .. } = e { Some(*id) } else { None }).collect()
    }

    #[test]
    fn always_offers_settings_hide_and_quit() {
        for open in [false, true] {
            let found = ids(&entries(open));
            for needed in [MASCOT_MENU_SETTINGS_ID, MASCOT_MENU_HIDE_ID, MASCOT_MENU_QUIT_ID] {
                assert!(found.contains(&needed), "missing {needed} (panel open = {open})");
            }
        }
    }

    #[test]
    fn the_first_item_says_what_it_will_do_to_the_panel() {
        let label = |open| match &entries(open)[0] {
            Entry::Item { label, .. } => label.clone(),
            Entry::Separator => String::new(),
        };
        assert_eq!(label(false), "Open Heel");
        assert_eq!(label(true), "Close Heel");
    }

    #[test]
    fn quit_is_last_and_separators_never_lead_trail_or_double_up() {
        let list = entries(false);
        assert_eq!(ids(&list).last(), Some(&MASCOT_MENU_QUIT_ID));
        assert_ne!(list.first(), Some(&Entry::Separator));
        assert_ne!(list.last(), Some(&Entry::Separator));
        assert!(list.windows(2).all(|pair| !(pair[0] == Entry::Separator && pair[1] == Entry::Separator)));
    }

    #[test]
    fn item_ids_are_unique() {
        let found = ids(&entries(true));
        let mut sorted = found.clone();
        sorted.sort_unstable();
        sorted.dedup();
        assert_eq!(sorted.len(), found.len());
    }
}
