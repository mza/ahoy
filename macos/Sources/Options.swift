/*
 * The screensaver's settings, kept in its ScreenSaverDefaults, and the sheet
 * that changes them: which pieces play, how long each one stays, and whether
 * they come in a random order.
 */
import AppKit
import ScreenSaver

struct Settings {
  var dwell = 15.0
  var shuffle = true
  /** The pieces switched off; a new piece is on until it is switched off. */
  var off: Set<String> = []

  private static var defaults: ScreenSaverDefaults? { ScreenSaverDefaults(forModuleWithName: AhoyView.module) }

  static func load() -> Settings {
    var s = Settings()
    guard let d = defaults else { return s }
    d.register(defaults: ["dwell": 15.0, "shuffle": true, "off": [String]()])
    s.dwell = max(3, d.double(forKey: "dwell"))
    s.shuffle = d.bool(forKey: "shuffle")
    s.off = Set(d.stringArray(forKey: "off") ?? [])
    return s
  }

  func save() {
    guard let d = Settings.defaults else { return }
    d.set(dwell, forKey: "dwell")
    d.set(shuffle, forKey: "shuffle")
    d.set(Array(off).sorted(), forKey: "off")
    d.synchronize()
  }
}

final class Options: NSObject {
  let window: NSWindow
  private let pieces: [PieceInfo]
  private var boxes: [NSButton] = []
  private let dwell = NSTextField()
  private let stepper = NSStepper()
  private let shuffle = NSButton(checkboxWithTitle: "Play in a random order", target: nil, action: nil)
  private let done: (Settings) -> Void

  init(pieces: [PieceInfo], settings: Settings, done: @escaping (Settings) -> Void) {
    self.pieces = pieces
    self.done = done
    window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 380, height: 520), styleMask: [.titled], backing: .buffered, defer: false)
    super.init()

    let title = NSTextField(labelWithString: "ahoy")
    title.font = .boldSystemFont(ofSize: 15)
    let note = NSTextField(labelWithString: "Pieces to play:")

    let list = NSStackView()
    list.orientation = .vertical
    list.alignment = .leading
    list.spacing = 4
    for p in pieces {
      let box = NSButton(checkboxWithTitle: p.name, target: nil, action: nil)
      box.state = settings.off.contains(p.slug) ? .off : .on
      boxes.append(box)
      list.addArrangedSubview(box)
    }
    let scroll = NSScrollView()
    scroll.hasVerticalScroller = true
    scroll.borderType = .bezelBorder
    let holder = FlippedView()
    holder.addSubview(list)
    list.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      list.leadingAnchor.constraint(equalTo: holder.leadingAnchor, constant: 8),
      list.topAnchor.constraint(equalTo: holder.topAnchor, constant: 6),
      list.trailingAnchor.constraint(lessThanOrEqualTo: holder.trailingAnchor, constant: -8),
      holder.bottomAnchor.constraint(equalTo: list.bottomAnchor, constant: 6),
    ])
    scroll.documentView = holder
    holder.translatesAutoresizingMaskIntoConstraints = false
    holder.widthAnchor.constraint(equalTo: scroll.contentView.widthAnchor).isActive = true

    let all = NSButton(title: "All", target: self, action: #selector(selectAll))
    let none = NSButton(title: "None", target: self, action: #selector(selectNone))
    let picks = NSStackView(views: [all, none])

    dwell.doubleValue = settings.dwell
    dwell.formatter = { let f = NumberFormatter(); f.minimum = 3; f.maximum = 600; f.maximumFractionDigits = 0; return f }()
    dwell.alignment = .right
    dwell.widthAnchor.constraint(equalToConstant: 56).isActive = true
    stepper.minValue = 3
    stepper.maxValue = 600
    stepper.increment = 5
    stepper.doubleValue = settings.dwell
    stepper.target = self
    stepper.action = #selector(stepped)
    let seconds = NSStackView(views: [NSTextField(labelWithString: "Seconds each:"), dwell, stepper])

    shuffle.state = settings.shuffle ? .on : .off

    let cancel = NSButton(title: "Cancel", target: self, action: #selector(cancelled))
    cancel.keyEquivalent = "\u{1b}"
    let ok = NSButton(title: "OK", target: self, action: #selector(confirmed))
    ok.keyEquivalent = "\r"
    let buttons = NSStackView()
    buttons.setViews([cancel, ok], in: .trailing)

    let stack = NSStackView(views: [title, note, scroll, picks, seconds, shuffle, buttons])
    stack.orientation = .vertical
    stack.alignment = .leading
    stack.spacing = 10
    stack.edgeInsets = NSEdgeInsets(top: 16, left: 18, bottom: 16, right: 18)
    stack.setCustomSpacing(4, after: note)
    window.contentView = stack
    scroll.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.activate([
      scroll.widthAnchor.constraint(equalTo: stack.widthAnchor, constant: -36),
      scroll.heightAnchor.constraint(greaterThanOrEqualToConstant: 260),
      buttons.widthAnchor.constraint(equalTo: stack.widthAnchor, constant: -36),
    ])
  }

  @objc private func selectAll() { boxes.forEach { $0.state = .on } }
  @objc private func selectNone() { boxes.forEach { $0.state = .off } }
  @objc private func stepped() { dwell.doubleValue = stepper.doubleValue }

  @objc private func confirmed() {
    var s = Settings()
    s.dwell = max(3, dwell.doubleValue)
    s.shuffle = shuffle.state == .on
    s.off = Set(zip(pieces, boxes).filter { $0.1.state == .off }.map { $0.0.slug })
    done(s)
    close()
  }

  @objc private func cancelled() { close() }

  private func close() {
    if let parent = window.sheetParent {
      parent.endSheet(window)
    } else {
      window.orderOut(nil)
    }
  }
}

private final class FlippedView: NSView {
  override var isFlipped: Bool { true }
}
