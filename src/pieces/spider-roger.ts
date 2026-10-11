/*
 * spider-roger: a cobwebbed skull over crossed bones. Webs are strung from
 * the skull to the ends of the bones and across one eye socket. A spider lets
 * itself down on a thread from the top of the frame, hangs in front of the
 * forehead working its legs, and climbs back up; the webs tremble whenever it
 * moves.
 *
 * Pixel art in block elements, two square pixels a cell, in five flat
 * colours. The skull is built from an ellipse and rows a pixel at a time,
 * long in the jaw, with tall hollow sockets, a missing tooth and its
 * right-hand edges in shade; the webs are single-pixel spokes and sagging
 * rings of iron. Black gaps keep the skull, the bones and the spider apart,
 * so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "spider roger",
  category: "scenes",
  note: "a cobwebbed skull and crossed bones, a spider let down on its thread",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // iron and its shade, bone and its shade, blood red
  palette: ["#8a94a6", "#59616f", "#e8e2d0", "#a9a392", "#e23a2e"],
} satisfies Meta;

// A pixel is 0 for empty, else a palette index plus one.
const IRON = 1, DARK = 2, BONE = 3, SHADE = 4, RED = 5;
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

// ---- the skull, its webs and the spider

const C = 24; // the row of the middle of the cranium
const NOSE = ["..#..", ".###.", ".###.", "##.##", "##.##", "#...#"];
const CRACK = ["#....", ".#...", ".#...", "..##.", "...#.", "..#..", "..#..", "...#.", "...##", "....#"];
type Pt = [number, number];
// A web in a corner: the corner its threads fan out from (hidden behind the skull, for some), the points
// they run out to (a 1 marks one drawn as a spoke; the others lie along bone already), and how far along
// the spokes each ring is strung.
const WEBS: { hub: Pt; ends: [number, number, number][]; rings: number[] }[] = [
  // between the two bones on the left
  { hub: [35, 37], ends: [[9, 22, 0], [5, 29, 1], [3, 37, 1], [5, 45, 1], [9, 52, 0]], rings: [0.45, 0.72, 1] },
  // between the crown and the bone, upper right
  { hub: [58, 23], ends: [[52, 10, 0], [59, 6, 1], [66, 8, 1], [71, 14, 0]], rings: [0.55, 1] },
  // upper left, a smaller one
  { hub: [22, 23], ends: [[28, 11, 0], [20, 8, 1], [11, 13, 0]], rings: [0.55, 1] },
  // between the bones on the right, hardly begun
  { hub: [45, 37], ends: [[70, 22, 0], [75, 32, 1], [75, 43, 1], [70, 52, 0]], rings: [0.8] },
];
// Loose threads, each sagging between two points: swags from the jaw to the bones and under the chin.
const THREADS: [number, number, number, number, number][] = [[31, 51, 18, 53, 2], [49, 51, 62, 53, 2], [36, 51, 44, 51, 2]];
const XS = 43; // the column the spider's thread hangs in
// The spider, hanging head down: its body, and two poses of its eight legs as joints off its middle.
const BODY = [".sss.", "sssss", "ssrss", "srrrs", "ssrss", ".sss.", ".sss.", "..s.."];
const LEGS: Pt[][][] = [
  [[[2, 3], [4, 1], [4, -2]], [[2, 3], [5, 2], [6, 0]], [[2, 4], [5, 4], [6, 6]], [[2, 4], [3, 6], [4, 8]]],
  [[[2, 3], [4, 1], [5, -1]], [[2, 3], [5, 3], [6, 1]], [[2, 4], [5, 5], [6, 7]], [[2, 4], [3, 6], [3, 8]]],
];
const REST = 13, AWAY = -12, LOOP = 8;

export default function spiderRoger(): Frame {
  // the skull: a tall cranium, hollow cheeks, a long square jaw of thin teeth
  const skull = new Uint8Array(W * H);
  disc(skull, CX, C, 17.8, 15.8, BONE);
  for (let y = C + 6; y <= C + 10; y++) span(skull, y, 16.4 - (y - C - 6) * 0.5, BONE);
  // the cheekbones stand out under the temples
  for (let y = C + 11; y <= C + 14; y++) span(skull, y, 15.6, BONE);
  span(skull, C + 15, 14, BONE), span(skull, C + 16, 12, BONE);
  for (let y = C + 17; y <= C + 26; y++) span(skull, y, y < C + 23 ? 11 : 11 - (y - C - 22) * 0.8, BONE);
  for (const s of [-1, 1])
    for (let y = C - 3; y <= C + 13; y++)
      for (let x = 0; x <= 16; x++) {
        // a tall hollow socket, leaning in at the top
        const dy = y - C - 5.5, dx = x - 8.2 - dy * 0.12;
        // flat under the brow
        if ((dx / 4.7) ** 2 + (dy / 5.8) ** 2 < 1 && dy > -4.6) set(skull, CX + s * x, y, 0);
      }
  sprite(skull, CX - 2, C + 12, NOSE, { "#": 0 });
  // thin teeth and the line they bite on, one tooth gone
  for (let x = CX - 10; x <= CX + 10; x += 4) rect(skull, x, C + 19, 1, 7, 0);
  rect(skull, CX - 10, C + 22, 21, 1, 0);
  rect(skull, CX + 2, C + 19, 5, 3, 0);
  // a crack from the crown down to the webbed socket
  sprite(skull, CX - 11, C - 15, CRACK, { "#": 0 });
  const solid = filled(skull);
  shade(skull);

  // the bones, crossed behind the jaw, one laid over the other
  const emblem = new Uint8Array(W * H), other = new Uint8Array(W * H);
  bone(emblem, 6, 17, 74, 57, BONE);
  bone(other, 74, 17, 6, 57, BONE);
  shade(emblem), shade(other);
  over(emblem, other, other, 1);
  over(emblem, skull, solid, 1);

  // a thread from one point to another, sagging by `sag` pixels towards (sx, sy)
  const thread = (p: Uint8Array, [x0, y0]: Pt, [x1, y1]: Pt, sag: number, sx = 0, sy = 1) => {
    const mx = (x0 + x1) / 2 + sx * sag * 2, my = (y0 + y1) / 2 + sy * sag * 2, n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
    for (let i = 0; i <= n; i++) {
      const k = i / n, a = (1 - k) ** 2, b = 2 * k * (1 - k), c = k * k;
      set(p, a * x0 + b * mx + c * x1, a * y0 + b * my + c * y1, IRON);
    }
  };
  // the whole emblem with its webs, at rest and with every thread sagging a little further
  const poses = [0, 1].map((shake) => {
    const web = new Uint8Array(W * H);
    for (const { hub, ends, rings } of WEBS) {
      for (const [x, y, spoke] of ends) if (spoke) thread(web, hub, [x, y], 0);
      for (const f of rings)
        for (let i = 0; i + 1 < ends.length; i++) {
          const at = (j: number): Pt => [hub[0] + (ends[j][0] - hub[0]) * f, hub[1] + (ends[j][1] - hub[1]) * f];
          const a = at(i), b = at(i + 1), mx = (a[0] + b[0]) / 2 - hub[0], my = (a[1] + b[1]) / 2 - hub[1], l = Math.hypot(mx, my);
          thread(web, a, b, 0.5 + shake * 0.7, -mx / l, -my / l);
        }
    }
    for (const [x0, y0, x1, y1, sag] of THREADS) thread(web, [x0, y0], [x1, y1], sag + (sag ? shake : 0));
    // the web across the left socket: three threads through its middle
    const ex = CX - 8, ey = C + 5 + shake;
    for (const [dx, dy] of [[6, 2], [-4, 6], [2, -7]]) line(web, ex - dx, ey - dy, ex + dx, ey + dy, IRON);
    const p = new Uint8Array(emblem);
    for (let i = 0; i < p.length; i++) if (web[i] && !solid[i] && !p[i]) p[i] = IRON;
    for (let y = C - 3; y <= C + 13; y++) for (let x = CX - 16; x < CX - 2; x++) if (web[y * W + x] && !skull[y * W + x]) p[y * W + x] = IRON;
    return p;
  });

  // the spider's two poses, as pixels off its middle
  const spiders = LEGS.map((legs) => {
    const s = new Uint8Array(W * H), px: [number, number, number][] = [];
    for (const side of [-1, 1])
      for (const leg of legs) for (let i = 0; i + 1 < leg.length; i++) line(s, 20 + side * leg[i][0], 20 + leg[i][1], 20 + side * leg[i + 1][0], 20 + leg[i + 1][1], DARK);
    sprite(s, 18, 18, BODY, { s: DARK, r: RED });
    for (let y = 0; y < 40; y++) for (let x = 0; x < 40; x++) if (s[y * W + x]) px.push([x - 20, y - 20, s[y * W + x]]);
    return px;
  });
  const ease = (k: number) => k * k * (3 - 2 * k);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    // hangs, climbs away, stays away, comes back down with a little bounce
    let y = REST, moving = false;
    if (u >= 2.2 && u < 3.8) (y = REST + (AWAY - REST) * ease((u - 2.2) / 1.6)), (moving = true);
    else if (u >= 3.8 && u < 5.4) y = AWAY;
    else if (u >= 5.4 && u < 7) (y = AWAY + (REST + 1 - AWAY) * ease((u - 5.4) / 1.6)), (moving = true);
    else if (u >= 7 && u < 7.3) (y = REST + 1), (moving = true);
    y = Math.round(y);
    const step = Math.floor(u / 0.15) % 2;
    const p = new Uint8Array(poses[moving ? step : 0]);
    // the thread, with a gap either side of it where it crosses the skull
    for (let j = 0; j < y - 2; j++) {
      if (get(p, XS - 1, j) || get(p, XS + 1, j) || get(p, XS, j)) rect(p, XS - 1, j, 3, 1, 0);
      set(p, XS, j, IRON);
    }
    // the spider, a gap cut round it; its legs work as it climbs, and twitch now and then as it hangs
    const pose = spiders[moving ? step : u > 0.9 && u < 1.2 ? 1 : 0];
    for (const [dx, dy] of pose) rect(p, XS + dx - 1, y + dy - 1, 3, 3, 0);
    for (const [dx, dy, k] of pose) set(p, XS + dx, y + dy, k);
    return emit(p, color);
  };
}
