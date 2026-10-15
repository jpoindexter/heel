//! Click-through for Greg's transparent window.
//!
//! The mascot window is a 192x208 rectangle but the dog only fills part of it. Everything else must belong to
//! the app underneath (a mic button, a send button...). The sprite reports the dog's opaque box for the current
//! frame; a poller turns window click-through on whenever the pointer is outside that box.
//! When the box is unknown, or the person is pressing on Greg, the window never ignores the pointer.

use std::sync::Mutex;
use std::time::Duration;

use tauri::{AppHandle, Manager};

const POLL_MS: u64 = 30;
/// Extra room around the dog so a click that just misses the fur still lands.
const HIT_PADDING_LOGICAL_PX: f64 = 8.0;
const MASCOT_LABEL: &str = "main";

/// The dog's opaque box inside the window, in logical px from the window's top-left.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Region {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Default)]
pub struct HitState {
    region: Option<Region>,
    pressed: bool,
    ignoring: bool,
}

#[derive(Default)]
pub struct HitRegion(pub Mutex<HitState>);

/// Should the window pass the pointer through to whatever is below? Only when everything is known and the
/// pointer is clearly outside the dog. Unknown means "keep the window clickable".
pub fn should_ignore(region: Option<Region>, pressed: bool, pointer: Option<(f64, f64)>) -> bool {
    if pressed {
        return false;
    }
    let (Some(region), Some((px, py))) = (region, pointer) else {
        return false;
    };
    let inside = px >= region.x - HIT_PADDING_LOGICAL_PX
        && px <= region.x + region.width + HIT_PADDING_LOGICAL_PX
        && py >= region.y - HIT_PADDING_LOGICAL_PX
        && py <= region.y + region.height + HIT_PADDING_LOGICAL_PX;
    !inside
}

#[tauri::command]
pub fn set_mascot_hit_region(app: AppHandle, x: f64, y: f64, width: f64, height: f64) {
    if let Ok(mut state) = app.state::<HitRegion>().0.lock() {
        state.region = (width > 0.0 && height > 0.0).then_some(Region { x, y, width, height });
    }
}

#[tauri::command]
pub fn set_mascot_pressed(app: AppHandle, pressed: bool) {
    if let Ok(mut state) = app.state::<HitRegion>().0.lock() {
        state.pressed = pressed;
    }
}

/// Start the poller. It only ever changes the window's ignore flag when the answer changes.
pub fn start_polling(app: &AppHandle) {
    let handle = app.clone();
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(POLL_MS));
        poll_once(&handle);
    });
}

fn poll_once(app: &AppHandle) {
    let Some(mascot) = app.get_webview_window(MASCOT_LABEL) else {
        return;
    };
    let pointer = (|| {
        let cursor = app.cursor_position().ok()?;
        let origin = mascot.outer_position().ok()?;
        let scale = mascot.scale_factor().ok()?;
        Some(((cursor.x - origin.x as f64) / scale, (cursor.y - origin.y as f64) / scale))
    })();
    let shared = app.state::<HitRegion>();
    let Ok(mut state) = shared.0.lock() else {
        return;
    };
    let ignore = should_ignore(state.region, state.pressed, pointer);
    if ignore != state.ignoring && mascot.set_ignore_cursor_events(ignore).is_ok() {
        state.ignoring = ignore;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const DOG: Region = Region { x: 40.0, y: 30.0, width: 100.0, height: 150.0 };

    #[test]
    fn passes_the_pointer_through_when_it_is_clearly_outside_the_dog() {
        assert!(should_ignore(Some(DOG), false, Some((5.0, 5.0))));
        assert!(should_ignore(Some(DOG), false, Some((190.0, 200.0))));
    }

    #[test]
    fn keeps_the_window_clickable_over_the_dog_and_a_little_around_it() {
        assert!(!should_ignore(Some(DOG), false, Some((90.0, 100.0))));
        assert!(!should_ignore(Some(DOG), false, Some((40.0 - HIT_PADDING_LOGICAL_PX, 30.0))));
        assert!(should_ignore(Some(DOG), false, Some((40.0 - HIT_PADDING_LOGICAL_PX - 1.0, 30.0))));
    }

    #[test]
    fn never_ignores_while_the_person_is_pressing_on_greg() {
        assert!(!should_ignore(Some(DOG), true, Some((5.0, 5.0))));
    }

    #[test]
    fn never_ignores_when_the_region_or_pointer_is_unknown() {
        assert!(!should_ignore(None, false, Some((5.0, 5.0))));
        assert!(!should_ignore(Some(DOG), false, None));
    }
}
