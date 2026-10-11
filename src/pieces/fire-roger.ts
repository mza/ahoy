/*
 * fire-roger: a flaming skull over crossed bones. Flames rise from the top and
 * sides of the skull and flicker through four poses, embers drift up out of
 * them, and a coal glows and dims in each eye socket.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat
 * colours. The skull is built from ellipses and rows a pixel at a time, with
 * its right-hand edges in shade; the flames are tongues of red with gold
 * hearts, behind it. Black gaps keep skull, flames and bones apart, so it
 * reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "fire roger",
  category: "scenes",
  note: "a flaming skull and crossed bones, embers rising, coals for eyes",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone and its shade, flame gold, flame red
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

// ---- the skull and its fire

const C = 31; // the row of the middle of the cranium
const NOSE = ["...#...", "..###..", "..###..", ".#####.", "###.###", "##...##"];
// The tongues of flame: where each is rooted (column off the middle, row), how tall, and how far its tip leans.
const TONGUES = [[-21, 30, 15, -5], [-16, 22, 17, -3], [-9, 17, 15, -2], [0, 15, 14, 1], [8, 17, 16, 2], [15, 21, 15, 4], [21, 30, 16, 5]];
// The four poses of the flicker: how much taller or shorter each tongue is, and which way they all bend.
const FLICKER = [[0, 3, -2, 0, 2, -3, -1], [3, -2, 2, -3, -2, 2, 2], [-2, 1, 3, 1, -3, 0, -3], [1, -3, -1, 2, 3, -1, 1]];
const BEND = [0, 1, 0, -1];
// The embers: the column each starts in, when in the loop it leaves the fire, and how big it is.
const EMBERS = [[11, 0.0, 2], [69, 0.35, 2], [19, 0.6, 1], [62, 0.15, 1], [5, 0.45, 1], [75, 0.8, 1], [30, 0.25, 1], [51, 0.7, 2]];
const POSE = 0.15, LOOP = 2.4;

export default function fireRoger(): Frame {
  // the skull: a cranium, hard cheekbones, a square jaw of clenched teeth
  const skull = new Uint8Array(W * H);
  disc(skull, CX, C, 17.6, 15.6, BONE);
  for (let y = C + 6; y <= C + 15; y++) span(skull, y, 16 - (y - C - 6) * 0.65, BONE);
  for (let y = C + 16; y <= C + 23; y++) span(skull, y, y < C + 21 ? 9 : 9 - (y - C - 20) * 1.4, BONE);
  for (const s of [-1, 1])
    for (let y = C - 3; y <= C + 10; y++)
      for (let x = 0; x <= 14; x++) {
        // a socket under a scowling brow, which comes lower towards the nose
        const inSocket = ((x - 8.5) / 5.8) ** 2 + ((y - C - 4) / 5.4) ** 2 < 1;
        if (inSocket && y > C + 3.5 - x * 0.45) set(skull, CX + s * x, y, 0);
      }
  sprite(skull, CX - 3, C + 9, NOSE, { "#": 0 });
  for (let x = CX - 8; x <= CX + 8; x += 4) rect(skull, x, C + 17, 1, 6, 0);
  rect(skull, CX - 8, C + 20, 17, 1, 0);
  for (const s of [-1, 1]) rect(skull, CX + s * 10 - (s < 0 ? 1 : 0), C + 16, 2, 1, 0);
  const solid = filled(skull);
  shade(skull);

  // the bones, one laid over the other
  const bones = new Uint8Array(W * H), other = new Uint8Array(W * H);
  bone(bones, 6, 38, 74, 58, BONE);
  bone(other, 74, 38, 6, 58, BONE);
  shade(bones), shade(other);
  over(bones, other);

  // a tongue of flame: discs from its root up to its tip, narrowing and leaning as they go
  const tongue = (p: Uint8Array, x: number, y: number, h: number, lean: number, w: number, k: number) => {
    for (let i = 0; i <= 2 * h; i++) {
      const s = i / (2 * h), r = w * (1 - s) ** 0.75 + 0.6;
      disc(p, x + lean * s * s, y - h * s, r, r, k);
    }
  };
  // the four poses of the whole: fire, then bones, then the skull, each with a gap cut round it
  const poses = FLICKER.map((f, n) => {
    const p = new Uint8Array(W * H);
    disc(p, CX, C + 2, 23, 21, RED);
    TONGUES.forEach(([x, y, h, lean], i) => tongue(p, CX + x, y + 4, h + f[i] + 4, lean + BEND[n] * 2, 5, RED));
    disc(p, CX, C + 2, 20.5, 18.5, GOLD);
    TONGUES.forEach(([x, y, h, lean], i) => tongue(p, CX + x * 0.9, y + 5, (h + f[i]) * 0.62 + 2, (lean + BEND[n] * 2) * 0.6, 3.2, GOLD));
    // the fire ends at the cheeks, lifting away from them at its outer edge
    for (let y = C - 6; y < H; y++) for (let x = 0; x < W; x++) if (y > C + 7 - Math.max(0, Math.abs(x - CX) - 18) * 1.6) p[y * W + x] = 0;
    over(p, bones);
    over(p, skull, solid);
    return p;
  });

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, n = Math.floor(u / POSE) % 4;
    const p = new Uint8Array(poses[n]);
    // the coals in the sockets: glowing gold, then smaller and red, by turns
    for (const s of [-1, 1]) {
      const x = CX + s * 8 - (s < 0 ? 1 : 0), k = Math.floor(u / (2 * POSE)) % 2 ? RED : GOLD, half = k === GOLD ? 3 : 2;
      rect(p, x - half + 1, C + 3, 2 * half - 2, 4, k), rect(p, x - half, C + 4, 2 * half, 2, k);
    }
    // the embers: each climbs from the fire, swaying, gold and then red as it cools, and goes out
    for (const [x0, start, size] of EMBERS) {
      const k = (((u / LOOP - start) % 1) + 1) % 1;
      if (k > 0.8) continue;
      const x = x0 + Math.round(Math.sin(k * 9 + x0) * 1.5), y = Math.round(12 + Math.abs(x0 - CX) * 0.5 - k * 40);
      let clear = true;
      for (let j = -2; j < size + 2; j++) for (let i = -2; i < size + 2; i++) if (x + i >= 0 && x + i < W && y + j >= 0 && y + j < H && p[(y + j) * W + x + i]) clear = false;
      if (clear) rect(p, x, y, size, size, k < 0.45 ? GOLD : RED);
    }
    return emit(p, color);
  };
}
