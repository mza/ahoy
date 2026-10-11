/*
 * snake-roger: a skull with a snake wound through it, over crossed bones. The
 * snake passes behind the eyes, comes out of one socket, loops over the crown
 * and down the far side, and rears its head there. Its bands slide along its
 * body as it goes, its head sways, and its forked red tongue flicks.
 *
 * Pixel art in block elements, two square pixels a cell, in five flat
 * colours. The skull is built from an ellipse and rows a pixel at a time,
 * with slit sockets, a hissing mouth with two fangs and its right-hand edges
 * in shade; the snake is a curve through a few points, every pixel of it
 * knowing how far along the body it is, which is what lets the bands slide.
 * Black gaps keep the skull, the bones and the snake apart, so it reads in one
 * ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "snake roger",
  category: "scenes",
  note: "a skull with a banded snake wound through it, tongue flicking",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone and its shade, palm green and a darker green, blood red
  palette: ["#e8e2d0", "#a9a392", "#4fa35a", "#2c6b3c", "#e23a2e"],
} satisfies Meta;

// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, SHADE = 2, GREEN = 3, DARK = 4, RED = 5;
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

// ---- the skull and its snake

const C = 24; // the row of the middle of the cranium
const NOSE = ["..#..", ".###.", ".###.", "##.##", "#...#"];
const CRACK = ["#..", "#..", ".#.", ".##", "..#", "..#", ".#."];
// The snake's line: behind the eyes from the right socket to the left, out of that and round the temple, over
// the crown, down the far side, round and up into a raised neck. The last four points sway with the head.
const PATH = [
  [58, 26.5], [48.5, 29], [43, 30.5], [37, 30.5], [31.5, 29], [25.5, 25.5], [20.5, 19], [22.5, 10.5], [30, 5], [40, 4],
  [50, 5.5], [57, 10.5], [60.5, 18], [60.5, 26], [64, 31.5], [68, 30], [69.5, 24], [68.5, 18], [69, 13],
];
const OUT = 4, SWAY = [0.25, 0.6, 1, 1]; // the point it comes out of the socket at; how much of the sway each neck point takes
// The head, nose to the right, and the tongue: out, half in, and in.
const HEAD = ["..#####.", ".###_###", "########", "########", ".######."];
const TONGUES = [["..r", "rr.", "..r"], [".", "r", "."], []];
const THICK = 2.45, BAND = 6, LOOP = 6;

export default function snakeRoger(): Frame {
  // the skull: a narrow cranium, slit sockets that rise to the temples, a mouth open in a hiss
  const skull = new Uint8Array(W * H);
  disc(skull, CX, C, 17.2, 15.4, BONE);
  for (let y = C + 6; y <= C + 14; y++) span(skull, y, 15.8 - (y - C - 6) * 0.35, BONE);
  span(skull, C + 15, 11.5, BONE);
  for (let y = C + 16; y <= C + 25; y++) span(skull, y, y < C + 22 ? 9.5 : 9.5 - (y - C - 21) * 1.1, BONE);
  const holes = new Uint8Array(W * H);
  for (const s of [-1, 1])
    for (let y = C - 2; y <= C + 12; y++)
      for (let x = 0; x <= 17; x++) {
        const dx = x - 8.5, dy = y - C - 5 + dx * 0.3;
        if ((dx / 6.3) ** 2 + (dy / 3.7) ** 2 < 1) set(skull, CX + s * x, y, 0), set(holes, CX + s * x, y, 1);
      }
  sprite(skull, CX - 2, C + 10, NOSE, { "#": 0 });
  // the mouth: three top teeth and two long fangs hanging into it, the points of the bottom teeth under them
  rect(skull, CX - 7, C + 17, 15, 6, 0);
  for (const x of [-3, 0, 2]) rect(skull, CX + x, C + 17, x ? 2 : 1, 2, BONE);
  for (const s of [-1, 1]) rect(skull, CX + s * 6 - (s < 0 ? 0 : 1), C + 17, 2, 4, BONE), set(skull, CX + s * 5, C + 21, BONE);
  for (let x = CX - 3; x <= CX + 3; x += 2) set(skull, x, C + 22, BONE);
  sprite(skull, CX + 2, C - 14, CRACK, { "#": 0 });
  const solid = filled(skull);
  shade(skull);

  // the bones, one laid over the other, and the skull on them
  const emblem = new Uint8Array(W * H), other = new Uint8Array(W * H);
  bone(emblem, 6, 40, 74, 58, BONE);
  bone(other, 74, 40, 6, 58, BONE);
  shade(emblem), shade(other);
  over(emblem, other, other, 1);
  over(emblem, skull, solid, 1);

  // the snake in three poses, its head a pixel to the left, upright, and a pixel to the right. Each is the
  // emblem with the snake's shape cut out of it, and for every pixel of the snake how far along the body it is.
  const poses = [-1, 0, 1].map((sway) => {
    const pts = PATH.map(([x, y], i) => [x + sway * (SWAY[i - (PATH.length - SWAY.length)] ?? 0), y]);
    const along = new Float32Array(W * H).fill(-1), near = new Float32Array(W * H).fill(99);
    let s = 0, px = pts[0][0], py = pts[0][1];
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], d = pts[Math.min(pts.length - 1, i + 2)];
      for (let n = 0; n < 40; n++) {
        // a smooth curve through the points, a short step at a time
        const k = n / 40, k2 = k * k, k3 = k2 * k;
        const at = (j: number) => 0.5 * (2 * b[j] + (c[j] - a[j]) * k + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * k2 + (3 * b[j] - a[j] - 3 * c[j] + d[j]) * k3);
        const x = at(0), y = at(1);
        (s += Math.hypot(x - px, y - py)), (px = x), (py = y);
        const inside = i < OUT;
        for (let yy = Math.floor(y - THICK); yy <= y + THICK; yy++)
          for (let xx = Math.floor(x - THICK); xx <= x + THICK; xx++) {
            const dist = Math.hypot(xx - x, yy - y), at2 = yy * W + xx;
            if (dist >= THICK || xx < 0 || xx >= W || yy < 0 || yy >= H) continue;
            // behind the eyes it shows only through the sockets, a pixel clear of their rims
            if (inside && !(holes[at2] && holes[at2 - W] && holes[at2 + W])) continue;
            if (!inside && along[at2] >= 0 && near[at2] <= dist && s - along[at2] < 12) continue;
            if (inside && along[at2] >= 0 && near[at2] <= dist) continue;
            (along[at2] = s), (near[at2] = dist);
          }
      }
    }
    // the head sits on the end of the neck; the whole snake is laid over the emblem with a gap cut round it
    const base = new Uint8Array(emblem), body: number[] = [];
    const head = new Uint8Array(W * H), all = new Uint8Array(W * H), hx = Math.round(px) - 2, hy = Math.round(py) - 4;
    sprite(head, hx, hy, HEAD, { "#": GREEN });
    for (let i = 0; i < all.length; i++) {
      if (head[i] || (along[i] >= 0 && !holes[i])) all[i] = GREEN;
      if (along[i] >= 0 && !head[i]) body.push(i);
    }
    over(base, all, all, 1);
    sprite(base, hx, hy, HEAD, { "#": GREEN });
    return { base, body, along, hx, hy };
  });

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const { base, body, along, hx, hy } = poses[Math.round(Math.sin((u * Math.PI * 2) / 3) * 1.4 * 0.71) + 1];
    const p = new Uint8Array(base);
    // the bands slide towards the head
    for (const i of body) p[i] = (((along[i] - u * 7) % BAND) + BAND) % BAND < 2 ? DARK : GREEN;
    // the tongue: a flick, and another, then a rest
    const k = (u + 0.2) % 1.5, tongue = TONGUES[k < 0.1 ? 1 : k < 0.35 ? 0 : k < 0.45 ? 1 : k >= 0.6 && k < 0.85 ? 0 : 2];
    sprite(p, hx + 8, hy + 2, tongue, { r: RED });
    return emit(p, color);
  };
}
