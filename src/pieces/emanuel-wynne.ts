/*
 * emanuel-wynne: the flag of Emanuel Wynne, about 1700, often called the
 * first jolly roger: a skull over crossed bones, and under them an hourglass,
 * to tell a prize its time was running out. The sand runs through the glass,
 * grain after grain, the top emptying and the bottom heaping up; when it is
 * all through the glass turns end over end and it starts again.
 *
 * Pixel art in block elements, two square pixels a cell, in three flat
 * colours. The skull is geometry, a pixel at a time, long in the face and
 * mournful, with no lower jaw, as the old flags drew it; its right-hand edges
 * are in shade. Black gaps keep the shapes apart, so it reads in one ink too:
 * the sand is solid, the empty glass an outline.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "emanuel wynne",
  category: "scenes",
  note: "a mournful skull over crossed bones, and an hourglass running out",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // gold for the sand and the frame of the glass, bone and its shade
  palette: ["#f2b632", "#e8e2d0", "#9c9682"],
} satisfies Meta;

// A pixel is 0 for empty, else a palette index plus one. Gold comes first so that bone wins a shared cell.
const GOLD = 1, BONE = 2, SHADE = 3;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;

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

// A shape filled from its outline, a list of corners.
const poly = (p: Uint8Array, pts: number[][], k: number) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) p[y * W + x] = k;
    }
};
// One canvas laid over another, with a black gap cut around it first. With `solid` the gap is cut around the whole
// of each row of it, end to end, so nothing shows through the holes in it.
const over = (dst: Uint8Array, src: Uint8Array, gap = 1, solid = false) => {
  for (let y = 0; y < H; y++) {
    let lo = W, hi = -1;
    for (let x = 0; x < W; x++) if (src[y * W + x]) (lo = Math.min(lo, x)), (hi = x);
    for (let x = lo; x <= hi; x++) if (solid || src[y * W + x]) rect(dst, x - gap, y - gap, 2 * gap + 1, 2 * gap + 1, 0);
  }
  for (let i = 0; i < src.length; i++) if (src[i]) dst[i] = src[i];
};
// A bone from one end to the other: a shaft `r` either side of its middle, and two round knuckles at each end.
const bone = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, k: number, r = 2.3, knob = 3.2) => {
  const l = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / l, uy = (y1 - y0) / l;
  for (let i = 0; i <= l * 2; i++) disc(p, x0 + (ux * i) / 2, y0 + (uy * i) / 2, r, r, k);
  for (const [x, y, s] of [[x0, y0, -1], [x1, y1, 1]])
    for (const side of [-1, 1]) disc(p, x + ux * s * 1.3 - uy * side * (knob - 0.4), y + uy * s * 1.3 + ux * side * (knob - 0.4), knob, knob, k);
};
// A colour's right-hand edges in its shade, as if lit from the left; a gap one pixel wide casts none.
const shade = (p: Uint8Array, from: number, to: number) => {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) if (p[y * W + x] === from && (x > W - 3 || (!p[y * W + x + 1] && !p[y * W + x + 2]))) p[y * W + x] = to;
};
// The same for a shape with holes in it: only the last `n` pixels of each of its rows.
const rim = (p: Uint8Array, from: number, to: number, n = 1) => {
  for (let y = 0; y < H; y++) {
    let hi = W - 1;
    while (hi >= 0 && !p[y * W + hi]) hi--;
    for (let x = hi; x > hi - n && x >= 0 && p[y * W + x] === from; x--) p[y * W + x] = to;
  }
};

// ---- the skull, face on, with no lower jaw

const CX = 40;
// Half its width on row j from the crown: the cranium, the cheekbones, then the block the teeth sit in.
const halfAt = (j: number) => {
  if (j < 22) return 17.6 * Math.sqrt(1 - ((j - 14.5) / 15) ** 2);
  if (j < 26) return 15.4 - (j - 22) * 1.1;
  if (j < 28) return 11 - (j - 26) * 0.7;
  return 9.6;
};
const NOSE = ["..#..", "..#..", ".###.", ".###.", "##.##", "##.##"];
// A crack down from the crown, a splinter off it.
const CRACK = [[32, 1], [32, 2], [33, 3], [33, 4], [32, 5], [31, 6], [32, 7], [33, 8], [33, 9], [34, 10], [30, 7], [29, 8]];
const skull = (p: Uint8Array) => {
  for (let j = 0; j < 34; j++) for (let x = 0; x < W; x++) if (Math.abs(x - CX) < halfAt(j)) p[j * W + x] = BONE;
  // the sockets: big and round, the brow drooping over their outer corners
  for (const s of [-1, 1])
    for (let y = 9; y <= 23; y++)
      for (let x = CX + s * 8 - 7; x <= CX + s * 8 + 7; x++) {
        const out = s * (x - CX - s * 8);
        if ((out / 5.6) ** 2 + ((y - 17) / 5.4) ** 2 < 1 && y >= 12.2 + 0.45 * (out + 5.6)) set(p, x, y, 0);
      }
  sprite(p, CX - 2, 21, NOSE, { "#": 0 });
  // the hollows of the cheeks, and the teeth: long, a pixel between them, their roots rounded
  for (const s of [-1, 1]) rect(p, CX + s * 12 - 1, 25, 3, 1, 0);
  for (let x = CX - 8; x <= CX + 8; x += 4) rect(p, x, 29, 1, 5, 0);
  for (let x = CX - 6; x <= CX + 6; x += 4) set(p, x, 28, 0);
  rect(p, CX - 9, 33, 1, 1, 0), rect(p, CX + 9, 33, 1, 1, 0);
  for (const [x, y] of CRACK) set(p, x, y, 0);
  rim(p, BONE, SHADE, 2);
};

// ---- the hourglass

const TOP = 42, MID = 52.5; // its top row, and the line it turns about
// Half the width of the glass on each row of a bulb, from the wide end to the neck.
const BULB = [6, 6, 6, 6, 5, 4, 3, 2, 1];
const inside: number[][][] = [[], []]; // the pixels inside each bulb, in the order the sand leaves or arrives
for (let j = 0; j < 9; j++)
  for (let dx = -BULB[j] + 1; dx < BULB[j]; dx++) {
    // the top bulb drains from the middle of its surface; the bottom one heaps up in the middle
    inside[0].push([CX + dx, TOP + 2 + j, j + 0.3 * Math.abs(dx)]);
    inside[1].push([CX + dx, TOP + 19 - j, j + 0.55 * Math.abs(dx)]);
  }
inside[0].sort((a, b) => b[2] - a[2] || a[0] - b[0]);
inside[1].sort((a, b) => a[2] - b[2] || a[0] - b[0]);
const SAND = 50; // how many grains there are
// The glass with `gone` of its sand run through.
const glass = (p: Uint8Array, gone: number) => {
  for (const y of [TOP, TOP + 20]) rect(p, CX - 9, y, 19, 2, GOLD);
  for (const s of [-1, 1]) rect(p, CX + s * 8, TOP + 2, 1, 18, GOLD);
  for (let j = 0; j < 9; j++) for (const s of [-1, 1]) for (const y of [TOP + 2 + j, TOP + 19 - j]) set(p, CX + s * BULB[j], y, BONE);
  const left = SAND - gone;
  for (let i = 0; i < left; i++) set(p, inside[0][i][0], inside[0][i][1], GOLD);
  for (let i = 0; i < gone; i++) set(p, inside[1][i][0], inside[1][i][1], GOLD);
};

const RUN = 8, REST = 0.4, TURN = 0.8;
const LOOP = RUN + REST + TURN + REST;
const START = 2.6; // how far into the run the loop begins, so that the first frame has sand in both bulbs
// How tall the glass looks at each step of its turn: end over end, towards you.
const TURNS = [0.8, 0.5, 0.2, -0.2, -0.5, -0.8];

export default function emanuelWynne(): Frame {
  // what never moves: the bones, one over the other, and the skull over both
  const still = new Uint8Array(W * H), b = new Uint8Array(W * H), sk = new Uint8Array(W * H);
  bone(still, 7, 17, 73, 45, BONE);
  bone(b, 73, 17, 7, 45, BONE);
  over(still, b);
  // they stop square, short of the skull: the upper ends at its temples, the lower ends at its teeth
  rect(still, 20, 0, 41, 31, 0), rect(still, 28, 0, 25, 48, 0);
  shade(still, BONE, SHADE);
  skull(sk);
  over(still, sk, 2, true);
  // the glass run out, to be turned
  const spent = new Uint8Array(W * H);
  glass(spent, SAND);

  return (t, { color } = {}) => {
    const u = (((t + START) % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(still);
    if (u < RUN + REST) {
      const gone = Math.min(SAND, Math.floor((u / RUN) * SAND));
      glass(p, gone);
      // the grains falling from the neck to the heap, two on, one off
      if (gone < SAND) {
        const tick = Math.floor(u / 0.1 + 1e-6);
        for (let y = TOP + 10; y < TOP + 20 && !p[y * W + CX]; y++) if ((y - tick) % 3) set(p, CX, y, GOLD);
      }
    } else if (u < RUN + REST + TURN) {
      const k = TURNS[Math.min(TURNS.length - 1, Math.floor(((u - RUN - REST) / TURN) * TURNS.length))];
      for (let y = TOP; y < TOP + 22; y++) {
        const from = Math.round(MID + (y + 0.5 - MID) / k - 0.5);
        if (from >= TOP && from < TOP + 22) for (let x = CX - 9; x <= CX + 9; x++) p[y * W + x] = spent[from * W + x];
      }
    } else glass(p, 0);
    return emit(p, color);
  };
}
