//! The panel's tail: which edge faces Greg and where his centre is, told to the panel so it can draw the tail.

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

use crate::constants::{PANEL_ANCHOR_EVENT, PANEL_LABEL};
use crate::dock::Dock;
use crate::placement::{anchor_for, Anchor, AnchorEdge, Point, Rect};

#[derive(Serialize, Clone, Debug, PartialEq)]
pub(crate) struct AnchorPayload {
    edge: &'static str,
    /// Logical px from the panel's left edge to Greg's centre.
    offset: f64,
}

impl Default for AnchorPayload {
    fn default() -> Self {
        AnchorPayload { edge: "bottom", offset: 0.0 }
    }
}

pub(crate) fn payload(anchor: Anchor, scale: f64) -> AnchorPayload {
    let edge = match anchor.edge {
        AnchorEdge::Top => "top",
        AnchorEdge::Bottom => "bottom",
    };
    AnchorPayload { edge, offset: anchor.offset as f64 / scale }
}

/// Work out the anchor for a panel at `panel_origin` (physical px), remember it, and tell the panel.
/// The origin is passed in, not read back: a window moved a moment ago can still report its old position.
pub(crate) fn announce(app: &AppHandle, mascot: &WebviewWindow, panel_origin: Point, scale: f64) {
    let (Ok(pos), Ok(size)) = (mascot.outer_position(), mascot.outer_size()) else {
        return;
    };
    let rect = Rect { x: pos.x, y: pos.y, width: size.width as i32, height: size.height as i32 };
    let next = payload(anchor_for(rect, panel_origin), scale);
    if let Ok(mut state) = app.state::<Dock>().0.lock() {
        state.anchor = next.clone();
    }
    let _ = app.emit_to(PANEL_LABEL, PANEL_ANCHOR_EVENT, next);
}

/// The panel asks when its page loads (its first show can come before it is listening).
#[tauri::command]
pub(crate) fn panel_anchor(app: AppHandle) -> AnchorPayload {
    app.state::<Dock>().0.lock().map(|state| state.anchor.clone()).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_to_logical_px_and_names_the_edge() {
        let up = payload(Anchor { edge: AnchorEdge::Bottom, offset: 560 }, 2.0);
        assert_eq!(up, AnchorPayload { edge: "bottom", offset: 280.0 });
        assert_eq!(payload(Anchor { edge: AnchorEdge::Top, offset: 100 }, 1.0).edge, "top");
    }
}
