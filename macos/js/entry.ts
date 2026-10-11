/*
 * The pieces for the macOS screensaver, bundled into one script that
 * JavaScriptCore runs. It sets `ahoy` on the global object for the Swift side:
 *
 *   ahoy.list()               every piece: slug, name, size, frame rate, colours
 *   ahoy.open(slug)           a handle to a playing piece
 *   ahoy.frame(handle, t)     its frame at t seconds: { text, color }, where color
 *                             is one character a cell, its palette index plus 32,
 *                             or "" for a piece in one ink
 *   ahoy.close(handle)
 *
 * The pieces are ahoy's own, from src/own.ts, in the order the picker lists them.
 */
import type { Frame, Piece } from "../../src/types.ts";
import { OWN_PIECES } from "../../src/own.ts";

const PIECES: [string, Piece][] = OWN_PIECES.map(([slug, , piece]) => [slug, piece]);

interface Playing {
  frame: Frame;
  color?: Uint8Array;
}

const playing: (Playing | undefined)[] = [];

const api = {
  list: () =>
    PIECES.map(([slug, { meta }]) => ({
      slug,
      name: meta.name,
      note: meta.note,
      cols: meta.cols,
      rows: meta.rows,
      fps: meta.fps,
      palette: meta.palette ?? [],
      ground: meta.ground ?? "",
      cell: meta.cell ?? 2,
    })),

  open(slug: string) {
    const found = PIECES.find(([s]) => s === slug);
    if (!found) return -1;
    const { meta } = found[1];
    playing.push({
      frame: found[1].default({ ...meta.options }),
      color: meta.palette ? new Uint8Array(meta.cols * meta.rows) : undefined,
    });
    return playing.length - 1;
  },

  frame(handle: number, t: number) {
    const p = playing[handle];
    if (!p) return { text: "", color: "" };
    // The screen is dark, so pieces take the colours they have for a dark page.
    const text = p.frame(t, { paper: false, color: p.color });
    return { text, color: p.color ? String.fromCharCode(...Array.from(p.color, (i) => i + 32)) : "" };
  },

  close(handle: number) {
    playing[handle] = undefined;
  },
};

(globalThis as unknown as { ahoy: typeof api }).ahoy = api;
