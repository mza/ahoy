/*
 * red-roger: the "joli rouge", the red flag that meant no quarter given: a
 * leering skull on two crossed bones, all of it blood red. Blood runs down
 * from the bones and drips off them, and the sockets glow a brighter red in a
 * slow pulse.
 *
 * Pixel art in block elements, two square pixels a cell, in two reds and a
 * speck of bone. The skull is geometry, a pixel at a time, with slanted
 * sockets, a nose and teeth cut out of it; a black gap keeps it apart from
 * the bones behind it, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "red roger",
  category: "scenes",
  note: "the red flag of no quarter: a blood-red skull and bones, dripping",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // blood red, the brighter red of the glow, and bone for its hottest speck
  palette: ["#e23a2e", "#ff6a55", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const RED = 1, HOT = 2, BONE = 3;

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

// ---- the skull, row by row from its crown, and its jaw

const CX = 39.5, TOP = 4;
// Half its width on row j: the cranium, the flare of the cheekbones, then the block the teeth sit in.
const halfAt = (j: number) => {
  if (j < 20) return 17 * Math.sqrt(1 - ((j - 15) / 15.5) ** 2);
  if (j < 23) return 16.2 + (j - 20) * 0.2;
  if (j < 27) return 16 - (j - 23) * 1.6;
  return 10.5;
};
const MOUTH = 34;
const SOCKETS = [-1, 1].map((s) => [CX + s * 7.6, TOP + 16.5, s]);
// A socket: an oval tipped up at its outer end, for a leer.
const inSocket = (x: number, y: number, size = 1) =>
  SOCKETS.some(([sx, sy, s]) => {
    const a = (x - sx) * 0.92 - (y - sy) * 0.39 * s, b = (y - sy) * 0.92 + (x - sx) * 0.39 * s;
    return (a / 6) ** 2 + (b / 4.3) ** 2 < size * size;
  });
const NOSE = ["..__..", "..__..", ".____.", ".____.", "______", "__..__"];
const JAW = [0, 0, 0, 0, 1, 2, 3, 5];
// A drop of blood, falling.
const DROP = [".r.", ".r.", "rrr", "rrr", ".r."];
// Where blood runs from: a pixel on the underside of a bone, how long its loop is, and when in it the run starts.
const RUNS = [[19, 49, 3, 0.4], [61, 49, 2, 1.1], [8, 60, 3, 1.9], [71, 60, 6, 3.6]];
const LOOP = 6, PULSE = 3;

export default function redRoger(): Frame {
  // what never moves: the bones, crossed, and the skull over where they cross
  const still = new Uint8Array(W * H), fore = new Uint8Array(W * H), skull = new Uint8Array(W * H);
  bone(still, 6, 10, 73, 54, RED);
  bone(fore, 73, 10, 6, 54, RED);
  over(still, fore, 0, 0, 1);
  for (let j = 0; j < MOUTH; j++)
    for (let x = 0; x < W; x++) if (Math.abs(x - CX) < halfAt(j) && !inSocket(x, TOP + j)) skull[(TOP + j) * W + x] = RED;
  sprite(skull, 37, TOP + 22, NOSE, {});
  JAW.forEach((cut, j) => rect(skull, 29 + cut, TOP + MOUTH + 1 + j, 22 - 2 * cut, 1, RED));
  // teeth, top and bottom: three pixels each, a pixel between, the eye teeth longer
  for (let x = 31; x < 49; x += 4) rect(skull, x, TOP + MOUTH - 5, 1, 9, 0);
  rect(skull, 28, TOP + MOUTH, 24, 1, 0);
  for (const x of [29, 50]) rect(skull, x, TOP + MOUTH - 1, 1, 3, 0);
  // a crack in the crown
  for (const [x, y] of [[0, 0], [0, 1], [1, 2], [1, 3], [0, 4], [1, 5], [2, 6], [2, 7]]) skull[(TOP + 2 + y) * W + 44 + x] = 0;
  over(still, skull);
  tidy(still);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    // the glow in each socket, swelling and sinking, a speck of bone at its fullest
    const size = 0.47 + 0.23 * Math.cos((u / PULSE) * 2 * Math.PI);
    for (const [sx, sy] of SOCKETS) {
      for (let y = Math.floor(sy - 6); y < sy + 6; y++) for (let x = Math.floor(sx - 7); x < sx + 7; x++) if (inSocket(x, y, size)) p[y * W + x] = HOT;
      if (size > 0.6) rect(p, Math.floor(sx), Math.floor(sy), 2, 2, BONE);
    }
    // the blood: a run creeps down from the bone, beads, lets go and falls
    for (const [x, y, every, from] of RUNS) {
      const k = (((u - from) % every) + every) % every;
      const run = k < 0.8 ? Math.floor(k * 5) : k < 1.2 ? 4 - Math.floor((k - 0.8) * 8) : 0;
      rect(p, x, y, 1, run, RED);
      if (k >= 0.4 && k < 0.8) rect(p, x - 1, y + run - 2, 3, 2, RED);
      else if (k >= 0.8) sprite(p, x - 1, y + 2 + Math.round(26 * (k - 0.8) ** 2 * 1.6), DROP, { r: RED });
    }
    return emit(p, color);
  };
}
