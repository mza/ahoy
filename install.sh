#!/bin/sh
# Installs ahoy, ascii art in your terminal, on macOS or Linux:
#
#   curl -fsSL https://raw.githubusercontent.com/mza/ahoy/main/install.sh | sh
#
# It downloads the build for this machine from the latest GitHub release,
# checks it against the release's SHA256SUMS, and puts it in ~/.local/bin.
# Set AHOY_VERSION (a tag such as v0.1.0) or AHOY_BIN_DIR to change either,
# or AHOY_DOWNLOAD_URL to download from somewhere else.
set -eu

REPO="${AHOY_REPO:-mza/ahoy}"
VERSION="${AHOY_VERSION:-latest}"
BIN_DIR="${AHOY_BIN_DIR:-$HOME/.local/bin}"

say() { printf 'ahoy: %s\n' "$*"; }
fail() { say "$*" >&2; exit 1; }

case "$(uname -s)" in
  Darwin) os=darwin ;;
  Linux) os=linux ;;
  *) fail "there is no build for $(uname -s); macOS and Linux only" ;;
esac
case "$(uname -m)" in
  arm64 | aarch64) arch=arm64 ;;
  x86_64 | amd64) arch=x64 ;;
  *) fail "there is no build for $(uname -m); arm64 and x86_64 only" ;;
esac
# Alpine and other musl systems need the musl build.
if [ "$os" = linux ] && { ls /lib/ld-musl-* >/dev/null 2>&1 || ldd --version 2>&1 | grep -qi musl; }; then
  arch="$arch-musl"
fi
asset="ahoy-$os-$arch.tar.gz"

if [ -n "${AHOY_DOWNLOAD_URL:-}" ]; then
  base="$AHOY_DOWNLOAD_URL"
elif [ "$VERSION" = latest ]; then
  base="https://github.com/$REPO/releases/latest/download"
else
  base="https://github.com/$REPO/releases/download/$VERSION"
fi

if command -v curl >/dev/null 2>&1; then
  fetch() { curl -fsSL --retry 3 -o "$2" "$1"; }
elif command -v wget >/dev/null 2>&1; then
  fetch() { wget -q -O "$2" "$1"; }
else
  fail "needs curl or wget"
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT INT TERM

say "downloading $asset ($VERSION)"
fetch "$base/$asset" "$tmp/$asset" || fail "could not download $base/$asset"
fetch "$base/SHA256SUMS" "$tmp/SHA256SUMS" || fail "could not download $base/SHA256SUMS"

expected="$(grep " $asset\$" "$tmp/SHA256SUMS" | cut -d' ' -f1)"
[ -n "$expected" ] || fail "$asset is not in SHA256SUMS"
if command -v sha256sum >/dev/null 2>&1; then
  actual="$(sha256sum "$tmp/$asset" | cut -d' ' -f1)"
else
  actual="$(shasum -a 256 "$tmp/$asset" | cut -d' ' -f1)"
fi
[ "$expected" = "$actual" ] || fail "checksum mismatch for $asset"

tar -xzf "$tmp/$asset" -C "$tmp"
mkdir -p "$BIN_DIR"
mv "$tmp/ahoy" "$BIN_DIR/ahoy"
chmod 755 "$BIN_DIR/ahoy"
say "installed $("$BIN_DIR/ahoy" --version) to $BIN_DIR/ahoy"

case ":$PATH:" in
  *":$BIN_DIR:"*) say "run: ahoy" ;;
  *)
    say "$BIN_DIR is not on your PATH; add it with:"
    printf '\n  export PATH="%s:$PATH"\n\n' "$BIN_DIR"
    ;;
esac
