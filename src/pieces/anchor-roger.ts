/*
 * anchor-roger: a jolly roger for a ship's bosun: a skull over two crossed
 * anchors where the bones should be. Each anchor has its ring, its stock, a
 * long shank and two curved arms ending in pointed flukes. A length of chain
 * hangs from one ring and sways, a glint runs along a fluke now and then,
 * and the skull grinds its teeth.
 *
 * Pixel art in block elements, two square pixels a cell, in four flat
 * colours. The skull is geometry, a pixel at a time: square in the crown and
 * heavy in the jaw, under a flat brow, with a tooth missing. The anchors are
 * drawn along their own length and breadth and turned into place. Right-hand
 * edges are in shade, and black gaps keep the shapes apart, so it reads in
 * one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "anchor roger",
  category: "scenes",
  note: "a heavy-jawed skull over two crossed anchors, a chain swaying",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone and its shade, iron and its shade
  palette: ["#e8e2d0", "#9c9682", "#8a94a6", "#59616f"],
} satisfies Meta;

// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, SHADE = 2, IRON = 3, RUST = 4;

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

// ---- the skull, face on

const CX = 39.5, TOP = 0;
// Half its width on row j from the crown: a square cranium, the cheekbones, a heavy jaw and its chin.
const halfAt = (j: number) => {
  if (j < 20) return 18 * (1 - Math.abs((j - 13) / 13.6) ** 2.6) ** (1 / 2.6);
  if (j < 25) return 17.4 - (j - 20) * 0.7;
  if (j < 34) return 13;
  return [12.5, 11.5, 10, 7.5][j - 34];
};
const NOSE = ["..##..", ".####.", ".####.", "##..##"];
// A crack in from the left temple.
const CRACK = [[23, 7], [24, 7], [25, 8], [26, 8], [27, 9], [27, 10], [28, 11], [29, 10], [30, 10]];
// The skull, its jaw `grind` pixels to one side.
const skull = (p: Uint8Array, grind: number) => {
  for (let j = 0; j < 38; j++) for (let x = 0; x < W; x++) if (Math.abs(x - CX - (j > 31 ? grind : 0)) < halfAt(j)) p[(TOP + j) * W + x] = BONE;
  // the sockets: square-cornered, under a flat brow that comes down a little towards the nose
  for (const s of [-1, 1])
    for (let y = TOP + 10; y <= TOP + 21; y++)
      for (let x = 0; x < W; x++) {
        const out = s * (x - CX) - 8;
        if ((out / 5.6) ** 4 + ((y - TOP - 16) / 4.8) ** 4 < 1 && y >= TOP + 12.6 + 0.22 * (5 - out)) p[y * W + x] = 0;
      }
  sprite(p, 37, TOP + 21, NOSE, { "#": 0 });
  // the teeth, clenched: a line between the rows, a pixel between each tooth, and one tooth gone
  rect(p, 29, TOP + 31, 22, 1, 0);
  for (let x = 29; x <= 50; x += 3) rect(p, x, TOP + 27, 1, 4, 0), rect(p, x + grind, TOP + 32, 1, 4, 0);
  rect(p, 44, TOP + 28, 4, 3, 0);
  for (const [x, y] of CRACK) set(p, x, TOP + y, 0);
  rim(p, BONE, SHADE, 2);
};

// ---- an anchor, from the top of its shank at (x0, y0) to its crown at (x1, y1)

const anchor = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, fluke?: Float32Array) => {
  const l = Math.hypot(x1 - x0, y1 - y0), ax = (x1 - x0) / l, ay = (y1 - y0) / l;
  const tri = (u: number, v: number, a: number[], b: number[], c: number[]) => {
    const side = (p: number[], q: number[]) => (q[0] - p[0]) * (v - p[1]) - (q[1] - p[1]) * (u - p[0]);
    const d = [side(a, b), side(b, c), side(c, a)];
    return d.every((k) => k >= 0) || d.every((k) => k <= 0);
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      // how far along the anchor this pixel is, and how far out to the side
      const u = (x - x0) * ax + (y - y0) * ay, side = (y - y0) * ax - (x - x0) * ay, v = Math.abs(side);
      const ring = Math.hypot(u + 4, v), arm = Math.hypot(u - l + 10, v);
      const blade = tri(u, v, [l - 20, 10.5], [l - 10.5, 13.8], [l - 9, 6.2]);
      // the upper fluke is remembered for the glint: how far along it each pixel is
      if (fluke && blade && side < 0) fluke[y * W + x] = u - l + 21;
      if (
        (u >= 0 && u <= l && v < 2) || // the shank
        (ring >= 2.1 && ring < 4.3) || // the ring
        (u >= 4 && u < 7 && v < 8) || Math.hypot(u - 5.5, v - 8) < 2.3 || // the stock and the balls on its ends
        (arm >= 8.3 && arm < 11.7 && u > l - 12) || // the arms
        blade || // the flukes
        tri(u, v, [l + 0.5, 3.2], [l + 4, 0], [l + 0.5, -3.2]) // the bill of the crown
      )
        p[y * W + x] = IRON;
    }
};

// A link of chain, and the link seen edge on that joins it to the next.
const LINKS = [[".#.", "#.#", "#.#", "#.#", ".#."], [".#.", ".#.", ".#."]];
const LOOP = 6;

export default function anchorRoger(): Frame {
  // the anchors, one over the other
  const a = new Uint8Array(W * H), b = new Uint8Array(W * H);
  const fluke = new Float32Array(W * H);
  anchor(a, 69, 22, 11, 54);
  anchor(b, 10, 22, 68, 54, fluke);
  shade(a, IRON, RUST), shade(b, IRON, RUST);
  over(a, b);
  // the skull over them, its jaw to one side or not
  const stills = [0, 1].map((grind) => {
    const p = new Uint8Array(a), sk = new Uint8Array(W * H);
    skull(sk, grind);
    over(p, sk, 2, true);
    return p;
  });

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    // it grinds its teeth twice, late in the loop
    const g = u - 4.2;
    const p = new Uint8Array(stills[g >= 0 && g < 1.2 && Math.floor(g / 0.3) % 2 === 0 ? 1 : 0]);

    // the chain from the left-hand ring: each link swings a little further than the one above
    for (let i = 0, y = 23; i < 10; y += LINKS[i % 2].length - 1, i++)
      sprite(p, 2 + Math.round(0.4 + 1.6 * (i / 9) ** 1.3 * Math.sin((u / 3) * 2 * Math.PI - i * 0.25)), y, LINKS[i % 2], { "#": IRON });

    // the glint: a bright bar crossing the fluke
    const k = (u - 1) / 0.7;
    if (k >= 0 && k < 1) {
      const at = k * 14;
      // whole cells of it, so that the bone is not lost to the iron it shares a cell with
      for (let y = 28; y < 48; y += 2)
        for (let x = 50; x < 72; x++) {
          const i = y * W + x, d = fluke[i] || fluke[i + W];
          if (p[i] >= IRON && p[i + W] >= IRON && d && Math.abs(d - at) < 1.5) p[i] = p[i + W] = BONE;
        }
    }
    return emit(p, color);
  };
}
