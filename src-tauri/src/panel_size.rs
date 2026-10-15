//! Panel size rules: limits, remembering the size, fitting it to the screen, and telling a resize from a move.
//! Pure functions (no window calls) so they are unit tested.

use serde::{Deserialize, Serialize};

/// Logical pixels. These must match minWidth/minHeight/maxWidth/maxHeight in tauri.conf.json.
pub const MIN_SIZE: (f64, f64) = (280.0, 320.0);
pub const MAX_SIZE: (f64, f64) = (640.0, 900.0);
/// v2: the compact panel (N2). A size saved by the old, larger panel must not carry over.
pub const SAVE_FILE: &str = "panel-size-v2.json";
/// Resizing fires an event per pixel; write the file at most this often.
pub const SAVE_INTERVAL_MS: u64 = 400;
/// After Heel resizes the panel itself (fit to screen), ignore the resulting events for this long.
pub const SELF_RESIZE_QUIET_MS: u64 = 600;

#[derive(Serialize, Deserialize)]
struct Saved {
    width: f64,
    height: f64,
}

pub fn clamp_size(size: (f64, f64)) -> (f64, f64) {
    (size.0.clamp(MIN_SIZE.0, MAX_SIZE.0), size.1.clamp(MIN_SIZE.1, MAX_SIZE.1))
}

pub fn serialize(size: (f64, f64)) -> String {
    serde_json::to_string(&Saved { width: size.0, height: size.1 }).unwrap_or_default()
}

/// A saved size from disk, clamped. Garbage (not JSON, NaN, missing fields) means "use the default".
pub fn parse_saved(json: &str) -> Option<(f64, f64)> {
    let saved: Saved = serde_json::from_str(json).ok()?;
    if !saved.width.is_finite() || !saved.height.is_finite() {
        return None;
    }
    Some(clamp_size((saved.width, saved.height)))
}

/// Shrink the panel so it fits above Greg when it otherwise wouldn't; never below the minimum.
pub fn fit_height(desired: f64, space_above: f64) -> f64 {
    if desired <= space_above {
        desired
    } else {
        space_above.max(MIN_SIZE.1)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PanelChange {
    Moved,
    Resized,
}

/// A "moved" event whose size also changed is really a resize from the top or left edge. The panel
/// must then re-learn its offset from Greg instead of dragging Greg along.
pub fn classify_panel_change(old_size: (u32, u32), new_size: (u32, u32)) -> PanelChange {
    if old_size == new_size {
        PanelChange::Moved
    } else {
        PanelChange::Resized
    }
}

pub fn should_save(now_ms: u64, last_saved_ms: u64, ignore_until_ms: u64) -> bool {
    now_ms >= ignore_until_ms && now_ms.saturating_sub(last_saved_ms) >= SAVE_INTERVAL_MS
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamps_to_the_limits() {
        assert_eq!(clamp_size((100.0, 100.0)), MIN_SIZE);
        assert_eq!(clamp_size((5000.0, 5000.0)), MAX_SIZE);
        assert_eq!(clamp_size((400.0, 700.0)), (400.0, 700.0));
    }

    #[test]
    fn round_trips_a_saved_size() {
        assert_eq!(parse_saved(&serialize((420.0, 640.0))), Some((420.0, 640.0)));
    }

    #[test]
    fn clamps_a_saved_size_that_is_out_of_range() {
        assert_eq!(parse_saved(r#"{"width": 99999, "height": 1}"#), Some((MAX_SIZE.0, MIN_SIZE.1)));
    }

    #[test]
    fn falls_back_to_the_default_for_garbage() {
        assert_eq!(parse_saved("not json"), None);
        assert_eq!(parse_saved(r#"{"width": 400}"#), None);
        assert_eq!(parse_saved(r#"{"width": null, "height": 500}"#), None);
        assert_eq!(parse_saved(""), None);
    }

    #[test]
    fn keeps_the_desired_height_when_it_fits() {
        assert_eq!(fit_height(620.0, 700.0), 620.0);
    }

    #[test]
    fn shrinks_to_the_space_above_greg_when_the_screen_is_short() {
        assert_eq!(fit_height(620.0, 540.0), 540.0);
    }

    #[test]
    fn never_shrinks_below_the_minimum_even_with_no_room() {
        assert_eq!(fit_height(620.0, 100.0), MIN_SIZE.1);
        assert_eq!(fit_height(620.0, -50.0), MIN_SIZE.1);
    }

    #[test]
    fn a_move_with_the_same_size_is_a_move_and_a_size_change_is_a_resize() {
        assert_eq!(classify_panel_change((760, 1240), (760, 1240)), PanelChange::Moved);
        assert_eq!(classify_panel_change((760, 1240), (900, 1240)), PanelChange::Resized);
        assert_eq!(classify_panel_change((760, 1240), (760, 1100)), PanelChange::Resized);
    }

    #[test]
    fn throttles_saves_and_skips_them_while_heel_is_resizing_the_panel_itself() {
        assert!(should_save(10_000, 0, 0));
        assert!(!should_save(10_100, 10_000, 0), "too soon after the last save");
        assert!(should_save(10_500, 10_000, 0));
        assert!(!should_save(10_500, 0, 11_000), "inside the self-resize quiet period");
        assert!(should_save(11_000, 0, 11_000));
    }
}
