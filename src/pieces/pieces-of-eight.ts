/*
 * pieces-of-eight: a Spanish real de a ocho, the pirates' piece of eight,
 * spinning on its edge. One face carries the cross with castles and lions,
 * the other the pillars of Hercules either side of a big 8. Each face is a
 * relief, lit from the upper left, so the design shows by its edges as the
 * coin turns; the milled rim shows when it is edge on. Gold in colour, a
 * density ramp in one ink.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "pieces of eight",
  category: "scenes",
  note: "a spanish piece of eight spinning in the dark, catching the light",
  cols: 64,
  rows: 32,
  fps: 30,
  // gold from shadow to glint, then bone for the lettering and white for the sparkle
  palette: [
    "#2a1a05", "#4a300a", "#6e4a10", "#946818", "#b8862a", "#d4a43e", "#e8c060", "#f6dc90", "#fff2c8",
    "#8a8070", "#e8e0cc", "#ffffff",
  ],
  ground: "#000000",
} satisfies Meta;

// the face's characters: in shadow, the field, standing proud, and lit
const FACE = [".", ":", "#", "@"];
const GOLD = 9; // shades of gold, palette 0 to 8
const BONE_DIM = 9, BONE = 10, WHITE = 11;
const TURN = 2.4; // seconds a half turn takes
const H = 0.11; // half the coin's thickness, as a share of its radius
const CY = 14.5, RY = 13.4, RX = RY * 2; // centre row, and radius in rows and columns
const TITLE = "P I E C E S   O F   E I G H T";

// A tower for the cross's quarters, a cell a pixel; # stands proud of the field.
const TOWER = [
  "#.#.#",
  "#####",
  ".###.",
  ".#.#.",
  ".###.",
];
const bitmap = (art: string[], x: number, y: number, x0: number, y0: number, w: number, h: number) => {
  const u = (x - x0) / w, v = (y - y0) / h;
  if (u < 0 || v < 0 || u >= 1 || v >= 1) return false;
  return art[Math.floor(v * art.length)][Math.floor(u * art[0].length)] === "#";
};

// Whether the relief stands proud at (x, y) on the face, the face a unit disc.
function proud(back: boolean, x: number, y: number) {
  const r = Math.hypot(x, y);
  if (r > 0.88) return true; // the rim
  if (r > 0.79 && r < 0.83) return Math.floor(((Math.atan2(y, x) + Math.PI) / (2 * Math.PI)) * 36) % 2 === 0; // beads
  const ax = Math.abs(x), ay = Math.abs(y);
  if (!back) {
    // a cross potent, and a tower in each quarter
    if ((ax < 0.11 && ay < 0.64) || (ay < 0.11 && ax < 0.64)) return true;
    if ((ay > 0.52 && ay < 0.64 && ax < 0.26) || (ax > 0.52 && ax < 0.64 && ay < 0.26)) return true;
    return bitmap(TOWER, ax, ay, 0.22, 0.22, 0.32, 0.32);
  }
  // the pillars of Hercules either side of a big 8, over the waves
  if (Math.abs(ax - 0.5) < 0.07 && ay < 0.42) return true;
  if (Math.abs(ax - 0.5) < 0.13 && Math.abs(ay - 0.46) < 0.05) return true;
  if (y > 0.6 && y < 0.7 && ax < 0.42) return Math.sin(x * 18) > -0.2;
  // the 8, two rings, the lower one larger
  return Math.abs(Math.hypot(x, y + 0.27) - 0.18) < 0.075 || Math.abs(Math.hypot(x, y - 0.2) - 0.23) < 0.085;
}

// The turn at t seconds: it eases through each face, so a face lingers, and races through the edge.
const angle = (t: number) => {
  const n = t / TURN, f = n - Math.floor(n);
  return Math.PI * (Math.floor(n) + f - Math.sin(2 * Math.PI * f) / (2 * Math.PI) * 0.75);
};

export default function piecesOfEight(): Frame {
  const { cols, rows } = meta;
  const cx = cols / 2;
  const m = Math.hypot(-0.55, -0.6, 0.6);
  const [lx, ly, lz] = [-0.55 / m, -0.6 / m, 0.6 / m];

  return (t, { paper = false, color } = {}) => {
    const a = angle(t);
    const ca = Math.cos(a), sa = Math.sin(a);
    const back = ca < 0; // which face is towards us
    const lines: string[] = [];
    for (let row = 0; row < rows; row++) {
      let line = "";
      for (let col = 0; col < cols; col++) {
        const k = row * cols + col;
        const x = (col + 0.5 - cx) / RX, y = (row + 0.5 - CY) / RY;
        let ch = " ", c = 0;
        // the face towards us, then the milled edge round it
        const fx = (x - (back ? -H : H) * sa) / ca;
        if (Math.abs(y) <= 1 && fx * fx + y * y <= 1) {
          // the back face is seen mirrored, so its design reads the right way round
          const u = back ? -fx : fx;
          const up = proud(back, u, y);
          // an edge of the relief that faces the light is lit, and one that faces away is in shadow
          const ul = proud(back, u - 0.05, y - 0.07);
          const level = up ? (ul ? 2 : 3) : ul ? 0 : 1;
          // the whole face brightens as it turns to the light, and shines towards its upper left
          const face = Math.max(0, (back ? -sa : sa) * lx + Math.abs(ca) * lz);
          const lift = Math.round(face * 2 - (u * 0.5 + y * 0.6) * 0.8);
          ch = FACE[paper ? 3 - level : level];
          c = Math.max(0, Math.min(GOLD - 1, level * 2 + lift));
        } else if (Math.abs(y) <= 1 && Math.abs(x) <= H * Math.abs(sa) + Math.sqrt(1 - y * y) * Math.abs(ca)) {
          // the rim, ridged: lit as the edge turns to the light
          const side = Math.sign(x) || 1;
          const lit = Math.max(0, side * Math.sign(sa) * lx * -1 * 0.6 + 0.35 - y * ly * 0.4);
          const ridge = row % 2 === 0;
          ch = ridge ? "|" : "!";
          c = Math.min(GOLD - 1, Math.floor((0.3 + lit * 0.7) * GOLD) - (ridge ? 0 : 1));
          if (c < 1) c = 1;
        }
        if (color) color[k] = c;
        line += ch;
      }
      lines.push(line);
    }
    // a glint runs round the rim now and then
    const g = (t % (TURN * 2)) / (TURN * 2);
    if (g < 0.25 && !paper) {
      const th = -Math.PI * 0.75 + g * 4 * 0.6;
      const gx = Math.round(cx + Math.cos(th) * RX * 0.93 * Math.abs(ca)), gy = Math.round(CY + Math.sin(th) * RY * 0.93);
      if (gy >= 0 && gy < rows && gx >= 0 && gx < cols && lines[gy][gx] !== " ") {
        lines[gy] = lines[gy].slice(0, gx) + "*" + lines[gy].slice(gx + 1);
        if (color) color[gy * cols + gx] = WHITE;
      }
    }
    // the name, under it
    const tr = rows - 2, tx0 = Math.floor((cols - TITLE.length) / 2);
    lines[tr] = " ".repeat(tx0) + TITLE + " ".repeat(cols - tx0 - TITLE.length);
    if (color) for (let i = 0; i < TITLE.length; i++) color[tr * cols + tx0 + i] = TITLE[i] === " " ? BONE_DIM : BONE;
    return lines.join("\n");
  };
}
