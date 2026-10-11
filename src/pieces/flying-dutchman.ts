/*
 * flying dutchman: the ghost ship of legend, its sails in tatters, glowing a
 * spectral green through a rolling fog. Its lanterns and gunports flicker,
 * light ripples over the rotten canvas, and every ten seconds it fades into
 * the fog and forms again.
 *
 * The ship was painted as shapes, one for each of its parts, and sampled on a 3
 * by 4 grid a cell: each cell holds the character whose own shape best matches
 * the part's edge through it, and its part's fill where the part is solid. The
 * fog is noise drawn in a ramp of characters, drifting and looping.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "flying dutchman",
  category: "scenes",
  note: "the ghost ship in tattered sail, glowing through fog, fading in and out",
  cols: 80,
  rows: 32,
  fps: 15,
  ground: "#000000",
  palette: [
    // ghost light, brightest to faintest
    "#dcfff5", "#a2f3dd", "#62c9b3", "#33857a", "#1b4d47", "#0f2c29",
    // lantern light
    "#efff9a", "#b2e650", "#5f8a28",
  ],
} satisfies Meta;

// The ship: its characters, F where a part is solid; and its parts, 1 hull, 2 sails, 3 spars, 4 lights.
const ART = [
  "                                                                                ",
  "                                       _____ppp-                                ",
  "                                      _-FFFFFFq__                               ",
  "                               'dppppppFFFFFFF'\"\"                               ",
  "                                dFFFFFFFFFFFFF          -                       ",
  "                                dFFFFFFFFFFFFF   _______|_____-.                ",
  "                     =          dFFFFFFFFFFFFF    FFFFFFFFFFFFb                 ",
  "               -ppppp|ppppq-    dFFFFFYFFFFFFF    FFFFFFFFFFFFb                 ",
  "               .FFFFFFFFFFF     dP\"FF\"_YF\"dFFF    FFFFFFFFFFFFb  q              ",
  "               .FFFFFFFFFFF     ^  \"\" _-\"  \"PP    FFFFFPFFFFFFb  db_            ",
  "               .FFFFFFFFFFF           _-          P\"\"F\" |P\"\"FFb  dFFq           ",
  "               .P\"FP\"|F\"YFF    -pppppp--pppppp--     '  |   \"\"\"  dFFFb_         ",
  "                  \"\" |   \"\"    dFFFFFFFFFFFFFFb ________|________dFP\"YFq        ",
  "              -______|______-  dFFFFFFFFFFFFFFb  dFFFFFFFFFFFFFb dFFqdFFb_      ",
  "              ,FFFFFFFFFFFFF   dFFFFFFFFP\" \"FFb  dFFPPFFFFFFFFFb dFFFFFFFFq     ",
  "    pq_       ,FFFFFFFP\"\"YFF   dFFFFFFFFFqpFFFb  dFb  _FFFFFFFFb ,FFFFFFFFFb_ __",
  "    \"^pppppppppFFFFFFFbqppFF   dFFFFFFYFFFFFFFb  dFFFFFFFFFFFFFb ,FFFFFFFFPP^-' ",
  "     dFP__FF__YFFFFFYFFFFFFF   dFPYFF\"_YFP\"FFFb  dFYFFP\"|FFYFFFb .FFPP^\"dFb''   ",
  "     \"FF\"\"FF\"\"FFFFF\" |P\"\"YFF   -\" \"Y\" _-\"  \"FFb  d\" YP\" |P\" YFFb  \"__ppFb'      ",
  "      YFFFFFFFFFFFqpp|q________________-______________. |    \"_pppFFFFFFF\"      ",
  "       \"FFFFFFFFFFFPPPPPPPPPPPPPPPPPPPPPPPPPYPPPPYYYYYYPPPPYYYYPY==bbbFP\"       ",
  "        \"YFFFFFFFFbpppboopdPoodFPPPFFFYYFFFPPFFFPPFFFPPFFFPPFFFPPFFFFF\"         ",
  "          \"YFFFFFFFFFFbY^FFbY^FFbY^FFbY^FFbY^FFbY^FFbY^FFbY^FFbY^FFFP\"          ",
  "             \"YYYFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFP\"\"            ",
  "                  \"\"^YPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP^\"                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
];
const PART = [
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000032222222200000000000000000000000000000000",
  "00000000000000000000000000000000000000332222222220000000000000000000000000000000",
  "00000000000000000000000000000003222222222222223220000000000000000000000000000000",
  "00000000000000000000000000000000222222222222220000000000300000000000000000000000",
  "00000000000000000000000000000000222222222222220003222222322222330000000000000000",
  "00000000000000000000030000000000222222222222220000222222222222200000000000000000",
  "00000000000000032222232222230000222222222222220000222222222222200000000000000000",
  "00000000000000022222222222200000222222322222220000222222222222200200000000000000",
  "00000000000000022222222222200000200220332002220000222222222222200222000000000000",
  "00000000000000022222222222200000000000330000000000222220322222200222200000000000",
  "00000000000000022222232222200003222222332222223300000200300022200222222000000000",
  "00000000000000000022030002200002222222222222222033333333333333333222222200000000",
  "00000000000000322222232222223002222222222222222002222222222222220222222222000000",
  "00000000000000222222222222220002222222222202222002222222222222220222222222200000",
  "00004440000000222222222222220002222222222222222002220022222222220222222222222033",
  "00004411111111122222222222220002222222222222222002222222222222220222222222222330",
  "00000111441144111222222222220002222222322222222002222222322222220222222244433000",
  "00000111441144111122032222220002202220332002222002202220322022220021111113000000",
  "00000011111111111111131111111111111111331111111111111110300002111111111111000000",
  "00000001111111111111111111111111111111111111111111111111111111111111111110000000",
  "00000000111111111111111111111111111111111111111111111111111111111111111000000000",
  "00000000001111111111111441114411144111441114411144111441114411144111110000000000",
  "00000000000001111111111111111111111111111111111111111111111111111111000000000000",
  "00000000000000000011111111111111111111111111111111111111111111110000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
];

const LOOP = 10;
const FOG_TOP = 20; // the row the fog starts thickening from
const PERIOD = 16; // the fog's noise repeats this many lattice cells across, so its drift loops

function hash(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Value noise, wrapping every PERIOD lattice cells across.
function noise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const x0 = ((xi % PERIOD) + PERIOD) % PERIOD, x1 = (x0 + 1) % PERIOD;
  const a = hash(x0, yi), b = hash(x1, yi), c = hash(x0, yi + 1), d = hash(x1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// How much of the ship shows: all of it, then it fades into the fog, is gone a moment, and forms again.
const shown = (u: number) => (u < 5.4 ? 1 : u < 6.6 ? 1 - ease((u - 5.4) / 1.2) : u < 7.6 ? 0 : u < 9.2 ? ease((u - 7.6) / 1.6) : 1);
// Now and then it gutters, like a candle.
const gutter = (u: number) => [2.1, 2.35, 4.4].some((s) => u >= s && u < s + 0.12);

const FOG = " .-~~=";
const STARS: [number, number][] = [[4, 2], [12, 6], [27, 1], [58, 3], [66, 1], [74, 7], [8, 13], [75, 12]];

export default function flyingDutchman(): Frame {
  const { cols, rows } = meta;
  const grain = Array.from({ length: rows * cols }, (_, k) => hash(k % cols, (k / cols) | 0));
  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const show = shown(u), dim = gutter(u) ? 1 : 0;
    const drift = (u / LOOP) * PERIOD;
    const out: string[] = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        const k = y * cols + x;
        // the fog: a few long wisps across the sky, and a bank rolling below the waterline
        const n = noise(x / 7 + drift, y / 1.6) * 0.7 + noise(x / 3 - drift * 2, y / 1.1 + 7) * 0.3;
        const bank = y < FOG_TOP ? 0 : ease((y - FOG_TOP) / 6);
        const wisp = y > 4 && y < FOG_TOP ? Math.max(0, n - 0.74) * (0.5 + 0.5 * Math.sin(y * 1.3)) : 0;
        const fog = Math.max(wisp, n * 0.9 + bank * 0.62 - 0.66);
        let ch = " ", ink = 0;
        const part = +PART[y][x];
        // a part shows where the ship has formed, and where the fog is thin enough to see it through
        if (part && grain[k] < show && fog < (y > FOG_TOP ? 0.16 : 0.32)) {
          ch = ART[y][x];
          if (part === 4) {
            const flicker = hash(x, Math.floor(u * 6)) > 0.8;
            ch = ch === "F" ? "@" : "o";
            ink = flicker || dim ? 7 : 6;
          } else if (part === 2) {
            if (ch === "F") ch = "#";
            // light ripples over the canvas
            const ripple = noise(x / 3 - u * 1.6, y / 1.5 + 30);
            ink = Math.min(4, (ripple > 0.62 ? 0 : 1) + dim + (show < 1 ? 1 : 0));
          } else if (part === 1) {
            if (ch === "F") ch = "8";
            ink = Math.min(4, 2 + dim + (show < 1 ? 1 : 0));
          } else {
            if (ch === "F") ch = "|";
            ink = Math.min(4, 2 + dim);
          }
        } else if (fog > 0.02) {
          ch = FOG[Math.min(FOG.length - 1, 1 + Math.floor(fog * 5.5))];
          ink = fog > 0.45 ? 3 : fog > 0.2 ? 4 : 5;
        }
        line += ch;
        if (color) color[k] = ink;
      }
      out.push(line);
    }
    // a few dim stars, twinkling, where nothing else is
    for (const [x, y] of STARS) {
      if (out[y][x] !== " ") continue;
      const on = Math.sin(u * ((2 * Math.PI) / LOOP) * 3 + x) > -0.3;
      out[y] = out[y].slice(0, x) + (on ? "." : " ") + out[y].slice(x + 1);
      if (color) color[y * cols + x] = 3;
    }
    return out.join("\n");
  };
}
