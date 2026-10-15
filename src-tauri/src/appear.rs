//! Greg leaving and arriving. Hiding sends him running off the nearest screen edge, showing brings him back in
//! from that edge, and quitting sends him off first. With reduced motion he just appears and disappears.

use std::sync::atomic::Ordering;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, WebviewWindow};

use crate::constants::{EXIT_MAX_MS, EXIT_SPEED_PX_PER_S, MASCOT_LABEL, PANEL_LABEL, QUIT_MAX_MS, RUN_EVENT};
use crate::dock::work_rect;
use crate::mascot_menu::LifeFlags;
use crate::panel_window::{announce_panel, panel_is_visible, save_panel_size};
use crate::walk::{duration_ms, glide, Direction, Glide, Route, Walker};

/// Where Greg went when he was hidden: which edge he left by, and where he was standing.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) struct Away {
    edge: Direction,
    rest_x: i32,
}

#[derive(Default)]
pub(crate) struct Departure(Mutex<Option<Away>>);

#[derive(Serialize, Clone)]
struct Run {
    direction: Direction,
    duration_ms: u64,
}

/// The way off: toward whichever side of the usable screen he is nearer, until his window is fully past the edge.
pub(crate) fn exit_route(from_x: i32, width: i32, min_x: i32, max_x: i32) -> Route {
    let centre = from_x + width / 2;
    let screen_centre = (min_x + max_x + width) / 2;
    if centre < screen_centre {
        Route { direction: Direction::Left, from_x, to_x: min_x - width }
    } else {
        Route { direction: Direction::Right, from_x, to_x: max_x + width }
    }
}

/// The way back: in from the edge he left by, to where he stood (kept inside the screen as it is now).
pub(crate) fn entry_route(away: Away, width: i32, min_x: i32, max_x: i32) -> Route {
    let (from_x, direction) = match away.edge {
        Direction::Left => (min_x - width, Direction::Right),
        Direction::Right => (max_x + width, Direction::Left),
    };
    Route { direction, from_x, to_x: away.rest_x.clamp(min_x, max_x) }
}

struct Stage {
    mascot: WebviewWindow,
    y: i32,
    width: i32,
    scale: f64,
    min_x: i32,
    max_x: i32,
    x: i32,
}

fn stage(app: &AppHandle) -> Option<Stage> {
    let mascot = app.get_webview_window(MASCOT_LABEL)?;
    let pos = mascot.outer_position().ok()?;
    let width = mascot.outer_size().ok()?.width as i32;
    let monitor = mascot.current_monitor().ok()??;
    let area = work_rect(&monitor);
    Some(Stage { mascot, y: pos.y, width, scale: monitor.scale_factor(), min_x: area.x, max_x: area.x + area.width - width, x: pos.x })
}

fn reduced_motion(app: &AppHandle) -> bool {
    app.state::<LifeFlags>().0.lock().map(|flags| flags.reduced_motion).unwrap_or(false)
}

/// Run along `route` with the run pose showing; nothing else may move him until he arrives.
fn run(app: &AppHandle, stage: &Stage, route: Route, max_ms: u64, on_done: impl FnOnce(&AppHandle) + Send + 'static) {
    let total_ms = duration_ms(route, stage.scale, EXIT_SPEED_PX_PER_S, max_ms);
    app.state::<Walker>().locked.store(true, Ordering::SeqCst);
    let _ = app.emit_to(MASCOT_LABEL, RUN_EVENT, Run { direction: route.direction, duration_ms: total_ms });
    glide(app, stage.mascot.clone(), Glide { route, y: stage.y, total_ms, cancellable: false }, move |app| {
        app.state::<Walker>().locked.store(false, Ordering::SeqCst);
        on_done(app);
    });
}

fn hide_window(app: &AppHandle, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window.hide();
    }
}

