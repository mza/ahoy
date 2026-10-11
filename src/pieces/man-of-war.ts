/*
 * man-of-war: a full-rigged three-masted pirate ship under sail, seen side-on,
 * bow to the right. She pitches on rows of swell, stern and bow rising in
 * turn, her square sails breathe in the wind and the black flag at her main
 * top ripples.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in six flat colours: a tall hull with a stern castle, lit stern
 * lights, wales and a row of gun ports, a beak and a figurehead under the
 * bowsprit, eight square sails and a jib shaded down their right-hand edges,
 * stays and shrouds a pixel thick. The ship is drawn twice, sails slack and
 * sails full, and set down a pixel higher or lower each frame, mast by mast.
 * It reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "man of war",
  category: "scenes",
  note: "a three-masted pirate ship under full sail, pitching on the swell",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // sea blue, the flag's iron shade, dark wood, wood, bone's shade, bone
  palette: ["#3a7ca5", "#59616f", "#74491f", "#a8703a", "#b9b2a0", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const SEA = 1, FLAG = 2, DARK = 3, WOOD = 4, SHADE = 5, BONE = 6;

const set = (p: Uint8Array, x: number, y: number, k: number) => {
  x = Math.round(x), y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) p[y * W + x] = k;
};
const rect = (p: Uint8Array, x: number, y: number, w: number, h: number, k: number) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(p, x + i, y + j, k);
};
const line = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, k: number, thick = 1) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) rect(p, Math.round(x0 + ((x1 - x0) * i) / n - (thick - 1) / 2), Math.round(y0 + ((y1 - y0) * i) / n - (thick - 1) / 2), thick, thick, k);
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

// ---- the ship and her sea

const MIZZEN = 20, MAIN = 37, FORE = 54;
// The top of the hull at each column: poop, quarterdeck, waist, forecastle.
const top = (x: number) => (x <= 13 ? 32 : x <= 24 ? 35 : x <= 55 ? 40 : 38);
const hullL = (y: number) => 5 + Math.max(0, Math.round((y - 38) * 0.45));
const hullR = (y: number) => 67 - Math.round(14 * Math.max(0, (y - 40) / 15) ** 1.4);
const hull = (x: number, y: number) => y >= top(x) && y < 60 && x >= hullL(y) && x <= hullR(y);
// The square sails: mast, the row its head is on, height, half its width at head and foot.
const SAILS = [
  [MIZZEN, 13, 7, 4, 4], [MIZZEN, 23, 9, 5, 5],
  [MAIN, 9, 5, 4, 4], [MAIN, 17, 9, 5, 6], [MAIN, 29, 9, 7, 7],
  [FORE, 11, 5, 3, 4], [FORE, 19, 7, 5, 5], [FORE, 29, 7, 6, 6],
];
// A swell, sixteen pixels long: how far below its crest the water is at each pixel.
const SWELL = Array.from({ length: 16 }, (_, i) => Math.round(1 - Math.cos((i / 16) * 2 * Math.PI)));
// The skull on the flag.
const SKULL = [".ooo.", "o_o_o", "ooooo", ".o_o."];
const SEA_TOP = 55;
const LOOP = 8;

// The whole ship, her sails bellied `belly` pixels by the wind.
const build = (belly: number) => {
  const ship = new Uint8Array(W * H);
  // rigging first, so the sails hide what runs behind them: stays, backstay, shrouds
  line(ship, FORE, 6, 79, 27, SHADE);
  line(ship, FORE, 18, 71, 32, SHADE);
  line(ship, MIZZEN, 8, 5, 31, SHADE);
  for (const [m, y, d] of [[MIZZEN, 21, 35], [MAIN, 27, 40], [FORE, 27, 40]]) for (const s of [-1, 1]) line(ship, m, y, m + s * 8, d, SHADE);
  // the masts, stouter below the course yards
  rect(ship, MIZZEN, 8, 1, 27, WOOD), rect(ship, MAIN, 0, 1, 40, WOOD), rect(ship, FORE, 6, 1, 34, WOOD);
  rect(ship, MIZZEN - 1, 21, 3, 14, WOOD), rect(ship, MAIN - 1, 27, 3, 13, WOOD), rect(ship, FORE - 1, 27, 3, 13, WOOD);

  // sails and their yards, on a canvas of their own
  const cloth = new Uint8Array(W * H);
  for (const [cx, y0, h, a, b] of SAILS) {
    rect(cloth, cx - a - 1, y0 - 2, 2 * a + 3, 1, WOOD);
    const seam = Math.round(a * 0.3);
    for (let j = 0; j < h; j++) {
      const f = j / (h - 1), hw = Math.round(a + (b - a) * f), s = Math.round(belly * Math.sin(Math.PI * f));
      for (let dx = -hw; dx <= hw; dx++) {
        // the foot arched up between its clews
        if (j === h - 1 && Math.abs(dx) < hw - 1) continue;
        if (j === h - 2 && h > 7 && Math.abs(dx) < hw - 3) continue;
        set(cloth, cx + dx + s, y0 + j, dx === hw || dx === -seam ? SHADE : BONE);
      }
    }
  }
  // a jib on the forestay
  poly(cloth, [[65, 18], [75, 26], [65, 26]], BONE);
  for (let y = 0; y < H; y++) for (let x = 0; x < W - 1; x++) if (cloth[y * W + x] === BONE && !cloth[y * W + x + 1]) cloth[y * W + x] = SHADE;
  over(ship, cloth);

  // the hull: wood, darker below the lower wale
  const wood = new Uint8Array(W * H);
  for (let y = 30; y < 60; y++) for (let x = 0; x < W; x++) if (hull(x, y)) set(wood, x, y, y >= 50 ? DARK : WOOD);
  for (let x = 0; x < W; x++) {
    // a rail under the top of the hull, a moulding under the castles, two wales
    for (const y of [top(x) + 1, 41, 44, 49]) if (hull(x - 1, y) && hull(x + 1, y) && y > top(x)) set(wood, x, y, 0);
  }
  // the shaded faces of the castles, and the rudder
  rect(wood, 13, 32, 1, 3, DARK), rect(wood, 24, 35, 1, 5, DARK);
  for (let y = 45; y < 60; y++) set(wood, hullL(y) - 1, y, DARK);
  // ten gun ports, and four lit lights in a dark gallery across the stern
  for (let i = 0; i < 10; i++) rect(wood, 13 + 5 * i, 46, 2, 2, 0);
  rect(wood, 7, 37, 16, 4, 0);
  for (const x of [8, 12, 16, 20]) rect(wood, x, 38, 2, 2, BONE);
  // the stern lantern on its post
  rect(wood, 4, 30, 1, 3, WOOD), rect(wood, 3, 28, 2, 2, BONE);
  // the beak with a figurehead at its tip, and the bowsprit over it
  line(wood, 67, 39, 73, 36, WOOD), line(wood, 67, 40, 72, 38, DARK);
  set(wood, 74, 36, BONE), set(wood, 75, 36, BONE), set(wood, 74, 37, BONE);
  line(wood, 63, 37, 79, 27, WOOD), line(wood, 63, 38, 79, 28, WOOD);
  over(ship, wood, 0);
  return ship;
};

export default function manOfWar(): Frame {
  const ships = [build(1.3), build(2.4)];

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    // she rides up and down, and pitches: the stern a pixel one way, the bow the other
    const step = Math.floor(u) % 4, bob = [0, 0, 1, 0][step], tilt = [0, 1, 0, -1][step];
    const lift = (x: number) => bob + (x < 29 ? -tilt : x > 46 ? tilt : 0);
    // the sails fill for two seconds and ease for two
    const ship = ships[Math.floor((u + 1) / 2) % 2];
    for (let x = 0; x < W; x++) {
      const dy = lift(x);
      for (let y = 0; y < H; y++) {
        const sy = y - dy;
        if (sy >= 0 && sy < H && ship[sy * W + x]) p[y * W + x] = ship[sy * W + x];
      }
    }
    // the flag at the main top, a ripple running out along it, the skull riding the cloth
    const ph = Math.floor(u * 8), fy = 1 + lift(MAIN);
    for (let i = 0; i < 12; i++) {
      const dy = Math.round(Math.sin(((i - ph) / 8) * 2 * Math.PI) * 1.3 * (i / 11));
      rect(p, MAIN + 2 + i, fy + dy, 1, i > 9 ? 4 : 6, FLAG);
      if (i >= 3 && i < 8) SKULL.forEach((row, j) => row[i - 3] !== "." && set(p, MAIN + 2 + i, fy + 1 + dy + j, row[i - 3] === "o" ? BONE : 0));
    }
    // the sea closes over her keel: a black gap, then rows of swell, each sliding its own way, foam on some crests
    rect(p, 0, SEA_TOP - 1, W, H - SEA_TOP + 1, 0);
    for (let r = 0; r < 3; r++) {
      const off = Math.floor(u * [4, -2, 6][r]) + r * 5;
      for (let x = 0; x < W; x++) {
        const i = (((x + off) % 16) + 16) % 16, y = SEA_TOP + (r > 0 ? 1 + r * 3 + (SWELL[i] >> 1) : SWELL[i]);
        set(p, x, y, SEA);
        if (r === 0) set(p, x, y + 1, SEA);
        if (i < 3 && (Math.floor((x + off) / 16) + r) % 3 === 0) set(p, x, y, BONE);
      }
    }
    return emit(p, color);
  };
}
