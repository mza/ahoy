/*
 * oyster-pearl: a big oyster lying open on the sea bed, seen from the front:
 * a shallow bowl of a shell, a ribbed and scalloped fan of a lid standing up
 * behind it, and a great round pearl sitting between them. The lid lowers
 * over the pearl and rises again, the pearl's highlight swells into a
 * four-point sparkle while the shell is wide open, bubbles rise at either
 * side and the weed sways.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in six flat colours. The lid is pale inside, with nine thin ribs
 * from the hinge to its scallops and an iron rim; the bowl is pale inside and
 * iron outside, with growth rings; the pearl has a black line all round it.
 * The lid is drawn once for each height it stands at. It reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "oyster pearl",
  category: "scenes",
  note: "a pearl in an open oyster on the sea bed, its lid lowering and rising",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone, palm green, ghost cyan, iron, iron's shade, and white for the pearl's highlight
  palette: ["#e8e2d0", "#4fa35a", "#5fd7c9", "#8a94a6", "#59616f", "#ffffff"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const BONE = 1, GREEN = 2, CYAN = 3, IRON = 4, SHADE = 5, WHITE = 6, GAP = 9;

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

// ---- the oyster

const CX = 40, HINGE = 46, MOUTH = 48, RX = 28;
const TALL = 31; // how high the lid stands when wide open
// How high an arch over the shell stands at `dx` from its middle, as a share of its height there.
const arch = (dx: number) => Math.sqrt(Math.max(0, 1 - (dx / RX) ** 2));
// The scallops along the bowl's front rim: 0 to 2 pixels.
const wave = (dx: number) => (Math.abs(dx) < RX - 1 ? Math.round(1 + Math.cos((dx / 8) * 2 * Math.PI)) : 0);
// The top of the bowl's front rim.
const rim = (dx: number) => MOUTH + Math.round(4 * arch(dx)) - wave(dx);
const PX = 40, PY = 41, PR = 6.5;
// The pearl's highlight, and the sparkle it swells into: w white, c cyan.
const STAR = [
  ["ww", "ww"],
  [".c.", "cwc", ".c."],
  ["..c..", "..c..", "ccwcc", "..c..", "..c.."],
  ["...c...", "...c...", "...w...", "ccwwwcc", "...w...", "...c...", "...c..."],
];
const BUBBLE = [[".c.", "c.c", ".c."], [".cc.", "c..c", "c..c", ".cc."], ["cc"]];
// Bubbles: when in the loop each sets off, where from, and its shape.
const BUBBLES = [[0.3, 9, 44, 0], [1.4, 70, 44, 1], [2.3, 10, 44, 2], [3.0, 69, 44, 0], [4.3, 36, 30, 1], [4.6, 44, 31, 0], [4.9, 39, 30, 2], [6.9, 9, 44, 1], [7.4, 70, 44, 2]];
// The heights the lid stands at as it lowers; after the last it lies shut.
const HEIGHTS = [TALL, 23, 14];
const LOOP = 8;

// Shade the right-hand edge of everything iron, as if lit from the left.
const shade = (p: Uint8Array) => {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (p[y * W + x] === IRON && (x === W - 1 || !p[y * W + x + 1])) p[y * W + x] = SHADE;
};

// The lid standing `tall` pixels high: a fan about the hinge, nine scallops round its edge.
const fan = (tall: number) => {
  const q = new Uint8Array(W * H), k = TALL / tall;
  const edge = (a: number) => 1 / Math.hypot(Math.cos(a) / RX, Math.sin(a) / TALL) - 2.5 + 2.5 * Math.abs(Math.sin(a * 9));
  for (let y = 0; y <= HINGE; y++)
    for (let x = 0; x < W; x++) {
      const dx = x - CX, dy = (HINGE - y) * k, r = Math.hypot(dx, dy), e = edge(Math.atan2(dy, dx));
      if (r <= e) set(q, x, y, r > e - 2.2 ? IRON : BONE);
    }
  // a rib to the middle of each scallop, fanning from a point a little under the hinge
  for (let i = 0; i < 9; i++) {
    const a = ((10 + 20 * i) * Math.PI) / 180, e = edge(a);
    const x1 = CX + (e - 2) * Math.cos(a), y1 = HINGE - ((e - 2) * Math.sin(a)) / k, y0 = HINGE + 12;
    line(q, CX + (x1 - CX) * 0.45, y0 + (y1 - y0) * 0.45, x1, y1, IRON);
  }
  shade(q);
  return q;
};

export default function oysterPearl(): Frame {
  // the bowl: its back rim, its pale inside, a black line, then its scalloped front in iron with growth rings
  const bowl = new Uint8Array(W * H);
  for (let dx = -RX; dx <= RX; dx++) {
    const back = MOUTH - Math.round(4 * arch(dx)), foot = MOUTH + Math.round(12 * arch(dx)), x = CX + dx;
    set(bowl, x, back - 1, GAP), set(bowl, x, back, IRON);
    for (let y = back + 1; y < rim(dx) - 1; y++) set(bowl, x, y, BONE);
    set(bowl, x, rim(dx) - 1, GAP);
    for (let y = rim(dx); y <= foot; y++) set(bowl, x, y, IRON);
    if (Math.abs(dx) < RX - 3) for (const ring of [6.5, 10]) rect(bowl, x, (MOUTH + Math.round(ring * arch(dx))) & ~1, 1, 2, SHADE);
  }
  shade(bowl);

  // the lid shut: a low dome over the pearl, growth rings round it, down to the bowl's rim
  const shut = new Uint8Array(W * H);
  for (let dx = -RX; dx <= RX; dx++) {
    for (let y = MOUTH - 1 - Math.round(15 * arch(dx)); y < rim(dx) - 1; y++) set(shut, CX + dx, y, IRON);
    if (Math.abs(dx) < RX - 3) for (const ring of [4.5, 8.5, 12]) rect(shut, CX + dx, (MOUTH - 1 - Math.round(ring * arch(dx))) & ~1, 1, 2, SHADE);
  }
  shade(shut);
  const lids = HEIGHTS.map(fan);

  // the pearl: bone, a cyan shadow on its lower right, a black line all round
  const pearl = new Uint8Array(W * H);
  disc(pearl, PX, PY, PR + 1.1, PR + 1.1, GAP);
  disc(pearl, PX, PY, PR, PR, BONE);
  for (let y = PY - 7; y <= PY + 7; y++)
    for (let x = PX - 7; x <= PX + 7; x++) if (pearl[y * W + x] === BONE && (x - PX + 1.5) ** 2 + (y - PY + 1.5) ** 2 > 6.7 ** 2) pearl[y * W + x] = CYAN;

  // the sea bed
  const bed = new Uint8Array(W * H);
  for (let x = 0; x < W; x++) if ((x * 7) % 11 < 7) set(bed, x, 63, SHADE);
  for (const x of [14, 22, 58, 67]) rect(bed, x, 62, 2, 1, SHADE);

  const lay = (p: Uint8Array, q: Uint8Array) => {
    for (let i = 0; i < q.length; i++) if (q[i]) p[i] = q[i] === GAP ? 0 : q[i];
  };

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    p.set(bed);
    // the lid: wide open, lowering in two steps, shut, and up again
    const pose = u < 3.2 ? 0 : u < 3.6 ? 1 : u < 4 ? 2 : u < 5.6 ? 3 : u < 6 ? 2 : u < 6.4 ? 1 : 0;
    if (pose < 3) lay(p, lids[pose]);
    lay(p, bowl);
    if (pose < 3) {
      lay(p, pearl);
      // its highlight, swelling into a sparkle and shrinking again while the shell is wide open
      const s = STAR[pose === 0 ? [0, 0, 0, 0, 1, 2, 3, 2][Math.floor((u % 1.6) / 0.2)] : 0], n = (s.length - 1) / 2;
      sprite(p, PX - 2.5 - n, PY - 2.5 - n, s, { c: CYAN, w: WHITE });
    } else lay(p, shut);

    // weed at either side, swaying
    for (const [x0, tall, ph] of [[3, 26, 0], [7, 8, 2], [76, 19, 4], [72, 8, 1]]) {
      for (let i = 0; i < tall; i++) {
        const x = x0 + Math.round(1.7 * Math.sin(i / 4 + ph + (u / LOOP) * 4 * Math.PI) * Math.min(1, i / 6)), y = 62 - i;
        rect(p, x, y, 2, 1, GREEN);
        if (i % 6 === 3) set(p, x - 1, y, GREEN), set(p, x - 2, y - 1, GREEN);
        if (i % 6 === 0 && i) set(p, x + 2, y, GREEN), set(p, x + 3, y - 1, GREEN);
      }
    }

    // bubbles, each on a black ground of its own, wobbling as they rise
    const air = new Uint8Array(W * H);
    for (const [at, x0, y0, shape] of BUBBLES) {
      const age = (u - at + LOOP) % LOOP;
      if (age > 4.2) continue;
      sprite(air, x0 + [0, 1, 0, -1][Math.floor(age * 3) % 4], y0 - Math.round(age * 11), BUBBLE[shape], { c: CYAN });
    }
    over(p, air);
    return emit(p, color);
  };
}
