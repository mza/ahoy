/*
 * desert-island: the castaway's island of the cartoons. A little round hump
 * of sand, one leaning palm with a pair of coconuts, a sun low behind it, and
 * the sea in a few scalloped lines. The fronds sway in the breeze and the
 * waves roll past, each line the other way from the one above.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours. Sand, sun and trunk are drawn once, the
 * trunk ring upon ring and narrowing to the top; each frond is a bent rib
 * hung with one-pixel leaflets, its tip shifting a pixel at a time; the waves
 * are crests one pixel thick. A black line is cut where things cross.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "desert island",
  category: "scenes",
  note: "a tiny island with one leaning palm, the sun behind, waves lapping",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // sand and sun, the wood of the trunk and its shade, palm green, sea blue
  palette: ["#f2b632", "#a8703a", "#74491f", "#4fa35a", "#3a7ca5"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const GOLD = 1, WOOD = 2, BARK = 3, GREEN = 4, BLUE = 5;

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
// A point `u` of the way along a bent stroke from a to c, pulled towards b.
const bend = (a: number[], b: number[], c: number[], u: number) => {
  const v = 1 - u;
  return [v * v * a[0] + 2 * v * u * b[0] + u * u * c[0], v * v * a[1] + 2 * v * u * b[1] + u * u * c[1]];
};
// One canvas laid over another, with a black gap `gap` pixels wide cut round what it carries.
const over = (p: Uint8Array, q: Uint8Array, gap = 1) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (q[y * W + x]) rect(p, x - gap, y - gap, 2 * gap + 1, 2 * gap + 1, 0);
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

// ---- the island

const SEA = 50; // the pixel row of the waterline
const CROWN = [50, 17]; // where the fronds spring from
// Each frond: where its tip hangs from the crown, the bend on the way there, and how far the breeze moves the tip.
const FRONDS = [
  { tip: [-21, 6], bend: [-12, -12], sway: [2, 1] },
  { tip: [-14, -9], bend: [-7, -9], sway: [1, 1] },
  { tip: [15, -8], bend: [7, -9], sway: [1, -1] },
  { tip: [22, 8], bend: [13, -11], sway: [2, -1] },
  { tip: [11, 17], bend: [12, 1], sway: [1, 0] },
];
// The sea: for each line of waves its pixel row, how far it reaches either side of the middle, and which way it rolls.
const WAVES = [
  { y: 54, half: 37, dir: 1 },
  { y: 58, half: 31, dir: -1 },
  { y: 62, half: 22, dir: 1 },
];
// One wave, crest to crest: how far each pixel of it sits below its crest, a gap where it breaks off.
const SWELL = [1, 1, 0, 0, 0, -1, -1, -1, 0, 0, 1, 1, 9, 9];
const SUN = [14, 14, 8];
const LOOP = 4.2;

export default function desertIsland(): Frame {
  // what never moves: the sun's disc, the hump of sand, the trunk
  const still = new Uint8Array(W * H);
  disc(still, SUN[0], SUN[1], SUN[2], SUN[2], GOLD);
  const land = new Uint8Array(W * H);
  disc(land, 40, SEA, 23.5, 9.5, GOLD);
  land.fill(0, SEA * W);
  // pebbles and a shell or two in the sand
  for (const [x, y] of [[-14, 2], [-6, 5], [9, 3], [15, 1], [3, 7], [-10, 4], [12, 5], [19, 2]]) set(land, 40 + x, SEA - y, 0);
  over(still, land);
  // the trunk: one row of pixels for each row it climbs, ring upon ring, each ring flared at its top, narrowing as it goes
  const trunk = new Uint8Array(W * H);
  const base = [36, 44], lean = [37, 26];
  let rows = 0;
  for (let y = base[1]; y > CROWN[1]; y--) {
    let u = 0;
    while (u < 1 && bend(base, lean, CROWN, u)[1] > y) u += 0.002;
    const cx = bend(base, lean, CROWN, u)[0], w = rows < 2 ? 7 : Math.round(5.4 - (2.4 * rows) / 27), flare = rows % 4 === 3 ? 1 : 0;
    const x0 = Math.round(cx - w / 2) - flare;
    rect(trunk, x0, y, w + flare, 1, WOOD);
    rect(trunk, x0 + w + flare - 1, y, 1, 1, BARK);
    if (rows % 4 === 0 && rows > 2) rect(trunk, x0 + 1, y, 1, 1, BARK);
    rows++;
  }
  over(still, trunk);
  const nuts = new Uint8Array(W * H);
  for (const [x, y] of [[-3.5, 4.5], [3.5, 5.5]]) {
    disc(nuts, CROWN[0] + x, CROWN[1] + y, 2.6, 2.6, WOOD);
    rect(nuts, Math.floor(CROWN[0] + x + 1), Math.floor(CROWN[1] + y), 1, 2, BARK);
  }

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    // the sun's rays, long and short by turns
    const turn = Math.floor((u / LOOP) * 6) % 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 2 * Math.PI, r0 = SUN[2] + 2, r1 = r0 + ((i + turn) % 2 ? 1.2 : 3.2);
      for (let r = r0; r <= r1; r += 0.5) set(p, SUN[0] - 0.5 + Math.cos(a) * r, SUN[1] - 0.5 + Math.sin(a) * r, GOLD);
    }
    // the fronds, their tips riding the breeze a little out of step with one another:
    // a rib, two pixels thick at its root, and a leaflet hanging from every other pixel of it
    const palm = new Uint8Array(W * H);
    FRONDS.forEach((f, i) => {
      const s = Math.sin(((2 * Math.PI * u) / LOOP) * 2 + i * 0.9);
      const tip = [CROWN[0] + f.tip[0] + Math.round(f.sway[0] * s), CROWN[1] + f.tip[1] + Math.round(f.sway[1] * s)];
      const mid = [CROWN[0] + f.bend[0], CROWN[1] + f.bend[1]];
      let last = -99;
      for (let k = 0; k <= 120; k++) {
        const v = k / 120, [x, y] = bend(CROWN, mid, tip, v), px = Math.round(x), py = Math.round(y);
        rect(palm, px, py, 1, v < 0.6 ? 3 : 2, GREEN);
        const step = Math.abs(f.tip[0]) > 12 ? px : py; // count along whichever way the frond mostly runs
        if (v > 0.12 && step !== last && step % 2 === 0) {
          last = step;
          const n = Math.round(1 + 5 * Math.sin(Math.PI * Math.min(1, v * 1.15)));
          const out = Math.sign(f.tip[0]);
          if (Math.abs(f.tip[0]) > 12) for (let j = 2; j <= n + 2; j++) set(palm, px + (j > 4 ? out : 0), py + j, GREEN);
          else for (let j = 1; j <= Math.min(3, n); j++) set(palm, px + j, py + j + 1, GREEN);
        }
      }
    });
    over(p, palm);
    over(p, nuts);
    // the sea: crests rolling past, a fleck of spray over every other one, each line the other way from the one above
    const roll = Math.floor((u / LOOP) * SWELL.length * 2);
    WAVES.forEach((w, n) => {
      for (let x = 40 - w.half; x < 40 + w.half; x++) {
        const at = x - w.dir * (roll + n * 5), k = ((at % SWELL.length) + SWELL.length) % SWELL.length;
        if (SWELL[k] > 1) continue;
        set(p, x, w.y + SWELL[k], BLUE);
        if (k === 6 && Math.floor(at / SWELL.length) % 2 === 0 && n < 2) set(p, x, w.y - 3, BLUE);
      }
    });
    // and the water's edge, lapping in and out at either end of the sand
    const lap = Math.floor((u / LOOP) * 8) % 4;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7 + [0, 1, 2, 1][lap]; i++) set(p, 40 + side * (26 + i), SEA - 1 - (i < 2 ? 1 : 0), BLUE);
      for (let i = 0; i < 3; i++) set(p, 40 + side * (36 + [0, 1, 2, 1][lap] + i), SEA - 3, BLUE);
    }
    return emit(p, color);
  };
}
