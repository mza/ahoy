/*
 * skull-candle: a skull with a stub of red candle stuck on its crown. The
 * flame flickers through four shapes, wax has capped the crown and one long
 * run of it has gone down over the brow into a socket, where a drop swells
 * and falls, and deep in the sockets a glint of gold comes and goes with the
 * flame.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours. The skull is discs and blocks with its
 * features cut out of them, the wax is hand-drawn rows, the flame is a
 * teardrop that leans. Bone and wax are shaded down their right-hand edges,
 * and a pixel of empty keeps the wax off the bone, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "skull candle",
  category: "scenes",
  note: "a skull with a candle stub on its crown, wax running, flame flickering",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone and its shade, flame gold, wax red and its shade
  palette: ["#e8e2d0", "#b3ac98", "#f2b632", "#e23a2e", "#a3261e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, SHADE = 2, GOLD = 3, RED = 4, DARK = 5;

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

// ---- the skull, face on

const CX = 40, CY = 38; // about the middle of its cranium
const EYE = 10.5, EYE_Y = CY + 4; // how far out the sockets' middles are, and their row
const NOSE = ["...#...", "..###..", ".#####.", "###.###", "###.###", "##...##"];
const CRACK = [[-11, -16], [-11, -15], [-10, -14], [-11, -13], [-12, -12], [-11, -11], [-11, -10], [-9, -13], [-8, -12]];
const skull = (p: Uint8Array) => {
  disc(p, CX, CY, 23.5, 18.5, BONE);
  for (const s of [-1, 1]) disc(p, CX + s * 15.5, CY + 11, 4.6, 3.8, BONE);
  rect(p, CX - 14, CY + 12, 29, 12, BONE);
  rect(p, CX - 13, CY + 24, 27, 2, BONE);
  // the sockets, each under a brow that slants down towards the nose
  for (const s of [-1, 1])
    for (let y = CY - 4; y <= CY + 12; y++)
      for (let x = CX + s * EYE - 8; x <= CX + s * EYE + 8; x++) {
        const out = s * (x - CX - s * EYE);
        if ((out / 7) ** 2 + ((y - EYE_Y) / 6.4) ** 2 < 1 && y >= EYE_Y - 6 + 0.3 * (7 - out)) set(p, x, y, 0);
      }
  NOSE.forEach((row, j) => [...row].forEach((c, i) => c === "#" && set(p, CX - 3 + i, CY + 11 + j, 0)));
  // the mouth, the gaps between its teeth, a crack in the crown
  rect(p, CX - 12, CY + 19, 25, 1, 0);
  for (const x of [-10, -6, -2, 2, 6, 10]) rect(p, CX + x, CY + 20, 1, 6, 0);
  for (const [x, y] of CRACK) set(p, CX + x, CY + y, 0);
  // its right-hand edges in shade, as if lit from the left
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[y * W + x] === BONE && !p[y * W + x + 1]) p[y * W + x] = SHADE;
};
// The candle stub and the wax under it, from pixel (28, 13): a cap over the crown, and one long run down
// over the brow into the right socket.
const WAX = [
  "........rrrrrrrrr.........",
  ".......rrrrrrrrrrr........",
  ".......rrrrrrrrrrr........",
  ".......rrrrrrrrrrr........",
  ".......rrrrrrrrrrrr.......",
  ".......rrrrrrrrrrrr.......",
  ".......rrrrrrrrrrr........",
  ".....rrrrrrrrrrrrrrr......",
  "...rrrrrrrrrrrrrrrrrrr....",
  "..rrrrrrrrrrrrrrrrrrrrr...",
  "..rrrrrrrrrrrrrrrrrrrrrr..",
  "...rrrr.rrrrrr..rrrrrrrr..",
  "....rr...rrrr....rrrrrr...",
  "..........rr......rrrrr...",
  "...................rrrr...",
  "...................rrr....",
  "...................rrr....",
  "...................rrr....",
  "...................rrr....",
  "....................rrr...",
  "....................rrr...",
  "....................rrr...",
  "....................rrr...",
  "....................rrr...",
  "....................rrr...",
  "....................rrrr..",
  "....................rrrr..",
  "....................rrrr..",
  ".....................rr...",
];
const WX = 28, WY = 13;
const DROP = [WX + 21, WY + WAX.length]; // where a drop gathers under the run
// The flame, row by row up from the wick: how wide it is and how wide its red heart, burning tall and burning low.
const TALL = [[3, 0], [5, 1], [7, 3], [9, 3], [9, 3], [7, 1], [7, 1], [5, 0], [3, 0], [3, 0], [1, 0]];
const LOW = [[5, 0], [7, 1], [9, 3], [11, 5], [9, 3], [7, 1], [5, 0], [3, 0]];
const FLICKER = [0, 1, 2, 1, 3, 0, 2, 3]; // the order the flame runs through its shapes, ten a second
const LOOP = 4;

export default function skullCandle(): Frame {
  // what never moves: the skull, the candle and the wax already run and set
  const still = new Uint8Array(W * H);
  skull(still);
  // the wax keeps a pixel's gap from the bone: empty every pixel beside it, then lay it down, shaded
  for (const k of [0, RED])
    WAX.forEach((row, j) =>
      [...row].forEach((c, i) => {
        if (c !== "r") return;
        if (!k) rect(still, WX + i - 1, WY + j - 1, 3, 3, 0);
        else set(still, WX + i, WY + j, row[i + 1] === "r" ? RED : DARK);
      }),
    );
  rect(still, CX, WY - 2, 1, 2, BONE); // the wick

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    p.set(still);
    // the flame: tall and upright, leaning right, low and wide, leaning left
    const pose = FLICKER[Math.floor(u * 10) % FLICKER.length];
    const rows = pose === 2 ? LOW : TALL, lean = pose === 1 ? 2 : pose === 3 ? -2 : 0;
    rows.forEach(([gold, red], j) => {
      const x = CX + Math.round(lean * (j / rows.length) ** 2);
      rect(p, x - (gold >> 1), WY - 3 - j, gold, 1, GOLD);
      if (red) rect(p, x - (red >> 1), WY - 3 - j, red, 1, RED);
    });

    // a drop of wax swells under the run, lets go, and falls away into the dark of the socket
    if (u > 1.2 && u < 2.6) {
      const k = Math.max(0, (u - 2.1) / 0.5), y = DROP[1] + Math.round(7 * k * k);
      if (!p[(y + 1) * W + DROP[0]]) rect(p, DROP[0], y, 1, u > 1.7 ? 2 : 1, RED);
    }

    // the sockets catch the flame: a glint low in each that swells when it burns wide
    for (const s of [-1, 1]) {
      const x = CX + s * 14 + (lean >> 1), y = EYE_Y + 2;
      set(p, x, y, GOLD);
      if (pose === 2) rect(p, x - 1, y, 3, 1, GOLD), rect(p, x, y - 1, 1, 3, GOLD);
    }
    return emit(p, color);
  };
}
