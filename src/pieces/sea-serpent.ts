/*
 * sea-serpent: a sea serpent swimming along the surface, side-on: a forked
 * tail at one end, a row of humps arching out of the water, and a long-jawed
 * head held high on its neck at the other. The humps rise and fall one after
 * the other in a wave that runs down its length, the head bobs, the tongue
 * flicks, and the sea scrolls by underneath.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours: a spiny crest down its back, scales and
 * belly plates picked out as single pixels, teeth in its jaws, its right-hand
 * edges in shade, the waves one pixel thick with flecks of foam. A black gap
 * keeps the serpent off the water, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "sea serpent",
  category: "scenes",
  note: "a spiny green sea serpent, its humps rising and falling as it swims",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // sea blue, serpent green and its shade, tongue red, bone for eye, teeth and foam
  palette: ["#3a7ca5", "#4fa35a", "#2f6b3a", "#e23a2e", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const SEA = 1, GREEN = 2, DARK = 3, RED = 4, BONE = 5;

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
const line = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, k: number, thick = 1) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) rect(p, Math.round(x0 + ((x1 - x0) * i) / n - (thick - 1) / 2), Math.round(y0 + ((y1 - y0) * i) / n - (thick - 1) / 2), thick, thick, k);
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
const mod = (a: number, n: number) => ((a % n) + n) % n;

// ---- the serpent, swimming right

const WATER = 46;
const KEYS = { g: GREEN, b: BONE, r: RED };
// The head: horns swept back, a slit of an eye under its brow, a nostril, and long jaws full of teeth.
const HEAD = [
  "......g...g..................",
  ".....gg..gg..................",
  "....ggg.ggg..................",
  "...ggggggggggg...............",
  "..gggggg____ggggg............",
  "..ggggggg_bb_gggggggg........",
  ".ggggggggggggggggggggggg.....",
  ".gggggggggggggggggggggg_gg...",
  ".gggggggggggggggggggggggggg..",
  ".ggggggggggggggggggggggggggg.",
  ".gggggggg_b_b_b_b_b_b_b_b_g..",
  ".ggggggggg_b_b_b_b_b_b_b.....",
  "..ggggggggggggggggggggggg....",
  "..gggggggggggggggggggg.......",
  "...ggggggggggggg.............",
  "....gggggggggg...............",
];
const TONGUE = ["..r", "rr.", "..r"];
const FLUKE = [
  ".g.....g.",
  ".gg...gg.",
  "..gg.gg..",
  "..ggggg..",
  "...ggg...",
  "...ggg...",
];
const HEAD_X = 50, HEAD_Y = 4;
const HUMPS = [16, 31, 46];
// Green's right-hand edges in its shade, as if lit from the left.
const shade = (p: Uint8Array) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[y * W + x] === GREEN && (x === W - 1 || !p[y * W + x + 1])) p[y * W + x] = DARK;
};
// A crest, one pixel thick: how far each of its pixels stands above its row.
const CREST = [0, 1, 1, 2, 2, 2, 1, 1, 0];
const BEAT = 1.6, LOOP = 4.8;

export default function seaSerpent(): Frame {
  // the head and neck, drawn once with the tongue in and once with it out, then set down wherever they bob to
  const heads = [false, true].map((tongue) => {
    const p = new Uint8Array(W * H);
    const top = HEAD_Y + HEAD.length - 2;
    for (let y = top; y < H; y++) {
      const v = (y - top) / (WATER - top), x = Math.round(58 + 4 * v - 4 * Math.sin(Math.PI * v));
      rect(p, x - 4, y, 9, 1, GREEN);
      // a spine on its back every fourth row
      if (y % 4 === 0) set(p, x - 5, y, GREEN), set(p, x - 6, y - 1, GREEN);
    }
    sprite(p, HEAD_X, HEAD_Y, HEAD.map((r) => r.replace(/[_b]/g, "g")), KEYS);
    shade(p);
    sprite(p, HEAD_X, HEAD_Y, HEAD.map((r) => r.replace(/g/g, ".")), KEYS);
    // plates down its belly, every third row
    for (let y = top + 3; y < H; y += 3) {
      const v = (y - top) / (WATER - top), x = Math.round(58 + 4 * v - 4 * Math.sin(Math.PI * v));
      rect(p, x + 1, y, 3, 1, 0);
    }
    if (tongue) sprite(p, HEAD_X + 27, HEAD_Y + 10, TONGUE, KEYS);
    return p;
  });

  return (t, { color } = {}) => {
    const u = mod(t, LOOP), a = (u / BEAT) * 2 * Math.PI;
    const p = new Uint8Array(W * H);

    // the humps: arches whose height follows a wave running from the head back to the tail,
    // spines along their tops, a row of scales round them
    const scales: number[][] = [];
    HUMPS.forEach((x, i) => {
      const h = 15 + Math.round(5 * Math.sin(a + i * 1.3)), base = WATER - 2;
      disc(p, x, base, 7, h, GREEN);
      disc(p, x, base, 2.5, h - 5, 0);
      for (let dx = -6; dx <= 6; dx += 3) {
        const top = base - Math.floor(h * Math.sqrt(1 - (dx / 7) ** 2));
        set(p, x + dx, top - 1, GREEN);
        if (Math.abs(dx) < 6) set(p, x + dx, top - 2, GREEN);
      }
      for (const n of [1, 2, 5, 6]) {
        const th = (n / 7) * Math.PI;
        scales.push([x + 4.7 * Math.cos(th), base - (h - 2.5) * Math.sin(th)]);
      }
    });
    // the tail: a forked fluke on a thin stalk, flicking
    const flick = Math.round(Math.sin(a - 1.3));
    line(p, 6, WATER, 4, 40, GREEN, 3);
    line(p, 4, 40, 4 + flick, 34, GREEN, 2);
    sprite(p, flick, 28, FLUKE, KEYS);
    // green's right-hand edges in shade, then a few scales down each side of each hump
    shade(p);
    for (const [x, y] of scales) set(p, x, y, 0);
    // the head and neck, bobbing by a cell
    const bob = 2 * Math.round(Math.sin(a + 3.9));
    const head = heads[u >= 2 && u < 2.6 ? 1 : 0];
    for (let y = 0; y < H; y++) {
      const from = y - bob;
      if (from >= 0 && from < H) for (let x = 0; x < W; x++) if (head[from * W + x]) p[y * W + x] = head[from * W + x];
    }

    // the sea covers the rest: a black gap, a rippling line for its surface, foam thrown up by its neck
    // and tail, and rows of crests under it, a fleck of foam on every third, all drifting back
    rect(p, 0, WATER - 3, W, H - WATER + 3, 0);
    const s0 = Math.floor(t * 8);
    for (let x = 0; x < W; x++) {
      set(p, x, WATER + Math.round(1.4 * Math.sin(((x - s0) * Math.PI) / 8)), SEA);
    }
    for (const x of [1, 9, 54, 70]) set(p, x, WATER - 2 - (Math.floor(t * 5 + x) % 2), BONE);
    [[52, 6, 0, 19], [57, 10, 10, 23], [62, 7, 4, 17]].forEach(([y, v, off, gap]) => {
      const s = Math.floor(t * v) + off;
      for (let x = 0; x < W; x++) {
        const m = mod(x - s, gap);
        if (m < CREST.length) set(p, x, y - CREST[m], m === 4 && mod(Math.floor((x - s) / gap), 3) === 0 ? BONE : SEA);
      }
    });
    return emit(p, color);
  };
}
