//! In the packaged app Heel starts its own helper (the sidecar) with the user's Node, and stops it on quit.
//! In development (`tauri dev`) the dev stack starts the helper instead, so nothing happens here.

use std::fs::OpenOptions;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::{AppHandle, Manager};

use crate::constants::{SIDECAR_BUNDLE_DIRS, SIDECAR_LOG_FILE, SIDECAR_STOP_GRACE_MS};

#[derive(Default)]
pub(crate) struct SidecarProc {
    pub(crate) child: Mutex<Option<Child>>,
    pub(crate) error: Mutex<Option<String>>,
    pub(crate) status: Mutex<crate::helper_health::Status>,
    pub(crate) tracker: Mutex<crate::helper_watch::Tracker>,
}

/// Where the user's Node may live. A desktop app's PATH is short, so look in the usual places first.
pub(crate) fn node_candidates(home: &str, override_path: Option<&str>) -> Vec<PathBuf> {
    let mut found: Vec<PathBuf> = override_path.filter(|p| !p.trim().is_empty()).map(PathBuf::from).into_iter().collect();
    found.push(PathBuf::from(home).join(".local/bin/node"));
    found.push(PathBuf::from("/opt/homebrew/bin/node"));
    found.push(PathBuf::from("/usr/local/bin/node"));
    found
}

/// Last resort: ask a login shell, which has the PATH the user's terminal has (nvm, fnm, volta...).
/// A login shell that waits on the network (a slow nvm.sh, brew shellenv on a cold disk) must not hold Heel's launch: setup runs this on the main thread.
const LOGIN_SHELL_DEADLINE: Duration = Duration::from_secs(5);

fn node_from_login_shell() -> Option<PathBuf> {
    // No stdin: a profile that waits for input fails at once instead of holding Heel's launch (setup runs this).
    let child = Command::new("/bin/zsh").args(["-lc", "command -v node"]).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::null()).spawn().ok()?;
    let output = wait_with_deadline(child, LOGIN_SHELL_DEADLINE)?;
    node_path_from_shell(&String::from_utf8_lossy(&output.stdout))
}

/// The child's output if it exits within `deadline`; otherwise it is killed and this is `None`.
pub(crate) fn wait_with_deadline(mut child: Child, deadline: Duration) -> Option<std::process::Output> {
    let started = Instant::now();
    while child.try_wait().ok()?.is_none() {
        if started.elapsed() > deadline {
            let _ = child.kill();
            let _ = child.wait();
            return None;
        }
        std::thread::sleep(Duration::from_millis(25));
    }
    child.wait_with_output().ok()
}

/// The path is the last line: nvm, fnm and volta print "Now using node v22…" to stdout before it. Not a path means not found.
pub(crate) fn node_path_from_shell(stdout: &str) -> Option<PathBuf> {
    stdout.lines().map(str::trim).rfind(|line| !line.is_empty()).filter(|line| line.starts_with('/')).map(PathBuf::from)
}

fn find_node() -> Option<PathBuf> {
    let home = std::env::var("HOME").unwrap_or_default();
    let override_path = std::env::var("HEEL_NODE").ok();
    node_candidates(&home, override_path.as_deref())
        .into_iter()
        .find(|path| path.is_file())
        .or_else(node_from_login_shell)
}

fn bundled_sidecar(app: &AppHandle) -> Option<PathBuf> {
    let resources = app.path().resource_dir().ok()?;
    SIDECAR_BUNDLE_DIRS.iter().map(|dir| resources.join(dir)).find(|dir| dir.join("sidecar.mjs").is_file())
}

pub(crate) fn remember_error(app: &AppHandle, message: String) {
    if let Ok(mut error) = app.state::<SidecarProc>().error.lock() {
        *error = Some(message);
    }
}

/// Why the helper isn't running, if starting it failed (shown instead of a bare "restart Heel").
pub(crate) fn last_error(app: &AppHandle) -> Option<String> {
    app.state::<SidecarProc>().error.lock().ok().and_then(|error| error.clone())
}

