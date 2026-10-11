/*
 * davy-jones-locker: the bottom of the sea, where drowned sailors and their
 * treasure go. An iron-bound sea chest lies half sunk in the sand with an
 * anchor standing behind it, and bubbles slip out of the keyhole under its
 * skull lock and rise through the faint light from the surface. Kelp sways,
 * and now and then a fish swims by.
 *
 * The chest and the anchor are drawn as shapes and sampled three by four in
 * each cell: a cell they fill takes their texture, and a cell on their edge
 * takes the character whose shape matches the edge through it.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "davy jones' locker",
  category: "scenes",
  note: "a sunken chest on the sea floor, bubbles rising from its keyhole",
  cols: 80,
  rows: 32,
  fps: 15,
  ground: "#000000",
  // bone, its middle and its dark, then the sea's light from bright to faint
  palette: ["#ece6d6", "#aaa494", "#5e5a50", "#8af0ff", "#36b8d4", "#187088", "#0c3a48"],
} satisfies Meta;

const BONE = 0, MID = 1, DARK = 2, BRIGHT = 3, CYAN = 4, DIM = 5, FAINT = 6;
const LOOP = 8;
const W = 2 * Math.PI / LOOP;

// Materials, in what a sample point can be.
// (3 and 7 are unused)
const NONE = 0, SAND = 1, HOLE = 2, BAND = 4, LID = 5, WOOD = 6, ANCHOR = 8, SEAM = 9;

const sandTop = (u: number) => 57 + 1.4 * Math.sin(u * 0.11 + 0.5) + 0.8 * Math.sin(u * 0.29 + 2);

// The chest: x across from its middle, y down from its lid's seam.
function chest(u: number, v: number) {
  const x = u - 40, y = v - 40;
  const inBody = Math.abs(x) < 20 && y >= 0 && y < 20;
  const inLid = y < 0 && (x / 20) ** 2 + (y / 10) ** 2 < 1;
  if (!inBody && !inLid) return NONE;
  if (Math.abs(y - 1) < 0.9) return SEAM;
  if (Math.abs(Math.abs(x) - 13.5) < 0.45) return BAND;
  return inLid ? LID : WOOD;
}

// The anchor stands behind it all: its ring and stock above the chest, its arms reaching up either side of it.
function anchor(u: number, v: number) {
  const dx = u - 40;
  if (Math.abs(dx) < 1.7 && v > 11 && v < 60) return ANCHOR;
  const ring = Math.hypot(dx, v - 7);
  if (ring < 3.8 && ring > 2.1) return ANCHOR;
  if ((Math.abs(v - 13.5) < 1.3 && Math.abs(dx) < 16) || Math.hypot(Math.abs(dx) - 16, v - 13.5) < 1.9) return ANCHOR;
  if (v > 37 && Math.abs(Math.hypot(dx, v - 37) - 24) < 1.7) return ANCHOR;
  // the flukes at the arms' tips
  if (v > 28 && v < 38 && Math.abs(Math.abs(dx) - 24) < (v - 28) * 0.5) return ANCHOR;
  return NONE;
}

const at = (u: number, v: number): number => {
  if (v > sandTop(u)) return SAND;
  return chest(u, v) || anchor(u, v);
};

// Each cell's shape as 12 samples, three across and four down, and the character that best matches it.
const TEMPLATES: [string, string][] = [
  ["_", "000000000555"], [".", "000000000050"], ["'", "050000000000"], ['"', "555000000000"],
  ["p", "000059599999"], ["q", "000950995999"], ["P", "999999995950"], ["Y", "999999599059"],
  ["d", "399399399399"], ["b", "993993993993"], ["|", "090090090090"], ["/", "009059590900"],
  ["\\", "900950095009"], [",", "000000005059"], ["o", "000000999999"], ["9", "999999999000"],
];
const SHAPE: string[] = [];
for (let bits = 0; bits < 4096; bits++) {
  let best = " ", err = Infinity;
  for (const [c, t] of TEMPLATES) {
    let e = 0;
    for (let i = 0; i < 12; i++) e += (((bits >> i) & 1) - +t[i] / 9) ** 2;
    if (e < err) (err = e), (best = c);
  }
  SHAPE[bits] = bits === 4095 ? "8" : bits === 0 ? " " : best;
}

const hash = (x: number, y: number) => {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h ^= h >>> 13;
  return ((Math.imul(h, 1103515245) >>> 0) % 1000) / 1000;
};

// How each material fills a cell it covers, and in which colour.
function fill(m: number, x: number, y: number, depth: number): [string, number] {
  switch (m) {
    case SAND: {
      const r = hash(x, y);
      return [r < 0.12 ? "." : r < 0.17 ? "," : r < 0.2 ? "`" : " ", DARK];
    }
    case BAND: return ["║", BONE];
    case SEAM: return ["═", BONE];
    case LID: return ["#", DARK];
    case WOOD: return ["#", DARK];
    case ANCHOR: return ["8", MID];
  }
  return [" ", BONE];
}
const COLOUR = [BONE, MID, BONE, MID, BONE, MID, MID, BONE, MID, BONE];

export default function davyJonesLocker(): Frame {
  const { cols, rows } = meta;
  const n = cols * rows;
  // the sea floor and what lies on it never move
  const ch = new Array<string>(n).fill(" "), ink = new Uint8Array(n), solid = new Uint8Array(n);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const count = new Array<number>(10).fill(0);
      let bits = 0, sandCover = 0;
      for (let j = 0; j < 4; j++)
        for (let i = 0; i < 3; i++) {
          const u = x + (i + 0.5) / 3, v = (y + (j + 0.5) / 4) * 2;
          const m = at(u, v);
          count[m]++;
          if (m !== NONE && m !== HOLE) bits |= 1 << (j * 3 + i);
          if (m === SAND) sandCover++;
        }
      let m = NONE;
      // the iron bands are thin, so a cell they cross at all is theirs
      const weigh = (k: number) => count[k] * (k === SAND ? 6 : k === BAND || k === SEAM ? 4 : 1);
      for (let k = 1; k < 10; k++) if (k !== HOLE && weigh(k) > (m ? weigh(m) : 0)) m = k;
      const k = y * cols + x;
      if (!m) {
        if (count[HOLE] >= 6) (solid[k] = 1), (ch[k] = " ");
        continue;
      }
      solid[k] = 1;
      if (m === SAND && sandCover < 12) {
        // the sand's top: lower in the cell, the flatter the stroke
        const c = sandCover / 12;
        ch[k] = c < 0.3 ? "_" : c < 0.6 ? "-" : "~";
        ink[k] = MID;
        continue;
      }
      const [f, colour] = fill(m, x, y, (y + 1) * 2 - sandTop(x + 0.5));
      ch[k] = bits === 4095 ? f : SHAPE[bits];
      ink[k] = bits === 4095 ? colour : COLOUR[m];
      if (m === LID && bits !== 4095) ink[k] = CYAN;
    }
  // a half fill takes the side of its run it is on
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const k = y * cols + x, c = ch[k];
      if (c !== "o" && c !== "9") continue;
      const left = x === 0 || ch[k - 1] === " ", right = x === cols - 1 || ch[k + 1] === " ";
      ch[k] = c === "o" ? (left ? "p" : right ? "q" : "8") : left ? "Y" : right ? "P" : '"';
    }

  // the lock: a plate with a skull on it, and the keyhole under the skull
  const LOCK = ["╭───────╮", "│ .-\"-. │", "│( o o )│", "│ \\ ^ / │", "│  [ ]  │", "╰───────╯"];
  const LX = 36, LY = 18;
  LOCK.forEach((line, j) =>
    [...line].forEach((c, i) => {
      const k = (LY + j) * cols + LX + i;
      ch[k] = c;
      ink[k] = "╭╮╰╯─│".includes(c) ? MID : BONE;
      solid[k] = 1;
    }),
  );
  const keyhole = [LX + 4, LY + 4];

  const KELP: [number, number, number][] = [[5, 34, 0], [10, 22, 2.1], [75, 30, 3.3]];
  const BUBBLES = 8;

  return (t, { color } = {}) => {
    const out = ch.slice(), col = ink.slice();
    const put = (x: number, y: number, c: string, i: number, over = false) => {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return;
      const k = y * cols + x;
      if (solid[k] && !over) return;
      out[k] = c;
      col[k] = i;
    };
    // the light from the surface, a fan of rays from above that fades with depth
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const k = y * cols + x;
        if (solid[k]) continue;
        const v = y * 2 + 1, u = x + 0.5;
        if (y === 0) {
          out[k] = (x + Math.floor(t * 2)) % 4 === 0 ? "~" : "-";
          col[k] = DIM;
          continue;
        }
        const angle = Math.atan2(u - 40, v + 14), fade = 1 - v / 60;
        const ray = Math.max(0, Math.sin(angle * 11 + 0.7 * Math.sin(t * W) + 0.3 * Math.sin(2 * t * W + angle * 4)));
        const i = ray ** 12 * fade;
        out[k] = i > 0.35 && hash(x, y) < 0.45 ? "." : " ";
        col[k] = FAINT;
      }
    // kelp, swaying more the higher it grows
    for (const [bx, h, ph] of KELP) {
      const base = Math.floor(sandTop(bx) / 2);
      for (let r = 0; r < h / 2; r++) {
        const sway = 2.2 * (r / (h / 2)) ** 1.3 * Math.sin(t * W + r * 0.4 + ph);
        put(Math.round(bx + sway), base - r, (r + Math.round(ph)) % 2 ? "(" : ")", r > h / 2 - 3 ? CYAN : DIM);
      }
    }
    // a fish going by
    const fx = Math.floor(-8 + 96 * ((t / LOOP) % 1));
    [..."><(((°>"].forEach((c, i) => put(fx + i, 3, c, CYAN));
    // the keyhole glows, and lets out a bubble every second
    put(keyhole[0], keyhole[1], Math.floor(t * 3) % 2 ? "·" : "°", BRIGHT, true);
    // the skull's eyes catch the glow now and then
    const glint = Math.sin(t * W * 2) > 0.7;
    put(keyhole[0] - 1, keyhole[1] - 2, "o", glint ? CYAN : BONE, true);
    put(keyhole[0] + 1, keyhole[1] - 2, "o", glint ? CYAN : BONE, true);
    for (let b = 0; b < BUBBLES; b++) {
      const age = (((t - b) % LOOP) + LOOP) % LOOP;
      if (age > 6) continue;
      // out of the lock's top, as if from the keyhole within
      const y = Math.round(LY - 1 - age * 3.6), x = Math.round(keyhole[0] + 1.4 * Math.sin(age * 2.6 + b));
      put(x, y, age < 0.6 ? "." : age < 2 ? "o" : age < 4 ? "O" : "°", age < 4 ? BRIGHT : CYAN, true);
    }
    if (color) color.set(col);
    const lines: string[] = [];
    for (let y = 0; y < rows; y++) lines.push(out.slice(y * cols, (y + 1) * cols).join(""));
    return lines.join("\n");
  };
}
