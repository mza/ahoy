/*
 * ahoy as a macOS screensaver: the pieces play one after another, full
 * screen, dissolving from one into the next, each somewhere new in the spare
 * room so nothing burns in. The pieces themselves run in JavaScriptCore, from
 * the same code as the terminal app.
 */
import AppKit
import ScreenSaver

@objc(AhoyView)
final class AhoyView: ScreenSaverView {
  static let module = "dev.ahoy.saver"
  // Seconds one piece takes to dissolve into the next.
  static let fade = 0.7
  // The light grey of a piece in one ink.
  static let ink = NSColor(srgbRed: 0.91, green: 0.92, blue: 0.94, alpha: 1)
  // For a tool or test to point at a script outside the bundle.
  @objc static var scriptURL: URL?

  // The newest screensaver in this process. macOS can leave old ones running in the same host; they stop for it.
  private static weak var newest: AhoyView?

  private var engine: Engine?
  private var order: [PieceInfo] = []
  private var index = 0
  private var piece: PieceInfo?
  private var handle: Int32 = -1
  private var cells = Cells()
  private var t = 0.0
  private var shown = 0.0
  private var step = -1
  private var last = 0.0
  private var anchor = CGPoint(x: 0.5, y: 0.5)
  private var fading: (image: NSBitmapImageRep, at: Double)?
  private var attributes: [Int: [NSAttributedString.Key: Any]] = [:]
  private var font: NSFont?
  private var options: Options?

  var settings = Settings.load()

