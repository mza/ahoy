/*
 * grog: a battered pewter tankard of grog with a skull raised on its front and
 * GROG stamped beneath it, the head of foam heaped over the rim. The foam
 * froths, bubbles rise off it and pop, a drip of grog runs down the side, and
 * now and then a gleam runs round the pewter.
 *
 * The tankard is lit pewter in a density ramp, the skull is dense fill and
 * the stamp is box drawing, so it reads in one ink as well as in colour.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "grog",
  category: "scenes",
  note: "a pewter tankard of grog with a skull on it, its foam frothing over",
  cols: 60,
  rows: 30,
  fps: 12,
  ground: "#000000",
  // pewter from dark to light, bone and its shade, then the grog: gold, bright gold, amber, and the gleam
  palette: ["#33373c", "#585e66", "#858c94", "#b3b9bf", "#e2e6ea", "#f3eee2", "#bdb5a2", "#e3a92b", "#ffd36a", "#9a6a12", "#ffffff"],
} satisfies Meta;

// The still: each cell's character, its colour, and what it is: 1 and 2 pewter, 3 skull, 4 foam, 9 the stamp.
const ART = [
  "                                                            ",
  "                                                            ",
  "                     ,oooo_   _                             ",
  "               ,oppop@0Oo@O0o@0Opq                          ",
  "              p@@@@0000000000ooooo@pqo_                     ",
  "          ,ppoo0O0@@oO0O0@ooO0O@@ooO0O@)                    ",
  "         ,o0@oO@o0@oO@00@OOo00oO@o0@oO@bo_                  ",
  "        p@Oo0oOO@0@Oo0oOo@0@O@0oOo00@O@0oO)                 ",
  "        \"Y@O0o@**##O0o#**+++0==--:::..@0OP                  ",
  "          =++**#%@@@@@%%##**++==--::....b                   ",
  "          =++**#%@@ _,od888bo,_ --::.....%pqo_              ",
  "         (=++**#% ,d88888888888b, ::.....%@@%%q_            ",
  "         (=++**# d888888888888888b :.....\"Y*%@@#q           ",
  "         (=++**# 88P\"   \"8\"   \"Y88 :.....   \"*%@#b_         ",
  "         (=++**# 88     888     88 :.....)   (*%@#b         ",
  "         d=++**# Y8b.  d888b  .d8P :.....)    d*%%*)        ",
  "         d=++**#% \"Y8888P^Y8888P\" ::.....)    .=#%*b        ",
  "         ==++**#%@@ 888 888 888 --::.....b     -*#*b        ",
  "         ==++**#%@@@ \"\"\"\"\"\"\"\"\" =--::.....b    (-*#+)        ",
  "        (==++**#%@@@@%%##**++===--::.....b    d=*+=`        ",
  "        (==++**#%@@@@%%##**++==---::......   p-**=b         ",
  "        (==++**#%                 ::...... ,d=++=P          ",
  "        (==++**#% ╔═╗ ╦═╗ ╔═╗ ╔═╗ ::......-=++=-`           ",
  "        d==++**#% ║ ╦ ╠╦╝ ║ ║ ║ ╦ ::......+=-P\"             ",
  "       _d==+++**# ╚═╝ ╩╚═ ╚═╝ ╚═╝ ::......P\"\"               ",
  "       d---====+*                 ::.......)                ",
  "        -==++**#%@@@%%##**+++==--::.......b                 ",
  "          \"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"\"                    ",
  "                                                            ",
  "                                                            ",
];
const INK = [
  "000000000000000000000000000000000000000000000000000000000000",
  "000000000000000000000000000000000000000000000000000000000000",
  "000000000000000000000555555000500000000000000000000000000000",
  "000000000000000555555555555555555500000000000000000000000000",
  "000000000000005555555555555555555555555000000000000000000000",
  "000000000055555555555555555555555555555500000000000000000000",
  "000000000555555555555555555555555555555555000000000000000000",
  "000000005555555555555555555555555555555555500000000000000000",
  "000000005555555323355533222252111100005555000000000000000000",
  "000000000022223334444444333222211110000000000000000000000000",
  "000000000022223334455555555566661110000003333300000000000000",
  "000000000222223335555555555566666610000004444333000000000000",
  "000000000122223355555555555566666660000002234443300000000000",
  "000000000122223355555555555566666660000000002344332000000000",
  "000000000122223355555555555566666660000000000124432000000000",
  "000000000122223355555555555566666660000000000012432200000000",
  "000000000122223335555555555566666600000000000012342200000000",
  "000000000122223334455555555566661100000000000001332200000000",
  "000000000122223334445555555566611100000000000001332100000000",
  "000000001122223344444433332222111100000000000002321100000000",
  "000000001122223344444433332222111100000000000012211000000000",
  "000000001122223347777777777777777700000000000122110000000000",
  "000000001122223347777777777777777700000000112221100000000000",
  "000000001122223347777777777777777700000000221110000000000000",
  "000000011122222337777777777777777700000000000000000000000000",
  "000000011111122227777777777777777700000000000000000000000000",
  "000000001122223344444433332222111100000000000000000000000000",
  "000000000022223344444333322221111100000000000000000000000000",
  "000000000000000000000000000000000000000000000000000000000000",
  "000000000000000000000000000000000000000000000000000000000000",
];
const PART = [
  "000000000000000000000000000000000000000000000000000000000000",
  "000000000000000000000000000000000000000000000000000000000000",
  "000000000000000000000444444000400000000000000000000000000000",
  "000000000000000444444444444444444400000000000000000000000000",
  "000000000000004444444444444444444444444000000000000000000000",
  "000000000044444444444444444444444444444400000000000000000000",
  "000000000444444444444444444444444444444444000000000000000000",
  "000000004444444444444444444444444444444444400000000000000000",
  "000000004444444111144411111141111111114444000000000000000000",
  "000000000011111111111111111111111111111110000000000000000000",
  "000000000011111111103333333333301111111112222200000000000000",
  "000000000111111110333333333333333011111112222222000000000000",
  "000000000111111103333333333333333301111112222222200000000000",
  "000000000111111103333000333000333301111110002222222000000000",
  "000000000111111103300000333000003301111111000222222000000000",
  "000000000111111103333003333300333301111111000022222200000000",
  "000000000111111110333333333333333011111111000022222200000000",
  "000000000111111111103330333033301111111111000002222200000000",
  "000000000111111111110333333333011111111111000022222200000000",
  "000000001111111111111111111111111111111111000022222200000000",
  "000000001111111111111111111111111111111111000222222000000000",
  "000000001111111119999999999999999911111111022222220000000000",
  "000000001111111119999999999999999911111111222222200000000000",
  "000000001111111119999999999999999911111111222220000000000000",
  "000000011111111119999999999999999911111111122000000000000000",
  "000000011111111119999999999999999911111111110000000000000000",
  "000000001111111111111111111111111111111111100000000000000000",
  "000000000011111111111111111111111111111100000000000000000000",
  "000000000000000000000000000000000000000000000000000000000000",
  "000000000000000000000000000000000000000000000000000000000000",
];

const LOOP = 6;
const FOAM = "oO0@";
const GOLD = 7, BRIGHT = 8, AMBER = 9, GLEAM = 10, BONE = 5;

const hash = (a: number, b: number, c: number) => {
  let h = Math.imul(a * 374761393 + b * 668265263 + c * 2147483647, 1274126177);
  h ^= h >>> 13;
  return ((Math.imul(h, 1103515245) >>> 0) % 1000) / 1000;
};

export default function grog(): Frame {
  const { cols, rows } = meta;
  const part = (x: number, y: number) => PART[y].charCodeAt(x) - 48;
  // The foam's top edge, a column at a time, for the bubbles to rise from.
  const crown: number[] = [];
  for (let x = 0; x < cols; x++) {
    let y = 0;
    while (y < rows && part(x, y) !== 4) y++;
    crown.push(y);
  }
  const froth: number[] = [];
  for (let x = 0; x < cols; x++) if (crown[x] < rows) froth.push(x);
  // The drip's path: down the pewter two cells in from its left edge, from under the foam to the foot.
  const path: [number, number][] = [];
  for (let y = 0; y < rows; y++) {
    const x = [...PART[y]].findIndex((c) => c === "1");
    if (x >= 0 && y > crown[x + 2] + 1) path.push([x + 2, y]);
  }
  // The pewter's span, for the gleam to cross.
  let left = cols, right = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (part(x, y) === 1) (left = Math.min(left, x)), (right = Math.max(right, x));

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const grid = ART.map((line) => [...line]);
    const ink = INK.map((line) => [...line].map((c) => parseInt(c, 36)));
    const set = (x: number, y: number, c: string, k: number) => {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return;
      grid[y][x] = c;
      ink[y][x] = k;
    };

    // the foam froths: a few bubbles in it change every quarter second
    const step = Math.floor(u * 4);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        if (part(x, y) === 4 && FOAM.includes(grid[y][x]) && hash(x, y, step) < 0.18) grid[y][x] = FOAM[Math.floor(hash(y, x, step) * 4)];

    // bubbles rise off the crown and pop
    for (let i = 0; i < 7; i++) {
      const born = (i * LOOP) / 7, age = (u - born + LOOP) % LOOP, life = 1.6;
      if (age > life) continue;
      const x = froth[Math.floor(hash(i, 7, 3) * froth.length)] + (age > 0.8 ? (i & 1 ? 1 : -1) : 0);
      const y = crown[Math.max(0, Math.min(cols - 1, x))] - 1 - Math.floor(age * 2.2);
      set(x, y, age > life - 0.25 ? "*" : age > 0.7 ? "o" : "°", age > life - 0.25 ? BRIGHT : BONE);
    }

    // a drip of grog runs down the side and falls from the foot
    if (path.length) {
      const d = (u / LOOP) * 1.25 * path.length;
      for (let k = 0; k < path.length; k++) {
        const [x, y] = path[k];
        if (k <= d && k > d - 4) set(x, y, k > d - 1 ? "!" : "|", k > d - 1 ? BRIGHT : GOLD);
        else if (k <= d - 4) set(x, y, grid[y][x], ink[y][x]);
      }
      if (d >= path.length && d < path.length + 3) {
        const [x, y] = path[path.length - 1];
        set(x, y + 1 + Math.floor(d - path.length), ".", AMBER);
      }
    }

    // a gleam runs round the pewter now and then
    const g = (u - 3.6) / 0.9;
    if (g >= 0 && g <= 1) {
      const at = left + g * (right - left);
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          if (part(x, y) !== 1 && part(x, y) !== 2) continue;
          const d = Math.abs(x - at - (rows - y) * 0.3);
          if (d < 1) set(x, y, "@", GLEAM);
          else if (d < 2.2 && grid[y][x] !== " ") set(x, y, "%", 4);
        }
    }

    // the stamp warms and cools
    const warm = 0.5 + 0.5 * Math.sin((u / LOOP) * Math.PI * 2);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (part(x, y) === 9 && grid[y][x] !== " ") ink[y][x] = warm > 0.65 ? BRIGHT : GOLD;

    if (color) for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) color[y * cols + x] = ink[y][x];
    return grid.map((r) => r.join("")).join("\n");
  };
}
