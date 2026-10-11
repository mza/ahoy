/*
 * jack-rackham: the flag of "Calico Jack" Rackham: a scowling skull, and
 * under it two cutlasses crossed, their blades curving up and their gold
 * hilts at the foot. A glint runs up one blade and then the other, and each
 * time it leaves the point the skull's eyes flash.
 *
 * Drawn after the flag credited to Rackham in the early 1700s (public
 * domain), as pixel art in block elements, two square pixels a cell, in three
 * flat colours. The skull is geometry, a pixel at a time, shaded down its
 * right side; each blade is a curve with a width, a bright edge and a fuller.
 * Black gaps keep the shapes apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "jack rackham",
  category: "scenes",
  note: "calico jack's flag: a skull over two crossed cutlasses, glinting",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // blade iron, bone, hilt gold
  palette: ["#8a94a6", "#e8e2d0", "#f2b632"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const IRON = 1, BONE = 2, GOLD = 3;

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

// ---- the skull, row by row from its crown: broad, scowling, its teeth clenched

const CX = 39.5, TOP = 0;
// Half its width on row j: the cranium, the cheekbones, the square jaw and the chin.
const halfAt = (j: number) => {
  if (j < 19) return 16.5 * Math.sqrt(1 - ((j - 14.5) / 15) ** 2);
  if (j < 22) return 15.7 - (j - 19) * 0.4;
  if (j < 25) return 14.5 - (j - 22);
  if (j < 33) return 11.5;
  return 11.5 - [1, 2.5, 4.5][j - 33];
};
const ROWS = 36, MOUTH = 30;
const SOCKETS = [-1, 1].map((s) => [CX + s * 7.5, TOP + 15.5]);
// A socket: an oval, its top cut off by a brow that slants down to the nose.
const inSocket = (x: number, y: number) => SOCKETS.some(([sx, sy]) => ((x - sx) / 5.6) ** 2 + ((y - sy) / 4.8) ** 2 < 1 && y - sy > 0.6 - Math.abs(x - CX) * 0.45);
const NOSE = ["..__..", ".____.", ".____.", "______", "__..__"];
// What flashes in each socket, small and large.
const EYES = [
  ["....", ".gg.", ".gg.", "...."],
  [".gg.", "gggg", "gggg", ".gg."],
];

// ---- the cutlasses

// One blade's spine, from the guard up to the point, as a curve; the other is its mirror image.
const P0 = [13, 56], P1 = [47, 51], P2 = [74, 19];
const at = (s: number) => {
  const a = 1 - s;
  return [a * a * P0[0] + 2 * a * s * P1[0] + s * s * P2[0], a * a * P0[1] + 2 * a * s * P1[1] + s * s * P2[1]];
};
// Half the blade's width along it: broadening towards the point, then the edge cut away up to the back.
const BROAD = 3.7, CUT = 0.8;
const half = (s: number) => (s < CUT ? 2.3 + (BROAD - 2.3) * (s / CUT) : 0.5 + (BROAD - 0.5) * (1 - ((s - CUT) / (1 - CUT)) ** 2));
// The middle of the blade there, and which way is across it: on the spine, until the cut, where it keeps to the back.
const mid = (s: number) => {
  const [x, y] = at(s), [x1, y1] = at(s + 0.01), l = Math.hypot(x1 - x, y1 - y), k = s < CUT ? 0 : BROAD - half(s);
  const nx = (y1 - y) / l, ny = -(x1 - x) / l;
  return [x + nx * k, y + ny * k, nx, ny];
};
const LOOP = 4, RUN = 0.9, STARTS = [0.5, 2.5];

export default function jackRackham(): Frame {
  // one cutlass's blade, and for each pixel of it how far along the blade it is
  const one = new Uint8Array(W * H), along = new Float32Array(W * H).fill(-1);
  const N = 300;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let best = 9, off = 0, wide = 1;
      for (let i = 0; i <= N; i++) {
        const s = 0.03 + (0.97 * i) / N, [bx, by, nx, ny] = mid(s), d = Math.hypot(x - bx, y - by) / half(s);
        if (d < best) (best = d), (along[y * W + x] = s), (off = (x - bx) * nx + (y - by) * ny), (wide = half(s));
      }
      const s = along[y * W + x];
      if (best >= 1) along[y * W + x] = -1;
      // iron, with a bright cutting edge and a fuller along the back, a little way in
      else one[y * W + x] = off < -wide + 1.3 ? BONE : s > 0.09 && s < 0.36 && off > wide - 2.4 && off < wide - 1.4 ? 0 : IRON;
    }
  // its hilt: a guard across the blade curling at its ends, a grip, a pommel, and a bow from guard to pommel
  const hilt = new Uint8Array(W * H);
  const l = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]), d = [(P1[0] - P0[0]) / l, (P1[1] - P0[1]) / l], n = [-d[1], d[0]];
  const G = [P0[0] - d[0] * 1.5, P0[1] - d[1] * 1.5];
  const on = (f: number, side: number) => [G[0] - d[0] * f + n[0] * side, G[1] - d[1] * f + n[1] * side];
  const bar = (a: number[], b: number[], r: number, k = GOLD) => {
    const m = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2));
    for (let i = 0; i <= m; i++) disc(hilt, a[0] + ((b[0] - a[0]) * i) / m, a[1] + ((b[1] - a[1]) * i) / m, r, r, k);
  };
  bar(on(0, -5), on(0, 5.5), 1.2);
  bar(on(0, -5), on(-1.5, -6), 1.1);
  bar(on(1.5, 0), on(8, 0), 1.4);
  bar(on(10, 0), on(10, 0), 2.3);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 0.5, b = ((i + 1) / 16) * Math.PI * 0.5;
    bar(on(10 * Math.sin(a), 5.5 * Math.cos(a) + 1.6 * Math.sin(2 * a)), on(10 * Math.sin(b), 5.5 * Math.cos(b) + 1.6 * Math.sin(2 * b)), 0.8);
  }
  over(one, hilt, 0, 0, 1);

  // both, the second laid over the first, under the skull
  const still = new Uint8Array(W * H), two = new Uint8Array(W * H);
  const own = new Float32Array(W * H).fill(-1), blade = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) two[y * W + x] = one[y * W + W - 1 - x];
  still.set(one);
  over(still, two, 0, 0, 1);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!still[i] || still[i] === GOLD) continue;
      if (two[i]) (own[i] = along[y * W + W - 1 - x]), (blade[i] = 1);
      else own[i] = along[i];
    }
  // the skull: bone, shaded down its right side, with the face cut out of it
  const skull = new Uint8Array(W * H);
  for (let j = 0; j < ROWS; j++)
    for (let x = 0; x < W; x++) {
      const dx = Math.abs(x - CX), y = TOP + j;
      if (dx < halfAt(j) && !inSocket(x, y)) skull[y * W + x] = x > CX && x + 2 - CX >= halfAt(j) ? IRON : BONE;
    }
  sprite(skull, 37, TOP + 20, NOSE, {});
  // the grin: a line turned up at its ends, and teeth either side of it
  rect(skull, 30, TOP + MOUTH, 20, 1, 0);
  for (const x of [29, 50]) rect(skull, x, TOP + MOUTH - 1, 1, 1, 0);
  for (let x = 32; x < 48; x += 3) rect(skull, x, TOP + MOUTH - 3, 1, 7, 0);
  over(still, skull);
  tidy(still);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    STARTS.forEach((start, b) => {
      const k = (u - start) / RUN;
      if (k < 0 || k > 1.6) return;
      // a band of light across the blade, moving up it, a black line either side so it shows in one ink
      const s = k * 1.1;
      for (let i = 0; i < p.length; i++) {
        const far = Math.abs(own[i] - s);
        if (blade[i] === b && own[i] >= 0 && far < 0.06) p[i] = far < 0.04 ? BONE : 0;
      }
      // and as it leaves the point, the eyes flash
      if (k > 0.95) for (const [x, y] of SOCKETS) sprite(p, Math.round(x - 2), Math.round(y), EYES[k < 1.1 || k > 1.4 ? 0 : 1], { g: GOLD });
    });
    return emit(p, color);
  };
}
