//! Keeps the helper running: checks it every few seconds, restarts it with a growing delay, and tells the panel its state.

use std::net::{SocketAddr, TcpStream};
use std::process::Child;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Emitter, Manager};

use crate::constants::{HEALTHY_RESET_MS, HEALTH_INTERVAL_MS, HELPER_STATUS_EVENT, PANEL_LABEL, SIDECAR_FILE, SIDECAR_LOG_FILE, STARTUP_GRACE_MS};
use crate::helper_health::{decide, describe_stop, last_log_line, restart_delay_ms, Next, Seen, Status, MAX_RESTARTS};
use crate::sidecar_process::{last_error, remember_error, spawn, SidecarProc};

const CONNECT_TIMEOUT_MS: u64 = 400;

#[derive(Default)]
pub(crate) struct Tracker {
    restarts: u32,
    started_at: Option<Instant>,
    running_since: Option<Instant>,
}

/// Remember a freshly started helper.
pub(crate) fn adopt(app: &AppHandle, child: Child) {
    let proc = app.state::<SidecarProc>();
    if let Ok(mut slot) = proc.child.lock() {
        *slot = Some(child);
    }
    if let Ok(mut tracker) = proc.tracker.lock() {
        tracker.started_at = Some(Instant::now());
        tracker.running_since = None;
    }
}

fn data_dir(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_data_dir().ok()
}

/// Does the helper's port answer? (Its port is in the connection file it writes when it starts.)
fn reachable(app: &AppHandle) -> bool {
    let Some(dir) = data_dir(app) else { return false };
    let port = std::fs::read_to_string(dir.join(SIDECAR_FILE))
        .ok()
        .and_then(|json| serde_json::from_str::<serde_json::Value>(&json).ok())
        .and_then(|value| value["port"].as_u64())
        .and_then(|port| u16::try_from(port).ok());
    port.is_some_and(|port| TcpStream::connect_timeout(&SocketAddr::from(([127, 0, 0, 1], port)), Duration::from_millis(CONNECT_TIMEOUT_MS)).is_ok())
}

/// What we know of the process we started: Some(true) alive, Some(false) exited, None when there is none (development, or it never started).
fn child_alive(app: &AppHandle) -> Option<bool> {
    let proc = app.state::<SidecarProc>();
    let mut slot = proc.child.lock().ok()?;
    let child = slot.as_mut()?;
    Some(matches!(child.try_wait(), Ok(None)))
}

fn set_status(app: &AppHandle, next: Status) {
    let proc = app.state::<SidecarProc>();
    let changed = proc.status.lock().map(|mut current| std::mem::replace(&mut *current, next.clone()) != next).unwrap_or(false);
    if changed {
        let _ = app.emit_to(PANEL_LABEL, HELPER_STATUS_EVENT, next);
    }
}

/// Why it is not running, in words: the start error if there was one, else the last line it logged.
fn reason(app: &AppHandle, fallback: &str) -> String {
    if let Some(error) = last_error(app) {
        return error;
    }
    let log = data_dir(app).and_then(|dir| std::fs::read_to_string(dir.join(SIDECAR_LOG_FILE)).ok()).unwrap_or_default();
    match last_log_line(&log) {
        Some(line) => describe_stop(Some(&line)),
        None => fallback.to_string(),
    }
}

fn end_child(app: &AppHandle) {
    if let Some(mut child) = app.state::<SidecarProc>().child.lock().ok().and_then(|mut slot| slot.take()) {
        let _ = child.kill();
        let _ = child.wait();
    }
}

fn restart(app: &AppHandle, restarts_so_far: u32) {
    set_status(app, Status { state: "restarting", reason: None });
    std::thread::sleep(Duration::from_millis(restart_delay_ms(restarts_so_far)));
    match spawn(app) {
        Ok(child) => adopt(app, child),
        Err(message) => {
            remember_error(app, message);
            if let Ok(mut tracker) = app.state::<SidecarProc>().tracker.lock() {
                tracker.restarts = MAX_RESTARTS;
            }
        }
    }
}

fn tick(app: &AppHandle) {
    let proc = app.state::<SidecarProc>();
    let (restarts, started_at) = proc.tracker.lock().map(|t| (t.restarts, t.started_at)).unwrap_or_default();
    let seen = if reachable(app) {
        Seen::Reachable
    } else {
        Seen::Unreachable { child: child_alive(app), since_start_ms: started_at.map(|t| t.elapsed().as_millis() as u64).unwrap_or(u64::MAX) }
    };
    let decision = decide(seen, restarts, STARTUP_GRACE_MS);
    match decision.next {
        Next::Nothing if decision.state == "running" => {
            set_status(app, Status { state: "running", reason: None });
            if let Ok(mut tracker) = proc.tracker.lock() {
                let since = *tracker.running_since.get_or_insert_with(Instant::now);
                if since.elapsed() >= Duration::from_millis(HEALTHY_RESET_MS) {
                    tracker.restarts = 0;
                }
            }
        }
        Next::Nothing if decision.state == "starting" => set_status(app, Status { state: "starting", reason: None }),
        Next::Nothing => set_status(app, Status { state: "stopped", reason: Some(reason(app, "The helper isn't running.")) }),
        Next::GiveUp => set_status(app, Status { state: "stopped", reason: Some(reason(app, "The helper kept stopping.")) }),
        Next::Restart | Next::KillThenRestart => {
            if decision.next == Next::KillThenRestart {
                end_child(app);
            }
            if let Ok(mut tracker) = proc.tracker.lock() {
                tracker.restarts += 1;
                tracker.running_since = None;
            }
            restart(app, restarts);
        }
    }
}

/// One background thread, for the life of the app.
pub(crate) fn start_watching(app: &AppHandle) {
    let handle = app.clone();
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(HEALTH_INTERVAL_MS));
        tick(&handle);
    });
}

#[tauri::command]
pub(crate) fn helper_status(app: AppHandle) -> Status {
    app.state::<SidecarProc>().status.lock().map(|status| status.clone()).unwrap_or_default()
}

/// Forget past crashes and start the helper fresh. Only the packaged app owns the helper.
fn restart_now(app: &AppHandle) -> Result<(), String> {
    if cfg!(debug_assertions) {
        return Err("In development the helper is started by npm run dev:all.".into());
    }
    end_child(app);
    if let Ok(mut tracker) = app.state::<SidecarProc>().tracker.lock() {
        *tracker = Tracker::default();
    }
    let handle = app.clone();
    std::thread::spawn(move || {
        set_status(&handle, Status { state: "restarting", reason: None });
        match spawn(&handle) {
            Ok(child) => adopt(&handle, child),
            Err(message) => remember_error(&handle, message),
        }
    });
    Ok(())
}

#[tauri::command]
pub(crate) fn restart_helper(app: AppHandle) -> Result<(), String> {
    restart_now(&app)
}

/// Opening Heel again (Dock icon, `open`) while its helper has given up is a request to try again.
pub(crate) fn revive_if_stopped(app: &AppHandle) {
    let stopped = app.state::<SidecarProc>().status.lock().map(|status| status.state == "stopped").unwrap_or(false);
    if stopped {
        let _ = restart_now(app);
    }
}
