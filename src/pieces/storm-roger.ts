/*
 * storm-roger: a howling skull on a stormy night, with two jagged bolts of
 * lightning crossed behind it where the bones should be. The bolts flash
 * gold with a white-hot core and the skull lights up bone-white; then they
 * die back to a thin dark trace and the skull to iron grey, two sparks
 * left burning in its eyes, while slanting rain falls. Then it strikes again.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat
 * colours. The skull is geometry, a pixel at a time, shaded down its
 * right-hand edges when it is lit; each bolt is a crooked line with a width,
 * tapering to its point. Black gaps keep the shapes apart, so it reads in one
 * ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "storm roger",
  category: "scenes",
  note: "a howling skull over crossed lightning bolts, flashing in the rain",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // dark gold, iron, gold, bone
  palette: ["#8f6414", "#8a94a6", "#f2b632", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const DARK = 1, IRON = 2, GOLD = 3, BONE = 4;

const set = (p: Uint8Array, x: number, y: number, k: number) => {
  x = Math.round(x), y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) p[y * W + x] = k;
};
const rect = (p: Uint8Array, x: number, y: number, w: number, h: number, k: number) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(p, x + i, y + j, k);
};
// Rows of characters as pixels `scale` across: "." leaves the pixel alone, "_" empties it, others are looked up in `keys`.
const sprite = (p: Uint8Array, x: number, y: number, rows: string[], keys: Record<string, number>, scale = 1) => {
  rows.forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c !== ".") rect(p, x + i * scale, y + j * scale, scale, scale, c === "_" ? 0 : keys[c]);
    }),
  );
};
// One canvas laid over another, with a black gap cut around it first.
const over = (dst: Uint8Array, src: Uint8Array, gap = 1) => {
  for (let pass = 0; pass < 2; pass++)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const k = src[y * W + x];
        if (!k) continue;
        if (pass) set(dst, x, y, k);
        else rect(dst, x - gap, y - gap, 2 * gap + 1, 2 * gap + 1, 0);
      }
};
// Sweep up the crumbs a gap can leave behind: any speck of fewer than `least` pixels.
const tidy = (p: Uint8Array, least = 6) => {
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

// ---- the skull, row by row from its crown: narrow-eyed, sharp in the cheek, its long jaw dropped in a howl

const CX = 39.5, TOP = 6, ROWS = 47;
// Half its width on row j: the cranium, the cheekbones, the long jaw and the chin.
const halfAt = (j: number) => {
  if (j < 21) return 18.5 * Math.sqrt(1 - ((j - 15) / 15.6) ** 2);
  if (j < 24) return 17.6 - (j - 21) * 0.6;
  if (j < 28) return 15.8 - (j - 24) * 1.45;
  if (j < 43) return 10;
  return 10 - [0.5, 1.4, 2.8, 5][j - 43];
};
const SOCKETS = [-1, 1].map((s) => [CX + s * 7.6, TOP + 15.5]);
// A socket: a tall almond, leaning out at the top.
const inSocket = (x: number, y: number) =>
  SOCKETS.some(([sx, sy], n) => ((x - sx + (n ? 1 : -1) * (y - sy) * 0.32) / 4.3) ** 2 + ((y - sy) / 6.3) ** 2 < 1);
const NOSE = ["..__..", ".____.", ".____.", "__..__", "__..__"];
// The crack in its brow: a little bolt of its own.
const CRACK = [[0, 0], [0, 1], [1, 2], [1, 3], [2, 4], [1, 5], [0, 5], [-1, 5], [0, 6], [1, 7], [1, 8], [2, 9]];
// The howl: the hollow of the open mouth, its corners rounded.
const HOWL = ["..__________..", ".____________.", "______________", "______________", "______________", "______________", "______________", ".____________.", "..__________.."];

// ---- a bolt of lightning: a crooked line from the sky in one top corner to its point in the far bottom one

const BOLT = [[1, -3], [19, 10], [11, 13], [28, 26], [51, 39], [66, 48], [58, 52], [76, 63]];
// How far a pixel is from the bolt's middle line, as a share of the bolt's half-width there.
const bolt = (x: number, y: number) => {
  let best = 9;
  for (let n = 0; n + 1 < BOLT.length; n++) {
    const [a, b] = BOLT[n], [c, d] = BOLT[n + 1];
    const k = Math.max(0, Math.min(1, ((x - a) * (c - a) + (y - b) * (d - b)) / ((c - a) ** 2 + (d - b) ** 2)));
    // it tapers along its last stretch to a point
    const half = n + 2 < BOLT.length ? 3.1 : 3.1 - 2.7 * k;
    best = Math.min(best, Math.hypot(x - a - (c - a) * k, y - b - (d - b) * k) / half);
  }
  return best;
};

// Rain: where each drop starts, and how fast it falls. They slant to the left as they fall.
const RAIN = [[6, 0, 40], [19, 31, 40], [33, 58, 80], [47, 12, 40], [58, 44, 40], [70, 70, 80], [79, 22, 40], [90, 51, 40], [27, 5, 80], [64, 37, 40], [84, 66, 40], [12, 49, 80]];
const LOOP = 6;
// When in the loop the sky is lit: a strike with a flicker after it, twice.
const LIT = [[0, 0.3], [0.4, 0.55], [3, 3.12], [3.22, 3.5]];
const GLOW = 0.25; // how long the bolts stay gold after the light goes

export default function stormRoger(): Frame {
  // how near each pixel is to either bolt
  const near = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) near[y * W + x] = Math.min(bolt(x, y), bolt(W - 1 - x, y));
  // the skull, lit: bone, two pixels of iron shade down its right side and one on the near side of every hollow
  const whole = new Uint8Array(W * H), skull = new Uint8Array(W * H);
  for (let j = 0; j < ROWS; j++)
    for (let x = 0; x < W; x++) {
      if (Math.abs(x - CX) >= halfAt(j)) continue;
      const y = TOP + j;
      whole[y * W + x] = 1;
      if (!inSocket(x, y)) skull[y * W + x] = x > CX && x + 2 - CX >= halfAt(j) ? IRON : BONE;
    }
  sprite(skull, 37, TOP + 21, NOSE, {});
  for (const [x, y] of CRACK) skull[(TOP + 1 + y) * W + 44 + x] = 0;
  // the open mouth, and the gaps between the teeth above and below it
  sprite(skull, 33, TOP + 32, HOWL, {});
  for (let x = 35; x < 46; x += 3) rect(skull, x, TOP + 29, 1, 4, 0), rect(skull, x, TOP + 40, 1, 4, 0);
  for (let y = 1; y < TOP + 27; y++) for (let x = 1; x < CX + 14; x++) if (skull[y * W + x] === BONE && !skull[y * W + x + 1] && skull[y * W + x - 1]) skull[y * W + x] = IRON;

  // three states: lit (thick gold bolts, white-hot down the middle, the skull bone), glowing (the bolts thinner, the skull gone grey), and dark
  const state = (thick: number, core: number, ink: number, lit: boolean) => {
    const p = new Uint8Array(W * H);
    // the core is judged a cell at a time, since a cell has one ink
    for (let i = 0; i < p.length; i++) {
      const top = i - ((i / W) & 1) * W;
      if (near[i] < thick) p[i] = (near[top] + near[top + W]) / 2 < core ? BONE : ink;
    }
    over(p, whole, 2);
    for (let i = 0; i < p.length; i++) if (whole[i]) p[i] = skull[i] && !lit ? IRON : skull[i];
    // in the dark a spark burns in each eye
    if (!lit) for (const [sx, sy] of SOCKETS) rect(p, Math.round(sx - 1), sy + 0.5, 2, 2, GOLD);
    return tidy(p, 3);
  };
  const lit = state(1, 0.4, GOLD, true), glow = state(0.5, 0, GOLD, false), dark = state(0.28, 0, DARK, false);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const flash = LIT.some(([a, z]) => u >= a && u < z);
    const after = u >= 3 ? u - 3.5 : u - 0.55;
    const p = new Uint8Array(flash ? lit : after >= 0 && after < GLOW ? glow : dark);
    // the rain: thin drops falling on a slant, behind everything, bright while the sky is lit
    for (const [x0, y0, speed] of RAIN) {
      const y = ((y0 + speed * u) % 80) - 8, x = Math.round(x0 - y * 0.35), yy = Math.round(y);
      // a drop is a short streak, three pixels long, a pixel wide
      if (x < 2 || x > W - 3 || yy < 3 || yy > H - 2) continue;
      // a drop is a short streak, three pixels long, a pixel wide, and falls behind everything else
      let clear = true;
      for (let b = -3; b <= 1; b++) for (let a = -1; a <= 2; a++) if (p[(yy + b) * W + x + a] || whole[(yy + b) * W + x + a]) clear = false;
      if (clear) for (const [a, b] of [[0, 0], [0, -1], [1, -2]]) p[(yy + b) * W + x + a] = flash ? BONE : IRON;
    }
    return emit(p, color);
  };
}
