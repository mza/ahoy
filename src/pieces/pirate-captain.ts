/*
 * pirate-captain: a head-and-shoulders portrait of a pirate captain, face on:
 * a big tricorn trimmed with gold, a patch over one eye, a great dark beard
 * tied with red ribbons, a gold ring in his ear and a red coat with gold
 * buttons. He blinks his one eye, the slow matches in his beard smoulder, and
 * he breaks into a slow grin that shows a gold tooth.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in six flat colours. Coat, face, beard and hat are each drawn on a
 * canvas of their own and laid one over the other with a black gap cut round
 * them, so it reads in one ink too; the eye, the mouth and the sparks are set
 * in afresh each frame.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "pirate captain",
  category: "scenes",
  note: "a bearded captain in a tricorn: he blinks, grins, his fuses smoulder",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // beard and hat, the face's shade, the face, blood red, gold, bone
  palette: ["#5e4636", "#a8703a", "#d39a66", "#e23a2e", "#f2b632", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const DARK = 1, TAN = 2, SKIN = 3, RED = 4, GOLD = 5, BONE = 6;

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
// A filled polygon, by scanline.
const poly = (p: Uint8Array, pts: number[][], k: number) => {
  for (let y = 0; y < H; y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) set(p, x, y, k);
  }
};
// Lay one canvas over another, with a black gap cut around everything on it.
const over = (p: Uint8Array, q: Uint8Array, gap = 1) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (q[y * W + x]) rect(p, x - gap, y - gap, 2 * gap + 1, 2 * gap + 1, 0);
  for (let i = 0; i < q.length; i++) if (q[i]) p[i] = q[i];
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

// ---- the captain

const CX = 40;
// The brim of the hat at a distance `d` from its middle: its turned-up edge, and its underside.
const brimTop = (d: number) => 11 - Math.round(5 * (d / 36) ** 2.2);
const brimFoot = (d: number) => 22 - Math.round(14 * (d / 36) ** 2);
// The outside of the beard: half its width at each row, between these marks.
const BEARD = [[24, 16], [36, 16.5], [40, 19.5], [45, 21.5], [50, 20.5], [53, 17.5]];
const beardHalf = (y: number) => {
  for (let i = 0; i + 1 < BEARD.length; i++) {
    const [y0, a] = BEARD[i], [y1, b] = BEARD[i + 1];
    if (y >= y0 && y <= y1) return a + ((b - a) * (y - y0)) / (y1 - y0);
  }
  return -1;
};
// Where the beard begins on the cheeks.
const cheek = (d: number) => 43 - 0.03 * d * d;
// The badge on the hat.
const BADGE = [".ooooo.", "ooooooo", "o__o__o", "o__o__o", "ooo_ooo", ".ooooo.", ".o_o_o.", ".o_o_o."];
const RING = [".g.", "g_g", "g_g", ".g."];
// The sparks at the end of a slow match, by turns: g gold, r red, about the match's end.
const SPARKS = [
  [[0, 0, "g"], [-1, -2, "r"], [1, -1, "r"]],
  [[0, 0, "g"], [0, -1, "g"], [-2, -1, "r"], [2, -3, "r"]],
  [[0, 0, "r"], [-1, -1, "g"], [1, -2, "g"], [-2, -4, "r"]],
  [[0, 0, "g"], [1, -1, "r"], [-1, -3, "g"], [2, -5, "r"]],
] as const;
const LOOP = 8;

export default function pirateCaptain(): Frame {
  // the coat: red shoulders, gold epaulettes with a fringe, gold buttons
  const still = new Uint8Array(W * H);
  poly(still, [[27, 49], [6, 55], [2, 64], [78, 64], [74, 55], [53, 49]], RED);
  for (const s of [-1, 1]) {
    line(still, CX + s * 34, 55, CX + s * 23, 52, GOLD, 2);
    for (let i = 0; i < 6; i++) rect(still, CX + s * (34 - 2 * i), 56 - Math.round(i * 0.3) + 1, 1, 3, GOLD);
    for (const [x, y] of [[20, 58], [22, 62]]) rect(still, CX + s * x - (s > 0 ? 1 : 0), y, 2, 2, GOLD);
    // a lapel seam
    line(still, CX + s * 17, 53, CX + s * 13, 64, 0);
  }

  // the coat falls open on a black shirt, so the beard's locks stand clear
  poly(still, [[CX - 15, 48], [CX + 15, 48], [CX + 9, 64], [CX - 9, 64]], 0);

  // the face, shaded down its right-hand side, and the ears
  const face = new Uint8Array(W * H);
  disc(face, CX, 31, 15.5, 17, SKIN);
  for (const s of [-1, 1]) disc(face, CX + s * 17, 32, 2.2, 3.4, s > 0 ? TAN : SKIN);
  for (let y = 14; y < 48; y++) for (let x = CX + 12; x < CX + 16; x++) if (face[y * W + x]) face[y * W + x] = TAN;
  over(still, face);

  // the beard: sideburns, cheeks and chin, three locks at its foot
  const beard = new Uint8Array(W * H);
  for (let y = 24; y <= 53; y++)
    for (let x = CX - 22; x <= CX + 22; x++) {
      const d = Math.abs(x - CX);
      if (d <= beardHalf(y) && (y >= cheek(d) || d >= 14)) set(beard, x, y, DARK);
    }
  // three locks at its foot, the middle one longest, each tied with a ribbon
  for (let y = 54; y <= 63; y++) {
    const side = 5.5 - (y - 54) * 0.62, mid = 4.6 - (y - 54) * 0.4;
    for (const s of [-1, 1]) for (let x = Math.ceil(11 - side); x <= 11 + side; x++) set(beard, CX + s * x, y, y === 56 || y === 57 ? RED : DARK);
    for (let x = Math.ceil(-mid); x <= mid; x++) set(beard, CX + x, y, y === 58 || y === 59 ? RED : DARK);
  }
  // strands: wavy cuts down the beard
  for (const d of [0, 7, 13, 18])
    for (const s of d ? [-1, 1] : [1])
      for (let y = 51 - (d > 10 ? 5 : 0); y < 55 - d * 0.3; y++) {
        const x = CX + s * d + [0, 0, 1, 1, 0, 0, -1, -1][y % 8];
        if (beard[y * W + x - 1] === DARK && beard[y * W + x + 1] === DARK && beard[(y + 2) * W + x] === DARK) beard[y * W + x] = 0;
      }
  // the mouth's hollow under the moustache
  rect(beard, CX - 9, 44, 19, 7, 0);
  over(still, beard);
  rect(still, CX - 9, 44, 19, 7, 0);

  // the ring in his ear
  const ring = new Uint8Array(W * H);
  sprite(ring, 20, 36, RING, { g: GOLD });
  over(still, ring);

  // the slow matches: a cord curling out of the beard on either side
  const TIPS = [[12, 44], [68, 44]];
  for (const s of [-1, 1]) {
    line(still, CX + s * 21, 50, CX + s * 25, 49, BONE);
    line(still, CX + s * 25, 49, CX + s * 28, 45, BONE);
  }

  // the hat: a crown, and the brim across it with its edge in gold and a badge
  const hat = new Uint8Array(W * H);
  disc(hat, CX, 12, 15, 11.5, DARK);
  for (let x = CX - 36; x <= CX + 36; x++) {
    const d = Math.abs(x - CX), a = brimTop(d), b = brimFoot(d);
    rect(hat, x, a - 1, 1, 1, 0);
    rect(hat, x, a, 1, Math.max(1, b - a + 1), DARK);
    rect(hat, x, a, 1, 2, GOLD);
  }
  sprite(hat, CX - 3, 14, BADGE, { o: BONE });
  over(still, hat);

  // what never moves on the face: brows, the patch and its strap, the nose, a scar
  rect(still, 28, 26, 9, 2, DARK), rect(still, 35, 28, 3, 1, DARK);
  rect(still, 43, 29, 9, 7, 0);
  set(still, 43, 35, SKIN), set(still, 51, 35, SKIN);
  line(still, 44, 29, 35, 23, 0), line(still, 51, 30, 55, 27, 0);
  rect(still, 42, 30, 1, 8, TAN), rect(still, 43, 37, 1, 3, TAN);
  rect(still, 37, 40, 7, 2, TAN);
  set(still, 37, 39, 0), set(still, 38, 40, 0), set(still, 42, 40, 0);
  for (let i = 0; i < 4; i++) rect(still, 29 + i, 35 + i, 1, 1, 0);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    p.set(still);

    // his one eye, under a dark lid; shut for a moment twice a loop
    const shut = (u >= 1.3 && u < 1.45) || (u >= 4.7 && u < 4.85);
    rect(p, 29, 29, 8, 1, 0);
    if (shut) rect(p, 30, 32, 6, 1, 0);
    else {
      rect(p, 30, 30, 6, 4, BONE);
      set(p, 30, 33, SKIN), set(p, 35, 33, SKIN);
      rect(p, 33, 31, 2, 2, 0);
    }

    // the grin: none, half, whole; it comes on slowly and frame 0 has it whole
    const grin = u < 2 || u >= 6.6 ? 2 : u < 2.5 || u >= 5.6 ? 1 : 0;
    // the moustache, its tips lifting as he grins
    for (let i = 0; i <= 16; i++)
      for (const s of i ? [-1, 1] : [1]) {
        const h = i < 11 ? 3 : i < 14 ? 2 : 1;
        const y = 42 + Math.round(0.02 * i * i) - (i > 13 ? Math.round((i - 13) * 1.5) : 0) - (grin === 2 && i > 7 ? 1 : 0);
        rect(p, CX + s * i - 1, y - 1, 3, h + 2, 0);
      }
    for (let i = 0; i <= 16; i++)
      for (const s of i ? [-1, 1] : [1]) {
        const h = i < 11 ? 3 : i < 14 ? 2 : 1;
        const y = 42 + Math.round(0.02 * i * i) - (i > 13 ? Math.round((i - 13) * 1.5) : 0) - (grin === 2 && i > 7 ? 1 : 0);
        rect(p, CX + s * i, y, 1, h, DARK);
      }
    set(p, CX, 42, 0);
    if (grin === 0) rect(p, CX - 4, 47, 9, 2, SKIN);
    else {
      // teeth, a gap between each, one of them gold, and the lip under them
      const half = grin === 2 ? 7 : 4;
      for (let x = CX - half; x <= CX + half; x++) if ((x - CX + 9) % 3 !== 1) rect(p, x, 46, 1, 2, x - CX === 2 || x - CX === 3 ? GOLD : BONE);
      rect(p, CX - half + 2, 49, 2 * half - 3, 1, SKIN);
      // a glint on the gold tooth
      if (u >= 0.6 && u < 0.9) set(p, CX + 2, 46, BONE);
    }

    // the matches smoulder: sparks jump at their ends, each match in its own time
    TIPS.forEach(([x, y], n) => {
      for (const [dx, dy, c] of SPARKS[(Math.floor(u * 6) + n * 2) % 4]) set(p, x + (n ? -dx : dx), y + dy, c === "g" ? GOLD : RED);
    });
    return emit(p, color);
  };
}
