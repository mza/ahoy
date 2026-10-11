/*
 * A frame of a piece as a picture: 1500 pixels square, the piece as large as
 * whole pixels allow and in the middle, saved as a PNG with nothing behind it
 * and as a JPEG on the piece's ground.
 *
 * It is the piece's own frame, at its own size, not what a small terminal made
 * of it; the look, in colour or one ink, for a dark page or a light one, is
 * the one it was playing in.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Entry } from "./catalog.ts";
import { type Canvas, glyph } from "./glyphs.ts";
import { jpeg } from "./jpeg.ts";
import { dark, int } from "./paint.ts";
import { png } from "./png.ts";
import type { Look } from "./stage.ts";

export const SIZE = 1500;
// The ink of a piece with none of its own, on a dark page and on a light one.
const INK = 0xe8ebef, PAPER_INK = 0x1c1f24;

/** The frame numbered `frameNo`, drawn: its pixels, and the colour that belongs behind them. */
export function draw({ piece }: Entry, look: Look, frameNo: number) {
  const { meta } = piece, { cols, rows, fps } = meta;
  const inks = !look.mono && meta.palette ? meta.palette.map(int) : undefined;
  const ground = inks && meta.ground ? int(meta.ground) : -1;
  // a piece with a ground of its own shades for that, whatever the terminal
  const paper = ground >= 0 ? !dark(ground) : look.light;
  const color = inks ? new Uint8Array(cols * rows) : undefined;
  const text = piece.default({ ...meta.options })(fps > 0 ? frameNo / fps : 0, { paper, color });

  // a cell is twice as tall as it is wide, or square in a scene
  const tall = meta.cell === 1 ? 1 : 2;
  const w = Math.max(1, Math.floor(Math.min(SIZE / cols, SIZE / (rows * tall)))), h = w * tall;
  const left = (SIZE - cols * w) >> 1, top = (SIZE - rows * h) >> 1;
  const canvas: Canvas = { size: SIZE, rgba: new Uint8Array(SIZE * SIZE * 4) };
  const ink = paper ? PAPER_INK : INK;
  text.split("\n").forEach((line, y) =>
    [...line].forEach((c, x) => glyph(canvas, c, left + x * w, top + y * h, w, h, inks && color ? (inks[color[y * cols + x]] ?? inks[0]) : ink)),
  );
  return { rgba: canvas.rgba, ground: ground >= 0 ? ground : paper ? 0xffffff : 0x000000 };
}

/** Saves that frame into `dir` as a PNG and a JPEG, and returns the two paths. */
export function save(entry: Entry, look: Look, frameNo: number, dir: string) {
  const { rgba, ground } = draw(entry, look, frameNo);
  // for the JPEG, which has nothing to see through, the picture laid on its ground
  const rgb = new Uint8Array(SIZE * SIZE * 3), back = [ground >> 16, (ground >> 8) & 255, ground & 255];
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    const a = rgba[i + 3] / 255;
    for (let k = 0; k < 3; k++) rgb[j + k] = Math.round(back[k] + (rgba[i + k] - back[k]) * a);
  }
  dir = resolve(dir);
  mkdirSync(dir, { recursive: true });
  const name = `ahoy-${entry.slug}-${String(frameNo).padStart(4, "0")}`;
  const files = [join(dir, `${name}.png`), join(dir, `${name}.jpg`)];
  writeFileSync(files[0], png(rgba, SIZE, SIZE));
  writeFileSync(files[1], jpeg(rgb, SIZE, SIZE));
  return files;
}
