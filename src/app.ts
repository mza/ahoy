/*
 * The three things ahoy does on a terminal: a picker, with the piece under the
 * cursor playing beside the list; a player, one piece full screen with the
 * others a key away; and a screensaver, a player that moves on by itself,
 * dissolving from one piece into the next. Any of them can be paused and
 * stepped through a frame at a time.
 *
 * The screensaver shows no text unless a key is pressed, and puts each piece
 * somewhere new in the space around it, so nothing sits still on the screen
 * for hours.
 */
import process from "node:process";
import { homedir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { heading, listed, OWN, PROTOTYPES, type Entry, type Shown } from "./catalog.ts";
import { save } from "./export.ts";
import { Screen, session, type Key } from "./screen.ts";
import { SCENES, Stage, type Look } from "./stage.ts";

export interface Settings extends Look {
  /** Seconds a screensaver shows each piece. */
  dwell: number;
  shuffle: boolean;
  /** Where a paused frame is saved as a picture. */
  out: string;
  /** A character cell's height over its width, to use whatever the terminal says. */
  cell?: number;
}

const ACCENT = 0xff9900;
const DIM = 0x808890;
const FRAME = 0x4a5260;
// The preview's ground, and the ink on it of a piece that has none of its own.
const BLACK = 0x000000;
const INK = 0xe8ebef;
const FPS = 30;
// Seconds the bar along the bottom of the player stays up after something happens.
const HUD = 3;
// Seconds one piece takes to dissolve into the next.
const FADE = 0.7;
// Seconds the word that a frame was saved, or could not be, stays up.
const NOTICE = 5;

type Row = { head: string } | { entry: Entry };

interface Player {
  list: Entry[];
  index: number;
  saver: boolean;
  /** Back to the picker on q, rather than out. */
  back: boolean;
  stage: Stage;
  /** Where the piece sits in the screen's spare room, across and down, 0.5 centred. */
  anchor: [number, number];
  shown: number;
  hud: number;
  fade?: { from: ReturnType<Screen["snapshot"]>; at: number };
}

// Somewhere off centre, for the screensaver.
const drift = (): [number, number] => [0.15 + 0.7 * Math.random(), 0.15 + 0.7 * Math.random()];

const shuffled = <T>(xs: T[]) => {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Where the dissolve reaches each cell first: a hash, so it is grainy rather than a wipe.
const grain = (k: number) => {
  let h = Math.imul(k ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export class App {
  private screen = new Screen();
  private look: Look;
  private player?: Player;
  private filter = "";
  private searching = false;
  private sel = 0;
  private scroll = 0;
  private preview?: Stage;
  private previewPaused = false;
  // the slugs marked for a screensaver
  private marked = new Set<string>();
  private clock = 0;
  // what the last save of a frame came to, and when it stops being shown
  private notice = { text: "", until: 0 };
  private done!: () => void;

  // every piece there is, what of it is listed, and so the pieces the picker lists
  private all: Entry[];
  private shown: Shown;
  private entries: Entry[];
  private settings: Settings;

  constructor(all: Entry[], shown: Shown, settings: Settings) {
    this.all = all;
    this.shown = shown;
    this.entries = listed(all, shown);
    this.settings = settings;
    this.look = { mono: settings.mono, light: settings.light, scenes: settings.scenes };
  }

  /** The picker, until q. */
  menu() {
    return this.run();
  }

  /** A player over `list`; a screensaver if `saver`. */
  play(list: Entry[], saver: boolean) {
    this.start(saver && this.settings.shuffle ? shuffled(list) : list, 0, saver, false);
    return this.run();
  }

  private run() {
    return new Promise<void>((resolve) => {
      // a cell's shape as the terminal gives it, unless it was given on the command line; kept within reason
      if (this.settings.cell) this.screen.ratio = this.settings.cell;
      const end = session(
        (key) => this.key(key),
        () => this.screen.resize(),
        (ratio) => {
          if (!this.settings.cell) this.screen.ratio = Math.max(0.8, Math.min(3, ratio));
        },
      );
      let last = performance.now();
      const timer = setInterval(() => {
        const now = performance.now(), dt = (now - last) / 1000;
        last = now;
        this.frame(dt);
      }, 1000 / FPS);
      this.done = () => {
        clearInterval(timer);
        end();
        resolve();
      };
      this.frame(0);
    });
  }

  private frame(dt: number) {
    this.clock += dt;
    this.screen.clear();
    if (this.player) this.drawPlayer(dt);
    else this.drawMenu(dt);
    this.screen.flush();
  }

  // ---- the picker

  private visible() {
    const q = this.filter.toLowerCase();
    if (!q) return this.entries;
    return this.entries.filter(({ slug, pack, piece: { meta } }) => `${slug} ${meta.name} ${pack} ${meta.note}`.toLowerCase().includes(q));
  }

  private rows(): Row[] {
    const rows: Row[] = [];
    let pack = "";
    for (const entry of this.visible()) {
      if (entry.pack !== pack) rows.push({ head: (pack = entry.pack) });
      rows.push({ entry });
    }
    return rows;
  }

  private selected(rows: Row[]) {
    const items = rows.filter((r): r is { entry: Entry } => "entry" in r);
    this.sel = Math.max(0, Math.min(this.sel, items.length - 1));
    return { items, entry: items[this.sel]?.entry };
  }

  private drawMenu(dt: number) {
    const { screen } = this;
    const W = screen.cols, H = screen.rows;
    const rows = this.rows(), { items, entry } = this.selected(rows);

    screen.text(1, 0, "ahoy", ACCENT);
    screen.text(6, 0, "· ascii art in your terminal", DIM);
    const count = `${items.length} piece${items.length === 1 ? "" : "s"}`;
    screen.text(W - count.length - 1, 0, count, DIM);

    const LW = Math.max(24, Math.min(34, Math.floor(W / 3)));
    const top = 1, h = H - 2;
    const title = this.searching ? `/${this.filter}▏` : this.filter ? `/${this.filter}` : "pieces";
    screen.box(0, top, LW, h, FRAME, title, this.searching || this.filter ? ACCENT : DIM);

    // the list, scrolled to keep the cursor in view
    const inner = h - 2, at = rows.findIndex((r) => "entry" in r && r.entry === entry);
    if (at >= 0) {
      if (at < this.scroll + 1) this.scroll = Math.max(0, at - 1);
      if (at >= this.scroll + inner) this.scroll = at - inner + 1;
    }
    this.scroll = Math.max(0, Math.min(this.scroll, Math.max(0, rows.length - inner)));
    for (let i = 0; i < inner; i++) {
      const row = rows[this.scroll + i];
      if (!row) break;
      const y = top + 1 + i;
      if ("head" in row) {
        screen.text(2, y, heading(row.head), OWN.includes(row.head) ? ACCENT : DIM, -1, LW - 4);
      } else {
        const on = row.entry === entry;
        if (on) screen.put(1, y, "▌", ACCENT);
        if (this.marked.has(row.entry.slug)) screen.put(2, y, "*", ACCENT);
        screen.text(3, y, row.entry.slug, on ? ACCENT : -1, -1, LW - 5);
      }
    }
    // the switch for the prototypes, in the bottom edge of the list
    if (this.all.some((e) => PROTOTYPES.includes(e.pack)))
      screen.text(2, top + h - 1, this.shown.prototypes ? " p · hide prototypes " : " p · show prototypes ", this.shown.prototypes ? ACCENT : DIM, -1, LW - 4);
    if (rows.length > inner) {
      // a scroll mark on the right edge
      const pos = top + 1 + Math.round(((inner - 1) * this.scroll) / Math.max(1, rows.length - inner));
      screen.put(LW - 1, pos, "┃", DIM);
    }

    // the preview, playing, on black unless the pieces are drawn for a light terminal
    const px = LW, pw = W - LW;
    screen.box(px, top, pw, h, FRAME, "preview", DIM);
    const black = !this.look.light;
    if (!entry) {
      screen.text(px + 3, top + 2, "nothing matches", DIM);
    } else {
      const preview = this.previewOf(entry);
      preview.tick(dt);
      preview.draw(screen, px + 2, top + 1, pw - 4, h - 3);
      const { meta } = entry.piece;
      const size = this.previewPaused ? `paused · frame ${preview.frameNo} · ,/. step · e export` : `${meta.cols}x${meta.rows}`;
      const n = screen.text(px + 2, top + h - 2, meta.name, ACCENT, -1, pw - 4);
      screen.text(px + 2 + n, top + h - 2, ` · ${meta.note}`, DIM, -1, pw - 6 - n - size.length);
      screen.text(px + pw - 2 - size.length, top + h - 2, size, FRAME);
    }
    if (black)
      for (let y = top + 1; y < top + h - 1; y++)
        for (let k = y * W + px + 1; k < y * W + px + pw - 1; k++) {
          if (screen.bg[k] < 0) screen.bg[k] = BLACK;
          if (screen.fg[k] < 0) screen.fg[k] = INK;
        }

    const marks = this.marked.size ? ` (${this.marked.size})` : "";
    const hint = this.searching
      ? "type to filter · enter done · esc clear"
      : `↑↓ move · enter play · space pause · x mark${marks} · s screensaver · / search · p prototypes · m mono · t light/dark · q quit`;
    if (this.clock < this.notice.until) screen.text(1, H - 1, this.notice.text, ACCENT, -1, W - 2);
    else screen.text(1, H - 1, hint, DIM, -1, W - 2);
  }

  // The next way of drawing a scene, and a word to say which.
  private scenes() {
    const scenes = SCENES[(SCENES.indexOf(this.look.scenes) + 1) % SCENES.length];
    this.look = { ...this.look, scenes };
    const what = { ascii: "in their dots on a square grid", dense: "a dot to every cell", braille: "in braille dots", crisp: "in sharp half blocks", soft: "in soft tones" }[scenes];
    this.notice = { text: `scenes drawn ${what} · d for the next`, until: this.clock + NOTICE };
  }

  // Saves the frame a paused piece is on as a PNG and a JPEG, and says where, or why not.
  private export(stage: Stage) {
    try {
      const [png] = save(stage.entry, stage.look, stage.frameNo, this.settings.out);
      // the name first, since a long folder is cut short: in this folder, or under home, or wherever it is
      const dir = dirname(png), here = relative(".", dir), home = relative(homedir(), dir);
      const where = !here ? "this folder" : !here.startsWith("..") ? here : !home.startsWith("..") ? join("~", home) : dir;
      this.notice = { text: `saved ${basename(png)} and .jpg in ${where}`, until: this.clock + NOTICE };
    } catch (e) {
      this.notice = { text: `could not save the frame: ${(e as Error).message}`, until: this.clock + NOTICE };
    }
  }

  // The preview of the piece under the cursor, made again when the cursor or the look moves.
  private previewOf(entry: Entry) {
    if (this.preview?.entry !== entry || this.preview.look !== this.look) {
      const t = this.preview?.entry === entry ? this.preview.t : 0;
      this.preview = new Stage(entry, this.look);
      this.preview.t = t;
    }
    this.preview.paused = this.previewPaused;
    return this.preview;
  }

  private menuKey(key: Key) {
    const rows = this.rows(), { items, entry } = this.selected(rows);
    if (this.searching) {
      if (key === "enter") this.searching = false;
      else if (key === "escape") (this.searching = false), (this.filter = "");
      else if (key === "backspace") this.filter = this.filter.slice(0, -1);
      else if (key === "up") this.sel--;
      else if (key === "down") this.sel++;
      else if (typeof key === "object") (this.filter += key.char), (this.sel = 0);
      return;
    }
    const page = Math.max(1, this.screen.rows - 6);
    const c = typeof key === "object" ? key.char : "";
    if (key === "up" || c === "k") this.sel--;
    else if (key === "down" || c === "j") this.sel++;
    else if (key === "pageup") this.sel -= page;
    else if (key === "pagedown") this.sel += page;
    else if (key === "home" || c === "g") this.sel = 0;
    else if (key === "end" || c === "G") this.sel = items.length - 1;
    else if (c === "/") (this.searching = true), (this.filter = "");
    else if (c === "m") this.look = { ...this.look, mono: !this.look.mono };
    else if (c === "t") this.look = { ...this.look, light: !this.look.light };
    else if (c === "d") this.scenes();
    else if (c === "p") {
      // the prototypes shown or hidden, the cursor staying on its piece if that is still listed
      this.shown = { ...this.shown, prototypes: !this.shown.prototypes };
      this.entries = listed(this.all, this.shown);
      const at = this.visible().indexOf(entry!);
      this.sel = Math.max(0, at);
      for (const slug of this.marked) if (!this.entries.some((e) => e.slug === slug)) this.marked.delete(slug);
    } else if (c === " ") this.previewPaused = !this.previewPaused;
    else if ((c === "," || c === ".") && entry) (this.previewPaused = true), this.previewOf(entry).step(c === "," ? -1 : 1);
    else if (c === "e" && entry && this.previewPaused) this.export(this.previewOf(entry));
    else if (c === "x" && entry) {
      if (!this.marked.delete(entry.slug)) this.marked.add(entry.slug);
      this.sel++;
    } else if ((key === "enter" || key === "right") && entry) this.start(items.map((r) => r.entry), this.sel, false, true);
    else if (c === "s" && entry) {
      // a screensaver over the marked pieces, or else over everything listed
      const list = this.marked.size ? this.entries.filter((e) => this.marked.has(e.slug)) : items.map((r) => r.entry);
      this.start(this.settings.shuffle ? shuffled(list) : list, 0, true, true);
    } else if (key === "escape" && this.filter) this.filter = "";
    else if (key === "escape" || c === "q") this.done();
  }

  // ---- the player and the screensaver

  private start(list: Entry[], index: number, saver: boolean, back: boolean) {
    this.screen.resize();
    const anchor: [number, number] = saver ? drift() : [0.5, 0.5];
    // a screensaver starts with no text on it
    this.player = { list, index, saver, back, stage: new Stage(list[index], this.look), anchor, shown: 0, hud: saver ? 0 : HUD };
  }

  private go(step: number) {
    const p = this.player!;
    p.fade = { from: this.screen.snapshot(), at: 0 };
    p.index = (p.index + step + p.list.length) % p.list.length;
    p.stage = new Stage(p.list[p.index], this.look);
    if (p.saver) p.anchor = drift();
    p.shown = 0;
  }

  private drawPlayer(dt: number) {
    const p = this.player!, { screen } = this;
    const W = screen.cols, H = screen.rows;
    p.stage.tick(dt);
    if (!p.stage.paused) p.shown += dt;
    p.hud -= dt;
    if (p.saver && p.list.length > 1 && p.shown >= this.settings.dwell) this.go(1);
    p.stage.draw(screen, 0, 0, W, H, ...p.anchor);

    if (p.fade) {
      p.fade.at += dt;
      const k = p.fade.at / FADE, from = p.fade.from;
      if (k >= 1 || from.cols !== W || from.rows !== H) p.fade = undefined;
      else
        for (let i = 0; i < W * H; i++)
          if (grain(i) > k) (screen.ch[i] = from.ch[i]), (screen.fg[i] = from.fg[i]), (screen.bg[i] = from.bg[i]);
    }

    // The bar stays up while paused, but on a screensaver only for a moment after a key.
    if (p.hud > 0 || (p.stage.paused && !p.saver)) {
      const { meta } = p.stage;
      screen.fill(0, H - 1, W, 1);
      let x = 1;
      if (p.list.length > 1) x += screen.text(x, H - 1, `${p.index + 1}/${p.list.length}  `, DIM);
      x += screen.text(x, H - 1, meta.name, ACCENT);
      const keys = p.stage.paused
        ? `paused · frame ${p.stage.frameNo} · ,/. step · e export · ${p.list.length > 1 ? "←→ skip · " : ""}space play · q ${p.back ? "back" : "quit"}`
        : `${p.list.length > 1 ? "←→ skip · " : ""}space pause · q ${p.back ? "back" : "quit"}`;
      if (this.clock < this.notice.until) screen.text(x, H - 1, ` · ${this.notice.text}`, ACCENT, -1, W - x - 1);
      else {
        screen.text(x, H - 1, ` · ${meta.note}`, DIM, -1, W - x - keys.length - 3);
        screen.text(W - keys.length - 1, H - 1, keys, DIM);
      }
    }
  }

  private playerKey(key: Key) {
    const p = this.player!;
    const c = typeof key === "object" ? key.char : "";
    p.hud = HUD;
    if (key === "right" || c === "n" || c === "l") this.go(1);
    else if (key === "left" || c === "p" || c === "h") this.go(-1);
    else if (c === " ") p.stage.paused = !p.stage.paused;
    else if (c === "," || c === ".") (p.stage.paused = true), p.stage.step(c === "," ? -1 : 1);
    else if (c === "e" && p.stage.paused) this.export(p.stage);
    else if (c === "m" || c === "t" || c === "d") {
      if (c === "d") this.scenes();
      else this.look = c === "m" ? { ...this.look, mono: !this.look.mono } : { ...this.look, light: !this.look.light };
      const { t, paused } = p.stage;
      p.stage = new Stage(p.list[p.index], this.look);
      Object.assign(p.stage, { t, paused });
    } else if (key === "escape" || c === "q") {
      if (!p.back) return this.done();
      this.player = undefined;
      this.screen.resize();
    }
  }

  private key(key: Key) {
    if (key === "ctrl-c") return this.done();
    if (this.player) this.playerKey(key);
    else this.menuKey(key);
  }
}

/** A piece's first frame as plain text, for a pipe or a log, where nothing plays. */
export function still({ piece }: Entry) {
  return piece.default({ ...piece.meta.options })(0, {});
}

export const tty = () => process.stdout.isTTY === true && process.stdin.isTTY === true;
