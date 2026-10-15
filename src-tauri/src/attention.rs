//! Attention sense (N24): while the person has it switched on, every few seconds the shell notes which app is in
//! front and how long since they last touched the mouse or keyboard, and tells the panel. Nothing else is read:
//! no window titles, no URLs, no keys. Off by default; the panel turns it on from the helper's setting.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use objc2_app_kit::NSWorkspace;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::constants::{ATTENTION_EVENT, ATTENTION_INTERVAL_MS, PANEL_LABEL};

#[derive(Default)]
pub(crate) struct Attention {
    enabled: Arc<AtomicBool>,
}

#[derive(Serialize, Clone, Debug)]
struct Sample {
    bundle: String,
    name: String,
    idle_sec: f64,
}

const K_CG_EVENT_SOURCE_STATE_COMBINED_SESSION: u32 = 0;
const K_CG_ANY_INPUT_EVENT_TYPE: u32 = u32::MAX;

#[link(name = "CoreGraphics", kind = "framework")]
unsafe extern "C" {
    fn CGEventSourceSecondsSinceLastEventType(state_id: u32, event_type: u32) -> f64;
}

/// Seconds since any mouse or keyboard event, system wide. Reads a counter; captures nothing.
fn idle_seconds() -> f64 {
    unsafe { CGEventSourceSecondsSinceLastEventType(K_CG_EVENT_SOURCE_STATE_COMBINED_SESSION, K_CG_ANY_INPUT_EVENT_TYPE) }
}

/// The app in front: its name and bundle id, nothing about its windows.
fn front_app() -> Option<(String, String)> {
    let workspace = NSWorkspace::sharedWorkspace();
    let app = workspace.frontmostApplication()?;
    let name = app.localizedName().map(|s| s.to_string()).unwrap_or_default();
    // An app without a bundle id (a bare binary, Heel's own dev build) is known by its name instead.
    let bundle = app.bundleIdentifier().map(|s| s.to_string()).filter(|b| !b.is_empty()).unwrap_or_else(|| name.clone());
    if bundle.is_empty() {
        return None;
    }
    Some((bundle, name))
}

fn sample(app: &AppHandle) {
    let Some((bundle, name)) = front_app() else {
        return;
    };
    let _ = app.emit_to(PANEL_LABEL, ATTENTION_EVENT, Sample { bundle, name, idle_sec: idle_seconds() });
}

/// The panel says whether the person switched it on. Nothing is read while it is off.
#[tauri::command]
pub(crate) fn set_attention_enabled(app: AppHandle, enabled: bool) {
    app.state::<Attention>().enabled.store(enabled, Ordering::Relaxed);
}

/// A timer thread that, while enabled, takes one sample per interval. Reading the front app and the idle counter is
/// safe off the main thread (both are plain reads); going through the main thread made samples arrive late and rarely.
pub(crate) fn start(app: &AppHandle) {
    let handle = app.clone();
    let enabled = app.state::<Attention>().enabled.clone();
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(ATTENTION_INTERVAL_MS));
        if enabled.load(Ordering::Relaxed) {
            sample(&handle);
        }
    });
}
