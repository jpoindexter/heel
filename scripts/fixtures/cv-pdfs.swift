// Developer-only generator for small, synthetic CV fixtures. Never shipped or run by Heel.
import AppKit
import PDFKit

let dir = CommandLine.arguments[1]
try FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
let rect = CGRect(x: 0, y: 0, width: 612, height: 792)

func drawText(_ lines: [String]) {
    let attributes: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: 22), .foregroundColor: NSColor.black]
    for (index, line) in lines.enumerated() {
        (line as NSString).draw(at: CGPoint(x: 45, y: 710 - index * 38), withAttributes: attributes)
    }
}

let image = NSImage(size: rect.size)
image.lockFocus()
NSColor.white.setFill()
rect.fill()
drawText(["Iris Synthetic Researcher", "iris@example.test", "Research experience in Spain", "Expérience en recherche", "Synthetic scan for OCR testing only"])
image.unlockFocus()
let bitmap = image.cgImage(forProposedRect: nil, context: nil, hints: nil)!

func writePdf(_ name: String, scanned: Bool, nativeFirst: Bool = false) {
    var mediaBox = rect
    let context = CGContext(URL(fileURLWithPath: dir + "/" + name) as CFURL, mediaBox: &mediaBox, nil)!
    if nativeFirst {
        context.beginPDFPage(nil)
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: false)
        drawText(["Native page before scanned CV", "Iris Synthetic Researcher"])
        NSGraphicsContext.restoreGraphicsState()
        context.endPDFPage()
        if !scanned { context.closePDF(); return }
    }
    context.beginPDFPage(nil)
    if scanned { context.draw(bitmap, in: rect) }
    context.endPDFPage()
    context.closePDF()
}

writePdf("scanned.pdf", scanned: true)
writePdf("text.pdf", scanned: false, nativeFirst: true)
writePdf("mixed.pdf", scanned: true, nativeFirst: true)
writePdf("blank.pdf", scanned: false)
let locked = PDFDocument(url: URL(fileURLWithPath: dir + "/scanned.pdf"))!
locked.write(to: URL(fileURLWithPath: dir + "/locked.pdf"), withOptions: [.ownerPasswordOption: "synthetic-owner", .userPasswordOption: "synthetic-password"])
var mediaBox = rect
let tooMany = CGContext(URL(fileURLWithPath: dir + "/too-many.pdf") as CFURL, mediaBox: &mediaBox, nil)!
for _ in 0..<51 { tooMany.beginPDFPage(nil); tooMany.endPDFPage() }
tooMany.closePDF()
