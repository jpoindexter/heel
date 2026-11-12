//! A process cannot report its own fatal exit; offer a report on the next launch.
use std::{path::PathBuf, sync::atomic::{AtomicBool, Ordering}};
use tauri::Manager;

pub(crate) struct SessionHealth { marker: PathBuf, failed: AtomicBool }
impl SessionHealth {
    fn begin(marker: PathBuf) -> std::io::Result<Self> {
        let failed = marker.exists();
        if let Some(parent) = marker.parent() { std::fs::create_dir_all(parent)?; }
        std::fs::write(&marker, b"running")?;
        Ok(Self { marker, failed: AtomicBool::new(failed) })
    }
    pub(crate) fn start(app: &tauri::AppHandle) {
        if let Ok(dir) = app.path().app_data_dir() {
            match Self::begin(dir.join("session-running")) {
                Ok(health) => { app.manage(health); }
                Err(error) => eprintln!("[heel] could not track session exit: {error}"),
            }
        }
    }
    pub(crate) fn finish(app: &tauri::AppHandle) {
        if let Some(health) = app.try_state::<Self>() { let _ = std::fs::remove_file(&health.marker); }
    }
}
#[tauri::command]
pub(crate) fn previous_session_failed(app: tauri::AppHandle) -> bool {
    app.try_state::<SessionHealth>().is_some_and(|s| s.failed.swap(false, Ordering::SeqCst))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn detects_unclean_exit_and_clears_after_clean_exit() {
        let marker = std::env::temp_dir().join(format!("heel-session-test-{}", std::process::id())).join("running");
        let first = SessionHealth::begin(marker.clone()).unwrap();
        assert!(!first.failed.load(Ordering::SeqCst));
        let crashed = SessionHealth::begin(marker.clone()).unwrap();
        assert!(crashed.failed.swap(false, Ordering::SeqCst));
        assert!(!crashed.failed.swap(false, Ordering::SeqCst));
        std::fs::remove_file(&marker).unwrap();
        assert!(!SessionHealth::begin(marker.clone()).unwrap().failed.load(Ordering::SeqCst));
        std::fs::remove_dir_all(marker.parent().unwrap()).unwrap();
    }
}
