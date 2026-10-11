/*
 * pirate-heart: a big heart turned pirate, a tricorn cocked on one lobe, a
 * patch strapped over one eye, the other eye bright and a gap-toothed grin,
 * with a glint crossing it every few seconds.
 *
 * Each cell holds the character whose shape best matches the drawing's edge
 * through it, and 8 where it is solid; the strap, the ring round the patch,
 * the eye and the grin are cut out of the heart, and a skull out of the hat.
 */
import type { Frame, Meta } from "../types.ts";

export interface PirateHeartOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps it still. */
  shine: number;
}

export const meta = {
  name: "pirate heart",
  category: "objects",
  note: "a big heart in a tricorn and an eyepatch, grinning and glinting",
  cols: 80,
  rows: 31,
  fps: 30,
  options: { shine: 5 },
} satisfies Meta<PirateHeartOptions>;

const ART = String.raw`

                                      \_     ,pppppqbqq__
                                      "Ypp__p88888b   "Y88q_
                                        Y888888888b   ,d8888b
                                         "YY888888bp_p888888b_____q
                                            ""YY8888888888888888P'
                                                 """YYYYPPPPP""
                    _pppppqqqqq_           __ppppq______
                ,pp88888888888888q_     ,pp88888888888888q_
              ,p88888888888888888888q ,p8888888888888888888qq
             p88888888888888888888888888888888888888888888888q_
            p8888888888888888888888888888888888888888888888888b_
           d888888888888888888888888888888888888888888888888888b
              """"YYYYY88888888888888888888888888888888888888888b
           pppq___       """"YYYYY88888888P'" ___ ""Y88888888888b
           d88888888qqqqq          """""Y',pp88888qq_"8888888888b
           d88888888888'         qpp___  ,88888888888bd88888888P
            d888888888b   ,p"dq  d888888b"88888888888'   """"PP'
             Y88888888b   d888P  d8888888q""Y88888P''pqqqq___
              "Y8888888q    ""  p8888888888q___  __p88888888'
                "Y8888888pp__pp888888888888888888888888888'
                  "Y888888888888888888888888888888888888'
                    "Y88888888888888888888888888888888'
                      "Y88888b        "88b   ,888888'
                        "Y8888q_           ,p88888'
                          "Y88888pqppqqqqq888888P
                            "Y8888888888888888P
                              "Y888888888888P
                                "Y88888888P
                                  "Y8888P
                                    "PP
`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

export default function pirateHeart({ shine = meta.options.shine }: Partial<PirateHeartOptions> = {}): Frame {
  const { cols, rows } = meta;
  const art = ART.slice(1, -1).split("\n").map((line) => line.padEnd(cols));
  const every = shine > 0 ? Math.max(shine, PASS + 0.5) : 0;
  // The glint crosses the drawing's ink, edge to edge, rather than the whole frame.
  let lo = Infinity, hi = -Infinity;
  art.forEach((line, y) => {
    for (let x = 0; x < cols; x++) if (line[x] !== " ") (lo = Math.min(lo, x + LEAN * y)), (hi = Math.max(hi, x + LEAN * y));
  });
  const span = hi - lo + 2 * HALF;

  return (t) => {
    const since = t - START;
    const at = every && since >= 0 ? lo - HALF + (span * (since % every)) / PASS : -Infinity;
    const out: string[] = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        let ch = art[y][x];
        if (ch !== " ") {
          const d = Math.abs(x + LEAN * y - at);
          let k = d < HALF ? 1 - d / HALF : 0;
          k = k * k * (3 - 2 * k);
          if (k > 0.55 && SOLID.includes(ch)) ch = "/";
        }
        line += ch;
      }
      out.push(line);
    }
    return out.join("\n");
  };
}
