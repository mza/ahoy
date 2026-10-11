/*
 * The cells a piece's frame paints in a terminal, its character, ink and ground
 * each, from ascii.rest's terminal player by @bas3line, MIT licensed
 * (https://github.com/bas3line/ascii). Only what the player needs, unchanged.
 */
import type { Meta } from "./types.ts";

// Unchanged cells a run of changed ones is carried over, rather than jumping the cursor past them.
export const GAP = 4;
// How far a colour may drift, on each channel out of 255, before its cell is sent again.
export const NEAR = 6;
// How much of a square cell each of a scene's dots inks, for mixing its colour into the ground.
const INK: Record<string, number> = { " ": 0, "·": 0.15, "•": 0.45, "●": 0.9, "░": 0.25, "▒": 0.5, "▓": 0.75, "█": 1 };

export const int = (hex: string) => parseInt(hex.slice(1, 7), 16);
export const mix = (a: number, b: number, k: number) =>
  [16, 8, 0].reduce((out, s) => out | (Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k) << s), 0);
export const sgr = (layer: 38 | 48, c: number) => `\x1b[${layer};2;${(c >> 16) & 255};${(c >> 8) & 255};${c & 255}m`;
export const dark = (c: number) => 0.2126 * ((c >> 16) & 255) + 0.7152 * ((c >> 8) & 255) + 0.0722 * (c & 255) < 128;


// How a run of n cells is averaged onto m: for each of the m, the cells it covers and the share of it each one is.
function spans(n: number, m: number) {
  return Array.from({ length: m }, (_, i) => {
    const a = (i * n) / m, b = ((i + 1) * n) / m, cover: [number, number][] = [];
    for (let j = Math.floor(a); j < Math.ceil(b); j++) {
      const w = Math.min(j + 1, b) - Math.max(j, a);
      if (w > 0) cover.push([j, w / (b - a)]);
    }
    return cover;
  });
}

/*
 * The terminal's cells for a piece's frames: each cell's character, and its ink and ground as 0xrrggbb, or -1 for the
 * terminal's own. A piece with character cells is drawn as it is, and cropped by play() if the terminal is smaller.
 *
 * A square-celled piece (cell: 1), a scene, is a picture of up to 320 by 120 cells, too big for most terminals, and its
 * dots are a texture that a canvas draws a few pixels across: one dot a solid cell reads as noise. So it is shrunk to
 * fit the terminal and drawn in tones. In colour, each of its cells is its ink mixed into the ground by how much its dot
 * inks, softened by a 1 4 1 blur each way, then averaged down onto the size that fits: two of those rows in each
 * terminal cell, as an upper half block whose ink is the top one and whose ground is the bottom. As text, each terminal
 * cell keeps the heaviest character of the cells it covers, so a star or a thin line survives. size() sets the room.
 */
