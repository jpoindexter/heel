//! Where the panel lives on its own (B5): docked to Greg, or parked where the person dragged it.
//! Pure rules (no window calls), unit tested; `undock.rs` applies them.

use serde::{Deserialize, Serialize};

use crate::placement::{fits_inside, Point, Rect};

pub const SAVE_FILE: &str = "panel-place.json";

/// What survives a close and a relaunch: docked, or parked at (x, y) in physical px.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct Place {
    pub docked: bool,
    pub x: i32,
    pub y: i32,
}

pub fn serialize(place: Place) -> String {
    serde_json::to_string(&place).unwrap_or_default()
}

/// A saved place from disk. Garbage means "docked", today's default.
pub fn parse_saved(json: &str) -> Option<Place> {
    serde_json::from_str(json).ok()
}

/// Where a parked panel comes back: its place when that still lies inside one of the screens, else nowhere (it docks).
pub fn restore_origin(place: Point, size: (i32, i32), areas: &[Rect]) -> Option<Point> {
    areas.iter().any(|area| fits_inside(place, size, *area)).then_some(place)
}

/// The person dragged the docked panel: it is neither where Heel last sent it nor where the dock offset puts it.
/// (Heel's own Moved event can arrive after Greg moved on, so "where Heel sent it" is what tells the two apart.)
pub fn person_dragged_panel(own_target: Option<Point>, mascot: Point, panel: Point, offset: Point) -> bool {
    Some(panel) != own_target && panel != (mascot.0 + offset.0, mascot.1 + offset.1)
}

#[cfg(test)]
mod tests {
    use super::*;

    const SCREEN: Rect = Rect { x: 0, y: 50, width: 3000, height: 1900 };
    const SECOND: Rect = Rect { x: 3000, y: 0, width: 2000, height: 1200 };
    const SIZE: (i32, i32) = (600, 840);

    #[test]
    fn round_trips_a_place_and_treats_garbage_as_docked() {
        let parked = Place { docked: false, x: 120, y: 340 };
        assert_eq!(parse_saved(&serialize(parked)), Some(parked));
        assert_eq!(parse_saved("not json"), None);
        assert_eq!(parse_saved(r#"{"docked": false}"#), None);
    }

    #[test]
    fn a_parked_panel_comes_back_only_where_it_still_fits_a_screen() {
        assert_eq!(restore_origin((100, 100), SIZE, &[SCREEN, SECOND]), Some((100, 100)));
        assert_eq!(restore_origin((3100, 200), SIZE, &[SCREEN, SECOND]), Some((3100, 200)), "on the second screen");
        assert_eq!(restore_origin((3100, 200), SIZE, &[SCREEN]), None, "that screen is gone: dock");
        assert_eq!(restore_origin((2800, 100), SIZE, &[SCREEN, SECOND]), None, "straddles two screens: dock");
        assert_eq!(restore_origin((100, 100), SIZE, &[]), None);
    }

    #[test]
    fn only_the_persons_drag_of_a_docked_panel_counts() {
        let mascot = (2000, 1500);
        let offset = (-400, -900);
        assert!(!person_dragged_panel(None, mascot, (1600, 600), offset), "exactly where the dock puts it");
        assert!(person_dragged_panel(None, mascot, (900, 300), offset), "the person moved it");
        assert!(!person_dragged_panel(Some((900, 300)), mascot, (900, 300), offset), "Heel sent it there");
        assert!(!person_dragged_panel(Some((1500, 500)), (2100, 1400), (1500, 500), offset), "Heel's follow landing after Greg moved on");
        assert!(person_dragged_panel(Some((1500, 500)), mascot, (700, 200), offset), "the person moved it after Heel's last move");
    }
}
