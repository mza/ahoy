#!/bin/sh
# Builds build/Ahoy.saver, the macOS screensaver: the pieces bundled into one
# script for JavaScriptCore, and the Swift view, for Apple silicon and Intel.
set -eu
cd "$(dirname "$0")"
VERSION="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' ../package.json | head -1)"
OUT=build/Ahoy.saver
BUN="${BUN:-$(command -v bun || echo "$HOME/.local/bun-darwin-aarch64/bun")}"

rm -rf build
mkdir -p "$OUT/Contents/MacOS" "$OUT/Contents/Resources" build/obj

"$BUN" build js/entry.ts --target=browser --format=iife --minify --outfile "$OUT/Contents/Resources/ahoy.js" >/dev/null
# Bun escapes non-ascii in String.raw templates, which would then draw as \uXXXX.
if grep -q 'raw`[^`]*\\u[0-9a-fA-F]\{4\}' "$OUT/Contents/Resources/ahoy.js"; then
  echo "build.sh: a piece has non-ascii in a String.raw template; use a plain template" >&2
  exit 1
fi

for arch in arm64 x86_64; do
  xcrun swiftc -O -module-name Ahoy -target "$arch-apple-macos13.0" -emit-library \
    -Xlinker -install_name -Xlinker @rpath/Ahoy \
    -framework ScreenSaver -framework JavaScriptCore -framework AppKit \
    Sources/*.swift -o "build/obj/Ahoy-$arch"
done
lipo -create build/obj/Ahoy-arm64 build/obj/Ahoy-x86_64 -output "$OUT/Contents/MacOS/Ahoy"

cat > "$OUT/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>en</string>
  <key>CFBundleExecutable</key><string>Ahoy</string>
  <key>CFBundleIdentifier</key><string>dev.ahoy.saver</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>Ahoy</string>
  <key>CFBundleDisplayName</key><string>Ahoy</string>
  <key>CFBundlePackageType</key><string>BNDL</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleVersion</key><string>$VERSION</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSPrincipalClass</key><string>AhoyView</string>
  <key>NSHumanReadableCopyright</key><string>MIT licensed. Pieces from ahoy and ascii.rest.</string>
</dict>
</plist>
PLIST

codesign --force --sign - "$OUT" >/dev/null 2>&1
rm -rf build/obj
echo "built $OUT ($VERSION)"
