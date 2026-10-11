# ahoy

Animated ascii art in your terminal. **Season one (2026)** is fifteen painted pirate scenes: big halftone pictures, alive with moving water, weather and light, from `port-royal` to `kraken-rising`. **Resilient Hearts (2026)** is the three designs on the shirts sold for Resilient Hearts Animal Sanctuary, and there's the AWS logo too, just for fun. Browse them with a live preview, play one full screen, or leave a screensaver running.

On the way to the scenes ahoy grew a hundred-odd **prototypes**, pirate pixel art, jolly rogers and logos in terminal characters. They're still here, a key away: `p` in the picker, or `--prototypes`. The pieces are built on [ascii.rest](https://github.com/bas3line/ascii), and its library of 200+ more is a flag away: `--all`.

![The picker: a list of pieces, with the selected one playing beside it](docs/picker.png)

## Install

On macOS or Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/mza/ahoy/main/install.sh | sh
```

This downloads a single standalone binary for your machine (Apple silicon or Intel Mac, Linux x64 or arm64, glibc or musl), checks it against the release's checksums, and puts it in `~/.local/bin`. You don't need Node or anything else installed.

To pick the version or the location:

```sh
curl -fsSL https://raw.githubusercontent.com/mza/ahoy/main/install.sh | AHOY_VERSION=v0.1.0 AHOY_BIN_DIR=/usr/local/bin sh
```

To uninstall, delete the binary: `rm ~/.local/bin/ahoy`.

## Use

```sh
ahoy                             # pick a scene; the one under the cursor plays as you go
ahoy kraken-rising               # play one full screen
ahoy ghost-ship burning-ship aws # play a few, ←/→ to move between them
ahoy saver                       # screensaver, full screen in a browser: each scene for 90 seconds, fading into the next
ahoy saver --shuffle -d 30       # in a random order, 30 seconds each
ahoy saver --terminal            # the screensaver in the terminal
ahoy saver glowing-wake,aws      # just these
ahoy saver season-one rogers     # season one, and the jolly rogers from the prototypes
ahoy list                        # what's listed, by group
ahoy --prototypes                # the picker, with the prototypes too
ahoy --all                       # and with the ascii.rest library
```

A selection can name pieces (`ghost-ship`), groups (`season-one`, `resilient-hearts`, `aws`, and the prototype packs `pirate`, `pixels`, `rogers` and `lore`, or all of those as `prototypes`) or `all`, which is whatever is listed, separated by spaces or commas. A piece or a group can be named whether or not it is listed. Pieces and groups from the [ascii.rest library](https://ascii.rest) (`donut`, `scenes`, `logos`, `distros`, ...) can be named too; with `--all` they're also listed in the picker, in `ahoy list` and under `all`.

The screensaver puts each piece somewhere different on the screen, so nothing burns in, and in the terminal shows no text unless you press a key.

![The screensaver playing the AWS logo](docs/screensaver.png)

| Key | Picker | Player and screensaver |
| --- | --- | --- |
| `↑` `↓` / `j` `k` | move | |
| `PgUp` `PgDn` `g` `G` | jump | |
| `enter` | play the piece and the ones listed with it | |
| `/` | search names and descriptions | |
| `x` | mark a piece for the screensaver | |
| `p` | show the prototypes, or hide them again | |
| `s` | screensaver over the marked pieces, or everything listed | |
| `←` `→` | | previous, next |
| `space` | pause the preview | pause |
| `,` `.` | a frame back or on (pauses) | same |
| `e` | when paused, save the frame as pictures | same |
| `m` | coloured pieces in one colour | same |
| `d` | the next way of drawing a scene: dense, ascii, braille, crisp, soft | same |
| `t` | colours for a light or dark terminal | same |
| `q` / `esc` | quit | back to the picker, or quit |

| Option | |
| --- | --- |
| `-d`, `--dwell <seconds>` | how long the screensaver shows each piece (default 90 in a browser, 15 in the terminal) |
| `-s`, `--shuffle` | screensaver in a random order |
| `-T`, `--terminal` | keep the screensaver in the terminal |
| `-b`, `--browser` | play the pieces you name in a browser too, full screen |
| `-m`, `--mono` | coloured pieces in the terminal's own colour |
| `-l`, `--light` | for a light terminal |
| `-p`, `--prototypes` | list ahoy's prototypes too |
| `-a`, `--all` | list the ascii.rest library too |
| `-o`, `--out <folder>` | where `e` saves a paused frame (default: the folder you are in) |
| `--cell <shape>` | a character cell's height over its width, for a terminal that does not say (most are about 2) |
| `--scenes <how>` | how a scene is drawn: `dense` (the default), `ascii`, `braille`, `crisp` or `soft` |

Most pieces are up to 80×32, and the scenes are shrunk to fit. In a smaller terminal, pieces drawn in blocks or dense fill are shrunk to fit, and line art is cropped to its middle rather than torn. Coloured pieces need a terminal with truecolor (iTerm2, Ghostty, WezTerm, kitty, Alacritty, Windows Terminal); elsewhere, use `--mono`. When the output isn't a terminal, `ahoy <piece>` prints the piece's first frame as plain text: `ahoy galleon > galleon.txt`.

### In a browser

A terminal draws a character to a cell, and a cell is about twice as tall as it is wide, so it cannot draw a scene as a page does: 200 by 100 round dots on a square grid. A browser can, so that is where the screensaver plays. `ahoy saver` serves a page to this machine alone, sends it the frames, and opens it full screen with nothing round it, in Chromium, Chrome, Brave or Edge if one is installed, else in Firefox or your default browser. It starts on a piece picked at random; each stays for 90 seconds (`--dwell`) and fades into the next, in order from there or with `--shuffle`. A key, a click or a real move of the mouse there ends it, or `Ctrl+C` in the terminal. `--mono` and `--light` work as they do in the terminal, and `-b` plays any pieces you name the same way: `ahoy kraken-rising -b`. Set `AHOY_BROWSER` to another browser's command to use that, or to `none` to be told the address and open it yourself. With `--terminal`, or on a machine with no screen to open a browser on, the screensaver plays in the terminal, as `s` in the picker does.

To have it come on when the machine is idle, give it to whatever watches for that. With hypridle:

```ini
listener {
    timeout = 300
    on-timeout = ahoy saver --shuffle
}
```

### Saving a frame

Pause a piece with `space`, step to the frame you want with `,` and `.`, and press `e`. ahoy saves that frame twice, 1500 pixels square: `ahoy-<piece>-<frame>.png`, with nothing behind the piece, and `ahoy-<piece>-<frame>.jpg`, on the piece's own ground. It is the piece at its full size, as large as whole pixels allow, whatever the size of your terminal, in the look you were watching it in (`m` for one ink, `t` for a light page). Letters are drawn in a small bitmap font of ahoy's own, since there is no terminal font in a picture.

## The pieces

There are contact sheets of every piece in [`docs/sheets`](docs/sheets).

### Season one (2026)

**season one** (`season-one`): `port-royal`, `pirate-cove`, `glowing-wake`, `sea-battle`, `burning-ship`, `masthead-dawn`, `sunken-galleon`, `treasure-cave`, `pirate-tavern`, `kraken-rising`, `ghost-ship`, `hidden-lagoon`, `aurora-passage`, `volcano-isle`, `lighthouse-reef`. Painted scenes, 200×100, in the style of ascii.rest's own: each cell is shaded in colour and drawn as a halftone dot, with the water, the weather and the light moving. In a terminal a scene is drawn in dots, a character to a cell in its own colour: six sizes of dot, from `·` to `⬤`, the largest lapping over its neighbours. A cell is about twice as tall as it is wide, so each dot stands for two rows of the scene, and the rows of dots stand apart with black between them. ahoy asks the terminal the shape of its cells and lays the scene out by it, so **the tighter the terminal's lines, the closer it comes to the page**: with square cells it is the page's picture, a dot to a cell. In foot that is a second window with its line height set to the width of a character, which for a font 14 pixels wide on a display scaled by 2 is

```sh
foot -o line-height=7px ahoy saver          # add --fullscreen for the whole screen
```

kitty (`adjust_line_height`), Ghostty (`adjust-cell-height`) and Alacritty (`font.offset.y`) have the like. Shrinking the font (`ctrl -`) gives more dots either way: 200 columns show a scene at its full width.

`d` tries the other ways of drawing a scene: `ascii`, the dots on a square grid, each with a space after it, which is half as many across; `braille`, each dot of the scene a cluster of braille dots, the whole of a scene in 200 columns but small and faint; `crisp`, a cell of the scene to half a block, like pixels; and `soft`, the blurred tones ascii.rest's own terminal player uses (its dots are only drawn as dots on a page). For the page's picture with no fuss, see *In a browser* below.

### Resilient Hearts (2026)

**Resilient Hearts** (`resilient-hearts`): `fire-roger`, `blackbeard`, `sea-dog`. The three designs on the shirts sold in support of Resilient Hearts Animal Sanctuary: a flaming skull and crossbones, Blackbeard's flag, and the pirate dog.

### Just for fun

**just for fun** (`aws`): `aws`, the AWS wordmark over its smile.

### Prototypes

The packs made on the way to season one. They aren't listed until you ask: `p` in the picker, `--prototypes` on the command line, or name one (`ahoy doubloon`, `ahoy saver rogers`).

**the pirate pack** (`pirate`):
`galleon`, `pirate-flag`, `jolly-roger`, `kraken`, `parrot`, `ships-wheel`, `treasure-map`, `treasure-chest`, `anchor`, `ahoy` and `pirate-heart`, each in a different style: dense ascii fill, box-drawing line art, old-school slashes, shaded blocks, procedural shading. They live in [`src/pieces`](src/pieces) and follow the [ascii.rest piece contract](https://github.com/bas3line/ascii/blob/main/CONTRIBUTING.md), so any of them could be contributed upstream.

**pirate pixels** (`pixels`): `sea-dog-2`, `doubloon`, `lit-fuse`, `dead-eye`, `gold-tooth`, `skull-candle`, `fish-bones`, `crossed-cutlasses`, `dagger`, `cannon`, `skeleton-key`, `tricorn`, `rum-bottle`, `x-marks-the-spot`, `desert-island`, `sloop`, `jolly-boat`, `ship-in-a-bottle`, `walk-the-plank`, `shark-fin`, `whale-tail`, `sea-serpent`, `octopus`, `pirate-crab`, `seagull`, `pirate-captain`, `man-of-war`, `ships-monkey`, `bilge-rat`, `anglerfish`, `mermaid`, `kraken-arms`, `flintlock`, `gold-hoard`, `brass-compass`, `grappling-hook`, `oyster-pearl`. Pixel art drawn in half blocks, two square pixels a cell, each pixel drawn on its own, in a few flat colours on black.

**jolly rogers** (`rogers`): `skull-and-crossbones`, `jack-rackham`, `cutlass-bite`, `pierced-skull`, `crowned-skull`, `red-roger`, `ghost-roger`, `laughing-roger`, `rose-roger`, `profile-roger`, `winged-skull`, `emanuel-wynne`, `henry-every`, `condent-pennant`, `gold-roger`, `flintlock-roger`, `anchor-roger`, `shovel-roger`, `storm-roger`, `ice-roger`, `snake-roger`, `spider-roger`, `drowned-roger`. Two dozen takes on the skull and crossbones, or crossed cutlasses, drawn the same way.

**pirate lore** (`lore`): `calico-jack`, `queen-annes-revenge`, `black-bart`, `pieces-of-eight`, `no-prey-no-pay`, `tortuga`, `hourglass`, `black-spot`, `flying-dutchman`, `compass-rose`, `wanted-poster`, `eight-bells`, `stede-bonnet`, `ghost-captain`, `cutlass`, `broadside`, `dead-mans-chest`, `grog`, `davy-jones-locker`, `spyglass`, `iron-hook`, `skull-moon`, `edward-low`, `thomas-tew`, `ships-lantern`, `three-skulls`, `articles`, `powder-keg`, `joli-rouge`, `crossed-flintlocks`, `crows-nest`, `message-in-a-bottle`. Animated logos in terminal character art on black, most of them historical pirate flags and the stuff of pirate legend.

## Develop

You need Node 23.6 or later, which runs the TypeScript directly, and [Bun](https://bun.sh) to build the binary.

```sh
npm install
npm start                 # the picker, from source
npm start -- saver        # or any other arguments
npm run typecheck
npm run build             # dist/ahoy, a standalone binary for this machine
```

How the pieces were made, and how to make more, is in [docs/MAKING-PIECES.md](docs/MAKING-PIECES.md). To add a piece, put it in `src/pieces/` and list it in [`src/own.ts`](src/own.ts); the terminal app and the screensaver both play that list. Don't put non-ascii characters in a `String.raw` template: Bun's bundler escapes them, and the binary would print `\u2591` instead of `░`. Use a plain template, and CI checks for it.

## macOS screensaver

[`macos/`](macos) builds `Ahoy.saver`, a native screensaver that plays the same pieces full screen: `npm run saver`, then double-click `macos/build/Ahoy.saver`. See [macos/README.md](macos/README.md).

## Release

Bump `version` in `package.json`, then push a matching tag:

```sh
git tag v0.1.0 && git push origin v0.1.0
```

[`release.yml`](.github/workflows/release.yml) then builds the six binaries (macOS ones on a macOS runner), writes `SHA256SUMS`, and publishes the GitHub release that `install.sh` downloads.

## Credits

The library pieces and the terminal painter come from [ascii.rest](https://github.com/bas3line/ascii) by [@bas3line](https://github.com/bas3line), MIT licensed. The AWS logo is a trademark of Amazon.com, Inc. or its affiliates; other logos are trademarks of their owners. See [NOTICE](NOTICE).

ahoy is MIT licensed; see [LICENSE](LICENSE).
