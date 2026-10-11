/*
 * brass-compass: a round brass pocket compass seen from above, its lid open
 * behind it. The red and white needle swings, overshoots and settles on north;
 * then the case is jolted and the needle is thrown off to swing again.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in four flat colours. The case is a disc with the dial cut out of
 * it, the ticks and the letters N E S W set back in as pixels, the brass
 * shaded down its right-hand side. The needle is drawn afresh at its angle
 * each frame. It reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "brass compass",
  category: "scenes",
  note: "a brass pocket compass, its needle swinging and settling on north",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // brass and its shade, bone, and the red end of the needle
  palette: ["#f2b632", "#b9821c", "#e8e2d0", "#e23a2e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const GOLD = 1, DEEP = 2, BONE = 3, RED = 4;

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

// ---- the compass

const CX = 40, CY = 39; // the middle of the dial
const CASE = 24.4, FACE = 19.5; // the radius of the case, and of the dial cut out of it
const LETTERS: [number, number, string[]][] = [
  [0, -15, ["#...#", "##..#", "#.#.#", "#..##", "#...#"]],
  [15, 0, ["###", "#..", "##.", "#..", "###"]],
  [0, 15, [".##", "#..", ".#.", "..#", "##."]],
  [-15, 0, ["#...#", "#...#", "#.#.#", "##.##", "#...#"]],
];
const REACH = 11.6; // how far the needle reaches from its pin
const LOOP = 6, JOLT = 4.5; // seconds: the loop, and when in it the case is jolted
const SWING = 1.2; // seconds for the needle to swing there and back
const THROW = (52 * Math.PI) / 180; // how far off north the jolt throws it
const SHAKE = [1, -1, 1, -1, 1, 0]; // the case, a pixel side to side, as it is jolted

export default function brassCompass(): Frame {
  // what never moves within the case: the lid behind, the hinge, the rim and the dial
  const still = new Uint8Array(W * H);
  // the lid, seen almost edge on: a brass rim round its darker inside
  disc(still, CX, 9, 23.4, 8.4, GOLD);
  disc(still, CX, 9, 20.6, 6.2, 0);
  disc(still, CX, 9, 19.4, 5.2, DEEP);
  for (let x = CX - 12; x <= CX - 5; x++) set(still, x, 6 + Math.round((x - CX + 12) / 4), 0);
  // the hinge between the two, three knuckles
  rect(still, CX - 5, 13, 11, 5, GOLD);
  for (const x of [-2, 2]) rect(still, CX + x, 13, 1, 5, 0);
  // the case, a black gap round it, its right-hand side in shade
  disc(still, CX, CY, CASE + 1.2, CASE + 1.2, 0);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = x - CX, dy = y - CY, r = Math.hypot(dx, dy);
      if (r >= CASE || r < FACE) continue;
      const lit = (dx + dy) / (r * Math.SQRT2); // 1 at the lower right, -1 at the upper left
      still[y * W + x] = lit > 0.5 && r > CASE - 2.8 ? DEEP : GOLD;
    }
  // a shine on the rim, up and to the left
  for (let a = 208; a <= 238; a += 2) {
    const c = Math.cos((a * Math.PI) / 180), s = Math.sin((a * Math.PI) / 180);
    if (a < 228 || a > 232) set(still, CX + c * (CASE - 2.4), CY + s * (CASE - 2.4), BONE);
  }
  // the ticks round the dial: a stroke at the half points, a dot at the points between
  for (let i = 0; i < 16; i++) {
    if (i % 4 === 0) continue;
    const a = (i * Math.PI) / 8, c = Math.sin(a), s = -Math.cos(a);
    if (i % 2) set(still, CX + c * 17, CY + s * 17, BONE);
    else for (let d = 10; d <= 12; d++) set(still, CX + Math.sign(c) * d, CY + Math.sign(s) * d, BONE);
  }
  // the letter at each of the four points
  for (const [dx, dy, rows] of LETTERS) {
    sprite(still, CX + dx - (rows[0].length >> 1), CY + dy - 2, rows, { "#": BONE });
  }

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, v = u - JOLT;
    // the needle's angle off north: it swings and dies away, then the jolt throws it off again
    const a = v < 0
      ? THROW * Math.exp(-1.05 * u) * Math.cos((2 * Math.PI * u) / SWING)
      : THROW * Math.min(1, v / 0.25) * Math.sin((2 * Math.PI * v) / SWING);
    const dx = v >= 0 && v < 0.3 ? SHAKE[Math.floor(v / 0.05)] : 0;
    const p = new Uint8Array(W * H);
    if (dx > 0) p.set(still.subarray(0, W * H - dx), dx);
    else p.set(still.subarray(-dx));

    // the needle: a long diamond, red towards north, with a brass pin through it
    const sin = Math.sin(a), cos = Math.cos(a), cx = CX + dx;
    for (let y = CY - 12; y <= CY + 12; y++)
      for (let x = cx - 12; x <= cx + 12; x++) {
        const along = (x - cx) * sin - (y - CY) * cos, across = (x - cx) * cos + (y - CY) * sin;
        const half = 3.3 * (1 - Math.abs(along) / REACH);
        if (half < 0) continue;
        if (Math.abs(across) <= half) p[y * W + x] = along >= 0 ? RED : BONE;
        else if (Math.abs(across) <= half + 1 && Math.abs(along) < REACH - 1) p[y * W + x] = 0;
      }
    disc(p, cx, CY, 1.6, 1.6, GOLD);
    return emit(p, color);
  };
}
