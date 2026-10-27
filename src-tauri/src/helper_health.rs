//! Is the helper (sidecar) healthy, and what should the shell do about it? Pure rules, so every case is tested.

use serde::Serialize;

/// Give up after this many restarts in a row and say why instead of looping.
pub(crate) const MAX_RESTARTS: u32 = 3;
const RESTART_DELAYS_MS: [u64; 3] = [1_000, 3_000, 8_000];

/// What the panel shows: `state` is running, starting, restarting or stopped; `reason` says why when it is not running.
#[derive(Serialize, Clone, Debug, PartialEq)]
pub(crate) struct Status {
    pub state: &'static str,
    pub reason: Option<String>,
}

impl Default for Status {
    fn default() -> Self {
        Status { state: "starting", reason: None }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Seen {
    /// Its port answers.
    Reachable,
    /// It doesn't answer. `child` says what we know of the process we started: Some(true) alive, Some(false) exited, None not ours (development).
    Unreachable { child: Option<bool>, since_start_ms: u64 },
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum Next {
    Nothing,
    Restart,
    /// It is alive but never answered: end it first, then restart.
    KillThenRestart,
    GiveUp,
}

#[derive(Debug, PartialEq, Eq)]
pub(crate) struct Decision {
    pub state: &'static str,
    pub next: Next,
}

/// What a tick saw. An answering port counts only while our helper is alive (or not ours): after it exited, the
/// connection file is stale and whatever answers on that port is another process. SIGKILL leaves the file behind.
pub(crate) fn observe(port_answers: bool, child: Option<bool>, since_start_ms: u64) -> Seen {
    if port_answers && child != Some(false) { Seen::Reachable } else { Seen::Unreachable { child, since_start_ms } }
}

pub(crate) fn decide(seen: Seen, restarts_so_far: u32, startup_grace_ms: u64) -> Decision {
    let retry = |next| if restarts_so_far >= MAX_RESTARTS { Decision { state: "stopped", next: Next::GiveUp } } else { Decision { state: "restarting", next } };
    match seen {
        Seen::Reachable => Decision { state: "running", next: Next::Nothing },
        Seen::Unreachable { child: None, .. } => Decision { state: "stopped", next: Next::Nothing },
        Seen::Unreachable { child: Some(true), since_start_ms } if since_start_ms < startup_grace_ms => Decision { state: "starting", next: Next::Nothing },
        Seen::Unreachable { child: Some(true), .. } => retry(Next::KillThenRestart),
        Seen::Unreachable { child: Some(false), .. } => retry(Next::Restart),
    }
}

/// Wait longer after each failed try: quick for a one-off crash, patient for a real problem.
pub(crate) fn restart_delay_ms(restarts_so_far: u32) -> u64 {
    RESTART_DELAYS_MS[(restarts_so_far as usize).min(RESTART_DELAYS_MS.len() - 1)]
}

/// The last useful line of the helper's log, for "crashed: ...". Node's own warnings are skipped and anything that looks like a secret is hidden.
pub(crate) fn last_log_line(log: &str) -> Option<String> {
    log.lines()
        .rev()
        .map(str::trim)
        .find(|line| !line.is_empty() && !line.starts_with("(node:") && !line.starts_with("(Use `node"))
        .map(redact)
}

/// What to tell the person when the helper has stopped for good. A last log line that is just its normal start-up message
/// means it was ended from outside (no error was written), which is not an error to quote.
pub(crate) fn describe_stop(last_line: Option<&str>) -> String {
    match last_line {
        Some(line) if !line.starts_with("Heel sidecar listening") => format!("The helper stopped: {line}"),
        _ => "The helper kept stopping without saying why. Try Restart helper.".to_string(),
    }
}

fn redact(line: &str) -> String {
    line.split(' ')
        .map(|word| if word.len() >= 32 && word.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') { "[hidden]" } else { word })
        .collect::<Vec<_>>()
        .join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    const GRACE: u64 = 10_000;
    fn unreachable(child: Option<bool>, since: u64) -> Seen {
        Seen::Unreachable { child, since_start_ms: since }
    }

    #[test]
    fn an_answering_port_is_ours_only_while_our_helper_is_alive_or_not_ours_at_all() {
        assert_eq!(observe(true, Some(true), 0), Seen::Reachable);
        assert_eq!(observe(true, None, 0), Seen::Reachable, "development: not our process");
        assert_eq!(observe(true, Some(false), 5), unreachable(Some(false), 5), "it exited: the port belongs to someone else now");
        assert_eq!(observe(false, Some(true), 5), unreachable(Some(true), 5));
    }

    #[test]
    fn running_when_the_port_answers() {
        assert_eq!(decide(Seen::Reachable, 2, GRACE), Decision { state: "running", next: Next::Nothing });
    }

    #[test]
    fn gives_a_fresh_start_time_before_calling_it_hung() {
        assert_eq!(decide(unreachable(Some(true), 3_000), 0, GRACE), Decision { state: "starting", next: Next::Nothing });
        assert_eq!(decide(unreachable(Some(true), 11_000), 0, GRACE), Decision { state: "restarting", next: Next::KillThenRestart });
    }

    #[test]
    fn restarts_a_helper_that_exited() {
        assert_eq!(decide(unreachable(Some(false), 50_000), 0, GRACE), Decision { state: "restarting", next: Next::Restart });
    }

    #[test]
    fn stops_trying_after_the_limit_and_says_stopped() {
        assert_eq!(decide(unreachable(Some(false), 0), MAX_RESTARTS, GRACE), Decision { state: "stopped", next: Next::GiveUp });
        assert_eq!(decide(unreachable(Some(true), 99_000), MAX_RESTARTS, GRACE), Decision { state: "stopped", next: Next::GiveUp });
    }

    #[test]
    fn never_pretends_to_restart_a_helper_it_does_not_own() {
        assert_eq!(decide(unreachable(None, 0), 0, GRACE), Decision { state: "stopped", next: Next::Nothing });
    }

    #[test]
    fn waits_longer_each_time_and_caps() {
        assert_eq!([0, 1, 2, 9].map(restart_delay_ms), [1_000, 3_000, 8_000, 8_000]);
    }

    #[test]
    fn describes_a_stop_with_the_error_but_never_quotes_the_normal_start_message() {
        assert_eq!(describe_stop(Some("Error: EADDRINUSE")), "The helper stopped: Error: EADDRINUSE");
        assert!(describe_stop(Some("Heel sidecar listening on 127.0.0.1:5 (data: /x)")).contains("without saying why"));
        assert!(describe_stop(None).contains("Restart helper"));
    }

    #[test]
    fn log_line_skips_node_warnings_and_hides_secrets() {
        let log = "Heel sidecar listening on 127.0.0.1:5\nError: boom token=abc\n(node:1) ExperimentalWarning: SQLite\n(Use `node --trace-warnings ...`)\n";
        assert_eq!(last_log_line(log).as_deref(), Some("Error: boom token=abc"));
        let secret = format!("failed with {}", "a1b2c3d4".repeat(8));
        assert_eq!(last_log_line(&secret).as_deref(), Some("failed with [hidden]"));
        assert_eq!(last_log_line("\n  \n"), None);
    }
}
