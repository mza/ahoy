/*
 * One piece playing: its clock, its frames and the cells they paint, drawn
 * centred into any rectangle of the screen.
 *
 * A piece is first trimmed to the part of its frame it ever draws in. If that
 * still does not fit, how it is made to fit depends on how it is drawn, since
 * dropping rows and columns tears a picture made of thin lines:
 *  - a scene is drawn in the dots it is made of, each a character in its own
 *    colour on the ground with a space after it, so that they stand on a
 *    square grid as a page draws them; or a dot to every cell, which is
 *    twice the dots across but leaves them in rows; or a cell to half a
 *    terminal cell, each the colour of its dot on the ground, sharp; or,
 *    softly, by ascii.rest's own painter, which blurs it first;
 *  - a picture in block elements is resampled at half-cell height, two pixels a
 *    cell, and drawn again in blocks, so it shrinks as an image does;
 *  - a picture in dense ascii fill keeps, for each cell, the strongest
 *    character it covers;
 *  - line art is not shrunk at all, but cropped to its middle.
 */
import type { Entry } from "./catalog.ts";
import { dark, int, mix, painter } from "./paint.ts";
import type { Screen } from "./screen.ts";
import type { Frame } from "./types.ts";

/**
 * How a scene is drawn in a terminal: in its own dots on a square grid, as a page draws it; in its dots a character
 * to a cell, closer together across than down; in sharp half blocks; or in ascii.rest's soft tones.
 */
export type Scenes = "ascii" | "dense" | "crisp" | "soft";
export const SCENES: Scenes[] = ["ascii", "dense", "crisp", "soft"];

export interface Look {
  mono: boolean;
  light: boolean;
  scenes: Scenes;
}

type Fit = "scene" | "blocks" | "dense" | "lines";

