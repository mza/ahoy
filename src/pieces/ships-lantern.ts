/*
 * ships-lantern: a ship's lantern hanging from a beam on a chain, swinging
 * gently as the ship rolls. Its flame flickers behind the glass and throws a
 * halo of light round it that swings and breathes with it.
 *
 * Line art turned about the hook each frame: every edge is walked in small
 * steps and each cell it crosses takes the character for the way it runs
 * there; the glass and the halo are scattered with light characters that
 * thin with distance, so it reads in one ink as well as in colour.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "ship's lantern",
  category: "scenes",
  note: "a ship's lantern swinging on its chain, its flame flickering in the dark",
  cols: 80,
  rows: 32,
  fps: 15,
  ground: "#000000",
  // iron and its dark, bone; the flame's core, amber and orange; the light falling off into the dark; the glass
  palette: ["#c9c2b4", "#7d776d", "#f2ecdf", "#fff6d0", "#ffb80a", "#ff7a1a", "#d07000", "#8f4a00", "#552a00", "#c48a32"],
} satisfies Meta;

const IRON = 0, DARK = 1, BONE = 2, CORE = 3, AMBER = 4, ORANGE = 5, GLOW = 6, DUSK = 7, EMBER = 8, GLASS = 9;
const LOOP = 8;
const TAU = Math.PI * 2;
// The hook, in units of a cell's width; a cell is two units tall.
const PX = 40, PY = 5;

const hash = (n: number) => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
// The lantern, below the hook, unturned: x across, y down.
const RING_Y = 13, ROOF_TOP = 16, RAIL_TOP = 21, RAIL_FOOT = 43, BASE_FOOT = 47;
const POST = 10, BAR = 3.6, FLAME_Y = 33;

export default function shipsLantern(): Frame {
  const { cols, rows } = meta;
  const out: string[][] = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
  const taken = new Uint8Array(cols * rows);
  let ink: Uint8Array | undefined;
  const put = (x: number, y: number, c: string, k: number) => {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= cols || y >= rows) return;
    out[y][x] = c;
    taken[y * cols + x] = 1;
    if (ink) ink[y * cols + x] = k;
  };
  // A line through points: each cell it crosses takes one character, for where it runs nearest the cell's middle.
  const line = (pts: number[][], k: number) => {
    const cells = new Map<number, [number, number, number]>();
    for (let n = 1; n < pts.length; n++) {
      const [x0, y0] = pts[n - 1], [x1, y1] = pts[n];
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.15));
      const slope = (y1 - y0) / 2 / (Math.abs(x1 - x0) < 1e-6 ? 1e-6 : x1 - x0);
      for (let s = 0; s <= steps; s++) {
        const x = x0 + ((x1 - x0) * s) / steps, y = y0 + ((y1 - y0) * s) / steps;
        const cx = Math.floor(x), cy = Math.floor(y / 2), key = cy * cols + cx;
        const near = Math.abs(x - cx - 0.5) + Math.abs(y / 2 - cy - 0.5) * 0.5;
        const was = cells.get(key);
        if (!was || near < was[0]) cells.set(key, [near, slope, y / 2 - cy]);
      }
    }
    for (const [key, [, slope, f]] of cells) {
      const a = Math.abs(slope);
      let c: string;
      if (a >= 1.8) c = "|";
      else if (a >= 0.75) c = slope > 0 ? "\\" : "/";
      else if (f < 0.28) c = "'";
      else if (f < 0.55) c = "-";
      else if (f < 0.8 && a > 0.2) c = ".";
      else c = "_";
      if (cx(key) >= 0) put(key % cols, Math.floor(key / cols), c, k);
    }
  };
  const cx = (key: number) => key;

  return (t, { color } = {}) => {
    ink = color;
    const u = ((t % LOOP) + LOOP) % LOOP, phase = u / LOOP;
    for (const r of out) r.fill(" ");
    taken.fill(0);
    color?.fill(EMBER);

    // the swing, and the flicker: sums of waves that all come round in the loop
    const turn = 0.09 * Math.sin(TAU * phase * 2);
    const flick = 0.82 + 0.1 * Math.sin(TAU * phase * 11) + 0.08 * Math.sin(TAU * phase * 17 + 1.3);
    const c = Math.cos(turn), s = Math.sin(turn);
    const to = (x: number, y: number) => [PX + x * c - (y - PY) * s, PY + x * s + (y - PY) * c];
    const from = (wx: number, wy: number) => {
      const dx = wx - PX, dy = wy - PY;
      return [dx * c + dy * s, PY + (-dx * s + dy * c)];
    };
    const seg = (x0: number, y0: number, x1: number, y1: number, k: number) => line([to(x0, y0), to(x1, y1)], k);
    // a rail across the cage, drawn double
    const rail = (y: number) => {
      for (let x = -POST - 1.5; x <= POST + 1.5; x += 0.5) {
        const [wx, wy] = to(x, y);
        put(wx, wy / 2, Math.abs(Math.abs(x) - POST) < 0.3 ? "#" : "=", BONE);
      }
    };
    const [fx, fy] = to(0, FLAME_Y);

    // the light thrown round it, swinging with it and breathing with the flame
    for (let cy = 0; cy < rows; cy++)
      for (let cx = 0; cx < cols; cx++) {
        // sparse light, thinning with distance: a few shade blocks close in, then : . ' and · further out
        const d = Math.hypot(cx + 0.5 - fx, (2 * cy + 1 - fy) * 0.9);
        const i = flick * Math.exp(-((d / 20) ** 2));
        const r = hash(cx * 73 + cy * 151);
        if (r > i * 1.15) continue;
        if (i > 0.78 && r < 0.18) put(cx, cy, "░", GLOW);
        else if (i > 0.6) put(cx, cy, r < 0.5 ? ":" : "'", GLOW);
        else if (i > 0.4) put(cx, cy, r < 0.5 ? "." : "`", DUSK);
        else put(cx, cy, r < 0.6 ? "·" : ".", EMBER);
      }
    taken.fill(0);

    // the glass, lit by the flame, and the flame itself
    for (let cy = 0; cy < rows; cy++)
      for (let cx = 0; cx < cols; cx++) {
        const [x, y] = from(cx + 0.5, 2 * cy + 1);
        if (y < RAIL_TOP + 1 || y > RAIL_FOOT - 1 || Math.abs(x) > POST - 0.6) continue;
        const d = Math.hypot(x, (y - FLAME_Y) * 0.8) / flick;
        // the flame: a drop that leans and stretches as it flickers
        const lean = 0.8 * Math.sin(TAU * phase * 9), h = 10 * flick;
        const v = (FLAME_Y + 2 - y) / h;
        const w = v > 0 && v < 1 ? 3.4 * Math.sin(Math.PI * Math.pow(v, 0.7)) * (1 - v * 0.35) : 0;
        const fxl = x - lean * v * v;
        if (Math.abs(fxl) < w) put(cx, cy, Math.abs(fxl) < w * 0.5 && v < 0.7 ? "@" : v > 0.8 ? "^" : Math.abs(fxl) > w * 0.8 ? (fxl < 0 ? "(" : ")") : "#", Math.abs(fxl) < w * 0.5 && v < 0.7 ? CORE : v > 0.6 ? ORANGE : AMBER);
        else if (y > FLAME_Y + 2 && y < FLAME_Y + 6 && Math.abs(x) < 1.2) put(cx, cy, "|", BONE);
        else if (y >= FLAME_Y + 6 && y < FLAME_Y + 7.6 && Math.abs(x) < 3.2) put(cx, cy, "=", IRON);
        else put(cx, cy, hash(cx * 31 + cy * 17) < 0.42 - d * 0.03 ? (d < 7 ? ":" : ".") : " ", GLASS);
      }

    // the beam it hangs from, and the hook
    for (let x = 22; x < 59; x++) put(x, 1, "=", DARK), put(x, 0, "_", DARK);
    put(PX, 2, "J", IRON);
    // the chain: links down to the ring
    for (let y = PY + 1; y < RING_Y - 2; y += 2) {
      const [x, wy] = to(0, y);
      put(x, wy / 2, (y - PY) % 4 < 2 ? "o" : "8", IRON);
    }
    // the ring, the roof and its cap
    line(Array.from({ length: 25 }, (_, i) => to(2.4 * Math.cos((TAU * i) / 24), RING_Y + 1.8 * Math.sin((TAU * i) / 24))), IRON);
    seg(-3, ROOF_TOP, 3, ROOF_TOP, IRON);
    seg(-3, ROOF_TOP, -POST - 1.5, RAIL_TOP, IRON);
    seg(3, ROOF_TOP, POST + 1.5, RAIL_TOP, IRON);
    for (let y = ROOF_TOP + 1.5; y < RAIL_TOP; y += 1.2) {
      const half = 3 + ((POST - 1.5) * (y - ROOF_TOP)) / (RAIL_TOP - ROOF_TOP);
      for (let x = -half + 1.2; x < half - 1; x += 0.5) {
        const [wx, wy] = to(x, y);
        if (!taken[Math.floor(wy / 2) * cols + Math.floor(wx)]) put(wx, wy / 2, "#", DARK);
      }
    }
    // the frame: rails top and foot, corner posts, and two bars across the glass
    rail(RAIL_TOP);
    rail(RAIL_FOOT);
    for (const x of [-POST, POST]) seg(x, RAIL_TOP + 1, x, RAIL_FOOT - 1, BONE);
    for (const x of [-BAR, BAR]) seg(x, RAIL_TOP + 1, x, RAIL_FOOT - 1, IRON);
    seg(-POST, RAIL_TOP + 5, -BAR, RAIL_TOP + 5, IRON);
    seg(BAR, RAIL_TOP + 5, POST, RAIL_TOP + 5, IRON);
    // the base, narrowing to a knob
    seg(-POST - 1.5, RAIL_FOOT, -6, BASE_FOOT, IRON);
    seg(POST + 1.5, RAIL_FOOT, 6, BASE_FOOT, IRON);
    seg(-6, BASE_FOOT, 6, BASE_FOOT, IRON);
    const [kx, ky] = to(0, BASE_FOOT + 1.6);
    put(kx - 0.5, ky / 2, "(", IRON), put(kx + 0.5, ky / 2, ")", IRON);
    return out.map((r) => r.join("")).join("\n");
  };
}
