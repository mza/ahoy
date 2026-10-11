/*
 * skull-moon: a huge crescent moon over a black sea, its dark side slowly
 * becoming a grinning skull and fading back into shadow. The moon lays a path
 * of glitter across the water to a small ship on the horizon, a lantern lit at
 * its stern, and the stars twinkle.
 *
 * Drawn fresh each frame from its shapes, each cell sampled three across and
 * four down: the lit crescent takes the character whose shape best matches
 * its edge and fills with @ and 8, the skull in the shadow rises from dots to
 * solid in ghostly cyan, and the glitter is hashed from the time, so it loops.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "skull moon",
  category: "scenes",
  note: "a crescent moon whose dark side becomes a skull, over a glittering sea",
  cols: 80,
  rows: 32,
  fps: 15,
  // bone, dim to white; ghost cyan, dim to bright; the sea; a lantern; starlight
  palette: ["#6e6a60", "#b8b2a2", "#ece6d6", "#ffffff", "#163c44", "#2f8a96", "#86e6ee", "#0f2c36", "#f0b04a", "#7a7a80"],
  ground: "#000000",
} satisfies Meta;

const LOOP = 12;
const GX = 3, GY = 4;
// in square units: x in cell widths, y in half cells
const MOON = { x: 40, y: 21, r: 16 };
const BITE = { x: 47, y: 21, r: 15.4 }; // the disc that shades the moon's right side
const HORIZON = 22; // the sea's first row

const SHAPES: [string, string][] = [
  [" ", "000000000000"], ["8", "999999999999"], ["_", "000000000555"], [".", "000000000050"],
  ["'", "050000000000"], ['"', "555000000000"], ["o", "000000999999"], ["P", "999999999000"],
  ["p", "000059599999"], ["q", "000950995999"], ["P", "999999995950"], ["Y", "999999599059"],
  ["d", "399399399399"], ["b", "993993993993"], ["|", "090090090090"], ["/", "009059590900"],
  ["\\", "900950095009"], [",", "000000005059"], ["'", "950500000000"], ["-", "000999000000"],
];
const TEMPLATES = SHAPES.map(([c, s]) => [c, [...s].map((d) => +d / 9)] as const);

// The small ship on the horizon: hull, two masts with sails, and a lantern at the stern.
const SHIP = ["   |\\  |\\", "  _|_\\_|_\\_", "  \\_______/*"];
const SHIP_AT = [48, HORIZON - 3];

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const hash = (a: number, b: number, c: number) => {
  let h = Math.imul(a * 73856093 ^ b * 19349663 ^ c * 83492791, 0x9e3779b1);
  h ^= h >>> 15;
  return ((h >>> 0) % 10000) / 10000;
};

// Where the skull is: the moon's whole disc is its face, these are what is cut out of it.
function feature(x: number, y: number) {
  const ex = Math.abs(x - MOON.x) - 6.3, ey = y - 18.6;
  if ((ex / 3.9) ** 2 + (ey / 4.8) ** 2 < 1) return true; // eye sockets
  const nx = Math.abs(x - MOON.x), ny = y - 24.6;
  if (ny > 0 && ny < 4.4 && nx < 1.9 * (ny / 4.4) + 0.3) return true; // nose
  if (y > 30.4 && y < 35.2 && Math.abs(x - MOON.x) < 8.6 - Math.max(0, y - 33.6) * 2) {
    // the grin, a row of teeth with gaps between
    const k = (((x - MOON.x + 8.6) % 3) + 3) % 3;
    if (y < 31.4 || y > 34.2 || k < 1) return true;
  }
  return false;
}

export default function skullMoon(): Frame {
  const { cols, rows } = meta;
  const n = GX * GY;
  // Per cell, from its samples: how much is lit moon, how much shadowed skull, how much cut out; and the lit samples'
  // brightness, worn by a few craters.
  const litCover: number[][] = [], skullCover: number[][] = [], featureCover: number[][] = [];
  const bright = new Float32Array(cols * rows);
  const craters = [[33, 13, 2.2], [30, 24, 1.6], [36, 30, 1.8], [28, 18, 1.2], [34, 7, 1.4]];
  for (let y = 0; y < HORIZON; y++)
    for (let x = 0; x < cols; x++) {
      const lit: number[] = [], skull: number[] = [], cut: number[] = [];
      let b = 0, nb = 0;
      for (let j = 0; j < GY; j++)
        for (let i = 0; i < GX; i++) {
          const sx = x + (i + 0.5) / GX, sy = (y + (j + 0.5) / GY) * 2;
          const inDisc = (sx - MOON.x) ** 2 + (sy - MOON.y) ** 2 < MOON.r ** 2;
          const shaded = (sx - BITE.x) ** 2 + (sy - BITE.y) ** 2 < BITE.r ** 2;
          const f = inDisc && feature(sx, sy);
          lit.push(inDisc && !shaded ? 1 : 0);
          skull.push(inDisc && shaded && !f ? 1 : 0);
          cut.push(f ? 1 : 0);
          if (inDisc && !shaded) {
            // brighter toward the lit limb, darker in the craters
            const d = Math.hypot(sx - MOON.x, sy - MOON.y) / MOON.r;
            let v = 0.55 + 0.45 * Math.sqrt(Math.max(0, 1 - d * d)) * 0.6 + 0.4 * d;
            for (const [cx, cy, cr] of craters) if ((sx - cx) ** 2 + ((sy - cy) * 0.9) ** 2 < cr * cr) v -= 0.45;
            (b += v), nb++;
          }
        }
      const k = y * cols + x;
      litCover[k] = lit;
      skullCover[k] = skull;
      featureCover[k] = cut;
      bright[k] = nb ? b / nb : 0;
    }
  const stars: [number, number, number][] = [];
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(hash(i, 1, 7) * cols), y = Math.floor(hash(i, 2, 7) * (HORIZON - 1));
    if ((x + 0.5 - MOON.x) ** 2 + ((y + 0.5) * 2 - MOON.y) ** 2 < (MOON.r + 3) ** 2) continue;
    stars.push([x, y, hash(i, 3, 7) * 6.28]);
  }

  const match = (g: number[]) => {
    let best = " ", bd = Infinity;
    for (const [c, tpl] of TEMPLATES) {
      let d = 0;
      for (let k = 0; k < n; k++) d += (g[k] - tpl[k]) ** 2;
      if (d < bd) (bd = d), (best = c);
    }
    return best;
  };

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    // the skull: there at the start, fading into shadow, gone, and rising again
    const ghost = 1 - smooth((u - 2.6) / 1.6) + smooth((u - 8.4) / 1.8);
    const step = Math.floor(u * 8);
    const out: string[] = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        let ch = " ", ci = 0;
        const k = y * cols + x;
        if (y < HORIZON) {
          const lit = litCover[k], skull = skullCover[k], cut = featureCover[k];
          const nl = lit.reduce((a, b) => a + b, 0) / n, ns = skull.reduce((a, b) => a + b, 0) / n;
          if (nl > 0.06) {
            // the lit crescent; where the skull is up, its sockets show through as craters
            const g = lit.map((v, i) => (ghost > 0.5 && cut[i] ? 0 : v));
            const ng = g.reduce((a, b) => a + b, 0) / n;
            const b = bright[k];
            if (ng > 0.88) ch = b > 0.9 ? "@" : b > 0.62 ? "8" : "%";
            else if (ng > 0.06) {
              ch = match(g);
              if (ch === "8") ch = "8";
              if (ch === " ") ch = ".";
            }
            ci = ch === " " ? 0 : b > 0.9 ? 3 : b > 0.62 ? 2 : b > 0.35 ? 1 : 0;
          } else if (ns > 0.06) {
            // the shadow: a faint earthshine of dots, rising into a skull of ghostly cyan
            const level = 0.18 + 0.82 * ghost;
            if (level < 0.4) {
              if ((x + y) % 3 === 0 && ns > 0.5) (ch = "."), (ci = 4);
            } else if (ns > 0.88) {
              ch = level > 0.85 ? "%" : level > 0.62 ? "=" : ":";
              ci = level > 0.85 ? 6 : 5;
            } else if (level > 0.6) {
              ch = match(skull);
              if (ch === "8") ch = "%";
              if (ch === " ") ch = ".";
              ci = 5;
            } else if (ns > 0.5) (ch = ":"), (ci = 4);
          } else {
            for (const [sx, sy, ph] of stars)
              if (sx === x && sy === y) {
                const tw = Math.sin((u * 2 * Math.PI * 2) / LOOP + ph);
                ch = tw > 0.7 ? "+" : tw > -0.2 ? "·" : ".";
                ci = tw > 0.7 ? 2 : 9;
              }
          }
        } else {
          // the sea: a glitter path under the moon, widening toward us, and a few dark swells either side
          const depth = y - HORIZON;
          const sway = Math.sin(u * ((2 * Math.PI) / LOOP) * 2 + depth * 0.7) * 0.8;
          const half = 2 + depth * 1.9;
          const dx = Math.abs(x + 0.5 - MOON.x - sway * 0.6);
          if (dx < half) {
            const fall = 1 - dx / half;
            const h = hash(x, y, step);
            if (h < 0.18 + 0.55 * fall) {
              const lvl = fall * (0.5 + 0.5 * hash(x, y, step + 999));
              ch = lvl > 0.62 ? (h < 0.08 ? "*" : "=") : lvl > 0.35 ? (h < 0.3 ? "~" : "-") : h < 0.4 ? "." : "-";
              ci = lvl > 0.62 ? 3 : lvl > 0.35 ? 2 : lvl > 0.18 ? 6 : 5;
            }
          } else {
            const w = Math.sin((x + u * ((2 * Math.PI) / LOOP) * (depth % 2 ? 3 : -3)) * 0.35 + depth * 1.7);
            if (w > 0.93 && hash(x, y, 3) < 0.6) (ch = depth < 3 ? "-" : "~"), (ci = 7);
          }
        }
        // the ship, a silhouette on the horizon, its lantern flickering
        const sy = y - SHIP_AT[1], sx = x - SHIP_AT[0];
        if (sy >= 0 && sy < SHIP.length && sx >= 0 && sx < SHIP[sy].length) {
          const c = SHIP[sy][sx];
          if (c !== " ") (ch = c), (ci = c === "*" ? 8 : 0);
          else if (sy === 2 && sx > 2 && sx < 10) (ch = " "), (ci = 0);
          if (c === "*" && hash(1, 1, step) < 0.25) ch = "+";
        }
        if (color) color[k] = ci;
        line += ch;
      }
      out.push(line);
    }
    return out.join("\n");
  };
}
