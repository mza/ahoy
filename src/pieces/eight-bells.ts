/*
 * eight-bells: a ship's brass bell hanging from its bracket, striking eight
 * bells, the end of a watch, two by two: it swings, the clapper strikes each
 * side in turn, rings of sound spread out from it, and a pip lights for every
 * bell. Then a rest, and all's well.
 *
 * The bell is turned like a cylinder, its brass shaded by a ramp of characters
 * lit from the upper left, so the highlight slides as it swings. It is cast
 * with the inscription of the Queen Anne's Revenge's bell, raised from
 * Blackbeard's wreck: ANO DE 1709.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "eight bells",
  category: "scenes",
  note: "a ship's brass bell striking eight bells, two by two: all's well",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // brass from its shadow to its glint, then bone and its dim shade, and iron
  palette: ["#3e2a0c", "#7c5414", "#c48e2c", "#f2c45a", "#fff1c8", "#e8dcc0", "#7d7464", "#5c5c64"],
} satisfies Meta;

const LOOP = 8;
// Seconds a pair of strokes swings for, out of each two-second quarter of the loop.
const SWING = 1;
const CX = 40, PIVOT = 3;
// The bell's half width on each row from its crown down to its lip.
const TOP = 4;
const HALF = [4, 7, 8, 8, 8, 8, 8, 9, 9, 9, 10, 10, 11, 13, 16, 19];
const LIP = TOP + HALF.length;
const RINGS = new Set([9, 17]);
const BAND = 14, MARK = "ANO DE 1709";
const RAMP = ".:-=+*#%@";
// How far sound travels in a second, in columns, and how long a ring is heard.
const SPEED = 24, HEARD = 1.2;

const BEAM = "o═══════════════════════════════o";
const BRACKET = ["╲___╭─────╮___╱", "    │     │    "];
const WORDS = "EIGHT BELLS · ALL'S WELL";

// The swing at loop time u, in radians: two strokes a quarter, the second the other way, then a rest.
const swingAt = (u: number) => {
  const s = u % 2;
  if (s >= SWING) return 0;
  return 0.1 * Math.sin((Math.PI * s) / SWING) * Math.sin((2 * Math.PI * s) / SWING);
};
// The strokes, at each extreme of the swing.
const STROKES: number[] = [];
for (let q = 0; q < 4; q++) STROKES.push(2 * q + 0.25, 2 * q + 0.75);

export default function eightBells(): Frame {
  const { cols, rows } = meta;
  const blank = () => Array.from({ length: rows }, () => new Array<string>(cols).fill(" "));
  const grid = blank();
  const ink = Array.from({ length: rows }, () => new Array<number>(cols).fill(5));
  const put = (x: number, y: number, c: string, i: number) => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return;
    grid[y][x] = c;
    ink[y][x] = i;
  };
  const text = (x: number, y: number, s: string, i: number) => [...s].forEach((c, k) => c !== " " && put(x + k, y, c, i));
  const shade = (b: number) => (b < 0.28 ? 0 : b < 0.5 ? 1 : b < 0.74 ? 2 : b < 0.92 ? 3 : 4);

  return (t, { color } = {}) => {
    // A moment into the loop, so the still is of a stroke ringing out.
    const u = (((t + 0.4) % LOOP) + LOOP) % LOOP;
    const angle = swingAt(u);
    for (const row of grid) row.fill(" ");
    for (const row of ink) row.fill(5);
    // Columns a row is pushed across by the swing: two columns a row for each radian, cells being twice as tall.
    const lean = (y: number, k = 1) => Math.round(2 * angle * k * (y - PIVOT));

    // the sound, under everything
    for (const at of STROKES) {
      let age = u - at;
      if (age < 0) age += LOOP;
      if (age > HEARD) continue;
      for (let ring = 0; ring < 2; ring++) {
        const r = 21 + age * SPEED - ring * 3;
        if (r < 20) continue;
        const fade = 1 - age / HEARD;
        const i = ring === 0 && fade > 0.55 ? 3 : fade > 0.3 ? 2 : 1;
        for (let a = -0.42; a <= 0.42; a += 0.03) {
          const dy = Math.round((r / 2.6) * Math.sin(a)), dx = Math.round(r * Math.cos(a));
          const y = 13 + dy;
          if (y < 5 || y > 21) continue;
          put(CX + dx, y, ")", i);
          put(CX - dx, y, "(", i);
        }
      }
    }

    // the beam and its bracket
    text(CX - (BEAM.length >> 1), 1, BEAM, 6);
    put(CX - (BEAM.length >> 1), 1, "o", 7);
    put(CX + (BEAM.length >> 1), 1, "o", 7);
    BRACKET.forEach((l, j) => text(CX - (l.length >> 1), 2 + j, l, 7));
    put(CX, PIVOT, "@", u % 2 < SWING ? 3 : 2);

    // the bell, shaded like a turned cylinder; the highlight moves with the swing
    const spot = -0.38 - angle * 3;
    for (let j = 0; j < HALF.length; j++) {
      const y = TOP + j, hw = HALF[j], off = lean(y);
      const prev = j ? HALF[j - 1] : 0;
      for (let dx = -hw; dx <= hw; dx++) {
        const n = dx / (hw + 0.5);
        const diffuse = Math.max(0, Math.cos(Math.asin(n) + 0.55));
        const glint = Math.exp(-(((n - spot) / 0.13) ** 2));
        const b = Math.max(0, Math.min(1, 0.12 + 0.62 * diffuse + 0.55 * glint - 0.15 * (j / HALF.length)));
        let c = RAMP[Math.min(RAMP.length - 1, Math.floor(b * RAMP.length))];
        let i = shade(b);
        if (RINGS.has(y)) (c = "="), (i = Math.max(0, i - 1));
        if (y === BAND) (c = " "), (i = 0);
        if (dx === -hw) (c = j === 0 ? "." : hw > prev ? "/" : "("), (i = Math.max(1, i));
        if (dx === hw) (c = j === 0 ? "." : hw > prev ? "\\" : ")"), (i = Math.max(1, i));
        if (j === 0 && Math.abs(dx) < hw) c = "_";
        put(CX + dx + off, y, c, i);
      }
      if (y === BAND) text(CX - (MARK.length >> 1) + off, y, MARK, 3);
    }
    const lipOff = lean(LIP);
    for (let dx = -20; dx <= 20; dx++) put(CX + dx + lipOff, LIP, "▀", Math.abs(dx) > 17 ? 1 : 2);

    // the clapper hangs from the pivot and lags the bell, so it meets each side at the end of the swing
    const ball = LIP + 1;
    put(CX + lean(ball, 0.35), ball, "|", 1);
    put(CX + lean(ball + 1, 0.35), ball + 1, "O", 3);
    // and its lanyard swings wider still, a twist of rope down to a tassel
    for (let y = ball + 2; y < ball + 6; y++) put(CX + lean(y, 0.5), y, (y & 1) === 0 ? ")" : "(", 6);
    const tassel = CX + lean(ball + 6, 0.5);
    text(tassel - 1, ball + 6, "/|\\", 5);
    text(tassel - 1, ball + 7, "'''", 6);

    // a pip for each bell struck so far this watch
    const struck = STROKES.filter((s) => s <= u).length;
    const pips: string[] = [];
    for (let k = 0; k < 8; k++) pips.push(k < struck ? "●" : "·");
    const line = `${pips[0]} ${pips[1]}   ${pips[2]} ${pips[3]}   ${pips[4]} ${pips[5]}   ${pips[6]} ${pips[7]}`;
    const px = CX - (line.length >> 1);
    [...line].forEach((c, k) => c !== " " && put(px + k, 30, c, c === "●" ? 3 : 6));
    text(CX - (WORDS.length >> 1), 31, WORDS, struck === 8 ? 5 : 6);

    if (color) for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) color[y * cols + x] = ink[y][x];
    return grid.map((r) => r.join("")).join("\n");
  };
}
