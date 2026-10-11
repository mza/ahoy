/*
 * ghost-roger: a spectral skull over crossed bones, in ghost cyan on black
 * like a picture on a phosphor screen. It flickers and tears, a scan line runs
 * down it now and then, and it fades away to a faint outline and comes back.
 *
 * Pixel art in block elements, two square pixels a cell, in three flat
 * colours. The skull is built from ellipses and rows a pixel at a time, with
 * its right-hand edges in the darker cyan; black gaps keep skull and bones
 * apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "ghost roger",
  category: "scenes",
  note: "a ghostly skull and crossbones flickering on a phosphor screen",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // ghost cyan and its shade, and bone for the brightest of the flicker
  palette: ["#5fd7c9", "#2b7f78", "#e8e2d0"],
} satisfies Meta;

// A pixel is 0 for empty, else a palette index plus one. The kit calls the ghost's cyan BONE.
const BONE = 1, SHADE = 2, WHITE = 3;
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

// ---- the ghost

const C = 19; // the row of the middle of the cranium
const NOSE = ["...#...", "..###..", "..###..", ".#####.", "###.###", "##...##"];
const LOOP = 6;
const SCANS = [[0.6, 1.6], [5.0, 5.8]]; // when a scan line runs down the picture
// The fade: from when, and how much of the picture is left. 0 all of it, 1 dim, 2 dim and every other line, 3 its outline.
const FADE = [[0, 0], [2.7, 1], [3.0, 2], [3.3, 3], [4.2, 2], [4.4, 1], [4.6, 0]];

export default function ghostRoger(): Frame {
  // the skull: a tall cranium, hollow round sockets, long cheeks and a narrow jaw
  const skull = new Uint8Array(W * H);
  disc(skull, CX, C, 17.6, 16.6, BONE);
  for (let y = C + 8; y <= C + 17; y++) span(skull, y, 15 - (y - C - 8) * 0.55, BONE);
  for (let y = C + 18; y <= C + 25; y++) span(skull, y, y < C + 23 ? 9 : 9 - (y - C - 22) * 1.5, BONE);
  for (const s of [-1, 1]) {
    disc(skull, CX + s * 8, C + 5, 5.6, 5.9, 0);
    rect(skull, CX + s * 11 - (s < 0 ? 1 : 0), C + 18, 2, 1, 0);
  }
  sprite(skull, CX - 3, C + 11, NOSE, { "#": 0 });
  for (let x = CX - 8; x <= CX + 8; x += 4) rect(skull, x, C + 19, 1, 6, 0);
  rect(skull, CX - 8, C + 22, 17, 1, 0);
  sprite(skull, CX - 7, C - 13, ["..#", "..#", ".#.", ".#.", "#..", ".#.", ".#."], { "#": 0 });
  const solid = filled(skull);

  // the bones, crossed under it, one laid over the other
  const whole = new Uint8Array(W * H), other = new Uint8Array(W * H);
  bone(whole, 8, 41, 72, 59, BONE);
  bone(other, 72, 41, 8, 59, BONE);
  over(whole, other);
  over(whole, skull, solid);
  // the picture's outline: every pixel of it that touches black
  const edge = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!whole[y * W + x]) continue;
      const out = (i: number, j: number) => i < 0 || i >= W || j < 0 || j >= H || !whole[j * W + i];
      if (out(x - 1, y) || out(x + 1, y) || out(x, y - 1) || out(x, y + 1)) edge[y * W + x] = SHADE;
    }
  // and the picture at full strength, its right-hand edges in shade
  const lit = new Uint8Array(whole);
  for (let i = 0; i < lit.length; i++) if (edge[i] && (i % W === W - 1 || !(whole[i + 1] || solid[i + 1]))) lit[i] = SHADE;

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, f = Math.floor(u * 20 + 0.001);
    const fade = FADE.reduce((a, [from, k]) => (u >= from ? k : a), 0);
    // the flicker: now and then a frame dims, or flares, or a band of it tears sideways
    const h = (Math.imul(f + 7, 2654435761) >>> 8) % 97;
    const dim = fade === 0 && (h < 5 || f === 53), flare = fade === 0 && h >= 5 && h < 9 && f > 0;
    const tear = f > 0 && h % 9 === 2 ? 2 * (4 + (h % 23)) : -1;
    const scan = SCANS.find(([a, z]) => u >= a && u < z);
    const line = scan ? 2 * Math.floor(((u - scan[0]) / (scan[1] - scan[0])) * (H / 2)) : -9;

    const p = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      // a torn band is pushed two pixels over, and the rows at the scan line one
      const push = (y >= tear && y < tear + 6 ? 2 : 0) + (y >= line && y < line + 4 ? 1 : 0);
      for (let x = 0; x < W; x++) {
        const i = y * W + x - push;
        if (x - push < 0 || !whole[i]) continue;
        let k = fade === 3 ? edge[i] : fade === 2 ? ((y >> 1) % 2 ? edge[i] : SHADE) : fade === 1 || dim ? SHADE : flare ? WHITE : lit[i];
        if (k && y >= line && y < line + 2) k = WHITE;
        p[y * W + x] = k;
      }
      // the scan line itself, right across the screen: dim on the black, white on the picture
      if (y >= line && y < line + 2) for (let x = 0; x < W; x++) if (!p[y * W + x]) p[y * W + x] = whole[y * W + x - push] ? 0 : SHADE;
    }
    return emit(p, color);
  };
}
