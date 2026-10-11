/*
 * crows-nest: the lookout's top high on the mast, against the night: a banded
 * barrel on its yard, the furled sail under it and the rigging running down,
 * and the lookout ducked down inside it with only his tricorn showing and a
 * spyglass held out from under its brim. Now and then the glass catches the
 * light, and LAND HO! types itself out like a line on a terminal and flashes.
 * The mast sways against the stars, and its pennant streams in the wind.
 *
 * Drawn from a painting of it at 80 by 32: each cell holds the character whose
 * shape best matches the edge through it, 8 where the bone is solid, # the
 * barrel's staves and % its gold hoops and the glass.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "crow's nest",
  category: "scenes",
  note: "a lookout in the crow's nest, spyglass out, calling land ho",
  cols: 80,
  rows: 32,
  fps: 20,
  // bone; rigging; staves; gold, lit; glint; pennant; stars dim and bright; the banner's frame and its text
  palette: ["#ece4d0", "#77736a", "#8c6a3a", "#d4a63c", "#f6d27a", "#ffffff", "#c8321e", "#4a4c58", "#b8b6b0", "#6e6a60", "#f0e6c8"],
  ground: "#000000",
} satisfies Meta;

// The top, and what each cell is made of: 1 bone, 2 the barrel, 3 gold, 4 the rigging.
const ART = [
  "                                      ,pq_                                      ",
  "                                      d88'                                      ",
  "                                      ,88'                                      ",
  "                                    ,/,88'\\_                                    ",
  "                                   ,\" ,88' \"_                                   ",
  "                                  /'  ,88'  \"\\                                  ",
  "                              _____   ,88'    '_                                ",
  "                          ,pp8888888qq/Y8'     \"q                               ",
  "                         ,8888888888888qY'       \\_                             ",
  "                  _      PPPPPPPPPPPPPPP,'    _   \"q                            ",
  "                  \"=q_     /           PP' _p='    \"\\_                          ",
  "                    \"Y888%%%%%%%%%%%%%%%888P'        \"q                         ",
  "                      \"\"P\"\"PPPPPPPPPPP'\"\"\"\"       _   \"\\              ,__       ",
  "                      ,\"           d%%%%%%%%%%%%%888%%%%%%%qpppppppppp%%b       ",
  "                     p'            /PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPY%b       ",
  "                   ,/   d%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%b   '_                   ",
  "                  p'    ################################    \"q                  ",
  "                ,/'    d%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%b     \\_                ",
  "               p'      d################################b      \"q               ",
  "             ,/'       d%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%b       \"\\_             ",
  "            ,\"          d##############################b          \"_            ",
  "           /'           \"PPPPPPPPPPPPPPPPPPPPPPPPPPPPPP'           \"\\           ",
  "       pppppppppppppppppppppppppppppppppppppppppppppppqppppqppppqqqqqqqqq       ",
  "       PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPYPPPYPPPPP       ",
  "          ''\"PP88 888888bd888888 88888888888888 888888bd888888 88PP' '          ",
  "                \" \" ,\"PP'\"PPPP88 88PP888888PP88 88PPPP'/PP\"\" \" \"                ",
  "                  p=' ,/'            ,ppqq_             \\_ \"=q                  ",
  "                p/' ,/'              ,8888'              \"\\_ \"\\q                ",
  "             ,p-'  p'.__.            ,8888'            .__.\"q_ \"'q_             ",
  "           ,/'   pP  '\"\"'            ,8888'            '\"\"'  'q   \"\\_           ",
  "         ,='   ,/'                   ,8888'                   \"\\_   \"\\q         ",
  "      ,p-'   ,/'           --        ,8888'        --           \"\\_   \"-q_      ",
];
const MAT = [
  "00000000000000000000000000000000000000333300000000000000000000000000000000000000",
  "00000000000000000000000000000000000000311300000000000000000000000000000000000000",
  "00000000000000000000000000000000000000111100000000000000000000000000000000000000",
  "00000000000000000000000000000000000044111144000000000000000000000000000000000000",
  "00000000000000000000000000000000000440111104400000000000000000000000000000000000",
  "00000000000000000000000000000000004400111100444000000000000000000000000000000000",
  "00000000000000000000000000000011141000111100004400000000000000000000000000000000",
  "00000000000000000000000000111111111111111100000440000000000000000000000000000000",
  "00000000000000000000000001111111111111111100000004400000000000000000000000000000",
  "00000000000000000010000001111111111111111100001000440000000000000000000000000000",
  "00000000000000000011110000044000000000111101111000044400000000000000000000000000",
  "00000000000000000000111113333333333333331111100000000440000000000000000000000000",
  "00000000000000000000001111111111111111111110000000100044000000000000003330000000",
  "00000000000000000000004400000000000333333333333331113333333333333333333330000000",
  "00000000000000000000044000000000000333333333333331113333333333333333333330000000",
  "00000000000000000004400033333333333333333333333333333333000440000000000000000000",
  "00000000000000000044000222222222222222222222222222222222200044000000000000000000",
  "00000000000000004440000333333333333333333333333333333333300000440000000000000000",
  "00000000000000044000000222222222222222222222222222222222200000044000000000000000",
  "00000000000004440000000333333333333333333333333333333333300000004440000000000000",
  "00000000000044000000000022222222222222222222222222222222000000000044000000000000",
  "00000000000440000000000033333333333333333333333333333333000000000004400000000000",
  "00000001111111111111111111111111111111111111111111111111111111111111111110000000",
  "00000001111111111111111111111111111111111111111111111111111111111111111110000000",
  "00000000004411111111111111111111111111111111111111111111111111111111440000000000",
  "00000000000000001010111111111111111111111111111111111111111101010000000000000000",
  "00000000000000004444404440000000000001111110000000000000440444440000000000000000",
  "00000000000000004440444000000000000001111110000000000000044404440000000000000000",
  "00000000000004444004444440000000000001111110000000000004444444044440000000000000",
  "00000000000444000440044440000000000001111110000000000004444004400044400000000000",
  "00000000044400044400000000000000000001111110000000000000000000444000444000000000",
  "00000044440004440000000000044000000001111110000000044000000000004440004444000000",
];

const LOOP = 8;
const GLASS = [12, 14, 35, 72]; // the spyglass: rows and columns, the lens at the right
const GLINT = 6.4; // when the glint sets off down the glass
const RUN = 0.5; // seconds it takes to reach the lens
const TYPE = 7.0; // when the banner starts typing
const ERASE = 3.2; // when it goes, in the next loop
const BOX = [3, 54, 24]; // the banner: top row, left column, width
const CALL = "> LAND HO!";
const PENNANT = [1, 42, 14]; // row, first column, length
// The stars, as column, row and phase, kept where the picture is empty.
const STARS: [number, number, number][] = [
  [4, 2, 0.1], [12, 6, 2.3], [20, 1, 4.1], [27, 9, 1.2], [8, 13, 3.3], [33, 4, 5.2], [3, 21, 0.7], [17, 17, 2.8],
  [49, 2, 3.9], [52, 10, 1.7], [62, 9, 4.6], [70, 17, 0.4], [76, 11, 2.1], [58, 19, 5.6], [74, 1, 3.1], [44, 8, 6.3],
  [66, 21, 1.1], [11, 24, 4.4], [72, 24, 2.6], [30, 26, 0.9],
];

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export default function crowsNest(): Frame {
  const { cols, rows } = meta;
  const [g0, g1, gx0, gx1] = GLASS;
  const [by, bx, bw] = BOX;
  const frame = ["╭" + "─".repeat(bw - 2) + "╮", "│" + " ".repeat(bw - 2) + "│", "╰" + "─".repeat(bw - 2) + "╯"];

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const grid = ART.map((line) => [...line]);
    const ink: number[][] = MAT.map((line) => [...line].map((m) => (m === "1" ? 0 : m === "2" ? 2 : m === "3" ? 3 : m === "4" ? 1 : 0)));
    const put = (x: number, y: number, ch: string, c: number) => {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return;
      grid[y][x] = ch;
      ink[y][x] = c;
    };

    // The mast sways, so the stars drift a cell against it and back.
    const sway = Math.round(Math.sin((u / LOOP) * 2 * Math.PI) * 1.4);
    STARS.forEach(([x, y, p]) => {
      const sx = x + sway;
      if (ART[y][sx] !== " " || ART[y][sx - 1] !== " " || ART[y][sx + 1] !== " ") return;
      const k = 0.5 + 0.5 * Math.sin(u * ((2 * Math.PI) / LOOP) * 3 + p);
      put(sx, y, k > 0.85 ? "+" : k > 0.4 ? "·" : ".", k > 0.85 ? 8 : 7);
    });

    // The pennant streams out from the truck in one row, a wave running down it and its tail fluttering.
    const [py, px, pl] = PENNANT;
    for (let k = 0; k < pl; k++) {
      const f = k / pl, w = Math.sin(k * 0.8 - u * ((2 * Math.PI) / LOOP) * 6) * f;
      put(px + k, py, f < 0.35 ? "=" : w > 0.35 ? "~" : w < -0.35 ? "_" : "-", 6);
    }

    // A glint runs down the glass to the lens, which flashes.
    const g = (u - GLINT) / RUN;
    if (g > -0.2 && g < 1.4) {
      const at = gx0 + (gx1 - gx0) * g;
      for (let y = g0; y <= g1; y++)
        for (let x = gx0; x <= gx1; x++) {
          if (MAT[y][x] !== "3") continue;
          const d = Math.abs(x - at);
          if (d < 1.5) ink[y][x] = 5;
          else if (d < 4) ink[y][x] = 4;
        }
    }
    const flash = u - (GLINT + RUN);
    if (flash > 0 && flash < 0.5) {
      const big = flash < 0.25;
      put(gx1 + 2, g0 + 1, big ? "*" : "+", 5);
      if (big) put(gx1 + 2, g0, "|", 4), put(gx1 + 2, g0 + 2, "|", 4), put(gx1 + 3, g0 + 1, "-", 4);
    }

    // LAND HO!, typed out a letter at a time after the flash, flashing until it is taken down.
    const since = u >= TYPE ? u - TYPE : u < ERASE ? u + LOOP - TYPE : -1;
    if (since >= 0) {
      frame.forEach((line, j) => [...line].forEach((ch, i) => put(bx + i, by + j, ch, 9)));
      const typed = Math.min(CALL.length, Math.floor(since / 0.07));
      const lit = typed < CALL.length || Math.floor(since / 0.35) % 2 === 0;
      [...CALL.slice(0, typed)].forEach((ch, i) => put(bx + 2 + i, by + 1, ch, lit ? 10 : 3));
      if (typed < CALL.length || Math.floor(since / 0.5) % 2 === 0) put(bx + 2 + typed, by + 1, "█", 10);
    }

    if (color) for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) color[y * cols + x] = ink[y][x];
    return grid.map((line) => line.join("")).join("\n");
  };
}
