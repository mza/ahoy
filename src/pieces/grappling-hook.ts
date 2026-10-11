/*
 * grappling-hook: a four-pronged iron grappling hook hanging from a rope that
 * comes down from the top of the frame. It swings gently from side to side
 * like a pendulum, the rope twisting as it goes, and a glint shows on a prong
 * at each end of the swing.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in four flat colours. The hook is drawn once hanging straight: two
 * prongs behind in the iron's shade, the shank, then two prongs in front with
 * a black gap round them. Each frame its rows are slid sideways by whole
 * pixels, further the lower they hang. It reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "grappling hook",
  category: "scenes",
  note: "an iron grappling hook swinging on its rope, glinting as it turns",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone for the rope and the glint, iron and its shade, and the rope's twist
  palette: ["#e8e2d0", "#8a94a6", "#59616f", "#a8703a"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, IRON = 2, SHADE = 3, WOOD = 4;

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

// Lay one canvas over another, with a black gap cut around everything on it.
const over = (p: Uint8Array, q: Uint8Array, gap = 1) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (q[y * W + x]) rect(p, x - gap, y - gap, 2 * gap + 1, 2 * gap + 1, 0);
  for (let i = 0; i < q.length; i++) if (q[i]) p[i] = q[i];
};

// ---- the hook

const CX = 40;
const CROWN = 55; // the row the prongs spring from, at the foot of the shank
const ROPE = 18; // the rope runs from the top of the frame down to this row
// One prong: out from the crown, round and up, and curling in a little to a point.
const TURN = 2.3; // how far round a prong goes, in radians
const prong = (p: Uint8Array, reach: number, rise: number, y0: number, ink: number) => {
  for (let i = 0; i <= 120; i++) {
    const a = (TURN * i) / 120, r = a < 1.15 ? 2.8 : 2.8 - (2.3 * (a - 1.15)) / (TURN - 1.15);
    disc(p, CX + reach * Math.sin(a), y0 - rise * (1 - Math.cos(a)), r, r, ink);
  }
};
const tip = (reach: number, rise: number, y0: number) => [CX + reach * Math.sin(TURN), y0 - rise * (1 - Math.cos(TURN))];
// Iron's right-hand edges in its shade, as if lit from the left.
const shade = (p: Uint8Array) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[y * W + x] === IRON && (x === W - 1 || !p[y * W + x + 1])) p[y * W + x] = SHADE;
};
// The glint, small to large.
const STAR = [
  ["#"],
  [".#.", "###", ".#."],
  ["...#...", "...#...", "..###..", "#######", "..###..", "...#...", "...#..."],
];

const PIVOT = 46; // how far above the frame the rope is made fast
const LEAN = 0.1; // the slope of the rope at the end of a swing
const STEPS = 3; // positions either side of straight down
const LOOP = 3.2, TWIST = 0.2; // seconds: one swing there and back, and one step of the rope's twist

export default function grapplingHook(): Frame {
  // the rope: down from the top to a knot
  const hook = new Uint8Array(W * H);
  rect(hook, CX - 1, 0, 3, ROPE, BONE);
  rect(hook, CX - 3, ROPE - 5, 7, 4, BONE);
  rect(hook, CX - 2, ROPE - 6, 5, 6, BONE);
  // the hook hanging straight down: the two prongs behind
  prong(hook, 27, 13, CROWN - 1, SHADE);
  prong(hook, -15, 12, CROWN - 1, SHADE);
  rect(hook, CX, CROWN - 8, 9, 14, 0);
  // the shank, its eye at the top and a collar under it, and the crown at its foot
  const front = new Uint8Array(W * H);
  disc(front, CX, 25, 6.4, 6.4, IRON);
  disc(front, CX, 25, 3.2, 3.2, 0);
  rect(front, CX - 2, 31, 5, 25, IRON);
  rect(front, CX - 3, 33, 7, 2, IRON);
  disc(front, CX, CROWN + 1, 4.4, 4.4, IRON);
  shade(front);
  over(hook, front);
  // the two prongs in front
  for (const [reach, rise, y0] of [[15, 12, CROWN + 2], [-27, 13, CROWN + 2]]) {
    const q = new Uint8Array(W * H);
    prong(q, reach, rise, y0, IRON);
    shade(q);
    over(hook, q);
  }
  // a turn of the rope through the eye
  rect(hook, CX - 1, ROPE, 3, 8, BONE);
  // sweep up the crumbs the gaps have left
  for (let i = 0; i < hook.length; i++) {
    if (!hook[i]) continue;
    const x = i % W, y = (i - x) / W;
    let n = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (hook[(y + dy) * W + x + dx]) n++;
    if (n < 5) hook[i] = 0;
  }
  // where the glint shows: the points of the two outermost prongs
  const TIPS = [tip(-27, 13, CROWN + 2), tip(27, 13, CROWN - 1)];

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const swing = Math.cos((2 * Math.PI * u) / LOOP);
    const lean = (Math.round(swing * STEPS) / STEPS) * LEAN;
    const turn = Math.floor(u / TWIST) % 4;
    const slide = (y: number) => Math.round((y + PIVOT) * lean);
    const p = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      const dx = slide(y);
      for (let x = 0; x < W; x++) {
        let k = hook[y * W + x];
        if (!k || x + dx < 0 || x + dx >= W) continue;
        // the strands of the rope, climbing as it twists
        if (k === BONE && y < ROPE && ((y >> 1) + (x - CX) + turn + 8) % 4 === 0) k = WOOD;
        p[y * W + x + dx] = k;
      }
    }
    // the glint, on the prong that leads, at each end of the swing
    const near = Math.abs(swing);
    if (near > 0.9) {
      const [x, y] = TIPS[swing > 0 ? 1 : 0], s = STAR[near > 0.985 ? 2 : near > 0.95 ? 1 : 0], n = (s.length - 1) / 2;
      const q = new Uint8Array(W * H);
      sprite(q, Math.round(x) + slide(Math.round(y)) - n, Math.round(y) - n, s, { "#": BONE });
      over(p, q);
    }
    return emit(p, color);
  };
}
