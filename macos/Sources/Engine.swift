/*
 * The pieces, run by JavaScriptCore from the bundled ahoy.js: what there is to
 * play, and each playing piece's frames as rows of characters and the palette
 * index of each cell.
 */
import AppKit
import JavaScriptCore

struct PieceInfo {
  let slug: String
  let name: String
  let cols: Int
  let rows: Int
  let fps: Double
  let palette: [NSColor]
  let ground: NSColor?
  /** Cell height in cell widths: 2, a character's shape, or 1 for a scene's square dots. */
  let cell: Int
}

struct Cells {
  var rows: [[Unicode.Scalar]] = []
  /** One palette index a cell, row by row; nil for a piece in one ink. */
  var color: [UInt8]?
}

final class Engine {
  private let context: JSContext
  private let api: JSValue
  let pieces: [PieceInfo]

  init?(script: URL) {
    guard let source = try? String(contentsOf: script, encoding: .utf8), let context = JSContext() else { return nil }
    context.exceptionHandler = { _, error in NSLog("ahoy: \(error?.toString() ?? "a script error")") }
    context.evaluateScript(source)
    guard let api = context.objectForKeyedSubscript("ahoy"), !api.isUndefined,
      let list = api.invokeMethod("list", withArguments: [])?.toArray() as? [[String: Any]]
    else { return nil }
    self.context = context
    self.api = api
    pieces = list.compactMap { p in
      guard let slug = p["slug"] as? String, let cols = p["cols"] as? NSNumber, let rows = p["rows"] as? NSNumber else { return nil }
      return PieceInfo(
        slug: slug,
        name: p["name"] as? String ?? slug,
        cols: cols.intValue,
        rows: rows.intValue,
        fps: (p["fps"] as? NSNumber)?.doubleValue ?? 0,
        palette: (p["palette"] as? [String] ?? []).map(Engine.colour),
        ground: (p["ground"] as? String).flatMap { $0.isEmpty ? nil : Engine.colour($0) },
        cell: (p["cell"] as? NSNumber)?.intValue ?? 2)
    }
  }

  func open(_ slug: String) -> Int32 {
    api.invokeMethod("open", withArguments: [slug])?.toInt32() ?? -1
  }

  func close(_ handle: Int32) {
    api.invokeMethod("close", withArguments: [handle])
  }

  func frame(_ handle: Int32, at t: Double) -> Cells {
    guard let f = api.invokeMethod("frame", withArguments: [handle, t]) else { return Cells() }
    let text = f.objectForKeyedSubscript("text")?.toString() ?? ""
    let color = f.objectForKeyedSubscript("color")?.toString() ?? ""
    var cells = Cells()
    cells.rows = text.split(separator: "\n", omittingEmptySubsequences: false).map { Array($0.unicodeScalars) }
    if !color.isEmpty { cells.color = color.unicodeScalars.map { UInt8(clamping: $0.value &- 32) } }
    return cells
  }

  static func colour(_ hex: String) -> NSColor {
    let v = UInt32(hex.dropFirst(), radix: 16) ?? 0xffffff
    return NSColor(srgbRed: CGFloat((v >> 16) & 255) / 255, green: CGFloat((v >> 8) & 255) / 255, blue: CGFloat(v & 255) / 255, alpha: 1)
  }
}
