#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

pub type Point = (i32, i32);

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Follower {
    Panel,
    Mascot,
}

/// Top-left for the panel: right-aligned to the mascot, above it when there is room,
/// otherwise below it, and always fully inside the monitor.
pub fn panel_origin(mascot: Rect, panel_size: (i32, i32), monitor: Rect, gap: i32) -> Point {
    let (panel_w, panel_h) = panel_size;

    let max_x = (monitor.x + monitor.width - panel_w).max(monitor.x);
    let x = (mascot.x + mascot.width - panel_w).clamp(monitor.x, max_x);

    let above = mascot.y - panel_h - gap;
    let y = if above >= monitor.y {
        above
    } else {
        let max_y = (monitor.y + monitor.height - panel_h).max(monitor.y);
        (mascot.y + mascot.height + gap).min(max_y)
    };

    (x, y)
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Side {
    Above,
    Below,
}

/// Which side of Greg the panel docks on: above whenever it can be at least `min_height` tall there,
/// otherwise below, otherwise whichever side has more room (the panel is then at its minimum size).
pub fn choose_side(space_above: f64, space_below: f64, min_height: f64) -> Side {
    if space_above >= min_height {
        Side::Above
    } else if space_below >= min_height || space_below > space_above {
        Side::Below
    } else {
        Side::Above
    }
}

/// Which edge of the panel faces Greg, and how far along that edge (from the panel's left) his centre is.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Anchor {
    pub edge: AnchorEdge,
    pub offset: i32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AnchorEdge {
    Top,
    Bottom,
}

/// The panel sits above Greg (its bottom edge faces him) or below him (its top edge does).
pub fn anchor_for(mascot: Rect, panel_origin: Point) -> Anchor {
    let edge = if panel_origin.1 < mascot.y { AnchorEdge::Bottom } else { AnchorEdge::Top };
    Anchor { edge, offset: mascot.x + mascot.width / 2 - panel_origin.0 }
}

/// True when a window at `origin` with `size` lies entirely inside `area`.
pub fn fits_inside(origin: Point, size: (i32, i32), area: Rect) -> bool {
    origin.0 >= area.x
        && origin.1 >= area.y
        && origin.0 + size.0 <= area.x + area.width
        && origin.1 + size.1 <= area.y + area.height
}

/// After one window moved, where the other must go so the pair keeps its docked offset
/// (offset = panel position minus mascot position). None when it is already there, which is
/// what stops the two move handlers from chasing each other.
pub fn follow_target(moved_is_mascot: bool, mascot: Point, panel: Point, offset: Point) -> Option<(Follower, Point)> {
    if moved_is_mascot {
        let target = (mascot.0 + offset.0, mascot.1 + offset.1);
        (target != panel).then_some((Follower::Panel, target))
    } else {
        let target = (panel.0 - offset.0, panel.1 - offset.1);
        (target != mascot).then_some((Follower::Mascot, target))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const PANEL: (i32, i32) = (640, 560);
    const GAP: i32 = 16;

    fn monitor() -> Rect {
        Rect { x: 0, y: 0, width: 3024, height: 1964 }
    }

    fn mascot(x: i32, y: i32) -> Rect {
        Rect { x, y, width: 384, height: 416 }
    }

    #[test]
    fn right_aligns_above_a_bottom_right_mascot_without_leaving_the_screen() {
        let m = mascot(3024 - 384 - 48, 1964 - 416 - 144);
        let (x, y) = panel_origin(m, PANEL, monitor(), GAP);
        assert_eq!(x, m.x + m.width - PANEL.0);
        assert_eq!(y, m.y - PANEL.1 - GAP);
        assert!(x + PANEL.0 <= 3024);
    }

    #[test]
    fn clamps_to_the_left_edge_when_the_mascot_is_dragged_there() {
        let (x, _) = panel_origin(mascot(0, 900), PANEL, monitor(), GAP);
        assert_eq!(x, 0);
    }

    #[test]
    fn opens_below_when_there_is_no_room_above() {
        let m = mascot(1000, 100);
        let (_, y) = panel_origin(m, PANEL, monitor(), GAP);
        assert_eq!(y, m.y + m.height + GAP);
    }

    #[test]
    fn stays_on_a_secondary_monitor_with_an_offset_origin() {
        let second = Rect { x: 3024, y: 0, width: 2560, height: 1440 };
        let m = mascot(3024 + 2560 - 384 - 48, 1440 - 416 - 144);
        let (x, y) = panel_origin(m, PANEL, second, GAP);
        assert!(x >= second.x && x + PANEL.0 <= second.x + second.width);
        assert!(y >= second.y && y + PANEL.1 <= second.y + second.height);
    }

    #[test]
    fn docks_above_when_the_minimum_height_fits_there() {
        assert_eq!(choose_side(500.0, 100.0, 420.0), Side::Above);
        assert_eq!(choose_side(420.0, 900.0, 420.0), Side::Above);
    }

    #[test]
    fn flips_below_when_above_is_too_short_and_below_has_room() {
        assert_eq!(choose_side(200.0, 600.0, 420.0), Side::Below);
    }

    #[test]
    fn with_no_room_on_either_side_takes_the_roomier_one() {
        assert_eq!(choose_side(100.0, 300.0, 420.0), Side::Below);
        assert_eq!(choose_side(300.0, 100.0, 420.0), Side::Above);
    }

    #[test]
    fn a_window_fits_only_when_fully_inside_the_area() {
        let area = Rect { x: 0, y: 66, width: 3024, height: 1800 };
        assert!(fits_inside((100, 66), (500, 500), area));
        assert!(!fits_inside((100, 40), (500, 500), area), "under the menu bar");
        assert!(!fits_inside((2800, 100), (500, 500), area), "off the right edge");
        assert!(!fits_inside((100, 1500), (500, 500), area), "off the bottom");
    }

    #[test]
    fn panel_follows_the_mascot_with_the_docked_offset() {
        let offset = (-256, -576);
        let target = follow_target(true, (1000, 1200), (0, 0), offset);
        assert_eq!(target, Some((Follower::Panel, (744, 624))));
    }

    #[test]
    fn mascot_follows_the_panel_when_the_panel_is_dragged() {
        let offset = (-256, -576);
        let target = follow_target(false, (1000, 1200), (900, 700), offset);
        assert_eq!(target, Some((Follower::Mascot, (1156, 1276))));
    }

    #[test]
    fn stops_once_both_windows_agree_so_move_handlers_do_not_chase_each_other() {
        let offset = (-256, -576);
        let (mascot_pos, panel_pos) = ((1000, 1200), (744, 624));
        assert_eq!(follow_target(true, mascot_pos, panel_pos, offset), None);
        assert_eq!(follow_target(false, mascot_pos, panel_pos, offset), None);
    }

    #[test]
    fn tail_faces_greg_from_the_edge_next_to_him_and_points_at_his_centre() {
        let greg = Rect { x: 1000, y: 700, width: 200, height: 200 };
        let above = anchor_for(greg, (820, 80));
        assert_eq!(above, Anchor { edge: AnchorEdge::Bottom, offset: 280 });
        let below = anchor_for(Rect { y: 20, ..greg }, (820, 240));
        assert_eq!(below, Anchor { edge: AnchorEdge::Top, offset: 280 });
    }
}
