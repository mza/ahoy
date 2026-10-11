/*
 * dagger: a dagger stuck point-down through the ace of spades. A drop of red
 * wells up at the point and runs down the card and off it; then the dagger is
 * plucked out and thrown again, and quivers where it lands.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat colours.
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
  // steel, hilt gold, the card's bone, blood red
  palette: ["#8a94a6", "#f2b632", "#e8e2d0", "#e23a2e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const IRON = 1, GOLD = 2, BONE = 3, RED = 4;

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

const POINT = 33; // the row the dagger's point comes down to
const SPADE = [
  "....#....",
  "...###...",
  "..#####..",
  ".#######.",
  "#########",
  "#########",
  "#########",
  ".##.#.##.",
  "....#....",
  "...###...",
];
const ACE = [".#.", "#.#", "###", "#.#", "#.#"];
const cut = (rows: string[]) => rows.map((r) => r.replaceAll("#", "_"));
// The dagger is out of the card from PLUCK, lands again at LAND, and has stopped quivering by the end.
const WELL = 0.5, RUN = 2.7, PLUCK = 3.3, THROW = 3.7, LAND = 3.8, LOOP = 5;

export default function dagger(): Frame {
  // the card: bone, with the ace and the spade cut out of it
  const card = new Uint8Array(W * H);
  rect(card, 21, 20, 38, 42, BONE);
  for (const [x, y] of [[21, 20], [58, 20], [21, 61], [58, 61]]) set(card, x, y, 0);
  sprite(card, 31, 40, cut(SPADE), {}, 2);
  sprite(card, 24, 23, cut(ACE), {}, 2);
  sprite(card, 50, 49, cut([...ACE].reverse()), {}, 2);

  // the dagger, upright: pommel, bound grip, guard, and a blade with a shine down it
  const knife = new Uint8Array(W * H);
  disc(knife, 39.5, 2.5, 3.6, 3.4, GOLD);
  rect(knife, 37, 6, 6, 6, GOLD);
  rect(knife, 37, 7, 6, 1, 0);
  rect(knife, 37, 9, 6, 1, 0);
  rect(knife, 30, 12, 20, 3, GOLD);
  rect(knife, 30, 15, 2, 1, GOLD);
  rect(knife, 48, 15, 2, 1, GOLD);
  for (let y = 16; y <= POINT; y++) {
    const w = Math.min(8, 2 * Math.ceil((POINT + 1 - y) / 2));
    rect(knife, 40 - w / 2, y, w, 1, IRON);
  }
  rect(knife, 38, 18, 2, 8, BONE);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    p.set(card);

    // the drop: it wells up, then runs down from under the point, a black line either side of it, and falls off the card
    if (u < WELL) {
      rect(p, 38, 35, 4, 4, 0);
      rect(p, 39, 36, 2, 2, RED);
    } else if (u < PLUCK) {
      const head = 37 + Math.round((Math.min(u - WELL, RUN - WELL) / (RUN - WELL)) * 32), end = Math.min(head, 61);
      rect(p, 38, 36, 4, end - 35, 0);
      rect(p, 39, 36, 2, end - 35, RED);
      if (head < H + 3) {
        rect(p, 37, head - 2, 6, 6, 0);
        rect(p, 38, head - 1, 4, 4, RED);
        if (head > 62) rect(p, 37, 62, 6, head - 63, 0);
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
          if (!k) continue;
          if (pass) set(p, x + dx, y + dy, k);
          else rect(p, x + dx - 2, y + dy - 2, 5, 5, 0);
        }
      }
    return emit(p, color);
  };
}
