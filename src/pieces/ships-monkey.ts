/*
 * ships-monkey: the ship's monkey, sitting up in a red waistcoat and a fez,
 * a gold coin held up in one hand. Its long tail curls and uncurls, it blinks,
 * it flips the coin and catches it, and now and then it scratches its head.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in six flat colours. The monkey is built in layers (tail, body,
 * legs, head, arms), each laid over the last with a black gap cut round it, the
 * fur shaded down its right-hand edges. It reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "ships monkey",
  category: "scenes",
  note: "a monkey in a red waistcoat and fez, flipping a gold coin",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // fur and its shade, the face, the waistcoat, gold, bone
  palette: ["#a8703a", "#74491f", "#e3b98a", "#e23a2e", "#f2b632", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const FUR = 1, SHADE = 2, FACE = 3, RED = 4, GOLD = 5, BONE = 6;

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
// A filled polygon, a pixel at a time.
const poly = (p: Uint8Array, pts: number[][], k: number) => {
  for (let y = 0; y < H; y++) {
    const xs: number[] = [];
    pts.forEach(([x0, y0], i) => {
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
    });
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i]); x <= Math.floor(xs[i + 1]); x++) set(p, x, y, k);
  }
};
// A limb: a round brush of radius `r` dragged through the points.
const tube = (p: Uint8Array, pts: number[][], r: number, k: number) => {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let j = 0; j <= n; j++) disc(p, Math.round(x0 + ((x1 - x0) * j) / n), Math.round(y0 + ((y1 - y0) * j) / n), r, r, k);
  }
};
// Fur's right-hand edges in its shade, as if lit from the left.
const shade = (p: Uint8Array) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[y * W + x] === FUR && (x === W - 1 || !p[y * W + x + 1])) p[y * W + x] = SHADE;
  return p;
};
const canvas = () => new Uint8Array(W * H);

// ---- the monkey

const LOOP = 8;
const CX = 13, CY = 24; // the coin at rest, on the fingers

// The tail: along the deck to the right, then up and round into a curl that tightens towards its tip.
const tail = (curl: number) => {
  const q = canvas();
  let x = 45, y = 58, a = 0;
  for (let s = 0; s < 66; s += 0.5) {
    disc(q, Math.round(x), Math.round(y), 1.3, 1.3, FUR);
    if (s > 9) a += 0.5 * curl * (s - 9);
    x += 0.5 * Math.cos(a);
    y -= 0.5 * Math.sin(a);
  }
  return shade(q);
};

// The trunk: fur, a pale belly, and the waistcoat open over it with two gold buttons.
const trunk = () => {
  const q = canvas();
  disc(q, 37, 44, 12, 13.5, FUR);
  shade(q);
  for (let y = 30; y < 58; y++)
    for (let x = 20; x < 56; x++) {
      if (!q[y * W + x]) continue;
      const open = 3 + (y - 31) * 0.12, d = Math.abs(x - 37.5), hem = 51 - d * 0.35;
      if (d < open) q[y * W + x] = y < 50 - d * 0.6 ? FACE : FUR;
      else if (d < open + 1 && y < hem + 1) q[y * W + x] = 0;
      else if (y < hem) q[y * W + x] = RED;
      else if (y < hem + 1) q[y * W + x] = 0;
    }
  rect(q, 43, 38, 2, 2, GOLD);
  rect(q, 44, 44, 2, 2, GOLD);
  return q;
};

// A leg: the thigh, and a long pale foot with its toes.
const leg = (s: number) => {
  const q = canvas();
  disc(q, 37.5 + s * 11.5, 51.5, 7, 6, FUR);
  shade(q);
  const f = canvas();
  disc(f, 37.5 + s * 15, 59.5, 6.5, 2.6, FACE);
  for (const i of [2, 4]) rect(f, Math.round(37.5 + s * (15 + i)), 60, 1, 2, 0);
  over(q, f);
  return q;
};

// The head: ears, a pale mask round the eyes and muzzle, and the fez with its tassel.
const head = (blink: boolean) => {
  const q = canvas();
  disc(q, 24.5, 19.5, 4, 4.5, FUR);
  disc(q, 50.5, 19.5, 5.5, 5.5, FUR);
  shade(q);
  disc(q, 24.5, 19.5, 2, 2.5, FACE);
  disc(q, 51, 19.5, 3, 3, FACE);
  const h = canvas();
  disc(h, 37.5, 19.5, 12, 11, FUR);
  shade(h);
  disc(h, 31.5, 17.5, 4.6, 4.4, FACE);
  disc(h, 40.5, 17.5, 5, 4.4, FACE);
  disc(h, 35.5, 25, 8, 4.8, FACE);
  // a peak of fur between the brows
  rect(h, 35, 12, 2, 3, FUR);
  set(h, 36, 15, FUR);
  // the eyes, the nostrils and a grin turned up at its ends
  for (const x of [31, 40]) {
    if (blink) rect(h, x - 1, 18, 4, 1, 0);
    else {
      rect(h, x, 16, 2, 3, 0);
      set(h, x, 16, BONE);
    }
  }
  set(h, 34, 23, 0);
  set(h, 37, 23, 0);
  rect(h, 31, 27, 10, 1, 0);
  set(h, 30, 26, 0);
  set(h, 41, 26, 0);
  over(q, h);
  // the fez
  const z = canvas();
  poly(z, [[32, 2], [42, 2], [44, 9], [30, 9]], RED);
  rect(z, 30, 9, 15, 1, RED);
  over(q, z);
  line(q, 37, 0, 46, 0, GOLD);
  line(q, 46, 0, 47, 4, GOLD);
  rect(q, 46, 4, 3, 4, GOLD);
  return q;
};

// An arm through shoulder, elbow and wrist, with a pale hand at the end of it.
const arm = (pts: number[][], hx: number, hy: number) => {
  const q = canvas();
  tube(q, pts, 2.1, FUR);
  shade(q);
  const f = canvas();
  disc(f, hx, hy, 2.9, 2.9, FACE);
  over(q, f);
  return q;
};

// The coin, `wide` pixels across as it turns, with a shine on it.
const coin = (p: Uint8Array, cx: number, cy: number, wide: number) => {
  const q = canvas();
  disc(q, cx, cy, wide, 4.6, GOLD);
  if (wide > 3) {
    rect(q, cx - 2, cy - 2, 1, 3, BONE);
    rect(q, cx + 1, cy - 1, 1, 3, 0);
    set(q, cx, cy + 2, 0);
  } else if (wide > 1) set(q, cx - 1, cy - 1, BONE);
  over(p, q);
};

export default function shipsMonkey(): Frame {
  // what can be drawn ahead: the tail in each curl, the body, the two heads, the arms
  const tails = [0.0034, 0.0039, 0.0044, 0.0049, 0.0054].map(tail);
  const body = trunk();
  for (const s of [-1, 1]) over(body, leg(s));
  const heads = [head(false), head(true)];
  const holding = arm([[28, 35], [19, 43], [14, 35]], 13.5, 32);
  const resting = arm([[47, 35], [56, 42], [52, 47]], 50.5, 48);
  const scratching = [0, 1].map((j) => arm([[47, 35], [59, 25], [50 - j, 11]], 47.5 - j * 2, 9.5));

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = canvas();
    p.set(tails[Math.round(2 + 2 * Math.sin((u / LOOP) * 4 * Math.PI))]);
    over(p, body);
    const blink = (u >= 1 && u < 1.15) || (u >= 4.5 && u < 4.65) || (u >= 4.9 && u < 5.05);
    over(p, heads[blink ? 1 : 0]);
    over(p, holding);
    const scratch = u >= 5.6 && u < 7.4;
    over(p, scratch ? scratching[Math.floor(u / 0.15) % 2] : resting);

    // the coin: at rest on the fingers, or spinning up and back
    const f = (u - 2.1) / 1.1;
    if (f >= 0 && f < 1) {
      const up = Math.round(4 * 19 * f * (1 - f));
      coin(p, CX, CY - up, [4.6, 3.2, 1.2, 3.2][Math.floor(f * 12) % 4]);
    } else coin(p, CX, CY, 4.6);
    return emit(p, color);
  };
}