  override init?(frame: NSRect, isPreview: Bool) {
    super.init(frame: frame, isPreview: isPreview)
    animationTimeInterval = 1 / 30
    let script = AhoyView.scriptURL ?? Bundle(for: AhoyView.self).url(forResource: "ahoy", withExtension: "js")
    engine = script.flatMap(Engine.init(script:))
    restart()
    DistributedNotificationCenter.default().addObserver(
      self, selector: #selector(willStop), name: NSNotification.Name("com.apple.screensaver.willstop"), object: nil)
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
  }

  deinit {
    DistributedNotificationCenter.default().removeObserver(self)
  }

  override var isFlipped: Bool { true }
  override var isOpaque: Bool { true }

  // ---- what plays

  /** Starts the playlist again from the settings. */
  func restart() {
    guard let engine else { return }
    let on = engine.pieces.filter { !settings.off.contains($0.slug) }
    order = on.isEmpty ? engine.pieces : on
    if settings.shuffle { order.shuffle() }
    index = 0
    show(order.first)
  }

  private func show(_ next: PieceInfo?) {
    if handle >= 0 { engine?.close(handle) }
    piece = next
    handle = next.map { engine?.open($0.slug) ?? -1 } ?? -1
    t = 0
    shown = 0
    step = -1
    anchor = CGPoint(x: CGFloat.random(in: 0.15...0.85), y: CGFloat.random(in: 0.15...0.85))
    font = nil
    _ = advance(0)
  }

  private func next() {
    guard order.count > 1 else { return }
    if let rep = bitmapImageRepForCachingDisplay(in: bounds) {
      cacheDisplay(in: bounds, to: rep)
      fading = (rep, 0)
    }
    index += 1
    if index >= order.count {
      index = 0
      if settings.shuffle { order.shuffle() }
    }
    show(order[index])
  }

  // Moves the clock on, and takes a new frame when the piece's own frame rate says it has moved.
  private func advance(_ dt: Double) -> Bool {
    guard let piece, let engine, handle >= 0 else { return false }
    t += dt
    let now = piece.fps > 0 ? Int((t * piece.fps).rounded(.down)) : 0
    guard now != step else { return false }
    step = now
    cells = engine.frame(handle, at: piece.fps > 0 ? Double(now) / piece.fps : 0)
    return true
  }

  // ---- the screensaver's life

  override func startAnimation() {
    super.startAnimation()
    if !isPreview {
      AhoyView.newest?.stopAnimation()
      AhoyView.newest = self
    }
    last = CACurrentMediaTime()
  }

  override func animateOneFrame() {
    let now = CACurrentMediaTime()
    let dt = min(now - last, 0.1)
    last = now
    shown += dt
    if shown >= settings.dwell { next() }
    var dirty = advance(dt)
    if var f = fading {
      f.at += dt
      fading = f.at >= AhoyView.fade ? nil : f
      dirty = true
    }
    if dirty { needsDisplay = true }
  }

  @objc private func willStop(_ note: Notification) {
    stopAnimation()
  }

  // ---- drawing

  override func draw(_ rect: NSRect) {
    NSColor.black.setFill()
    bounds.fill()
    if let piece { drawPiece(piece) }
    if let f = fading { dissolve(f.image, k: f.at / AhoyView.fade) }
  }

  // The cell size for this screen: as big as fits, a cell twice as tall as it is wide (or square, for a scene of
  // dots), in whole points. A scene fills the screen; anything else keeps a margin.
  private func cellSize(_ piece: PieceInfo) -> CGSize {
    let tall = CGFloat(max(1, piece.cell))
    let room = piece.cell == 1 ? bounds : bounds.insetBy(dx: bounds.width * 0.04, dy: bounds.height * 0.06)
    let w = min(room.width / CGFloat(piece.cols), room.height / (CGFloat(piece.rows) * tall))
    let cw = w >= 4 ? w.rounded(.down) : w
    return CGSize(width: cw, height: cw * tall)
  }

  private func drawPiece(_ piece: PieceInfo) {
    let cell = cellSize(piece)
    let size = CGSize(width: cell.width * CGFloat(piece.cols), height: cell.height * CGFloat(piece.rows))
    let origin = CGPoint(
      x: (bounds.minX + (bounds.width - size.width) * anchor.x).rounded(),
      y: (bounds.minY + (bounds.height - size.height) * anchor.y).rounded())
    if let ground = piece.ground {
      ground.setFill()
      CGRect(origin: origin, size: size).fill()
    }
    if piece.cell == 1 { return drawDots(piece, cell: cell, origin: origin) }
    let font = self.font ?? menlo(for: cell)
    self.font = font

    for (y, row) in cells.rows.enumerated() where y < piece.rows {
      let top = origin.y + CGFloat(y) * cell.height
      var run = "", runStart = 0, runColour = -1
      func flush() {
        guard !run.isEmpty else { return }
        let text = NSAttributedString(string: run, attributes: textAttributes(runColour, font: font, piece: piece))
        text.draw(at: CGPoint(x: origin.x + CGFloat(runStart) * cell.width, y: top + (cell.height - font.ascender + font.descender) / 2))
        run = ""
      }
      for (x, c) in row.enumerated() where x < piece.cols {
        if c == " " {
          if !run.isEmpty { run.unicodeScalars.append(c) }
          continue
        }
        let ci = cells.color.map { Int($0[min(y * piece.cols + x, $0.count - 1)]) } ?? -1
        if Glyphs.isShape(c) {
          flush()
          // on whole pixels, so neighbouring blocks meet with no seam between them
          let r = backingAlignedRect(
            CGRect(x: origin.x + CGFloat(x) * cell.width, y: top, width: cell.width, height: cell.height), options: .alignAllEdgesNearest)
          Glyphs.shape(c, in: r, colour: colour(ci, piece))
          continue
        }
        if !run.isEmpty && ci != runColour { flush() }
        if run.isEmpty {
          runStart = x
          runColour = ci
        }
        run.unicodeScalars.append(c)
      }
      flush()
    }
  }

  // How much of a square cell each of a scene's dots covers, as the diameter over the cell's width.
  static let dots: [Unicode.Scalar: CGFloat] = ["·": 0.34, ".": 0.34, "•": 0.62, "●": 0.92]

  // A scene of square cells, each a round dot sized by its character, as the site's canvas draws them. The dots of
  // each colour are gathered into one path and filled once.
  private func drawDots(_ piece: PieceInfo, cell: CGSize, origin: CGPoint) {
    guard let ctx = NSGraphicsContext.current?.cgContext else { return }
    var paths: [Int: CGMutablePath] = [:]
    for (y, row) in cells.rows.enumerated() where y < piece.rows {
      for (x, c) in row.enumerated() where x < piece.cols && c != " " {
        let ci = cells.color.map { Int($0[min(y * piece.cols + x, $0.count - 1)]) } ?? -1
        let r = CGRect(x: origin.x + CGFloat(x) * cell.width, y: origin.y + CGFloat(y) * cell.height, width: cell.width, height: cell.height)
        if Glyphs.isShape(c) {
          Glyphs.shape(c, in: r, colour: colour(ci, piece))
          continue
        }
        let d = (AhoyView.dots[c] ?? 0.62) * cell.width
        let path = paths[ci] ?? CGMutablePath()
        path.addEllipse(in: CGRect(x: r.midX - d / 2, y: r.midY - d / 2, width: d, height: d))
        paths[ci] = path
      }
    }
    for (ci, path) in paths {
      ctx.addPath(path)
      ctx.setFillColor(colour(ci, piece).cgColor)
      ctx.fillPath()
    }
  }

  private func colour(_ i: Int, _ piece: PieceInfo) -> NSColor {
    i >= 0 && i < piece.palette.count ? piece.palette[i] : AhoyView.ink
  }

  private func textAttributes(_ i: Int, font: NSFont, piece: PieceInfo) -> [NSAttributedString.Key: Any] {
    if let a = attributes[i], a[.font] as? NSFont == font { return a }
    let a: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: colour(i, piece)]
    attributes[i] = a
    return a
  }

