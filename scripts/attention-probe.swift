import AppKit
import CoreGraphics
import Foundation

// Throwaway probe for N24a: the two signals that need no permission dialog.
// 1) the frontmost app (name + bundle id), 2) seconds since the last mouse/keyboard event, 3) switches per minute.
let interval: TimeInterval = 5
let samples = 6
var last: String? = nil
var switches = 0
let start = Date()
for i in 0..<samples {
    let app = NSWorkspace.shared.frontmostApplication
    let name = app?.localizedName ?? "?"
    let bundle = app?.bundleIdentifier ?? "?"
    let idleAny = CGEventSource.secondsSinceLastEventType(.combinedSessionState, eventType: CGEventType(rawValue: ~0)!)
    let idleMouse = CGEventSource.secondsSinceLastEventType(.combinedSessionState, eventType: .mouseMoved)
    let idleKey = CGEventSource.secondsSinceLastEventType(.combinedSessionState, eventType: .keyDown)
    if let l = last, l != bundle { switches += 1 }
    last = bundle
    print(String(format: "t=%2.0fs front=%@ (%@) idleAny=%.1fs mouse=%.1fs key=%.1fs switches=%d", Date().timeIntervalSince(start), name, bundle, idleAny, idleMouse, idleKey, switches))
    fflush(stdout)
    Thread.sleep(forTimeInterval: interval)
}
print("usage: \(ProcessInfo.processInfo.systemUptime)")
