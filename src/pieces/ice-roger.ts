/*
 * ice-roger: a frozen skull over crossed bones. A cap of snow sits on the
 * crown and icicles of all lengths hang from the jaw, the cheekbones and the
 * bones. Frost sparkles twinkle across it one after another, a drop swells on
 * the longest icicle and falls, and a few snowflakes drift down.
 *
 * Pixel art in block elements, two square pixels a cell, in three flat
 * colours. The skull is built from an ellipse and rows a pixel at a time,
 * with worried, drooping sockets; its right-hand edges are in sea blue, and
 * the icicles are cyan with a bone glint down the left. Black gaps keep the
 * skull, the snow and the bones apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "ice roger",
  category: "scenes",
  note: "a frozen skull and crossed bones hung with icicles, frost twinkling",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone, ghost cyan, sea blue
  palette: ["#e8e2d0", "#5fd7c9", "#3a7ca5"],
} satisfies Meta;

// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, ICE = 2, BLUE = 3;
const CX = 40; // the middle column

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;

const set = (p: Uint8Array, x: number, y: number, k: number) => {
  x = Math.round(x), y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) p[y * W + x] = k;
};
const get = (p: Uint8Array, x: number, y: number) => (x >= 0 && x < W && y >= 0 && y < H ? p[y * W + x] : 0);
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
// Bone's right-hand edges in shade, as if lit from the left: the edges of its outline, not of the holes in it.
const shade = (p: Uint8Array) => {
  const solid = filled(p);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[y * W + x] === BONE && !(x + 1 < W && solid[y * W + x + 1])) p[y * W + x] = BLUE;
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

// ---- the frozen skull

const C = 21; // the row of the middle of the cranium
const NOSE = ["...#...", "..###..", ".#####.", ".#####.", "###.###", "##...##"];
// The icicles: the column, a row inside the shape each hangs from, how long and how wide at the root.
const ICICLES = [
  // the jaw, the longest in the middle
  [33, 42, 5, 3], [36, 44, 8, 3], [40, 44, 11, 5], [44, 44, 6, 3], [47, 42, 9, 3],
  // the cheekbones
  [25, 35, 5, 3], [28, 36, 3, 2], [54, 35, 4, 3], [51, 36, 2, 2],
  // the upper arms of the bones
  [5, 22, 7, 3], [10, 22, 10, 3], [15, 25, 5, 3], [19, 27, 8, 3],
  [75, 22, 9, 3], [70, 22, 5, 3], [65, 25, 8, 3], [60, 28, 4, 2],
  // the lower arms
  [13, 54, 4, 3], [19, 51, 7, 3], [24, 48, 4, 2], [58, 49, 5, 3], [63, 52, 8, 3], [68, 54, 4, 2],
];
// The frost sparkles, lit one after another.
const SPARKS = [[33, 19], [66, 43], [48, 17], [9, 15], [36, 35], [72, 14], [14, 46], [51, 31], [27, 24], [58, 60], [44, 8], [22, 60]];
// The snowflakes: the column, the row at the start of the loop, how many times it falls the frame in a loop, its size.
const FLAKES = [[4, 6, 1, 1], [17, 40, 1, 2], [29, 58, 2, 1], [63, 4, 1, 2], [76, 30, 1, 1], [52, 54, 2, 1], [11, 28, 2, 1], [69, 62, 1, 1], [35, 50, 1, 1], [59, 34, 2, 1]];
// The lumps of the snow: a column off the middle, a row off the cranium's, a radius.
const LUMPS = [[-12, -12.5, 4.6], [-3, -15, 4.6], [7, -14.5, 4.4], [15, -10.5, 4]];
const LOOP = 6;

export default function iceRoger(): Frame {
  // the skull: a round cranium, wide cheekbones, a narrow jaw of clenched teeth
  const skull = new Uint8Array(W * H);
  disc(skull, CX, C, 18.6, 15.6, BONE);
  for (let y = C + 6; y <= C + 14; y++) span(skull, y, 17.2 - (y - C - 6) * 0.28, BONE);
  span(skull, C + 15, 13.5, BONE), span(skull, C + 16, 12, BONE);
  for (let y = C + 17; y <= C + 25; y++) span(skull, y, y < C + 22 ? 10 : 10 - (y - C - 21) * 0.9, BONE);
  for (const s of [-1, 1])
    for (let y = C - 4; y <= C + 12; y++)
      for (let x = 0; x <= 16; x++) {
        // a big round socket under a worried brow, which droops towards the temple
        const inSocket = ((x - 8.6) / 6) ** 2 + ((y - C - 5) / 5.6) ** 2 < 1;
        if (inSocket && y > C + 0.5 + Math.max(0, x - 6) * 0.55) set(skull, CX + s * x, y, 0);
      }
  sprite(skull, CX - 3, C + 11, NOSE, { "#": 0 });
  // the teeth, three pixels each, and the line they bite on
  for (let x = CX - 6; x <= CX + 6; x += 4) rect(skull, x, C + 19, 1, 6, 0);
  rect(skull, CX - 8, C + 22, 17, 1, 0);
  for (const s of [-1, 1]) rect(skull, CX + s * 9, C + 18, 1, 2, 0);
  // a crack down the forehead from under the snow
  sprite(skull, CX + 7, C - 7, ["#..", "#..", ".#.", ".##", "..#", ".#.", ".#."], { "#": 0 });
  // the cap of snow: fuller than the crown and lumpy on top, with a scalloped hem that hangs lower at the
  // temples, and a gap under it
  const hem = (x: number) => C - 11 + [0, 0, 1, 2, 2, 1, 0, 0][((x % 8) + 8) % 8] + Math.round(((x - CX) / 19) ** 2 * 4);
  const inCap = (x: number, y: number) =>
    ((x - CX) / 20.8) ** 2 + ((y - C) / 18.2) ** 2 < 1 || LUMPS.some(([dx, dy, r]) => (x - CX - dx) ** 2 + (y - C - dy) ** 2 < r * r);
  for (let x = 0; x < W; x++)
    for (let y = 0; y <= hem(x) + 1; y++) {
      if (y > hem(x)) set(skull, x, y, 0);
      else if (y > Math.min(hem(x - 1), hem(x + 1))) set(skull, x, y, inCap(x, y) && y < hem(x) ? BONE : 0);
      else if (inCap(x, y)) set(skull, x, y, BONE);
    }
  const solid = filled(skull);
  shade(skull);

  // the bones, crossed behind the jaw, one laid over the other
  const still = new Uint8Array(W * H), other = new Uint8Array(W * H);
  bone(still, 6, 18, 74, 56, BONE);
  bone(other, 74, 18, 6, 56, BONE);
  shade(still), shade(other);
  over(still, other, other, 1);
  over(still, skull, solid, 1);

  // an icicle: from the underside of whatever is at (x, y), tapering to a point
  let tip = [CX, 0];
  for (const [x, y0, len, w] of ICICLES) {
    let y = y0;
    while (y < H && get(still, x, y)) y++;
    for (let j = 0; j < len; j++) {
      const n = Math.max(1, Math.round(w * (1 - j / len))), x0 = x - Math.floor(n / 2);
      for (let i = 0; i < n; i++) set(still, x0 + i, y + j, n >= 3 && i === 0 ? BONE : n >= 3 && i === n - 1 ? BLUE : ICE);
    }
    if (y + len > tip[1]) tip = [x, y + len];
  }

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    // the snow: each flake falls, swaying a pixel, and passes behind the emblem
    for (const [x0, y0, falls, size] of FLAKES) {
      const y = Math.floor(y0 + (u / LOOP) * H * falls) % H, x = x0 + Math.round(Math.sin(u * (Math.PI / 3) * falls + x0));
      let clear = true;
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (get(still, x + i, y + j)) clear = false;
      if (!clear) continue;
      set(p, x, y, BONE);
      if (size > 1) set(p, x - 1, y, BONE), set(p, x + 1, y, BONE), set(p, x, y - 1, BONE), set(p, x, y + 1, BONE);
    }
    // the drop: it swells under the longest icicle, lets go, and falls faster as it goes
    const [dx, dy] = tip;
    if (u >= 1.2 && u < 3.4) rect(p, dx, dy, 1, u < 2.2 ? 1 : 2, ICE);
    else if (u >= 3.4) {
      const y = dy + Math.round((u - 3.4) ** 2 * 60);
      if (y < H) rect(p, dx, y, 1, 2, ICE);
    }
    // the frost: one sparkle at a time, a point that opens into a cross and closes again
    SPARKS.forEach(([x, y], i) => {
      const k = ((u + 0.2 - (i * LOOP) / SPARKS.length) % LOOP + LOOP) % LOOP;
      if (k >= 0.75) return;
      const ink = get(still, x, y) === BONE ? ICE : BONE, big = k >= 0.15 && k < 0.6;
      set(p, x, y, ink);
      if (big) for (const [i2, j2] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) set(p, x + i2, y + j2, ink);
      if (k >= 0.3 && k < 0.45) for (const [i2, j2] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) set(p, x + i2, y + j2, ink);
    });
    return emit(p, color);
  };
}
