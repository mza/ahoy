/*
 * ahoy: AHOY! in chunky arcade letters under a skull and crossbones. Now and
 * then the letters hop off their drop shadow one after another, like a wave
 * running through them, and the skull winks.
 *
 * The letters and the skull are pixel bitmaps drawn two pixels to a cell with
 * half blocks, so a pixel is about square.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "ahoy",
  category: "type",
  note: "ahoy! in chunky arcade letters, hopping under a winking skull",
  cols: 78,
  rows: 23,
  fps: 20,
} satisfies Meta;

const SKULL = [
  "...##..........................##...",
  "..###.........########.........###..",
  "..###........##########........###..",
  ".######....##############....######.",
  ".########..##############..########.",
  ".###.####.################.####.###.",
  ".......##.################.##.......",
  "..........###...####...###..........",
  "..........##.....##.....##..........",
  "..........##.....##.....##..........",
  "..........###...####...###..........",
  "...........######..######...........",
  ".........#.##############.#.........",
  ".......####.############.####.......",
  ".###.######.#.##.##.##.#.######.###.",
  ".########....##########....########.",
  ".######........######........######.",
  "..###..........................###..",
  "..###..........................###..",
  "...##..........................##...",
];
// The skull's right eye (the viewer's), shut to a slit for the wink.
const WINK: [number, number][] = [];
for (let y = 7; y <= 10; y++) for (let x = 19; x <= 24; x++) if (y !== 9 && SKULL[y][x] === ".") WINK.push([x, y]);

const STEM = "#####....#####";
const A = ["....######....", "..##########..", ".############.", ...Array(5).fill(STEM), ...Array(3).fill("#".repeat(14)), ...Array(5).fill(STEM)];
const H = [...Array(8).fill(STEM), ...Array(3).fill("#".repeat(14)), ...Array(5).fill(STEM)];
const O = [...A.slice(0, 3), ...Array(10).fill(STEM), ".############.", "..##########..", "....######...."];
const Y = [...Array(5).fill(STEM), ".#####..#####.", "..##########..", "...########...", ...Array(8).fill("....######....")];
const BANG = [...Array(10).fill("#####"), ".###.", ".....", ".....", ".....", "#####", "#####"];
const WORD = [A, H, O, Y, BANG];
const GAP = 3;

const LOOP = 4;
const TOP = 26; // the letters' top pixel row
const HOP = 4; // pixels a letter rises
const HOPS = 0.4, STAGGER = 0.12, AIR = 0.55; // when the wave starts, the delay letter to letter, and each hop's length
const BLINK: [number, number] = [2.4, 2.9];
// A sparkle off the corner of the O and of the !: when it starts, and where.
const SPARKS: [number, number, number][] = [[3, 44, 12], [3.25, 73, 12]];
const TWINKLE = ".+*+.";

export default function ahoy(): Frame {
  const { cols, rows } = meta;
  const ph = rows * 2;
  const width = WORD.reduce((n, g) => n + g[0].length, 0) + GAP * (WORD.length - 1);
  const left = Math.floor((cols - width - 2) / 2);
  const xs: number[] = [];
  WORD.reduce((x, g) => (xs.push(x), x + g[0].length + GAP), left);
  const sx = Math.floor((cols - SKULL[0].length) / 2);
  // The shadow never moves: a letter hopping up shows it whole.
  const shade = new Uint8Array(cols * ph);
  WORD.forEach((g, i) =>
    g.forEach((line, j) => {
      for (let k = 0; k < line.length; k++)
        if (line[k] === "#") for (const d of [1, 2]) shade[(TOP + j + d) * cols + xs[i] + k + d] = 1;
    }),
  );
  const ink = new Uint8Array(cols * ph);

  return (t, { paper = false } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    ink.fill(0);
    SKULL.forEach((line, j) => {
      for (let k = 0; k < line.length; k++) if (line[k] === "#") ink[(2 + j) * cols + sx + k] = 1;
    });
    if (u >= BLINK[0] && u < BLINK[1]) for (const [x, y] of WINK) ink[(2 + y) * cols + sx + x] = 1;
    WORD.forEach((g, i) => {
      const s = (u - HOPS - i * STAGGER) / AIR;
      const up = s > 0 && s < 1 ? Math.round(HOP * Math.sin(Math.PI * s)) : 0;
      g.forEach((line, j) => {
        for (let k = 0; k < line.length; k++) if (line[k] === "#") ink[(TOP + j - up) * cols + xs[i] + k] = 1;
      });
    });
    const shadow = paper ? "▒" : "░";
    const out: string[] = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) {
        const a = ink[2 * r * cols + c], b = ink[(2 * r + 1) * cols + c];
        line += a && b ? "█" : a ? "▀" : b ? "▄" : shade[2 * r * cols + c] || shade[(2 * r + 1) * cols + c] ? shadow : " ";
      }
      out.push(line);
    }
    for (const [at, x, y] of SPARKS) {
      const k = Math.floor(((u - at) / 0.6) * TWINKLE.length);
      if (k >= 0 && k < TWINKLE.length) out[y] = out[y].slice(0, x) + TWINKLE[k] + out[y].slice(x + 1);
    }
    return out.join("\n");
  };
}
