//! Greg's notice bubble (N12): a tiny always-on-top window the panel asks for when it is closed.
//! The shell only places and shows it over Greg's head; the page inside decides what to say and when to go.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition};

use crate::constants::{MASCOT_LABEL, NOTICE_EVENT, NOTICE_GAP_LOGICAL_PX, NOTICE_LABEL};
use crate::dock::work_rect;
use crate::placement::{bubble_origin, Rect};

/// What the panel sends. `tone` and `undoable` are the page's business; the shell passes them on untouched.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub(crate) struct NoticePayload {
    pub id: u64,
    pub message: String,
    pub tone: String,
    pub undoable: bool,
}

/// Put the notice window centred over Greg (below him when the menu bar is in the way). None when Greg is away.
fn place(app: &AppHandle) -> Option<()> {
    let mascot = app.get_webview_window(MASCOT_LABEL)?;
    if !mascot.is_visible().unwrap_or(false) {
        return None;
    }
    let notice = app.get_webview_window(NOTICE_LABEL)?;
    let (pos, size, own) = (mascot.outer_position().ok()?, mascot.outer_size().ok()?, notice.outer_size().ok()?);
    let monitor = mascot.current_monitor().ok()??;
    let gap = (NOTICE_GAP_LOGICAL_PX * monitor.scale_factor()) as i32;
    let greg = Rect { x: pos.x, y: pos.y, width: size.width as i32, height: size.height as i32 };
    let (x, y) = bubble_origin(greg, (own.width as i32, own.height as i32), work_rect(&monitor), gap);
    notice.set_position(PhysicalPosition::new(x, y)).ok()
}

#[tauri::command]
pub(crate) fn show_notice(app: AppHandle, payload: NoticePayload) {
    if place(&app).is_none() {
        return;
    }
    if let Some(notice) = app.get_webview_window(NOTICE_LABEL) {
        let _ = notice.show();
    }
    let _ = app.emit_to(NOTICE_LABEL, NOTICE_EVENT, payload);
}

pub(crate) fn hide(app: &AppHandle) {
    if let Some(notice) = app.get_webview_window(NOTICE_LABEL) {
        let _ = notice.hide();
    }
}

#[tauri::command]
pub(crate) fn hide_notice(app: AppHandle) {
    hide(&app);
}
