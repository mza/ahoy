/*
 * ghost-captain: a grinning skull in a captain's tricorn, gold-trimmed, with a
 * long clay pipe clenched in its teeth. Smoke rings rise from the pipe and
 * spread as they go, the pipe's ember glows, and embers flicker in its eyes.
 *
 * The skull, hat and pipe are dense ascii fill: each cell holds the character
 * whose shape best matches the edge through it, and 8 where it is solid; the
 * hat is woven of # and its trim of =. The smoke is drawn fresh each frame.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "ghost captain",
  category: "scenes",
  note: "a skull in a tricorn puffing smoke rings from a long clay pipe",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone lit and shaded; the hat and its fold; gold and dark gold; ember, hot ember; smoke fresh, thinning, nearly gone
  palette: ["#f2eee4", "#bdb6a8", "#5a6170", "#3b404b", "#e3b23c", "#9c7421", "#ff5a1f", "#ffc35c", "#d9d6cf", "#8d8a85", "#4b4946"],
} satisfies Meta;

// The skull, its hat and its pipe; and the stuff of each cell: 1 bone, 2 hat, 3 trim, 4 badge, 5 pipe.
const ART = [
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                 _                                              ",
  "                            _ppp###8qq__                                        ",
  "                         ,8#############8q                                      ",
  "                        ,######YYYPP######q             .                       ",
  "           #qq         ,######'p@@@q_Y#####q         ,p8'                       ",
  "           d###qppppppp#######\"@@@@@bd######qqqqqqqp####                        ",
  "           \"##################q_PPP'p##################b                        ",
  "            Y===####################################==P'                        ",
  "             \"Y===###############################===P'                          ",
  "                \"YY=====###################======P\"\"                            ",
  "                   \"\"YYYY==================PPPP'                                ",
  "                     ,qqppp__\"\"\"YPP'\"\"\"_qqqqpq                                  ",
  "                     d888PYYYY88888888PPPP8888                                  ",
  "                     d8P'     \"Y8888'     \"Y88'                                 ",
  "                     d8'        888'        Y8'                                 ",
  "                     \"8_       ,888b        8b                                  ",
  "                      d8q_    ,88888q_    ,dP'                                  ",
  "                       \"888p88888P88888p888P'                                   ",
  "                        \"Y888888P d8888888'                                     ",
  "                         d88888P'  d888888                                      ",
  "                         d8888888888888888                                      ",
  "                         d888\"Y88\"Y88PY888                                      ",
  "                         d88b d88 d88 ,PP8                \"qppqqqb              ",
  "                         \"88b d88 d88 \",qqq_               888888b              ",
  "                           \"' \"PP \"PP   \"\"YY8qqq_          d88888'              ",
  "                                             \"\"YY8qqqq__   d88888'              ",
  "                                                  \"\"\"YYYY8q\"8888P               ",
  "                                                            \"YP'                ",
  "                                                                                ",
];
const STUFF = [
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000020000000000000000000000000000000000000000000000",
  "00000000000000000000000000002222222222220000000000000000000000000000000000000000",
  "00000000000000000000000002222222222222222200000000000000000000000000000000000000",
  "00000000000000000000000022222222222222222220000000000000200000000000000000000000",
  "00000000000222000000000222222224444442222222000000000222200000000000000000000000",
  "00000000000222222222222222222244444442222222222222222222000000000000000000000000",
  "00000000000222222222222222222222444422222222222222222222000000000000000000000000",
  "00000000000033332222222222222222222222222222222222223333000000000000000000000000",
  "00000000000003333322222222222222222222222222222223333300000000000000000000000000",
  "00000000000000003333333322222222222222222223333333330000000000000000000000000000",
  "00000000000000000003333333333333333333333333333300000000000000000000000000000000",
  "00000000000000000000011111111222333322211111110000000000000000000000000000000000",
  "00000000000000000000011111111111111111111111110000000000000000000000000000000000",
  "00000000000000000000011110000011111110000011111000000000000000000000000000000000",
  "00000000000000000000011100000000111100000000111000000000000000000000000000000000",
  "00000000000000000000011100000001111100000000110000000000000000000000000000000000",
  "00000000000000000000001111000011111111000011110000000000000000000000000000000000",
  "00000000000000000000000111111111111111111111100000000000000000000000000000000000",
  "00000000000000000000000011111111101111111110000000000000000000000000000000000000",
  "00000000000000000000000001111111100111111100000000000000000000000000000000000000",
  "00000000000000000000000001111111111111111100000000000000000000000000000000000000",
  "00000000000000000000000001111111111111111100000000000000000000000000000000000000",
  "00000000000000000000000001111011101110111100000000000000005555555500000000000000",
  "00000000000000000000000001111011101110155555000000000000000555555500000000000000",
  "00000000000000000000000000011011101110005555555550000000000555555500000000000000",
  "00000000000000000000000000000000000000000000055555555555000555555500000000000000",
  "00000000000000000000000000000000000000000000000000555555555555555000000000000000",
  "00000000000000000000000000000000000000000000000000000000000055550000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
];

const LOOP = 6; // seconds
const RINGS = 3; // smoke rings in the air at once, a loop apart between them
const BOWL = [62, 24]; // the cell above the pipe's bowl, where the smoke starts: column, row
const EYES = [[27, 17], [39, 17]]; // each socket's left-hand middle cell

// A small hash, so the flicker is the same at the same time on every run.
const hash = (n: number) => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  return ((Math.imul(h, 0xc2b2ae35) ^ (h >>> 16)) >>> 0) / 4294967296;
};

export default function ghostCaptain(): Frame {
  const { cols, rows } = meta;
  const stuff = STUFF.map((r) => [...r].map((c) => parseInt(c, 36)));
  const base = ART.map((l) => [...l]);
  // the hat's fold: the right of the crown in shadow
  const inkOf = (kind: number, x: number, y: number) =>
    kind === 1 ? (x > 44 && y > 12 ? 1 : 0) : kind === 2 ? (x > 36 ? 3 : 2) : kind === 3 || kind === 4 ? (x > 44 ? 5 : 4) : 1;

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const ch = base.map((r) => r.slice());
    const ink = new Array<number>(cols * rows).fill(-1);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (ch[y][x] !== " ") ink[y * cols + x] = inkOf(stuff[y][x], x, y);
    const put = (x: number, y: number, c: string, k: number) => {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= cols || y >= rows || ch[y][x] !== " ") return;
      ch[y][x] = c;
      ink[y * cols + x] = k;
    };

    // smoke rings: each rises from the bowl, drifts and widens, and thins out as it goes
    for (let i = 0; i < RINGS; i++) {
      const age = (u + (i * LOOP) / RINGS) % LOOP, k = age / LOOP;
      const cx = BOWL[0] + 3 * Math.sin(k * 5 + i) - 2 * k, cy = BOWL[1] - 3 - k * 22;
      const rx = 2.4 + 4.8 * Math.sqrt(k), ry = rx * 0.42;
      const fade = k < 0.45 ? 8 : k < 0.8 ? 9 : 10;
      // a ring a cell thick: a top and a bottom edge, and its sides between
      const top = Math.round(cy - ry), bottom = Math.max(top + 2, Math.round(cy + ry));
      const thin = (n: number) => k > 0.85 && hash(i * 97 + n) < 0.45;
      for (let y = top; y <= bottom; y++) {
        if (y === top || y === bottom) {
          const l = Math.round(cx - rx * 0.72), r = Math.round(cx + rx * 0.72), end = y === top ? "." : "'";
          for (let x = l; x <= r; x++) if (!thin(x * 7 + y)) put(x, y, x === l || x === r ? end : "-", fade);
        } else {
          const v = (y - (top + bottom) / 2) / ((bottom - top) / 2), w = rx * Math.sqrt(Math.max(0, 1 - v * v * 0.6));
          if (!thin(y * 13)) put(cx - w, y, "(", fade);
          if (!thin(y * 13 + 5)) put(cx + w, y, ")", fade);
        }
      }
    }
    // a wisp curling up out of the bowl to meet the next ring
    for (let j = 0; j < 4; j++) {
      const y = BOWL[1] - j, x = BOWL[0] + Math.round(Math.sin(u * 3 + j * 1.3));
      put(x, y, j < 2 ? ":" : ".", 9);
    }
    // the ember in the bowl, flickering
    for (let x = BOWL[0] - 2; x <= BOWL[0] + 2; x++) {
      const f = hash(Math.floor(u * 12) * 31 + x);
      put(x, BOWL[1], f > 0.66 ? "*" : f > 0.33 ? "#" : "%", f > 0.5 ? 7 : 6);
    }
    // embers in the eyes: they smoulder, flare now and then, and go dark for a blink
    const blink = u > 4.1 && u < 4.35;
    const glow = 0.5 + 0.5 * Math.sin(u * 2.1) * Math.sin(u * 5.3 + 1);
    EYES.forEach(([ex, ey], e) => {
      if (blink) return;
      const hot = glow + 0.25 * hash(Math.floor(u * 10) * 7 + e) > 0.7;
      put(ex, ey, hot ? "*" : "o", hot ? 7 : 6);
      put(ex + 1, ey, hot ? "*" : "o", hot ? 7 : 6);
      put(ex, ey + 1, ".", 6);
      put(ex + 1, ey + 1, ".", 6);
    });

    if (color) for (let k = 0; k < cols * rows; k++) color[k] = ink[k] < 0 ? 0 : ink[k];
    return ch.map((r) => r.join("")).join("\n");
  };
}
