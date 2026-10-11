/*
 * hourglass: the "your time is running out" flag, flown by Emanuel Wynne
 * around 1700: a skull over crossed bones above a winged hourglass, in bone and
 * gold on black. The sand trickles from the top bulb into a heap in the bottom
 * one, and when the top is empty the glass turns over and it starts again.
 *
 * The skull, bones, wings and frame are drawn from a painting of the flag at 80
 * by 32, each cell the character whose shape best matches the edge through it;
 * the sand is worked out each frame. The flag is in the public domain.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "hourglass",
  category: "scenes",
  note: "a winged hourglass under a skull and crossbones, its sand running out",
  cols: 80,
  rows: 32,
  fps: 15,
  // bone, the hourglass's frame, its glass, the sand, the sand's surface, the falling stream
  palette: ["#ece4d0", "#b8892e", "#6f8592", "#e8b444", "#ffd77a", "#ffe9a8"],
  ground: "#000000",
} satisfies Meta;

// The flag, what each cell is made of (1 bone, 2 the frame, 3 the glass), and the
// room inside the glass for the sand: t in the top bulb, b in the bottom one.
const ART = [
  "                     ,d888'          __pq__          \"888b_                     ",
  "                    ,888888q_     pp88888888qq_    _p888888_                    ",
  "                     PPP\"\"P888q ,88888888888888q p888P'\"PPP                     ",
  "                            \"P',8888888888888888q\"P'                            ",
  "                               d8PPPPP8888PPPPY8b                               ",
  "                               d8'    d88b    \"8b                               ",
  "                               d88_ __d888q_ ,d8b                               ",
  "                               d8888888PP8888888P                               ",
  "                            _pq_\"\"8888bpqd8888\"\"_pq_                            ",
  "                     ppq_pp888P'' b'\"\" \"' \"'\"d \"\"P888qq_pqq                     ",
  "                    \"888888P\"     \"P/P=PP=P\\/'     \"P888888'                    ",
  "                     \"d888_                          ,888b'                     ",
  "                      \"PPP     ,ppppppppqqqqqqqq_     PPP'                      ",
  "      \"P888pqqqqq___           d%%%%%%%%%%%%%%%%b           ___pppppp888P'      ",
  "         \"\"PP888888888qqq_     \"%b\"\"\"\"\"\"\"\"\"\"\"\"d%'     _ppp888888888PP'\"         ",
  "    ____ppppppp8PPP888888888q_ ,%|            |%' ,p888888888PPY8qqqqqqq____    ",
  "   \"PPP888888888888qq8888YPPYb ,%d_          ,b%' ,PPPP8888pp888888888888PPP'   ",
  "         \"\"\"\"\"PYYPYPPPPPPPPPP' ,%\"b          d'%' ,YPPPPPPPPYPYPP'\"\"\"\"\"         ",
  "         __ppp888888888888PPY' ,% dq        ,' %' ,PPP888888888888pqq__         ",
  "     pp88888888PPPPY8888pp8PY' ,%  Y_      ,P  %' ,PP8pq8888PPPPP88888888qq     ",
  "      \"\"\"\"\"   _pp888888PY8p8P' ,%   Y_    ,P   %' \"Y8q8PY888888qq_   \"\"\"\"\"      ",
  "           ,pp8888PPY8p888Pd8b ,%    \"q__p'    %' ,8bP888q8PPY8888qq_           ",
  "         ,p8PPP\"\" ,p888PYp88P  ,%    pP\"\"Pq    %'  P88qPY888q_ \"\"PPP8q_         ",
  "                ,p88P''p88P'   ,%   p'    \"q   %'   \"P88q\"PP88q_                ",
  "                PP\"\"  d8P'     ,%  p'      \"q  %'     \"P8b  \"\"PP                ",
  "                               ,% p'        \"q %'                               ",
  "                               ,%,b          d_%'                               ",
  "                               ,%d'          \"b%'                               ",
  "                               ,%|            |%'                               ",
  "                               ,%b            d%'                               ",
  "                               d%%%%%%%%%%%%%%%%b                               ",
  "                               \"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"'                               ",
];
const MAT = [
  "00000000000000000000011111100000000001111110000000000111111000000000000000000000",
  "00000000000000000000111111111000001111111111111000011111111100000000000000000000",
  "00000000000000000000011111111110111111111111111101111111111000000000000000000000",
  "00000000000000000000000000001111111111111111111111110000000000000000000000000000",
  "00000000000000000000000000000001111111111111111110000000000000000000000000000000",
  "00000000000000000000000000000001110000111100001110000000000000000000000000000000",
  "00000000000000000000000000000001111011111111011110000000000000000000000000000000",
  "00000000000000000000000000000001111111111111111110000000000000000000000000000000",
  "00000000000000000000000000001111111111111111111111110000000000000000000000000000",
  "00000000000000000000011111111111101111111011110111111111111000000000000000000000",
  "00000000000000000000111111111000001111111111110000011111111100000000000000000000",
  "00000000000000000000011111100000000000000000000000000111111000000000000000000000",
  "00000000000000000000001111000002222222222222222220000011110000000000000000000000",
  "00000011111111111111000000000002222222222222222220000000000011111111111111000000",
  "00000000011111111111111111000002233333333333333220000011111111111111111000000000",
  "00001111111111111111111111111102230000000000003220111111111111111111111111110000",
  "00011111111111111111111111111102233000000000033220111111111111111111111111111000",
  "00000000011111111111111111111102233000000000033220111111111111111111111000000000",
  "00000000011111111111111111111102223300000000332220111111111111111111111000000000",
  "00000111111111111111111111111102220330000003302220111111111111111111111111100000",
  "00000011111000111111111111111102220033000033002220111111111111111100011111000000",
  "00000000000111111111111111111102220003333330002220111111111111111111100000000000",
  "00000000011111111011111111111002220003333330002220011111111111011111111000000000",
  "00000000000000001111111111110002220033000033002220001111111111110000000000000000",
  "00000000000000011111001111000002220330000003302220000011110011111000000000000000",
  "00000000000000000000000000000002223300000000332220000000000000000000000000000000",
  "00000000000000000000000000000002233000000000033220000000000000000000000000000000",
  "00000000000000000000000000000002233000000000033220000000000000000000000000000000",
  "00000000000000000000000000000002230000000000003220000000000000000000000000000000",
  "00000000000000000000000000000002230000000000003220000000000000000000000000000000",
  "00000000000000000000000000000002222222222222222220000000000000000000000000000000",
  "00000000000000000000000000000002222222222222222220000000000000000000000000000000",
];
const ROOM = [
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                  tttttttttttt                                  ",
  "                                   tttttttttt                                   ",
  "                                   tttttttttt                                   ",
  "                                    tttttttt                                    ",
  "                                     tttttt                                     ",
  "                                      tttt                                      ",
  "                                                                                ",
  "                                                                                ",
  "                                      bbbb                                      ",
  "                                     bbbbbb                                     ",
  "                                    bbbbbbbb                                    ",
  "                                   bbbbbbbbbb                                   ",
  "                                   bbbbbbbbbb                                   ",
  "                                  bbbbbbbbbbbb                                  ",
  "                                  bbbbbbbbbbbb                                  ",
  "                                                                                ",
  "                                                                                ",
];

const RUN = 6.5; // seconds the sand takes to run through
const TURN = 0.8; // seconds the glass takes to turn over
const LOOP = RUN + TURN;
const START = 2; // seconds into a run that frame 0 shows
const MID = 39.5; // the glass's middle column
const NECK = [21, 22]; // the rows of its neck
const GLASS = [12, 31, 31, 49]; // the hourglass, top row to bottom, left column to right, for turning it over
const STREAM = ":'.";

export default function hourglass(): Frame {
  const { cols, rows } = meta;
  const top: [number, number][] = [], bottom: [number, number][] = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) (ROOM[y][x] === "t" ? top : ROOM[y][x] === "b" ? bottom : []).push([x, y]);
  // The top drains from its surface, the middle first; the bottom heaps up from the floor in a cone.
  top.sort((a, b) => b[1] - a[1] || Math.abs(b[0] - MID) - Math.abs(a[0] - MID));
  bottom.sort((a, b) => (31 - a[1]) * 2 + Math.abs(a[0] - MID) - ((31 - b[1]) * 2 + Math.abs(b[0] - MID)));
  const grains = top.length;
  const base = ART.map((l) => [...l]), ink = MAT.map((m) => [...m].map((c) => (c === "2" ? 1 : c === "3" ? 2 : 0)));

  // The picture with the sand run f of the way through, into grid and paint.
  const fill = (f: number, grid: string[][], paint: number[][], t: number) => {
    const left = Math.round(grains * (1 - f)), fallen = grains - left;
    const sand = new Set<number>();
    for (let i = 0; i < left; i++) sand.add(top[i][1] * cols + top[i][0]);
    for (let i = 0; i < Math.min(fallen, bottom.length); i++) sand.add(bottom[i][1] * cols + bottom[i][0]);
    for (const k of sand) {
      const x = k % cols, y = (k - x) / cols;
      // a grain with no sand above it is the surface
      const open = !sand.has(k - cols);
      grid[y][x] = open ? "▄" : (x + y) & 1 ? "▓" : "▒";
      paint[y][x] = open ? 4 : 3;
    }
    if (f > 0 && f < 1) {
      // the stream, from the neck down to the heap
      const x = Math.floor(MID);
      for (let y = NECK[0]; y < rows && !sand.has(y * cols + x); y++) {
        if (y > NECK[1] && ROOM[y][x] !== "b") break;
        grid[y][x] = STREAM[(((y - Math.floor(t * 12)) % 3) + 3) % 3];
        paint[y][x] = 5;
      }
    }
  };

  return (t, { color } = {}) => {
    const u = (((t + START) % LOOP) + LOOP) % LOOP;
    const grid = base.map((r) => r.slice()), paint = ink.map((r) => r.slice());
    if (u < RUN) fill(u / RUN, grid, paint, t);
    else {
      // turning over: the glass shrinks to its middle row and opens out again, full at the top
      const p = (u - RUN) / TURN, scale = Math.max(0.05, Math.abs(Math.cos(Math.PI * p)));
      const g = base.map((r) => r.slice()), gp = ink.map((r) => r.slice());
      fill(p < 0.5 ? 1 : 0, g, gp, t);
      const [y0, y1, x0, x1] = GLASS, c = (y0 + y1) / 2;
      for (let y = y0; y <= y1; y++) {
        const src = Math.round(c + (y - c) / scale);
        for (let x = x0; x <= x1; x++) {
          const inside = src >= y0 && src <= y1;
          grid[y][x] = inside ? g[src][x] : " ";
          paint[y][x] = inside ? gp[src][x] : 0;
        }
      }
    }
    if (color) for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) color[y * cols + x] = paint[y][x];
    return grid.map((r) => r.join("")).join("\n");
  };
}
