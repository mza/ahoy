/*
 * edward-low: Edward Low's flag, a red skeleton on black, the inverse of the
 * usual bone. It raises its arms with clawed hands spread, its jaw chatters,
 * its eye sockets pulse with an ember glow, and the cloth ripples in the light.
 *
 * Drawn from a painting of the flag at 80 by 32: each cell holds the character
 * whose shape best matches the edge through it, and 8 where the bone is
 * solid. The flag (c. 1722) is in the public domain.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "edward low",
  category: "scenes",
  note: "edward low's red skeleton, arms raised, its jaw chattering",
  cols: 80,
  rows: 32,
  fps: 20,
  // blood red in shadow, lit, in the light, and at the pulse; embers dim to hot
  palette: ["#8c1218", "#c4161f", "#ee2a34", "#ff5a4e", "#6a1e08", "#d9561a", "#ffb05a"],
  ground: "#000000",
} satisfies Meta;

const ART = [
  "          _q  __                                                _q  __          ",
  "          \"8qp8' _                _pp888888qq_                _ \"8qp8'          ",
  "           d888p8P'             p88888888888888q             \"P8q888b           ",
  "          d8888b               p8888888888888888b               d8888b          ",
  "           \"Y888q_            ,88\"\"\"\"\"Y88P'\"\"\"\"Y8b            ,p8888'           ",
  "             \"888_            d8b     d88b     d8b            ,888'             ",
  "              \"888q           888q ___d88b___ p888           ,888'              ",
  "               \"Y88q          d88888P8P'\"Y8P88888P          p88P'               ",
  "                 Y888q         \"\"Y88_8qdbp8_88P''         p888P                 ",
  "                 \"Y8888q         d888888888888b         p8888P'                 ",
  "                    \"Y888q_       PPPPPPPPPPPP'      ,p888P'                    ",
  "                      \"Y888qq__       dPPb       __pp888P'                      ",
  "                        \"Y8888888888pp8888pp8888888888P'                        ",
  "                          \"PP\"\"\"\"\"PPPP8888PPPP'\"\"\"\"PP'                          ",
  "                                  _ppp8888pqq_                                  ",
  "                               ,p888PPY88PPP888q_                               ",
  "                               -PP'  _d88b_  \"PP'                               ",
  "                                ,pp8888888888qq_                                ",
  "                              ,p88P'\"\"d88b\"\"\"P88q_                              ",
  "                               \"\"  _ppd88bqq_  \"\"                               ",
  "                                ,p888P8888P888q_                                ",
  "                                P8P\"  ,\"\"b  \"Y8P                                ",
  "                               pp8888qdppbp8888qq                               ",
  "                              ,88b_ \"888888' _d88b                              ",
  "                               P888888PPPP888888P'                              ",
  "                               p888P\"      \"P888q                               ",
  "                              p888'          \"888q                              ",
  "                             8888'            \"8888                             ",
  "                             888P              P888                             ",
  "                            ,88b                d88q                            ",
  "                         pp8888b                d8888qq                         ",
  "                         \"\"PPP\"                  \"PPP''                         ",
];
// Rows 8 to 11 with the jaw dropped.
const OPEN = [
  "                 Y888q         \"\"P'' \"'\"'\"\" \"\"P''         p888P                 ",
  "                 \"Y8888q         ,88_8qdbp8_88q         p8888P'                 ",
  "                    \"Y888q_      d888888888888b      ,p888P'                    ",
  "                      \"Y888qq__   PPPPYPPPPPPP'  __pp888P'                      ",
];

const LOOP = 4;
const RIPPLE = 1; // ripples a loop, travelling out from the hoist
const EYES = [35, 44]; // the sockets' middle columns, on row 5
const GLOW = [
  [" ", " ", " "],
  [" ", "·", " "],
  ["·", "•", "·"],
  ["•", "●", "•"],
];

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export default function edwardLow(): Frame {
  const { cols, rows } = meta;
  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    // the jaw chatters in a burst: open and shut four times
    const chatter = u >= 1.2 && u < 2.2 && Math.floor((u - 1.2) * 8) % 2 === 0;
    // the sockets pulse twice a loop, a quick beat and a slower one
    const near = (c: number) => Math.min(Math.abs(u - c), LOOP - Math.abs(u - c));
    const beat = Math.max(smooth(1 - near(0.15) / 0.4), smooth(1 - near(2.6) / 0.6));
    const level = Math.min(3, Math.round(beat * 3));
    const pulse = beat > 0.7;
    const out: string[] = [];
    for (let y = 0; y < rows; y++) {
      const row = chatter && y >= 8 && y < 12 ? OPEN[y - 8] : ART[y];
      let line = "";
      for (let x = 0; x < cols; x++) {
        let ch = row[x], c = 0;
        if (ch !== " ") {
          const w = Math.sin(x * 0.19 - y * 0.14 - (u / LOOP) * RIPPLE * 2 * Math.PI);
          c = w > 0.5 ? 2 : w < -0.5 ? 0 : 1;
          // the skull flushes as the sockets flare
          if (pulse && y < 12 && c > 0) c = 3;
        }
        if (y === 5)
          for (const ex of EYES) {
            const i = x - ex + 1;
            if (i < 0 || i > 2 || GLOW[level][i] === " ") continue;
            (ch = GLOW[level][i]), (c = 4 + Math.min(2, level - 1 + (i === 1 ? 1 : 0)));
          }
        if (color) color[y * cols + x] = c;
        line += ch;
      }
      out.push(line);
    }
    return out.join("\n");
  };
}
