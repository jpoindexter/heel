//! A notice in macOS Notification Center too: for when the person is in another app, in another Space, or Greg is
//! away from the corner. Text only; Undo and choices stay in Greg's bubble. Through UserNotifications, the API macOS
//! itself wants, and only from the packaged Heel.app (a dev binary has no bundle to notify as).
//! macOS shows no banner for the app that is frontmost, so this speaks only while Heel is behind something else.

use std::sync::mpsc;
use std::time::Duration;

use std::sync::OnceLock;

use block2::{DynBlock, RcBlock};
use objc2::rc::Retained;
use objc2::runtime::{Bool, NSObject, NSObjectProtocol, ProtocolObject};
use objc2::{define_class, AnyThread};
use objc2_foundation::{NSBundle, NSError, NSString};
use objc2_user_notifications::{
    UNAuthorizationOptions, UNMutableNotificationContent, UNNotification, UNNotificationPresentationOptions, UNNotificationRequest, UNUserNotificationCenter, UNUserNotificationCenterDelegate,
};

define_class!(
    /// macOS keeps a notification quiet while its own app is in front. Heel's panel is often "in front" when it closes, so
    /// this delegate says: show the banner anyway.
    #[unsafe(super(NSObject))]
    #[name = "HeelNotificationDelegate"]
    struct BannerDelegate;

    unsafe impl NSObjectProtocol for BannerDelegate {}

    unsafe impl UNUserNotificationCenterDelegate for BannerDelegate {
        #[unsafe(method(userNotificationCenter:willPresentNotification:withCompletionHandler:))]
        fn will_present(&self, _center: &UNUserNotificationCenter, _notification: &UNNotification, handler: &DynBlock<dyn Fn(UNNotificationPresentationOptions)>) {
            handler.call((UNNotificationPresentationOptions::Banner | UNNotificationPresentationOptions::List,));
        }
    }
);

/// The delegate lives for the whole run (the center holds it weakly).
struct Keep(Retained<BannerDelegate>);
// SAFETY: the delegate has no state and is only ever called by macOS on its own queues.
unsafe impl Send for Keep {}
unsafe impl Sync for Keep {}
static DELEGATE: OnceLock<Keep> = OnceLock::new();

fn install_delegate(center: &UNUserNotificationCenter) {
    let keep = DELEGATE.get_or_init(|| Keep(unsafe { objc2::msg_send![BannerDelegate::alloc(), init] }));
    center.setDelegate(Some(ProtocolObject::from_ref(&*keep.0)));
}

const TITLE_MAX_CHARS: usize = 60;
const BODY_MAX_CHARS: usize = 180;
const REPLY_WAIT: Duration = Duration::from_secs(60);

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

/// A sentence for what came back from macOS, or None when it went through.
pub fn describe(granted: bool, error: Option<String>) -> Option<String> {
    match (granted, error) {
        (_, Some(error)) => Some(format!("macOS refused the notification: {error}")),
        (false, None) => Some("Notifications are off for Heel. Turn them on in System Settings > Notifications > Heel.".to_string()),
        (true, None) => None,
    }
}

/// The running binary is inside a .app (UserNotifications raises an exception outside one, so this is checked first).
fn in_app_bundle() -> bool {
    NSBundle::mainBundle().bundlePath().to_string().ends_with(".app") && NSBundle::mainBundle().bundleIdentifier().is_some()
}

fn error_text(error: *mut NSError) -> Option<String> {
    // SAFETY: a non-null NSError pointer handed to a completion handler is valid for the call.
    unsafe { error.as_ref().map(|e| e.localizedDescription().to_string()) }
}

/// Ask once (macOS shows its own prompt the first time), then post. Blocks its own thread, never the main one.
fn post(title: &str, body: &str) -> Result<(), String> {
    if !in_app_bundle() {
        return Err("Notification Center needs the packaged Heel.app (this is a development build).".to_string());
    }
    let center = UNUserNotificationCenter::currentNotificationCenter();
    install_delegate(&center);
    let (tx, rx) = mpsc::channel::<(bool, Option<String>)>();
    let asked = tx.clone();
    let handler = RcBlock::new(move |granted: Bool, error: *mut NSError| {
        let _ = asked.send((granted.as_bool(), error_text(error)));
    });
    center.requestAuthorizationWithOptions_completionHandler(UNAuthorizationOptions::Alert | UNAuthorizationOptions::Sound, &handler);
    let (granted, error) = rx.recv_timeout(REPLY_WAIT).map_err(|_| "macOS did not answer the notification permission request.".to_string())?;
    if let Some(sentence) = describe(granted, error) {
        return Err(sentence);
    }
    let content = UNMutableNotificationContent::new();
    content.setTitle(&NSString::from_str(&clip(title, TITLE_MAX_CHARS)));
    content.setBody(&NSString::from_str(&clip(body, BODY_MAX_CHARS)));
    let id = NSString::from_str(&format!("heel-{}", std::process::id() as u128 * 1_000_003 + crate::dock::now_ms() as u128));
    let request = UNNotificationRequest::requestWithIdentifier_content_trigger(&id, &content, None);
    let (done_tx, done_rx) = mpsc::channel::<Option<String>>();
    let added = RcBlock::new(move |error: *mut NSError| {
        let _ = done_tx.send(error_text(error));
    });
    center.addNotificationRequest_withCompletionHandler(&request, Some(&added));
    match done_rx.recv_timeout(REPLY_WAIT) {
        Ok(None) => Ok(()),
        Ok(Some(error)) => Err(describe(true, Some(error)).unwrap_or_default()),
        Err(_) => Err("macOS did not confirm the notification.".to_string()),
    }
}

/// `HEEL_TEST_NOTICE=1 .../Heel.app/Contents/MacOS/heel`: six seconds after launch, send one notification and print what macOS said.
pub(crate) fn test_on_launch() {
    if std::env::var_os("HEEL_TEST_NOTICE").is_none() {
        return;
    }
    std::thread::spawn(|| {
        std::thread::sleep(Duration::from_secs(6));
        eprintln!("HEEL_TEST_NOTICE: {:?}", post("Heel", "This is a test notice."));
    });
}

/// Ok when macOS took it; the sentence when it did not. Runs off the main thread.
#[tauri::command]
pub(crate) async fn system_notify(title: String, body: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || post(&title, &body)).await.map_err(|error| error.to_string())?
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

    #[test]
    fn what_macos_says_becomes_one_sentence_or_nothing() {
        assert_eq!(describe(true, None), None);
        assert!(describe(false, None).unwrap().contains("System Settings > Notifications"));
        assert!(describe(true, Some("boom".into())).unwrap().contains("boom"));
    }

    #[test]
    fn a_test_binary_is_not_an_app_bundle() {
        assert!(!in_app_bundle());
        assert!(post("t", "b").unwrap_err().contains("packaged Heel.app"));
    }
}