// How much of a cell each block element inks, top half then bottom half.
const HALVES: Record<string, [number, number]> = {
  " ": [0, 0], "░": [0.25, 0.25], "▒": [0.5, 0.5], "▓": [0.75, 0.75], "█": [1, 1],
  "▀": [1, 0], "▄": [0, 1], "▌": [0.5, 0.5], "▐": [0.5, 0.5],
};
const TONES = [" ", "░", "▒", "▓", "█"];
// How much of its cell each of a scene's dots covers, a full dot taken as all of it.
const COVER: Record<string, number> = { " ": 0, "·": 0.19, "•": 0.55, "●": 1 };
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
  // a scene drawn sharp: its colours, its ground, and the picture last made of it for the room it has
  private sharp?: { inks: number[]; ground: number; color: Uint8Array };
  private pic = { w: 0, h: 0, ch: [] as string[], fg: new Int32Array(0), bg: new Int32Array(0) };

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
    else if (look.scenes !== "soft" && this.cells.color && meta.palette && this.cells.base >= 0)
      this.sharp = { inks: meta.palette.map(int), ground: this.cells.base, color: this.cells.color };
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
    if (this.sharp) return this.scene(screen, x, y, w, h, ax, ay);
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

  // A scene, in its own dots or in sharp half blocks, as large as the room allows and no larger than it is.
  private scene(screen: Screen, x: number, y: number, w: number, h: number, ax: number, ay: number) {
    const { cols, rows, fps } = this.meta, { inks, ground, color } = this.sharp!, pic = this.pic;
    // on a square grid a dot takes two cells across and a row; otherwise a cell of the scene is half a terminal cell
    const square = this.look.scenes === "ascii";
    const s = square ? Math.min(1, w / (2 * cols), h / rows) : Math.min(1, w / cols, (2 * h) / rows);
    const dots = Math.max(1, Math.round(cols * s)), pw = square ? 2 * dots : dots;
    const half = Math.max(2, Math.round(rows * s)), ph = square ? half : Math.ceil(half / 2);
    const step = fps > 0 ? this.at() : 0;
    if (this.sized !== `${pw}x${ph}` || step !== this.drawnAt) {
      if (this.sized !== `${pw}x${ph}`) {
        this.sized = `${pw}x${ph}`;
        Object.assign(pic, { w: pw, h: ph, ch: new Array<string>(pw * ph).fill(" "), fg: new Int32Array(pw * ph), bg: new Int32Array(pw * ph) });
      }
      this.drawnAt = step;
      const lines = this.frame(fps > 0 ? step / fps : 0, { paper: this.paper, color }).split("\n");
      // The cells of the scene a stretch of the picture covers: from, and up to but not counting.
      const reach = (i: number, n: number, of: number) => [Math.floor((i * of) / n), Math.max(Math.floor((i * of) / n) + 1, Math.floor(((i + 1) * of) / n))];
      if (this.look.scenes === "ascii" || this.look.scenes === "dense") {
        // the scene's own dots: each one's size by how much the cells it covers are covered, taken together, and
        // its colour that of the heaviest of them. On the square grid, with room, that is the scene dot for dot.
        // A dot to every cell stands for two rows of the scene at least, a cell being twice as tall as it is wide.
        pic.ch.fill(" ");
        pic.bg.fill(ground);
        for (let j = 0; j < ph; j++) {
          const [y0, y1] = reach(j, ph, rows);
          for (let i = 0; i < dots; i++) {
            const [x0, x1] = reach(i, dots, cols), k = j * pw + (square ? 2 * i : i);
            let most = -1, at = 0, sum = 0;
            for (let sy = y0; sy < y1; sy++)
              for (let sx = x0; sx < x1; sx++) {
                const c = COVER[lines[sy]?.[sx] ?? " "] ?? 0.55;
                sum += c;
                if (c > most) (most = c), (at = sy * cols + sx);
              }
            const c = (sum / ((y1 - y0) * (x1 - x0))) * 1.15;
            pic.ch[k] = c < 0.07 ? " " : c < 0.32 ? "·" : c < 0.7 ? "•" : "●";
            pic.fg[k] = inks[color[at]] ?? inks[0];
          }
        }
      } else {
        // sharp half blocks: each half takes the heaviest dot of the cells it covers, its colour mixed into the
        // ground by how much it covers; averaging them instead is what makes a scene soft
        const cover = new Float32Array(pw * half), inked = new Int32Array(pw * half);
        for (let j = 0; j < half; j++) {
          const [y0, y1] = reach(j, half, rows);
          for (let i = 0; i < pw; i++) {
            const [x0, x1] = reach(i, pw, cols);
            let most = -1, at = 0;
            for (let sy = y0; sy < y1; sy++)
              for (let sx = x0; sx < x1; sx++) {
                const c = COVER[lines[sy]?.[sx] ?? " "] ?? 0.55;
                if (c > most) (most = c), (at = sy * cols + sx);
              }
            cover[j * pw + i] = most;
            inked[j * pw + i] = inks[color[at]] ?? inks[0];
          }
        }
        for (let j = 0, k = 0; j < ph; j++)
          for (let i = 0; i < pw; i++, k++) {
            const a = 2 * j * pw + i, b = 2 * j + 1 < half ? a + pw : -1;
            const top = mix(ground, inked[a], Math.min(1, cover[a])), bottom = b < 0 ? ground : mix(ground, inked[b], Math.min(1, cover[b]));
            pic.ch[k] = top === bottom ? " " : "▀";
            pic.fg[k] = top;
            pic.bg[k] = bottom;
          }
      }
    }
    const left = x + Math.round((w - pic.w) * ax), top = y + Math.round((h - pic.h) * ay);
    for (let j = 0, k = 0; j < pic.h; j++) for (let i = 0; i < pic.w; i++, k++) screen.put(left + i, top + j, pic.ch[k], pic.fg[k], pic.bg[k]);
  }

  private copy(screen: Screen, sx: number, sy: number, w: number, h: number, dx: number, dy: number) {
    const { cols, ch, fg, bg } = this.cells;
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        const k = (sy + j) * cols + sx + i;
        screen.put(dx + i, dy + j, ch[k], fg[k], bg[k]);
      }
  }

  // Blocks as an image two pixels a cell high, shrunk by area: each pixel of the smaller image takes the colour that
  // covers most of it, a thin stroke surviving whichever colour it is in, and a cell whose two halves take two colours
  // draws them both. A character that is not a block, a rope's strands say, is kept where it falls.
  private resample(screen: Screen, sx: number, sy: number, bw: number, bh: number, left: number, top: number, dw: number, dh: number) {
    const { cols, ch, fg, bg } = this.cells;
    const ground = bg[sy * cols + sx], PH = 2 * bh, TONE = 33554432;
    // a source pixel: 0 for the ground, else its shade (1 to 4) times TONE plus its ink plus 1
    const pixel = (px: number, py: number) => {
      const k = (sy + (py >> 1)) * cols + sx + px, halves = HALVES[ch[k]];
      const t = halves ? halves[py & 1] : 0;
      return t === 0 ? 0 : Math.round(t * 4) * TONE + fg[k] + 1;
    };
    const weights = new Map<number, number>();
    const sample = (i: number, py: number) => {
      const x0 = (i * bw) / dw, x1 = ((i + 1) * bw) / dw, y0 = (py * PH) / (2 * dh), y1 = ((py + 1) * PH) / (2 * dh);
      weights.clear();
      let total = 0, ink = 0;
      for (let x = Math.floor(x0); x < Math.min(bw, Math.ceil(x1)); x++) {
        const wx = Math.min(x + 1, x1) - Math.max(x, x0);
        for (let y = Math.floor(y0); y < Math.min(PH, Math.ceil(y1)); y++) {
          const w = wx * (Math.min(y + 1, y1) - Math.max(y, y0)), v = pixel(x, y);
          total += w;
          if (v) (ink += w), weights.set(v, (weights.get(v) ?? 0) + w);
        }
      }
      if (ink < total * 0.5) return 0;
      let best = 0, most = -1;
      for (const [v, w] of weights) if (w > most) (best = v), (most = w);
      return best;
    };
    const tone = (v: number) => Math.floor(v / TONE), inkOf = (v: number) => (v % TONE) - 1;
    for (let j = 0; j < dh; j++)
      for (let i = 0; i < dw; i++) {
        const px = Math.min(bw - 1, Math.floor(((i + 0.5) * bw) / dw));
        const cy = Math.min(bh - 1, Math.floor(((j + 0.5) * bh) / dh));
        const own = (sy + cy) * cols + sx + px;
        if (ch[own] !== " " && !(ch[own] in HALVES)) {
          screen.put(left + i, top + j, ch[own], fg[own], bg[own]);
          continue;
        }
        const a = sample(i, 2 * j), b = sample(i, 2 * j + 1), x = left + i, y = top + j;
        if (a === b) screen.put(x, y, a ? TONES[tone(a)] : " ", a ? inkOf(a) : -1, ground);
        else if (!a) screen.put(x, y, tone(b) === 4 ? "▄" : TONES[Math.max(1, tone(b) >> 1)], inkOf(b), ground);
        else if (!b) screen.put(x, y, tone(a) === 4 ? "▀" : TONES[Math.max(1, tone(a) >> 1)], inkOf(a), ground);
        else if (tone(a) === 4 && tone(b) === 4 && inkOf(b) >= 0) screen.put(x, y, "▀", inkOf(a), inkOf(b));
        else {
          const strong = tone(a) >= tone(b) ? a : b;
          screen.put(x, y, TONES[Math.round((tone(a) + tone(b)) / 2)], inkOf(strong), ground);
        }
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
