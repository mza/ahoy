#!/usr/bin/env node
/*
 * ahoy: ascii art in your terminal.
 *
 *   ahoy                     pick a piece from a list, each one playing as you go
 *   ahoy <piece>...          play pieces full screen
 *   ahoy saver [what]...     a screensaver: every piece, or the ones you name
 *   ahoy list                every piece, by group
 */
import process from "node:process";
import { parseArgs } from "node:util";
import pkg from "../package.json" with { type: "json" };
import { App, still, tty } from "./app.ts";
import { catalog, DEFAULT_SAVER, listed, OWN, select } from "./catalog.ts";

const HELP = `ahoy ${pkg.version}: ascii art in your terminal

  ahoy                      pick a piece; the one under the cursor plays beside the list
  ahoy <piece>...           play pieces full screen (←/→ to move between them)
  ahoy saver [what]...      screensaver; rotates through every piece, or the ones you name
  ahoy list                 every piece, by group

  what: a piece (galleon), a group (pirate, aws) or all, separated by spaces or
        commas. The screensaver plays all of them by default.

  ahoy lists its own pirate pack and the AWS logo. With --all it lists the whole
  ascii.rest library too (https://ascii.rest), and its pieces and groups (scenes,
  logos, ...) can be named either way.

  -d, --dwell <seconds>     seconds a screensaver shows each piece (default 15)
  -s, --shuffle             screensaver in a random order
  -m, --mono                coloured pieces in the terminal's own colour
  -l, --light               for a light terminal
  -a, --all                 list the ascii.rest library too
  -h, --help                this help
  -v, --version             the version

  keys: ←/→ skip · space pause · ,/. a frame back or on · m mono · t light/dark
        q back or quit · in the picker, x marks pieces for s, the screensaver

  ahoy saver
  ahoy saver --shuffle --dwell 10
  ahoy saver galleon,kraken,aws
  ahoy saver pirate scenes --all
  ahoy kraken
`;

class Usage extends Error {}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      dwell: { type: "string", short: "d" },
      shuffle: { type: "boolean", short: "s" },
      mono: { type: "boolean", short: "m" },
      light: { type: "boolean", short: "l" },
      all: { type: "boolean", short: "a" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });
  if (values.help) return void process.stdout.write(HELP);
  if (values.version) return void console.log(pkg.version);
  const dwell = values.dwell === undefined ? 15 : Number(values.dwell);
  if (!(dwell > 0)) throw new Usage(`--dwell takes a number of seconds above 0, not "${values.dwell}"`);
  const settings = { dwell, shuffle: !!values.shuffle, mono: !!values.mono, light: !!values.light };

  const everything = await catalog();
  const entries = listed(everything, !!values.all);
  const [command, ...rest] = positionals;

  if (command === "list") {
    const groups = [...new Set(entries.map((e) => e.pack))];
    for (const g of groups) {
      const here = entries.filter((e) => e.pack === g);
      console.log(`${g}${OWN.includes(g) ? " (ahoy)" : ""}: ${here.length}`);
      for (const e of here) console.log(`  ${e.slug.padEnd(22)} ${e.piece.meta.note}`);
    }
    return;
  }

  const saver = command === "saver" || command === "screensaver";
  const words = saver ? (rest.length ? rest : [DEFAULT_SAVER]) : positionals;
  const { picked, unknown } = select(everything, words, !!values.all);
  if (unknown.length) throw new Usage(`no piece or group named ${unknown.map((w) => `"${w}"`).join(", ")}; see ahoy list --all`);

  if (!tty()) {
    // a pipe or a log: the first frame of each, as text
    if (!picked.length) return void process.stdout.write(entries.map((e) => e.slug).join("\n") + "\n");
    for (const e of picked) process.stdout.write(still(e) + "\n\n");
    return;
  }
  const app = new App(entries, settings);
  await (picked.length ? app.play(picked, saver) : app.menu());
}

main().then(
  () => process.exit(0),
  (e: unknown) => {
    process.stderr.write(e instanceof Usage ? `ahoy: ${e.message}\n` : `ahoy: ${(e as Error)?.stack ?? e}\n`);
    process.exit(e instanceof Usage ? 2 : 1);
  },
);
