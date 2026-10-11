/*
 * Loads build/Ahoy.saver as macOS would, and draws its view offscreen into
 * PNGs, so the screensaver can be checked without starting it:
 *
 *   swiftc tools/snapshot.swift -o build/snapshot && build/snapshot build/Ahoy.saver out/
 */
import AppKit
import ScreenSaver

let args = CommandLine.arguments
guard args.count >= 3, let bundle = Bundle(path: args[1]), bundle.load(), let cls = bundle.principalClass as? ScreenSaverView.Type else {
  print("usage: snapshot <Ahoy.saver> <dir> [width height]; the bundle did not load")
  exit(1)
}
let dir = URL(fileURLWithPath: args[2], isDirectory: true)
try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
let w = args.count > 4 ? Double(args[3])! : 1440, h = args.count > 4 ? Double(args[4])! : 900
let preview = args.count > 5 && args[5] == "preview"

_ = NSApplication.shared
guard let view = cls.init(frame: NSRect(x: 0, y: 0, width: w, height: h), isPreview: preview) else { exit(1) }
let show = NSSelectorFromString("snapshotShow:at:")
let dissolve = NSSelectorFromString("snapshotDissolveTo:at:progress:")

func save(_ name: String) {
  guard let rep = view.bitmapImageRepForCachingDisplay(in: view.bounds) else { return }
  view.cacheDisplay(in: view.bounds, to: rep)
  try? rep.representation(using: .png, properties: [:])?.write(to: dir.appendingPathComponent("\(name).png"))
  print("wrote \(name).png")
}

typealias Show = @convention(c) (AnyObject, Selector, NSString, Double) -> Void
typealias Dissolve = @convention(c) (AnyObject, Selector, NSString, Double, Double) -> Void
let showFn = unsafeBitCast(view.method(for: show), to: Show.self)
let dissolveFn = unsafeBitCast(view.method(for: dissolve), to: Dissolve.self)

let shots = args.count > 6 ? args[6].split(separator: ",").map(String.init)
  : ["galleon", "pirate-flag", "jolly-roger", "kraken", "parrot", "ships-wheel", "treasure-map", "treasure-chest", "anchor", "ahoy", "pirate-heart", "aws"]
let start = Date()
for slug in shots {
  showFn(view, show, slug as NSString, 2.5)
  save(slug)
}
print(String(format: "%.1f ms a shot, drawing and encoding", Date().timeIntervalSince(start) * 1000 / Double(shots.count)))
// part way from the galleon into the AWS logo
showFn(view, show, "galleon" as NSString, 1)
dissolveFn(view, dissolve, "aws" as NSString, 1, 0.45)
save("dissolve")

// how long drawing one frame takes, without encoding
let rep = view.bitmapImageRepForCachingDisplay(in: view.bounds)!
for slug in ["galleon", "jolly-roger", "pirate-flag"] {
  showFn(view, show, slug as NSString, 2)
  let t0 = Date()
  for _ in 0..<30 { view.cacheDisplay(in: view.bounds, to: rep) }
  print(slug, String(format: "%.1f ms to draw a frame", Date().timeIntervalSince(t0) * 1000 / 30))
}
