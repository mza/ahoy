/*
 * cutlass: a pirate's cutlass, its curved blade sweeping up across the frame
 * from a basket hilt with a knuckle bow, a red tassel hanging from the
 * pommel. A gleam runs up the blade to glint at the point, and the tassel
 * swings.
 *
 * The blade is lit steel in a density ramp, honed bright along its edge with
 * the fuller cut dark along its back, so it reads in one ink as well.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "cutlass",
  category: "scenes",
  note: "a pirate's cutlass with a red tassel, a gleam running up the blade",
  cols: 80,
  rows: 32,
  fps: 15,
  ground: "#000000",
  // steel from dark to light, the tassel's red and its shade, and the gleam
  palette: ["#2f353b", "#525a62", "#7f8891", "#b4bcc4", "#eef2f5", "#c8102e", "#7a0a1c", "#ffffff"],
} satisfies Meta;

// The still: each cell's character and colour, and for the blade how far along it the cell is, 0 at the guard to z at the point.
const ART = [
  "                                                                                ",
  "                                                                             ,  ",
  "                                                                            ,+) ",
  "                                                                           ,=*` ",
  "                                                                          p=*#  ",
  "                                                                        op=*#b  ",
  "                                                                    __p==+*##)  ",
  "                                                                  p====++*##P   ",
  "                                                                ,p===+***##%)   ",
  "                                                               ,=-=++**####b    ",
  "                                                              p=-=++**###%P     ",
  "                                                            ,=-=++**####%\"      ",
  "                                                          ,p===+**####%P`       ",
  "                                                        ,p==--+**####%`         ",
  "                                                      ,p==-:-**####%\"           ",
  "                                                    ,p==-:-**####%P`            ",
  "                                                  op==--=*#####%P`              ",
  "                                               ,p==---+*####%%\"`                ",
  "                                            ,p==---=*#####%P\"                   ",
  "                                        _op==---=*#####%%P`                     ",
  "                                    _op===---=*#####%%P\"                        ",
  "                      (pp     __opp==---==*#####%%%P\"                           ",
  "                      \"@@qopp===---==+*#####%%%P\"`                              ",
  "                ___oopp@@@+++==+*######%%%PP\"\"                                  ",
  "       pp@@qpp++++++++++@@#####%%%%%%PP\"\"                                       ",
  "      (@@@@%%====+=PPP\"\"%%%%%PPP\"\"\"                                             ",
  "       Y@%%%P\"\"\"        d%%                                                     ",
  "         \"Y%%qo         (##)                                                    ",
  "           \"Y%%%qo___  __#%b                                                    ",
  "              \"\"Y%%%%%%%%%P\"                                                    ",
  "                   \"\"\"\"\"\"                                                       ",
  "                                                                                ",
];
const INK = [
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000200",
  "00000000000000000000000000000000000000000000000000000000000000000000000000001230",
  "00000000000000000000000000000000000000000000000000000000000000000000000000022340",
  "00000000000000000000000000000000000000000000000000000000000000000000000000112300",
  "00000000000000000000000000000000000000000000000000000000000000000000000021223300",
  "00000000000000000000000000000000000000000000000000000000000000000000221112233400",
  "00000000000000000000000000000000000000000000000000000000000000000021111223334000",
  "00000000000000000000000000000000000000000000000000000000000000002211222333334000",
  "00000000000000000000000000000000000000000000000000000000000000022112223333340000",
  "00000000000000000000000000000000000000000000000000000000000000211222333333400000",
  "00000000000000000000000000000000000000000000000000000000000022112223333344000000",
  "00000000000000000000000000000000000000000000000000000000002211222333334440000000",
  "00000000000000000000000000000000000000000000000000000000221111233333344000000000",
  "00000000000000000000000000000000000000000000000000000022111112333334400000000000",
  "00000000000000000000000000000000000000000000000000002211111233333444000000000000",
  "00000000000000000000000000000000000000000000000000221111123333344400000000000000",
  "00000000000000000000000000000000000000000000000221111123333334440000000000000000",
  "00000000000000000000000000000000000000000000222111112333334440000000000000000000",
  "00000000000000000000000000000000000000002222111112333334444000000000000000000000",
  "00000000000000000000000000000000000022221111123333334444000000000000000000000000",
  "00000000000000000000004440000022222211111223333334444000000000000000000000000000",
  "00000000000000000000004444222211111122333333344444000000000000000000000000000000",
  "00000000000000002222222444222222333333334444440000000000000000000000000000000000",
  "00000004444422222222222244333333344444444000000000000000000000000000000000000000",
  "00000044444431111211111244444444444000000000000000000000000000000000000000000000",
  "00000004444331120000000033300000000000000000000000000000000000000000000000000000",
  "00000000044444400000000033330000000000000000000000000000000000000000000000000000",
  "00000000000444444444400443330000000000000000000000000000000000000000000000000000",
  "00000000000000444444444444440000000000000000000000000000000000000000000000000000",
  "00000000000000000004444440000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
];
const ALONG = [
  "                                                                                ",
  "                                                                             z  ",
  "                                                                            zzz ",
  "                                                                           yyyy ",
  "                                                                          xxxx  ",
  "                                                                        wwwwwx  ",
  "                                                                    uuuuvvvwww  ",
  "                                                                  sttttuuuuvv   ",
  "                                                                rrssssttttuuu   ",
  "                                                               qqrrrrssssttt    ",
  "                                                              pppqqqrrrrsss     ",
  "                                                            noooppppqqrrrr      ",
  "                                                          mmnnnoooopppqqq       ",
  "                                                        klllmmnnnnooopp         ",
  "                                                      jjjkklllmmmnnno           ",
  "                                                    hiiijjkkkllllmmn            ",
  "                                                  ggghhiijjjkkklll              ",
  "                                               eeeffggghiiijjjkk                ",
  "                                            bccddeeffggghhiii                   ",
  "                                        9aaabbccddeefffgggh                     ",
  "                                    677899aaabbccddeeeff                        ",
  "                              3345566777899aaabbcccde                           ",
  "                          112233445566777899aaabbc                              ",
  "                          0112233445566778899a                                  ",
  "                          011223334555667                                       ",
  "                           11122334                                             ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
];

const LOOP = 4;
const POMMEL = [5, 25];
const RED = 5, DARK = 6, GLEAM = 7, BRIGHT = 4;
// The tassel, row by row under the pommel: its cord, its knot and its fringe.
const TASSEL = ["\\", "|", "(#)", "/|\\", "/|||\\", "|||||"];

export default function cutlass(): Frame {
  const { cols, rows } = meta;
  const along = ALONG.map((line) => [...line].map((c) => (c === " " ? -1 : parseInt(c, 36) / 35)));
  let tip: [number, number] = [0, 0];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (along[y][x] >= along[tip[1]][tip[0]]) tip = [x, y];

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const grid = ART.map((line) => [...line]);
    const ink = INK.map((line) => [...line].map((c) => parseInt(c, 36)));
    const set = (x: number, y: number, c: string, k: number) => {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return;
      grid[y][x] = c;
      ink[y][x] = k;
    };

    // the gleam runs from the guard to the point in a second, then the point glints
    const g = (u - 0.4) / 1.1;
    if (g >= 0 && g <= 1)
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const a = along[y][x];
          if (a < 0) continue;
          const d = Math.abs(a - g);
          if (d < 0.03 && grid[y][x] !== " ") set(x, y, "@", GLEAM);
          else if (d < 0.07 && grid[y][x] !== " ") ink[y][x] = BRIGHT;
        }
    const glint = u - 1.5;
    if (glint >= 0 && glint < 0.6) {
      const [x, y] = tip, r = glint < 0.15 || glint > 0.45 ? 1 : 2;
      set(x, y, "*", GLEAM);
      for (let i = 1; i <= r; i++) {
        set(x - 2 * i, y, "-", BRIGHT);
        set(x + 2 * i, y, "-", BRIGHT);
        set(x, y - i, "|", BRIGHT);
        set(x, y + i, "|", BRIGHT);
      }
    }

    // the tassel swings from the pommel
    const sway = Math.sin((u / LOOP) * Math.PI * 2) * 1.6;
    TASSEL.forEach((line, j) => {
      const dx = Math.round((sway * (j + 1)) / TASSEL.length);
      const x0 = POMMEL[0] - (line.length >> 1) + dx, y = POMMEL[1] + 1 + j;
      [...line].forEach((c, i) => set(x0 + i, y, c, j === 2 ? DARK : RED));
    });

    if (color) for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) color[y * cols + x] = ink[y][x];
    return grid.map((r) => r.join("")).join("\n");
  };
}
