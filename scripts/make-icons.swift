import AppKit

// A native, scalable envelope mark for the installed app.
for (name, size) in [("icon-512",512),("icon-192",192),("icon-maskable",512),("badge",96)] {
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
    let scale = CGFloat(size) / 512
    let transform = NSAffineTransform(); transform.scale(by: scale); transform.concat()
    NSColor(calibratedRed: 0.973, green: 0.933, blue: 0.943, alpha: 1).setFill()
    NSBezierPath(rect: NSRect(x: 0, y: 0, width: 512, height: 512)).fill()
    let rose = NSColor(calibratedRed: 0.64, green: 0.294, blue: 0.384, alpha: 1)
    rose.setStroke()
    let envelope = NSBezierPath(roundedRect: NSRect(x: 103, y: 146, width: 306, height: 220), xRadius: 12, yRadius: 12)
    NSColor(calibratedRed: 1, green: 0.981, blue: 0.981, alpha: 1).setFill(); envelope.fill()
    envelope.lineWidth = 9; envelope.stroke()
    let fold = NSBezierPath(); fold.move(to: NSPoint(x: 111, y: 351)); fold.line(to: NSPoint(x: 256, y: 241)); fold.line(to: NSPoint(x: 401, y: 351)); fold.lineWidth = 9; fold.lineJoinStyle = .round; fold.stroke()
    let heart = NSBezierPath(); heart.move(to: NSPoint(x: 256, y: 207))
    heart.curve(to: NSPoint(x: 256, y: 265), controlPoint1: NSPoint(x: 175, y: 253), controlPoint2: NSPoint(x: 223, y: 300))
    heart.curve(to: NSPoint(x: 256, y: 207), controlPoint1: NSPoint(x: 289, y: 300), controlPoint2: NSPoint(x: 337, y: 253))
    rose.setFill(); heart.fill()
    NSGraphicsContext.restoreGraphicsState()
    try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "public/icons/\(name).png"))
}
