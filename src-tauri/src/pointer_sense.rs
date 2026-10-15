//! Where the pointer is, told to Greg's window (N25): his gaze and his "come over" need it. Logical px from his
//! window's top-left, with the usable screen's bottom edge in the same frame. Sent only when it has moved, never
//! more often than the hit-region poll. Nothing else about the pointer is read, and nothing is recorded.

use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

use crate::constants::{MASCOT_LABEL, POINTER_EVENT, POINTER_MIN_MOVE_LOGICAL_PX};
use crate::dock::work_rect;

#[derive(Serialize, Clone, Copy, Debug, PartialEq)]
pub(crate) struct PointerSample {
    x: f64,
    y: f64,
    /// The usable screen's bottom edge, in the same frame (so "near the bottom" needs no screen knowledge in the page).
    bottom: f64,
}

#[derive(Default)]
pub(crate) struct PointerSense(Mutex<Option<(f64, f64)>>);

/// A move worth telling: the first one, or far enough from the last one sent.
pub fn moved_enough(last: Option<(f64, f64)>, next: (f64, f64), min: f64) -> bool {
    match last {
        None => true,
        Some((x, y)) => (next.0 - x).abs() >= min || (next.1 - y).abs() >= min,
    }
}

/// Called by the hit-region poll with the pointer in Greg's window frame (logical px), when it is known.
pub(crate) fn report(app: &AppHandle, mascot: &WebviewWindow, pointer: (f64, f64)) {
    let sense = app.state::<PointerSense>();
    let send = sense.0.lock().map(|last| moved_enough(*last, pointer, POINTER_MIN_MOVE_LOGICAL_PX)).unwrap_or(false);
    if !send {
        return;
    }
    let Some(bottom) = (|| {
        let monitor = mascot.current_monitor().ok()??;
        let origin = mascot.outer_position().ok()?;
        let area = work_rect(&monitor);
        Some((area.y + area.height - origin.y) as f64 / monitor.scale_factor())
    })() else {
        return;
    };
    if let Ok(mut last) = sense.0.lock() {
        *last = Some(pointer);
    }
    let _ = app.emit_to(MASCOT_LABEL, POINTER_EVENT, PointerSample { x: pointer.0, y: pointer.1, bottom });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_first_sample_and_a_real_move_are_sent_and_jitter_is_not() {
        assert!(moved_enough(None, (10.0, 10.0), 3.0));
        assert!(!moved_enough(Some((10.0, 10.0)), (12.0, 11.0), 3.0));
        assert!(moved_enough(Some((10.0, 10.0)), (13.0, 10.0), 3.0));
        assert!(moved_enough(Some((10.0, 10.0)), (10.0, 6.0), 3.0));
    }
}
