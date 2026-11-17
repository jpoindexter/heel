import AppKit
import CoreGraphics
import ApplicationServices
import Foundation
let mode = CommandLine.arguments[1]
precondition(["corner", "body"].contains(mode), "Expected corner or body")
precondition(CGPreflightPostEventAccess(), "Mouse posting not allowed")
let editor = NSRunningApplication.runningApplications(withBundleIdentifier:"com.apple.TextEdit")
precondition(editor.count == 1, "Expected one TextEdit process")
precondition(editor[0].activate(options:[.activateAllWindows]), "Cannot activate test app")
RunLoop.current.run(until:Date().addingTimeInterval(0.25))
let windows = (CGWindowListCopyWindowInfo([.optionOnScreenOnly,.excludeDesktopElements], kCGNullWindowID) as? [[String:Any]]) ?? []
func named(_ owner: String, _ title: String) -> [String:Any] {
    let matches = windows.filter { ($0[kCGWindowOwnerName as String] as? String)==owner && ($0[kCGWindowName as String] as? String)==title }
    precondition(matches.count == 1, "Expected one known target window")
    return matches[0]
}
func rect(_ window: [String:Any]) -> CGRect {
    CGRect(dictionaryRepresentation: window[kCGWindowBounds as String] as! CFDictionary)!
}
let dog = rect(named("Heel", "Heel"))
let target = rect(named("TextEdit", "Untitled 12.txt"))
let point = CGPoint(x:dog.minX + (mode=="corner" ? 10 : 96), y:dog.minY + (mode=="corner" ? 10 : 178))
precondition(target.contains(point), "Test document does not cover click point")
precondition(NSWorkspace.shared.frontmostApplication?.bundleIdentifier == "com.apple.TextEdit", "Known underlay must be active")
let original = CGEvent(source:nil)!.location
let source = CGEventSource(stateID:.hidSystemState)!
func post(_ type: CGEventType, _ location: CGPoint, _ count: Int64 = 0) {
    let event = CGEvent(mouseEventSource:source, mouseType:type, mouseCursorPosition:location, mouseButton:.left)!
    if count>0 { event.setIntegerValueField(.mouseEventClickState, value:count) }
    event.post(tap:.cghidEventTap)
}
defer { post(.mouseMoved,original) }
post(.mouseMoved,point)
Thread.sleep(forTimeInterval:0.20)
var interactive: AXUIElement?
let hitResult = AXUIElementCopyElementAtPosition(AXUIElementCreateSystemWide(), Float(point.x), Float(point.y), &interactive)
var hitPid: pid_t = 0
if let interactive { AXUIElementGetPid(interactive, &hitPid) }
var hitWindow: CFTypeRef?
var hitTitle: CFTypeRef?
if let interactive, AXUIElementCopyAttributeValue(interactive, kAXWindowAttribute as CFString, &hitWindow) == .success, let hitWindow {
    AXUIElementCopyAttributeValue(hitWindow as! AXUIElement, kAXTitleAttribute as CFString, &hitTitle)
}
let hitWindowTitle = hitTitle as? String ?? ""
let dogPid = (named("Heel", "Heel")[kCGWindowOwnerPID as String] as! NSNumber).int32Value
let textPid = (named("TextEdit", "Untitled 12.txt")[kCGWindowOwnerPID as String] as! NSNumber).int32Value
if hitResult != .success || (hitPid != dogPid && hitPid != textPid) || (hitPid == textPid && hitWindowTitle != "Untitled 12.txt") {
    post(.mouseMoved,original)
    fputs("Refusing unknown interactive target (AX status \(hitResult.rawValue), PID \(hitPid))\n",stderr)
    exit(2)
}
for count in 1...(mode=="corner" ? 2 : 1) {
    post(.leftMouseDown,point,Int64(count))
    Thread.sleep(forTimeInterval:0.04)
    post(.leftMouseUp,point,Int64(count))
    Thread.sleep(forTimeInterval:0.05)
}
Thread.sleep(forTimeInterval:0.25)
print(String(data:try! JSONSerialization.data(withJSONObject:["interactiveWindow":hitWindowTitle,"interactivePid":hitPid,"mode":mode,"globalPoint":[point.x,point.y],"originalCursor":[original.x,original.y],"cursorRestoreScheduled":true]),encoding:.utf8)!)
