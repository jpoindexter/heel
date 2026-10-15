//! Greg walking along the bottom of the screen: where to, how fast, and moving his window there smoothly.

use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, WebviewWindow};

use crate::constants::{MASCOT_LABEL, WALK_FINISHED_EVENT, WALK_MAX_MS, WALK_MIN_PX, WALK_SPEED_PX_PER_S, WALK_STEP_MS};
#[cfg(test)]
use crate::constants::{EXIT_SPEED_PX_PER_S, QUIT_MAX_MS};
use crate::dock::work_rect;

/// Which walk is running. Starting or stopping bumps `ticket`; a running walk stops when its number is no longer current.
/// `locked` is set while he runs off or on (hide / show / quit): nothing else may move him then.
#[derive(Default)]
pub(crate) struct Walker {
    pub(crate) ticket: AtomicU64,
    pub(crate) locked: AtomicBool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum Direction {
    Left,
    Right,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub(crate) struct Route {
    pub direction: Direction,
    pub from_x: i32,
    pub to_x: i32,
}

/// Slow in, slow out: a walk starts and ends gently instead of lurching.
pub(crate) fn ease_in_out(t: f64) -> f64 {
    let t = t.clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

pub(crate) fn x_at(route: Route, progress: f64) -> i32 {
    route.from_x + ((route.to_x - route.from_x) as f64 * ease_in_out(progress)).round() as i32
}

/// Where a walk of up to `distance` (physical px) in `wanted` direction ends, staying inside [min_x, max_x].
/// At a wall he turns around. None when there is no room either way worth walking.
pub(crate) fn plan_route(from_x: i32, wanted: Direction, distance: f64, min_x: i32, max_x: i32, min_walk: f64) -> Option<Route> {
    let room = |direction: Direction| match direction {
        Direction::Left => (from_x - min_x) as f64,
        Direction::Right => (max_x - from_x) as f64,
    };
    let other = match wanted {
        Direction::Left => Direction::Right,
        Direction::Right => Direction::Left,
    };
    let direction = if room(wanted) >= min_walk { wanted } else if room(other) >= min_walk { other } else { return None };
    let travel = distance.min(room(direction)).round() as i32;
    let to_x = match direction {
        Direction::Left => from_x - travel,
        Direction::Right => from_x + travel,
    };
    Some(Route { direction, from_x, to_x })
}

pub(crate) fn duration_ms(route: Route, scale: f64, speed_px_per_s: f64, max_ms: u64) -> u64 {
    let logical = (route.to_x - route.from_x).abs() as f64 / scale;
    (((logical / speed_px_per_s) * 1000.0) as u64).clamp(1, max_ms)
}

/// One window move: along `route` at height `y`, taking `total_ms`. A cancellable glide stops when a newer walk or `stop_walk` outranks it.
pub(crate) struct Glide {
    pub route: Route,
    pub y: i32,
    pub total_ms: u64,
    pub cancellable: bool,
}

/// Move `window` along the glide on its own thread, then call `on_done`.
pub(crate) fn glide(app: &AppHandle, window: WebviewWindow, glide: Glide, on_done: impl FnOnce(&AppHandle) + Send + 'static) {
    let walker = app.state::<Walker>();
    let ticket = walker.ticket.fetch_add(1, Ordering::SeqCst) + 1;
    let handle = app.clone();
    std::thread::spawn(move || {
        let steps = (glide.total_ms / WALK_STEP_MS).max(1);
        for step in 1..=steps {
            if glide.cancellable && handle.state::<Walker>().ticket.load(Ordering::SeqCst) != ticket {
                break;
            }
            let _ = window.set_position(PhysicalPosition::new(x_at(glide.route, step as f64 / steps as f64), glide.y));
            std::thread::sleep(Duration::from_millis(WALK_STEP_MS));
        }
        on_done(&handle);
    });
}

#[derive(Serialize)]
pub(crate) struct WalkStarted {
    direction: Direction,
    duration_ms: u64,
}

/// Start a walk. Returns how it will go (so the sprite can face the right way) or None if there is no room.
/// The window glides on its own thread; `heel:walk-finished` is sent when it arrives or is stopped.
#[tauri::command]
pub(crate) fn start_walk(app: AppHandle, direction: Direction, distance: f64) -> Option<WalkStarted> {
    if app.state::<Walker>().locked.load(Ordering::SeqCst) {
        return None;
    }
    let mascot = app.get_webview_window(MASCOT_LABEL)?;
    let pos = mascot.outer_position().ok()?;
    let width = mascot.outer_size().ok()?.width as i32;
    let monitor = mascot.current_monitor().ok()??;
    let scale = monitor.scale_factor();
    let area = work_rect(&monitor);
    let route = plan_route(pos.x, direction, distance * scale, area.x, area.x + area.width - width, WALK_MIN_PX * scale)?;
    let total_ms = duration_ms(route, scale, WALK_SPEED_PX_PER_S, WALK_MAX_MS);
    glide(&app, mascot, Glide { route, y: pos.y, total_ms, cancellable: true }, |app| {
        let _ = app.emit_to(MASCOT_LABEL, WALK_FINISHED_EVENT, ());
    });
    Some(WalkStarted { direction: route.direction, duration_ms: total_ms })
}

/// Stop wherever he is (the person touched him or opened the panel).
#[tauri::command]
pub(crate) fn stop_walk(app: AppHandle) {
    app.state::<Walker>().ticket.fetch_add(1, Ordering::SeqCst);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn walks_the_wanted_way_for_the_wanted_distance_when_there_is_room() {
        let route = plan_route(1000, Direction::Left, 300.0, 0, 2000, 40.0).unwrap();
        assert_eq!(route, Route { direction: Direction::Left, from_x: 1000, to_x: 700 });
    }

    #[test]
    fn stops_at_a_wall_instead_of_leaving_the_screen() {
        let route = plan_route(100, Direction::Left, 500.0, 0, 2000, 40.0).unwrap();
        assert_eq!(route.to_x, 0);
        let right = plan_route(1900, Direction::Right, 500.0, 0, 2000, 40.0).unwrap();
        assert_eq!(right.to_x, 2000);
    }

    #[test]
    fn turns_around_when_the_wanted_way_is_blocked() {
        let route = plan_route(10, Direction::Left, 300.0, 0, 2000, 40.0).unwrap();
        assert_eq!(route.direction, Direction::Right);
        assert_eq!(route.to_x, 310);
    }

    #[test]
    fn does_not_walk_when_there_is_no_room_either_way() {
        assert_eq!(plan_route(10, Direction::Left, 300.0, 0, 20, 40.0), None);
    }

    #[test]
    fn easing_starts_and_ends_slowly_and_never_overshoots() {
        assert_eq!(ease_in_out(0.0), 0.0);
        assert_eq!(ease_in_out(1.0), 1.0);
        assert!(ease_in_out(0.1) < 0.1, "starts slower than linear");
        assert!(ease_in_out(0.9) > 0.9, "ends slower than linear");
        assert!(ease_in_out(-1.0) >= 0.0 && ease_in_out(2.0) <= 1.0);
        let route = Route { direction: Direction::Right, from_x: 0, to_x: 400 };
        let xs: Vec<i32> = (0..=20).map(|i| x_at(route, i as f64 / 20.0)).collect();
        assert!(xs.windows(2).all(|pair| pair[0] <= pair[1]), "monotonic");
        assert_eq!((xs[0], xs[20]), (0, 400));
    }

    #[test]
    fn duration_follows_distance_and_is_capped() {
        let short = Route { direction: Direction::Right, from_x: 0, to_x: 280 };
        assert_eq!(duration_ms(short, 2.0, WALK_SPEED_PX_PER_S, WALK_MAX_MS), 1000);
        let long = Route { direction: Direction::Right, from_x: 0, to_x: 100_000 };
        assert_eq!(duration_ms(long, 2.0, WALK_SPEED_PX_PER_S, WALK_MAX_MS), WALK_MAX_MS);
        assert_eq!(duration_ms(long, 2.0, EXIT_SPEED_PX_PER_S, QUIT_MAX_MS), QUIT_MAX_MS);
    }
}
