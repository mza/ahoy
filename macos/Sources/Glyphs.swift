/*
 * Drawing a piece's cells. Block elements and box-drawing lines are drawn as
 * shapes, so they meet their neighbours with no gaps at any size, as they do
 * in a terminal; every other character is set in Menlo, a run at a time.
 */
import AppKit

enum Glyphs {
  // A line's weight on each side of the cell, left right up down: 1 light, 2 heavy, 3 double.
  private static let lines: [Unicode.Scalar: (UInt8, UInt8, UInt8, UInt8)] = {
    var m: [Unicode.Scalar: (UInt8, UInt8, UInt8, UInt8)] = [:]
    let table: [(String, (UInt8, UInt8, UInt8, UInt8))] = [
      ("─", (1, 1, 0, 0)), ("│", (0, 0, 1, 1)), ("┌", (0, 1, 0, 1)), ("┐", (1, 0, 0, 1)), ("└", (0, 1, 1, 0)), ("┘", (1, 0, 1, 0)),
      ("├", (0, 1, 1, 1)), ("┤", (1, 0, 1, 1)), ("┬", (1, 1, 0, 1)), ("┴", (1, 1, 1, 0)), ("┼", (1, 1, 1, 1)),
      ("╴", (1, 0, 0, 0)), ("╵", (0, 0, 1, 0)), ("╶", (0, 1, 0, 0)), ("╷", (0, 0, 0, 1)),
      ("━", (2, 2, 0, 0)), ("┃", (0, 0, 2, 2)), ("┏", (0, 2, 0, 2)), ("┓", (2, 0, 0, 2)), ("┗", (0, 2, 2, 0)), ("┛", (2, 0, 2, 0)),
      ("┣", (0, 2, 2, 2)), ("┫", (2, 0, 2, 2)), ("┳", (2, 2, 0, 2)), ("┻", (2, 2, 2, 0)), ("╋", (2, 2, 2, 2)),
      ("═", (3, 3, 0, 0)), ("║", (0, 0, 3, 3)), ("╔", (0, 3, 0, 3)), ("╗", (3, 0, 0, 3)), ("╚", (0, 3, 3, 0)), ("╝", (3, 0, 3, 0)),
      ("╠", (0, 3, 3, 3)), ("╣", (3, 0, 3, 3)), ("╦", (3, 3, 0, 3)), ("╩", (3, 3, 3, 0)), ("╬", (3, 3, 3, 3)),
      ("╒", (0, 3, 0, 1)), ("╓", (0, 1, 0, 3)), ("╕", (3, 0, 0, 1)), ("╖", (1, 0, 0, 3)), ("╘", (0, 3, 1, 0)), ("╙", (0, 1, 3, 0)),
      ("╛", (3, 0, 1, 0)), ("╜", (1, 0, 3, 0)), ("╞", (0, 3, 1, 1)), ("╟", (0, 1, 3, 3)), ("╡", (3, 0, 1, 1)), ("╢", (1, 0, 3, 3)),
      ("╤", (3, 3, 0, 1)), ("╥", (1, 1, 0, 3)), ("╧", (3, 3, 1, 0)), ("╨", (1, 1, 3, 0)), ("╪", (3, 3, 1, 1)), ("╫", (1, 1, 3, 3)),
    ]
    for (s, w) in table { m[s.unicodeScalars.first!] = w }
    return m
  }()

  // Rounded corners: the two sides each joins, as a curve through the middle of the cell.
  private static let corners: [Unicode.Scalar: (Bool, Bool)] = [
    // (joins right rather than left, joins down rather than up)
    "╭": (true, true), "╮": (false, true), "╯": (false, false), "╰": (true, false),
  ]

  // How much of a cell a shade covers.
  private static let shades: [Unicode.Scalar: CGFloat] = ["░": 0.25, "▒": 0.5, "▓": 0.75]

  static func isShape(_ c: Unicode.Scalar) -> Bool {
    (0x2580...0x259F).contains(c.value) || lines[c] != nil || corners[c] != nil || c == "╱" || c == "╲" || c == "╳"
  }

