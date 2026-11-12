import AppKit
import PDFKit
import Vision

func recognize(_ page: PDFPage) throws -> String {
    let bounds = page.bounds(for: .cropBox)
    let scale = 2400 / max(bounds.width, bounds.height)
    guard scale.isFinite, scale > 0 else { throw NSError(domain: "Invalid PDF page", code: 1) }
    let thumbnail = page.thumbnail(of: NSSize(width: bounds.width * scale, height: bounds.height * scale), for: .cropBox)
    guard let image = thumbnail.cgImage(forProposedRect: nil, context: nil, hints: nil) else { throw NSError(domain: "Unreadable PDF image", code: 1) }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    // shortcut: CPU OCR avoids slow first-use neural engine compilation; revisit for large document batches.
    request.usesCPUOnly = true
    request.usesLanguageCorrection = true
    if #available(macOS 13.0, *) { request.automaticallyDetectsLanguage = true }
    try VNImageRequestHandler(cgImage: image).perform([request])
    return (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
}

do {
    guard CommandLine.arguments.count == 2,
          let doc = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1])), !doc.isLocked,
          doc.pageCount <= 50 else { exit(1) }
    var text = "", readable = false
    for index in 0..<doc.pageCount {
        guard text.count < 20000, let page = doc.page(at: index) else { break }
        let nativeText = (page.string ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let pageText = try nativeText.isEmpty ? recognize(page) : nativeText
        if !pageText.isEmpty { readable = true }
        text += (pageText.isEmpty ? "[No readable text on page \(index + 1). Review the original CV.]" : pageText) + "\n"
    }
    guard readable else { exit(1) }
    print(String(text.prefix(20000)))
} catch { exit(1) }
