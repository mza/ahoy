/*
 * aws: the Amazon Web Services logo, the aws wordmark over its smile, with a
 * glint crossing it every few seconds.
 *
 * Drawn from the AWS logo artwork: each cell holds the character whose shape
 * best matches the logo's edge through it, and 8 where the logo is solid. On a
 * canvas the letters are squid ink and the smile orange, the letters lifted
 * to near white on a dark page, where they would sink into it; in a <pre> it
 * is one ink, from the same drawing. The logo is a trademark of its owner,
 * shown here to name the company.
 */
import type { Frame, Meta } from "../types.ts";

export interface AwsOptions {
  [key: string]: unknown;
  /** Seconds between glints; 0 keeps the logo still. */
  shine: number;
}

export const meta = {
  name: "aws",
  category: "companies",
  note: "the aws wordmark over its orange smile, glinting now and then",
  cols: 80,
  rows: 25,
  fps: 30,
  options: { shine: 5 },
  // The letters' and the smile's colours for a light page, then for a dark one; each as drawn, then twice lighter for the glint.
  palette: [
    "#232f3e", "#ff9900", "#707882", "#ffbd59", "#bdc1c5", "#ffe0b3",
    "#e8ebef", "#ff9900", "#f0f2f5", "#ffbd59", "#f8f9fa", "#ffe0b3",
  ],
} satisfies Meta<AwsOptions>;

// In a <pre>, in the page's own colour.
const MONO = String.raw`

       _pppp88888qqq_     pppq_       ,pppq_        ppppb    ,ppp8888qqqq
      d88888YYPP88888q_   Y888b       d8888b       d8888   ,88888YPPPP888b
      dY""       "Y888b   d8888_     ,888888b      d888b  d8888'       ""'
                   8888b   d888b     d88bd88b     d888P   d888b
                   d888b    Y888b   ,888'd888b    d888'   "Y888qq__
       ,pp8888888qq8888b    d888b   d88b  d88b   d888b     "Y8888888qqq_
      p8888P""""""Y8888b     Y888b ,888'  d888b  d88P         ""YYY888888q
     d888P'        d888b     "888b d88b    d88b d888'               ""8888b
     d888b        ,8888b      d888b888'    d888_888b                  d888b
     d8888_     _p88888b       Y88888P      d888888'      pp__       ,d888b
      Y88888pp8888P"8888b      d88888b      d88888b       d88888ppq88888P'
       ""YYYPPPP"   "YP'        "YPP'        "YPP'         ""YYYPPPPPPP"
  
  
                                                                  _ppppppqq88q
  o8q__                                                         .YYYYYYPPP8888
   "YY8qq__                                                               d88b
      "Y8888qq__                                                 __pq88b  d88b
         "Y888888qqqq__                                   __pppp8888P''  ,88P
            "YY888888888qqqqqq______          _____pppppp88888888P'"    ,88P
                ""YY8888888888888888888888888888888888888888PP'"        dP'
                     ""YYY8888888888888888888888888888PP'""             "
                           """""YYYYYYYPPPPPPPP'""""

`;