  // Menlo at the size whose characters are a cell wide.
  private func menlo(for cell: CGSize) -> NSFont {
    let probe = NSFont(name: "Menlo", size: 100) ?? NSFont.monospacedSystemFont(ofSize: 100, weight: .regular)
    let advance = ("M" as NSString).size(withAttributes: [.font: probe]).width / 100
    attributes = [:]
    return NSFont(name: probe.fontName, size: cell.width / advance) ?? probe
  }

  // The last piece as it was, showing through where the dissolve has not reached yet: a grain of cells that thins out.
  private func dissolve(_ image: NSBitmapImageRep, k: Double) {
    let g = max(6, (piece.map { cellSize($0).width } ?? 8))
    let cols = Int((bounds.width / g).rounded(.up)), rows = Int((bounds.height / g).rounded(.up))
    var rects: [CGRect] = []
    rects.reserveCapacity(cols * rows / 2)
    for y in 0..<rows {
      for x in 0..<cols where AhoyView.grain(y * cols + x) > k {
        rects.append(CGRect(x: CGFloat(x) * g, y: CGFloat(y) * g, width: g, height: g))
      }
    }
    guard !rects.isEmpty, let ctx = NSGraphicsContext.current?.cgContext else { return }
    ctx.saveGState()
    ctx.clip(to: rects)
    image.draw(in: bounds, from: .zero, operation: .copy, fraction: 1, respectFlipped: true, hints: nil)
    ctx.restoreGState()
  }

  // Where the dissolve reaches each cell first: a hash, so it is grainy rather than a wipe.
  static func grain(_ k: Int) -> Double {
    var h = UInt32(truncatingIfNeeded: k) ^ 0x9e37_79b9
    h = h &* 0x85eb_ca6b
    h ^= h >> 13
    h = h &* 0xc2b2_ae35
    h ^= h >> 16
    return Double(h) / 4_294_967_296
  }

  // ---- options

  override var hasConfigureSheet: Bool { true }

  override var configureSheet: NSWindow? {
    let options = Options(pieces: engine?.pieces ?? [], settings: settings) { [weak self] saved in
      guard let self else { return }
      self.settings = saved
      saved.save()
      self.restart()
      self.needsDisplay = true
    }
    self.options = options
    return options.window
  }

  // ---- for tools: a piece at a time, and a dissolve part way

  @objc var playing: String { piece?.slug ?? "" }

  @objc func snapshotShow(_ slug: String, at time: Double) {
    fading = nil
    show(engine?.pieces.first { $0.slug == slug })
    anchor = CGPoint(x: 0.5, y: 0.5)
    _ = advance(time)
  }

  @objc func snapshotDissolve(to slug: String, at time: Double, progress: Double) {
    if let rep = bitmapImageRepForCachingDisplay(in: bounds) {
      cacheDisplay(in: bounds, to: rep)
      snapshotShow(slug, at: time)
      fading = (rep, progress * AhoyView.fade)
    }
  }
}
