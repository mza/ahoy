/*
 * octopus: a chunky octopus, seen front-on: a big domed head with two wide
 * eyes and eight arms curling out below it. The arms wave in a four-pose
 * cycle, and now and then it blinks.
 *
 * Pixel art in block elements, two square pixels a cell, in two flat colours:
 * one for the body, bone for the eyes and suckers. Black gaps keep the arms
 * apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "octopus",
  category: "scenes",
  note: "a chunky pixel octopus waving its eight arms, blinking now and then",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // ghost cyan, bone
  palette: ["#5fd7c9", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BODY = 1, BONE = 2;

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

// ---- the octopus

const CX = 40, NECK = 34;
const KEYS = { b: BONE };
// two pixels to each of these
const EYE = [
  ".bbb.",
  "bbbbb",
  "bb__b",
  "bb__b",
  "bbbbb",
  ".bbb.",
];
const SHUT = [
  ".....",
  ".....",
  ".....",
  "bbbbb",
  ".....",
  ".....",
];
// Each arm on the right, from the middle out: where it leaves the head, how far it hangs, how far it
// spreads, and whether its tip curls. The left mirrors them.
const ARMS = [
  [4, 25, 2, 0],
  [10, 23, 7, 0],
  [16, 17, 10, 1],
  [22, 8, 9, 1],
];
const POSES = 4, STEP = 0.3, LOOP = 6;

export default function octopus(): Frame {
  // what never moves: the head, a dome flaring into a skirt the arms hang from
  const head = new Uint8Array(W * H);
  disc(head, CX, 20, 22, 18, BODY);
  rect(head, CX - 20, 24, 40, NECK - 26, BODY);
  rect(head, CX - 24, NECK - 4, 48, 4, BODY);
  rect(head, CX - 22, NECK - 6, 44, 2, BODY);

  // the arms in each pose: one wave runs down all of them together, so they never cross
  const poses = Array.from({ length: POSES }, (_, n) => {
    const p = new Uint8Array(W * H);
    const phase = (n / POSES) * 2 * Math.PI;
    for (const s of [-1, 1])
      ARMS.forEach(([x0, hang, spread, curl]) => {
        const sway = (3 * hang) / 25;
        const at = (v: number) => CX + s * (x0 + spread * v * v) + sway * v * Math.sin(v * 4 - phase);
        for (let j = 0; j <= hang * 3; j++) {
          const v = j / (hang * 3), w = v > 0.7 ? 3 : 4;
          rect(p, Math.round(at(v) - w / 2), NECK + Math.round(hang * v), w, w, BODY);
        }
        // the tip, curling up and out
        const xe = at(1), ye = NECK + hang + 1;
        if (curl) for (let i = 0; i <= 14; i++) {
          const th = (i / 14) * 3.6;
          rect(p, Math.round(xe + s * 3.5 * (1 - Math.cos(th)) - 1.5), Math.round(ye + 3.5 * Math.sin(th) - 1), 3, 3, BODY);
        }
        // suckers down it, on even rows so they keep their colour
        for (let y = 4; y < hang - 3; y += 6) rect(p, Math.round(at(y / hang)) - 1, NECK + y, 2, 2, BONE);
      });
    return p;
  });

  return (t, { color } = {}) => {
    const u = mod(t, LOOP);
    const p = new Uint8Array(W * H);
    p.set(poses[Math.floor(u / STEP) % POSES]);
    for (let i = 0; i < p.length; i++) if (head[i]) p[i] = head[i];
    const eye = u >= 3.3 && u < 3.5 ? SHUT : EYE;
    sprite(p, CX - 14, 16, eye, KEYS, 2);
    sprite(p, CX + 4, 16, eye, KEYS, 2);
    return emit(p, color);
  };
}
