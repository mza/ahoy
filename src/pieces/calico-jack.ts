/*
 * calico-jack: Calico Jack Rackham's flag, the Jolly Roger most people picture:
 * a skull over two crossed cutlasses, in bone, steel and gold on black. A glint
 * runs up one blade and then the other, and embers wake in the eye sockets.
 *
 * Drawn from a painting of the flag at 80 by 32: each cell holds the character
 * whose shape best matches the edge through it, 8 where the bone is solid, #
 * the steel and % the gold. The flag itself (c. 1718) is in the public domain.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "calico jack",
  category: "scenes",
  note: "calico jack's jolly roger, a skull over crossed cutlasses, glinting",
  cols: 80,
  rows: 32,
  fps: 20,
  // bone; steel, lit, glinting; gold, lit; embers, dim to hot
  palette: ["#ece4d0", "#a6b8cc", "#d8e4f0", "#ffffff", "#d4a63c", "#f6d27a", "#6e1a12", "#e0442c", "#ffb070"],
  ground: "#000000",
} satisfies Meta;

// The flag, and what each cell is made of: 1 bone, 2 the blade rising to the right, 3 the one rising to the left, 4 gold.
const ART = [
  "                                     ______                                     ",
  "                                ,pp8888888888qq_                                ",
  "                              ,p8888888888888888qq                              ",
  "                            ,d88888888888888888888b_                            ",
  "                           ,888888888888888888888888_                           ",
  "                           88888888888888888888888888                           ",
  "                          ,88888888888888888888888888b                          ",
  "                          d88b  \"\"\"\"\"Y8888P\"\"\"\"\"  d88b                          ",
  "        \\q_               \"88b       d8888b       d88'               _q/        ",
  "         \"P#qq_           ,88q_      d8888b      ,p88q           _pp#P'         ",
  "           \"P###q_        d8888q__ppp888888qqq__p8888b        _p###P'           ",
  "              \"Y###q_     d888888888888'\"888888888888b     ,p###P'              ",
  "                \"P###q_    \"Y888888888'  \"888888888P'    ,p###P'                ",
  "                  \"P####q_    ,888888PY88PY888888'    ,p####P'                  ",
  "                     \"Y###q_  ,8P  PP  PP  PP  PY'  ,p###P'                     ",
  "                       \"P####  bq  pq  pq  pq  pd' ####P'                       ",
  "                          \"P#_ \"P==PP==PP==PP==P' ,#P'                          ",
  "                             \"=ppqqq_      ,pppqq=\"                             ",
  "                               \"\"P####q_ =####P''                               ",
  "                                  \"\"P####qq\"''                                  ",
  "                                 _ppq_\"P####qq_                                 ",
  "                             _pp####PP'  \"PP####qq_                             ",
  "         __              _pp####PP\"          \"PY####qq_              __         ",
  "        p%%%q       __pp####PP\"                  \"PY####qq__       p%%%q        ",
  "        Y%%%%_  _pp#####PP\"                          \"PP#####qq_  ,%%%%P        ",
  "         \"Y%%%q\"####P'\"                                  \"\"P####',%%%P\"         ",
  "          _d%%%q\"\"\"                                          \"\"'p%%%b_          ",
  "     _pppp%%%%%%q_                                            ,p%%%%%%qqqq_     ",
  "   ,%%%%%%%P'\"Y%%%q_                                        ,p%%%P\"\"P%%%%%%%q   ",
  "   d%%%%%P\"    d%%%%                                        %%%%P    \"Y%%%%%b   ",
  "    PPPPP'     \"P%P'                                        \"P%P'     \"PPPPP    ",
  "                                                                                ",
];
const MAT = [
  "00000000000000000000000000000000000001111110000000000000000000000000000000000000",
  "00000000000000000000000000000000111111111111111100000000000000000000000000000000",
  "00000000000000000000000000000011111111111111111111000000000000000000000000000000",
  "00000000000000000000000000001111111111111111111111110000000000000000000000000000",
  "00000000000000000000000000011111111111111111111111111000000000000000000000000000",
  "00000000000000000000000000011111111111111111111111111100000000000000000000000000",
  "00000000000000000000000000111111111111111111111111111100000000000000000000000000",
  "00000000000000000000000000111100111111111111111100111100000000000000000000000000",
  "00000000333000000000000000111100000001111110000000111100000000000000022200000000",
  "00000000033333300000000000111110000001111110000001111100000000000222222000000000",
  "00000000000333333300000000111111111111111111111111111100000000222222200000000000",
  "00000000000000333333300000111111111111111111111111111100000222222200000000000000",
  "00000000000000003333333000011111111111100111111111111000022222220000000000000000",
  "00000000000000000033333333000011111111111111111111000022222222000000000000000000",
  "00000000000000000000033333330011111111111111111111002222222000000000000000000000",
  "00000000000000000000000333333311111111111111111111222222200000000000000000000000",
  "00000000000000000000000000333301111111111111111110222200000000000000000000000000",
  "00000000000000000000000000000333333330000002222222200000000000000000000000000000",
  "00000000000000000000000000000003333333330222222220000000000000000000000000000000",
  "00000000000000000000000000000000003333333332220000000000000000000000000000000000",
  "00000000000000000000000000000000022222333333333000000000000000000000000000000000",
  "00000000000000000000000000000222222222200333333333300000000000000000000000000000",
  "00000000044000000000000002222222222000000000033333333330000000000000044000000000",
  "00000000444440000000222222222220000000000000000003333333333300000004444400000000",
  "00000000444444002222222222200000000000000000000000000333333333330044444400000000",
  "00000000044444422222222000000000000000000000000000000000033333333444444000000000",
  "00000000004444442220000000000000000000000000000000000000000003334444440000000000",
  "00000444444444444400000000000000000000000000000000000000000000444444444444400000",
  "00044444444444444444000000000000000000000000000000000000000044444444444444444000",
  "00044444444000044444000000000000000000000000000000000000000044444000044444444000",
  "00004444440000044444000000000000000000000000000000000000000044444000004444440000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
];

const LOOP = 6;
// Each blade, from its hilt to its tip, in cells, and when the glint runs up it.
const BLADES: [number, number, number, number, number][] = [
  [14, 26.9, 72, 8.25, 0.7],
  [66, 26.9, 8, 8.25, 1.9],
];
const RUN = 1.2; // seconds a glint takes from hilt to tip
const HALF = 0.14; // half its length, along the blade
const EYES = [33, 46]; // the sockets' middle columns, on row 8
const GLOW = [
  [" ", " ", " "],
  [" ", "·", " "],
  ["·", "•", "·"],
  ["•", "●", "•"],
];

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export default function calicoJack(): Frame {
  const { cols, rows } = meta;
  // how far up its blade each steel cell is, 0 at the hilt to 1 at the tip
  const along = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const m = MAT[y][x];
      if (m !== "2" && m !== "3") continue;
      const [hx, hy, tx, ty] = BLADES[m === "2" ? 0 : 1];
      const ax = tx - hx, ay = (ty - hy) * 2;
      along[y * cols + x] = ((x - hx) * ax + (y - hy) * 2 * ay) / (ax * ax + ay * ay);
    }

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    // where each glint is along its blade, off either end when it is not running
    const at = BLADES.map(([, , , , start]) => -2 * HALF + ((u - start) / RUN) * (1 + 4 * HALF));
    // the embers smoulder, then flare and die back down
    const flare = smooth((u - 3.3) / 0.5) * (1 - smooth((u - 4.6) / 0.7));
    const flicker = 0.5 + 0.5 * Math.sin(u * 23) * Math.sin(u * 7.3);
    const level = Math.min(3, Math.round(1 + flare * (1.6 + 0.4 * flicker)));
    const out: string[] = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        let ch = ART[y][x], c = 0;
        const m = MAT[y][x];
        if (m === "2" || m === "3") {
          const d = Math.abs(along[y * cols + x] - at[m === "2" ? 0 : 1]);
          const k = smooth(1 - d / HALF);
          c = k > 0.6 ? 3 : k > 0.2 ? 2 : 1;
          if (k > 0.6 && ch === "#") ch = "=";
        } else if (m === "4") {
          // a hilt catches the light as its glint sets off
          const g = at[x < cols / 2 ? 0 : 1];
          c = g > -2 * HALF && g < 0.12 ? 5 : 4;
        }
        if (y >= 8 && y <= 9) {
          for (const ex of EYES) {
            const i = x - ex + 1;
            if (i < 0 || i > 2) continue;
            const glyph = y === 8 ? GLOW[level][i] : level === 3 && i === 1 ? "·" : " ";
            if (glyph !== " ") (ch = glyph), (c = level === 3 ? 8 : level === 2 ? 7 : 6);
          }
        }
        if (color) color[y * cols + x] = c;
        line += ch;
      }
      out.push(line);
    }
    return out.join("\n");
  };
}
