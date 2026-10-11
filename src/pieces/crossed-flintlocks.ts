/*
 * crossed-flintlocks: a skull over a brace of crossed flintlock pistols, for
 * Anne Bonny and Mary Read. Now one pistol fires and now the other: the flint
 * sparks in the pan, flame leaps from the muzzle, and a curl of smoke drifts
 * off and thins away while the skull's eyes catch the light.
 *
 * Drawn by hand: the barrels run a cell across for every row, so they come out
 * as clean diagonals; 8 is bone, = steel, % walnut and @ brass. Smoke is drawn
 * behind it.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "crossed flintlocks",
  category: "scenes",
  note: "a skull over crossed flintlocks that fire by turns, in curls of smoke",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone, steel, walnut and brass, each lit, as drawn and in shadow; then the flash, the smoke and the eyes
  palette: [
    "#f4eee0", "#d9cfb8", "#a39880",
    "#d6dbe2", "#9aa3ad", "#646c76",
    "#a08868", "#7c674b", "#514332",
    "#ffd36a", "#d9a531", "#9a6f18",
    "#fff6c8", "#ffd23f", "#ff8a1f", "#d9411a",
    "#e6e2da", "#b4b0a8", "#807c76", "#4c4a46",
    "#ff5a1f", "#7a1a08",
  ],
} satisfies Meta;

const ART = [
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                         ,@@,_                    _,@@,                         ",
  "                          \\@@\\                    /@@/                          ",
  "                           \\==\\                  /==/                           ",
  "                            \\==\\                /==/                            ",
  "                             \\==\\              /==/                             ",
  "                              \\==\\            /==/                              ",
  "                               \\= _,pp888qq,_ ==/                               ",
  "                               ,pd88888888888bq, /                              ",
  "                              d88888888888888888b                               ",
  "                             d8888888888888888888b                              ",
  "                             d8P\"\"\"\"Y88888P\"\"\"\"Y8b                              ",
  "                             88'    `88888'    `88                              ",
  "                             88b    d88888b    d88                              ",
  "                             `Y8b,,d88P\"Y88b,,d8P'                              ",
  "                               `Y8888P   Y8888P'                                ",
  "                            ,-. Y8|8|8|8|8|8|8P  .-,                            ",
  "                          ( (   `Y8b8b8b8d8d8P'    ) )                          ",
  "                          \\ \\  || /==/%/ %\\==\\ ||  / /                          ",
  "                              _.@@@@@/%/ %\\@@@@@._                              ",
  "                           ,@@@@@@@/%%/  \\%%\\@@@@@@@,                           ",
  "                         (@@@@@@@'%%/      \\%%`@@@@@@@)                         ",
  "                      d%%%%P\\ ' /              \\ ` /Y%%%%b                      ",
  "                    d%%%%P  `-'                  `-'  Y%%%%b                    ",
  "                   d%%%%P                              Y%%%%b                   ",
  "                 d%%%%P                                  Y%%%%b                 ",
  "                d%%%P                                      Y%%%b                ",
  "             ,@@@@b                                          d@@@@,             ",
  "            @@@@@@                                            @@@@@@            ",
  "           `@@@@'                                              `@@@@'           ",
];

const INK = [
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "0000000000000000000000000ddddd00000000000000000000ddddd0000000000000000000000000",
  "00000000000000000000000000dddd00000000000000000000dddd00000000000000000000000000",
  "00000000000000000000000000077770000000000000000007777000000000000000000000000000",
  "00000000000000000000000000007777000000000000000077770000000000000000000000000000",
  "00000000000000000000000000000777700000000000000777700000000000000000000000000000",
  "00000000000000000000000000000077770000000000007777000000000000000000000000000000",
  "00000000000000000000000000000007703333333333507770000000000000000000000000000000",
  "0000000000000000000000000000000333333333333355550a000000000000000000000000000000",
  "00000000000000000000000000000033333333333333555550000000000000000000000000000000",
  "00000000000000000000000000000333333333333333555555000000000000000000000000000000",
  "00000000000000000000000000000333333333333333555555000000000000000000000000000000",
  "00000000000000000000000000000333000033333330000555000000000000000000000000000000",
  "00000000000000000000000000000333000033333330000555000000000000000000000000000000",
  "00000000000000000000000000000333333333333333555555000000000000000000000000000000",
  "00000000000000000000000000000005555555000555555500000000000000000000000000000000",
  "00000000000000000000000000006660555555555555555006660000000000000000000000000000",
  "00000000000000000000000000606000555555555555555000060600000000000000000000000000",
  "00000000000000000000000000707007707777ab0a77770770070700000000000000000000000000",
  "000000000000000000000000000000ddddddddab0adddddddd000000000000000000000000000000",
  "000000000000000000000000000dddddddddaab00baaddddddddd000000000000000000000000000",
  "0000000000000000000000000dddddddddaab000000baaddddddddd0000000000000000000000000",
  "0000000000000000000000aaaaaad0d0d00000000000000d0d0daaaaaa0000000000000000000000",
  "00000000000000000000aaaaaa00ddd000000000000000000ddd00aaaaaa00000000000000000000",
  "0000000000000000000aaaaaa000000000000000000000000000000aaaaaa0000000000000000000",
  "00000000000000000bbbbbb0000000000000000000000000000000000bbbbbb00000000000000000",
  "0000000000000000bbbbb00000000000000000000000000000000000000bbbbb0000000000000000",
  "0000000000000dddddd000000000000000000000000000000000000000000dddddd0000000000000",
  "000000000000dddddd00000000000000000000000000000000000000000000dddddd000000000000",
  "00000000000eeeeee0000000000000000000000000000000000000000000000eeeeee00000000000",
];

const LOOP = 8;
// When each pistol fires, in seconds into the loop: the right-hand one just before the loop starts, so frame 0 is in the flash.
const SHOTS: [number, number][] = [[7.75, 0], [3.75, 1]];
// Each pistol's muzzle and pan as [column, row], and the way its barrel points, across and up the page.
const MUZZLES = [[54, 3], [25, 3]];
const PANS = [[32, 20], [47, 20]];
const DIRS = [[0.94, -0.34], [-0.94, -0.34]];
const EYES = [[34, 14], [44, 14]];
const FLASH = 12, SMOKE = 16, EMBER = 20, DIM = 21;
const PUFFS = 16, LIFE = 2.8;
// Smoke by how thick it is, thinnest first.
const RAMP = ".:-=+*#%@";

export default function crossedFlintlocks(): Frame {
  const { cols, rows } = meta;
  const base = ART.map((l) => l.padEnd(cols));
  const ink = INK.map((l) => l.padEnd(cols, "0"));
  const empty = base.map((l) => [...l].map((c) => c === " "));
  const smoke = new Float32Array(cols * rows);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const ch = base.map((l) => [...l]);
    const col = ink.map((l) => [...l].map((c) => Math.max(0, parseInt(c, 16) - 3)));
    const put = (x: number, y: number, c: string, k: number) => {
      x = Math.round(x);
      y = Math.round(y);
      if (x >= 0 && y >= 0 && x < cols && y < rows) (ch[y][x] = c), (col[y][x] = k);
    };
    smoke.fill(0);
    let lit = 0;
    for (const [at, gun] of SHOTS) {
      const d = (((u - at) % LOOP) + LOOP) % LOOP;
      const [mx, my] = MUZZLES[gun], [dx, dy] = DIRS[gun], [px, py] = PANS[gun];
      if (d < 1.4) lit = Math.max(lit, 1 - d / 1.4);
      // the spark in the pan
      if (d < 0.2) {
        put(px, py - 1, "*", FLASH);
        put(px - 1, py - 1, d < 0.1 ? "+" : ".", FLASH + 1);
        put(px + 1, py - 2, d < 0.1 ? "'" : ".", FLASH + 2);
      }
      // smoke: puffs thrown out of the muzzle that slow, rise, curl and thin
      for (let i = 0; i < PUFFS; i++) {
        const age = d - 0.12 - i * 0.045;
        if (age < 0 || age > LIFE) continue;
        const out = (16 * (1 - Math.exp(-2.8 * age))) / 2.8;
        const cx = mx + dx * out * 2 + Math.sin(age * 2.2 + i * 1.7) * age * 1.6;
        const cy = my + dy * out - 0.35 * age;
        const r = 0.7 + 1.2 * age, w = (1 - age / LIFE) ** 1.5 * (1.1 - (i % 3) * 0.15);
        for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
          for (let x = Math.floor(cx - 2 * r - 2); x <= cx + 2 * r + 2; x++) {
            if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
            const e = ((x - cx) / (2 * r)) ** 2 + ((y - cy) / r) ** 2;
            if (e < 1.6) smoke[y * cols + x] += w * Math.exp(-2 * e);
          }
      }
    }
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const s = smoke[y * cols + x];
        if (s < 0.06 || !empty[y][x]) continue;
        const k = Math.min(RAMP.length - 1, Math.floor((s - 0.06) * 7));
        ch[y][x] = RAMP[k];
        col[y][x] = SMOKE + (s > 0.9 ? 0 : s > 0.5 ? 1 : s > 0.25 ? 2 : 3);
      }
    // the flash, over the smoke: a cone of flame out of the muzzle
    for (const [at, gun] of SHOTS) {
      const d = (((u - at) % LOOP) + LOOP) % LOOP;
      if (d < 0.08 || d > 0.5) continue;
      const [mx, my] = MUZZLES[gun], [dx, dy] = DIRS[gun];
      const k = d < 0.3 ? 1 : 1 - (d - 0.3) / 0.2, len = 1 + Math.round(6 * k);
      for (let s = 1; s <= len; s++) {
        const spread = Math.round((s * 0.6) * k);
        for (let o = -spread; o <= spread; o++) {
          const far = s / len, edge = Math.abs(o) / (spread + 1);
          const heat = (1 - far) * (1 - edge * 0.7);
          const c = heat > 0.6 ? "@" : heat > 0.4 ? "#" : heat > 0.2 ? "*" : "+";
          put(mx + dx * s * 1.6 - dy * o * 2, my + dy * s * 0.8 + dx * o * 0.5, c, FLASH + (heat > 0.6 ? 0 : heat > 0.4 ? 1 : heat > 0.2 ? 2 : 3));
        }
      }
    }
    // the eyes: an ember in each socket, flaring as a pistol fires
    EYES.forEach(([x, y], i) => {
      const f = 0.5 + 0.5 * Math.sin(u * 3.1 + i * 2);
      if (lit > 0.5) put(x, y, "o", EMBER);
      else if (lit > 0.1 || f > 0.7) put(x, y, "*", lit > 0.1 ? EMBER : DIM);
      else put(x, y, ".", DIM);
    });
    if (color) for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) color[y * cols + x] = ch[y][x] === " " ? 0 : col[y][x];
    return ch.map((r) => r.join("")).join("\n");
  };
}
