/*
 * laughing-roger: a skull thrown back in a laugh over crossed bones. Its jaw
 * drops wide and snaps shut, ha ha ha and one long haaa, the skull bouncing
 * with every ha and the bones jiggling behind it; then it gets its breath back.
 *
 * Pixel art in block elements, two square pixels a cell, in three flat
 * colours. The skull is built from ellipses and rows a pixel at a time, head
 * and jaw apart, with its right-hand edges in shade; a black gap keeps it off
 * the bones, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "laughing roger",
  category: "scenes",
  note: "a skull laughing over crossed bones, its jaw dropping with every ha",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone and its shade, and red for the open mouth
  palette: ["#e8e2d0", "#a9a392", "#e23a2e"],
} satisfies Meta;

// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, SHADE = 2, RED = 3;
const CX = 40; // the middle column

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;

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
// A row of pixels from the middle column out to `half` either side.
const span = (p: Uint8Array, y: number, half: number, k: number) => rect(p, CX - Math.round(half), y, 2 * Math.round(half) + 1, 1, k);
// A bone from one end to the other: a round-ended shaft with two knuckles at each end.
const bone = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, k: number) => {
  const l = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / l, uy = (y1 - y0) / l;
  for (let i = 0; i <= l * 2; i++) disc(p, x0 + (ux * i) / 2, y0 + (uy * i) / 2, 2.3, 2.3, k);
  for (const [x, y, s] of [[x0, y0, -1], [x1, y1, 1]])
    for (const n of [-1, 1]) disc(p, x + ux * s * 1.5 - uy * n * 3, y + uy * s * 1.5 + ux * n * 3, 3.5, 3.5, k);
};
// A shape's outline filled in: each row from its first pixel to its last.
const filled = (q: Uint8Array) => {
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    let a = W, b = -1;
    for (let x = 0; x < W; x++) if (q[y * W + x]) (a = Math.min(a, x)), (b = x);
    if (b >= 0) rect(out, a, y, b - a + 1, 1, 1);
  }
  return out;
};
// One canvas laid over another, a black gap cut around its outline `mask` first.
const over = (dst: Uint8Array, src: Uint8Array, mask = src, gap = 2) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (mask[y * W + x]) rect(dst, x - gap, y - gap, 2 * gap + 1, 2 * gap + 1, 0);
  for (let i = 0; i < src.length; i++) if (mask[i]) dst[i] = src[i];
};
// Bone's right-hand edges in its shade, as if lit from the left: the edges of its outline, not of the holes in it.
const shade = (p: Uint8Array) => {
  const solid = filled(p);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[y * W + x] === BONE && !(x + 1 < W && solid[y * W + x + 1])) p[y * W + x] = SHADE;
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

// ---- the laugh

const C = 25; // the row of the middle of the cranium, at rest
const NOSE = ["...#...", "..###..", "..###..", ".#####.", "###.###", "##...##"];
// The jaw's rows under its teeth: half its width on each.
const CHIN = [12, 12, 12, 11, 10, 8, 5];
// How far the head lifts and the jaw drops: shut, half open, wide.
const LIFT = [0, 0, 2], DROP = [0, 4, 8];
// A laugh: when the jaw is wide, and when half way. The rest of the loop it is shut.
const WIDE = [[0, 0.2], [0.4, 0.6], [0.8, 1.0], [1.2, 1.9]], HALF = [[1.0, 1.2], [1.9, 2.0]];
const LOOP = 3.2;
// The rows of a bone's two ends: at rest, and jiggled either way.
const BONES = [[15, 57], [13, 59], [17, 55]];

export default function laughingRoger(): Frame {
  // the three poses of the bones, one laid over the other
  const bones = BONES.map(([a, b], i) => {
    const one = new Uint8Array(W * H), two = new Uint8Array(W * H);
    bone(one, 6, a, 74, b, BONE);
    bone(two, 74, BONES[i && 3 - i][0], 6, BONES[i && 3 - i][1], BONE);
    shade(one), shade(two);
    over(one, two);
    return one;
  });
  // the skull shut, half open and wide
  const skulls = [0, 1, 2].map((open) => {
    const q = new Uint8Array(W * H), c = C - LIFT[open], j = C + 19 + DROP[open];
    // the head: a broad cranium, cheekbones, and the top teeth
    disc(q, CX, c, 20.6, 15.6, BONE);
    for (let y = c + 7; y <= c + 14; y++) span(q, y, 18 - (y - c - 7) * 0.8, BONE);
    for (let y = c + 15; y <= c + 18; y++) span(q, y, 10, BONE);
    for (const s of [-1, 1]) {
      // an eye screwed up with laughing: a socket with its lower half filled back in
      disc(q, CX + s * 9, c + 4, 6.2, 5.4, 0);
      disc(q, CX + s * 9, c + 9.5, 6.8, 5, BONE);
    }
    sprite(q, CX - 3, c + 8, NOSE, { "#": 0 });
    for (let x = CX - 10; x <= CX + 10; x += 4) rect(q, x, c + 15, 1, 4, 0);
    // the jaw: bottom teeth, set between the top ones, and a chin
    for (let y = j; y < j + 3; y++) span(q, y, 10, BONE);
    for (let x = CX - 8; x <= CX + 8; x += 4) rect(q, x, j, 1, 3, 0);
    CHIN.forEach((half, i) => span(q, j + 3 + i, half, BONE));
    if (open) {
      // open: the jaw hangs from the cheeks either side, and the mouth is red inside
      for (const s of [-1, 1]) rect(q, CX + s * 12 - 1, c + 15, 3, j + 3 - c - 15, BONE);
      rect(q, CX - 8, c + 20, 17, j - c - 21, RED);
      if (open > 1) rect(q, CX - 9, c + 22, 19, j - c - 25, RED);
    }
    const solid = filled(q);
    shade(q);
    return { q, solid };
  });
  // every pairing of the two, made the first time it is asked for
  const made = new Map<number, Uint8Array>();
  const pose = (open: number, jig: number) => {
    let p = made.get(open * 3 + jig);
    if (!p) {
      p = new Uint8Array(bones[jig]);
      over(p, skulls[open].q, skulls[open].solid);
      made.set(open * 3 + jig, p);
    }
    return p;
  };

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const ha = WIDE.findIndex(([a, z]) => u >= a && u < z);
    const open = ha >= 0 ? 2 : HALF.some(([a, z]) => u >= a && u < z) ? 1 : 0;
    // the bones jiggle one way and the other with each ha, and shake through the long one
    const jig = ha < 0 ? 0 : ha < 3 ? 1 + (ha % 2) : 1 + (Math.floor(u / 0.1) % 2);
    return emit(pose(open, jig), color);
  };
}
