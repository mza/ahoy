/*
 * compass rose: a mariner's 16-point compass rose, a fleur-de-lis for north,
 * inside a dial of degree ticks that slowly turns. Now and then the card is
 * knocked, swings back and forth and settles on north again, and the
 * fleur-de-lis catches the light.
 *
 * Drawn from geometry each frame. Every cell is sampled on a 3 by 4 grid: the
 * thing that covers most of it gives it its colour, and the shape of the cover
 * picks its character, the one whose own shape matches best, so edges are
 * drawn in p q d b _ / and their kin. Each point is two-toned down its spine:
 * # on its lit side and : on its shaded one, widest a fifth of the way out.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "compass rose",
  category: "scenes",
  note: "a compass rose that swings, settles on north and glints",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  palette: [
    // bone, light to dark
    "#efe8d4", "#c4bca6", "#8e8776", "#5a5549",
    // gold, light to dark, then the glint
    "#ffd36b", "#e0a93a", "#a8761f", "#6b4a14", "#fffbe8",
  ],
} satisfies Meta;

const LOOP = 8;
const CX = 40, CY = 16; // the middle, in cells
const RING = 29, DIAL = 26.6; // the ring and the dial of ticks inside it, in cell widths
const KICK = 3.2; // seconds into the loop when the card is knocked
const DEG = Math.PI / 180;
const GX = 3, GY = 4, G = GX * GY;

// The points as [bearing in degrees, length, half width at the middle, lit and shaded colours], shortest first.
const POINTS: [number, number, number, number, number][] = [];
for (let k = 0; k < 8; k++) POINTS.push([22.5 + 45 * k, 15, 3, 5, 7]);
for (let k = 0; k < 4; k++) POINTS.push([45 + 90 * k, 21, 5, 0, 2]);
for (let k = 0; k < 4; k++) POINTS.push([90 * k, 24.5, 6, 4, 6]);
// where along its length a point is widest, as a share of it
const WIDEST = 0.2;
// The kinds, topmost first, as [first index in POINTS, how many, degrees apart, bearing of the first].
const KINDS: [number, number, number, number][] = [[12, 4, 90, 0], [8, 4, 90, 45], [0, 8, 45, 22.5]];

// The characters by the shape of their ink, on the same 3 by 4 grid, 0 to 9.
const SHAPES: Record<string, string> = {
  _: "000000000555", ".": "000000000050", ",": "000000005050", "'": "050000000000", '"': "555000000000",
  "-": "000555555000", p: "000059599999", q: "000950995999", P: "999999995950", Y: "999999599059",
  d: "399399399399", b: "993993993993", "|": "090090090090", "/": "009059590900", "\\": "900950095009",
  o: "000999999000", "(": "059090090059", ")": "950090090950", "^": "050595000000", v: "000000595050",
};
const TEMPLATES = Object.entries(SHAPES).map(([c, s]) => [c, [...s].map((d) => +d / 9)] as const);

// Materials: 0 nothing, 1 the ring and ticks, 2 the hub, then a point's two sides: 3 + 2p lit, 4 + 2p shaded.
const RINGS = 1, HUB = 2;

export default function compassRose(): Frame {
  const { cols, rows } = meta;
  // each sample's distance from the middle and bearing, in cell widths and radians, north up
  const n = cols * rows * G;
  const sr = new Float32Array(n), sa = new Float32Array(n);
  for (let y = 0, i = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      for (let j = 0; j < GY; j++)
        for (let k = 0; k < GX; k++, i++) {
          const dx = x + (k + 0.5) / GX - CX, dy = (y + (j + 0.5) / GY - CY) * 2;
          sr[i] = Math.hypot(dx, dy);
          sa[i] = Math.atan2(dx, -dy);
        }
  const wrap = (a: number) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

  const material = (i: number, card: number, turn: number) => {
    const r = sr[i], a = sa[i];
    if (r < 2.2) return HUB;
    if (Math.abs(r - RING) < 0.55) return RINGS;
    // only the nearest point of each kind can cover it: a cardinal, then an intercardinal, then a half wind
    const b = wrap(a - card) / DEG;
    for (const [first, count, step, offset] of KINDS) {
      const p = first + ((((Math.round((b - offset) / step) % count) + count) % count));
      const [bearing, len, half] = POINTS[p];
      const d = wrap(a - card - bearing * DEG);
      const u = r * Math.cos(d), v = r * Math.sin(d);
      const w = u < len * WIDEST ? half * (0.35 + (0.65 * u) / (len * WIDEST)) : (half * (len - u)) / (len * (1 - WIDEST));
      if (u >= 0 && u <= len && Math.abs(v) <= w) return v >= 0 ? 3 + 2 * p : 4 + 2 * p;
    }
    return 0;
  };
  const inkOf = (m: number) => (m === RINGS ? 1 : m === HUB ? 4 : POINTS[(m - 3) >> 1][3 + ((m - 3) & 1)]);
  const fillOf = (m: number) => (m === HUB ? "@" : m === RINGS ? "#" : (m - 3) & 1 ? ":" : "#");

  // the fleur-de-lis that tips north, and the letters outside the ring
  const FLEUR = [" .^. ", "(\\|/)", " '|' "];
  const LETTERS: [number, string, number][] = [[90, "E", 31.5], [180, "S", 31], [270, "W", 31.5]];

  const mats = new Int32Array(G), cover = new Float32Array(G);
  // the rose drawn at rest, kept, since it is drawn so for most of the loop
  let rest: { chars: string[][]; inks: Uint8Array } | undefined;
  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const k = u - KICK;
    const card = k > 0 ? 32 * DEG * Math.exp(-k * 0.95) * Math.sin((k * 2 * Math.PI) / 1.7) : 0;
    const turn = (u / LOOP) * 10 * DEG;
    const glint = Math.max(0, 1 - Math.abs(u - 1.4) / 0.4, 1 - Math.abs(u - 7.3) / 0.4);
    let out: string[][] = [];
    const cached = card === 0 && rest !== undefined;
    const inks = cached ? rest!.inks : new Uint8Array(cols * rows);
    if (cached) out = rest!.chars.map((l) => l.slice());
    else for (let y = 0, i = 0; y < rows; y++) {
      const line: string[] = [];
      for (let x = 0; x < cols; x++, i += G) {
        // the material covering most of the cell, and the shape of its cover
        let best = 0, most = 0;
        for (let s = 0; s < G; s++) mats[s] = material(i + s, card, turn);
        for (let s = 0; s < G; s++) {
          if (!mats[s]) continue;
          let c = 0;
          for (let q = 0; q < G; q++) c += +(mats[q] === mats[s]);
          if (c > most) (most = c), (best = mats[s]);
        }
        let ch = " ";
        if (best) {
          // the two sides of a point count as one shape for its outline
          const same = (m: number) => m === best || (best > 2 && m > 2 && (m - 3) >> 1 === (best - 3) >> 1);
          let total = 0;
          for (let s = 0; s < G; s++) total += cover[s] = same(mats[s]) ? 1 : 0;
          if (total >= 10) ch = fillOf(best);
          else if (total >= 1) {
            let pick = " ", err = Infinity;
            for (const [c, shape] of TEMPLATES) {
              let e = 0;
              for (let s = 0; s < G; s++) e += (cover[s] - shape[s]) ** 2;
              if (e < err) (err = e), (pick = c);
            }
            ch = pick;
          }
          inks[y * cols + x] = ch === " " ? 0 : inkOf(best);
        }
        line.push(ch);
      }
      out.push(line);
    }
    if (card === 0 && !rest) rest = { chars: out.map((l) => l.slice()), inks: inks.slice() };
    if (color) color.set(inks);
    const put = (lines: string[], x: number, y: number, ink: number) =>
      lines.forEach((l, j) =>
        [...l].forEach((c, i) => {
          const X = x + i, Y = y + j;
          if (c === " " || X < 0 || Y < 0 || X >= cols || Y >= rows) return;
          out[Y][X] = c;
          if (color) color[Y * cols + X] = ink;
        }),
      );
    const at = (bearing: number, dist: number): [number, number] => {
      const a = card + bearing * DEG;
      return [Math.round(CX - 0.5 + Math.sin(a) * dist), Math.round(CY - 0.5 - (Math.cos(a) * dist) / 2)];
    };
    // the dial: a tick every 10 degrees, + every 30, turning on its own
    for (let d = 0; d < 360; d += 10) {
      const a = d * DEG + turn, X = Math.round(CX - 0.5 + Math.sin(a) * DIAL), Y = Math.round(CY - 0.5 - (Math.cos(a) * DIAL) / 2);
      if (out[Y]?.[X] === " ") put([d % 30 ? "·" : "+"], X, Y, d % 30 ? 3 : 1);
    }
    const [fx, fy] = at(0, 26);
    put(FLEUR, fx - 2, fy - 1, glint > 0.35 ? 8 : 4);
    if (glint > 0.6) put(["*"], fx + 3, fy - 1, 8);
    for (const [b, l, d] of LETTERS) {
      const [lx, ly] = at(b, d);
      put([l], lx, ly, 0);
    }
    return out.map((l) => l.join("")).join("\n");
  };
}
