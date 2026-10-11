/*
 * desert-island: the castaway's island of the cartoons. A little round hump
 * of sand, one leaning palm with a pair of coconuts, a sun low behind it, and
 * the sea in a few scalloped lines. The fronds sway in the breeze and the
 * waves roll past, each line the other way from the one above.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat colours.
 * Sand, sun and trunk are drawn once; the fronds are bent strokes whose tips
 * shift by whole pixels, with black gaps cut where they cross anything.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "desert island",
  category: "scenes",
  note: "a tiny island with one leaning palm, the sun behind, waves lapping",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // sand and sun, the wood of the trunk, palm green, sea blue
  palette: ["#f2b632", "#a8703a", "#4fa35a", "#3a7ca5"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const GOLD = 1, WOOD = 2, GREEN = 3, BLUE = 4;

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
// A bent stroke from a to c, pulled towards b, `thick` pixels across at its root and `thin` at its tip.
const curve = (p: Uint8Array, a: number[], b: number[], c: number[], k: number, thick: number, thin = thick) => {
  for (let i = 0; i <= 80; i++) {
    const u = i / 80, v = 1 - u, w = Math.round(thick + (thin - thick) * u);
    rect(p, Math.round(v * v * a[0] + 2 * v * u * b[0] + u * u * c[0] - w / 2), Math.round(v * v * a[1] + 2 * v * u * b[1] + u * u * c[1] - w / 2), w, w, k);
  }
};
// One canvas laid over another, with a black gap `gap` pixels wide cut round what it carries.
const over = (p: Uint8Array, q: Uint8Array, gap = 2) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (q[y * W + x]) rect(p, x - gap, y - gap, 2 * gap + 1, 2 * gap + 1, 0);
  for (let i = 0; i < q.length; i++) if (q[i]) p[i] = q[i];
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

// ---- the island

const SEA = 50; // the pixel row of the waterline
const CROWN = [50, 17]; // where the fronds spring from
// Each frond: where its tip hangs from the crown, the bend on the way there, and how far the breeze moves the tip.
const FRONDS = [
  { tip: [-20, 5], bend: [-12, -11], sway: [2, 1] },
  { tip: [-13, -10], bend: [-7, -9], sway: [1, 1] },
  { tip: [14, -9], bend: [7, -9], sway: [1, -1] },
  { tip: [21, 7], bend: [13, -10], sway: [2, -1] },
  { tip: [11, 16], bend: [11, 2], sway: [1, 0] },
];
// The sea: for each line of waves its pixel row, how far it reaches either side of the middle, and which way it rolls.
const WAVES = [
  { y: 54, half: 36, dir: 1 },
  { y: 59, half: 29, dir: -1 },
];
const SWELL = 14; // pixels from one crest to the next
const LOOP = 4.2;

export default function desertIsland(): Frame {
  // what never moves: the sun, the hump of sand, the trunk and its coconuts
  const still = new Uint8Array(W * H);
  disc(still, 15, 14, 10, 10, GOLD);
  const land = new Uint8Array(W * H);
  disc(land, 40, SEA, 23, 10, GOLD);
  land.fill(0, SEA * W);
  over(still, land);
  const trunk = new Uint8Array(W * H);
  curve(trunk, [36, 43], [37, 26], CROWN, WOOD, 5, 4);
  over(still, trunk);
  const nuts = new Uint8Array(W * H);
  disc(nuts, CROWN[0] - 3.5, CROWN[1] + 4.5, 2.6, 2.6, WOOD);
  disc(nuts, CROWN[0] + 3.5, CROWN[1] + 5.5, 2.6, 2.6, WOOD);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    // the fronds, their tips riding the breeze a little out of step with one another
    const palm = new Uint8Array(W * H);
    FRONDS.forEach((f, i) => {
      const s = Math.sin((2 * Math.PI * u) / LOOP * 2 + i * 0.9);
      const tip = [CROWN[0] + f.tip[0] + Math.round(f.sway[0] * s), CROWN[1] + f.tip[1] + Math.round(f.sway[1] * s)];
      curve(palm, CROWN, [CROWN[0] + f.bend[0], CROWN[1] + f.bend[1]], tip, GREEN, 4, 2);
    });
    over(p, palm);
    over(p, nuts, 1);
    // the sea: scalloped lines rolling past, and a lap of water at either end of the sand
    const roll = Math.floor((u / LOOP) * SWELL * 2);
    for (const w of WAVES)
      for (let x = 40 - w.half; x < 40 + w.half; x++) {
        const k = (((x - w.dir * roll) % SWELL) + SWELL) % SWELL;
        if (k < 2) continue; // a nick between one wave and the next
        rect(p, x, w.y + (k < 5 || k > 10 ? 1 : 0), 1, 2, BLUE);
      }
    for (const side of [-1, 1]) {
      const reach = 6 + (Math.floor((u / LOOP) * 8) % 4 < 2 ? 0 : 1);
      for (let i = 0; i < reach; i++) rect(p, 40 + side * (26 + i), SEA - 2, 1, 2, BLUE);
    }
    return emit(p, color);
  };
}
