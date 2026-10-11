/*
 * dead-eye: a long-jawed skull in a red bandana, knotted at the side, with a
 * patch strapped over one eye. An ember glows and dims in the other socket,
 * which winks now and then; the jaw drops and clacks shut, twice, and the
 * tails of the knot flap.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours. The bone is shaded down its right-hand
 * edges; black lines under the bandana and around the patch and its strap
 * keep it readable in one ink.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "dead eye",
  category: "scenes",
  note: "a skull in a red bandana and an eyepatch, winking, its jaw clacking",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone and its shade, the patch's iron grey, the ember's gold, bandana red
  palette: ["#e8e2d0", "#b3ad9c", "#59616f", "#f2b632", "#e23a2e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, SHADE = 2, PATCH = 3, GOLD = 4, RED = 5;

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

const CX = 36, CY = 23; // the middle of the cranium
const EX = CX - 9, EY = CY + 8; // the middle of the open socket
const NOSE = ["..#..", ".###.", "#####", "##.##", "##.##"];
const LOOP = 6;

// Bone's right-hand edges in its shade, as if lit from the left.
const shade = (p: Uint8Array) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[y * W + x] === BONE && (x === W - 1 || !p[y * W + x + 1])) p[y * W + x] = SHADE;
};
// The bandana's lower edge at a column: it dips towards the ears.
const brim = (x: number) => CY - 7 + Math.round(3 * ((x - CX) / 23) ** 2);
// A tooth-wide comb of gaps across a row of teeth.
const gaps = (p: Uint8Array, y: number, h: number) => {
  for (let x = CX - 8; x <= CX + 8; x += 4) rect(p, x, y, 1, h, 0);
};
// A strip of cloth from one point to another, widening, its end cut in a swallowtail.
const tail = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, bend: number) => {
  for (let i = 0; i <= 40; i++) {
    const s = i / 40, x = x0 + (x1 - x0) * s + bend * Math.sin(Math.PI * s), y = y0 + (y1 - y0) * s, r = 1.1 + 1.6 * s;
    disc(p, x, y, r, r, RED);
    if (i > 34) disc(p, x, y + 0.5, (i - 34) * 0.28, (i - 34) * 0.4, 0);
  }
};

export default function deadEye(): Frame {
  // what never moves: the head down to its top teeth
  const still = new Uint8Array(W * H);
  disc(still, CX, CY, 22.5, 20.5, BONE);
  for (const s of [-1, 1]) disc(still, CX + s * 14.5, CY + 13, 4.5, 4.5, BONE);
  rect(still, CX - 11, CY + 12, 23, 15, BONE);
  // the open socket under its brow, the nose, the teeth, a crack
  for (let y = EY - 6; y <= EY + 6; y++)
    for (let x = EX - 7; x <= EX + 7; x++) if (((x - EX) / 6.6) ** 2 + ((y - EY) / 5.6) ** 2 < 1 && y >= EY - 5.5 + 0.3 * (x - EX + 6)) set(still, x, y, 0);
  NOSE.forEach((row, j) => [...row].forEach((c, i) => c === "#" && set(still, CX - 2 + i, CY + 13 + j, 0)));
  gaps(still, CY + 22, 5);
  for (const [x, y] of [[17, 22], [18, 23], [18, 24], [19, 25], [20, 25], [20, 26], [19, 27]]) set(still, x, y, 0);
  shade(still);
  // the patch and its strap, in a black line of their own
  const patch = new Uint8Array(W * H);
  line(patch, CX + 3, CY + 3, CX - 3, CY - 6, PATCH, 2);
  line(patch, CX + 14, CY + 3, CX + 23, CY - 1, PATCH, 2);
  for (let i = 0; i < patch.length; i++) if (!still[i]) patch[i] = 0;
  for (let y = 0; y <= 13; y++) {
    const half = y === 0 ? 6 : y <= 7 ? 7 : Math.round(7 - (y - 7) * 1.15);
    rect(patch, CX + 9 - half, CY + 2 + y, 2 * half + 1, 1, PATCH);
  }
  over(still, patch);
  // the bandana, drawn a pixel proud of the skull, a black line under it, creases running in to its knot
  for (let y = 0; y < CY; y++)
    for (let x = 0; x < W; x++) {
      if (((x - CX) / 23.5) ** 2 + ((y - CY) / 21.5) ** 2 >= 1) continue;
      if (y <= brim(x)) still[y * W + x] = RED;
      else if (y === brim(x) + 1) still[y * W + x] = 0;
    }
  line(still, 57, 15, 46, 12, 0);
  line(still, 57, 13, 49, 8, 0);
  disc(still, 59.5, 16, 2.6, 2.6, RED);
  // the jaw, apart from the head
  const jaw = new Uint8Array(W * H);
  rect(jaw, CX - 11, 0, 23, 4, BONE);
  [11, 11, 10, 10, 9, 7].forEach((half, j) => rect(jaw, CX - half, 4 + j, 2 * half + 1, 1, BONE));
  gaps(jaw, 0, 4);
  shade(jaw);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    const beat = Math.floor(u / 0.75) % 2;
    // the knot's two tails, hanging or lifted on the wind
    tail(p, 61, 18, 63 + 2 * beat, 35 - 2 * beat, 2 - beat);
    tail(p, 62, 16, 71 + beat, 27 - 3 * beat, -1.5);
    if (u >= 2 && u < 2.35) {
      // a wink: the lid shut over the socket
      rect(p, EX - 7, EY - 6, 15, 13, BONE);
      for (let x = -5; x <= 5; x++) set(p, EX + x, EY + 2 - Math.round((x / 5) ** 2 * 2), 0);
    } else {
      // the ember, low or flaring
      if (beat) disc(p, EX, EY + 0.5, 3.4, 3.4, RED);
      disc(p, EX, EY + 0.5, beat ? 2.2 : 1.6, beat ? 2.2 : 1.6, GOLD);
    }
    // the jaw: shut, but for two quick clacks
    const k = u - 4, drop = (k >= 0 && k < 0.25) || (k >= 0.45 && k < 0.7) ? 3 : 0;
    for (let i = 0; i < 10 * W; i++) if (jaw[i]) p[i + (CY + 28 + drop) * W] = jaw[i];
    return emit(p, color);
  };
}
