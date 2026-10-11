/*
 * crossed-cutlasses: two curved cutlasses crossed, hilts down, with a small
 * skull where they cross. A glint runs up one blade from hilt to point, then
 * up the other, and each point winks as the light leaves it.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours, steel and bone shaded down their right-hand
 * edges. Black gaps keep the shapes apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "crossed cutlasses",
  category: "scenes",
  note: "two crossed cutlasses and a skull, a glint running up each blade",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // steel and its shade, hilt gold, bone's shade and bone
  palette: ["#8a94a6", "#59616f", "#f2b632", "#bdb6a6", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const IRON = 1, SHADE = 2, GOLD = 3, DIM = 4, BONE = 5;

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
// The right-hand edges of one ink in another, as if lit from the left.
const shade = (p: Uint8Array, ink: number, dark: number) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[y * W + x] === ink && (x === W - 1 || !p[y * W + x + 1])) p[y * W + x] = dark;
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

// ---- the cutlasses

// One blade's spine, from the guard up to the point, as a curve; the other is its mirror image.
const P0 = [20, 46], P1 = [50, 35], P2 = [70, 4];
const at = (s: number) => {
  const a = 1 - s;
  return [a * a * P0[0] + 2 * a * s * P1[0] + s * s * P2[0], a * a * P0[1] + 2 * a * s * P1[1] + s * s * P2[1]];
};
// Half the blade's width along it: broadening towards the point, then the edge cut away up to the back.
const BROAD = 4.3, CUT = 0.76;
const half = (s: number) => (s < CUT ? 2.7 + (BROAD - 2.7) * (s / CUT) : 0.5 + (BROAD - 0.5) * (1 - ((s - CUT) / (1 - CUT)) ** 2));
// The middle of the blade there and the way to its back: on the spine, until the cut, where it keeps to the back.
const mid = (s: number) => {
  const [x, y] = at(s), [x1, y1] = at(s + 0.01), l = Math.hypot(x1 - x, y1 - y), k = s < CUT ? 0 : BROAD - half(s);
  const bx = (y1 - y) / l, by = -(x1 - x) / l;
  return [x + bx * k, y + by * k, bx, by];
};
const WINK = ["..b..", "..b..", "bb.bb", "..b..", "..b.."];
const LOOP = 3.6, RUN = 1.0, STARTS = [0.2, 2.0];

// A small skull, face on, about the bridge of its nose: 21 pixels wide, from 13 above that to 11 below.
const skull = (p: Uint8Array, cx: number, cy: number) => {
  disc(p, cx, cy - 3, 10.5, 10.2, BONE);
  for (const s of [-1, 1]) disc(p, cx + s * 7, cy + 4, 2.4, 2.2, BONE);
  rect(p, cx - 6, cy + 4, 13, 8, BONE);
  // the sockets, each under a brow that slants down towards the nose
  for (const s of [-1, 1])
    for (let y = cy - 4; y <= cy + 3; y++)
      for (let x = cx + s * 5 - 4; x <= cx + s * 5 + 4; x++) {
        const out = s * (x - cx - s * 5);
        if ((out / 3.6) ** 2 + ((y - cy) / 3.3) ** 2 < 1 && y >= cy - 3 + 0.34 * (3.6 - out)) set(p, x, y, 0);
      }
  set(p, cx, cy + 4, 0);
  rect(p, cx - 1, cy + 5, 3, 1, 0);
  // the mouth, the gaps between its teeth, and a crack in the crown
  rect(p, cx - 5, cy + 8, 11, 1, 0);
  for (const x of [-3, 0, 3]) rect(p, cx + x, cy + 9, 1, 3, 0);
  for (const [x, y] of [[4, -13], [4, -12], [3, -11], [4, -10], [5, -9]]) set(p, cx + x, cy + y, 0);
};

export default function crossedCutlasses(): Frame {
  // one cutlass; for each pixel of its blade, how far along the blade it is
  const one = new Uint8Array(W * H), along = new Float32Array(W * H).fill(-1);
  const d = [P1[0] - P0[0], P1[1] - P0[1]].map((v) => v / Math.hypot(P1[0] - P0[0], P1[1] - P0[1]));
  const n = [-d[1], d[0]];
  // a point in the hilt's own frame: `f` back from the guard along the grip, `side` out towards the knuckles
  const hilt = (f: number, side: number) => [P0[0] - d[0] * f + n[0] * side, P0[1] - d[1] * f + n[1] * side];
  const bow: number[][] = [];
  for (let i = 0; i <= 60; i++) {
    const u = i / 60, a = 1 - u, [ax, ay] = hilt(1.5, 7.6), [bx, by] = hilt(14, 9.5), [cx, cy] = hilt(14, 1.5);
    bow.push([a * a * ax + 2 * a * u * bx + u * u * cx, a * a * ay + 2 * a * u * by + u * u * cy]);
  }
  const N = 300;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const f = -((x - P0[0]) * d[0] + (y - P0[1]) * d[1]), side = (x - P0[0]) * n[0] + (y - P0[1]) * n[1];
      // the blade, a fuller scored along it nearer the back
      let best = 9, off = 0;
      for (let j = 0; j <= N; j++) {
        const s = j / N, [mx, my, bx, by] = mid(s), far = Math.hypot(x - mx, y - my) / half(s);
        if (far < best) (best = far), (along[i] = s), (off = (x - mx) * bx + (y - my) * by);
      }
      if (best < 1 && f < -1.6) one[i] = along[i] > 0.42 && along[i] < 0.74 && Math.abs(off - 1.4) < 0.55 ? 0 : IRON;
      else along[i] = -1;
      // the hilt: a guard across the blade, a grip, a pommel, and a knuckle bow from guard round to pommel
      if (f >= -0.6 && f < 2.4 && side > -4.6 && side < 8.6) one[i] = GOLD;
      if (f >= 2.4 && f < 12.5 && Math.abs(side) < 1.9) one[i] = GOLD;
      if (Math.hypot(f - 13.8, side) < 2.8) one[i] = GOLD;
      if (bow.some(([bx, by]) => Math.hypot(x - bx, y - by) < 1.15)) one[i] = GOLD;
    }
  shade(one, IRON, SHADE);

  // both, the second laid over the first, and the skull over the crossing
  const still = new Uint8Array(W * H), two = new Uint8Array(W * H), head = new Uint8Array(W * H);
  const own = new Float32Array(W * H).fill(-1), blade = new Uint8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = one[y * W + W - 1 - x];
      two[y * W + x] = k === SHADE ? IRON : k;
    }
  shade(two, IRON, SHADE);
  still.set(one);
  over(still, two, 0, 0, 1);
  skull(head, 40, 36);
  shade(head, BONE, DIM);
  // (cleared to its outline first, so no steel shows through its sockets)
  const solid = new Uint8Array(W * H);
  disc(solid, 40, 33, 10.5, 10.2, BONE);
  rect(solid, 31, 36, 19, 12, BONE);
  over(still, solid, 0, 0, 1);
  for (let i = 0; i < still.length; i++) if (solid[i]) still[i] = head[i];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (still[i] !== IRON && still[i] !== SHADE) continue;
      if (two[i]) (own[i] = along[y * W + W - 1 - x]), (blade[i] = 1);
      else own[i] = along[i];
    }
  const tip = mid(1);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    p.set(still);
    STARTS.forEach((start, b) => {
      const k = (u - start) / RUN;
      if (k < 0 || k > 1.25) return;
      // a band of light across the blade, moving up it, a black line either side so it shows in one ink
      const s = k * 1.1;
      for (let i = 0; i < p.length; i++) {
        const far = Math.abs(own[i] - s);
        if (blade[i] === b && own[i] >= 0 && far < 0.052) p[i] = far < 0.036 ? BONE : 0;
      }
      // and a wink off the point as it leaves
      if (k > 0.95) {
        const x = Math.round(b ? W - 1 - tip[0] : tip[0]), y = Math.round(tip[1]) - 1;
        if (k < 1.1) sprite(p, x - 2, y - 2, WINK, { b: BONE });
        else set(p, x, y, BONE);
      }
    });
    return emit(p, color);
  };
}
