# Making pieces for ahoy

How the pirate pieces were made, what the user liked and didn't, and how to add more without re-learning it all. The art tools are in [`tools/art`](../tools/art); everything below assumes you run from the repo root with Node 23.6+ (`~/.local/node-v24.21.0-darwin-arm64/bin` on the original machine), Bun for builds, and Python 3 with Pillow.

## What the user wants

The user has been clear, and has rejected work that ignored it:

- **Black background.** Scenes use `ground: "#000000"`; logos sit on black.
- **ASCII / terminal-native, or pixel art.** For the lore logos the picture is made of visible characters: letters, `# @ % & * + = - : . / \ | _ ( ) [ ] < > ~ ^ ' "`, box drawing (`╭╮╰╯─│═║╔╗╚╝╱╲`), shades `░▒▓█` for texture. It should look like it came out of a terminal. The vibe reference is [omarchy.org](https://omarchy.org). Flat pixel art made only of `█▀▄` half blocks was mostly rejected early on, `blackbeard` aside, but the user has since asked for more of exactly that: "simpler, pixel art style, in fewer colors", in the spirit of the original pirate pack. That is the `pixels` pack; see *Pixel art in half blocks* below.
- **Restrained palette.** Bone/off-white plus one or two accents (blood red, doubloon gold, ghost cyan, phosphor green), a few shades each, like a terminal theme.
- **A logo you'd put on a shirt.** One bold centred emblem, a strong silhouette, readable at a glance from across a room. Fewer, bigger shapes beat detail.
- **Pirate lore.** Real flags (Blackbeard, Calico Jack, Black Bart, Edward Low, Stede Bonnet, Thomas Tew, Condent, the joli rouge) and the stuff of legend (black spot, Davy Jones' locker, Flying Dutchman, the articles, pieces of eight).
- **Not wanted:** kitsch tattoo flash (a whole 12-piece set was dropped), cartoon americana, mixed styles in one piece.

Favourites to calibrate against: `blackbeard`, `calico-jack`, `no-prey-no-pay`, `pieces-of-eight`, `articles`, `eight-bells`, `joli-rouge`, `tortuga`; and, named later, the pirate pack, `hourglass`, `stede-bonnet`, `ghost-captain`, `cutlass`, `grog`, `broadside` and `skull-moon`. The painted scenes are "ok"; no more of them for now.

## The piece contract

A piece is one TypeScript module in `src/pieces/`, following [ascii.rest's contract](https://github.com/bas3line/ascii/blob/main/CONTRIBUTING.md): `export const meta`, and a default function returning `frame(t, env) => string`, exactly `rows` lines of `cols` characters.

- **Coloured pieces are scenes.** Only `scenes` (and logos/companies/distros) may colour; use `category: "scenes"`, a `palette` of up to 64 `#rrggbb`, a `ground`, and write a palette index for every cell into `env.color` every frame. The piece must still read without `env.color` (in one ink).
- **Logos:** default `cell` (2: a cell is a character, twice as tall as wide), at most 80×32.
- **Painted scenes:** `cell: 1` (square), 200×100, drawn as halftone dots `·` `•` `●`.
- **Animated:** at least 3 distinct frames among t = 0, 1, 2, 3, 4, 6. Frame 0 must be a great still (it's what reduced-motion users and thumbnails see). Loop cleanly.
- **Deterministic**, no `Math.random` (seed a PRNG). Fast: precompute in the outer function; logos run at ~0.05–1 ms a frame, scenes ~2–3 ms.
- **`env.paper`:** on a light page, flip shade ramps so dense still means dark.
- **Banned words** (`document`, `window`, `globalThis`...) fail the checker even in comments; the tavern scene calls its window a "casement".

### Bun gotcha

Never put non-ASCII characters (`░`, `█`, `╔`, `·`...) inside a `String.raw` template. Bun's bundler escapes them, and the compiled binary prints `\u2591` instead of `░`. Use plain template literals or string arrays. CI checks the binary's output for escapes, and `macos/build.sh` refuses to build if it finds one.

## Checking a piece

`node tools/art/check.mjs <slug>...` checks pieces where they are, in `src/pieces/`: the meta, exact frame size, allowed characters, determinism, movement, colour indexes, speed and the source rules. It is ahoy's own stand-in, written from the contract; ascii.rest's checker is the authority if a piece is going upstream. For that, keep a clone of [bas3line/ascii](https://github.com/bas3line/ascii) (`~/src/ascii` on the original machine), drop the file in its `src/pieces/`, and:

```sh
npm run check -- <slug>          # the contract, speed, distinct frames
npm run check -- <slug> --show   # and print frames at 0, 1, 2.5 and 5 s
npm run typecheck
```

Don't run its `npm run gen` unless you mean to add the piece to that library.

## Looking at it

Never judge a piece from its text alone. Render it and look:

```sh
node tools/art/dump.mjs calico-jack 0,1.5,3 > /tmp/x.json      # frames + colours as JSON
python3 -E tools/art/render-cells.py /tmp/x.json /tmp/x.png     # a logo, as cells in colour
python3 -E tools/art/render-dots.py  /tmp/x.json /tmp/x.png 5   # a cell: 1 scene, as dots
sh tools/art/sheet.sh /tmp/sheet.png 0.5 calico-jack hourglass  # a contact sheet, two to a row
```

The renders use Menlo, or the first monospace font they find on Linux (set `AHOY_FONT` to a `.ttf` to choose). The PIL renders square off box-drawing corners and draw `░▒▓` as tinted blocks; a real terminal is a little nicer. To see ahoy itself (picker, player, screensaver) without a terminal, run it in a pty and replay what it wrote:

```sh
(sleep 2; printf 'jj'; sleep 1; printf 'q') | script -q /tmp/cap.raw sh -c 'stty cols 120 rows 40; ./dist/ahoy'
python3 -E tools/art/replay-terminal.py /tmp/cap.raw /tmp/cap.png 120 40
```

For the macOS screensaver, `macos/tools/snapshot.swift` renders the built `Ahoy.saver` offscreen (rebuild it after `macos/build.sh`, which wipes `macos/build/`):

```sh
sh macos/build.sh && cd macos && xcrun swiftc -O tools/snapshot.swift -o build/snapshot
build/snapshot build/Ahoy.saver /tmp/shots 1440 900 no skull-island,calico-jack
```

## Techniques that worked

### Dense fill from a painted material map (most logos)

The house style: bold silhouettes filled with one character per material (`8` bone, `#` steel/wood, `%` gold/cloth, `=` leather/iron), and at every edge the character whose shape best matches the edge through that cell (`_ , . ' " p q d b P Y` and so on). It reads as terminal art and as a crisp logo.

1. Paint the emblem with PIL as a **material map**: an image exactly `cols×CW` by `rows×CH` pixels (e.g. 80 cells × 22 px by 32 cells × 44 px), each material a flat distinct colour, black for empty. Draw the shapes as polygons, ellipses and thick lines, at high resolution.
2. **Cut black gaps** where one shape crosses another (dilate the front shape with `ImageFilter.MaxFilter` and paint black before painting it), at least 1.5 cells wide, or they merge into a blob at cell size. This "ink outline" is what makes them read.
3. Convert: `python3 -E tools/art/material-to-dense.py map.png 80 32 "e8e2d0=8,8a94a6=#,d4a020=%"` prints `{art, mat}`: the characters and each cell's material, which becomes `env.color` (material × shade).
4. **Hand-fix what conversion can't do.** Small faces (eye sockets, nose, teeth) come out as mush; hand-draw the skull in characters and stamp it in (`three-skulls`, `calico-jack`, `crossed-flintlocks`). Diagonals converted from a raster come out stepped: hand-draw them at exactly one cell across per row (`/==/`).
5. Animate with overlays on the precomputed art: glints that sweep a diagonal band and turn solid cells to `/` or `=`, ember eyes (`·•●` in red), a cloth "ripple" that shifts shade bands, a few precomputed poses (a jaw, a flexing arm, a bow pitching) swapped by time. Pitch or move by **whole cells**, or edges re-quantize and shimmer.

`tools/art/image-to-dense.py` does the same from a single white-on-black image (how `aws.ts` was made from a logo). `blackbeard` was sampled from the user's own image of the flag.

### Pixel art in half blocks (the `pixels` pack)

Flat-colour pixel art: a canvas of square pixels, one a cell wide and half a cell tall (80×64 for a full-size piece), printed as `█ ▀ ▄` and nothing else, in two to four flat colours on black. `lit-fuse` is the one to copy: its "pixel kit" (`set`, `rect`, `disc`, `line`, `sprite`, `emit`) is pasted into each piece, since a piece can import nothing.

- **One bold emblem** filling most of the frame, drawn at full resolution: a canvas pixel is the unit of detail. The user wants more resolution, not less; big pixels (a `sprite` at `scale` 2 or 3) look low-resolution next to `blackbeard`, and a first pass at `stede-bonnet` and `ghost-captain` at `scale` 3 was sent back for it. Draw curves with geometry or `sprite` rows at `scale` 1, and spend single pixels on detail: tooth gaps, a crack, a fuller down a blade, a shade colour down the right-hand edges. `stede-bonnet` has a skull drawn this way. The whole pack was drawn chunky first and then redrawn this way.
- **A cell has one ink.** Where a cell's two pixels differ in colour, `emit` takes the one further down the palette, so keep colour boundaries on even pixel rows or put a black gap between colours.
- **Black gaps, two pixels wide,** wherever one shape sits on another: in one ink every pixel is the same, and the gaps are all that is left of the drawing.
- **Animate in poses and whole pixels:** a blink, a walk cycle, a glint, a bob. Precompute what never moves and `set` it back each frame.

### ANSI Shadow lettering

Big words read best as figlet "ANSI Shadow": `█` letters with `╔═╗║╚╝` shadows down and to the right. Draw the letters as a `#` mask and run them through `tools/art/ansi-shadow.py`. Used in `no-prey-no-pay`, `tortuga`, `wanted-poster`, the `powder-keg` KA-BOOM. Terminal effects suit it: decode from random glyphs, type in with a cursor, a scanline sweep.

### Procedural, shaded geometry

For objects with real 3D form, render from geometry every frame with a density ramp (`.:-=+*#%@`), like donut.c: `pieces-of-eight` (a coin spinning, embossed faces, milled rim), `eight-bells` (a lit brass cylinder), `iron-hook` (a lit tube). Precompute what doesn't move; sample each cell at a few points.

### Line art and text

Box drawing and plain ASCII for crisp structures: `articles` (a scroll whose text types itself, then a wax seal), `compass-rose`, `queen-annes-revenge`'s roundel, `dead-mans-chest`.

### Painted halftone scenes (`season-one`)

Copied from ascii.rest's own scenes (`kyoto-dusk.ts`, `alpine-dawn.ts`, `lantern-lake.ts`; read them first): 200×100 square cells; each cell shaded in colour (procedural geometry, heightfields, raymarching for water and terrain, all precomputed), then drawn as an ordered-dithered dot sized by brightness in the nearest palette colour. Frames re-tint and move only what changes.

**The scenes need the most work.** What went wrong and what to push on:

- **They're dark and murky.** Night scenes drifted towards near-black (`storm-at-sea` between lightning flashes, `pirate-tavern` on its first pass, `wreck-coast`). Every frame needs a lit focal point and clear silhouettes against light: a moon behind the ship, a bright window behind the tankards.
- **Focal shapes get lost.** A careened hull or a small wreck reads as a dark mass. Put the subject in silhouette against the brightest part of the sky, and give it a rim light.
- **They suffer in a terminal.** ahoy shrinks a scene to the terminal through ascii.rest's painter, which blurs it into shaded half blocks; they look best full screen in the macOS screensaver (round dots). Judge them with `render-dots.py`, and also check `./dist/ahoy <scene>` in a big window.
- **More contrast, fewer things, bolder value structure** before detail. The best ones (`skull-island`, `glowing-wake`, `port-royal`, `burning-ship`) have one strong shape against one strong light.

## What failed (don't repeat)

- Automatic conversion of small detail: faces, profiles, figures under ~12 rows turn to mush (`henry-every`, `figurehead`, `siren` were cut).
- Busy textures: mixed `+ % @ =` fills drown lettering and shape (`joli-rouge` only worked once the cloth was a calm solid fill with the letters cut out as black).
- Figures against a bright disc with no gap between them (`siren` in the moon, the `marooned` palm over the sun).
- Thin strokes under ~1.5 cells, which vanish.
- Shrinking line art by dropping rows; ahoy crops line art instead (see `src/stage.ts`).

## Working with sub-agents

Most pieces were made by parallel sub-agents, two pieces each, then reviewed together. What made that work:

- A shared brief with the look rules above, the contract, the String.raw warning, the render commands, and a pointer to a piece that nails the look ("compare against calico-jack").
- The agent must render and look at its own work, iterate, and report the frame-0 still and the check results.
- Review every batch yourself as a coloured contact sheet. Send back specific, visual critique ("the pistols read as scythes; make each an unmistakable side-profile pistol: barrel, lock, S-curved hammer, trigger guard, curved grip"). Allow two rounds, then cut what still doesn't read.

## Adding a piece to ahoy

1. Put `src/pieces/<slug>.ts` in place, and check it: `node tools/art/check.mjs <slug>`.
2. Import it in [`src/own.ts`](../src/own.ts) and add it to its group: `season-one` for a scene, or one of the prototype packs, `pirate`, `pixels`, `rogers` or `lore`, which are listed only with `--prototypes`. The terminal app and the screensaver both play that list.
3. `npm run typecheck`, then `node src/cli.ts <slug>` and `./dist/ahoy` after `npm run build`. Check that `./dist/ahoy all --prototypes | grep '\\u[0-9a-f]\{4\}'` prints nothing.
4. `npm run saver` rebuilds `macos/build/Ahoy.saver`; snapshot it to check.
5. Update the piece lists in the README, and regenerate the contact sheets in `docs/sheets/` if you like: `python3 tools/art/contact.py docs/sheets/contact-2.png 6 <slug>...`, one sheet a group, numbered in the order the picker lists them.
