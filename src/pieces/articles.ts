/*
 * articles: the articles of agreement a pirate crew signed before a voyage,
 * on an unrolled scroll. A quill writes them out a line at a time, the crew
 * sign beneath, most with an X, and the captain presses his seal into red wax.
 * It holds a moment, the ink fades away, and the quill begins again.
 *
 * The articles are cut down from Bartholomew Roberts' own, of 1721.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "articles",
  category: "scenes",
  note: "a pirate crew's articles of agreement, quilled out, signed and sealed",
  cols: 80,
  rows: 32,
  fps: 20,
  // ink, fresh ink; the scroll and its grain; the heading; wax, lit; the quill
  palette: ["#ece4d0", "#ffffff", "#a8946c", "#4e4434", "#e0b450", "#c8361c", "#f07850", "#8c8474", "#f4e8c8"],
  ground: "#000000",
} satisfies Meta;

const INK = 0, FRESH = 1, SCROLL = 2, GRAIN = 3, HEAD = 4, WAX = 5, LIT = 6, DIM = 7, QUILL = 8;
const X0 = 3, B = 70; // where the scroll starts, and where its right edge is from there
const TOP = 1;

// The scroll, the classic way: rolled over at the top left and under at the bottom.
const SCROLL_LINES = (() => {
  const body = "    |" + " ".repeat(B - 5) + "|";
  return [
    "  " + "_".repeat(B - 2),
    " / \\" + " ".repeat(B - 4) + "\\",
    "|   |" + " ".repeat(B - 5) + "|",
    " \\_ |" + " ".repeat(B - 5) + "|",
    ...Array.from({ length: 22 }, () => body),
    "    |   " + "_".repeat(B - 8) + "|___",
    "    |  /" + " ".repeat(B - 5) + "/",
    "    \\_/" + "_".repeat(B - 5) + "/",
  ];
})();

const ARTICLES: [string, string][] = [
  ["I.", "Every man has a vote in affairs of moment."],
  ["II.", "Every man to draw fairly, by list, for the prize."],
  ["III.", "No man to game for money, at cards or dice."],
  ["IV.", "Lights and candles out at eight o'clock."],
  ["V.", "Keep your piece, pistols and cutlass clean."],
  ["VI.", "Desert the ship in battle and suffer death."],
  ["VII.", "Quarrels to be ended ashore, by sword and pistol."],
  ["VIII.", "The musicians to have rest on the Sabbath day."],
];
const NAMES = ["B. Roberts", "X", "H. Dennis", "X", "V. Jones", "X"];
const SEAL = ["  .d%%%%%b.  ", ' d%%P"""Y%%b ', "d%%' o o '%%b", "Y%%.  ^  .%%P", " Y%%b===d%%P ", "  'Y%%%%%P'  "];

// A line written in one go: where, what, and the colour of each character.
interface Stroke {
  x: number;
  y: number;
  text: string;
  ink: number[];
  at: number; // when the quill starts it
  cps: number;
}

const WIPE = 3, WIPED = 3.9; // the ink fades between these
const START = 4.1; // the quill sets to work

const hash = (n: number) => {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function strokes() {
  const left = X0 + 9, out: Stroke[] = [];
  let at = START;
  const add = (x: number, y: number, text: string, ink: number[], cps: number, pause = 0.25) => {
    out.push({ x, y, text, ink, at, cps });
    at += text.replace(/ /g, "").length / cps + pause;
  };
  const centre = (y: number, text: string, ink: number, cps: number) =>
    add(X0 + 5 + Math.floor((B - 5 - text.length) / 2), y, text, Array(text.length).fill(ink), cps, 0.35);
  centre(TOP + 3, "~  A R T I C L E S   O F   A G R E E M E N T  ~", HEAD, 34);
  centre(TOP + 4, "aboard the Royal Fortune, anno 1721", DIM, 30);
  ARTICLES.forEach(([n, text], i) => {
    const line = n.padEnd(6) + text;
    add(left, TOP + 5 + 2 * i, line, [...line].map((_, j) => (j < n.length ? WAX : INK)), 32);
  });
  add(left, TOP + 21, "signed,", Array(7).fill(DIM), 20, 0.4);
  let x = left;
  for (const name of NAMES) {
    add(x, TOP + 22, name, Array(name.length).fill(name === "X" ? WAX : INK), name === "X" ? 4 : 16, 0.3);
    x += name.length + 2;
  }
  // the seal goes on once the last mark is made, and it all holds until the wipe comes round again
  return { lines: out, seal: at + 0.3, loop: Math.ceil(at + 1.8) };
}

const { lines: LINES, seal: SEAL_AT, loop: LOOP } = strokes();

export default function articles(): Frame {
  const { cols, rows } = meta;
  const lines = LINES;
  const sealX = X0 + B - 15, sealY = TOP + 20;
  // the grain of the paper: specks scattered inside the scroll
  const grain: [number, number, string][] = [];
  const written = new Set(lines.map((s) => s.y));
  for (let y = TOP + 2; y < TOP + 26; y++)
    if (!written.has(y))
    for (let x = X0 + 6; x < X0 + B - 1; x++) {
      const h = hash(y * cols + x);
      if (h < 0.05) grain.push([x, y, h < 0.015 ? ":" : h < 0.035 ? "." : "'"]);
    }

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    // the end of the last loop holds through the wipe, so the first frame is the finished scroll
    const now = u < WIPED ? LOOP + u : u;
    const ch = new Array<string>(cols * rows).fill(" ");
    const ink = new Uint8Array(cols * rows);
    const put = (x: number, y: number, c: string, i: number) => {
      if (x < 0 || y < 0 || x >= cols || y >= rows) return;
      ch[y * cols + x] = c;
      ink[y * cols + x] = i;
    };
    SCROLL_LINES.forEach((line, j) => [...line].forEach((c, i) => c !== " " && put(X0 + i, TOP + j, c, SCROLL)));
    for (const [x, y, c] of grain) put(x, y, c, GRAIN);

    // how much of the ink is left while it fades
    const fade = u >= WIPE && u < WIPED ? (u - WIPE) / (WIPED - WIPE) : u >= WIPED && u < 4.1 ? 2 : 0;
    const gone = (x: number, y: number) => fade > 0 && hash(y * cols + x + 7) < fade;
    let pen: [number, number] | undefined;
    for (const s of lines) {
      // characters written so far, spaces taking no time
      const typed = Math.floor((now - s.at) * s.cps);
      if (typed < 0) continue;
      let n = 0;
      for (let i = 0; i < s.text.length; i++) {
        const c = s.text[i];
        if (c !== " ") n++;
        if (n > typed) {
          pen = [s.x + i, s.y];
          break;
        }
        if (c === " " || gone(s.x + i, s.y)) continue;
        put(s.x + i, s.y, c, n > typed - 3 ? FRESH : s.ink[i]);
      }
    }

    // the seal, pressed in with a flash, fading with the ink
    if (now >= SEAL_AT) {
      const press = now - SEAL_AT;
      SEAL.forEach((line, j) =>
        [...line].forEach((c, i) => {
          if (c === " " || gone(sealX + i, sealY + j)) return;
          // the wax catches the light along its upper left
          const lit = c === "%" && i + 2 * j < 7;
          put(sealX + i, sealY + j, c, press < 0.12 ? FRESH : lit ? LIT : WAX);
        }),
      );
    }

    if (pen && now < SEAL_AT) {
      // the quill, its nib on the pen's mark, its feather leaning up and away
      const [px, py] = pen;
      put(px, py, "_", FRESH);
      put(px + 1, py - 1, "/", QUILL);
      for (let k = 2; k <= 4; k++) {
        put(px + k, py - k, "/", QUILL);
        put(px + k + 1, py - k, ")", HEAD);
      }
      put(px + 5, py - 5, ",", HEAD);
    } else if (fade === 0) {
      // done: a cursor waits after the last mark
      const last = lines[lines.length - 1];
      if (Math.floor(u / 0.4) % 2 === 0) put(last.x + last.text.length + 1, last.y, "_", FRESH);
    }

    if (color) color.set(ink);
    const out: string[] = [];
    for (let y = 0; y < rows; y++) out.push(ch.slice(y * cols, (y + 1) * cols).join(""));
    return out.join("\n");
  };
}
