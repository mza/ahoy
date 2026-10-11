/*
 * kraken: a round little kraken in a tricorn, rising out of the sea. Its two
 * big tentacles curl up out of the water at its sides and sway, two small
 * ones poke up in front, its eyes glance about and blink, and the waves roll
 * past below.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "kraken",
  category: "creatures",
  note: "a little kraken in a pirate hat, waving its tentacles out of the sea",
  cols: 63,
  rows: 20,
  fps: 12,
} satisfies Meta;

const LOOP = 6;
const C = 31; // the middle column
const FLIP: Record<string, string> = { "/": "\\", "\\": "/", "(": ")", ")": "(", "<": ">", ">": "<", "`": "'" };
const mirror = (s: string, w: number) => [...s.padEnd(w)].reverse().map((c) => FLIP[c] || c).join("");

// The left half of the tricorn and head, up to the middle column; the right
// half is its mirror.
const HALF = [
  "",
  "                           .-\"\"\"",
  "              /\\         .'  .--",
  "             /  '-.     |   ( o.",
  "             (     '-.__|    >-|",
  "              '-._",
  "                  '--.._________",
  "                  .'",
  "                 /",
  "                |",
  "                |",
  "                |",
  "                |",
  "                 \\",
  "                  '.     '._",
  "                    '.      '---",
];
const HEAD = HALF.map((l) => {
  l = l.padEnd(C + 1);
  return l + mirror(l.slice(0, C), C);
});
const EYE = ["  .---.  ", " / .-. \\ ", "| ( @ ) |", " \\ '-' / ", "  '---'  "];
const PUPILS = ["| (@  ) |", "| ( @ ) |", "| (  @) |"];
const SHUT = ["  .---.  ", " /     \\ ", "|-------|", " \\     / ", "  '---'  "];
const EYES = [21, 33];
// Glances as [start, end, which way], and when it blinks.
const GLANCES: [number, number, number][] = [[1.4, 2.3, -1], [2.9, 3.7, 1]];
const BLINK = 4.6;

// A big tentacle's curled tip, then its shaft: the left edge of each row of
// the shaft, from the tip down to where it leaves the water by the body.
const CURL = ["     ,--.", "    / ,. \\", "   | (  '|", "    \\ '--.\\", "     '-. o \\"];
const SHAFT = [8, 9, 10, 11];
const TOP = 12; // the shaft's first row
// A small tentacle tip poking out of the sea in front, at its two heights.
const TIP = [[" ,-.  ", " \\ o\\ ", "  )o ) "], ["      ", " ,-.  ", " \\ o\\ "]];
const TIPS = [23, 34];
// The sea, a row at a time: a pattern and how many times it rolls past in a loop.
const SEA: [string, number][] = [["~^~~-~~~", 1], ["~~~~~~      ", -1], ["  ~~~~~~        ", 1], ["~~~     ~", -1]];

export default function kraken(): Frame {
  const { cols, rows } = meta;
  const grid = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
  const put = (x: number, y: number, s: string) => {
    for (let i = 0; i < s.length; i++) if (s[i] !== " " && x + i >= 0 && x + i < cols) grid[y][x + i] = s[i];
  };

  // A tentacle swaying as a wave runs up it, more at the tip than the root.
  const tentacle = (phase: number, right: boolean) => {
    const n = SHAFT.length;
    const xs = SHAFT.slice();
    // A row is at most a cell off the one below it, so the shaft never breaks.
    for (let j = n - 2; j >= 0; j--) {
      const x = SHAFT[j] + Math.round(1.2 * Math.sin(phase - j * 0.6) * ((n - 1 - j) / (n - 1)));
      xs[j] = Math.max(xs[j + 1] - 1, Math.min(xs[j + 1] + 1, x));
    }
    const draw = (x: number, y: number, s: string, w: number) => (right ? put(cols - x - w, y, mirror(s, w)) : put(x, y, s));
    for (let j = 0; j < n; j++) {
      const up = j > 0 ? xs[j - 1] - xs[j] : 0;
      draw(xs[j], TOP + j, up > 0 ? "/ o /" : up < 0 ? "\\ o \\" : "| o |", 16);
    }
    CURL.forEach((l, j) => draw(xs[0] - 6, TOP - CURL.length + j, l, 16));
  };

  return (t) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid[r][c] = (HEAD[r] || "")[c] || " ";
    const blink = u >= BLINK && u < BLINK + 0.25;
    let look = 1;
    for (const [a, b, d] of GLANCES) if (u >= a && u < b) look = 1 + d;
    for (const x of EYES) (blink ? SHUT : EYE).forEach((l, j) => put(x, 8 + j, j === 2 && !blink ? PUPILS[look] : l));
    const sway = (u * 2 * Math.PI) / 3;
    tentacle(sway, false);
    tentacle(sway + 2.2, true);
    SEA.forEach(([p, n], j) => {
      const off = Math.floor((u / LOOP) * n * p.length);
      for (let c = 0; c < cols; c++) grid[16 + j][c] = p[(((c + off) % p.length) + p.length) % p.length];
    });
    // The small tips bob up and down, out of step with each other.
    TIPS.forEach((x, i) => {
      const tip = TIP[Math.sin(sway + i * Math.PI) > -0.3 ? 0 : 1];
      // Each row covers the sea from its first mark to its last.
      tip.forEach((l, j) => {
        const s = i ? mirror(l, l.length) : l;
        const a = s.search(/\S/), b = s.trimEnd().length;
        for (let k = a; a >= 0 && k < b; k++) grid[16 + j][x + k] = s[k];
      });
    });
    return grid.map((r) => r.join("")).join("\n");
  };
}
