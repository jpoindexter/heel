//! A notice in macOS Notification Center too (N3b): for when Greg is away from the screen's corner, hidden, or the
//! person is in another Space. Text only: Undo and choices stay in Greg's bubble. The panel decides when to ask.

use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

const TITLE_MAX_CHARS: usize = 60;
const BODY_MAX_CHARS: usize = 180;

/// Notification Center shows a couple of lines; longer text is cut at a word with an ellipsis.
pub fn clip(text: &str, max: usize) -> String {
    let text = text.trim();
    if text.chars().count() <= max {
        return text.to_string();
    }
    let cut: String = text.chars().take(max).collect();
    let at_word = cut.rfind(' ').filter(|&i| i > max / 2).unwrap_or(cut.len());
    format!("{}…", cut[..at_word].trim_end())
}

/// Ok when macOS took it; the sentence from the plugin when it did not (no permission, no bundle id in a dev build).
#[tauri::command]
pub(crate) fn system_notify(app: AppHandle, title: String, body: String) -> Result<(), String> {
    app.notification().builder().title(clip(&title, TITLE_MAX_CHARS)).body(clip(&body, BODY_MAX_CHARS)).show().map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn short_text_is_left_alone_and_long_text_is_cut_at_a_word() {
        assert_eq!(clip("  Added: milk  ", 20), "Added: milk");
        assert_eq!(clip("Back on the list: Pay the studio invoice before Friday", 30), "Back on the list: Pay the…");
        assert_eq!(clip("x".repeat(50).as_str(), 10), format!("{}…", "x".repeat(10)));
    }
}
