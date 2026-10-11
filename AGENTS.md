# Notes for coding agents

ahoy is a TypeScript TUI (run directly by Node 23.6+, compiled to standalone binaries by Bun) that plays ascii.rest pieces in a terminal, plus a native macOS screensaver in `macos/` that plays the same pieces through JavaScriptCore.

- **Making or changing pieces:** read [docs/MAKING-PIECES.md](docs/MAKING-PIECES.md) first. It covers the look the user wants, the piece contract, how to render and review pieces, the techniques and tools in `tools/art/`, and what has failed before.
- **Which pieces ahoy plays:** [`src/own.ts`](src/own.ts), for both the app and the screensaver.
- **Verify before you finish:** `npm run typecheck`, `npm run build`, then check that `./dist/ahoy all | grep '\\u[0-9a-f]\{4\}'` prints nothing (Bun escapes non-ASCII in `String.raw`). For the screensaver: `npm run saver`.
- **Publishing:** the repo is [mza/ahoy](https://github.com/mza/ahoy) on GitHub; CI runs on every push to `main`. To release, bump `version` in `package.json` and push a matching `vX.Y.Z` tag (see the README's Release section).
