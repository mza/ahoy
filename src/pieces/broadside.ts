/*
 * broadside: a ship's gun on its truck carriage, side on. The match touches the
 * vent, the gun fires in a blossom of flame, leaps back on its trucks and
 * throws its ball, and a great cloud of powder smoke rolls out and thins away
 * while the crew run it out again.
 *
 * Drawn as a picture first, then each cell given the character whose shape
 * best matches the edge through it, and a fill for what it is made of: # for
 * iron, = for oak, % for the trucks and @ for their tyres. Smoke is drawn
 * behind the gun.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "broadside",
  category: "scenes",
  note: "a ship's cannon fires, leaps back and rolls out in clouds of smoke",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // iron, oak, the trucks, their tyres and the deck, each lit, as drawn and in shadow; then fire, smoke and the ball
  palette: [
    "#c8ccd2", "#8d939c", "#565c65",
    "#a08868", "#7c674b", "#514332",
    "#8a7355", "#6a5840", "#463a2a",
    "#b6bcc4", "#8d939c", "#5f656e",
    "#6b5a44", "#5a4b39", "#3f352a",
    "#fff6c8", "#ffd23f", "#ff8a1f", "#d9411a",
    "#e6e2da", "#b4b0a8", "#807c76", "#4c4a46",
    "#f0ece4",
  ],
} satisfies Meta;

const ART = [
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
  "                ___pp_______pp___________pp___________,ppp                      ",
  "              ,####88#######88###########88############888                      ",
  "         ,pp_p#####88#######88###########88############888                      ",
  "        d##########88#######88###########88############888'                     ",
  "         \"Y'\"\"Y####88#######88###########88PYYPYY'\"\"\"\"\"YYY'                     ",
  "              \"Y###888YYYYYPYYY==ppppppp=ppp===_                                ",
  "                 ,pppp===q_===================='                                ",
  "                p=============================='                                ",
  "               \"==PYppppqpP==========YdpppqpbY='                                ",
  "                YPp@%%%%%%@qY=======\\@%%%%%%%q/'                                ",
  "                \",@%%%@@%%%@/YYYYYYbd%%%%@%%%@b'                                ",
  "                  @%%%%%%%%P        d@%%%%%%%@'                                 ",
  "                  \"Y%%%%%@Y'         \"@%%%%%P'                                  ",
  "                     \"\"\"\"              \"\"\"\"\"                                    ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
  "                                                                                ",
];

const INK = [
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "0000000000000000335fh3333355hh33333333335fh33333333335fffh0000000000000000000000",
  "0000000000000033335fh3333335fh33333333335fh333333333355fgh0000000000000000000000",
  "0000000003333333445fh3344445fh34444444445fh334444444455fgh0000000000000000000000",
  "0000000055555334445fh3344445fh34444444445fh335555555555hhhh000000000000000000000",
  "0000000005555544445fh3345555fh55555555555hhh55555555555hhhh000000000000000000000",
  "0000000000000055555hhh555555hh56666666666666668800000000000000000000000000000000",
  "00000000000000000666666666666666666667777777778800000000000000000000000000000000",
  "00000000000000006888888887767777777788888888778800000000000000000000000000000000",
  "00000000000000068888eeeeec877777777888eeeeec878800000000000000000000000000000000",
  "000000000000000088eebbb99bce777777888e9bb999be8800000000000000000000000000000000",
  "00000000000000008ce99aeeabbe88888888e999aeaabee800000000000000000000000000000000",
  "000000000000000000c9aaabbbbe00000000cc9aaabbbee000000000000000000000000000000000",
  "000000000000000000eebbbbbeee000000000eebbbbbee0000000000000000000000000000000000",
  "000000000000000000000eeee00000000000000eeeee000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
  "00000000000000000000000000000000000000000000000000000000000000000000000000000000",
];

const LOOP = 6;
// It fires just before the loop comes round, so frame 0 is in the blast.
const FIRE = 5.9;
const MUZZLE = [58, 13], VENT = [19, 11];
const DECK = 25; // the deck's row: it and what stands on it stay put as the gun recoils
const FIRE_INK = 15, SMOKE = 19, BALL = 23;
const PUFFS = 40, LIFE = 4.6;
// Round shot stacked on the deck, as [column, row, text].
const SHOT: [number, number, string][] = [[63, 22, "(@)"], [61, 23, "(@)(@)"], [59, 24, "(@)(@)(@)"]];
const TITLE = "B  R  O  A  D  S  I  D  E", RULE = 9;
const RAMP = ".:-=+*#%@";

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export default function broadside(): Frame {
  const { cols, rows } = meta;
  const base = ART.map((l) => l.padEnd(cols));
  const ink = INK.map((l) => l.padEnd(cols, "0"));
  const smoke = new Float32Array(cols * rows);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const d = (((u - FIRE) % LOOP) + LOOP) % LOOP;
    // the recoil: back four cells at once, held, then run out again
    const back = d < 0.12 ? 4 * (d / 0.12) : d < 2 ? 4 : 4 * (1 - ease((d - 2) / 1.4));
    const dx = -Math.round(back);
    const ch: string[][] = [], col: number[][] = [];
    for (let y = 0; y < rows; y++) {
      const shift = y < DECK ? dx : 0;
      ch.push([]);
      col.push([]);
      for (let x = 0; x < cols; x++) {
        const sx = x - shift, inside = sx >= 0 && sx < cols;
        ch[y].push(inside ? base[y][sx] : " ");
        col[y].push(inside ? Math.max(0, parseInt(ink[y][sx], 36) - 3) : 0);
      }
    }
    for (let x = 2; x < cols - 2; x++) (ch[DECK][x] = "═"), (col[DECK][x] = 13);
    for (const [x, y, s] of SHOT) for (let i = 0; i < s.length; i++) (ch[y][x + i] = s[i]), (col[y][x + i] = s[i] === "@" ? 9 : 10);
    const tx = (cols - TITLE.length) >> 1;
    for (let i = 0; i < TITLE.length; i++) (ch[DECK + 3][tx + i] = TITLE[i]), (col[DECK + 3][tx + i] = 1);
    for (let i = 0; i < RULE; i++) {
      (ch[DECK + 3][tx - 3 - i] = "─"), (col[DECK + 3][tx - 3 - i] = 13);
      (ch[DECK + 3][tx + TITLE.length + 2 + i] = "─"), (col[DECK + 3][tx + TITLE.length + 2 + i] = 13);
    }
    const empty = (x: number, y: number) => ch[y][x] === " ";
    const put = (x: number, y: number, c: string, k: number) => {
      x = Math.round(x);
      y = Math.round(y);
      if (x >= 0 && y >= 0 && x < cols && y < rows) (ch[y][x] = c), (col[y][x] = k);
    };
    const [mx0, my] = MUZZLE, mx = mx0 + dx;

    // smoke: puffs thrown out of the muzzle that slow, swell, roll and rise
    smoke.fill(0);
    for (let i = 0; i < PUFFS; i++) {
      const age = d - 0.03 - i * 0.03;
      if (age < 0 || age > LIFE) continue;
      // some puffs are thrown far and some hang at the muzzle, so the cloud billows rather than flies
      const reach = 0.15 + ((i * 7) % 13) / 11;
      const out = ((24 * (1 - Math.exp(-2.4 * age))) / 2.4) * reach;
      const cx = mx0 + 1 + out + Math.sin(age * 1.3 + i * 2.1) * age * 1.1;
      const lift = 0.35 + ((i * 3) % 5) * 0.18;
      const cy = my + (((i * 5) % 9) - 4) * 0.8 * Math.min(1, age * 1.2) - lift * age - 0.12 * age * age;
      const r = 0.7 + 0.85 * age * (0.7 + ((i * 11) % 7) * 0.08), w = (1 - age / LIFE) ** 1.3 * 0.9;
      for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
        for (let x = Math.floor(cx - 2 * r - 2); x <= cx + 2 * r + 2; x++) {
          if (x < 0 || y < 0 || x >= cols || y >= DECK - 1) continue;
          const e = ((x - cx) / (2 * r)) ** 2 + ((y - cy) / r) ** 2;
          if (e < 1.6) smoke[y * cols + x] += w * 0.6 * Math.exp(-2 * e);
        }
    }
    // a wisp from the muzzle while the gun stands, and the match at the vent
    if (d > LIFE && d < FIRE + 0.1) {
      const k = d - LIFE;
      for (let j = 0; j < 4; j++) {
        const y = my - 1 - j - ((k * 1.5) % 1);
        put(mx + 1 + Math.sin(k * 2 + j) * 0.8, y, j < 2 ? ":" : ".", SMOKE + 2 + (j >> 1));
      }
    }
    for (let y = 0; y < DECK; y++)
      for (let x = 0; x < cols; x++) {
        const s = smoke[y * cols + x];
        if (s < 0.05 || !empty(x, y)) continue;
        ch[y][x] = RAMP[Math.min(RAMP.length - 1, Math.floor((s - 0.05) * 6))];
        col[y][x] = SMOKE + (s > 1 ? 0 : s > 0.55 ? 1 : s > 0.25 ? 2 : 3);
      }
    const fuse = (((u - (FIRE - 0.7)) % LOOP) + LOOP) % LOOP;
    if (fuse < 0.72) {
      const [vx, vy] = VENT;
      put(vx + dx, vy - 1, Math.floor(fuse * 20) % 2 ? "*" : "+", FIRE_INK + 1 + (Math.floor(fuse * 20) % 2));
      if (fuse > 0.4) put(vx + dx, vy - 2, "'", FIRE_INK + 3);
    }
    // the ball, streaking off
    if (d < 0.5) {
      const bx = mx + 3 + d * 140, by = my - d * 2;
      put(bx, by, "O", BALL);
      for (let j = 1; j < 6; j++) put(bx - j, by + j * 0.05, j < 3 ? "=" : "-", SMOKE + Math.min(3, j >> 1));
    }
    // the blossom of fire at the muzzle
    if (d < 0.4) {
      const k = d < 0.08 ? d / 0.08 : 1 - (d - 0.08) / 0.32, R = 1 + 4.5 * k;
      for (let y = Math.floor(my - R); y <= my + R; y++)
        for (let x = mx + 1; x <= mx + 1 + 4 * R; x++) {
          const ex = (x - mx - 1 - 1.6 * R) / (2.2 * R), ey = (y - my) / R, e = ex * ex + ey * ey;
          if (e > 1) continue;
          const ragged = Math.sin(x * 1.7 + y * 3.1 + d * 40) * 0.18;
          const heat = 1 - e + ragged;
          if (heat < 0.05) continue;
          put(x, y, heat > 0.75 ? "@" : heat > 0.5 ? "#" : heat > 0.3 ? "*" : "+", FIRE_INK + (heat > 0.75 ? 0 : heat > 0.5 ? 1 : heat > 0.3 ? 2 : 3));
        }
    }
    if (color) for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) color[y * cols + x] = ch[y][x] === " " ? 0 : col[y][x];
    return ch.map((r) => r.join("")).join("\n");
  };
}
