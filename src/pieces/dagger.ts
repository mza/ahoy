/*
 * dagger: a dagger stuck point-down through the ace of spades. A drop of red
 * wells up at the point and runs down the card and off it; then the dagger is
 * plucked out and thrown again, and quivers where it lands.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours, the card shaded down its right-hand edge.
 * Black gaps keep the shapes apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "dagger",
  category: "scenes",
  note: "a dagger quivering in the ace of spades, a red drop running down",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // steel, hilt gold, the card's shade and its bone, blood red
  palette: ["#8a94a6", "#f2b632", "#bdb6a6", "#e8e2d0", "#e23a2e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const IRON = 1, GOLD = 2, DIM = 3, BONE = 4, RED = 5;

const set = (p: Uint8Array, x: number, y: number, k: number) => {
  x = Math.round(x), y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) p[y * W + x] = k;
};
const rect = (p: Uint8Array, x: number, y: number, w: number, h: number, k: number) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(p, x + i, y + j, k);
};
const disc = (p: Uint8Array, cx: number, cy: number, rx: number, ry: number, k: number) => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) set(p, x, y, k);
};
// Rows of characters as pixels `scale` across: "." leaves the pixel alone, "_" empties it, others are looked up in `keys`.
const sprite = (p: Uint8Array, x: number, y: number, rows: string[], keys: Record<string, number>, scale = 1) => {
  rows.forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c !== ".") rect(p, x + i * scale, y + j * scale, scale, scale, c === "_" ? 0 : keys[c]);
    }),
  );
};
// The right-hand edges of one ink in another, as if lit from the left.
const shade = (p: Uint8Array, ink: number, dark: number) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[y * W + x] === ink && (x === W - 1 || !p[y * W + x + 1])) p[y * W + x] = dark;
};
// The canvas as half blocks. A cell has one ink: where its two pixels differ, the one further down the palette.
const emit = (p: Uint8Array, color?: Uint8Array) => {
  const out: string[] = [];
  for (let y = 0; y < meta.rows; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      const a = p[2 * y * W + x], b = p[(2 * y + 1) * W + x];
      row += a && b ? "█" : a ? "▀" : b ? "▄" : " ";
      if (color) color[y * W + x] = Math.max(a, b, 1) - 1;
    }
    out.push(row);
  }
  return out.join("\n");
};

// ---- the card and the dagger

const MID = 40; // the dagger's middle column, and the card's
const POINT = 38; // the row the dagger's point comes down to
const SPADE = [
  ".......#.......",
  ".......#.......",
  "......###......",
  ".....#####.....",
  "....#######....",
  "...#########...",
  "..###########..",
  ".#############.",
  "###############",
  "###############",
  "###############",
  "###############",
  ".#####.#.#####.",
  "..###..#..###..",
  "......###......",
  ".....#####.....",
];
const ACE = ["..#..", ".#.#.", "#...#", "#...#", "#####", "#...#", "#...#"];
const PIP = ["..#..", ".###.", "#####", "#####", "#.#.#", ".###."];
const cut = (rows: string[]) => rows.map((r) => r.replaceAll("#", "_"));
const turned = (rows: string[]) => [...rows].reverse().map((r) => [...r].reverse().join(""));
// The dagger is out of the card from PLUCK, lands again at LAND, and has stopped quivering by the end.
const WELL = 0.5, RUN = 2.7, PLUCK = 3.3, THROW = 3.7, LAND = 3.8, LOOP = 5;

export default function dagger(): Frame {
  // the card: bone, its corners rounded, with the ace, its pips and the spade cut out of it
  const card = new Uint8Array(W * H);
  rect(card, 25, 24, 31, 39, BONE);
  for (const x of [25, 55]) for (const y of [24, 62]) set(card, x, y, 0);
  shade(card, BONE, DIM);
  rect(card, 26, 62, 29, 1, DIM);
  sprite(card, MID - 7, 43, cut(SPADE), {});
  sprite(card, 27, 26, cut(ACE), {});
  sprite(card, 27, 34, cut(PIP), {});
  sprite(card, 49, 54, cut(turned(ACE)), {});
  sprite(card, 49, 47, cut(turned(PIP)), {});

  // the dagger, upright: a pommel, a wire-bound grip, a guard with its ends turned down, and the blade
  const knife = new Uint8Array(W * H);
  disc(knife, MID, 2.5, 3.6, 3.4, GOLD);
  rect(knife, MID - 2, 7, 5, 7, GOLD);
  for (const y of [9, 11]) rect(knife, MID - 2, y, 5, 1, 0);
  rect(knife, MID - 10, 14, 21, 2, GOLD);
  for (const s of [-1, 1]) {
    rect(knife, MID + s * 10, 15, 1, 3, GOLD);
    set(knife, MID + s * 11, 14, GOLD);
  }
  // seven pixels broad, a shine down one side and a fuller down the middle, narrowing to the point
  for (let y = 17; y <= POINT; y++) {
    const half = Math.min(3, Math.floor((POINT - y) / 2));
    rect(knife, MID - half, y, 2 * half + 1, 1, IRON);
  }
  rect(knife, MID - 2, 18, 1, 14, BONE);
  rect(knife, MID, 19, 1, 12, 0);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    p.set(card);

    // the drop: it wells up under the point, then runs down, a black line either side of it, and falls off the card
    if (u < WELL) {
      const big = u < WELL / 2 ? 0 : 1;
      rect(p, MID - 1 - big, 40, 3 + 2 * big, 3 + big, 0);
      rect(p, MID - big, 40, 1 + 2 * big, 2 + big, RED);
      set(p, MID, 40, RED);
    } else if (u < PLUCK) {
      const head = 42 + Math.round((Math.min(u - WELL, RUN - WELL) / (RUN - WELL)) * 26), end = Math.min(head, 62);
      rect(p, MID - 1, 40, 3, end - 39, 0);
      rect(p, MID, 40, 1, end - 39, RED);
      if (head < H + 3) {
        rect(p, MID - 2, head - 2, 5, 5, 0);
        rect(p, MID - 1, head - 1, 3, 3, RED);
        set(p, MID, head - 2, RED);
        if (head > 63) rect(p, MID - 2, 63, 5, head - 64, 0);
      }
    }

    // the dagger: plucked out upwards, thrown back in, and quivering about its point
    let dy = 0, lean = 0;
    if (u >= PLUCK && u < THROW) dy = -Math.round(70 * Math.min(1, (u - PLUCK) / 0.2) ** 2);
    else if (u >= THROW && u < LAND) dy = -Math.round(46 * (1 - (u - THROW) / (LAND - THROW)));
    else if (u >= LAND) lean = Math.round(5 * Math.exp(-2.6 * (u - LAND)) * Math.cos(2 * Math.PI * 4.5 * (u - LAND)));
    for (let pass = 0; pass < 2; pass++)
      for (let y = 0; y <= POINT; y++) {
        const dx = Math.round((lean * (POINT - y)) / POINT);
        for (let x = 0; x < W; x++) {
          const k = knife[y * W + x];
          if (pass) k && set(p, x + dx, y + dy, k);
          else if (k || (x === MID && y >= 19 && y < 31)) rect(p, x + dx - 1, y + dy - 1, 3, 3, 0);
        }
      }
    return emit(p, color);
  };
}