export function painter({ cols, rows, palette, ground, cell = 2 }: Meta, colour: boolean) {
  const square = cell === 1;
  const color = colour && palette ? new Uint8Array(cols * rows) : undefined;
  const inks = palette?.map(int) ?? [];
  const base = color && ground ? int(ground) : -1;
  const shades = new Map<number, number>();
  // A square cell's colour: the ground for a space, else its ink, mixed into the ground when there is one.
  const shade = (c: string, i: number) => {
    if (c === " ") return base;
    const key = i * 65536 + c.charCodeAt(0);
    let s = shades.get(key);
    if (s === undefined) shades.set(key, (s = base < 0 ? (inks[i] ?? inks[0]) : mix(base, inks[i] ?? inks[0], INK[c] ?? 0.5)));
    return s;
  };
  const weight = (c: string) => " ·•●".indexOf(c) + 1 || 2.5;
  // Tones only make sense over a ground; a square piece in colour with none keeps one cell a half, as drawn.
  const tones = square && color !== undefined && base >= 0;
  const pic = tones ? new Float32Array(cols * rows * 3) : new Float32Array(0);
  const soft = tones ? new Float32Array(cols * rows * 3) : new Float32Array(0);

  const out = { cols, rows: square ? Math.ceil(rows / 2) : rows, color, base, ch: [] as string[], fg: new Int32Array(0), bg: new Int32Array(0) };
  let across: [number, number][][] = [], down: [number, number][][] = [], half = rows;
  let wide = new Float32Array(0), small = new Float32Array(0);
  const room = (w: number, h: number) => {
    out.cols = w;
    out.rows = h;
    out.ch = new Array<string>(w * h).fill(" ");
    out.fg = new Int32Array(w * h).fill(-1);
    out.bg = new Int32Array(w * h).fill(-1);
  };
  // The room it has: a piece with character cells keeps its size, and so does a square one in colour with no ground; a
  // scene, or a square piece as text, takes the most of the terminal it can.
  const size = (W: number, H: number) => {
    if (!square || (color && !tones)) return void (out.ch.length || room(cols, square ? Math.ceil(rows / 2) : rows));
    const s = Math.min(1, W / cols, (2 * H) / rows), w = Math.max(1, Math.round(cols * s));
    half = Math.max(2, Math.round(rows * s));
    across = spans(cols, w);
    down = spans(rows, tones ? half : Math.ceil(half / 2));
    wide = new Float32Array(w * rows * 3);
    small = new Float32Array(w * half * 3);
    room(w, Math.ceil(half / 2));
  };

  // pic, blurred 1 4 1 across into soft and then down back into pic, the edges weighed by what they have
  const blur = () => {
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        for (let c = 0, i = (y * cols + x) * 3; c < 3; c++, i++) {
          let sum = 4 * pic[i], n = 4;
          if (x > 0) (sum += pic[i - 3]), n++;
          if (x < cols - 1) (sum += pic[i + 3]), n++;
          soft[i] = sum / n;
        }
    const stride = cols * 3;
    for (let y = 0; y < rows; y++)
      for (let i = y * stride; i < (y + 1) * stride; i++) {
        let sum = 4 * soft[i], n = 4;
        if (y > 0) (sum += soft[i - stride]), n++;
        if (y < rows - 1) (sum += soft[i + stride]), n++;
        pic[i] = sum / n;
      }
  };

  const paint = (text: string) => {
    const lines = text.split("\n");
    const { ch, fg, bg } = out, w = out.cols;
    if (tones) {
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const s = shade(lines[y]?.[x] ?? " ", color![y * cols + x]), i = (y * cols + x) * 3;
          pic[i] = (s >> 16) & 255;
          pic[i + 1] = (s >> 8) & 255;
          pic[i + 2] = s & 255;
        }
      blur();
      // averaged across, then down
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < w; x++)
          for (let c = 0; c < 3; c++) {
            let sum = 0;
            for (const [j, k] of across[x]) sum += pic[(y * cols + j) * 3 + c] * k;
            wide[(y * w + x) * 3 + c] = sum;
          }
      for (let y = 0; y < half; y++)
        for (let x = 0; x < w; x++)
          for (let c = 0; c < 3; c++) {
            let sum = 0;
            for (const [j, k] of down[y]) sum += wide[(j * w + x) * 3 + c] * k;
            small[(y * w + x) * 3 + c] = sum;
          }
      const at = (x: number, y: number) => {
        if (y >= half) return base;
        const i = (y * w + x) * 3;
        return (Math.round(small[i]) << 16) | (Math.round(small[i + 1]) << 8) | Math.round(small[i + 2]);
      };
      for (let y = 0, k = 0; y < out.rows; y++)
        for (let x = 0; x < w; x++, k++) {
          const top = at(x, 2 * y), bottom = at(x, 2 * y + 1);
          if (top === bottom) (ch[k] = " "), (fg[k] = -1), (bg[k] = top);
          else (ch[k] = "▀"), (fg[k] = top), (bg[k] = bottom);
        }
    } else if (square && color) {
      // No ground to mix into: one cell a half, as drawn, cropped by play() when it does not fit.
      for (let y = 0, k = 0; y < out.rows; y++)
        for (let x = 0; x < w; x++, k++) {
          const top = shade(lines[2 * y]?.[x] ?? " ", color[2 * y * cols + x]);
          const bottom = 2 * y + 1 < rows ? shade(lines[2 * y + 1]?.[x] ?? " ", color[(2 * y + 1) * cols + x]) : base;
          // With no ground behind a half, the other half's block is drawn alone.
          if (top === bottom) (ch[k] = " "), (fg[k] = -1), (bg[k] = top);
          else if (top < 0) (ch[k] = "▄"), (fg[k] = bottom), (bg[k] = -1);
          else (ch[k] = "▀"), (fg[k] = top), (bg[k] = bottom);
        }
    } else if (square) {
      for (let y = 0, k = 0; y < out.rows; y++)
        for (let x = 0; x < w; x++, k++) {
          let best = " ";
          for (const [j] of down[y]) for (const [i] of across[x]) {
            const c = lines[j]?.[i] ?? " ";
            if (weight(c) > weight(best)) best = c;
          }
          ch[k] = best;
        }
    } else {
      for (let y = 0, k = 0; y < rows; y++)
        for (let x = 0; x < cols; x++, k++) {
          const c = (ch[k] = lines[y]?.[x] ?? " ");
          fg[k] = color && c !== " " ? (inks[color[k]] ?? inks[0]) : -1;
          bg[k] = base;
        }
    }
  };
  return Object.assign(out, { size, paint });
}

