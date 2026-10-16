/**
 * A tiny WebKit printer, shipped as source and compiled once on the person's Mac (swiftc, from Apple's command line
 * tools) into the app data folder: `html2pdf <in.html> <out.pdf>`. WebKit lays the page out at A4 width and writes a
 * real PDF with selectable text. Nothing leaves the Mac. Bump HTML2PDF_VERSION when this changes: it names the binary.
 */
export const HTML2PDF_VERSION = 1;

export const HTML2PDF_SOURCE = `import WebKit
let args = CommandLine.arguments
guard args.count == 3, let html = try? String(contentsOfFile: args[1], encoding: .utf8) else { print("usage: html2pdf in.html out.pdf"); exit(64) }
let out = URL(fileURLWithPath: args[2])
let web = WKWebView(frame: CGRect(x: 0, y: 0, width: 794, height: 1123))
final class Delegate: NSObject, WKNavigationDelegate {
  func webView(_ w: WKWebView, didFinish n: WKNavigation!) {
    w.createPDF(configuration: WKPDFConfiguration()) { result in
      switch result {
      case .success(let data):
        do { try data.write(to: out); print("ok \\(data.count)"); exit(0) } catch { print("write failed: \\(error)"); exit(1) }
      case .failure(let error): print("render failed: \\(error)"); exit(1)
      }
    }
  }
  func webView(_ w: WKWebView, didFail n: WKNavigation!, withError e: Error) { print("load failed: \\(e)"); exit(1) }
}
let delegate = Delegate()
web.navigationDelegate = delegate
web.loadHTMLString(html, baseURL: nil)
RunLoop.main.run(until: Date(timeIntervalSinceNow: 30))
print("timed out"); exit(2)
`;