/// Start the helper. Err says, in a sentence, why it could not be started.
pub(crate) fn spawn(app: &AppHandle) -> Result<Child, String> {
    let dir = bundled_sidecar(app).ok_or("Heel's helper is missing from the app. Reinstall Heel.")?;
    let node = find_node().ok_or("Heel needs Node 22 or newer. Install it (brew install node), then restart Heel.")?;
    // An empty HEEL_DATA_DIR reads as unset to the helper, which would then open the live data under its hardcoded id.
    let data_dir = app.path().app_data_dir().map_err(|error| format!("Heel couldn't find its data folder: {error}."))?;
    let _ = std::fs::create_dir_all(&data_dir);
    let log = OpenOptions::new().create(true).append(true).open(data_dir.join(SIDECAR_LOG_FILE));
    let (out, err) = match log.and_then(|file| file.try_clone().map(|clone| (file, clone))) {
        Ok((a, b)) => (Stdio::from(a), Stdio::from(b)),
        Err(_) => (Stdio::null(), Stdio::null()),
    };
    Command::new(&node)
        .arg(dir.join("sidecar.mjs"))
        // The helper would otherwise fall back to its hardcoded app id: a build under a test identifier must not open the live data.
        .env("HEEL_DATA_DIR", &data_dir)
        .env("HEEL_SKILLS_DIR", dir.join("skills/nd-skills"))
        .stdin(Stdio::null())
        .stdout(out)
        .stderr(err)
        .spawn()
        .map_err(|error| format!("Heel couldn't start its helper with {}: {error}.", node.display()))
}

/// Packaged app: start the helper and keep it running. Development: the dev stack starts it; the watcher only reports on it.
pub(crate) fn start(app: &AppHandle) {
    if !cfg!(debug_assertions) && std::env::var_os("HEEL_NO_SIDECAR").is_none() {
        match spawn(app) {
            Ok(child) => crate::helper_watch::adopt(app, child),
            Err(message) => remember_error(app, message),
        }
    }
    crate::helper_watch::start_watching(app);
}

/// Ask the helper to finish (it removes its connection file on SIGTERM), then make sure it is gone.
pub(crate) fn stop(app: &AppHandle) {
    let Some(mut child) = app.state::<SidecarProc>().child.lock().ok().and_then(|mut slot| slot.take()) else {
        return;
    };
    // The watcher may already have reaped it (try_wait): its pid can belong to another process by now.
    if !matches!(child.try_wait(), Ok(None)) {
        return;
    }
    let _ = Command::new("kill").args(["-TERM", &child.id().to_string()]).status();
    let deadline = Instant::now() + Duration::from_millis(SIDECAR_STOP_GRACE_MS);
    while Instant::now() < deadline {
        if matches!(child.try_wait(), Ok(Some(_))) {
            return;
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    let _ = child.kill();
    let _ = child.wait();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_child_past_its_deadline_is_killed_and_yields_nothing() {
        let child = Command::new("/bin/sh").args(["-c", "sleep 30"]).stdout(Stdio::piped()).spawn().unwrap();
        let started = Instant::now();
        assert!(wait_with_deadline(child, Duration::from_millis(200)).is_none());
        assert!(started.elapsed() < Duration::from_secs(5));
    }

    #[test]
    fn a_child_within_its_deadline_gives_its_output() {
        let child = Command::new("/bin/sh").args(["-c", "echo /usr/local/bin/node"]).stdout(Stdio::piped()).spawn().unwrap();
        let output = wait_with_deadline(child, Duration::from_secs(5)).unwrap();
        assert_eq!(node_path_from_shell(&String::from_utf8_lossy(&output.stdout)), Some(PathBuf::from("/usr/local/bin/node")));
    }

    #[test]
    fn looks_where_the_user_installs_node_with_an_override_first() {
        let list = node_candidates("/Users/jo", Some("/opt/custom/node"));
        assert_eq!(list[0], PathBuf::from("/opt/custom/node"));
        assert!(list.contains(&PathBuf::from("/Users/jo/.local/bin/node")));
        assert!(list.contains(&PathBuf::from("/opt/homebrew/bin/node")));
        assert!(list.contains(&PathBuf::from("/usr/local/bin/node")));
    }

    #[test]
    fn takes_the_path_from_the_last_line_of_a_chatty_login_shell() {
        let nvm = "Now using node v22.1.0 (npm v10.7.0)\n/Users/jo/.nvm/versions/node/v22.1.0/bin/node\n";
        assert_eq!(node_path_from_shell(nvm), Some(PathBuf::from("/Users/jo/.nvm/versions/node/v22.1.0/bin/node")));
        assert_eq!(node_path_from_shell("/opt/homebrew/bin/node\n"), Some(PathBuf::from("/opt/homebrew/bin/node")));
        assert_eq!(node_path_from_shell(""), None);
        assert_eq!(node_path_from_shell("Now using node v22.1.0\n"), None, "chatter but no path: not found");
    }

    #[test]
    fn ignores_an_empty_override() {
        assert_eq!(node_candidates("/Users/jo", Some("  "))[0], PathBuf::from("/Users/jo/.local/bin/node"));
        assert_eq!(node_candidates("/Users/jo", None)[0], PathBuf::from("/Users/jo/.local/bin/node"));
    }
}
