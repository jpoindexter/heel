import AppKit
import ImageIO
import UniformTypeIdentifiers
import Vision
import CoreImage

struct PhotoOptions: Decodable {
    let operation: String
    var width: Int? = nil, height: Int? = nil, x: Int? = nil, y: Int? = nil, angle: Int? = nil, limit: Int? = nil
}
func photoFailure(_ message: String) -> NSError { NSError(domain: message, code: 1) }
func photoContext(_ width: Int, _ height: Int) throws -> CGContext {
    guard width > 0, height > 0, width <= 4096, height <= 4096,
          let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { throw photoFailure("Invalid photo dimensions") }
    context.interpolationQuality = .high
    return context
}
func resizedPhoto(_ image: CGImage, width: Int, height: Int) throws -> CGImage {
    let context = try photoContext(width, height)
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    guard let result = context.makeImage() else { throw photoFailure("Photo resize failed") }
    return result
}
func photoForeground(_ image: CGImage) throws -> CGImage {
    guard #available(macOS 14.0, *) else { throw photoFailure("Background removal needs macOS 14 or later") }
    let request = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(cgImage: image)
    try handler.perform([request])
    guard let observation = request.results?.first, !observation.allInstances.isEmpty else { throw photoFailure("No foreground subject found") }
    let pixels = try observation.generateMaskedImage(ofInstances: observation.allInstances, from: handler, croppedToInstancesExtent: false)
    let ci = CIImage(cvPixelBuffer: pixels)
    guard let result = CIContext().createCGImage(ci, from: ci.extent) else { throw photoFailure("Background removal failed") }
    return result
}
func transformPhoto(_ image: CGImage, options: PhotoOptions) throws -> CGImage {
    switch options.operation {
    case "resize":
        guard let width = options.width, let height = options.height else { throw photoFailure("Missing dimensions") }
        return try resizedPhoto(image, width: width, height: height)
    case "rotate":
        guard let angle = options.angle, [90, -90, 180].contains(angle) else { throw photoFailure("Invalid rotation") }
        let width = abs(angle) == 90 ? image.height : image.width, height = abs(angle) == 90 ? image.width : image.height
        let context = try photoContext(width, height)
        context.translateBy(x: CGFloat(width) / 2, y: CGFloat(height) / 2)
        context.rotate(by: -CGFloat(angle) * .pi / 180)
        context.draw(image, in: CGRect(x: -CGFloat(image.width) / 2, y: -CGFloat(image.height) / 2, width: CGFloat(image.width), height: CGFloat(image.height)))
        guard let result = context.makeImage() else { throw photoFailure("Rotation failed") }
        return result
    case "crop":
        guard let x = options.x, let y = options.y, let width = options.width, let height = options.height,
              x >= 0, y >= 0, width > 0, height > 0, x + width <= image.width, y + height <= image.height,
              let result = image.cropping(to: CGRect(x: x, y: y, width: width, height: height)) else { throw photoFailure("Crop is outside the photo") }
        return result
    case "remove-background": return try photoForeground(image)
    default: return image
    }
}
func runPhoto(input: String, output: String, optionsPath: String) throws {
    let options = try JSONDecoder().decode(PhotoOptions.self, from: Data(contentsOf: URL(fileURLWithPath: optionsPath)))
    guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: input) as CFURL, nil),
          let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
          let width = properties[kCGImagePropertyPixelWidth] as? Int, let height = properties[kCGImagePropertyPixelHeight] as? Int,
          width > 0, height > 0, Double(width) * Double(height) <= 200_000_000 else { throw photoFailure("Unreadable or oversized photo") }
    let limit = options.operation == "import" ? 2048 : options.limit ?? 4096
    guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceCreateThumbnailWithTransform: true, kCGImageSourceThumbnailMaxPixelSize: limit] as CFDictionary) else { throw photoFailure("Unsupported photo") }
    if options.operation == "ocr" {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesCPUOnly = true
        if #available(macOS 13.0, *) { request.automaticallyDetectsLanguage = true }
        try VNImageRequestHandler(cgImage: image).perform([request])
        let text = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
        let data = try JSONSerialization.data(withJSONObject: ["answer": text.isEmpty ? "No legible text found. Try a clearer photo." : String(text.prefix(20000))])
        print(String(data: data, encoding: .utf8)!)
        return
    }
    let result = try transformPhoto(image, options: options)
    guard let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: output) as CFURL, UTType.png.identifier as CFString, 1, nil) else { throw photoFailure("Cannot save photo") }
    CGImageDestinationAddImage(destination, result, nil)
    guard CGImageDestinationFinalize(destination) else { throw photoFailure("Cannot encode photo") }
    let data = try JSONSerialization.data(withJSONObject: ["width": result.width, "height": result.height, "sourceWidth": width, "sourceHeight": height])
    print(String(data: data, encoding: .utf8)!)
}
