/*
 * dead-mans-chest: "fifteen men on the dead man's chest, yo ho ho and a
 * bottle of rum". An iron-bound chest, XV carved in its lid and a skull for a
 * padlock, a bottle of rum leaning on it. The lid creaks up and gold light
 * spills out of the crack, coins glinting, then it slams shut, the chest
 * jumps and dust puffs out from under it.
 *
 * Drawn in characters: the iron in double lines, the wood in plank grain,
 * the light in shade blocks.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "dead man's chest",
  category: "scenes",
  note: "an iron-bound chest with a skull lock, gold light spilling from its lid",
  cols: 80,
  rows: 32,
  fps: 15,
  ground: "#000000",
  // iron and bone, wood light to dark, gold dim to bright, the glass, dust
  palette: ["#efe9dc", "#b8b0a0", "#7d776c", "#4c4842", "#8a6a1c", "#d9a520", "#ffd25e", "#fff1b8", "#9aa39b", "#5a5650"],
} satisfies Meta;

const IRON = 0, WOOD = 1, GRAIN = 2, SHADE = 3, GOLD0 = 4, GOLD1 = 5, GOLD2 = 6, GOLD3 = 7, GLASS = 8, DUST = 9;

const LOOP = 6;
// The chest's box, in cells: its left and right columns, the lid's top row, the seam and the foot.
const X0 = 11, X1 = 57, TOP = 6, SEAM = 14, FOOT = 25;
const MID = (X0 + X1) / 2; // the middle column
const DOME = 4; // rows the lid's dome rises

// The skull that locks it, hung from the hasp, and the bottle, upright before it leans.
const SKULL = [
  "  .-''-.  ",
  " / _  _ \\ ",
  "| (O)(O) |",
  " \\  /\\  / ",
  "  |vvvv|  ",
  "  '----'  ",
];
const BOTTLE = [
  "   [=]   ",
  "   | |   ",
  "   | |   ",
  "  /   \\  ",
  " /     \\ ",
  "|  XXX  |",
  "|  RUM  |",
  "|       |",
  "|       |",
  "'-------'",
];
const CARVE = ["\\ /  \\ /", " X    V ", "/ \\     "];
const SONG = "FIFTEEN MEN ON THE DEAD MAN'S CHEST";

// How far the lid is up, in rows, at u seconds into the loop: open as it starts, slammed shut, then creaking up again.
function lift(u: number) {
  if (u < 2.3) return 3;
  if (u < 2.38) return 2;
  if (u < 2.45) return 1;
  if (u < 4.4) return 0;
  if (u < 4.9) return 1;
  if (u < 5.4) return 2;
  return 3;
}

// A hash of a cell and a step of time, for glints and grain that do not crawl.
const hash = (a: number, b: number) => {
  let h = Math.imul(a * 374761393 + b * 668265263, 0x27d4eb2d);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
};

export default function deadMansChest(): Frame {
  const { cols, rows } = meta;
  const n = cols * rows;
  const ch = new Array<string>(n), ink = new Uint8Array(n);
  const put = (x: number, y: number, c: string, k: number) => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return;
    ch[y * cols + x] = c;
    ink[y * cols + x] = k;
  };
  const text = (x: number, y: number, s: string, k: number) => {
    for (let i = 0; i < s.length; i++) if (s[i] !== " ") put(x + i, y, s[i], k);
  };
  // text that covers what is under it, from its first character to its last
  const solid = (x: number, y: number, s: string, k: number) => {
    const a = s.search(/\S/), b = s.length - [...s].reverse().join("").search(/\S/);
    for (let i = a; i >= 0 && i < b; i++) put(x + i, y, s[i], k);
  };
  const W = X1 - X0;
  const straps = [X0 + 7, X1 - 7];
  // the lid's dome: how many columns in from each end its top is at a row of the dome
  const inset = (r: number) => Math.round((W / 2) * (1 - Math.sqrt(1 - ((DOME - r) / (DOME + 1.5)) ** 2)));

  // wood between the iron: plank seams every third row, and grain that stays put
  const wood = (x: number, y: number) => {
    if (y % 3 === 0) put(x, y, "_", GRAIN);
    else {
      const g = hash(x, y);
      put(x, y, g < 0.18 ? "-" : g < 0.26 ? "~" : g < 0.3 ? "." : " ", g < 0.26 ? WOOD : GRAIN);
    }
  };
  const iron = (x: number, y: number, c: string) => put(x, y, c, IRON);

  const body = (dx: number) => {
    for (let y = SEAM + 1; y < FOOT; y++)
      for (let x = X0 + 1; x < X1; x++) wood(x + dx, y);
    for (let x = X0; x <= X1; x++) iron(x + dx, SEAM + 1, "═"), iron(x + dx, FOOT, "═");
    for (let y = SEAM + 1; y <= FOOT; y++) {
      iron(X0 + dx, y, "║");
      iron(X1 + dx, y, "║");
      for (const s of straps) iron(s + dx, y, "║"), iron(s + 1 + dx, y, "║");
    }
    iron(X0 + dx, SEAM + 1, "╔"), iron(X1 + dx, SEAM + 1, "╗"), iron(X0 + dx, FOOT, "╚"), iron(X1 + dx, FOOT, "╝");
    for (const s of straps) for (const y of [SEAM + 1, FOOT]) iron(s + dx, y, "o"), iron(s + 1 + dx, y, "o");
    // feet
    text(X0 + 1 + dx, FOOT + 1, "\\__/", IRON);
    text(X1 - 4 + dx, FOOT + 1, "\\__/", IRON);
  };

  const lid = (dx: number, up: number) => {
    const top = TOP - up, seam = SEAM - up;
    for (let y = top; y <= seam; y++) {
      const r = y - top;
      const i = r < DOME ? inset(r) : 0;
      const a = X0 + i, b = X1 - i;
      for (let x = a + 1; x < b; x++) wood(x + dx, y);
      if (r === 0) for (let x = a; x <= b; x++) iron(x + dx, y, "_");
      else if (r < DOME) {
        // the dome's shoulder: a run of _.- where it falls fast, a slash where it falls a column
        const run = inset(r - 1) - i;
        iron(a + dx, y, run > 1 ? "." : "/");
        iron(b + dx, y, run > 1 ? "." : "\\");
        for (let x = a + 1; x <= X0 + inset(r - 1); x++) iron(x + dx, y, "-");
        for (let x = X1 - inset(r - 1); x < b; x++) iron(x + dx, y, "-");
      } else iron(a + dx, y, "║"), iron(b + dx, y, "║");
      for (const s of straps) if (x0in(s, a, b)) iron(s + dx, y, r === 0 ? "_" : "║"), iron(s + 1 + dx, y, r === 0 ? "_" : "║");
    }
    for (let x = X0; x <= X1; x++) iron(x + dx, seam, "═");
    iron(X0 + dx, seam, "╚"), iron(X1 + dx, seam, "╝");
    for (const s of straps) iron(s + dx, seam, "o"), iron(s + 1 + dx, seam, "o");
    // XV, carved in the lid
    CARVE.forEach((l, j) => solid(MID - 4 + dx, top + DOME - 1 + j, l, GOLD0));
    // the hasp
    text(MID - 1 + dx, seam, "[]", IRON);
  };
  const x0in = (s: number, a: number, b: number) => s > a && s + 1 < b;

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    ch.fill(" ");
    ink.fill(0);
    const up = lift(u);
    // the chest jumps as the lid slams
    const dx = u >= 2.45 && u < 2.75 ? (Math.floor(u * 30) % 2 ? 1 : -1) : 0;
    const open = up > 0;

    // light behind the lid, fanning up from the crack in rays that grow with it
    if (open) {
      const reach = up * 3 + Math.round(1.5 + 1.5 * Math.sin(u * 4));
      const RAYS: [number, string][] = [[-3.2, "\\"], [-1.6, "\\"], [-0.6, "|"], [0.6, "|"], [1.6, "/"], [3.2, "/"]];
      for (const [k, c] of RAYS)
        for (let s = 1; s <= reach; s++) {
          const x = Math.round(MID + k * (3 + s * 1.2)), y = SEAM - up - DOME - 3 - s;
          if (y >= 0) put(x, y, c, s < reach - 2 ? GOLD1 : GOLD0);
        }
    }
    lid(dx, up);
    body(dx);

    // the crack: gold, brightest in the middle, glinting with coins
    if (open)
      for (let y = SEAM - up + 1; y <= SEAM; y++)
        for (let x = X0 + 1; x < X1; x++) {
          const d = Math.abs(x - MID) / (W / 2);
          const g = hash(x, Math.floor(u * 8) + y * 13);
          let c = d < 0.35 ? "▓" : d < 0.7 ? "▒" : "░";
          let k = d < 0.35 ? GOLD3 : d < 0.7 ? GOLD2 : GOLD1;
          if (g < 0.12) (c = "o"), (k = GOLD2);
          else if (g < 0.16) (c = "*"), (k = GOLD3);
          put(x + dx, y, c, k);
        }
    // light leaking out sideways from the crack
    if (open)
      for (let s = 1; s < 6; s++) {
        const y = SEAM - (up > 1 ? 1 : 0);
        if (hash(s, Math.floor(u * 10)) < 0.8) put(X0 - s * 2 + dx, y, "-", s < 3 ? GOLD1 : GOLD0), put(X1 + s * 2 + dx, y, "-", s < 3 ? GOLD1 : GOLD0);
      }

    // the skull lock, on the body's hasp
    SKULL.forEach((l, j) => solid(MID - 5 + dx, SEAM + 1 + j, l, IRON));
    // its eyes catch the gold while the lid is up
    put(MID - 2 + dx, SEAM + 3, "O", open ? GOLD2 : IRON);
    put(MID + 1 + dx, SEAM + 3, "O", open ? GOLD2 : IRON);

    // the bottle, leaning on the chest's right side
    BOTTLE.forEach((l, j) => {
      const lean = Math.floor((BOTTLE.length - j) / 3);
      text(X1 + 2 + lean + dx, FOOT - BOTTLE.length + 1 + j, l, GLASS);
    });
    text(X1 + 5 + Math.floor(5 / 3) + dx, FOOT - BOTTLE.length + 6, "XXX", GOLD1);
    text(X1 + 5 + Math.floor(4 / 3) + dx, FOOT - BOTTLE.length + 7, "RUM", GOLD1);

    // coins spilled on the ground, glinting in turn
    const coins: [number, number, string][] = [[X0 - 6, FOOT, "(o)"], [X0 - 2, FOOT + 1, "o"], [X0 + 8, FOOT + 1, "(@)"], [X1 - 12, FOOT + 1, "o"], [X0 - 9, FOOT + 1, "o"]];
    coins.forEach(([x, y, s], i) => {
      const glint = Math.floor(u * 2) % coins.length === i;
      text(x + dx, y, glint ? s.replace(/[o@]/, "*") : s, glint ? GOLD3 : GOLD1);
    });
    // the ground, and dust when it slams
    for (let x = X0 - 10; x <= X1 + 12; x++) put(x, FOOT + 2, hash(x, 1) < 0.5 ? "." : "_", SHADE);
    if (u >= 2.45 && u < 3.2) {
      const k = (u - 2.45) / 0.75;
      for (const side of [-1, 1])
        for (let s = 0; s < 4; s++) {
          const x = Math.round((side < 0 ? X0 : X1) + side * (2 + s * 2 + k * 6)), y = FOOT + 1 - Math.round(k * 2 * hash(s, side + 2));
          put(x, y, k < 0.5 ? "o" : k < 0.8 ? "." : "'", DUST);
        }
    }

    text(Math.round(MID + 6 - SONG.length / 2), FOOT + 4, SONG, GRAIN);
    if (color) color.set(ink);
    const out: string[] = [];
    for (let y = 0; y < rows; y++) out.push(ch.slice(y * cols, (y + 1) * cols).join(""));
    return out.join("\n");
  };
}
