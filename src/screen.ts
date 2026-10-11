/*
 * The terminal as a grid of cells. Everything is drawn into the grid, then
 * flush() sends only the cells that changed since the last flush, the way
 * ascii.rest's player does, so a frame costs a few hundred bytes, not a screen.
 */
import process from "node:process";
import { GAP, NEAR, sgr } from "./paint.ts";

// The alternate screen, the cursor hidden and no wrapping.
const ENTER = "\x1b[?1049h\x1b[?25l\x1b[?7l\x1b[2J";
const LEAVE = "\x1b[0m\x1b[?7h\x1b[?25h\x1b[?1049l";

export type Key =
  | "up" | "down" | "left" | "right" | "pageup" | "pagedown" | "home" | "end"
  | "enter" | "escape" | "backspace" | "tab" | "ctrl-c"
  | { char: string };

const SEQUENCES: [string, Key][] = [
  ["\x1b[A", "up"], ["\x1b[B", "down"], ["\x1b[C", "right"], ["\x1b[D", "left"],
  ["\x1bOA", "up"], ["\x1bOB", "down"], ["\x1bOC", "right"], ["\x1bOD", "left"],
  ["\x1b[5~", "pageup"], ["\x1b[6~", "pagedown"],
  ["\x1b[H", "home"], ["\x1b[1~", "home"], ["\x1bOH", "home"],
  ["\x1b[F", "end"], ["\x1b[4~", "end"], ["\x1bOF", "end"],
];

/** The keys in one read from a terminal in raw mode. */
export function keys(data: string): Key[] {
  const out: Key[] = [];
  for (let i = 0; i < data.length; ) {
    const seq = SEQUENCES.find(([s]) => data.startsWith(s, i));
    if (seq) {
      out.push(seq[1]);
      i += seq[0].length;
      continue;
    }
    const c = data[i++];
    if (c === "\x1b") {
      // an escape sequence this does not know: skip it whole, rather than read its tail as typing
      if (data[i] === "[" || data[i] === "O") {
        i++;
        while (i < data.length && !/[A-Za-z~]/.test(data[i])) i++;
        i++;
      } else out.push("escape");
    } else if (c === "\r" || c === "\n") out.push("enter");
    else if (c === "\x7f" || c === "\b") out.push("backspace");
    else if (c === "\t") out.push("tab");
    else if (c === "\x03") out.push("ctrl-c");
    else if (c >= " ") out.push({ char: c });
  }
  return out;
}

export class Screen {
  cols = 0;
  rows = 0;
  ch: string[] = [];
  fg = new Int32Array(0);
  bg = new Int32Array(0);
  private sentCh: string[] = [];
  private sentFg = new Int32Array(0);
  private sentBg = new Int32Array(0);
  private out = process.stdout;

  constructor() {
    this.resize();
  }

  /** Takes the terminal's size, and draws everything again on the next flush. */
  resize() {
    // A terminal that reports no size is taken to be 80 by 24.
    this.cols = this.out.columns || 80;
    this.rows = this.out.rows || 24;
    const n = this.cols * this.rows;
    this.ch = new Array<string>(n).fill(" ");
    this.fg = new Int32Array(n).fill(-1);
    this.bg = new Int32Array(n).fill(-1);
    this.sentCh = new Array<string>(n).fill("");
    this.sentFg = new Int32Array(n);
    this.sentBg = new Int32Array(n);
    this.out.write("\x1b[2J");
  }

  clear() {
    this.ch.fill(" ");
    this.fg.fill(-1);
    this.bg.fill(-1);
  }

