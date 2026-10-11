# Ahoy for macOS

ahoy as a native macOS screensaver. The pieces play full screen one after
another, dissolving from one into the next, each somewhere new on the screen
so nothing burns in. They run live in JavaScriptCore, from the same code as the
terminal app, and block and box-drawing characters are drawn as shapes, so
they're crisp at any size.

## Build

You need the Xcode Command Line Tools (`xcode-select --install`) and
[Bun](https://bun.sh).

```sh
sh macos/build.sh        # builds macos/build/Ahoy.saver, for Apple silicon and Intel
```

## Install

Double-click `macos/build/Ahoy.saver` and choose to install it for this user,
or copy it yourself:

```sh
cp -R macos/build/Ahoy.saver ~/Library/Screen\ Savers/
```

Then pick **Ahoy** in System Settings → Screen Saver.

## Options

In System Settings → Screen Saver, choose Ahoy and click **Options…** to pick:

- which pieces play (all of them by default; a piece added later is on until you turn it off)
- how many seconds each one stays (15 by default)
- whether they play in a random order (on by default)

## Uninstall

```sh
rm -rf ~/Library/Screen\ Savers/Ahoy.saver
```

## Adding a piece

Import it in [`js/entry.ts`](js/entry.ts) and add it to `PIECES`, then build
again. As for the terminal app, don't put non-ascii characters in a
`String.raw` template: Bun escapes them. `build.sh` stops if it finds one.

## Checking a build

The screensaver is hard to look at while you work on it, so
[`tools/snapshot.swift`](tools/snapshot.swift) loads the built bundle the way
macOS does and draws it offscreen into PNGs: every piece, and a dissolve part
way through.

```sh
xcrun swiftc -O macos/tools/snapshot.swift -framework ScreenSaver -framework AppKit -o macos/build/snapshot
macos/build/snapshot macos/build/Ahoy.saver /tmp/ahoy-shots                 # 1440x900
macos/build/snapshot macos/build/Ahoy.saver /tmp/ahoy-shots 296 184 preview # the size of the Settings preview
```

## Known quirks

- **It's built here, not notarized.** It's signed ad hoc, which is fine on the
  Mac that built it. A copy downloaded from elsewhere is quarantined, and macOS
  will refuse to open it until you clear that with
  `xattr -dr com.apple.quarantine Ahoy.saver`, or until it's signed with a
  Developer ID and notarized.
- **macOS keeps old screensavers running.** Since Sonoma, the host process
  (`legacyScreenSaver`) doesn't always stop a screensaver when it ends, and can
  start a new one alongside it. Ahoy stops when macOS announces the end, and an
  older one stops when a newer one starts, so they don't pile up and use CPU.
  If you replace the bundle, a running host can keep the old version until you
  run `killall legacyScreenSaver` or log out.
- **System Settings caches the preview.** After installing a new build, close
  and reopen System Settings to see it.