  /** Draws a block element or a box-drawing character into `r`, in a context whose y grows downwards. */
  static func shape(_ c: Unicode.Scalar, in r: CGRect, colour: NSColor) {
    let v = c.value
    if (0x2580...0x259F).contains(v) {
      block(v, in: r, colour: colour)
      return
    }
    colour.setStroke()
    colour.setFill()
    let light = max(1, (r.width * 0.14).rounded())
    let mid = CGPoint(x: r.midX, y: r.midY)
    if let w = lines[c] {
      // Each arm from the middle to its edge, a little past the middle so they join.
      let arms: [(UInt8, CGPoint, Bool)] = [
        (w.0, CGPoint(x: r.minX, y: r.midY), true), (w.1, CGPoint(x: r.maxX, y: r.midY), true),
        (w.2, CGPoint(x: r.midX, y: r.minY), false), (w.3, CGPoint(x: r.midX, y: r.maxY), false),
      ]
      for (weight, end, across) in arms where weight > 0 {
        if weight == 3 {
          let gap = light * 1.2
          for s in [-gap, gap] {
            let o = across ? CGPoint(x: 0, y: s) : CGPoint(x: s, y: 0)
            stroke(from: CGPoint(x: mid.x + o.x, y: mid.y + o.y), to: CGPoint(x: end.x + o.x, y: end.y + o.y), width: light, over: gap + light / 2, across: across)
          }
        } else {
          stroke(from: mid, to: end, width: weight == 2 ? light * 2 : light, over: light / 2, across: across)
        }
      }
    } else if let (right, down) = corners[c] {
      let path = NSBezierPath()
      path.lineWidth = light
      path.move(to: CGPoint(x: right ? r.maxX : r.minX, y: r.midY))
      path.curve(to: CGPoint(x: r.midX, y: down ? r.maxY : r.minY), controlPoint1: mid, controlPoint2: mid)
      path.stroke()
    } else {
      let path = NSBezierPath()
      path.lineWidth = light
      if c == "╱" || c == "╳" {
        path.move(to: CGPoint(x: r.minX, y: r.maxY))
        path.line(to: CGPoint(x: r.maxX, y: r.minY))
      }
      if c == "╲" || c == "╳" {
        path.move(to: CGPoint(x: r.minX, y: r.minY))
        path.line(to: CGPoint(x: r.maxX, y: r.maxY))
      }
      path.stroke()
    }
  }

  // A straight arm, as a filled rectangle so it lands on whole pixels; `over` reaches back past the middle.
  private static func stroke(from a: CGPoint, to b: CGPoint, width: CGFloat, over: CGFloat, across: Bool) {
    let rect: CGRect
    if across {
      let x0 = min(a.x, b.x) - (b.x > a.x ? over : 0), x1 = max(a.x, b.x) + (b.x < a.x ? over : 0)
      rect = CGRect(x: x0, y: (a.y - width / 2).rounded(), width: x1 - x0, height: width)
    } else {
      let y0 = min(a.y, b.y) - (b.y > a.y ? over : 0), y1 = max(a.y, b.y) + (b.y < a.y ? over : 0)
      rect = CGRect(x: (a.x - width / 2).rounded(), y: y0, width: width, height: y1 - y0)
    }
    rect.fill()
  }

  private static func block(_ v: UInt32, in r: CGRect, colour: NSColor) {
    let w = r.width, h = r.height
    func fill(_ x: CGFloat, _ y: CGFloat, _ fw: CGFloat, _ fh: CGFloat, _ k: CGFloat = 1) {
      colour.withAlphaComponent(k).setFill()
      CGRect(x: r.minX + x * w, y: r.minY + y * h, width: fw * w, height: fh * h).fill(using: .sourceOver)
    }
    switch v {
    case 0x2580: fill(0, 0, 1, 0.5)  // ▀
    case 0x2581...0x2588: let k = CGFloat(v - 0x2580) / 8; fill(0, 1 - k, 1, k)  // ▁ to █, from the bottom
    case 0x2589...0x258F: let k = CGFloat(0x2590 - v) / 8; fill(0, 0, k, 1)  // ▉ to ▏, from the left
    case 0x2590: fill(0.5, 0, 0.5, 1)  // ▐
    case 0x2591...0x2593: fill(0, 0, 1, 1, shades[Unicode.Scalar(v)!] ?? 0.5)  // ░ ▒ ▓
    case 0x2594: fill(0, 0, 1, 0.125)  // ▔
    case 0x2595: fill(0.875, 0, 0.125, 1)  // ▕
    default:
      // the quadrants, ▖ to ▟: which of upper left, upper right, lower left, lower right each fills
      let quads: [UInt32: (Bool, Bool, Bool, Bool)] = [
        0x2596: (false, false, true, false), 0x2597: (false, false, false, true), 0x2598: (true, false, false, false),
        0x2599: (true, false, true, true), 0x259A: (true, false, false, true), 0x259B: (true, true, true, false),
        0x259C: (true, true, false, true), 0x259D: (false, true, false, false), 0x259E: (false, true, true, false),
        0x259F: (false, true, true, true),
      ]
      if let q = quads[v] {
        if q.0 { fill(0, 0, 0.5, 0.5) }
        if q.1 { fill(0.5, 0, 0.5, 0.5) }
        if q.2 { fill(0, 0.5, 0.5, 0.5) }
        if q.3 { fill(0.5, 0.5, 0.5, 0.5) }
      }
    }
  }
}
