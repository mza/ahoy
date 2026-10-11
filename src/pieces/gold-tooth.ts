/*
 * gold-tooth: a big round skull, front on, with slanted sockets and a wide
 * grin of square teeth, one of them gold. It bobs as it chuckles, and every so
 * often the gold tooth flashes and a little star sparkles on it.
 *
 * Pixel art in block elements, two square pixels a cell, in two flat colours.
 * The skull is a disc and a jaw with the sockets, the nose and the gaps
 * between the teeth cut out of it, so it reads the same in one ink.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "gold tooth",
  category: "scenes",
  note: "a big grinning skull, a star sparkling on its one gold tooth",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone and gold
  palette: ["#e8e2d0", "#f2b632"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, GOLD = 2;

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
const over = (p: Uint8Array, q: Uint8Array, gap = 2) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (q[y * W + x]) rect(p, x - gap, y - gap, 2 * gap + 1, 2 * gap + 1, 0);
  for (let i = 0; i < q.length; i++) if (q[i]) p[i] = q[i];
};

// ---- the skull

const CX = 39.5;
const NOSE = [".._..", ".___.", "__.__"];
// The grin: five teeth a row, each row of them lifted towards the corners of the mouth.
const LIFT = [-2, 0, 0, 0, -2];
const TOOTH = 3;
// The sparkle, small to large: b gold, w bone.
const STAR = [
  ["..b..", ".bwb.", "bbwbb", ".bwb.", "..b.."],
  ["....b....", "....b....", "....b....", "...bwb...", "bbbwwwbbb", "...bwb...", "....b....", "....b....", "....b...."],
  ["......b......", "......b......", "......b......", "......b......", ".....bwb.....", "....bwwwb....", "bbbbbwwwbbbbb", "....bwwwb....", ".....bwb.....", "......b......", "......b......", "......b......", "......b......"],
];
const LOOP = 4;

export default function goldTooth(): Frame {
  // what never moves within the skull: bone, with the face cut out of it
  const skull = new Uint8Array(W * H);
  disc(skull, CX, 26, 31, 23, BONE);
  for (let y = 38; y < 63; y++) {
    const half = y < 51 ? 26 : Math.round(26 - (y - 51) * 1.2);
    rect(skull, Math.ceil(CX - half), y, 2 * half, 1, BONE);
  }
  for (const s of [-1, 1])
    for (let y = 12; y < 36; y++)
      for (let x = 0; x < W; x++) {
        const dx = (x - CX) * s;
        if (dx > 0 && ((dx - 13.5) / 9) ** 2 + ((y - 24) / 9) ** 2 < 1 && y > 24 - 0.45 * dx) skull[y * W + x] = 0;
      }
  sprite(skull, 35, 30, NOSE, {}, 2);
  // the grin: a black mouth turned up at its ends, and two rows of teeth in it
  LIFT.forEach((l, i) => rect(skull, 19 + 8 * i, 40 + l, 10, 16, 0));
  LIFT.forEach((l, i) => {
    rect(skull, 21 + 8 * i, 42 + l, 6, 6, i === TOOTH ? GOLD : BONE);
    rect(skull, 21 + 8 * i, 50 + l, 6, 4, BONE);
  });
  const tx = 21 + 8 * TOOTH, ty = 42 + LIFT[TOOTH];

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    // the chuckle: three quick bobs
    const up = u < 1.2 && Math.floor(u / 0.2) % 2 === 1 ? 2 : 0;
    const p = new Uint8Array(W * H);
    p.set(skull.subarray(up * W));
    // the sparkle on the tooth
    const k = Math.floor((u - 2) / 0.15);
    if (k >= 0 && k < 6) {
      const star = new Uint8Array(W * H), s = STAR[[0, 1, 2, 2, 1, 0][k]], n = (s.length - 1) / 2;
      sprite(star, tx + 5 - n, ty - n - up, s, { b: GOLD, w: BONE });
      over(p, star, 1);
    }
    return emit(p, color);
  };
}
