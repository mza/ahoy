/*
 * black-bart: Bartholomew Roberts' flag. The pirate himself, cutlass held
 * high, stands on two skulls marked ABH and AMH, "a Barbadian's head" and "a
 * Martinican's head", for the two governors who sent ships after him. The
 * blade glints and the skulls' eyes smoulder.
 *
 * Drawn after the flag credited to Roberts, about 1720 (public domain): each
 * cell holds the character whose shape best matches the drawing's edge
 * through it, 8 where the bone is solid and # the steel.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "black bart",
  category: "scenes",
  note: "black bart's flag: the pirate on two skulls, cutlass held high",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone; blood, dim and hot; steel and its glint
  palette: ["#ece4d0", "#d81f2a", "#6e1a12", "#ff6a50", "#a6b8cc", "#ffffff"],
} satisfies Meta;

const ART = [
  "                                                            ,p##qqP             ",
  "                                     d####b               ,p###P\"               ",
  "                                  ,_p######q__           p###P\"                 ",
  "                               .pp####YYPP####qq_       p##P'                   ",
  "                                      _pq_         ,pppp##bqq_                  ",
  "                                    ,#P##P#q        \"\"\"\"\"\"\"\"\"'                  ",
  "                                    d#pd#qdb         ,####b                     ",
  "                                    \"Y####P'       ,p###P'                      ",
  "                                __  ___\"\"___  _ppp####P'                        ",
  "                              ,d##b d####### d####PPP'                          ",
  "                             ,###P',########_ \"\"\"                               ",
  "                            ,###P ,############q                                ",
  "                            ###P ,#############b                                ",
  "                            ###b ######\"\"#######_                               ",
  "                            ###b #####b  d######b                               ",
  "                            Y##' #####'   #######_                              ",
  "                              ._pPPPP'    \"PPPPPPb                              ",
  "                             ,ppqqqq        ,ppqqq_                             ",
  "                         __,p####P'          \"Y####q___                         ",
  "                      ,pp######P'              \"Y#######q_                      ",
  "                     \"YYYYPPPP'                  \"YYYYPPPP'                     ",
  "                  ,ppppppqqqqqq_                ,ppppppqqqqqq_                  ",
  "                 p##YYYY##PPPP##b              p##YYYY##PPPP##b                 ",
  "                 \"#b Yb d# dP d#'              \"#b Yb d# dP d#'                 ",
  "                  \"YYpp#Pd#qqqP'                \"YYpp#Pd#qqqP'                  ",
  "                    d#Y#YP#P#b                    d#Y#YP#P#b                    ",
  "                    \"P '\"'\" Y'                    \"P '\"'\" Y'                    ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
];
// what each cell is: 1 bone, 2 the letters, 3 the blade, 4 a skull's eye
const REGION = [
  "00000000000000000000000000000000000000000000000000000000000033333330000000000000",
  "00000000000000000000000000000000000001111111000000000000003333333000000000000000",
  "00000000000000000000000000000000001111111111110000000000033333300000000000000000",
  "00000000000000000000000000000001111111111111111110000000333330000000000000000000",
  "00000000000000000000000000000000000000111100000000033333333333000000000000000000",
  "00000000000000000000000000000000000011111111000000033333333333000000000000000000",
  "00000000000000000000000000000000000011111111000000000111111000000000000000000000",
  "00000000000000000000000000000000000011111111000000011111110000000000000000000000",
  "00000000000000000000000000000000110011111111001111111111000000000000000000000000",
  "00000000000000000000000000000011111011111111011111111100000000000000000000000000",
  "00000000000000000000000000000111111111111111101110000000000000000000000000000000",
  "00000000000000000000000000001111101111111111111100000000000000000000000000000000",
  "00000000000000000000000000011111011111111111111100000000000000000000000000000000",
  "00000000000000000000000000001111111111111111111110000000000000000000000000000000",
  "00000000000000000000000000001111011111100111111110000000000000000000000000000000",
  "00000000000000000000000000001111011111100011111111000000000000000000000000000000",
  "00000000000000000000000000000011111111000011111111000000000000000000000000000000",
  "00000000000000000000000000000111111100000000111111100000000000000000000000000000",
  "00000000000000000000000001111111111000000000011111111110000000000000000000000000",
  "00000000000000000000001111111111100000000000000111111111110000000000000000000000",
  "00000000000000000000011111111110000000000000000001111111111000000000000000000000",
  "00000000000000000011111111111111000000000000000011111111111111000000000000000000",
  "00000000000000000111111111111111100000000000000111111111111111100000000000000000",
  "00000000000000000111044011044011100000000000000111044011044011100000000000000000",
  "00000000000000000011111111111111000000000000000011111111111111000000000000000000",
  "00000000000000000000111111111100000000000000000000111111111100000000000000000000",
  "00000000000000000000111111111100000000000000000000111111111100000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
];

const BONE = 0, BLOOD = 1, EMBER = 2, HOT = 3, STEEL = 4, GLINT = 5;
const LOOP = 6;
// where the hilt is, for the glint to run from
const HILT: [number, number] = [57, 5];
// ABH and AMH in a small terminal font, centred under each skull
const LETTERS = [
  ["   _   ___ _  _ ", "  /_\\ | _ ) || |", " / _ \\| _ \\ __ |", "/_/ \\_\\___/_||_|"],
  ["   _   __  __ _  _ ", "  /_\\ |  \\/  | || |", " / _ \\| |\\/| | __ |", "/_/ \\_\\_|  |_|_||_|"],
];
const LETTER_AT = [25, 55];

export default function blackBart(): Frame {
  const { cols, rows } = meta;
  // the blade's cells by distance from the hilt, for the glint
  let far = 0;
  const reach: number[] = new Array(cols * rows).fill(-1);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      if (REGION[y][x] === "3") far = Math.max(far, (reach[y * cols + x] = Math.hypot(x - HILT[0], 2 * (y - HILT[1]))));

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    // the glint runs up the blade in the first half second of every three
    const g = u % 3, at = g < 0.6 ? (g / 0.6) * (far + 4) - 2 : -99;
    const out: string[] = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        const k = y * cols + x, r = REGION[y][x];
        let c = ART[y][x], ink = BONE;
        if (r === "4") {
          // the skulls' eyes smoulder, each in its own time
          const glow = 0.5 + 0.5 * Math.sin((2 * Math.PI * u) / 3 + (x < cols / 2 ? 0 : 2));
          c = glow > 0.6 ? "@" : glow > 0.25 ? "o" : ".";
          ink = glow > 0.6 ? HOT : glow > 0.25 ? BLOOD : EMBER;
        } else if (r === "3") {
          const d = Math.abs(reach[k] - at);
          ink = d < 1.5 ? GLINT : STEEL;
        } else if (r === "2") {
          ink = BLOOD;
          if (c === "#") c = "8";
        } else if (c === "#") c = "8";
        if (color) color[k] = ink;
        line += c;
      }
      out.push(line);
    }
    // the skulls' letters, in blood, beneath them
    LETTERS.forEach((block, i) =>
      block.forEach((l, j) => {
        const y = rows - block.length + j, x0 = LETTER_AT[i] - (l.length >> 1);
        out[y] = out[y].slice(0, x0) + l + out[y].slice(x0 + l.length);
        if (color) for (let x = x0; x < x0 + l.length; x++) color[y * cols + x] = l[x - x0] === " " ? BONE : BLOOD;
      }),
    );
    return out.join("\n");
  };
}