  put(x: number, y: number, c: string, fg = -1, bg = -1) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    const k = y * this.cols + x;
    this.ch[k] = c;
    this.fg[k] = fg;
    this.bg[k] = bg;
  }

  /** Text from (x, y), cut at `width` cells; returns the cells it took. */
  text(x: number, y: number, s: string, fg = -1, bg = -1, width = this.cols - x) {
    const chars = [...s].slice(0, Math.max(0, width));
    chars.forEach((c, i) => this.put(x + i, y, c, fg, bg));
    return chars.length;
  }

  fill(x: number, y: number, w: number, h: number, bg = -1) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.put(i, j, " ", -1, bg);
  }

  /** A rounded box with an optional title in its top edge. */
  box(x: number, y: number, w: number, h: number, colour: number, title = "", titleColour = colour) {
    if (w < 2 || h < 2) return;
    this.put(x, y, "╭", colour);
    this.put(x + w - 1, y, "╮", colour);
    this.put(x, y + h - 1, "╰", colour);
    this.put(x + w - 1, y + h - 1, "╯", colour);
    for (let i = x + 1; i < x + w - 1; i++) this.put(i, y, "─", colour), this.put(i, y + h - 1, "─", colour);
    for (let j = y + 1; j < y + h - 1; j++) this.put(x, j, "│", colour), this.put(x + w - 1, j, "│", colour);
    if (title && w > 6) this.text(x + 2, y, ` ${title} `, titleColour, -1, w - 4);
  }

  /** A copy of the grid, for a transition to fade out of. */
  snapshot() {
    return { cols: this.cols, rows: this.rows, ch: this.ch.slice(), fg: this.fg.slice(), bg: this.bg.slice() };
  }

  flush() {
    const { cols, rows, ch, fg, bg, sentCh, sentFg, sentBg } = this;
    const near = (a: number, b: number) =>
      a === b ||
      (a >= 0 && b >= 0 && Math.abs((a >> 16) - (b >> 16)) <= NEAR && Math.abs(((a >> 8) & 255) - ((b >> 8) & 255)) <= NEAR && Math.abs((a & 255) - (b & 255)) <= NEAR);
    const changed = (k: number) => ch[k] !== sentCh[k] || !near(bg[k], sentBg[k]) || (ch[k] !== " " && !near(fg[k], sentFg[k]));
    let s = "";
    for (let y = 0; y < rows; y++) {
      const row = y * cols;
      for (let x = 0; x < cols; ) {
        if (!changed(row + x)) {
          x++;
          continue;
        }
        let end = x + 1;
        for (let j = x + 1, gap = 0; j < cols && gap <= GAP; j++) {
          if (changed(row + j)) (end = j + 1), (gap = 0);
          else gap++;
        }
        let run = `\x1b[${y + 1};${x + 1}H`, ink = -1, under = -1;
        for (let k = row + x; k < row + end; k++) {
          if (bg[k] !== under) (run += bg[k] < 0 ? "\x1b[49m" : sgr(48, bg[k])), (under = bg[k]);
          if (ch[k] !== " " && fg[k] !== ink) (run += fg[k] < 0 ? "\x1b[39m" : sgr(38, fg[k])), (ink = fg[k]);
          run += ch[k];
          sentCh[k] = ch[k];
          sentFg[k] = fg[k];
          sentBg[k] = bg[k];
        }
        s += ink >= 0 || under >= 0 ? `${run}\x1b[0m` : run;
        x = end;
      }
    }
    if (s) this.out.write(s);
  }
}

/**
 * Takes over the terminal: the alternate screen, raw keys, redraws on resize,
 * and the terminal put back however the program ends.
 */
export function session(onKey: (key: Key) => void, onResize: () => void) {
  const stdin = process.stdin, out = process.stdout;
  const restore = () => {
    out.write(LEAVE);
    if (stdin.isTTY) stdin.setRawMode(false);
  };
  const data = (d: Buffer | string) => keys(d.toString()).forEach(onKey);
  out.write(ENTER);
  stdin.setRawMode(true);
  stdin.setEncoding("utf8");
  stdin.on("data", data);
  stdin.resume();
  out.on("resize", onResize);
  process.on("exit", restore);
  const signal = () => process.exit(130);
  process.on("SIGINT", signal);
  process.on("SIGTERM", signal);
  return () => {
    stdin.off("data", data);
    out.off("resize", onResize);
    process.off("exit", restore);
    process.off("SIGINT", signal);
    process.off("SIGTERM", signal);
    restore();
    stdin.pause();
  };
}
