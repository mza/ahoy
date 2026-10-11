/*
 * wanted-poster: a weathered WANTED poster nailed to a post: the word in big
 * slab letters, a skull in a tricorn for the likeness, and a reward of a
 * thousand pieces of eight. The wind worries at its torn corner, the nail
 * catches the light, and now and then the red ink seems to burn.
 *
 * The lettering is the ANSI Shadow figlet face, the likeness dense ascii fill.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "wanted poster",
  category: "scenes",
  note: "a weathered wanted poster, dead or alive, its torn corner flapping",
  cols: 80,
  rows: 32,
  fps: 15,
  ground: "#000000",
  // bone, parchment, its dim grain, ink red, its shadow, red burning, gold, iron, and the glint
  palette: ["#ece2c8", "#b9ab8a", "#5e5444", "#cf2a2f", "#741419", "#ff5a52", "#d9a63c", "#7a7a80", "#ffffff"],
} satisfies Meta;

const LOOP = 8;
// The poster's edges, inclusive.
const L = 8, R = 71, T = 1, B = 30;

const WANTED = [
  "██╗    ██╗ █████╗ ███╗   ██╗████████╗███████╗██████╗ ",
  "██║    ██║██╔══██╗████╗  ██║╚══██╔══╝██╔════╝██╔══██╗",
  "██║ █╗ ██║███████║██╔██╗ ██║   ██║   █████╗  ██║  ██║",
  "██║███╗██║██╔══██║██║╚██╗██║   ██║   ██╔══╝  ██║  ██║",
  "╚███╔███╔╝██║  ██║██║ ╚████║   ██║   ███████╗██████╔╝",
  " ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═════╝ ",
];
// The likeness, and what each cell of it is: h the hat, s the skull, e an eye.
const FACE = [
  ".888o        _ooppqqoo_        op88b",
  " 98888q_  ,p888888888888q_  ,p88889 ",
  "   \"98888q8888888888888888p88889\"   ",
  "      \"9988888888888888888899\"      ",
  "          ,__988888888P___          ",
  "         p8888888pp8888888q         ",
  "        d888899888888998888b        ",
  "        888\" ** \"88\" ** \"888        ",
  "        d88q ** ,88_ ** p88P        ",
  "        \"Y8888888888888888P\"        ",
  "          \"Y88888\"\"88888P\"          ",
  "           d888888888888888b        ",
  "           d8|8|8|8|8|8|8b          ",
  "           d8|8|8|8|8|8|8b          ",
  "            '\"\"\"\"\"\"\"\"\"\"'            ",
];
const FACE_INK = [
  "hhhhh        hhhhhhhhhh        hhhhh",
  " hhhhhhh  hhhhhhhhhhhhhhhh  hhhhhhh ",
  "   hhhhhhhhhhhhhhhhhhhhhhhhhhhhhh   ",
  "      hhhhhhhhhhhhhhhhhhhhhhhh      ",
  "          ssshhhhhhhhhhsss          ",
  "         ssssssssssssssssss         ",
  "        ssssssssssssssssssss        ",
  "        ssss ee ssss ee ssss        ",
  "        ssss ee ssss ee ssss        ",
  "        ssssssssssssssssssss        ",
  "          ssssssssssssssss          ",
  "           sssssssssssssssss        ",
  "           sssssssssssssss          ",
  "           sssssssssssssss          ",
  "            ssssssssssss            ",
];
const LINES: [number, string, number][] = [
  [10, "──────  D E A D   ·   O R   ·   A L I V E  ──────", 0],
  [26, "FOR PIRACY, MUTINY & PLUNDER UPON THE HIGH SEAS", 1],
  [27, "═══  R E W A R D  ═══", 0],
  [28, "1000 PIECES OF EIGHT", 6],
  [29, "by order of the governor · nassau 1718", 2],
];

// A cell's own number, for the grain and the wear: the same every frame.
const hash = (x: number, y: number) => {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h ^= h >>> 13;
  return ((Math.imul(h, 1103515245) >>> 0) % 1000) / 1000;
};

export default function wantedPoster(): Frame {
  const { cols, rows } = meta;
  const grid = Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
  const ink = Array.from({ length: rows }, () => new Array<number>(cols).fill(2));
  const put = (x: number, y: number, c: string, i: number) => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return;
    grid[y][x] = c;
    ink[y][x] = i;
  };
  // text clears the grain under it, spaces and all
  const text = (x: number, y: number, s: string, i: number) => [...s].forEach((c, k) => put(x + k, y, c, i));
  const centre = (s: string) => ((L + R + 1) >> 1) - ([...s].length >> 1);

  // The paper, which never changes: a worn border, a sparse grain, foxing toward the edges.
  const paper = () => {
    for (let y = T; y <= B; y++)
      for (let x = L; x <= R; x++) {
        const edge = y === T || y === B || x === L || x === R;
        const h = hash(x, y);
        if (edge) {
          const c = y === T || y === B ? "─" : "│";
          put(x, y, h < 0.1 ? " " : h < 0.18 ? (y === T || y === B ? "-" : ":") : c, 1);
          continue;
        }
        const near = Math.min(x - L, R - x, (y - T) * 2, (B - y) * 2);
        const wear = near < 3 ? 0.16 : near < 6 ? 0.07 : 0.025;
        if (h < wear) put(x, y, h < wear / 6 ? "░" : h < wear / 2 ? ":" : ".", 2);
      }
    put(L, T, "╭", 1);
    put(R, T, "╮", 1);
    put(L, B, "╰", 1);
  };
  paper();
  WANTED.forEach((line, j) => {
    const x0 = centre(line);
    [...line].forEach((c, k) => c !== " " && put(x0 + k, 3 + j, c, c === "█" ? 3 : 4));
  });
  for (const [y, s, i] of LINES) text(centre(s), y, s, i);
  const fx = centre(FACE[0]);
  FACE.forEach((line, j) =>
    [...line].forEach((c, k) => c !== " " && put(fx + k, 11 + j, c, FACE_INK[j][k] === "h" ? 3 : FACE_INK[j][k] === "e" ? 3 : 0)),
  );
  const baseGrid = grid.map((r) => r.slice());
  const baseInk = ink.map((r) => r.slice());

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) (grid[y][x] = baseGrid[y][x]), (ink[y][x] = baseInk[y][x]);

    // the red ink burns: a slow glow across WANTED every loop, and the eyes smoulder
    const sweep = (u / 4) * 80 - 10;
    for (let y = 3; y < 9; y++)
      for (let x = 0; x < cols; x++) if (ink[y][x] === 3 && Math.abs(x - sweep - (y - 3)) < 3) ink[y][x] = 5;
    const ember = 0.5 + 0.5 * Math.sin(u * Math.PI * 1.5);
    for (let y = 11; y < 26; y++) for (let x = 0; x < cols; x++) if (baseGrid[y][x] === "*") (grid[y][x] = ember > 0.6 ? "*" : "+"), (ink[y][x] = ember > 0.6 ? 5 : 3);

    // the torn corner: the wind lifts it and lets it fall
    const w = (2 * Math.PI * u) / LOOP;
    const lift = Math.max(0, Math.min(3, Math.round(1.4 + 1.4 * Math.sin(3 * w) + 0.6 * Math.sin(7 * w + 1))));
    // cut the corner away along a diagonal: below the line from (R - 6, B) to (R, B - 3)
    for (let y = B - 3; y <= B; y++)
      for (let x = R - 6; x <= R; x++) {
        const k = (x - (R - 6)) / 6 + (y - (B - 3)) / 3;
        if (k > 1.05) put(x, y, " ", 2);
        else if (k > 0.88) put(x, y, "╱", 1);
      }
    // the flap, folded up over the poster, its back showing as a coarser weave
    for (let r = 1; r <= lift; r++) {
      const y = B - 2 - lift + r;
      for (let x = R - 3 - 2 * r; x <= R - 2; x++) put(x, y, x === R - 3 - 2 * r ? "/" : r === 1 ? "_" : "%", x === R - 3 - 2 * r ? 1 : 2);
    }

    // the nail, and the light catching it now and then
    put(39, T, "(", 7);
    put(40, T, "@", 7);
    put(41, T, ")", 7);
    const glint = u % 4;
    if (glint > 3.3) put(40, T, glint > 3.6 ? "*" : "+", 8);

    if (color) for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) color[y * cols + x] = ink[y][x];
    return grid.map((r) => r.join("")).join("\n");
  };
}
