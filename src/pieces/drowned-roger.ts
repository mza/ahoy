/*
 * drowned-roger: a skull and crossbones on the sea bed. Barnacles have
 * settled on the crown and on a bone, ribbons of weed grow out of one socket
 * and wave above the skull, and the lower ends of the bones are sunk in the
 * sand. A gold fish swims in through one eye socket and out of the other,
 * and bubbles rise from the nose cavity and wobble up past the crown.
 *
 * Pixel art in block elements, two square pixels a cell, in five flat
 * colours. The skull is built from an ellipse and rows a pixel at a time,
 * with round sockets, a jaw hanging a little open and its right-hand edges
 * in shade. Black gaps keep the skull, the bones, the weed, the bubbles and
 * the fish apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "drowned roger",
  category: "scenes",
  note: "a barnacled skull on the sea bed, a fish swimming through its eyes",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone and its shade, sea blue, palm green, doubloon gold
  palette: ["#e8e2d0", "#a9a392", "#3a7ca5", "#4fa35a", "#f2b632"],
} satisfies Meta;

// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, SHADE = 2, BLUE = 3, GREEN = 4, GOLD = 5;
const CX = 40; // the middle column

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;

const set = (p: Uint8Array, x: number, y: number, k: number) => {
  x = Math.round(x), y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) p[y * W + x] = k;
};
const get = (p: Uint8Array, x: number, y: number) => (x >= 0 && x < W && y >= 0 && y < H ? p[y * W + x] : 0);
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

// ---- the skull and what lives in it

const C = 25; // the row of the middle of the cranium
const SAND = 59; // the row the sand begins at
const NOSE = ["...#...", "..###..", ".#####.", ".#####.", "###.###", "##...##"];
const CRACK = ["#..", "#..", ".#.", ".##", "..#", ".#.", ".#."];
// The barnacles: little cones with a dark mouth, in three sizes. Each cluster is a run of them standing on the
// outline of whatever is under it: a column, a row above that outline to look down from, and the cones.
const TALL = [".sss.", ".s_s.", "ss_ss", "sssss", "sssss"], CONE = [".sss.", "ss_ss", "sssss", "sssss"], NUB = [".s.", "sss", "sss"];
const CLUSTERS: [number, number, string[][]][] = [
  [45, 4, [CONE, TALL, NUB]],
  [53, 8, [NUB, CONE]],
  [12, 22, [CONE, NUB, TALL]],
  [58, 44, [NUB, CONE]],
];
// The weed in the left socket: for each ribbon the column it grows up from, its height, how far it leans by
// the top, and where in its sway it starts.
const WEED = [[28, 32, -2, 0], [32, 26, 2, 1.3], [35, 10, 0, 2.6]];
// The tufts in the sand: a column, a height, where in its sway it starts.
const TUFTS = [[21, 7, 0.5], [23, 4, 1.7], [19, 5, 2.9], [64, 5, 1], [66, 8, 2.2], [68, 4, 0.2]];
// The fish, nose to the right, with its tail one way and the other.
const FISH = [
  ["#...####.", "##.###_##", ".########", "##.######", "#...####."],
  ["....####.", "##.###_##", "#########", "##.######", "....####."],
];
// A bubble at three sizes, as the pixels of its ring.
const RINGS = [
  [[0, -1], [-1, 0], [1, 0], [0, 1]],
  [[0, -1], [1, -1], [-1, 0], [2, 0], [-1, 1], [2, 1], [0, 2], [1, 2]],
  [[-1, -2], [0, -2], [1, -2], [-2, -1], [2, -1], [-2, 0], [2, 0], [-2, 1], [2, 1], [-1, 2], [0, 2], [1, 2]],
];
const SOCKET = 8.5, EYE = 5; // the sockets: columns off the middle, rows below the cranium's
const LOOP = 8;

export default function drownedRoger(): Frame {
  // the skull: a round cranium, round sockets, a jaw hanging a little open with a tooth gone
  const skull = new Uint8Array(W * H);
  disc(skull, CX, C, 18.4, 15.6, BONE);
  for (let y = C + 6; y <= C + 14; y++) span(skull, y, 17 - (y - C - 6) * 0.35, BONE);
  span(skull, C + 15, 13, BONE), span(skull, C + 16, 11.5, BONE);
  for (let y = C + 17; y <= C + 27; y++) span(skull, y, y < C + 24 ? 10 : 10 - (y - C - 23) * 0.9, BONE);
  for (const s of [-1, 1]) disc(skull, CX + s * SOCKET, C + EYE, 6, 5.8, 0);
  sprite(skull, CX - 3, C + 11, NOSE, { "#": 0 });
  // the mouth: top teeth hanging into it, bottom teeth standing up, a gap between
  rect(skull, CX - 8, C + 18, 17, 7, 0);
  for (let i = 0; i < 4; i++) {
    if (i !== 1) rect(skull, CX - 7 + i * 4, C + 18, 3, 3, BONE);
    rect(skull, CX - 7 + i * 4, C + 23, 3, 2, BONE);
  }
  rect(skull, CX - 3, C + 18, 2, 1, BONE);
  sprite(skull, CX + 8, C - 13, CRACK, { "#": 0 });

  // the bones: a cross behind the jaw, out to the corners, the lower ends sunk in the sand
  const bones = new Uint8Array(W * H), other = new Uint8Array(W * H);
  bone(bones, 6, 30, 74, 58, BONE);
  bone(other, 74, 30, 6, 58, BONE);

  // a cluster of barnacles standing on a shape: each cone a pixel into it, the next one beside it
  const clusters = (p: Uint8Array, which: number[], k: number) => {
    for (const n of which) {
      let [x, y0] = CLUSTERS[n];
      for (const rows of CLUSTERS[n][2]) {
        let y = y0;
        const mid = x + Math.floor(rows[0].length / 2);
        while (y < H && !get(p, mid, y) && !get(p, mid - 1, y) && !get(p, mid + 1, y)) y++;
        sprite(p, x, y - rows.length + 2, rows, { s: k });
        x += rows[0].length;
      }
    }
  };
  // drawn once in bone so the outlines take them in, and again in shade once the edges are shaded
  const crown = new Uint8Array(skull), arm = new Uint8Array(bones), far = new Uint8Array(other);
  clusters(skull, [0, 1], BONE), clusters(bones, [2], BONE), clusters(other, [3], BONE);
  const solid = filled(skull);
  shade(skull), shade(bones), shade(other);
  clusters(crown, [0, 1], SHADE), clusters(arm, [2], SHADE), clusters(far, [3], SHADE);
  for (const [a, b] of [[skull, crown], [bones, arm], [other, far]]) for (let i = 0; i < a.length; i++) if (b[i] === SHADE || (a[i] && !b[i])) a[i] = b[i];
  const still = new Uint8Array(bones);
  over(still, other, other, 1);
  over(still, skull, solid, 1);
  // the sand: everything under its line is buried, and it lies in ripples
  rect(still, 0, SAND - 1, W, H - SAND + 1, 0);
  for (let x = 0; x < W; x++) {
    const k = (x + 3) % 10;
    if (k !== 4 && k !== 9) set(still, x, k < 4 ? SAND : SAND + 1, BLUE);
    if ((x * 7) % 16 < 3) set(still, x, SAND + 3 + ((x * 3) % 2), BLUE);
  }

  // pixels laid over the canvas with a gap of a pixel cut round every one of them
  const lay = (p: Uint8Array, px: number[][]) => {
    for (const [x, y] of px) rect(p, x - 1, y - 1, 3, 3, 0);
    for (const [x, y, k] of px) set(p, x, y, k);
  };

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    const swing = (phase: number, rise: number) => Math.sin(u * (Math.PI / 2) + phase - rise * 4) * rise * 2.4;
    // the weed: ribbons two pixels wide, each with a wave in it that rides up it, swaying more the higher they go,
    // and a black line down either side
    const green: number[][] = [];
    for (const [x0, tall, lean, phase] of WEED)
      for (let i = 0; i < tall; i++) {
        const rise = i / 30, y = C + EYE + 3 - i;
        const x = Math.round(x0 + (lean * i) / tall + Math.sin(i * 0.5 + phase - u * (Math.PI / 2)) * Math.min(1, i / 8) * 0.9 + swing(phase, rise));
        if (y < 0) continue;
        rect(p, x - 1, y, 4, 1, 0);
        green.push([x, y], i < tall - 1 ? [x + 1, y] : [x, y]);
      }
    // the tufts in the sand, a pixel wide, their tips swaying
    for (const [x0, tall, phase] of TUFTS) for (let i = 0; i < tall; i++) green.push([x0 + Math.round(swing(phase, i / 14)), SAND - 1 - i]);
    for (const [x, y] of green) set(p, x, y, GREEN);
    // the bubbles: out of the nose and up, wobbling, bigger rings as they rise past the crown
    for (const start of [1, 3.5, 6]) {
      const k = (((u - start) % LOOP) + LOOP) % LOOP;
      if (k > 3.6) continue;
      const y = Math.round(C + 14 - k * 13), x = CX + Math.round(Math.sin(k * 3.5 + start) * 1.6);
      lay(p, RINGS[k < 1 ? 0 : k < 2.3 ? 1 : 2].map(([i, j]) => [x + i, y + j, BLUE]).filter(([, yy]) => yy >= 0));
    }
    // the fish: down from the left, in at the left socket, unseen behind the nose, out at the right one and up
    // and away
    const fx = Math.round(-12 + ((u + 1.9) % LOOP) * 12), mid = fx + 4;
    const fy = C + EYE + 1 - Math.round(Math.max(0, 20 - mid, mid - 60));
    const rows = FISH[Math.floor(u / 0.2) % 2], fish: number[][] = [];
    const inAt = CX - SOCKET + 5, outAt = CX + SOCKET - 5;
    rows.forEach((row, j) =>
      [...row].forEach((c, i) => {
        const x = fx + i, y = fy + j - 2;
        if (c !== "." && (fx <= inAt ? x <= inAt : x >= outAt) && x >= 0 && x < W && y >= 0) fish.push([x, y, c === "_" ? 0 : GOLD]);
      }),
    );
    lay(p, fish);
    return emit(p, color);
  };
}
