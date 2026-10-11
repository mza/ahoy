/*
 * iron-hook: a pirate's iron hook as an emblem, rising out of a leather cuff
 * banded and riveted in brass over a spill of lace. The hook turns a little on
 * its arm, and every few seconds a glint runs up the shaft and round the curve
 * to flash at the point.
 *
 * Drawn fresh each frame from its shapes: the hook is a tube swept along its
 * curve and lit as a rounded bar, so turning it moves the light across it.
 * Each cell is sampled three across and four down and takes the character
 * whose shape best matches what covers it, # where the steel is solid, = the
 * leather, % the brass. The lace is patterned by hand.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "iron hook",
  category: "scenes",
  note: "a pirate's iron hook rising from a riveted cuff, turning and glinting",
  cols: 80,
  rows: 32,
  fps: 20,
  // steel, dark to glinting; leather, dark and lit; brass, dim to bright; lace, shaded to lit
  palette: [
    "#3c4652", "#6b7a8c", "#a6b8cc", "#d8e4f0", "#ffffff",
    "#4a3418", "#7a5626",
    "#8a6420", "#c4922e", "#f6d27a",
    "#8a8070", "#c8bea8", "#ece4d0",
  ],
  ground: "#000000",
} satisfies Meta;

const LOOP = 8;
const GX = 3, GY = 4; // samples a cell, across and down
const SW = meta.cols * GX, SH = meta.rows * GY;
// The drawing is laid out in square units: x in cell widths, y in half cells.
const SX = 43; // the shaft's middle
const ARC = { x: 34.5, y: 20, r: 8.5 }; // the curve's middle and radius
const LIFT = 4; // how far the drawing sits above the frame's bottom, in half cells, to centre it
const TURN = 0.42; // how far the hook turns on its arm, in radians
const GLINT = { start: 1.6, run: 1.3, half: 0.07 };

const NONE = 0, STEEL = 1, LEATHER = 2, BRASS = 3;
const FILL = [" ", "#", "=", "%", "8"];

// The shapes a cell's samples can make, three across and four down, and the character for each.
const SHAPES: [string, string][] = [
  [" ", "000000000000"], ["8", "999999999999"], ["_", "000000000555"], [".", "000000000050"],
  ["'", "050000000000"], ['"', "555000000000"], ["o", "000000999999"], ["P", "999999999000"],
  ["p", "000059599999"], ["q", "000950995999"], ["P", "999999995950"], ["Y", "999999599059"],
  ["d", "399399399399"], ["b", "993993993993"], ["|", "090090090090"], ["/", "009059590900"],
  ["\\", "900950095009"], [",", "000000005059"], ["'", "950500000000"], ["-", "000999000000"],
  ["=", "000999999000"],
];
const TEMPLATES = SHAPES.map(([c, s]) => [c, [...s].map((d) => +d / 9)] as const);

// The curve of the hook from the cuff up to its point, as points with the tube's radius there.
function curve() {
  const pts: { x: number; y: number; r: number; nx: number; ny: number; s: number }[] = [];
  const shaft = 24, arc = ARC.r * (Math.PI + 0.8), len = shaft + arc;
  const n = 420;
  for (let i = 0; i <= n; i++) {
    const d = (i / n) * len;
    let x: number, y: number, tx: number, ty: number;
    if (d < shaft) (x = SX), (y = 44 - d), (tx = 0), (ty = -1);
    else {
      const a = -(d - shaft) / ARC.r;
      (x = ARC.x + ARC.r * Math.cos(a)), (y = ARC.y + ARC.r * Math.sin(a));
      (tx = -Math.sin(a)), (ty = Math.cos(a));
      (tx = -tx), (ty = -ty);
    }
    const s = d / len;
    // full width up the shaft and over the top, then tapering to the point
    const r = s < 0.68 ? 3.1 : 0.85 + 2.25 * Math.pow(1 - (s - 0.68) / 0.32, 1.2);
    pts.push({ x, y, r, nx: -ty, ny: tx, s });
  }
  return pts;
}

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export default function ironHook(): Frame {
  const { cols, rows } = meta;
  const pts = curve();
  const mat = new Uint8Array(SW * SH), lit = new Float32Array(SW * SH), along = new Float32Array(SW * SH);
  const best = new Float32Array(SW * SH);
  // where each sample is, in square units
  const X = (sx: number) => (sx + 0.5) / GX, Y = (sy: number) => ((sy + 0.5) / GY) * 2 + LIFT;

  // The cuff, its band, the rivets and the lace never move: drawn once, with a gap round them so the hook behind
  // stays apart from them.
  const fixed = new Uint8Array(SW * SH), fixedLit = new Float32Array(SW * SH), gap = new Uint8Array(SW * SH);
  const cuffHalf = (y: number) => 9 + ((y - 45) / 11) * 3; // its half width, widening down
  for (let sy = 0; sy < SH; sy++)
    for (let sx = 0; sx < SW; sx++) {
      const x = X(sx), y = Y(sy), dx = x - SX, i = sy * SW + sx;
      let m = NONE, l = 0;
      if (y >= 44 && y <= 56 && Math.abs(dx) < cuffHalf(y) + (y < 47.5 ? 0.9 : 0)) {
        // a cylinder lit from the left
        const u = dx / (cuffHalf(y) + 0.9);
        l = 0.55 - 0.45 * u + 0.25 * Math.sqrt(Math.max(0, 1 - u * u)) - 0.3;
        m = y < 47.5 ? BRASS : LEATHER;
        // rivets in a row round the cuff, and a stitched seam
        for (const rx of [-6.4, -2.2, 2.2, 6.4]) if ((dx - rx) ** 2 + ((y - 51.8) * 0.9) ** 2 < 1.6) (m = BRASS), (l += 0.35);
        
      }
      fixed[i] = m;
      fixedLit[i] = l;
      if (m === NONE && y >= 43 && y <= 57.5 && Math.abs(dx) < cuffHalf(Math.max(44, y)) + 2.2) gap[i] = 1;
    }

  // The lace spilling out of the cuff, a frill, a row of eyelets and a scalloped hem.
  const LACE_ROWS: [string, number][] = [["\\/", 13], ["(o)", 15], ["\\_/", 15]];
  const laceAt = (x: number, y: number) => {
    const row = y - 28 + LIFT / 2;
    if (row < 0 || row >= LACE_ROWS.length) return "";
    const [pat, half] = LACE_ROWS[row], dx = x - SX;
    if (dx < -half || dx >= half) return "";
    const k = (((dx + half) % pat.length) + pat.length) % pat.length;
    return pat[k];
  };
  // the cell the glint flashes in at the point
  const tip = pts[pts.length - 1];
  const tipCell = [Math.round(tip.x - 0.5), Math.round((tip.y - LIFT) / 2 - 0.5)];
  const L = [-0.55, -0.55, 0.63];

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const theta = TURN * Math.sin((2 * Math.PI * u) / LOOP);
    const c = Math.cos(theta), s = Math.sin(theta);
    const glintAt = -GLINT.half * 2 + ((u - GLINT.start) / GLINT.run) * (1 + GLINT.half * 4);
    mat.fill(0);
    best.fill(9);
    // The hook, turned on the shaft's axis: across the frame it narrows by the cosine of the turn.
    for (const p of pts) {
      const px = SX + (p.x - SX) * c;
      const r = p.r;
      const x0 = Math.max(0, Math.floor((px - r) * GX)), x1 = Math.min(SW - 1, Math.ceil((px + r) * GX));
      const y0 = Math.max(0, Math.floor(((p.y - LIFT - r) / 2) * GY)), y1 = Math.min(SH - 1, Math.ceil(((p.y - LIFT + r) / 2) * GY));
      for (let sy = y0; sy <= y1; sy++)
        for (let sx = x0; sx <= x1; sx++) {
          const dx = X(sx) - px, dy = Y(sy) - p.y, q = (dx * dx + dy * dy) / (r * r);
          const i = sy * SW + sx;
          if (q >= 1 || q >= best[i]) continue;
          best[i] = q;
          // the tube's surface there, turned with the hook, and how much the light falls on it
          const a = (dx * p.nx + dy * p.ny) / r;
          const nz = Math.sqrt(Math.max(0, 1 - a * a));
          const nx = a * p.nx * c + nz * s, ny = a * p.ny, z = -a * p.nx * s + nz * c;
          lit[i] = Math.max(0, nx * L[0] + ny * L[1] + z * L[2]);
          along[i] = p.s;
          mat[i] = STEEL;
        }
    }
    for (let i = 0; i < SW * SH; i++) {
      if (gap[i]) mat[i] = NONE;
      if (fixed[i]) (mat[i] = fixed[i]), (lit[i] = fixedLit[i]);
    }

    const out: string[] = [];
    const g = new Float32Array(GX * GY);
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        const counts = [0, 0, 0, 0, 0], light = [0, 0, 0, 0, 0];
        let ink = 0, glint = 0;
        for (let j = 0; j < GY; j++)
          for (let i = 0; i < GX; i++) {
            const k = (y * GY + j) * SW + x * GX + i, m = mat[k];
            g[j * GX + i] = m ? 1 : 0;
            if (!m) continue;
            ink++;
            counts[m]++;
            light[m] += lit[k];
            if (m === STEEL) glint = Math.max(glint, smooth(1 - Math.abs(along[k] - glintAt) / GLINT.half));
          }
        let ch = " ", ci = 0;
        if (ink / (GX * GY) >= 0.08) {
          let m = 1;
          for (let k = 2; k < 5; k++) if (counts[k] > counts[m]) m = k;
          if (ink / (GX * GY) > 0.88) ch = FILL[m];
          else {
            let bd = Infinity;
            for (const [c2, tpl] of TEMPLATES) {
              let d = 0;
              for (let k = 0; k < GX * GY; k++) d += (g[k] - tpl[k]) ** 2;
              if (d < bd) (bd = d), (ch = c2);
            }
            if (ch === " ") ch = ".";
            if (ch === "8") ch = FILL[m];
          }
          const l = light[m] / counts[m];
          if (m === STEEL) {
            ci = glint > 0.6 ? 4 : glint > 0.25 ? 3 : l > 0.78 ? 3 : l > 0.45 ? 2 : l > 0.18 ? 1 : 0;
            if (glint > 0.6 && ch === "#") ch = "=";
          } else if (m === LEATHER) ci = l > 0.3 ? 6 : 5;
          else if (m === BRASS) {
            // the rivets twinkle one after another
            const twinkle = 0.5 + 0.5 * Math.sin(u * 2.4 + x * 0.9);
            ci = l > 0.6 ? (twinkle > 0.85 ? 9 : 8) : l > 0.2 ? 8 : 7;
          } else ci = l > 0.7 ? 12 : l > 0.45 ? 11 : 10;
        }
        const lc = laceAt(x, y);
        if (lc && lc !== " ") (ch = lc), (ci = x < SX - 6 ? 12 : x < SX + 6 ? 11 : 10);
        // the flash at the point as the glint gets there
        const flash = smooth(1 - Math.abs(glintAt - 1) / 0.12);
        if (flash > 0.2) {
          const ddx = x - tipCell[0], ddy = y - tipCell[1];
          if (ddx === 0 && ddy === 0) (ch = flash > 0.6 ? "*" : "+"), (ci = 4);
          else if (flash > 0.6 && Math.abs(ddx) + Math.abs(ddy) === 1 && ch === " ") (ch = ddx ? "-" : "|"), (ci = 3);
        }
        if (color) color[y * cols + x] = ci;
        line += ch;
      }
      out.push(line);
    }
    return out.join("\n");
  };
}
