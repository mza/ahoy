/*
 * anchor: a sailor's anchor in the old tattoo-flash style, solid ink with a
 * twisted rope tied through its ring and coiled round its shank. The rope's
 * loose end drapes over an arm and swings, stars twinkle either side, and
 * now and then a glint runs down the iron.
 *
 * The iron is half blocks, two pixels to a cell so a pixel is about square.
 * The rope is two strands' width of slanted lay throughout: two columns
 * where it runs down, a row where it runs across, and the shank shows
 * between the turns where the rope goes round behind it.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "anchor",
  category: "objects",
  note: "a tattoo-flash anchor coiled with rope, stars twinkling beside it",
  cols: 60,
  rows: 30,
  fps: 15,
} satisfies Meta;

const ART = `
                            ▄▄▄▄
                         ▄████████▄
                        ▄██▀   //██▄
                        ███      //█
                        ▀██▄    ▄█//
                         ▀████████▀//
              ▄▄           ▀████▀  //       ▄▄
             ██████████████████████//██████████
             ████▀▀▀▀▀▀▀▀▀▀██████▀▀//▀▀▀▀▀▀████
                           ██████  //
                         ////////////
                        ////////////
        ██             //  ██████  //             ██
       ▄███                ██████ //             ███▄
       █████             ////////////           █████
      ███████           ////////////           ███████
     ▄████████         //  ██████  //         ████████▄
     ███▀▀▀████            ██████ //         ████▀▀▀███
    ▀▀    █████▀         ////////////       ▀█████    ▀▀
           ████▄        ////////////        ▄████
            ████▄      //  ██████  //      ▄████
             █████▄        ██████ //////////////
              ▀█████▄      ██████      ▄█████▀ ///
                ▀██████▄▄▄ ██████ ▄▄▄██████▀
                  ▀▀████████████████████▀▀
                      ▀▀▀██████████▀▀▀
                           ██████
                            ▀██▀
                             ▀▀

`;

const LOOP = 6;
const TAIL: [number, number] = [48, 23]; // where the rope hangs free from the arm: column, first row
const DROP = 5; // rows of rope below that, before its frayed end
const SHINE: [number, number] = [0.8, 1.6]; // when the glint starts, and how long it takes to cross
const LEAN = 1.6; // columns the glint shifts a row down
// Stars: column, row, and a phase so they twinkle out of step.
const STARS: [number, number, number][] = [[9, 3, 0], [50, 2, 0.4], [4, 24, 0.7], [56, 12, 0.2], [16, 27, 0.55]];
const TWINKLE = ".+*+.";

export default function anchor(): Frame {
  const { cols, rows } = meta;
  const base = ART.slice(1, -1).split("\n").map((line) => [...line.padEnd(cols)]);
  let lo = Infinity, hi = -Infinity;
  base.forEach((line, r) => line.forEach((ch, c) => ch === "█" && ((lo = Math.min(lo, c + LEAN * r)), (hi = Math.max(hi, c + LEAN * r)))));

  return (t) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const grid = base.map((line) => line.slice());
    const g = (u - SHINE[0]) / SHINE[1];
    if (g > 0 && g < 1) {
      const at = lo - 3 + g * (hi - lo + 6);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (grid[r][c] === "█" && Math.abs(c + LEAN * r - at) < 1.8) grid[r][c] = "/";
    }
    // The loose end swings like a pendulum from where it leaves the arm.
    const swing = 1.7 * Math.sin((u / LOOP) * 4 * Math.PI);
    for (let k = 0; k <= DROP; k++) {
      const c = TAIL[0] + Math.round(swing * (k / DROP) ** 2);
      grid[TAIL[1] + k][c] = grid[TAIL[1] + k][c + 1] = k === DROP ? "'" : "/";
    }
    for (const [c, r, phase] of STARS) {
      const k = Math.floor(((u / LOOP + phase) % 1) * 10);
      grid[r][c] = k < TWINKLE.length ? TWINKLE[k] : ".";
      if (k === 2) (grid[r][c - 1] = grid[r][c + 1] = "-"), (grid[r - 1][c] = grid[r + 1][c] = "|");
    }
    return grid.map((line) => line.join("")).join("\n");
  };
}
