#!/usr/bin/env node
/*
 * ahoy: ascii art in your terminal.
 *
 *   ahoy                     pick a piece from a list, each one playing as you go
 *   ahoy <piece>...          play pieces full screen
 *   ahoy saver [what]...     a screensaver, in a browser filling the screen:
 *                            every piece, or the ones you name
 *   ahoy saver --terminal    the same in the terminal
 *   ahoy list                every piece, by group
 *
 * It lists season one and the AWS logo; --prototypes and --all list the rest.
 */
import process from "node:process";
import { parseArgs } from "node:util";
import pkg from "../package.json" with { type: "json" };
import { App, still, tty } from "./app.ts";
import { SCENES, type Scenes } from "./stage.ts";
import { serve } from "./web.ts";
import { catalog, DEFAULT_SAVER, listed, OWN, PROTOTYPES, select } from "./catalog.ts";

const HELP = `ahoy ${pkg.version}: ascii art in your terminal

  ahoy                      pick a piece; the one under the cursor plays beside the list
  ahoy <piece>...           play pieces full screen (←/→ to move between them)
  ahoy saver [what]...      screensaver, in a browser filling the screen, where a scene
                            is drawn as a page draws it, in round dots; it fades from
                            each piece to the next, every piece or the ones you name
  ahoy saver --terminal     the screensaver in the terminal
  ahoy list                 every piece, by group

  what: a piece (kraken-rising), a group (season-one, resilient-hearts, aws) or all, separated by
        spaces or commas. The screensaver plays all that is listed by default.

  ahoy lists season one, its painted pirate scenes, the three Resilient Hearts
  shirt designs, and the AWS logo. With --prototypes it lists its prototypes too, the packs made on the way there
  (pirate, pixels, rogers, lore), and with --all the whole ascii.rest library
  (https://ascii.rest). Any piece or group can be named whether it is listed
  or not.

  -d, --dwell <seconds>     seconds a screensaver shows each piece (default 90 in a
                            browser, 15 in the terminal)
  -s, --shuffle             screensaver in a random order (it starts on a random
                            piece either way)
  -b, --browser             play the pieces you name in a browser too, full screen
  -T, --terminal            keep the screensaver in the terminal
  -m, --mono                coloured pieces in the terminal's own colour
  -l, --light               for a light terminal
  -p, --prototypes          list ahoy's prototypes too (p in the picker)
  -a, --all                 list the ascii.rest library too
  -o, --out <folder>        where e saves a paused frame (default: this folder)
      --cell <shape>        a character cell's height over its width, if the
                            terminal does not say (most are about 2)
      --scenes <how>        how a scene is drawn: dense (the default), ascii, braille, crisp
                            or soft;
                            d changes it as you watch
  -h, --help                this help
  -v, --version             the version

  keys: ←/→ skip · space pause · ,/. a frame back or on · m mono · t light/dark
        d the next way of drawing a scene (dense, ascii, braille, crisp, soft)
        q back or quit · in the picker, x marks pieces for s, the screensaver
        e, when paused, saves the frame as a 1500x1500 PNG (transparent) and JPEG

  ahoy saver
  ahoy saver --shuffle --dwell 30
  ahoy saver kraken-rising,ghost-ship,aws
  ahoy saver season-one rogers
  ahoy burning-ship
`;

class Usage extends Error {}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      dwell: { type: "string", short: "d" },
      shuffle: { type: "boolean", short: "s" },
      browser: { type: "boolean", short: "b" },
      terminal: { type: "boolean", short: "T" },
      mono: { type: "boolean", short: "m" },
      light: { type: "boolean", short: "l" },
      all: { type: "boolean", short: "a" },
      prototypes: { type: "boolean", short: "p" },
      out: { type: "string", short: "o" },
      scenes: { type: "string" },
      cell: { type: "string" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });
  if (values.help) return void process.stdout.write(HELP);
  if (values.version) return void console.log(pkg.version);
  const dwell = values.dwell === undefined ? undefined : Number(values.dwell);
  if (dwell !== undefined && !(dwell > 0)) throw new Usage(`--dwell takes a number of seconds above 0, not "${values.dwell}"`);
  const scenes = (values.scenes ?? "dense") as Scenes;
  if (!SCENES.includes(scenes)) throw new Usage(`--scenes takes ${SCENES.join(", ")}, not "${values.scenes}"`);
  const cell = values.cell === undefined ? undefined : Number(values.cell);
  if (cell !== undefined && !(cell >= 0.5 && cell <= 4)) throw new Usage(`--cell takes a cell's height over its width, about 2, not "${values.cell}"`);
  const settings = { cell, dwell: dwell ?? 15, shuffle: !!values.shuffle, mono: !!values.mono, light: !!values.light, scenes, out: values.out ?? "." };

  const everything = await catalog();
  const shown = { prototypes: !!values.prototypes, library: !!values.all };
  const entries = listed(everything, shown);
  const [command, ...rest] = positionals;

  if (command === "list") {
    const groups = [...new Set(entries.map((e) => e.pack))];
    for (const g of groups) {
      const here = entries.filter((e) => e.pack === g);
      console.log(`${g}${OWN.includes(g) ? " (ahoy)" : ""}: ${here.length}`);
      for (const e of here) console.log(`  ${e.slug.padEnd(22)} ${e.piece.meta.note}`);
    }
    const hidden = everything.filter((e) => PROTOTYPES.includes(e.pack)).length;
    if (!shown.prototypes && process.stdout.isTTY) console.log(`\n${hidden} prototypes are not listed; ahoy list --prototypes lists them too`);
    return;
  }

  const saver = command === "saver" || command === "screensaver";
  const words = saver ? (rest.length ? rest : [DEFAULT_SAVER]) : positionals;
  const { picked, unknown } = select(everything, words, shown);
  if (unknown.length) throw new Usage(`no piece or group named ${unknown.map((w) => `"${w}"`).join(", ")}; see ahoy list --prototypes --all`);

  // a screensaver starts on a piece picked at random, and goes on from there in order
  if (saver && picked.length > 1) picked.push(...picked.splice(0, Math.floor(Math.random() * picked.length)));

  // In a browser: a screensaver unless it is kept in the terminal, and anything else that asks to be. A machine
  // with no screen to open one on, over ssh say, keeps the screensaver in the terminal too.
  const screen = process.platform !== "linux" || !!process.env.WAYLAND_DISPLAY || !!process.env.DISPLAY || !!process.env.AHOY_BROWSER;
  if (values.browser || (saver && !values.terminal && screen)) return serve(picked.length ? picked : entries, { ...settings, dwell: dwell ?? 90 });

  if (!tty()) {
    // a pipe or a log: the first frame of each, as text
    if (!picked.length) return void process.stdout.write(entries.map((e) => e.slug).join("\n") + "\n");
    for (const e of picked) process.stdout.write(still(e) + "\n\n");
    return;
  }
  const app = new App(everything, shown, settings);
  await (picked.length ? app.play(picked, saver) : app.menu());
}

main().then(
  () => process.exit(0),
  (e: unknown) => {
    process.stderr.write(e instanceof Usage ? `ahoy: ${e.message}\n` : `ahoy: ${(e as Error)?.stack ?? e}\n`);
    process.exit(e instanceof Usage ? 2 : 1);
  },
);
