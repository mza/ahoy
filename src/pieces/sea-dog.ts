/*
 * sea-dog: a pirate dog, face on, in a spotted red bandana with a patch over
 * one eye. It pants, its tongue lolling in and out, blinks its good eye, and
 * twitches an ear, one then the other.
 *
 * Pixel art from the dog drawn for the website, 26 pixels by 22, each of them
 * a whole cell high and two cells wide, so every pixel keeps its own colour.
 * Its black, the patch and its strap, the eye, nose and mouth, is the ground
 * showing through, which is what is left of the drawing in one ink.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "sea dog",
  category: "scenes",
  note: "a pirate dog in a red bandana and an eyepatch, panting and blinking",
  cols: 56,
  rows: 24,
  fps: 20,
  ground: "#000000",
  // bone, bandana red, its coat, the coat in shade, its ears, its tongue
  palette: ["#f3ecda", "#d92b35", "#c98f4e", "#a36f38", "#7a4a26", "#f08a9b"],
} satisfies Meta;

// A palette index for each letter; "." and "k" (black) leave the ground.
const INK: Record<string, number> = { w: 0, r: 1, t: 2, m: 3, d: 4, p: 5, P: 5 };
const DOG = [
  ".........rrrrrrrr.........",
  ".......rrrrwrrrrrrr.......",
  "......rrrrrrrrrrwrrr......",
  ".....rrwrrrrrrrrrrrrr.....",
  ".....rrrrrrrwrrrrrrwr.....",
  "....kkkkkkkkkkkkkkkkkk....",
  "...ddtttttttttttkktttdd...",
  "..dddttttttttttkkkkttddd..",
  ".ddddttwkttttttkkkkttdddd.",
  ".ddddttkkttttttkkkkttdddd.",
  ".ddddtttttttttttkktttdddd.",
  ".ddddtttttwwwwwwtttttdddd.",
  ".dddmttttwwwwwwwwttttmddd.",
  "..ddmtttwwwkkkkwwwtttmdd..",
  "..dd.tttwwwwkkwwwwttt.dd..",
  ".....tttwwwwwwwwwwttt.....",
  "......ttwwkwwwwkwwtt......",
  "......tttwwkkkkwwttt......",
  ".......tttwwppwwttt.......",
  "........ttttpptttt........",
  "..........ttpptt..........",
  "............pp............",
];
const AW = DOG[0].length, AH = DOG.length;
const X0 = (meta.cols - 2 * AW) >> 1, Y0 = (meta.rows - AH) >> 1;

const LOOP = 7;
// How far the tongue hangs through a pant: all the way, half a pixel less, a pixel less, and back.
const PANT = [0, 1, 2, 1];
const BLINK = [3, 3.2], LEFT_EAR = [1.5, 1.85], RIGHT_EAR = [4, 4.35];
const within = (u: number, [a, b]: number[]) => u >= a && u < b;

export default function seaDog(): Frame {
  const base = DOG.map((row) => [...row]);
  // an ear's outer pixels, to lift a pixel when it twitches
  const ear = (side: number) => {
    const cells: [number, number][] = [];
    for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) if (base[y][x] === "d" && (side < 0 ? x < 4 : x > AW - 5)) cells.push([x, y]);
    return cells;
  };
  const ears = [ear(-1), ear(1)];

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const g = base.map((row) => row.slice());

    // panting: the tip of the tongue draws up and hangs down again
    const pant = PANT[Math.floor(u / 0.15) % PANT.length];
    if (pant === 1) g[21][12] = g[21][13] = "P";
    if (pant === 2) g[21][12] = g[21][13] = ".";
    // a blink: the eye shut to a line
    if (within(u, BLINK)) (g[8][7] = g[8][8] = "t"), (g[9][7] = g[9][8] = "k");
    // an ear twitching up a pixel
    [LEFT_EAR, RIGHT_EAR].forEach((when, i) => {
      if (!within(u, when)) return;
      for (const [x, y] of ears[i]) g[y][x] = ".";
      for (const [x, y] of ears[i]) g[y - 1][x] = "d";
    });

    const out: string[] = [];
    if (color) color.fill(0);
    for (let y = 0; y < meta.rows; y++) {
      let row = "";
      for (let x = 0; x < meta.cols; x++) {
        const c = g[y - Y0]?.[(x - X0) >> 1] ?? ".";
        const k = x < X0 ? undefined : INK[c];
        row += k === undefined ? " " : c === "P" ? "▀" : "█";
        if (color && k !== undefined) color[y * meta.cols + x] = k;
      }
      out.push(row);
    }
    return out.join("\n");
  };
}
