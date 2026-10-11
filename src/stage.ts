/*
 * One piece playing: its clock, its frames and the cells they paint, drawn
 * centred into any rectangle of the screen.
 *
 * A piece is first trimmed to the part of its frame it ever draws in. If that
 * still does not fit, how it is made to fit depends on how it is drawn, since
 * dropping rows and columns tears a picture made of thin lines:
 *  - a scene is shrunk by ascii.rest's own painter, in tones;
 *  - a picture in block elements is resampled at half-cell height, two pixels a
 *    cell, and drawn again in blocks, so it shrinks as an image does;
 *  - a picture in dense ascii fill keeps, for each cell, the strongest
 *    character it covers;
 *  - line art is not shrunk at all, but cropped to its middle.
 */
import type { Entry } from "./catalog.ts";
import { dark, painter } from "./paint.ts";
import type { Screen } from "./screen.ts";
import type { Frame } from "./types.ts";

export interface Look {
  mono: boolean;
  light: boolean;
}

type Fit = "scene" | "blocks" | "dense" | "lines";

// How much of a cell each block element inks, top half then bottom half.
const HALVES: Record<string, [number, number]> = {
  " ": [0, 0], "░": [0.25, 0.25], "▒": [0.5, 0.5], "▓": [0.75, 0.75], "█": [1, 1],
  "▀": [1, 0], "▄": [0, 1], "▌": [0.5, 0.5], "▐": [0.5, 0.5],
};
const TONES = [" ", "░", "▒", "▓", "█"];
// Frames sampled to find where a piece draws and what it draws with.
const SAMPLES = 24;

// How much a character shows, so shrinking dense fill keeps the outline rather than the gaps.
const weight = (c: string) => (c === " " ? 0 : "·.'`,-_".includes(c) ? 1 : "█▓▒░8@#".includes(c) ? 3 : 2);

export class Stage {
  t = 0;
  paused = false;
  readonly entry: Entry;
  readonly look: Look;
  private cells: ReturnType<typeof painter>;
  private frame: Frame;
  private paper: boolean;
  private drawnAt = -1;
  private sized = "";
  private fit: Fit;
  // the part of the frame the piece draws in: left, top, width, height
  private box = [0, 0, 0, 0];

  constructor(entry: Entry, look: Look) {
    this.entry = entry;
    this.look = look;
    const { meta } = entry.piece;
    this.cells = painter(meta, !look.mono);
    this.frame = entry.piece.default({ ...meta.options });
    // A scene keeps its own ground in colour, and shades for it.
    this.paper = this.cells.base >= 0 ? !dark(this.cells.base) : look.light;
    this.fit = meta.cell === 1 ? "scene" : "lines";
    if (this.fit !== "scene") this.survey();
  }

  get meta() {
    return this.entry.piece.meta;
  }

  tick(dt: number) {
    if (!this.paused) this.t += Math.min(dt, 0.1);
  }

  // The frame the clock is on. A hair over, so a clock set to a frame's start is on that frame.
  private at() {
    return Math.floor(this.t * this.meta.fps + 1e-6);
  }

  /** Moves the clock `n` frames on, or back for a negative `n`, to the start of that frame. */
  step(n: number) {
    const fps = this.meta.fps;
    if (fps > 0) this.t = Math.max(0, this.at() + n) / fps;
  }

  /** Which frame it shows, counting from 0. */
  get frameNo() {
    return this.meta.fps > 0 ? this.at() : 0;
  }

  // Where the piece draws over a few seconds of frames, and whether it is blocks, dense fill or lines.
  private survey() {
    const { cols, rows, fps } = this.meta, cells = this.cells;
    cells.size(cols, rows);
    let x0 = cols, y0 = rows, x1 = -1, y1 = -1, ink = 0, blocks = 0, dense = 0;
    for (let i = 0; i < (fps > 0 ? SAMPLES : 1); i++) {
      cells.paint(this.frame(i / 2, { paper: this.paper, color: cells.color }));
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const c = cells.ch[y * cols + x];
          if (c === " ") continue;
          ink++;
          if (c in HALVES) blocks++;
          else if ("8#@$%&MW".includes(c)) dense++;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    }
    this.box = x1 < 0 ? [0, 0, cols, rows] : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
    this.fit = blocks > ink * 0.5 ? "blocks" : dense > ink * 0.3 ? "dense" : "lines";
  }

