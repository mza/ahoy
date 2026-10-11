/*
 * skull-and-crossbones: the classic. A skull, front on, over two long bones
 * crossed behind and below it, bone-white on black and nothing else. Now and
 * then the jaw chatters, a glint crosses the eye sockets, and the bones give
 * a little rattle.
 *
 * Pixel art in block elements, two square pixels a cell, in one flat colour
 * and a second for the glint. The skull is geometry, a pixel at a time: a
 * round cranium, cheekbones, sockets, a nose and teeth cut out of it. Black
 * gaps keep it apart from the bones and the bones from each other, so it
 * reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "skull and crossbones",
  category: "scenes",
  note: "the classic: a chattering skull over two long crossed bones",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone, and gold for the glint in the sockets
  palette: ["#e8e2d0", "#f2b632"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, GOLD = 2;

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
// One canvas laid over another, moved by (dx, dy), with a black gap cut around it first.
const over = (dst: Uint8Array, src: Uint8Array, dx = 0, dy = 0, gap = 2) => {
  for (let pass = 0; pass < 2; pass++)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const k = src[y * W + x];
        if (!k) continue;
        if (pass) set(dst, x + dx, y + dy, k);
        else rect(dst, x + dx - gap, y + dy - gap, 2 * gap + 1, 2 * gap + 1, 0);
      }
};
// Sweep up the crumbs a gap can leave behind: any speck of fewer than `least` pixels.
const tidy = (p: Uint8Array, least = 12) => {
  const seen = new Uint8Array(W * H);
  for (let i = 0; i < p.length; i++) {
    if (!p[i] || seen[i]) continue;
    const blob = [i];
    seen[i] = 1;
    for (let n = 0; n < blob.length; n++) {
      const x = blob[n] % W, y = (blob[n] - x) / W;
      for (const [a, b] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const j = b * W + a;
        if (a >= 0 && a < W && b >= 0 && b < H && p[j] && !seen[j]) (seen[j] = 1), blob.push(j);
      }
    }
    if (blob.length < least) for (const j of blob) p[j] = 0;
  }
  return p;
};
// A long bone from one end to the other: a slim shaft with two knuckles at each end.
const bone = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, k: number) => {
  const l = Math.hypot(x1 - x0, y1 - y0), dx = (x1 - x0) / l, dy = (y1 - y0) / l;
  for (let i = 0; i <= l * 2; i++) disc(p, x0 + (dx * i) / 2, y0 + (dy * i) / 2, 2.3, 2.3, k);
  for (const [x, y, s] of [[x0, y0, -1], [x1, y1, 1]])
    for (const side of [-1, 1]) disc(p, x + dx * s * 1.2 - dy * side * 2.7, y + dy * s * 1.2 + dx * side * 2.7, 3.3, 3.3, k);
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

// ---- the skull, row by row from its crown, and its jaw apart from it

const CX = 39.5, TOP = 0;
// Half its width on row j: the round cranium, the cheekbones, then the narrower block the teeth sit in.
const halfAt = (j: number) => {
  if (j < 21) return 18 * Math.sqrt(1 - ((j - 15.5) / 16) ** 2);
  if (j < 24) return 16.6 - (j - 21) * 0.5;
  if (j < 27) return 15 - (j - 24) * 1.4;
  return 11;
};
const NOSE = ["..__..", ".____.", ".____.", "______", "__..__"];
// A crack down from the crown.
const CRACK = [[0, 0], [0, 1], [1, 2], [1, 3], [0, 4], [1, 5], [2, 6], [2, 7]];
const MOUTH = 33; // the row between the teeth, and where the jaw hangs from
const SOCKETS = [-1, 1].map((s) => [CX + s * 7.5, TOP + 16.5]);
const inSocket = (x: number, y: number) => SOCKETS.some(([sx, sy]) => ((x - sx) / 5.5) ** 2 + ((y - sy - (Math.abs(x - CX) - 7.5) * 0.18) / 4.9) ** 2 < 1);
const LOOP = 6;

export default function skullAndCrossbones(): Frame {
  // the two bones, each on a canvas of its own, and the skull's two parts on theirs
  const fore = new Uint8Array(W * H), back = new Uint8Array(W * H);
  bone(back, 6, 35, 73, 58, BONE);
  bone(fore, 73, 35, 6, 58, BONE);
  const head = new Uint8Array(W * H), jaw = new Uint8Array(W * H);
  for (let j = 0; j < MOUTH; j++)
    for (let x = 0; x < W; x++) if (Math.abs(x - CX) < halfAt(j) && !inSocket(x, TOP + j)) head[(TOP + j) * W + x] = BONE;
  sprite(head, 37, TOP + 21, NOSE, {});
  for (const [x, y] of CRACK) head[(TOP + 1 + y) * W + 46 + x] = 0;
  // the jaw: square, its corners rounded off
  [0, 0, 0, 1, 2, 3, 5].forEach((cut, j) => rect(jaw, 29 + cut, TOP + MOUTH + 1 + j, 22 - 2 * cut, 1, BONE));
  // teeth, top and bottom: two pixels each, a pixel between
  for (let x = 32; x < 48; x += 3) rect(head, x, TOP + MOUTH - 4, 1, 4, 0), rect(jaw, x, TOP + MOUTH + 1, 1, 3, 0);
  // every pose it takes: the bones nudged apart or not, the jaw dropped or not
  const pose = (nudge: number, drop: number) => {
    const p = new Uint8Array(W * H);
    over(p, back, -nudge, 0);
    over(p, fore, nudge, 0, 1);
    over(p, jaw, 0, drop, 1);
    over(p, head, 0, 0, 1);
    return tidy(p);
  };
  const poses = [-1, 0, 1].map((n) => [0, 2].map((d) => pose(n, d)));

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    // the jaw chatters early in the loop, the bones rattle late in it
    const c = u - 1, r = u - 4;
    const drop = c >= 0 && c < 0.9 && Math.floor(c / 0.15) % 2 === 0 ? 1 : 0;
    const nudge = r >= 0 && r < 0.6 ? [1, 2, 1, 0][Math.floor(r / 0.05) % 4] : 1;
    const p = new Uint8Array(poses[nudge][drop]);
    // the glint: a slanting bar of light crossing one socket, then the other
    const g = (u - 2.9) / 0.9;
    if (g >= 0 && g < 1)
      SOCKETS.forEach(([sx, sy], i) => {
        const k = g * 2.2 - i * 0.9;
        if (k < 0 || k > 1) return;
        const at = sx - 7 + k * 14;
        for (let y = Math.floor(sy - 6); y < sy + 6; y++)
          for (let x = Math.floor(sx - 6); x < sx + 6; x++) {
            const far = x + (y - sy) * 0.6 - at;
            if (far >= 0 && far < 2.5 && ((x - sx) / 4.4) ** 2 + ((y - sy) / 4) ** 2 < 1 && !p[y * W + x]) p[y * W + x] = GOLD;
          }
      });
    return emit(p, color);
  };
}
