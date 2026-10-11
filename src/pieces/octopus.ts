/*
 * octopus: a chunky octopus, seen front-on: a big domed head with two wide
 * eyes and eight arms curling out below it. The arms wave in a four-pose
 * cycle, and now and then it blinks.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in two flat colours: one for the body, bone for the eyes, the
 * rows of suckers and a shine on the head. Black gaps keep the arms apart, so
 * it reads in one ink too.
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

const CX = 40, NECK = 33;
const KEYS = { b: BONE, c: BODY };
// An eye: a round bone ball with the slot of a pupil across it, a glint in the slot.
const EYE = [
  "...bbbbb...",
  ".bbbbbbbbb.",
  "bbbbbbbbbbb",
  "bbbbbbbbbbb",
  "bb_______bb",
  "bb__b____bb",
  "bb_______bb",
  "bbbbbbbbbbb",
  "bbbbbbbbbbb",
  ".bbbbbbbbb.",
  "...bbbbb...",
];
// Shut: only the lower lid's line.
const SHUT = [
  "...ccccc...",
  ".ccccccccc.",
  "ccccccccccc",
  "ccccccccccc",
  "ccccccccccc",
  "ccccccccccc",
  "bcccccccccb",
  "cbbcccccbbc",
  "cccbbbbbccc",
  ".ccccccccc.",
  "...ccccc...",
];
// Each arm on the right, from the middle out: where it leaves the head, how far it hangs, how far it
// spreads, and whether its tip curls. The left mirrors them.
const ARMS = [
  [4, 26, 2, 0],
  [10, 24, 7, 0],
  [16, 18, 10, 1],
  [22, 9, 9, 1],
];
const POSES = 4, STEP = 0.3, LOOP = 6;

export default function octopus(): Frame {
  // what never moves: the head, a dome flaring into a skirt the arms hang from, a shine on its brow
  const head = new Uint8Array(W * H);
  disc(head, CX, 19, 21.5, 17.5, BODY);
  for (let y = 24; y < NECK; y++) {
    const half = Math.round(20 + 4.5 * Math.max(0, (y - 27) / (NECK - 27)) ** 2);
    rect(head, CX - half, y, 2 * half + 1, 1, BODY);
  }
  for (const [x, y, w] of [[-13, 7, 3], [-15, 9, 2], [-16, 11, 1], [-16, 12, 1]]) rect(head, CX + x, y, w, 1, BONE);
  // a small smile
  rect(head, CX - 2, 29, 5, 1, 0);
  for (const s of [-1, 1]) set(head, CX + s * 3, 28, 0);

  // the arms in each pose: one wave runs down all of them together, so they never cross
  const poses = Array.from({ length: POSES }, (_, n) => {
    const p = new Uint8Array(W * H);
    const phase = (n / POSES) * 2 * Math.PI;
    for (const s of [-1, 1])
      ARMS.forEach(([x0, hang, spread, curl]) => {
        const sway = (3 * hang) / 25;
        const at = (v: number) => CX + s * (x0 + spread * v * v) + sway * v * Math.sin(v * 4 - phase);
        // the arm as a string of round beads, thinning towards the tip
        const pts: [number, number, number][] = [];
        for (let j = 0; j <= hang * 4; j++) {
          const v = j / (hang * 4);
          pts.push([at(v), NECK - 1 + hang * v, 2.4 - 1 * v]);
        }
        const xe = at(1), ye = NECK - 1 + hang;
        if (curl) for (let i = 1; i <= 24; i++) {
          const th = (i / 24) * 4.2, r = 3.4 - 0.35 * th;
          pts.push([xe + s * (3.4 - r * Math.cos(th)), ye + r * Math.sin(th), 1.4 - 0.12 * th]);
        }
        for (const [x, y, r] of pts) disc(p, x, y, r, r, BODY);
        // a row of suckers down it, one pixel each
        for (let j = 14; j < pts.length - 8; j += 20) set(p, pts[j][0], pts[j][1], BONE);
      });
    return p;
  });

  return (t, { color } = {}) => {
    const u = mod(t, LOOP);
    const p = new Uint8Array(W * H);
    p.set(poses[Math.floor(u / STEP) % POSES]);
    for (let i = 0; i < p.length; i++) if (head[i]) p[i] = head[i];
    const eye = u >= 3.3 && u < 3.5 ? SHUT : EYE;
    sprite(p, CX - 15, 14, eye, KEYS);
    sprite(p, CX + 5, 14, eye.map((r) => [...r].reverse().join("")), KEYS);
    return emit(p, color);
  };
}
