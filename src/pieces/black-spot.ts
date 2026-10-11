/*
 * black-spot: the black spot from Treasure Island, a torn round scrap of paper
 * passed to a pirate captain to depose him. It hangs in candlelight and turns
 * over now and then. One side is cut from the last page of a Bible, its verse
 * still on it, with the spot smudged on in charcoal; on the other, DEPOSED is
 * scrawled. The ink is the dark showing through: no paper where it is.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "black spot",
  category: "scenes",
  note: "the black spot from treasure island, turning over in candlelight",
  cols: 64,
  rows: 32,
  fps: 20,
  // paper from shadow to candlelit, charcoal, then the candle's warmth on the torn edge
  palette: ["#2c261e", "#4a4134", "#6e6450", "#968a70", "#bcb092", "#ddd2b4", "#f2ead6", "#333333", "#555555", "#8a5a24", "#d08a3a"],
  ground: "#000000",
} satisfies Meta;

const PAPER = 7; // shades of paper, palette 0 to 6
const CHAR_DIM = 7, CHAR = 8, EMBER_DIM = 9, EMBER = 10;
const LOOP = 8;
const CY = 14.5, RY = 13.2, RX = RY * 2;
const TITLE = "T H E   B L A C K   S P O T";
// Revelation 22:15, from the Bible page the spot was cut from: "Without are dogs, and sorcerers,
// and whoremongers, and murderers, and idolaters", here the words that would have fitted the scrap.
const VERSE = "without·are·dogs·and·sorcerers·and·murderers·and·idolaters·";
const FIBRE = "#########%%#&";

// The scrawl's letters, a cell a pixel, thick-stroked as if in charcoal.
const LETTERS: Record<string, string[]> = {
  D: ["####.", "##.##", "##.##", "##.##", "##.##", "##.##", "####."],
  E: ["#####", "##...", "##...", "####.", "##...", "##...", "#####"],
  P: ["####.", "##.##", "##.##", "####.", "##...", "##...", "##..."],
  O: [".###.", "##.##", "##.##", "##.##", "##.##", "##.##", ".###."],
  S: [".####", "##...", "##...", ".###.", "...##", "...##", "####."],
};
// DEPOSED, each letter a row up or down, as a hand would put it
const WORD = "DEPOSED", DROP = [0, 1, 0, -1, 0, 1, 0];
const WIDE = WORD.length * 6 - 1;

// How far the torn edge comes in at an angle round the scrap.
const tear = (a: number) =>
  0.04 * Math.sin(a * 7 + 1) + 0.03 * Math.sin(a * 13 + 4) + 0.025 * Math.abs(Math.sin(a * 23)) + (Math.abs(a - 2.2) < 0.18 ? 0.09 : 0);

// The turn at u seconds into the loop: still, a quarter-second ease over, still, and back.
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const turn = (u: number) => Math.PI * (ease((u - 3) / 1.1) + ease((u - 7) / 1.0));

export default function blackSpot(): Frame {
  const { cols, rows } = meta;
  const cx = cols / 2;
  // The verse and the fibre, laid out over the scrap's own coordinates.
  const hash = (a: number, b: number) => {
    let h = Math.imul(a * 73856093 ^ b * 19349663, 0x5bd1e995);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  };

  const verseAt = (row: number, col: number) => VERSE[(row * 17 + col) % VERSE.length];
  const fibreAt = (row: number, col: number) => FIBRE[Math.floor(hash(col, row + 99) * FIBRE.length)];
  return (t, { paper = false, color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    // it hangs a little crooked and drifts
    const a = turn(u) + 0.18 * Math.sin(u * ((2 * Math.PI) / LOOP) * 2);
    const ca = Math.cos(a);
    const back = ca < 0;
    // the candle gutters
    const flame = 0.86 + 0.08 * Math.sin(t * 11.3) + 0.05 * Math.sin(t * 27.1 + 1.3) + 0.03 * Math.sin(t * 3.7);
    const lines: string[] = [];
    for (let row = 0; row < rows; row++) {
      let line = "";
      for (let col = 0; col < cols; col++) {
        const k = row * cols + col;
        let ch = " ", c = 0;
        const y = (row + 0.5 - CY) / RY;
        const x = (col + 0.5 - cx) / RX;
        if (Math.abs(ca) < 0.06) {
          // edge on: a thin line of paper
          if (Math.abs(x) < 0.025 && Math.abs(y) < 0.95) (ch = "|"), (c = 3);
        } else {
          // where on the side towards us this cell looks, and where that is on the scrap, whose back is its
          // front mirrored
          const fx = x / Math.abs(ca);
          const r = Math.hypot(fx, y), ang = Math.atan2(y, back ? -fx : fx);
          const edge = 1 - tear(ang);
          if (r <= edge) {
            // the scrap's own grid, so its writing turns with it
            const pc = Math.round(fx * RX + cx), pr = row;
            // lit from the candle below and to the left, and dimmer as it turns away
            const lit = (0.55 + 0.3 * (-fx * 0.4 + y * 0.5) * -1 + 0.15) * flame * (0.55 + 0.45 * Math.abs(ca));
            let level = Math.max(0, Math.min(PAPER - 1, Math.round(lit * (PAPER - 1) + (hash(pc, pr) - 0.5) * 1.2)));
            if (!back) {
              // the spot: a smudged disc, left of centre, with a thumb's smear off it
              const sx = fx + 0.06, sy = y + 0.04;
              const d = Math.hypot(sx, sy * 1.05) + 0.06 * Math.sin(ang * 5 + 2) * Math.min(1, r * 3);
              const smear = Math.max(0, 1 - Math.hypot((sx - 0.42) / 0.3, (sy + 0.18) / 0.1));
              if (d < 0.38) ch = " ";
              else if (d < 0.47 || smear > 0.3) (ch = d < 0.42 || smear > 0.6 ? ":" : "."), (c = d < 0.42 ? CHAR : CHAR_DIM);
              else (ch = verseAt(pr, pc)), (c = level);
            } else {
              // DEPOSED, scrawled across the middle
              const wx = Math.floor(fx * RX + WIDE / 2), wy = pr - Math.round(CY - 3.5);
              const at = (dx: number, dy: number) => {
                const x2 = wx + dx, i = Math.floor(x2 / 6), lx2 = x2 - i * 6;
                if (i < 0 || i >= WORD.length || lx2 > 4) return false;
                const y2 = wy + dy - DROP[i];
                return y2 >= 0 && y2 < 7 && LETTERS[WORD[i]][y2][lx2] === "#";
              };
              if (at(0, 0)) ch = " ";
              else (ch = fibreAt(pr, pc)), (c = level);
            }
            // the torn edge is ragged, and warm where the candle catches it
            if (r > edge - 0.07 && ch !== " ") {
              ch = hash(pc, pr + 1) > 0.5 ? "'" : ",";
              c = lit > 0.7 ? EMBER : EMBER_DIM;
            }
            if (paper && c < PAPER) level = PAPER - 1 - level;
          }
        }
        if (color) color[k] = c;
        line += ch;
      }
      lines.push(line);
    }
    // the name, under it
    const tr = rows - 2, tx0 = Math.floor((cols - TITLE.length) / 2);
    lines[tr] = " ".repeat(tx0) + TITLE + " ".repeat(cols - tx0 - TITLE.length);
    if (color) for (let i = 0; i < TITLE.length; i++) color[tr * cols + tx0 + i] = 4;
    return lines.join("\n");
  };
}