/// Greg leaves, and the panel with him. The tray's "Show Greg" brings him back.
pub(crate) fn hide_mascot(app: &AppHandle) {
    if panel_is_visible(app) {
        save_panel_size(app);
    }
    hide_window(app, PANEL_LABEL);
    announce_panel(app, false);
    let leaving = stage(app).filter(|s| !reduced_motion(app) && s.mascot.is_visible().unwrap_or(false));
    let Some(stage) = leaving else {
        hide_window(app, MASCOT_LABEL);
        return;
    };
    let route = exit_route(stage.x, stage.width, stage.min_x, stage.max_x);
    let away = Away { edge: route.direction, rest_x: stage.x.clamp(stage.min_x, stage.max_x) };
    if let Ok(mut slot) = app.state::<Departure>().0.lock() {
        *slot = Some(away);
    }
    let (mascot, y) = (stage.mascot.clone(), stage.y);
    run(app, &stage, route, EXIT_MAX_MS, move |_| {
        // Hide first, then stand him back where he was, so any plain show() puts him on screen.
        let _ = mascot.hide();
        let _ = mascot.set_position(PhysicalPosition::new(away.rest_x, y));
    });
}

/// Show Greg again. If he left by running off, he runs back in.
pub(crate) fn show_mascot(app: &AppHandle) {
    let away = app.state::<Departure>().0.lock().ok().and_then(|mut slot| slot.take());
    let Some(stage) = stage(app) else { return };
    let hidden = !stage.mascot.is_visible().unwrap_or(true);
    match away {
        Some(away) if hidden && !reduced_motion(app) => {
            let route = entry_route(away, stage.width, stage.min_x, stage.max_x);
            let _ = stage.mascot.set_position(PhysicalPosition::new(route.from_x, stage.y));
            let _ = stage.mascot.show();
            run(app, &stage, route, EXIT_MAX_MS, |_| {});
        }
        _ => {
            let _ = stage.mascot.show();
        }
    }
}

#[tauri::command]
pub(crate) fn hide_greg(app: AppHandle) {
    hide_mascot(&app);
}

#[tauri::command]
pub(crate) fn show_greg(app: AppHandle) {
    show_mascot(&app);
}

/// Show him where he stands, no running (the panel opens next to him, so he must already be in place).
pub(crate) fn reveal_mascot(app: &AppHandle) {
    if let Some(mascot) = app.get_webview_window(MASCOT_LABEL) {
        let _ = mascot.show();
    }
}

/// Quit: he runs off first (never for more than half a second), then the app exits.
pub(crate) fn goodbye(app: &AppHandle) {
    hide_window(app, PANEL_LABEL);
    let leaving = stage(app).filter(|s| !reduced_motion(app) && s.mascot.is_visible().unwrap_or(false));
    match leaving {
        Some(stage) => run(app, &stage, exit_route(stage.x, stage.width, stage.min_x, stage.max_x), QUIT_MAX_MS, |app| app.exit(0)),
        None => app.exit(0),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // A 2000px-wide usable area and a 200px window: x can be 0..=1800.
    const WIDTH: i32 = 200;
    const MIN: i32 = 0;
    const MAX: i32 = 1800;

    #[test]
    fn runs_off_the_nearer_edge_until_fully_outside() {
        let left = exit_route(300, WIDTH, MIN, MAX);
        assert_eq!((left.direction, left.to_x), (Direction::Left, -WIDTH));
        let right = exit_route(1500, WIDTH, MIN, MAX);
        assert_eq!((right.direction, right.to_x), (Direction::Right, MAX + WIDTH));
    }

    #[test]
    fn exit_never_moves_the_wrong_way() {
        for x in (MIN..=MAX).step_by(50) {
            let route = exit_route(x, WIDTH, MIN, MAX);
            match route.direction {
                Direction::Left => assert!(route.to_x <= route.from_x),
                Direction::Right => assert!(route.to_x >= route.from_x),
            }
        }
    }

    #[test]
    fn comes_back_in_from_the_edge_he_left_by_to_where_he_stood() {
        let away = Away { edge: Direction::Left, rest_x: 300 };
        assert_eq!(entry_route(away, WIDTH, MIN, MAX), Route { direction: Direction::Right, from_x: -WIDTH, to_x: 300 });
        let away = Away { edge: Direction::Right, rest_x: 1500 };
        assert_eq!(entry_route(away, WIDTH, MIN, MAX), Route { direction: Direction::Left, from_x: MAX + WIDTH, to_x: 1500 });
    }

    #[test]
    fn a_smaller_screen_pulls_him_back_inside() {
        let away = Away { edge: Direction::Right, rest_x: 1500 };
        assert_eq!(entry_route(away, WIDTH, 0, 1000).to_x, 1000);
    }
}
