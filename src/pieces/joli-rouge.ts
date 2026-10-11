/*
 * joli-rouge: the red flag, the "joli rouge" that may have given the Jolly
 * Roger its name. Where a black flag offered quarter to a ship that struck
 * at once, the red one promised none. It streams from its pole in a hard
 * wind, NO QUARTER cut out of it, and the folds run down it.
 *
 * The cloth is a sheet blown sideways: each cell is traced back to the point
 * of the cloth it shows, four times down its height, so the edges take the
 * character their coverage and slope call for. The cloth is solid blocks
 * in three reds, banded by how its folds face the light, and the
 * lettering is cut out of it, so it stays black whatever the folds do.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "joli rouge",
  category: "scenes",
  note: "the red flag of no quarter, streaming from its pole in a hard wind",
  cols: 80,
  rows: 32,
  fps: 20,
  // bone, lit and shaded; the pole; the cloth, darkest to brightest; the wind
  palette: ["#f1e8d4", "#a99c86", "#cfc4ad", "#2c0605", "#5c0d09", "#8f140e", "#c31d13", "#f0321f", "#262626"],
  ground: "#000000",
} satisfies Meta;

const LOOP = 4.8;
const PERIOD = 1.6; // seconds a fold takes to run the length of the flag
const X0 = 8.5, W = 66; // the hoist and the length, in cells
const Y0 = 5, H = 20; // the top edge at rest and the height, in rows
const POLE = 7;
const SUB = 4; // samples down each cell

// NO QUARTER, on two lines, in a heavy stencil six by seven a letter, a column apart.
const FONT: Record<string, string[]> = {
  N: ["##  ##", "### ##", "######", "## ###", "##  ##", "##  ##", "##  ##"],
  O: [" #### ", "##  ##", "##  ##", "##  ##", "##  ##", "##  ##", " #### "],
  Q: [" #### ", "##  ##", "##  ##", "##  ##", "## ###", "##  ##", " ### #"],
  U: ["##  ##", "##  ##", "##  ##", "##  ##", "##  ##", "##  ##", " #### "],
  A: [" #### ", "##  ##", "##  ##", "######", "##  ##", "##  ##", "##  ##"],
  R: ["##### ", "##  ##", "##  ##", "##### ", "## ## ", "##  ##", "##  ##"],
  T: ["######", "  ##  ", "  ##  ", "  ##  ", "  ##  ", "  ##  ", "  ##  "],
  E: ["######", "##    ", "##    ", "##### ", "##    ", "##    ", "######"],
};
const LINES = ["NO", "QUARTER"];

// A few streaks of wind crossing the frame: row, speed in cells a second, length, phase.
const GUSTS: [number, number, number, number][] = [
  [2, 40, 6, 0], [27, 55, 9, 31], [29, 35, 5, 57], [3, 50, 4, 12], [25, 45, 7, 66],
];

export default function joliRouge(): Frame {
  const { cols, rows } = meta;
  // the lettering as cloth pixels, a pixel a cell at rest, each line centred on the cloth
  const ink = new Uint8Array(W * H);
  LINES.forEach((word, l) => {
    const tw = word.length * 7 - 1, tx = Math.round((W - tw) / 2), ty = 2 + l * 9;
    [...word].forEach((c, i) =>
      FONT[c].forEach((line, y) => {
        for (let x = 0; x < 6; x++) if (line[x] === "#") ink[(ty + y) * W + tx + i * 7 + x] = 1;
      }),
    );
  });

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    // the wind gusts and eases once a loop
    const gust = 0.85 + 0.15 * Math.sin((2 * Math.PI * u) / LOOP);
    // how far the cloth is blown down at a point of it, in rows: nothing at the hoist, most at the fly
    const lift = (a: number, b: number) => {
      a = Math.max(0, a);
      return (
        (0.3 + 2.1 * Math.pow(a, 1.2) * gust) * Math.sin(2 * Math.PI * (1.4 * a - u / PERIOD) + 0.9 * b) +
        0.6 * a * a * Math.sin(2 * Math.PI * (3 * a - (2 * u) / PERIOD) + 1.7 * b)
      );
    };
    // the point of the cloth a sample shows, or none: a, along it from the hoist, and b, down it
    const cloth = (x: number, y: number): [number, number] | null => {
      const a = (x - X0) / W;
      if (a < 0 || a > 1) return null;
      // the fly end is frayed a little, more so in the folds
      let b = (y - Y0) / H;
      for (let i = 0; i < 3; i++) b = (y - Y0 - lift(a, b)) / H;
      if (b < 0 || b > 1) return null;
      if (a > 0.985 - 0.012 * Math.abs(Math.sin(b * 23 + u * 4))) return null;
      return [a, b];
    };

    const out: string[] = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        let ch = " ", c = 0;
        // samples down the cell: how many show cloth, and how far down the first and last of them are
        let n = 0, first = -1, last = -1, at: [number, number] | null = null;
        for (let s = 0; s < SUB; s++) {
          const p = cloth(x + 0.5, y + (s + 0.5) / SUB);
          if (!p) continue;
          n++;
          if (first < 0) first = s;
          last = s;
          if (!at || s === 1 || s === 2) at = p;
        }
        if (at) {
          const [a, b] = at;
          // which way the cloth faces: a fold rising toward the fly catches the light
          const e = 0.002;
          const slope = (lift(a + e, b) - lift(a - e, b)) / (2 * e * W);
          let light = 0.55 - 1.1 * slope - 0.25 * (b - 0.5);
          light = Math.max(0, Math.min(0.999, light));
          const px = Math.floor(a * W), py = Math.floor(b * H);
          const letter = ink[Math.min(H - 1, py) * W + Math.min(W - 1, px)] === 1;
          if (n === SUB) {
            // the lettering is a hole in the cloth; the rest is shaded in three bands
            if (!letter) (ch = "█"), (c = light < 0.36 ? 4 : light < 0.68 ? 5 : 6);
          } else {
            // an edge: its slope says which way it leans, its coverage how much of the cell it fills
            const top = first > 0;
            const steep = Math.abs(slope) > 0.25;
            if (top) ch = steep ? (slope < 0 ? "p" : "q") : n <= 1 ? "_" : ",";
            else ch = steep ? (slope < 0 ? "P" : "Y") : n <= 1 ? "\"" : "'";
            c = 5;
          }
        } else if (x === POLE && y >= 2) (ch = "║"), (c = 2);
        if (x === POLE && (y === Y0 || y === Y0 + H - 1)) (ch = "╫"), (c = 2);
        if (y === 1 && x >= POLE - 1 && x <= POLE + 1) (ch = "(o)"[x - POLE + 1]), (c = 2);
        if (y === 0 && x === POLE) (ch = "_"), (c = 2);
        if (ch === " ")
          for (const [row, speed, len, phase] of GUSTS) {
            if (row !== y) continue;
            const head = ((u * speed + phase) % (cols + len * 3)) - len;
            if (x >= head && x < head + len && x > POLE + 1) (ch = "-"), (c = 8);
          }
        if (color) color[y * cols + x] = c;
        line += ch;
      }
      out.push(line);
    }
    return out.join("\n");
  };
}