// On a canvas, and the colour of each cell: an index into the logo's colours, 0 the letters and 1 the smile.
const ART = String.raw`

       _pppp88888qqq_     pppq_       ,pppq_        ppppb    ,ppp8888qqqq
      d88888YYPP88888q_   Y888b       d8888b       d8888   ,88888YPPPP888b
      dY""       "Y888b   d8888_     ,888888b      d888b  d8888'       ""'
                   8888b   d888b     d88bd88b     d888P   d888b
                   d888b    Y888b   ,888'd888b    d888'   "Y888qq__
       ,pp8888888qq8888b    d888b   d88b  d88b   d888b     "Y8888888qqq_
      p8888P""""""Y8888b     Y888b ,888'  d888b  d88P         ""YYY888888q
     d888P'        d888b     "888b d88b    d88b d888'               ""8888b
     d888b        ,8888b      d888b888'    d888_888b                  d888b
     d8888_     _p88888b       Y88888P      d888888'      pp__       ,d888b
      Y88888pp8888P"8888b      d88888b      d88888b       d88888ppq88888P'
       ""YYYPPPP"   "YP'        "YPP'        "YPP'         ""YYYPPPPPPP"
  
  
                                                                  _ppppppqq88q
  o8q__                                                         .YYYYYYPPP8888
   "YY8qq__                                                               d88b
      "Y8888qq__                                                 __pq88b  d88b
         "Y888888qqqq__                                   __pppp8888P''  ,88P
            "YY888888888qqqqqq______          _____pppppp88888888P'"    ,88P
                ""YY8888888888888888888888888888888888888888PP'"        dP'
                     ""YYY8888888888888888888888888888PP'""             "
                           """""YYYYYYYPPPPPPPP'""""

`;
const INK = String.raw`

       00000000000000     00000       000000        00000    000000000000
      00000000000000000   00000       000000       00000   000000000000000
      0000       000000   000000     00000000      00000  000000       000
                   00000   00000     00000000     00000   00000
                   00000    00000   0000000000    00000   000000000
       00000000000000000    00000   0000  0000   00000     0000000000000
      000000000000000000     00000 00000  00000  0000         000000000000
     000000        00000     00000 0000    0000 00000               0000000
     00000        000000      000000000    000000000                  00000
     000000     00000000       0000000      00000000      0000       000000
      0000000000000000000      0000000      0000000       0000000000000000
       0000000000   0000        00000        00000         0000000000000


                                                                  111111111111
  11111                                                         11111111111111
   11111111                                                               1111
      1111111111                                                 1111111  1111
         11111111111111                                   1111111111111  1111
            111111111111111111111111          1111111111111111111111    1111
                111111111111111111111111111111111111111111111111        111
                     11111111111111111111111111111111111111             1
                           1111111111111111111111111

`;

const START = 0.5; // seconds before the first glint
const PASS = 2; // seconds a glint takes to cross
const HALF = 5; // half its width, in cells
const LEAN = 0.9; // cells it shifts left a row down, so it leans like a slash
const SOLID = "8dbqpPYOo0"; // what the glint turns to slashes; thin edges keep their shape

const lines = (art: string) => art.slice(1, -1).split("\n").map((line) => line.padEnd(meta.cols));

export default function aws({ shine = meta.options.shine }: Partial<AwsOptions> = {}): Frame {
  const { cols, rows } = meta;
  const mono = lines(MONO), art = lines(ART), ink = lines(INK);
  const n = meta.palette.length / 6;
  const every = shine > 0 ? Math.max(shine, PASS + 0.5) : 0;
  // The glint crosses the logo's ink, edge to edge, rather than the whole frame.
  let lo = Infinity, hi = -Infinity;
  for (const pic of [mono, art])
    pic.forEach((line, y) => {
      for (let x = 0; x < cols; x++) if (line[x] !== " ") (lo = Math.min(lo, x + LEAN * y)), (hi = Math.max(hi, x + LEAN * y));
    });
  const span = hi - lo + 2 * HALF;

  return (t, { paper = false, color } = {}) => {
    const pic = color ? art : mono;
    const since = t - START;
    const at = every && since >= 0 ? lo - HALF + (span * (since % every)) / PASS : -Infinity;
    const out: string[] = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        let ch = pic[y][x];
        if (ch !== " ") {
          const d = Math.abs(x + LEAN * y - at);
          let k = d < HALF ? 1 - d / HALF : 0;
          k = k * k * (3 - 2 * k);
          if (k > 0.55 && SOLID.includes(ch)) ch = "/";
          if (color) color[y * cols + x] = (paper ? 0 : 3 * n) + (k > 0.6 ? 2 : k > 0.25 ? 1 : 0) * n + parseInt(ink[y][x], 36);
        }
        line += ch;
      }
      out.push(line);
    }
    return out.join("\n");
  };
}
