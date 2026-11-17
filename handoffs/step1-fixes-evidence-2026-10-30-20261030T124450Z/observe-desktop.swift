import AppKit
import CoreGraphics
import Foundation
let owners = ["Heel", "heel", "TextEdit", "Finder", "Dock", "System Settings"]
let all = (CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String:Any]]) ?? []
precondition(!all.isEmpty, "No visible window metadata available")
let windows = all.enumerated().filter { owners.contains($0.element[kCGWindowOwnerName as String] as? String ?? "") }.map { index, w -> [String:Any] in
    ["order": index, "owner": w[kCGWindowOwnerName as String] ?? "", "pid": w[kCGWindowOwnerPID as String] ?? 0, "id": w[kCGWindowNumber as String] ?? 0, "title": w[kCGWindowName as String] ?? "", "layer": w[kCGWindowLayer as String] ?? 0, "bounds": w[kCGWindowBounds as String] ?? [:]]
}
let result: [String:Any] = ["windows": windows, "frontmost": NSWorkspace.shared.frontmostApplication?.bundleIdentifier ?? "", "timestamp": ISO8601DateFormatter().string(from: Date())]
try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys]).write(to: URL(fileURLWithPath: CommandLine.arguments[1]))
