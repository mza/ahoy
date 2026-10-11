/*
 * flintlock: one flintlock pistol, side on and pointing right: a long iron
 * barrel, the lock with its cock and frizzen, a curved wooden grip with a
 * brass butt cap, a trigger in its brass guard. It fires: the cock snaps
 * down, a spark jumps at the pan, the muzzle flashes and puffs smoke, the
 * pistol kicks back, and then it is cocked again.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in five flat colours. The pistol is drawn twice, cocked and fired,
 * from polygons and strokes, with a black gap round each part that sits on
 * another; the flash and the smoke are laid over it. It reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "flintlock",
  category: "scenes",
  note: "a flintlock pistol fires: spark, flash, smoke, and it is cocked again",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // wood, iron and its shade, brass, and bone for the flint, the flash and the smoke
  palette: ["#a8703a", "#8a94a6", "#59616f", "#f2b632", "#e8e2d0"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const WOOD = 1, IRON = 2, SHADE = 3, GOLD = 4, BONE = 5;

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

// A filled polygon.
const poly = (p: Uint8Array, pts: number[][], k: number) => {
  for (let y = 0; y < H; y++) {
    const xs: number[] = [];
    pts.forEach(([x0, y0], i) => {
      const [x1, y1] = pts[(i + 1) % pts.length];
      if (y0 <= y !== y1 <= y) xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
    });
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i]); x <= Math.floor(xs[i + 1]); x++) set(p, x, y, k);
  }
};
// Lay one canvas over another, with a black gap cut around everything on it.
const over = (p: Uint8Array, q: Uint8Array, gap = 1) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (q[y * W + x]) rect(p, x - gap, y - gap, 2 * gap + 1, 2 * gap + 1, 0);
  for (let i = 0; i < q.length; i++) if (q[i]) p[i] = q[i];
};
// Draw on a fresh canvas and lay it over `p`.
const part = (p: Uint8Array, draw: (q: Uint8Array) => void, gap = 1) => {
  const q = new Uint8Array(W * H);
  draw(q);
  over(p, q, gap);
};

// ---- the pistol

const MUZZLE = 72, BORE = 22; // the column the barrel ends on, and the row down its middle
const PAN = [46, 16]; // where the spark jumps

// The pistol, with its cock back and the frizzen shut, or as it is the moment it has fired.
const pistol = (fired: boolean) => {
  const p = new Uint8Array(W * H);
  // the stock: the fore-end under the barrel, the wrist, and the grip sweeping down and back
  poly(p, [[30, 20], [24, 21], [18, 24], [13, 29], [9, 35], [6, 41], [4, 46], [15, 51], [17, 45], [20, 40], [24, 37], [30, 36], [41, 35], [45, 31], [68, 30], [68, 27], [30, 27]], WOOD);
  // a line carved along the grip
  line(p, 27, 25, 21, 28, 0);
  line(p, 21, 28, 16, 33, 0);
  line(p, 16, 33, 12, 40, 0);
  line(p, 12, 40, 10, 45, 0);
  // the barrel: thicker at the breech, a ring at the muzzle, its underside in shade
  part(p, (q) => {
    rect(q, 32, 19, 14, 7, IRON);
    rect(q, 46, 20, MUZZLE - 48, 6, IRON);
    rect(q, MUZZLE - 2, 19, 3, 7, IRON);
    rect(q, 32, 24, MUZZLE - 31, 2, SHADE);
    rect(q, 46, 20, 1, 4, SHADE);
    rect(q, MUZZLE - 3, 20, 1, 4, SHADE);
  });
  // the brass cap on the fore-end, the ramrod under it, and its two pipes
  rect(p, 66, 27, 3, 4, GOLD);
  rect(p, 46, 32, 25, 2, SHADE);
  for (const x of [51, 61]) part(p, (q) => rect(q, x, 30, 3, 4, GOLD), 0);
  // the butt cap: a brass bulb over the end of the grip
  part(p, (q) => {
    poly(q, [[3, 45], [16, 51], [16, 54], [13, 57], [8, 57], [3, 54], [1, 49]], GOLD);
    rect(q, 8, 57, 5, 1, GOLD);
    rect(q, 9, 58, 3, 1, GOLD);
  });
  rect(p, 5, 50, 2, 2, BONE);
  // the trigger guard, a brass loop, and the trigger in it
  part(p, (q) => {
    line(q, 32, 38, 32, 42, GOLD, 2);
    line(q, 33, 44, 43, 44, GOLD, 2);
    line(q, 45, 43, 47, 34, GOLD, 2);
    set(q, 32, 44, 0);
  });
  part(p, (q) => {
    line(q, 39, 37, 38, 40, IRON, 2);
    rect(q, 37, 41, 2, 1, IRON);
  });
  // the lock plate on the side of the stock
  part(p, (q) => {
    poly(q, [[28, 27], [47, 27], [49, 29], [47, 31], [30, 31], [26, 29]], IRON);
    set(q, 45, 29, 0);
  });
  // the frizzen: an upright steel over the pan, thrown forward when it is struck
  part(p, (q) => {
    rect(q, 44, 17, 6, 2, IRON);
    if (fired) line(q, 50, 17, 55, 11, IRON, 2);
    else {
      line(q, 45, 16, 44, 8, IRON, 2);
      set(q, 46, 8, IRON);
    }
  });
  // the cock: a curved neck on its pivot, two jaws holding the flint, and the jaw screw
  part(p, (q) => {
    disc(q, 34, 28.5, 3.4, 3.4, IRON);
    if (fired) {
      line(q, 34, 27, 36, 22, IRON, 3);
      line(q, 36, 22, 39, 19, IRON, 3);
      rect(q, 37, 16, 7, 2, IRON);
      rect(q, 39, 14, 6, 2, BONE);
      set(q, 45, 15, BONE);
      rect(q, 37, 12, 6, 2, IRON);
      rect(q, 38, 9, 2, 3, IRON);
      rect(q, 37, 8, 4, 1, IRON);
      line(q, 36, 17, 34, 15, IRON, 2);
    } else {
      line(q, 34, 27, 30, 22, IRON, 3);
      line(q, 30, 22, 29, 17, IRON, 3);
      rect(q, 27, 14, 8, 2, IRON);
      rect(q, 30, 12, 7, 2, BONE);
      set(q, 37, 13, BONE);
      rect(q, 27, 10, 7, 2, IRON);
      rect(q, 28, 7, 2, 3, IRON);
      rect(q, 27, 6, 4, 1, IRON);
      line(q, 26, 15, 23, 12, IRON, 2);
    }
    set(q, 34, 28, 0);
    set(q, 34, 29, 0);
  });
  return p;
};

// A star of light, small to large: g brass, w bone.
const STAR = [
  [".g.", "gwg", ".g."],
  ["..g..", "..g..", "ggwgg", "..g..", "..g.."],
  ["...g...", "g..g..g", ".g.w.g.", "ggwwwgg", ".g.w.g.", "g..g..g", "...g..."],
];
// The muzzle flash, from the muzzle rightwards, small then large.
const FLASH = [
  ["....g....", "..g.g....", "...gwg.g.", "gwwwwwgg.", "wwwwwwwgg", "gwwwwwgg.", "...gwg.g.", "..g.g....", "....g...."],
  ["...g....", "g..g..g.", ".g.gg.g.", "..ggggg.", ".gwwwggg", "wwwwwwgg", "wwwwwwwg", "wwwwwwgg", ".gwwwggg", "..ggggg.", ".g.gg.g.", "g..g..g.", "...g...."],
];
// The smoke: puffs as [column, row, radius, how late it comes] off the muzzle.
const PUFFS = [[2, -2, 4.2, 0], [-2, -7, 3.6, 0.08], [4, -8, 3, 0.16], [-5, -3, 3, 0.04], [1, -13, 3, 0.26]];

const LOOP = 4, FIRE = 1.6; // seconds: the loop, and when in it the pistol fires

export default function flintlock(): Frame {
  const cocked = pistol(false), fired = pistol(true);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP, v = u - FIRE;
    // the kick: back and up, then easing home
    const [dx, dy] = v >= 0.1 && v < 0.25 ? [-3, -2] : v >= 0.25 && v < 0.4 ? [-2, 0] : v >= 0.4 && v < 0.6 ? [-1, 0] : [0, 0];
    const gun = v >= 0 && v < 1.9 ? fired : cocked;
    const p = new Uint8Array(W * H);
    for (let y = Math.max(0, -dy); y < H; y++) p.set(gun.subarray(y * W - dx, (y + 1) * W), (y + dy) * W);

    // a glint running along the barrel while it waits
    if (u >= 0.7 && u < 1.2) {
      const x = 34 + Math.round(((u - 0.7) / 0.5) * 29);
      rect(p, x, 20, 3, 2, BONE);
    }
    const q = new Uint8Array(W * H);
    // the spark at the pan, and a wisp of smoke after it
    if (v >= 0 && v < 0.2) {
      const s = STAR[v < 0.05 ? 1 : v < 0.15 ? 2 : 0], n = (s.length - 1) / 2;
      sprite(q, PAN[0] - n, PAN[1] - n, s, { g: GOLD, w: BONE });
    } else if (v >= 0.2 && v < 0.8) {
      const k = (v - 0.2) / 0.6, r = 2.6 - 1.8 * k;
      disc(q, PAN[0] + 1 + dx, PAN[1] - 2 - Math.round(k * 9), r, r, BONE);
    }
    // the flash at the muzzle
    if (v >= 0.1 && v < 0.3) {
      const f = FLASH[v < 0.2 ? 1 : 0];
      sprite(q, MUZZLE + 1 + dx, BORE + dy - (f.length >> 1), f, { g: GOLD, w: BONE });
    }
    over(p, q);
    // the smoke: each puff rolls out, swells, drifts up and back, and shrinks away
    if (v >= 0.25 && v < 1.85) {
      const cloud = new Uint8Array(W * H);
      for (const [x, y, r, late] of PUFFS) {
        const k = (v - 0.25 - late) / 1.3;
        if (k < 0 || k >= 1) continue;
        const rr = r * (k < 0.2 ? 0.5 + 3 * k : 1.1 * (1 - (k - 0.2) / 0.8) ** 0.8);
        if (rr >= 0.8) disc(cloud, MUZZLE - 1 + x * (1 + 0.6 * k) - Math.round(k * 8), BORE + y * (1 + k) - Math.round(k * 12), rr, rr, BONE);
      }
      over(p, cloud);
    }
    return emit(p, color);
  };
}
