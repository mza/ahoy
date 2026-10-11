/*
 * pirate-flag: a Jolly Roger on a pole, flapping in a stiff wind. Waves run
 * along it from the pole to the free end, growing as they go, and the folds
 * shade darker where the cloth turns away from the light. The skull and
 * crossbones are cut out of the cloth, so they ripple with it.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "pirate flag",
  category: "objects",
  note: "a jolly roger flapping on its pole in a stiff wind",
  cols: 66,
  rows: 30,
  fps: 30,
} satisfies Meta;

const RAMP = "░▒▓█"; // cloth in shadow to cloth in the light
const PERIOD = 1.6; // seconds for a wave to pass
const POLE = 3; // the pole's column
const X0 = 6; // the flag's first column
const FW = 56; // its width, in columns
const FH = 40; // its height, in half rows
const TOP = 4; // the row its top edge hangs from
const SUB = 4; // mask samples a half row

// The skull and crossbones, in the flag's own space: columns across, half
// rows down. True where the cloth is cut away.
function emblem(u: number, v: number) {
  const cx = FW / 2;
  const inEllipse = (x: number, y: number, rx: number, ry: number) => ((u - x) / rx) ** 2 + ((v - y) / ry) ** 2 <= 1;
  const bone = (x0: number, y0: number, x1: number, y1: number) => {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    const k = Math.max(0, Math.min(1, ((u - x0) * dx + (v - y0) * dy) / (len * len)));
    if (Math.hypot(u - x0 - k * dx, v - y0 - k * dy) < 1.9) return true;
    // two knobs at each end, either side of the shaft
    const px = -dy / len, py = dx / len;
    for (const [ex, ey, s] of [[x0, y0, -1], [x1, y1, 1]])
      for (const side of [-1, 1]) {
        const kx = ex + side * 2.3 * px + s * 0.8 * (dx / len), ky = ey + side * 2.3 * py + s * 0.8 * (dy / len);
        if (Math.hypot(u - kx, v - ky) < 2.6) return true;
      }
    return false;
  };
  const head = inEllipse(cx, 14, 9.5, 9.5);
  const jaw = u > cx - 5.5 && u < cx + 5.5 && v > 19 && v < 28 && (v < 25 || inEllipse(cx, 24, 5.5, 4));
  const skull = (x: number, y: number) =>
    ((u - x - cx) / 9.5) ** 2 + ((v - y - 14) / 9.5) ** 2 <= 1 || (Math.abs(u - x - cx) < 5.5 && v - y > 19 && v - y < 27.5);
  if (head || jaw) {
    if (inEllipse(cx - 3.9, 14.5, 2.7, 3.2) || inEllipse(cx + 3.9, 14.5, 2.7, 3.2)) return false;
    if (v > 18.5 && v < 21.5 && Math.abs(u - cx) < (v - 18.5) * 0.5 + 0.4) return false;
    if (v > 23.5 && v < 28 && [cx - 2.8, cx, cx + 2.8].some((x) => Math.abs(u - x) < 0.5)) return false;
    return true;
  }
  // a strip of cloth keeps the skull clear of the bones behind it
  for (const [x, y] of [[-1.4, 0], [1.4, 0], [0, -1.4], [0, 1.4], [-1, 1], [1, 1]]) if (skull(x, y)) return false;
  return bone(cx - 18, 21, cx + 18, 36) || bone(cx + 18, 21, cx - 18, 36);
}

// How far each column hangs below where it would at rest, in rows, and the
// slope there, which sets its shading.
const wave = (u: number, ph: number) => {
  const reach = u / FW;
  const amp = 0.15 + 1.5 * reach ** 1.5;
  const w = (2 * Math.PI * u) / 34 - ph;
  return [amp * Math.sin(w) + 0.35 * reach * Math.sin(2.3 * w + 1), amp * Math.cos(w) * ((2 * Math.PI) / 34)];
};

export default function pirateFlag(): Frame {
  const { cols, rows } = meta;
  // The emblem sampled once: SUB samples to each half row of the cloth.
  const mask = new Uint8Array(FW * FH * SUB);
  for (let u = 0; u < FW; u++) for (let j = 0; j < FH * SUB; j++) mask[u * FH * SUB + j] = emblem(u + 0.5, (j + 0.5) / SUB) ? 1 : 0;
  // Is the cloth there, at column u and v half rows down it?
  const cloth = (u: number, v: number) => v >= 0 && v < FH && !mask[u * FH * SUB + Math.floor(v * SUB)];
  const grid: string[][] = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
  // The pole and its ball never move.
  for (let y = 2; y < rows; y++) grid[y][POLE] = "█";
  grid[0][POLE - 1] = "▄"; grid[0][POLE] = "█"; grid[0][POLE + 1] = "▄";
  grid[1][POLE - 1] = "▀"; grid[1][POLE] = "█"; grid[1][POLE + 1] = "▀";
  grid[rows - 1][POLE - 1] = "▄"; grid[rows - 1][POLE + 1] = "▄";
  const base = grid.map((r) => r.slice());

  return (t, { paper = false } = {}) => {
    const ph = (2 * Math.PI * (((t % PERIOD) + PERIOD) % PERIOD)) / PERIOD;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) grid[y][x] = base[y][x];
    for (let u = 0; u < FW; u++) {
      const [drop, slope] = wave(u + 0.5, ph);
      // Cloth facing up and left catches the light; cloth turning down falls into shadow.
      const lit = Math.max(0, Math.min(0.99, 0.85 - slope * 1.8 - (u / FW) * 0.1));
      let i = Math.min(RAMP.length - 1, Math.floor(lit * RAMP.length));
      if (paper) i = RAMP.length - 1 - i;
      const x = X0 + u;
      for (let y = 0; y < rows; y++) {
        const v = (y - TOP - drop) * 2;
        const a = cloth(u, v + 0.5), b = cloth(u, v + 1.5);
        if (!a && !b) continue;
        // In the light a half-covered cell takes a half block; in shadow, its shade.
        grid[y][x] = a && b ? RAMP[i] : RAMP[i] !== "█" && !paper ? RAMP[i] : a ? "▀" : "▄";
      }
    }
    // Lashings tie the flag to the pole.
    for (const y of [TOP, TOP + 10, TOP + FH / 2 - 1]) grid[y][POLE + 1] = "╪";
    return grid.map((r) => r.join("")).join("\n");
  };
}
