/*
 * crowned-skull: the pirate king, a skull in a five-pointed gold crown over
 * crossed bones. The crown's three red jewels twinkle in turn, and now and
 * then a glint runs across the gold.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat
 * colours. The skull is built from ellipses and rows a pixel at a time, with
 * its right-hand edges in shade; black gaps keep crown, skull and bones apart,
 * so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "crowned skull",
  category: "scenes",
  note: "the pirate king: a skull in a gold crown, its red jewels twinkling",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone and its shade, crown gold, jewel red
  palette: ["#e8e2d0", "#a9a392", "#f2b632", "#e23a2e"],
} satisfies Meta;

// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, SHADE = 2, GOLD = 3, RED = 4;
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

// ---- the king

const C = 36; // the row of the middle of the cranium
const NOSE = ["...#...", "..###..", "..###..", ".#####.", "###.###", "##...##"];
// The crown: its five points (column off the middle, row) and the dips between them.
const POINTS = [[-16, 5], [-12, 11], [-8, 4], [-4, 11], [0, 1], [4, 11], [8, 4], [12, 11], [16, 5]];
const BAND = [12, 23]; // the band's first and last rows
// A jewel, a lozenge: half its width on each of its six rows, from row 16.
const GEM = [1, 1, 2, 2, 1, 1];
const JEWELS = [0, -10, 10]; // their columns off the middle, in the order they twinkle
const LOOP = 3, TURN = 1, GLINT = [2.2, 2.95];

export default function crownedSkull(): Frame {
  // the skull: a round cranium, cheekbones narrowing to the upper jaw, and the lower jaw under it
  const skull = new Uint8Array(W * H);
  disc(skull, CX, C, 18.6, 16.6, BONE);
  for (let y = C + 7; y <= C + 15; y++) span(skull, y, 16 - (y - C - 7) * 0.55, BONE);
  for (let y = C + 16; y <= C + 22; y++) span(skull, y, y < C + 21 ? 10 : 9 - (y - C - 21) * 2, BONE);
  for (const s of [-1, 1]) {
    // a socket, a little heavier at its outer brow, and a nick under the cheekbone
    disc(skull, CX + s * 8.5, C + 3.5, 5.6, 5.2, 0);
    disc(skull, CX + s * 9.5, C + 2.5, 4.6, 4.4, 0);
    rect(skull, CX + s * 11 - (s < 0 ? 1 : 0), C + 16, 2, 1, 0);
  }
  sprite(skull, CX - 3, C + 8, NOSE, { "#": 0 });
  // the teeth: three pixels each with a pixel between, and a line where the jaws meet
  for (let x = CX - 10; x <= CX + 10; x += 4) rect(skull, x, C + 16, 1, 6, 0);
  rect(skull, CX - 9, C + 19, 19, 1, 0);
  // a crack down the brow
  sprite(skull, CX + 5, C - 11, ["#...", "#...", ".#..", ".##.", "...#", "..#.", "..#."], { "#": 0 });

  // the crown: five points with a ball on each, and a band set with three lozenge jewels
  const crown = new Uint8Array(W * H);
  for (let i = 0; i + 1 < POINTS.length; i++) {
    const [x0, y0] = POINTS[i], [x1, y1] = POINTS[i + 1];
    for (let x = x0; x <= x1; x++) {
      const top = Math.round(y0 + ((y1 - y0) * (x - x0)) / (x1 - x0));
      rect(crown, CX + x, top, 1, BAND[0] - top, GOLD);
    }
  }
  for (let i = 0; i < POINTS.length; i += 2) disc(crown, CX + POINTS[i][0], POINTS[i][1] + (i === 0 || i === 8 ? 1 : 0), 1.9, 1.9, GOLD);
  rect(crown, CX - 17, BAND[0], 35, BAND[1] - BAND[0] + 1, GOLD);
  rect(crown, CX - 17, BAND[0] + 2, 35, 1, 0);
  for (const j of JEWELS)
    GEM.forEach((half, i) => {
      rect(crown, CX + j - half - 1, 16 + i, 2 * half + 2, 1, 0);
      rect(crown, CX + j - half, 16 + i, 2 * half, 1, RED);
    });
  for (const j of JEWELS) for (const y of [15, 22]) rect(crown, CX + j - 1, y, 2, 1, 0);

  // what never moves: the bones, one laid over the other, and the crowned skull over where they cross
  const still = new Uint8Array(W * H), other = new Uint8Array(W * H), head = new Uint8Array(W * H);
  bone(still, 6, 31, 74, 57, BONE);
  bone(other, 74, 31, 6, 57, BONE);
  shade(still), shade(other), shade(skull);
  over(still, other);
  for (let y = BAND[1] + 3; y < H; y++) for (let x = 0; x < W; x++) head[y * W + x] = skull[y * W + x];
  over(head, crown);
  over(still, head, filled(head));

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    // the glint: a slanted band of bone crossing the gold, left to right
    if (u >= GLINT[0] && u < GLINT[1]) {
      const c = Math.round(-6 + ((u - GLINT[0]) / (GLINT[1] - GLINT[0])) * 52);
      for (let y = 0; y <= BAND[1]; y++)
        for (let x = CX - 18; x <= CX + 18; x++) {
          const d = x - (CX - 18) + (y >> 1) - c;
          if (p[y * W + x] === GOLD && d >= 0 && d < 3) p[y * W + x] = BONE;
        }
    }
    // the jewels, each twinkling in its turn: a spark with four rays, then the spark alone
    const v = u % TURN, x = CX + JEWELS[Math.floor(u / TURN) % 3];
    if (v < 0.4 || v > 0.9) rect(p, x - 1, 18, 2, 2, BONE);
    if (v < 0.2) {
      rect(p, x - 1, 12, 2, 4, BONE), rect(p, x - 1, 22, 2, 2, BONE);
      rect(p, x - 5, 18, 3, 2, BONE), rect(p, x + 2, 18, 3, 2, BONE);
    }
    return emit(p, color);
  };
}