  /**
   * Draws the piece into the rectangle, where `ax` and `ay` say where in it: 0 to the left or top, 1 to the right or
   * bottom, 0.5 centred.
   */
  draw(screen: Screen, x: number, y: number, w: number, h: number, ax = 0.5, ay = 0.5) {
    if (w <= 0 || h <= 0) return;
    const cells = this.cells, fps = this.meta.fps;
    if (this.sized !== `${w}x${h}`) {
      this.sized = `${w}x${h}`;
      cells.size(w, h);
      this.drawnAt = -1;
    }
    // A frame is painted again only when the piece's own frame rate says it has moved.
    const step = fps > 0 ? this.at() : 0;
    if (step !== this.drawnAt) {
      this.drawnAt = step;
      cells.paint(this.frame(fps > 0 ? step / fps : 0, { paper: this.paper, color: cells.color }));
    }
    const [bx, by, bw, bh] = this.fit === "scene" ? [0, 0, cells.cols, cells.rows] : this.box;
    const left = (dw: number) => x + Math.round((w - dw) * ax), top = (dh: number) => y + Math.round((h - dh) * ay);
    if (bw <= w && bh <= h) return this.copy(screen, bx, by, bw, bh, left(bw), top(bh));
    if (this.fit === "lines") {
      // cropped to its middle
      const cw = Math.min(bw, w), chh = Math.min(bh, h);
      return this.copy(screen, bx + ((bw - cw) >> 1), by + ((bh - chh) >> 1), cw, chh, left(cw), top(chh));
    }
    const s = Math.min(w / bw, h / bh);
    const dw = Math.max(1, Math.round(bw * s)), dh = Math.max(1, Math.round(bh * s));
    if (this.fit === "blocks") this.resample(screen, bx, by, bw, bh, left(dw), top(dh), dw, dh);
    else this.strongest(screen, bx, by, bw, bh, left(dw), top(dh), dw, dh);
  }

  private copy(screen: Screen, sx: number, sy: number, w: number, h: number, dx: number, dy: number) {
    const { cols, ch, fg, bg } = this.cells;
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const k = (sy + j) * cols + sx + i;
        screen.put(dx + i, dy + j, ch[k], fg[k], bg[k]);
      }
  }

  // Blocks as an image two pixels a cell high, sampled at the smaller size and drawn back in blocks. A character
  // that is not a block, a rope's strands say, is kept where it falls.
  private resample(screen: Screen, sx: number, sy: number, bw: number, bh: number, left: number, top: number, dw: number, dh: number) {
    const { cols, ch, fg, bg } = this.cells;
    const half = (px: number, py: number) => {
      const k = (sy + (py >> 1)) * cols + sx + px;
      const c = ch[k], halves = HALVES[c];
      // a character that is not a block is drawn as itself, so it inks no pixels
      return { k, tone: halves ? halves[py & 1] : 0 };
    };
    for (let j = 0; j < dh; j++)
      for (let i = 0; i < dw; i++) {
        const px = Math.min(bw - 1, Math.floor(((i + 0.5) * bw) / dw));
        const cy = Math.min(bh - 1, Math.floor(((j + 0.5) * bh) / dh));
        const own = (sy + cy) * cols + sx + px;
        if (!(ch[own] in HALVES)) {
          screen.put(left + i, top + j, ch[own], fg[own], bg[own]);
          continue;
        }
        const a = half(px, Math.min(2 * bh - 1, Math.floor(((2 * j + 0.5) * 2 * bh) / (2 * dh))));
        const b = half(px, Math.min(2 * bh - 1, Math.floor(((2 * j + 1.5) * 2 * bh) / (2 * dh))));
        const ink = a.tone >= b.tone ? a.k : b.k;
        let c: string;
        if (a.tone === b.tone) c = TONES[Math.round(a.tone * 4)];
        else if (b.tone === 0) c = a.tone === 1 ? "▀" : TONES[Math.round(a.tone * 2)];
        else if (a.tone === 0) c = b.tone === 1 ? "▄" : TONES[Math.round(b.tone * 2)];
        else c = TONES[Math.round(((a.tone + b.tone) / 2) * 4)];
        screen.put(left + i, top + j, c, fg[ink], bg[ink]);
      }
  }

  private strongest(screen: Screen, sx: number, sy: number, bw: number, bh: number, left: number, top: number, dw: number, dh: number) {
    const { cols, ch, fg, bg } = this.cells;
    for (let j = 0; j < dh; j++) {
      const r0 = Math.floor((j * bh) / dh), r1 = Math.max(r0 + 1, Math.floor(((j + 1) * bh) / dh));
      for (let i = 0; i < dw; i++) {
        const c0 = Math.floor((i * bw) / dw), c1 = Math.max(c0 + 1, Math.floor(((i + 1) * bw) / dw));
        // the strongest character the cell covers, nearest its middle on a tie
        let best = (sy + r0) * cols + sx + c0, bwt = -1, bd = Infinity;
        const mr = (r0 + r1 - 1) / 2, mc = (c0 + c1 - 1) / 2;
        for (let r = r0; r < r1; r++)
          for (let c = c0; c < c1; c++) {
            const k = (sy + r) * cols + sx + c, wt = weight(ch[k]), d = Math.abs(r - mr) + Math.abs(c - mc);
            if (wt > bwt || (wt === bwt && d < bd)) (best = k), (bwt = wt), (bd = d);
          }
        screen.put(left + i, top + j, ch[best], fg[best], bg[best]);
      }
    }
  }
}
