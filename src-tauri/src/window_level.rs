//! Which windows float above other apps (B9). Greg always does, and so does his notice bubble. The panel floats while
//! it is docked to him (it is part of him) or when "Always on top" is on; a parked panel is an ordinary window that
//! other apps may cover, and a click on Greg or ⌘⇧H then brings it forward instead of closing it.

use tauri::{AppHandle, Manager};

use crate::constants::PANEL_LABEL;
use crate::dock::Dock;
use crate::shell_settings::Shell;

pub fn panel_floats(docked: bool, always_on_top: bool) -> bool {
    docked || always_on_top
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PanelClick {
    Show,
    Hide,
    Forward,
}

/// What a click on Greg (or the hotkey) does to the panel. A floating panel is never covered, so open means close;
/// an ordinary one that is open but not in front comes forward first and closes on the next click.
pub fn click_action(visible: bool, focused: bool, floats: bool) -> PanelClick {
    match (visible, focused || floats) {
        (false, _) => PanelClick::Show,
        (true, true) => PanelClick::Hide,
        (true, false) => PanelClick::Forward,
    }
}

pub(crate) fn panel_floats_now(app: &AppHandle) -> bool {
    let docked = app.state::<Dock>().0.lock().map(|state| state.docked).unwrap_or(true);
    let on_top = app.state::<Shell>().0.lock().map(|state| state.always_on_top).unwrap_or(false);
    panel_floats(docked, on_top)
}

/// Put the panel at the level its state calls for. Called whenever that state changes: dock, park, show, the switch, launch.
pub(crate) fn apply_panel_level(app: &AppHandle) {
    if let Some(panel) = app.get_webview_window(PANEL_LABEL) {
        let _ = panel.set_always_on_top(panel_floats_now(app));
    }
}

/// Settings › Panel › "Always on top".
#[tauri::command]
pub(crate) fn set_always_on_top(app: AppHandle, on: bool) {
    if let Ok(mut state) = app.state::<Shell>().0.lock() {
        state.always_on_top = on;
    }
    crate::shell_settings::save(&app);
    apply_panel_level(&app);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_panel_floats_while_docked_or_when_asked_to_and_not_when_parked() {
        assert!(panel_floats(true, false), "docked: part of Greg");
        assert!(panel_floats(true, true));
        assert!(panel_floats(false, true), "parked but the switch is on");
        assert!(!panel_floats(false, false), "parked: an ordinary window");
    }

    #[test]
    fn a_click_shows_a_hidden_panel_closes_a_floating_or_front_one_and_brings_a_covered_one_forward() {
        assert_eq!(click_action(false, false, false), PanelClick::Show);
        assert_eq!(click_action(false, true, true), PanelClick::Show);
        assert_eq!(click_action(true, true, false), PanelClick::Hide, "parked, in front");
        assert_eq!(click_action(true, false, true), PanelClick::Hide, "docked, another app has focus: never covered");
        assert_eq!(click_action(true, false, false), PanelClick::Forward, "parked, behind another app");
    }
}
