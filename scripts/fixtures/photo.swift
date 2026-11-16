import AppKit
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
if args.count != 3 { exit(1) }
if args[1] == "make" {
    let image = NSImage(size: NSSize(width: 640, height: 480))
    image.lockFocus()
    NSColor.white.setFill(); NSRect(x: 0, y: 0, width: 640, height: 480).fill()
    NSColor.blue.setFill(); NSBezierPath(ovalIn: NSRect(x: 50, y: 140, width: 200, height: 200)).fill()
    NSColor.red.setFill(); NSRect(x: 350, y: 140, width: 200, height: 200).fill()
    ("BLUE 7" as NSString).draw(at: NSPoint(x: 180, y: 35), withAttributes: [.font: NSFont.boldSystemFont(ofSize: 60), .foregroundColor: NSColor.black])
    image.unlockFocus()
    let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
    try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[2]))
} else {
    let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: args[2]) as CFURL, nil)!
    let image = CGImageSourceCreateImageAtIndex(source, 0, nil)!
    let width = image.width, height = image.height
    let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue)!
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    let pixels = context.data!.assumingMemoryBound(to: UInt8.self)
    var transparent = 0, opaque = 0, green = 0, red = 0, blue = 0
    for i in 0..<(width * height) {
        let r = pixels[i * 4], g = pixels[i * 4 + 1], b = pixels[i * 4 + 2], a = pixels[i * 4 + 3]
        if a < 16 { transparent += 1 }; if a > 240 { opaque += 1 }
        if a > 240 && r < 80 && g > 80 && b < 80 { green += 1 }
        if a > 240 && r > 160 && g < 100 && b < 100 { red += 1 }
        if a > 240 && r < 100 && g < 100 && b > 160 { blue += 1 }
    }
    let result: [String: Any] = ["width": width, "height": height, "transparent": transparent, "opaque": opaque, "green": green, "red": red, "blue": blue]
    print(String(data: try JSONSerialization.data(withJSONObject: result), encoding: .utf8)!)
}
