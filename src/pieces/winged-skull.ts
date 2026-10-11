/*
 * winged-skull: a memento mori, the death's head of old gravestones: a
 * round-eyed skull between a pair of feathered wings, crossed bones beneath
 * it. The wings beat slowly, and the skull bobs a pixel with each beat.
 *
 * Pixel art in block elements, two square pixels a cell, in two flat colours.
 * The skull is geometry, a pixel at a time, shaded down its right side. Each
 * wing is an arched arm with three rows of feathers hung from it, long ones
 * under short ones, a black line between feathers and a shadow under each
 * row; it is drawn afresh, turned about the cheek, for each pose. Black gaps
 * keep the shapes apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "winged skull",
  category: "scenes",
  note: "a death's head between beating feathered wings, crossed bones below",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone, and iron for the shadows
  palette: ["#e8e2d0", "#8a94a6"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, IRON = 2;

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
// A bone from one end to the other: a slim shaft with two knuckles at each end.
const bone = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, k: number) => {
  const l = Math.hypot(x1 - x0, y1 - y0), dx = (x1 - x0) / l, dy = (y1 - y0) / l;
  for (let i = 0; i <= l * 2; i++) disc(p, x0 + (dx * i) / 2, y0 + (dy * i) / 2, 2, 2, k);
  for (const [x, y, s] of [[x0, y0, -1], [x1, y1, 1]])
    for (const side of [-1, 1]) disc(p, x + dx * s - dy * side * 2.3, y + dy * s + dx * side * 2.3, 2.9, 2.9, k);
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

// ---- the skull, row by row from its crown: round-eyed, with no jaw

const CX = 39.5, TOP = 3;
// Half its width on row j: the cranium, the cheekbones, then the block the teeth sit in.
const halfAt = (j: number) => {
  if (j < 18) return 15.5 * Math.sqrt(1 - ((j - 13.5) / 14) ** 2);
  if (j < 21) return 14.6 - (j - 18) * 0.5;
  if (j < 24) return 13 - (j - 21) * 1.3;
  if (j < 31) return 9;
  return 8;
};
const ROWS = 32;
const SOCKETS = [-1, 1].map((s) => [CX + s * 7, TOP + 14.5]);
// A socket: round, under a level brow.
const inSocket = (x: number, y: number) => SOCKETS.some(([sx, sy]) => Math.hypot(x - sx, y - sy) < 4.8 && y - sy > -3.3);
const NOSE = [".__.", ".__.", "____", "_.._"];

// ---- a wing, the right-hand one, as it is when spread; each pose turns it about where it leaves the skull

const AX = 50, AY = 23; // where it leaves the skull, at the cheek
// Its arm: a curve from there up and over to the shoulder, near the corner of the frame.
const arm = (k: number) => {
  const a = 1 - k;
  return [a * a * AX + 2 * a * k * 57 + k * k * 67, a * a * AY + 2 * a * k * 2 + k * k * 5];
};
// Its rows of feathers, the long ones first: how many, how far below the arm their tips hang, and how broad they are.
const FANS = [[6, 1, 3], [5, 0.55, 2.9], [4, 0.24, 2.7]];
// How far each pose is turned, in degrees: raised, spread, level, lowered.
const POSES = [-8, 0, 8, 15];
const BEAT = [1, 0, 1, 2, 3, 2], STEP = 0.3, LOOP = BEAT.length * STEP;
const RAD = Math.PI / 180;

export default function wingedSkull(): Frame {
  const wing = (turn: number) => {
    const p = new Uint8Array(W * H), c = Math.cos(turn * RAD), s = Math.sin(turn * RAD);
    const turned = (x: number, y: number) => [AX + (x - AX) * c - (y - AY) * s, AY + (x - AX) * s + (y - AY) * c];
    // lay a shape over what is there, a black line around it and its shadow under it
    const lay = (q: Uint8Array, shadow: number) => {
      for (let y = 0; y < H; y++)
        for (let x = AX - 8; x < W; x++) {
          if (p[y * W + x] !== BONE || q[y * W + x]) continue;
          for (let v = 1; v <= shadow; v++) if (y - v >= 0 && q[(y - v) * W + x]) p[y * W + x] = IRON;
        }
      over(p, q, 0, 0, 1);
    };
    FANS.forEach(([n, hang, broad], row) => {
      const all = new Uint8Array(W * H);
      // from the tip of the wing in, each feather over the one before
      for (let i = n - 1; i >= 0; i--) {
        const k = n > 1 ? i / (n - 1) : 0, [bx, by] = arm(0.34 + 0.66 * k);
        // it hangs from the arm, leaning in near the skull and out at the tip, down to the trailing edge
        const lean = (97 - 31 * k) * RAD, long = ((31 + 8 * k - by) * hang + (1 - hang) * 3) / Math.sin(lean);
        const q = new Uint8Array(W * H);
        for (let j = 0; j <= long * 2; j++) {
          const along = j / (long * 2), r = broad * (1 - 0.35 * along ** 5);
          const [x, y] = turned(bx + Math.cos(lean) * long * along, by + Math.sin(lean) * long * along);
          disc(q, x, y, r, r, BONE);
        }
        over(all, q, 0, 0, 1);
      }
      lay(all, row ? 3 : 0);
    });
    // and the arm over them all, thick at the shoulder
    const q = new Uint8Array(W * H);
    for (let j = 0; j <= 80; j++) {
      const [x, y] = arm(j / 80), [tx, ty] = turned(x, y), r = 2.1 + 0.9 * (j / 80) ** 2;
      disc(q, tx, ty, r, r, BONE);
    }
    lay(q, 2);
    // sweep up any crumb the black lines left: a pixel or two with nothing beside it
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (p[i] && (p[i - 1] ? 1 : 0) + (p[i + 1] ? 1 : 0) + (p[i - W] ? 1 : 0) + (p[i + W] ? 1 : 0) < 2 && !(p[i - 1] && p[i - 2]) && !(p[i + 1] && p[i + 2])) p[i] = 0;
      }
    return p;
  };
  // the skull: bone, shaded down its right side, with the face cut out of it
  const skull = new Uint8Array(W * H);
  for (let j = 0; j < ROWS; j++)
    for (let x = 0; x < W; x++) {
      const dx = Math.abs(x - CX), y = TOP + j;
      if (dx < halfAt(j) && !inSocket(x, y)) skull[y * W + x] = x > CX && x + 2 - CX >= halfAt(j) ? IRON : BONE;
    }
  sprite(skull, 38, TOP + 19, NOSE, {});
  for (let x = 33; x < 47; x += 3) rect(skull, x, TOP + 27, 1, 5, 0);
  // the bones, crossed
  const bones = new Uint8Array(W * H), fore = new Uint8Array(W * H);
  bone(bones, 20, 45, 59, 59, BONE);
  bone(fore, 59, 45, 20, 59, BONE);
  over(bones, fore, 0, 0, 1);
  // every pose: the wings at that angle, the skull over them, a pixel higher as they come down
  const poses = POSES.map((lead, i) => {
    const p = wing(lead);
    for (let y = 0; y < H; y++) for (let x = 0; x < W / 2; x++) p[y * W + x] = p[y * W + W - 1 - x];
    over(p, bones);
    over(p, skull, 0, i < 2 ? 0 : -1);
    return p;
  });

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    return emit(poses[BEAT[Math.floor(u / STEP) % BEAT.length]], color);
  };
}
