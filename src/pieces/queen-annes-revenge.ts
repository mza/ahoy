/*
 * queen-annes-revenge: Blackbeard's flagship as a roundel, her name lettered
 * round the top and the year he took her, 1717, round the foot. She pitches
 * on a rolling sea under full sail, her red swallowtail flying and her stern
 * lantern flickering.
 *
 * The frigate is drawn cell by cell: masts as lines, yards as rules, each sail
 * a solid shape with the ground between it and the next, the hull's gunports
 * in red. She pitches by leaning whole cells, the trucks a column either way,
 * so her edges never shimmer. The rings are drawn as ascii circles are, and
 * the sea is drawn live.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "queen anne's revenge",
  category: "scenes",
  note: "blackbeard's flagship under full sail, in a roundel with her name",
  cols: 80,
  rows: 32,
  fps: 12,
  ground: "#000000",
  // sails, hull, spars, flag, lantern, gunports; the rings, the lettering; the sea, near to far; the lantern flaring
  palette: ["#efe9dc", "#b8b0a0", "#8c8577", "#d81f2a", "#ff6a3d", "#a3151e", "#77726a", "#d81f2a", "#cfc8b8", "#7d786e", "#4a4741", "#ffb36b"],
} satisfies Meta;

// The roundel, and the colour of each of its cells as a letter: a for palette colour 0, b for 1, and so on.
const BASE = [
  "                                 ______________                                 ",
  "                           ...--''            ''--...                           ",
  "                       ..-''  QUEEN ANNE'S REVENGE  ''-..                       ",
  "                    ..-'         ______________         '-..                    ",
  "                  .-'       ..--''            ''--..       '-.                  ",
  "                .-'      ..-'                      '-..      '-.                ",
  "               .'     ..-'                            '-..     '.               ",
  "             .-'     .'                                  '.     '-.             ",
  "            .'     .-'                                    '-.     '.            ",
  "           .'     .'                                        '.     '.           ",
  "          .'     .'                                          '.     '.          ",
  "          /     .'                                            '.     \\          ",
  "         .'    .'                                              '.    '.         ",
  "         |     |                                                |     |         ",
  "         |     |                                                |     |         ",
  "         |     |                                                |     |         ",
  "         |     |                                                |     |         ",
  "         |     |                                                |     |         ",
  "         |     |                                                |     |         ",
  "         '.    '.                                              .'    .'         ",
  "          \\     '.                                            .'     /          ",
  "          '.     '.                                          .'     .'          ",
  "           '.     '.                                        .'     .'           ",
  "            '.     '-.                                    .-'     .'            ",
  "             '-.     '.                                  .'     .-'             ",
  "               '.     '-..                            ..-'     .'               ",
  "                '-.      '-..                      ..-'      .-'                ",
  "                  '-.       ''--..            ..--''       .-'                  ",
  "                    '-..         --------------         ..-'                    ",
  "                       ''-..         1 7 1 7        ..-''                       ",
  "                           ''--...            ...--''                           ",
  "                                 --------------                                 ",
];
const BASE_INK = [
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaggggggggggggggaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaaaaaaaaaaaaagggggggaaaaaaaaaaaagggggggaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaaaaaaaaagggggaahhhhhahhhhhhahhhhhhhaagggggaaaaaaaaaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaaaaaaggggaaaaaaaaaggggggggggggggaaaaaaaaaggggaaaaaaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaaaagggaaaaaaaggggggaaaaaaaaaaaaggggggaaaaaaagggaaaaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaagggaaaaaaggggaaaaaaaaaaaaaaaaaaaaaaggggaaaaaagggaaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaggaaaaaggggaaaaaaaaaaaaaaaaaaaaaaaaaaaaggggaaaaaggaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaagggaaaaaggaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaggaaaaagggaaaaaaaaaaaaa",
  "aaaaaaaaaaaaggaaaaagggaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaagggaaaaaggaaaaaaaaaaaa",
  "aaaaaaaaaaaggaaaaaggaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaggaaaaaggaaaaaaaaaaa",
  "aaaaaaaaaaggaaaaaggaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaggaaaaaggaaaaaaaaaa",
  "aaaaaaaaaagaaaaaggaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaggaaaaagaaaaaaaaaa",
  "aaaaaaaaaggaaaaggaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaggaaaaggaaaaaaaaa",
  "aaaaaaaaagaaaaagaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaagaaaaagaaaaaaaaa",
  "aaaaaaaaagaaaaagaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaagaaaaagaaaaaaaaa",
  "aaaaaaaaagaaaaagaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaagaaaaagaaaaaaaaa",
  "aaaaaaaaagaaaaagaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaagaaaaagaaaaaaaaa",
  "aaaaaaaaagaaaaagaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaagaaaaagaaaaaaaaa",
  "aaaaaaaaagaaaaagaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaagaaaaagaaaaaaaaa",
  "aaaaaaaaaggaaaaggaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaggaaaaggaaaaaaaaa",
  "aaaaaaaaaagaaaaaggaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaggaaaaagaaaaaaaaaa",
  "aaaaaaaaaaggaaaaaggaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaggaaaaaggaaaaaaaaaa",
  "aaaaaaaaaaaggaaaaaggaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaggaaaaaggaaaaaaaaaaa",
  "aaaaaaaaaaaaggaaaaagggaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaagggaaaaaggaaaaaaaaaaaa",
  "aaaaaaaaaaaaagggaaaaaggaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaggaaaaagggaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaggaaaaaggggaaaaaaaaaaaaaaaaaaaaaaaaaaaaggggaaaaaggaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaagggaaaaaaggggaaaaaaaaaaaaaaaaaaaaaaggggaaaaaagggaaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaaaagggaaaaaaaggggggaaaaaaaaaaaaggggggaaaaaaagggaaaaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaaaaaaggggaaaaaaaaaggggggggggggggaaaaaaaaaggggaaaaaaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaaaaaaaaagggggaaaaaaaaahahahahaaaaaaaagggggaaaaaaaaaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaaaaaaaaaaaaagggggggaaaaaaaaaaaagggggggaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaggggggggggggggaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
];

// The ship, with her flag in three phases of its ripple, and the colour of each cell.
const SHIP: string[][] = [
  [
    "                       |8888b-                      ",
    "                       |8888P<                      ",
    "                    =======                         ",
    "                    q88888p         |               ",
    "          |            |        =========           ",
    "       =======    ===========   888888888  8\\       ",
    "       8888888    88888888888   Y8888888P  88\\      ",
    "       Y88888P    Y888888888P       |      888\\     ",
    "          |            |       =========== 8888\\    ",
    "      =========  ============= 88888888888 88888\\/  ",
    "   o  888888888  8888888888888 88888888888 8888/_\\  ",
    "   |__Y8888888P  8888888888888 Y888888888P ________ ",
    "  |888|______________________________________/      ",
    "  |8888888888888888888888888888888888888888888/     ",
    "  \\888o888o888o888o888o888o888o888o888o88888P       ",
    "   \\8888888888888888888888888888888888888888P       ",
    "    `\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"'         ",
    "                                                    ",
  ],
  [
    "                       |88888b                      ",
    "                       |8888P-                      ",
    "                    =======                         ",
    "                    q88888p         |               ",
    "          |            |        =========           ",
    "       =======    ===========   888888888  8\\       ",
    "       8888888    88888888888   Y8888888P  88\\      ",
    "       Y88888P    Y888888888P       |      888\\     ",
    "          |            |       =========== 8888\\    ",
    "      =========  ============= 88888888888 88888\\/  ",
    "   o  888888888  8888888888888 88888888888 8888/_\\  ",
    "   |__Y8888888P  8888888888888 Y888888888P ________ ",
    "  |888|______________________________________/      ",
    "  |8888888888888888888888888888888888888888888/     ",
    "  \\888o888o888o888o888o888o888o888o888o88888P       ",
    "   \\8888888888888888888888888888888888888888P       ",
    "    `\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"'         ",
    "                                                    ",
  ],
  [
    "                       |8888b                       ",
    "                       |88888<                      ",
    "                    =======                         ",
    "                    q88888p         |               ",
    "          |            |        =========           ",
    "       =======    ===========   888888888  8\\       ",
    "       8888888    88888888888   Y8888888P  88\\      ",
    "       Y88888P    Y888888888P       |      888\\     ",
    "          |            |       =========== 8888\\    ",
    "      =========  ============= 88888888888 88888\\/  ",
    "   o  888888888  8888888888888 88888888888 8888/_\\  ",
    "   |__Y8888888P  8888888888888 Y888888888P ________ ",
    "  |888|______________________________________/      ",
    "  |8888888888888888888888888888888888888888888/     ",
    "  \\888o888o888o888o888o888o888o888o888o88888P       ",
    "   \\8888888888888888888888888888888888888888P       ",
    "    `\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"'         ",
    "                                                    ",
  ],
];
const SHIP_INK: string[][] = [
  [
    "                       cdddddd                      ",
    "                       cdddddd                      ",
    "                    ccccccc                         ",
    "                    aaaaaaa         c               ",
    "          c            c        ccccccccc           ",
    "       ccccccc    ccccccccccc   aaaaaaaaa  aa       ",
    "       aaaaaaa    aaaaaaaaaaa   aaaaaaaaa  aaa      ",
    "       aaaaaaa    aaaaaaaaaaa       c      aaaa     ",
    "          c            c       ccccccccccc aaaaa    ",
    "      ccccccccc  ccccccccccccc aaaaaaaaaaa aaaaaac  ",
    "   e  aaaaaaaaa  aaaaaaaaaaaaa aaaaaaaaaaa aaaacca  ",
    "   cbbaaaaaaaaa  aaaaaaaaaaaaa aaaaaaaaaaa cccccccc ",
    "  bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb      ",
    "  bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb     ",
    "  bbbbfbbbfbbbfbbbfbbbfbbbfbbbfbbbfbbbfbbbbbb       ",
    "   bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb       ",
    "    bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb         ",
    "                                                    ",
  ],
  [
    "                       cdddddd                      ",
    "                       cdddddd                      ",
    "                    ccccccc                         ",
    "                    aaaaaaa         c               ",
    "          c            c        ccccccccc           ",
    "       ccccccc    ccccccccccc   aaaaaaaaa  aa       ",
    "       aaaaaaa    aaaaaaaaaaa   aaaaaaaaa  aaa      ",
    "       aaaaaaa    aaaaaaaaaaa       c      aaaa     ",
    "          c            c       ccccccccccc aaaaa    ",
    "      ccccccccc  ccccccccccccc aaaaaaaaaaa aaaaaac  ",
    "   e  aaaaaaaaa  aaaaaaaaaaaaa aaaaaaaaaaa aaaacca  ",
    "   cbbaaaaaaaaa  aaaaaaaaaaaaa aaaaaaaaaaa cccccccc ",
    "  bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb      ",
    "  bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb     ",
    "  bbbbfbbbfbbbfbbbfbbbfbbbfbbbfbbbfbbbfbbbbbb       ",
    "   bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb       ",
    "    bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb         ",
    "                                                    ",
  ],
  [
    "                       cddddd                       ",
    "                       cdddddd                      ",
    "                    ccccccc                         ",
    "                    aaaaaaa         c               ",
    "          c            c        ccccccccc           ",
    "       ccccccc    ccccccccccc   aaaaaaaaa  aa       ",
    "       aaaaaaa    aaaaaaaaaaa   aaaaaaaaa  aaa      ",
    "       aaaaaaa    aaaaaaaaaaa       c      aaaa     ",
    "          c            c       ccccccccccc aaaaa    ",
    "      ccccccccc  ccccccccccccc aaaaaaaaaaa aaaaaac  ",
    "   e  aaaaaaaaa  aaaaaaaaaaaaa aaaaaaaaaaa aaaacca  ",
    "   cbbaaaaaaaaa  aaaaaaaaaaaaa aaaaaaaaaaa cccccccc ",
    "  bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb      ",
    "  bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb     ",
    "  bbbbfbbbfbbbfbbbfbbbfbbbfbbbfbbbfbbbfbbbbbb       ",
    "   bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb       ",
    "    bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb         ",
    "                                                    ",
  ],
];
const LEFT = 15, TOP = 4; // where the ship's box sits
const KEEL = 17; // the box's last row, at the waterline, which never leans

const LOOP = 4; // seconds a pitch takes
const LEAN = 1.4; // columns the trucks swing either way
const RI = 12.4; // the inner ring's height in rows; it is twice as wide in columns
const WROW = 20; // the first row of sea
// The sea's rows, near to far, and how many columns a second each rolls: a whole pattern in a loop.
const SEA = ["~^~-~~-~", " ~-  ~~ ", "-  ~    ", "  .  ~  "];
const SPEED = [2, -2, 2, -4];
const LAMP = 4, FLARE = 11, SEA0 = 8, SEA1 = 9, SEA2 = 10;

export default function queenAnnesRevenge(): Frame {
  const { cols, rows } = meta;
  const n = cols * rows;
  const base = BASE.join("").split(""), baseInk = BASE_INK.join("").split("").map((c) => c.charCodeAt(0) - 97);
  // Inside the inner ring, where the ship and the sea are drawn.
  const inside = new Uint8Array(n);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) inside[y * cols + x] = ((x - 39.5) / (2 * (RI - 0.6))) ** 2 + ((y - 15.5) / (RI - 0.6)) ** 2 < 1 ? 1 : 0;
  const ch = new Array<string>(n), ink = new Uint8Array(n);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    for (let i = 0; i < n; i++) (ch[i] = base[i]), (ink[i] = baseInk[i]);
    const ship = SHIP[Math.floor(u * 3) % 3], shipInk = SHIP_INK[Math.floor(u * 3) % 3];
    const lean = LEAN * Math.sin((2 * Math.PI * u) / LOOP);
    for (let y = 0; y < ship.length; y++) {
      const shift = Math.round((lean * (KEEL - y)) / KEEL);
      for (let x = 0; x < ship[y].length; x++) {
        const c = ship[y][x];
        if (c === " ") continue;
        const i = (TOP + y) * cols + LEFT + x + shift;
        if (!inside[i]) continue;
        ch[i] = c;
        ink[i] = shipInk[y].charCodeAt(x) - 97;
      }
    }
    for (let r = 0; r + WROW < rows; r++) {
      const y = WROW + r, pat = SEA[Math.min(r, SEA.length - 1)];
      const shift = Math.floor(u * SPEED[Math.min(r, SPEED.length - 1)]) + r * 3;
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        if (ch[i] !== " " || !inside[i]) continue;
        const c = pat[(((x - shift) % pat.length) + pat.length) % pat.length];
        if (c === " ") continue;
        ch[i] = c;
        ink[i] = r === 0 ? SEA0 : r < 3 ? SEA1 : SEA2;
      }
    }
    // the lantern catches now and then
    const flare = Math.sin(t * 13) + Math.sin(t * 7.3) > 0.6;
    if (color) for (let i = 0; i < n; i++) color[i] = flare && ink[i] === LAMP ? FLARE : ink[i];
    const out: string[] = [];
    for (let y = 0; y < rows; y++) out.push(ch.slice(y * cols, (y + 1) * cols).join(""));
    return out.join("\n");
  };
}
