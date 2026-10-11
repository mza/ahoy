/*
 * gold-tooth: a big round skull, front on, with slanted sockets and a wide
 * curved grin of rounded teeth, one of them gold. It bobs as it chuckles, and
 * every so often a little star sparkles on the gold tooth.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in four flat colours. The skull is a disc and a jaw with the
 * sockets, the nose and the mouth cut out of it and the teeth set back in,
 * the bone shaded down its right-hand edges. It reads the same in one ink.
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
  // bone and its shade, gold and its shade
  palette: ["#e8e2d0", "#b3ad9c", "#f2b632", "#b9821c"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, SHADE = 2, GOLD = 3, DEEP = 4;

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

// ---- the skull

const CX = 40;
const NOSE = ["...#...", "..###..", ".#####.", ".##.##.", "###.###", "##...##"];
// The line the teeth meet on at a column: a smile, turned up towards its corners.
const bite = (x: number) => Math.round(49 - 5 * ((x - CX) / 22) ** 2);
const TOOTH = 4; // which of the seven top teeth is gold
// The sparkle, small to large: g gold, w bone.
const STAR = [
  [".g.", "gwg", ".g."],
  ["...g...", "...g...", "..gwg..", "ggwwwgg", "..gwg..", "...g...", "...g..."],
  [".....g.....", ".....g.....", ".....g.....", ".....g.....", "....gwg....", "ggggwwwgggg", "....gwg....", ".....g.....", ".....g.....", ".....g.....", ".....g....."],
];
const LOOP = 4;

// Bone's right-hand edges in its shade, as if lit from the left.
const shade = (p: Uint8Array) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[y * W + x] === BONE && (x === W - 1 || !p[y * W + x + 1])) p[y * W + x] = SHADE;
};

export default function goldTooth(): Frame {
  // what never moves within the skull: bone, with the face cut out of it
  const skull = new Uint8Array(W * H);
  disc(skull, CX, 26, 31, 23, BONE);
  for (let y = 36; y < 63; y++) {
    const half = y < 42 ? 26 : y < 52 ? 26 - (y - 42) * 0.3 : 23 - 11 * ((y - 52) / 10) ** 1.7;
    rect(skull, CX - Math.round(half), y, 2 * Math.round(half) + 1, 1, BONE);
  }
  // the sockets, each under a brow that slants down towards the nose
  for (const s of [-1, 1])
    for (let y = 12; y < 36; y++)
      for (let x = 0; x < W; x++) {
        const dx = (x - CX) * s;
        if (dx > 0 && ((dx - 13.5) / 9) ** 2 + ((y - 24) / 9) ** 2 < 1 && y > 24 - 0.45 * dx) skull[y * W + x] = 0;
      }
  NOSE.forEach((row, j) => [...row].forEach((c, i) => c === "#" && set(skull, CX - 3 + i, 30 + j, 0)));
  // a crack in the crown, and a hollow under each cheekbone
  for (const [x, y] of [[49, 3], [49, 4], [48, 5], [49, 6], [50, 7], [49, 8], [48, 9], [48, 10], [47, 11]]) set(skull, x, y, 0);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) set(skull, CX + s * (25 - i), 40 + i, 0);
  // the mouth, creased at its corners, and two rows of round-cornered teeth in it
  for (let x = CX - 22; x <= CX + 22; x++) {
    const edge = Math.abs(x - CX) === 22 ? 1 : 0;
    rect(skull, x, bite(x) - 8 + edge, 1, 15 - 2 * edge, 0);
  }
  for (const s of [-1, 1]) for (let i = 1; i <= 3; i++) set(skull, CX + s * (22 + i), bite(CX + 22) - i, 0);
  shade(skull);
  for (let i = 0; i < 7; i++)
    for (let j = 0; j < 5; j++) {
      const x = CX - 20 + 6 * i + j, b = bite(x), corner = j === 0 || j === 4 ? 1 : 0, small = i === 0 || i === 6 ? 1 : 0;
      const ink = i !== TOOTH ? (j === 4 ? SHADE : BONE) : j === 4 ? DEEP : GOLD;
      rect(skull, x, b - 7 + corner + small, 1, 7 - 2 * corner - small, ink);
      rect(skull, x, b + 1 + corner, 1, 5 - 2 * corner - small, j === 4 ? SHADE : BONE);
    }
  const tx = CX - 20 + 6 * TOOTH, ty = bite(tx + 2) - 7;
  set(skull, tx + 1, ty + 1, BONE);
  set(skull, tx + 1, ty + 2, BONE);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    // the chuckle: three quick bobs
    const up = u < 1.2 && Math.floor(u / 0.2) % 2 === 1 ? 1 : 0;
    const p = new Uint8Array(W * H);
    p.set(skull.subarray(up * W));
    // the sparkle on the tooth
    const k = Math.floor((u - 2) / 0.12);
    if (k >= 0 && k < 7) {
      const star = new Uint8Array(W * H), s = STAR[[0, 1, 2, 2, 2, 1, 0][k]], n = (s.length - 1) / 2;
      sprite(star, tx + 4 - n, ty + 1 - n - up, s, { g: GOLD, w: BONE });
      over(p, star);
    }
    return emit(p, color);
  };
}
