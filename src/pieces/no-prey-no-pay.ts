/*
 * no-prey-no-pay: the pirate articles' motto as a terminal wordmark, NO PREY
 * over NO PAY in a shadowed block face under a skull and crossbones drawn the
 * same way. A scan line runs down it now and then, the skull's eyes smoulder,
 * and every so often the letters scramble into stray glyphs and decode back,
 * one column after another, while the line under them types itself out.
 *
 * "No prey, no pay" was the rule of the pirate articles: a crew took shares of
 * what they took, and nothing else.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "no prey no pay",
  category: "scenes",
  note: "the pirate articles' motto as a terminal wordmark, decoding",
  cols: 80,
  rows: 30,
  fps: 20,
  ground: "#000000",
  // bone, its shadow and its glare; blood, its shadow and its glare; the line under it; the eyes
  palette: ["#ece6d6", "#6f6a5f", "#ffffff", "#e4262f", "#7c171c", "#ff5c61", "#5a5a5a", "#ff2b2b"],
} satisfies Meta;

const BONE = 0, BONE_SHADOW = 1, BONE_GLARE = 2, RED = 3, RED_SHADOW = 4, RED_GLARE = 5, DIM = 6, EYE = 7;

// The skull and crossbones, in the same shadowed blocks as the letters.
const EMBLEM = `
    ██╗                                       ██╗
  █████╗             ██████████╗             █████╗
  ██╔══████╗      ████████████████╗      ████╔══██║
  ╚═╝  ╚═══███╗  ██████████████████╗  ███╔═══╝  ╚═╝
           ╚══╝ ████████████████████╗ ╚══╝
                █████╔══████╔══█████║
                █████║  ████║  █████║
                █████║  ████║  █████║
                █████████╔═█████████║
            ██╗ ╚████████║ ████████╔╝ ██╗
   ██╗  ████╔═╝  ╚████████████████╔╝  ╚═████╗  ██╗
   █████╔═══╝     ╚██╗██╗██╗██╗██╔╝     ╚═══█████║
   ╚═██╔╝          ╚═════════════╝          ╚██╔═╝
     ╚═╝                                     ╚═╝
`.slice(1, -1).split("\n");

// A shadowed block face: each letter six rows, the blocks casting box-drawing shadows.
const FONT: Record<string, string[]> = {
  N: ["███╗   ██╗", "████╗  ██║", "██╔██╗ ██║", "██║╚██╗██║", "██║ ╚████║", "╚═╝  ╚═══╝"],
  O: [" ██████╗ ", "██╔═══██╗", "██║   ██║", "██║   ██║", "╚██████╔╝", " ╚═════╝ "],
  P: ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔═══╝ ", "██║     ", "╚═╝     "],
  R: ["██████╗ ", "██╔══██╗", "██████╔╝", "██╔══██╗", "██║  ██║", "╚═╝  ╚═╝"],
  E: ["███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "███████╗", "╚══════╝"],
  Y: ["██╗   ██╗", "╚██╗ ██╔╝", " ╚████╔╝ ", "  ╚██╔╝  ", "   ██║   ", "   ╚═╝   "],
  A: [" █████╗ ", "██╔══██╗", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"],
  " ": ["  ", "  ", "  ", "  ", "  ", "  "],
};
const TAG = "~ the articles of the brethren ~";

const LOOP = 10;
const SCAN = [0.8, 2.6]; // seconds the scan line takes to run down
const DECODE = 5.5; // seconds in, when the letters scramble
const GLYPHS = "#$%&@*+=<>?/|~^01:;";

const word = (w: string) =>
  Array.from({ length: 6 }, (_, r) => [...w].map((c) => FONT[c][r]).join(" "));

// a hash of a few integers, 0 to 1
const hash = (a: number, b: number, c = 0) => {
  let h = Math.imul(a * 374761393 + b * 668265263 + c * 2147483647, 1274126177);
  h ^= h >>> 13;
  h = Math.imul(h, 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export default function noPreyNoPay(): Frame {
  const { cols, rows } = meta;
  const ch: string[] = new Array(cols * rows).fill(" ");
  const ink = new Uint8Array(cols * rows);
  // which cells belong to the letters, and when each scrambles out and decodes back
  const letter = new Uint8Array(cols * rows);
  const out = new Float32Array(cols * rows), back = new Float32Array(cols * rows);
  const eyes: number[] = [];
  const put = (lines: string[], top: number, bright: number, shadow: number, isLetter: boolean) => {
    const w = Math.max(...lines.map((l) => [...l].length)), left = (cols - w) >> 1;
    lines.forEach((line, y) =>
      [...line].forEach((c, x) => {
        const k = (top + y) * cols + left + x;
        ch[k] = c;
        ink[k] = c === "█" ? bright : shadow;
        if (isLetter && c !== " ") letter[k] = 1;
      }),
    );
    return left;
  };
  const left = put(EMBLEM, 0, BONE, BONE_SHADOW, false);
  // the eyes: the cells left open inside the skull, where the sockets are
  for (const y of [6, 7]) {
    const row = EMBLEM[y], a = row.indexOf("█", 14), b = row.lastIndexOf("█", 37);
    for (let x = a; x < b; x++) if (row[x] === " ") eyes.push(y * cols + left + x);
  }
  put(word("NO PREY"), 15, BONE, BONE_SHADOW, true);
  put(word("NO PAY"), 22, RED, RED_SHADOW, true);
  const tagLeft = (cols - TAG.length - 2) >> 1, tagRow = 29;
  for (let k = 0; k < cols * rows; k++) {
    if (!letter[k] && !(k >= 15 * cols && k < 28 * cols)) continue;
    const x = k % cols, y = Math.floor(k / cols), u = x / cols + 0.12 * ((y - 15) / 12);
    out[k] = DECODE + 0.9 * u + 0.15 * hash(x, y, 1);
    back[k] = DECODE + 1.1 + 1.6 * u + 0.3 * hash(x, y, 2);
  }
  const lineOut = new Array<string>(rows);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, tick = Math.floor(t * 15);
    // the scan line's row, or none
    const scan = u >= SCAN[0] && u < SCAN[1] ? ((u - SCAN[0]) / (SCAN[1] - SCAN[0])) * (rows + 4) - 2 : -99;
    // the eyes smoulder: a slow glow with a flicker in it
    const glow = 0.55 + 0.35 * Math.sin(u * 2.4) + 0.1 * (hash(tick, 7) - 0.5);
    for (let y = 0; y < rows; y++) {
      let s = "";
      const inScan = Math.abs(y - scan) < 0.8, nearScan = !inScan && Math.abs(y - scan) < 1.8;
      for (let x = 0; x < cols; x++) {
        const k = y * cols + x;
        let c = ch[k], i = ink[k];
        if ((letter[k] || (y >= 15 && y < 28)) && out[k] && u >= out[k] && u < back[k]) {
          // scrambled: a stray glyph where a letter was, and now and then where none was
          if (letter[k] || hash(x, y, 3) < 0.05) {
            c = GLYPHS[Math.floor(hash(x, y, tick) * GLYPHS.length)];
            i = y < 22 ? BONE_SHADOW : RED_SHADOW;
          }
        }
        if (eyes.includes(k)) (c = glow > 0.75 ? "█" : glow > 0.45 ? "▓" : "▒"), (i = EYE);
        if (c !== " " && inScan) {
          if (c === "█") c = "▓";
          i = i === RED || i === RED_SHADOW ? RED_GLARE : i === EYE ? EYE : BONE_GLARE;
        } else if (c === "█" && nearScan) c = "▓";
        if (color) color[k] = i;
        s += c;
      }
      lineOut[y] = s;
    }
    // the line under it types itself out after the letters decode, and a cursor blinks at its end
    const typed = u >= DECODE && u < DECODE + 3.2 ? Math.max(0, Math.floor((u - DECODE - 1.0) * 20)) : TAG.length;
    const text = TAG.slice(0, Math.min(TAG.length, typed));
    const cursor = Math.floor(t / 0.4) % 2 === 0 ? "█" : " ";
    const tag = (text + " " + cursor).padEnd(TAG.length + 2);
    lineOut[tagRow] = " ".repeat(tagLeft) + tag + " ".repeat(cols - tagLeft - tag.length);
    if (color)
      for (let x = 0; x < cols; x++) color[tagRow * cols + x] = x - tagLeft === text.length + 1 ? RED : DIM;
    return lineOut.join("\n");
  };
}
