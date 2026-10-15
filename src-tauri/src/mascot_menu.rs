//! The menu that pops up when you right-click Greg, and hiding / showing him.

use std::sync::Mutex;

use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    AppHandle, Emitter, Manager,
};

use crate::constants::{
    LIFE_COMMAND_EVENT, MASCOT_LABEL, MASCOT_MENU_HIDE_ID, MASCOT_MENU_NAP_ID, MASCOT_MENU_QUIET_ID, MASCOT_MENU_QUIT_ID, MASCOT_MENU_WALK_ID, MASCOT_MENU_SETTINGS_ID,
    MASCOT_MENU_TOGGLE_ID, PANEL_LABEL, TRAY_SHOW_GREG_ID,
};
use crate::menus::open_settings;
use crate::panel_window::{announce_panel, panel_is_visible, save_panel_size, toggle_panel};

/// What Greg is up to, pushed here by his window so the menu can say "Wake up" and tick "Quiet mode".
#[derive(Default)]
pub(crate) struct LifeFlags(pub(crate) Mutex<Flags>);

#[derive(Clone, Copy, Default, Debug, PartialEq, Eq)]
pub(crate) struct Flags {
    pub quiet: bool,
    pub asleep: bool,
}

#[tauri::command]
pub(crate) fn set_life_flags(app: AppHandle, quiet: bool, asleep: bool) {
    if let Ok(mut flags) = app.state::<LifeFlags>().0.lock() {
        *flags = Flags { quiet, asleep };
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) enum Entry {
    Item { id: &'static str, label: String },
    Check { id: &'static str, label: String, checked: bool },
    Separator,
}

/// What the menu holds, in order. Kept separate from building it so the contents can be tested without a window.
pub(crate) fn entries(panel_open: bool, flags: Flags) -> Vec<Entry> {
    let item = |id, label: &str| Entry::Item { id, label: label.to_string() };
    vec![
        item(MASCOT_MENU_TOGGLE_ID, if panel_open { "Close Heel" } else { "Open Heel" }),
        item(MASCOT_MENU_SETTINGS_ID, "Settings…"),
        Entry::Separator,
        item(MASCOT_MENU_WALK_ID, "Take a walk"),
        item(MASCOT_MENU_NAP_ID, if flags.asleep { "Wake up" } else { "Take a nap" }),
        Entry::Check { id: MASCOT_MENU_QUIET_ID, label: "Quiet mode".to_string(), checked: flags.quiet },
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
            Entry::Check { id, label, checked } => menu.append(&CheckMenuItem::with_id(app, *id, label, true, *checked, None::<&str>)?)?,
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
    let flags = app.state::<LifeFlags>().0.lock().map(|f| *f).unwrap_or_default();
    if let Ok(menu) = build(&app, &entries(panel_is_visible(&app), flags)) {
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
    announce_panel(app, false);
}

/// Tell Greg's window to do something (a nap, waking up, toggling quiet mode).
fn life_command(app: &AppHandle, command: &str) {
    let _ = app.emit_to(MASCOT_LABEL, LIFE_COMMAND_EVENT, command);
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
        MASCOT_MENU_NAP_ID => {
            let asleep = app.state::<LifeFlags>().0.lock().map(|f| f.asleep).unwrap_or(false);
            life_command(app, if asleep { "wake" } else { "nap" });
        }
        MASCOT_MENU_WALK_ID => life_command(app, "walk"),
        MASCOT_MENU_QUIET_ID => life_command(app, "toggle-quiet"),
        TRAY_SHOW_GREG_ID => show_mascot(app),
        MASCOT_MENU_QUIT_ID => app.exit(0),
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const AWAKE: Flags = Flags { quiet: false, asleep: false };

    fn ids(entries: &[Entry]) -> Vec<&'static str> {
        entries
            .iter()
            .filter_map(|e| match e {
                Entry::Item { id, .. } | Entry::Check { id, .. } => Some(*id),
                Entry::Separator => None,
            })
            .collect()
    }

    fn label_of(entries: &[Entry], wanted: &str) -> Option<String> {
        entries.iter().find_map(|e| match e {
            Entry::Item { id, label } | Entry::Check { id, label, .. } if *id == wanted => Some(label.clone()),
            _ => None,
        })
    }

    #[test]
    fn always_offers_settings_nap_quiet_hide_and_quit() {
        for open in [false, true] {
            let found = ids(&entries(open, AWAKE));
            for needed in [MASCOT_MENU_SETTINGS_ID, MASCOT_MENU_WALK_ID, MASCOT_MENU_NAP_ID, MASCOT_MENU_QUIET_ID, MASCOT_MENU_HIDE_ID, MASCOT_MENU_QUIT_ID] {
                assert!(found.contains(&needed), "missing {needed} (panel open = {open})");
            }
        }
    }

    #[test]
    fn labels_say_what_will_happen() {
        assert_eq!(label_of(&entries(false, AWAKE), MASCOT_MENU_TOGGLE_ID).as_deref(), Some("Open Heel"));
        assert_eq!(label_of(&entries(true, AWAKE), MASCOT_MENU_TOGGLE_ID).as_deref(), Some("Close Heel"));
        assert_eq!(label_of(&entries(false, AWAKE), MASCOT_MENU_NAP_ID).as_deref(), Some("Take a nap"));
        let asleep = Flags { asleep: true, ..AWAKE };
        assert_eq!(label_of(&entries(false, asleep), MASCOT_MENU_NAP_ID).as_deref(), Some("Wake up"));
    }

    #[test]
    fn quiet_mode_shows_its_state() {
        let checked = |flags| entries(false, flags).iter().find_map(|e| if let Entry::Check { checked, .. } = e { Some(*checked) } else { None });
        assert_eq!(checked(AWAKE), Some(false));
        assert_eq!(checked(Flags { quiet: true, ..AWAKE }), Some(true));
    }

    #[test]
    fn quit_is_last_and_separators_never_lead_trail_or_double_up() {
        let list = entries(false, AWAKE);
        assert_eq!(ids(&list).last(), Some(&MASCOT_MENU_QUIT_ID));
        assert_ne!(list.first(), Some(&Entry::Separator));
        assert_ne!(list.last(), Some(&Entry::Separator));
        assert!(list.windows(2).all(|pair| !(pair[0] == Entry::Separator && pair[1] == Entry::Separator)));
    }

    #[test]
    fn item_ids_are_unique() {
        let found = ids(&entries(true, AWAKE));
        let mut sorted = found.clone();
        sorted.sort_unstable();
        sorted.dedup();
        assert_eq!(sorted.len(), found.len());
    }
}
