/*
 * The screensaver in a browser: a page that fills the screen and draws each
 * piece as a page does, a scene as its dots, round, on a square grid, which
 * no terminal can. ahoy serves the page to this machine alone, sends it the
 * frames as they come, and opens a browser on it with nothing round it; a
 * key or a click there ends it.
 *
 * The pieces stay here: the page is told what to draw, a frame at a time,
 * so it is the same few lines whatever is played.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import type { Entry } from "./catalog.ts";

export interface WebSettings {
  dwell: number;
  shuffle: boolean;
  mono: boolean;
  light: boolean;
}

// Browsers that can open a page as a window of its own, with nothing round it, filling the screen.
const CHROMES = ["chromium", "chromium-browser", "google-chrome-stable", "google-chrome", "brave", "brave-browser", "microsoft-edge"];

const PAGE = `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>ahoy</title>
<style>
  html, body { margin: 0; height: 100%; background: #000; overflow: hidden; cursor: none; }
  canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; transition: opacity 1.2s ease; }
</style>
<canvas id="a"></canvas><canvas id="b" style="opacity: 0"></canvas>
<script>
// How much of its cell each of a scene's dots is across.
const DOTS = { "·": 0.34, "•": 0.62, "●": 0.96 };
// The parts of a cell the block elements fill: left, top, right, bottom, in eighths.
const BLOCKS = { "█": [0, 0, 8, 8], "▀": [0, 0, 8, 4], "▄": [0, 4, 8, 8], "▌": [0, 0, 4, 8], "▐": [4, 0, 8, 8] };
const SHADES = { "░": 0.25, "▒": 0.5, "▓": 0.75 };
const canvases = [document.getElementById("a"), document.getElementById("b")];
let front = 0, piece = null, place = [0.5, 0.5];

function size(c) {
  const k = window.devicePixelRatio || 1;
  c.width = Math.round(innerWidth * k);
  c.height = Math.round(innerHeight * k);
}
canvases.forEach(size);
addEventListener("resize", () => canvases.forEach(size));

function draw(frame) {
  if (!piece) return;
  const c = canvases[front], g = c.getContext("2d"), { cols, rows, palette, ground } = piece;
  const tall = piece.cell === 1 ? 1 : 2, lines = frame.text.split("\\n");
  const ink = frame.color ? Uint8Array.from(atob(frame.color), (ch) => ch.charCodeAt(0)) : null;
  // a cell as large as fits with a margin, in whole pixels, the piece somewhere in the room left over
  const w = Math.max(1, Math.floor(Math.min((c.width * 0.94) / cols, (c.height * 0.94) / (rows * tall)))), h = w * tall;
  const left = Math.round((c.width - cols * w) * place[0]), top = Math.round((c.height - rows * h) * place[1]);
  g.fillStyle = "#000";
  g.fillRect(0, 0, c.width, c.height);
  if (ground) (g.fillStyle = ground), g.fillRect(left, top, cols * w, rows * h);
  // the cells of each colour together, so each colour is filled once
  const by = new Map();
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const ch = lines[y] ? lines[y][x] : " ";
      if (!ch || ch === " ") continue;
      const colour = ink ? palette[ink[y * cols + x]] || palette[0] : piece.ink;
      if (!by.has(colour)) by.set(colour, []);
      by.get(colour).push(x, y, ch);
    }
  g.textBaseline = "middle";
  g.textAlign = "center";
  g.font = Math.round(h * 0.86) + "px ui-monospace, 'JetBrains Mono', Menlo, Consolas, monospace";
  for (const [colour, cells] of by) {
    g.fillStyle = colour;
    g.beginPath();
    const text = [];
    for (let i = 0; i < cells.length; i += 3) {
      const x = left + cells[i] * w, y = top + cells[i + 1] * h, ch = cells[i + 2];
      const dot = DOTS[ch], block = BLOCKS[ch];
      if (dot && tall === 1) {
        g.moveTo(x + w / 2 + (w * dot) / 2, y + h / 2);
        g.arc(x + w / 2, y + h / 2, (w * dot) / 2, 0, 2 * Math.PI);
      } else if (block) g.rect(x + (block[0] * w) / 8, y + (block[1] * h) / 8, ((block[2] - block[0]) * w) / 8, ((block[3] - block[1]) * h) / 8);
      else text.push(x, y, ch);
    }
    g.fill();
    for (let i = 0; i < text.length; i += 3) {
      const shade = SHADES[text[i + 2]];
      if (shade) (g.globalAlpha = shade), g.fillRect(text[i], text[i + 1], w, h), (g.globalAlpha = 1);
      else g.fillText(text[i + 2], text[i] + w / 2, text[i + 1] + h / 2);
    }
  }
}

const events = new EventSource("/events");
events.addEventListener("piece", (e) => {
  // the next piece on the other canvas, somewhere new, the one fading into the other
  const first = !piece;
  piece = JSON.parse(e.data);
  place = piece.drift ? [0.15 + 0.7 * Math.random(), 0.15 + 0.7 * Math.random()] : [0.5, 0.5];
  if (first) return;
  front = 1 - front;
  canvases[front].style.opacity = 1;
  canvases[1 - front].style.opacity = 0;
});
events.addEventListener("frame", (e) => draw(JSON.parse(e.data)));
events.onerror = () => close();

// a key, a click, or the mouse moved in earnest, ends it
let quitting = false, from = null;
const born = performance.now();
function quit() {
  if (quitting) return;
  quitting = true;
  fetch("/quit").catch(() => {}).finally(() => close());
}
addEventListener("keydown", quit);
addEventListener("mousedown", quit);
addEventListener("mousemove", (e) => {
  if (performance.now() - born < 1500) return;
  from = from || [e.screenX, e.screenY];
  if (Math.hypot(e.screenX - from[0], e.screenY - from[1]) > 40) quit();
});
</script>
</html>
`;

const shuffled = <T>(xs: T[]) => {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// The command that opens the page: the one named in AHOY_BROWSER, or a browser found that can fill the screen with it.
function browser(url: string, profile: string): [string, string[]] | undefined {
  const named = process.env.AHOY_BROWSER;
  if (named === "none") return undefined;
  if (named) return [named, [url]];
  const found = CHROMES.find((name) => spawnSync("sh", ["-c", `command -v ${name}`]).status === 0);
  // a profile of its own, so that it is a browser of its own, which closes when it is told to
  if (found) return [found, ["--kiosk", `--app=${url}`, `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check", "--disable-features=Translate"]];
  if (spawnSync("sh", ["-c", "command -v firefox"]).status === 0) return ["firefox", ["--kiosk", url]];
  return [process.platform === "darwin" ? "open" : "xdg-open", [url]];
}

/** Plays `list` in a browser, one piece after another, until a key or a click there, or Ctrl+C here. */
export function serve(list: Entry[], settings: WebSettings) {
  return new Promise<void>((resolve) => {
    const order = settings.shuffle ? shuffled(list) : list;
    const watching = new Set<ServerResponse>();
    let child: ChildProcess | undefined, done = false;
    const profile = mkdtempSync(join(tmpdir(), "ahoy-browser-"));

    const finish = () => {
      if (done) return;
      done = true;
      for (const res of watching) res.end();
      server.close();
      child?.kill();
      // the browser may still be letting go of its profile
      setTimeout(() => {
        rmSync(profile, { recursive: true, force: true });
        resolve();
      }, 300);
    };

    // One watcher's show: each piece for its dwell, a frame at a time at the piece's own rate.
    const play = (res: ServerResponse) => {
      let index = 0, timer: ReturnType<typeof setTimeout> | undefined;
      const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      const start = () => {
        const { piece } = order[index % order.length], { meta } = piece;
        const colour = !settings.mono && !!meta.palette, paper = colour && meta.ground ? false : settings.light;
        const frame = piece.default({ ...meta.options });
        const color = colour ? new Uint8Array(meta.cols * meta.rows) : undefined;
        send("piece", {
          name: meta.name, cols: meta.cols, rows: meta.rows, cell: meta.cell ?? 2, drift: order.length > 1,
          palette: meta.palette ?? [], ground: colour ? (meta.ground ?? "") : "", ink: paper ? "#1c1f24" : "#e8ebef",
        });
        const fps = meta.fps > 0 ? meta.fps : 1, began = Date.now();
        let n = 0;
        const tick = () => {
          if (done || res.destroyed) return;
          const t = (Date.now() - began) / 1000;
          if (order.length > 1 && t >= settings.dwell) return void (index++, start());
          // a watcher that has fallen behind is not sent this frame
          if (!res.writableNeedDrain) send("frame", { text: frame(meta.fps > 0 ? t : 0, { paper, color }), color: color ? Buffer.from(color).toString("base64") : "" });
          timer = setTimeout(tick, Math.max(0, began + (++n * 1000) / fps - Date.now()));
        };
        tick();
      };
      res.on("close", () => {
        clearTimeout(timer);
        watching.delete(res);
      });
      start();
    };

    const server = createServer((req, res) => {
      if (req.url === "/") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
        res.end(PAGE);
      } else if (req.url === "/events") {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
        watching.add(res);
        play(res);
      } else if (req.url === "/quit") {
        res.writeHead(204);
        res.end();
        finish();
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
      const command = browser(url, profile);
      if (!command) return void process.stdout.write(`ahoy: the screensaver is at ${url}; Ctrl+C ends it\n`);
      process.stdout.write(`ahoy: playing in ${command[0]}; a key or a click there ends it, or Ctrl+C here\n`);
      child = spawn(command[0], command[1], { stdio: "ignore" });
      child.on("error", () => process.stdout.write(`ahoy: could not start ${command[0]}; the screensaver is at ${url}\n`));
      // a browser of its own ends the show when it is closed; one that only passes the page on does not
      if (command[1].some((a) => a.startsWith("--user-data-dir"))) child.on("exit", finish);
    });
    process.on("SIGINT", finish);
    process.on("SIGTERM", finish);
  });
}
