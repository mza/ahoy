/*
 * ships-wheel: a ship's helm, its rim, hub and eight turned spokes lit from
 * the upper left like polished wood, in solid blocks. It is swung hard one way, held, then
 * hauled back the other, as if steering through a storm.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "ship's wheel",
  category: "objects",
  note: "a lit wooden ship's wheel swung back and forth through a storm",
  cols: 66,
  rows: 32,
  fps: 30,
} satisfies Meta;

const RAMP = "░▒▓█"; // wood in shadow to wood in the light
const LOOP = 8;
const ASPECT = 2; // a cell is about twice as tall as it is wide
const HUB = 7; // hub radius, in cell widths
const RIM = 17.5; // the rim's middle
const RIM_W = 3.4; // half the rim's thickness
const OUT = RIM + RIM_W; // the rim's outer edge
const NECK = 1.8; // how far a handle's neck runs before its knob
const TIP = 31; // the ends of the handles
const SPOKE = 1.45; // half a spoke's width

// A handle's half width, s cell widths out from the rim: a thin neck, then a
// round knob.
const KNOB = (TIP - OUT - NECK) / 2;
const handle = (s: number) => {
  const k = (s - NECK - KNOB) / KNOB;
  return Math.max(s < NECK + KNOB ? 1.3 : 0, Math.abs(k) < 1 ? 2.9 * Math.sqrt(1 - k * k) : 0);
};

// How far the wheel has turned at u seconds into the loop: a hard swing one
// way, a hold, then the long haul back, with a little shudder on top.
const turn = (u: number) => {
  const w = (2 * Math.PI * u) / LOOP;
  return Math.PI / 8 + 1.05 * Math.sin(w) + 0.22 * Math.sin(2 * w) + 0.05 * Math.sin(7 * w);
};

export default function shipsWheel(): Frame {
  const { cols, rows } = meta;
  const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
  // One sample for each half of a cell, so edges can be drawn in half blocks.
  const n = cols * rows * 2;
  const dist = new Float32Array(n), bear = new Float32Array(n);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      for (let j = 0; j < 2; j++) {
        const px = x - cx, py = (y + (j ? 0.25 : -0.25) - cy) * ASPECT;
        const k = (y * cols + x) * 2 + j;
        dist[k] = Math.hypot(px, py);
        bear[k] = Math.atan2(py, px);
      }
  const m = Math.hypot(-0.5, -0.65, 0.6);
  const [lx, ly, lz] = [-0.5 / m, -0.65 / m, 0.6 / m];
  const step = Math.PI / 4;
  const lit = (nx: number, ny: number, nz: number) => {
    const d = nx * lx + ny * ly + nz * lz;
    return d > 0.8 ? 3 : d > 0.55 ? 2 : d > 0.25 ? 1 : 0;
  };
  // The shade at one sample: -1 for no wood, else an index into RAMP.
  const shade = (r: number, a: number, th: number) => {
    const dr = r - RIM;
    if (Math.abs(dr) < RIM_W) {
      // a rounded ring, its cross-section softened so it reads as one band
      const q = (0.7 * dr) / RIM_W;
      return lit(q * Math.cos(a), q * Math.sin(a), Math.sqrt(1 - q * q));
    }
    if (r < HUB) {
      // a domed boss, a groove cut round it, then a flat face with a bevelled edge
      if (r > 3 && r < 4.3) return -1;
      const q = r < 3 ? r / 3.6 : r > HUB - 1.4 ? (r - HUB + 1.4) / 1.6 : 0;
      return lit(q * Math.cos(a), q * Math.sin(a), Math.sqrt(1 - q * q));
    }
    const sa = th + Math.round((a - th) / step) * step;
    const along = r * Math.cos(a - sa), across = r * Math.sin(a - sa);
    const w = along < OUT ? SPOKE : handle(along - OUT);
    if (along > TIP || Math.abs(across) >= w) return -1;
    const q = (along < OUT ? 0.75 : 1) * across / w;
    let nx = -q * Math.sin(sa), ny = q * Math.cos(sa), nz = Math.sqrt(1 - q * q);
    // the knob's far end rounds over toward its tip
    const e = along - (TIP - KNOB);
    if (e > 0) {
      const f = e / KNOB;
      nx = nx * (1 - f) + Math.cos(sa) * f; ny = ny * (1 - f) + Math.sin(sa) * f; nz *= 1 - f;
    }
    return lit(nx, ny, nz);
  };
  const out: string[] = new Array(cols * rows);

  return (t, { paper = false } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const th = turn(u);
    for (let c = 0; c < cols * rows; c++) {
      const a = shade(dist[c * 2], bear[c * 2], th), b = shade(dist[c * 2 + 1], bear[c * 2 + 1], th);
      if (a < 0 && b < 0) {
        out[c] = " ";
        continue;
      }
      // Both halves wood: the darker half's shade. One half: a half block,
      // or its shade where that is darker than the light.
      if (a >= 0 && b >= 0) {
        const i = Math.min(a, b);
        out[c] = RAMP[paper ? RAMP.length - 1 - i : i];
      } else {
        const i = a >= 0 ? a : b;
        out[c] = i < 2 && !paper ? RAMP[i] : a >= 0 ? "▀" : "▄";
      }
    }
    const lines: string[] = [];
    for (let y = 0; y < rows; y++) lines.push(out.slice(y * cols, (y + 1) * cols).join(""));
    return lines.join("\n");
  };
}
