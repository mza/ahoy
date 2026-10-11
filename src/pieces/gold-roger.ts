/*
 * gold-roger: a skull and crossbones cast in solid gold, like an idol out of
 * a treasure hoard: square-browed, big-toothed, a ruby set in each eye
 * socket and a third in the forehead, held by a chased band. A sheen sweeps
 * slowly across the gold, and the rubies glint one after another with little
 * four-point stars.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat
 * colours: gold, a darker gold down the right-hand edges and in the chasing,
 * bone-white for the highlights, and ruby red. The skull is geometry, a pixel
 * at a time; black gaps keep it apart from the bones and the jewels apart
 * from their settings, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "gold roger",
  category: "scenes",
  note: "a solid gold skull and crossbones with ruby eyes, gleaming",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // dark gold, gold, ruby, bone for the highlights
  palette: ["#a8741a", "#f2b632", "#e23a2e", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const DARK = 1, GOLD = 2, RED = 3, BONE = 4;

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

const disc = (p: Uint8Array, cx: number, cy: number, rx: number, ry: number, k: number) => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) set(p, x, y, k);
};
// A long bone from one end to the other: a shaft with two knuckles at each end.
const bone = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, k: number) => {
  const l = Math.hypot(x1 - x0, y1 - y0), dx = (x1 - x0) / l, dy = (y1 - y0) / l;
  for (let i = 0; i <= l * 2; i++) disc(p, x0 + (dx * i) / 2, y0 + (dy * i) / 2, 2.6, 2.6, k);
  for (const [x, y, s] of [[x0, y0, -1], [x1, y1, 1]])
    for (const side of [-1, 1]) disc(p, x + dx * s * 1.2 - dy * side * 3, y + dy * s * 1.2 + dx * side * 3, 3.6, 3.6, k);
};

// ---- the skull, row by row from its crown: a squared dome, broad cheekbones, a heavy jaw full of teeth

const CX = 39.5, TOP = 10, ROWS = 43, MOUTH = 36;
// Half its width on row j.
const halfAt = (j: number) => {
  if (j < 22) return 20 * (1 - Math.abs((j - 16.5) / 17.3) ** 2.3) ** 0.435;
  if (j < 25) return 19.6 - (j - 22) * 0.5;
  if (j < 29) return 18.1 - (j - 25) * 1.3;
  if (j < 40) return 13;
  return 13 - [0.7, 2, 4][j - 40];
};
const SOCKETS = [-1, 1].map((s) => [CX + s * 8.5, TOP + 18.5]);
// A socket: squared off, like a setting cut for a stone.
const inSocket = (x: number, y: number) => SOCKETS.some(([sx, sy]) => Math.abs((x - sx) / 6) ** 3 + Math.abs((y - sy) / 5.6) ** 3 < 1);
const GEM = [CX, TOP + 7]; // the stone in the forehead, a lozenge
const NOSE = ["..__..", "..__..", ".____.", ".____.", "______", "__..__"];
const JEWELS = [SOCKETS[0], GEM, SOCKETS[1]];
// A glint, growing and dying back.
const STARS = [
  [".b.", "bbb", ".b."],
  ["..b..", "..b..", "bbbbb", "..b..", "..b.."],
  ["...b...", "...b...", "..bbb..", "bbbbbbb", "..bbb..", "...b...", "...b..."],
];
const LOOP = 6, GLINTS = [0.75, 1.75, 2.75], SHEEN = [3.5, 5.7];

export default function goldRoger(): Frame {
  // the bones, crossed behind the skull, each shaded down its lower right and lit along its upper left
  const still = new Uint8Array(W * H), front = new Uint8Array(W * H);
  bone(still, 8, 9, 71, 55, GOLD);
  bone(front, 71, 9, 8, 55, GOLD);
  over(still, front);
  for (let y = 0; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (still[i] !== GOLD) continue;
      if (!still[i + 1] || !still[i + W]) still[i] = DARK;
    }
  // the skull, whole, cut out of them with a gap around it
  const whole = new Uint8Array(W * H), skull = new Uint8Array(W * H);
  for (let j = 0; j < ROWS; j++)
    for (let x = 0; x < W; x++) {
      if (Math.abs(x - CX) >= halfAt(j)) continue;
      const y = TOP + j, i = y * W + x;
      whole[i] = 1;
      if (inSocket(x, y)) continue;
      // gold, three pixels of darker gold down its right side, a bone-white rim up its left
      skull[i] = x > CX && x + 3 - CX >= halfAt(j) ? DARK : x < CX && CX - x + 1 >= halfAt(j) && j > 5 && j < 24 ? BONE : GOLD;
      // and a shine on the dome, up and to the left
      const r = Math.hypot((x - CX) / 20, (j - 16.5) / 17.3), a = Math.atan2(j - 16.5, x - CX);
      if (r > 0.6 && r < 0.7 && a > -2.62 && a < -2.05) skull[i] = BONE;
    }
  // a heavy brow chased over each eye, a cell deep so it keeps its colour
  for (const [sx] of SOCKETS) rect(skull, sx - 6, TOP + 10, 13, 2, DARK);
  // the stone in the forehead, in its setting
  for (let y = GEM[1] - 7; y <= GEM[1] + 7; y++)
    for (let x = Math.floor(CX - 6); x <= CX + 6; x++) {
      const d = Math.abs(x - GEM[0]) / 3.6 + Math.abs(y - GEM[1]) / 4.6;
      if (d < 1.5) skull[y * W + x] = d < 1 ? RED : 0;
    }
  // the stones in the eyes: round, with room round them
  for (const [sx, sy] of SOCKETS) disc(skull, sx, sy, 3.7, 3.7, RED);
  // a facet lit on each stone
  for (const [x, y] of JEWELS) set(skull, x - 1.5, y - 1.5, BONE);
  sprite(skull, 37, TOP + 26, NOSE, {});
  // the teeth: broad, in two rows, set into the jaw
  rect(skull, 28, TOP + MOUTH, 24, 1, 0);
  for (const x of [27, 52]) set(skull, x, TOP + MOUTH - 1, 0);
  for (let x = 30; x <= 50; x += 4) rect(skull, x, TOP + MOUTH - 3, 1, 7, 0);
  // a pixel of darker gold on the near side of every hollow
  for (let y = 1; y < H; y++) for (let x = 1; x < CX + 14; x++) if (skull[y * W + x] === GOLD && !skull[y * W + x + 1] && skull[y * W + x - 1]) skull[y * W + x] = DARK;
  over(still, whole, 2);
  for (let i = 0; i < still.length; i++) if (whole[i]) still[i] = skull[i];
  tidy(still);
  // a highlight on the upper knuckles
  for (const [x, y] of [[5, 9], [10, 5], [68, 5], [73, 10], [5, 53], [69, 58]]) rect(still, x, y, 2, 1, BONE);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    // the sheen: a slanting band of light crossing from left to right, a thinner one after it
    if (u >= SHEEN[0] && u < SHEEN[1]) {
      const at = Math.round(((u - SHEEN[0]) / (SHEEN[1] - SHEEN[0])) * 150) - 10;
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const far = at - (x + ((y & ~1) >> 1)), i = y * W + x;
          if (!((far >= 0 && far < 7) || (far >= 10 && far < 13))) continue;
          if (p[i] === GOLD) p[i] = BONE;
          else if (p[i] === DARK) p[i] = GOLD;
        }
    }
    // the rubies glint in turn: left eye, forehead, right eye
    GLINTS.forEach((start, n) => {
      const k = (u - start) / 0.6;
      if (k < 0 || k >= 1) return;
      const rows = STARS[[0, 1, 2, 2, 1, 0][Math.floor(k * 6)]], h = rows.length >> 1;
      sprite(p, Math.round(JEWELS[n][0] - 1.5) - h, Math.round(JEWELS[n][1] - 1.5) - h, rows, { b: BONE });
    });
    return emit(p, color);
  };
}
