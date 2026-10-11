/*
 * shovel-roger: the treasure-digger's flag. A long-jawed, gap-toothed skull
 * with worried eyes over two crossed shovels, their pointed blades up in the
 * top corners and their D-grips at the foot, and under it all a small red X
 * marking the spot. A glint runs up one blade and then the other, and a few
 * grains of sand fall from the one that dug last.
 *
 * Pixel art in block elements, two square pixels a cell, in five flat
 * colours. The skull is geometry, a pixel at a time, shaded down its
 * right-hand edges. Each shovel is drawn lying flat (grip, shaft, socket,
 * blade with a lit edge and a crease) and turned into place a pixel at a
 * time. Black gaps keep the shapes apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "shovel roger",
  category: "scenes",
  note: "the digger's flag: a skull over crossed shovels, and x marks the spot",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // iron, wood, bone's shade, bone, red
  palette: ["#8a94a6", "#a8703a", "#aaa390", "#e8e2d0", "#e23a2e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const IRON = 1, WOOD = 2, SHADE = 3, BONE = 4, RED = 5;

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

// ---- the skull, row by row from its crown: hollow-cheeked and long in the jaw, its brows drooping

const CX = 39.5, TOP = 11, ROWS = 40, MOUTH = 32;
// Half its width on row j: the cranium, the hollow cheeks, the long jaw and the chin.
const halfAt = (j: number) => {
  if (j < 19) return 17.5 * Math.sqrt(1 - ((j - 14.5) / 15.2) ** 2);
  if (j < 22) return 16.7 - (j - 19) * 0.7;
  if (j < 26) return 14.6 - (j - 22) * 1.2;
  if (j < 37) return 10 - (j - 26) * 0.1;
  return 9 - [0.6, 1.8, 3.8][j - 37];
};
const SOCKETS = [-1, 1].map((s) => [CX + s * 7.5, TOP + 15]);
// A socket: a tall oval, its top cut off by a brow that droops away from the nose.
const inSocket = (x: number, y: number) =>
  SOCKETS.some(([sx, sy]) => ((x - sx) / 5.2) ** 2 + ((y - sy) / 5.6) ** 2 < 1 && y - sy > -5.2 + Math.abs(x - CX) * 0.42);
const NOSE = ["..__..", "..__..", ".____.", ".____.", "__..__", "__..__"];
// A crack down from the crown.
const CRACK = [[0, 0], [0, 1], [1, 2], [1, 3], [2, 4], [1, 5], [1, 6], [2, 7], [3, 8], [3, 9]];

// ---- a shovel, lying flat: u runs up the shaft from the end of the grip to the point of the blade, v across it

const LONG = 87, BLADE = 15, SHOULDER = LONG - BLADE;
const seg = (u: number, v: number, a: number, b: number, c: number, d: number) => {
  const l = (c - a) ** 2 + (d - b) ** 2, k = Math.max(0, Math.min(1, ((u - a) * (c - a) + (v - b) * (d - b)) / l));
  return Math.hypot(u - a - (c - a) * k, v - b - (d - b) * k);
};
// Half the blade's width, s along it from its shoulders: rolled shoulders, straight sides, then in to a point.
const wide = (s: number) => (s < 1.5 ? 5.7 + s : s < 6 ? 7.2 : 7.2 * (1 - (s - 6) / (BLADE - 6)) ** 0.62);
// What the shovel is made of at (u, v). `lit` is which way across it the light comes from.
const shovel = (u: number, v: number, lit: number) => {
  const s = u - SHOULDER;
  if (s >= 0 && s <= BLADE) {
    const w = wide(s), a = Math.abs(v);
    if (a >= w) return 0;
    // the lit edge, the rolled step at the shoulders, and a crease down the middle of the blade
    if (v * lit > w - 1.5) return BONE;
    if (s < 1.6) return BONE;
    if (a < 0.6 && s > 3.5 && s < 10.5) return 0;
    return IRON;
  }
  // the socket the shaft is driven into
  if (s >= -7 && s < 0) return Math.abs(v) < 1.9 + (s + 7) * 0.22 ? IRON : 0;
  // the grip: a crossbar and two arms that meet at the shaft, with a hollow for the hand
  if (u >= 0 && u < 2.4 && Math.abs(v) < 5.2) return WOOD;
  if (u >= 0 && u < 10 && seg(u, Math.abs(v), 1.5, 4.1, 9.5, 0.8) < 1.15) return WOOD;
  if (u >= 8.5 && s < -7 && Math.abs(v) < 1.9) return WOOD;
  return 0;
};
// Where the shovels cross, how far up the shaft that is, and the way the left-hand shovel points.
const XC = 39.5, YC = 33, AT = 40, DU = 0.762, DV = -0.647;

const LOOP = 6, GLINTS = [0.5, 3.5], RUN = 0.8;
const MARK = ["rr.....rr", ".rr...rr.", "..rr.rr..", "...rrr...", "...rrr...", "..rr.rr..", ".rr...rr.", "rr.....rr"];
// Grains of sand: where each leaves the blade, and when in the loop.
const GRAINS = [[10, 16, 1.7], [13, 18, 1.95], [8, 14, 2.3], [11, 17, 2.6], [14, 19, 2.85], [9, 15, 3.1]];

export default function shovelRoger(): Frame {
  // each shovel on a canvas of its own, and for each pixel of its blade how far along the blade it is
  const shovels = [0, 1].map((i) => new Uint8Array(W * H));
  const along = new Float32Array(W * H).fill(-1), whose = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = x - XC, dy = y - YC, u = dx * DU + dy * DV + AT, v = -dx * DV + dy * DU;
      let k = shovel(u, v, -1);
      // a cell has one ink, so where both its pixels are shovel, both take what the middle of the cell is made of
      const my = (y & ~1) + 0.5 - YC, m = k ? shovel(dx * DU + my * DV + AT, -dx * DV + my * DU, -1) : 0;
      if (m) k = m;
      shovels[0][y * W + x] = k;
      // the other shovel is this one in a mirror, but lit from the same side
      const k2 = k === BONE || k === IRON ? shovel(u, v, u - SHOULDER < 1.6 ? -1 : 1) || k : k;
      shovels[1][y * W + W - 1 - x] = k2;
      if (k && u >= SHOULDER) (along[y * W + x] = along[y * W + W - 1 - x] = u - SHOULDER), (whose[y * W + W - 1 - x] = 1);
    }
  // the skull: bone, two pixels of shade down its right side and one on the near side of every hollow
  const skull = new Uint8Array(W * H);
  for (let j = 0; j < ROWS; j++)
    for (let x = 0; x < W; x++)
      if (Math.abs(x - CX) < halfAt(j) && !inSocket(x, TOP + j)) skull[(TOP + j) * W + x] = x > CX && x + 2 - CX >= halfAt(j) ? SHADE : BONE;
  sprite(skull, 37, TOP + 20, NOSE, {});
  for (const [x, y] of CRACK) skull[(TOP + 1 + y) * W + 45 + x] = 0;
  // the mouth, and the gaps between its long teeth; one tooth is gone
  rect(skull, 31, TOP + MOUTH, 18, 1, 0);
  for (let x = 33; x < 48; x += 3) rect(skull, x, TOP + MOUTH - 4, 1, 8, 0);
  rect(skull, 43, TOP + MOUTH - 4, 2, 4, 0);
  for (let y = 1; y < H; y++) for (let x = 1; x < CX + 14; x++) if (skull[y * W + x] === BONE && !skull[y * W + x + 1] && skull[y * W + x - 1]) skull[y * W + x] = SHADE;

  const still = new Uint8Array(shovels[0]);
  over(still, shovels[1]);
  // the skull goes over them whole, hollows and all, so nothing shows through its eyes
  const whole = new Uint8Array(W * H);
  for (let j = 0; j < ROWS; j++) for (let x = 0; x < W; x++) if (Math.abs(x - CX) < halfAt(j)) whole[(TOP + j) * W + x] = 1;
  over(still, whole, 2);
  for (let i = 0; i < still.length; i++) if (whole[i]) still[i] = skull[i];
  tidy(still);
  // the X that marks the spot, on a line of sand
  sprite(still, 35, 54, MARK, { r: RED });
  for (let x = 25; x < 55; x++) if ((x * 7) % 5 < 2) set(still, x, 63, WOOD);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    // the glint: a band of light across a blade, moving up it, a black line behind it so it shows in one ink
    GLINTS.forEach((start, b) => {
      const k = (u - start) / RUN;
      if (k < 0 || k > 1) return;
      const s = Math.round(k * (BLADE + 6)) - 2;
      for (let i = 0; i < p.length; i++) {
        if (along[i] < 0 || whose[i] !== b || !p[i]) continue;
        const far = along[i] - s;
        if (far >= 0 && far < 2.4) p[i] = BONE;
        else if (far >= -1.2 && far < 0) p[i] = 0;
      }
    });
    // the sand: grains that let go of the left-hand blade one by one and fall, faster and faster
    for (const [x, y, at] of GRAINS) {
      const k = u - at;
      if (k < 0 || k > 1) continue;
      set(p, x, y + Math.round(26 * k * k), WOOD);
    }
    return emit(p, color);
  };
}
