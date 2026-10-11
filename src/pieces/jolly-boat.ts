/*
 * jolly-boat: a ship's rowing boat seen side-on, one pirate at the oars with
 * his back to the bow. He rows in four poses: reach, pull, finish, and the oar
 * swung back clear of the water. The boat nudges forward on every pull and the
 * swell slides under it.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours: a clinker hull with its strakes and thole
 * pins, the pirate in profile under a tricorn, bearded, in a striped shirt,
 * his arm bent to the oar. The oar is cut out of the hull with a black line,
 * so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "jolly boat",
  category: "scenes",
  note: "a pirate rowing a jolly boat over the swell, stroke by stroke",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // sea blue, wood, blood red, bone's shade, bone
  palette: ["#3a7ca5", "#a8703a", "#e23a2e", "#b9b2a0", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const SEA = 1, WOOD = 2, RED = 3, SHADE = 4, BONE = 5;

const set = (p: Uint8Array, x: number, y: number, k: number) => {
  x = Math.round(x), y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) p[y * W + x] = k;
};
const rect = (p: Uint8Array, x: number, y: number, w: number, h: number, k: number) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(p, x + i, y + j, k);
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

// ---- the boat, the pirate and the oar

// His head, facing the stern: a tricorn with a bone badge, an eye, a nose, a beard, a neck.
const HEAD = [
  "......rrrrr...",
  "....rrrrrrrr..",
  "...rrrrbbrrrr.",
  "r..rrrrbbrrrr.",
  "rrrrrrrrrrrrrr",
  ".rrrrrrrrrrrr.",
  "...bbbbbbbb...",
  "..bbb_bbbbb...",
  ".bbbbbbbbbb...",
  "..bbbbbbbbs...",
  "..wwwwbbbbs...",
  "..wwwwwwbs....",
  "...wwwww......",
  ".....wbbs.....",
];
// The top of the hull at each column, and its bottom: a sheer rising to both ends, a blunt stern, a pointed bow.
const sheer = (x: number) => 40 - Math.round(4 * ((x - 40) / 35) ** 2);
const keel = (x: number) => 58 - Math.round(x < 40 ? 11 * ((40 - x) / 35) ** 8 : 17 * ((x - 40) / 35) ** 3.5);
const SEAT = 42, LOCK = 33;
// The four poses: how far the pirate leans, where the oar's blade is from the rowlock, and how far the boat has run.
const POSES = [
  { lean: -2, bx: 15, by: 19, run: 0 },
  { lean: 0, bx: 1, by: 23, run: 2 },
  { lean: 2, bx: -14, by: 19, run: 3 },
  { lean: 0, bx: -4, by: 9, run: 1 },
];
// A swell, sixteen pixels long: how far below its crest the water is at each pixel.
const SWELL = Array.from({ length: 16 }, (_, i) => Math.round(1 - Math.cos((i / 16) * 2 * Math.PI)));
const SEA_TOP = 53;
const LOOP = 8;

export default function jollyBoat(): Frame {
  // what never changes shape: the hull, its capping and strakes, the thole pins the oar sits between
  const boat = new Uint8Array(W * H);
  const hull = (x: number, y: number) => x >= 5 && x <= 75 && y >= sheer(x) && y <= keel(x);
  for (let y = 30; y < H; y++) for (let x = 0; x < W; x++) if (hull(x, y)) set(boat, x, y, WOOD);
  for (let x = 6; x < 75; x++) for (const d of [2, 6, 10]) if (hull(x, sheer(x) + d + 1)) set(boat, x, sheer(x) + d, 0);
  for (const x of [LOCK - 2, LOCK + 2]) rect(boat, x, sheer(x) - 2, 1, 2, WOOD);
  // a ring in the stem for the painter
  rect(boat, 70, 40, 2, 2, 0);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const pose = POSES[Math.floor(u * 2) % 4];
    const p = new Uint8Array(W * H);
    const dx = pose.run - 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (boat[y * W + x]) set(p, x + dx, y, boat[y * W + x]);
    // the pirate, sat amidships: a striped shirt, leant into his stroke from the hips, his head on top
    const px = SEAT + dx;
    for (let j = 0; j < 14; j++) {
      const s = Math.round((pose.lean * (13 - j)) / 9);
      rect(p, px + s + (j < 2 ? 2 : j < 4 ? 1 : 0), 26 + j, j < 2 ? 8 : j < 4 ? 10 : 11, 1, (j >> 1) % 2 ? BONE : RED);
      if ((j >> 1) % 2) set(p, px + s + 10, 26 + j, SHADE);
    }
    sprite(p, px - 1 + Math.round(pose.lean * 1.6), 12, HEAD, { r: RED, b: BONE, s: SHADE, w: WOOD });
    // the oar: from his hands, between the pins, down to the blade
    const lx = LOCK + dx, ly = sheer(LOCK) - 1;
    const hx = Math.round(lx - pose.bx * 0.45), hy = ly - 7;
    const ex = lx + pose.bx, ey = ly + pose.by;
    const mx = lx + pose.bx * 0.62, my = ly + pose.by * 0.62;
    line(p, lx, ly + 2, ex, ey, 0, 4);
    line(p, mx, my, ex, ey, 0, 5);
    line(p, hx, hy, ex, ey, BONE, 2);
    line(p, mx, my, ex, ey, BONE, 3);
    line(p, mx + 1, my, ex + 1, ey, SHADE, 1);
    // his arm, bent at the elbow, a hand closed on the loom
    const sx = px + 4 + Math.round(pose.lean * 1.2), sy = 28;
    const elx = (sx + hx) / 2 + 1, ely = (sy + hy) / 2 + 3;
    line(p, sx, sy, elx, ely, 0, 4), line(p, elx, ely, hx + 1, hy, 0, 4);
    line(p, sx, sy, elx, ely, RED, 2), line(p, elx, ely, hx + 2, hy, RED, 2);
    rect(p, hx - 1, hy - 1, 3, 3, BONE);
    // the sea closes over the keel: a black gap, then rows of swell sliding astern, foam on some crests
    for (let i = (SEA_TOP - 1) * W; i < p.length; i++) if (p[i] < SHADE) p[i] = 0;
    for (let r = 0; r < 4; r++) {
      const off = Math.floor(u * [4, 6, 8, 10][r]) + r * 5;
      for (let x = 0; x < W; x++) {
        const i = (x + off) % 16, y = SEA_TOP + r * 3 + (r > 0 ? 2 + (SWELL[i] >> 1) : SWELL[i]);
        for (let j = 0; j < (r ? 1 : 2); j++) if (y + j < H && p[(y + j) * W + x] < SHADE) set(p, x, y + j, i < 3 && (Math.floor((x + off) / 16) + r) % 3 === 0 && !j ? BONE : SEA);
      }
    }
    return emit(p, color);
  };
}
