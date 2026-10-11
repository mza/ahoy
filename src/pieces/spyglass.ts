/*
 * spyglass: a brass spyglass laid level across the foot of the round view it
 * gives, like the bar across a badge: a ship on the horizon, rising and falling on the swell,
 * and a glint crossing the glass. Every few seconds the view closes, the draw tubes
 * slide home one by one, and they are drawn out again, one by one, until the
 * view opens.
 *
 * Drawn from geometry every frame and sampled three by four in each cell: a
 * cell the brass fills takes a shade of it, and a cell on its edge takes the
 * character whose shape matches the edge through it.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "spyglass",
  category: "scenes",
  note: "a brass spyglass drawn out tube by tube, a ship in its round view",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // brass from lit to shadow, the leather, then bone from bright to faint
  palette: ["#ffe08a", "#e2a93c", "#a8742a", "#5e3b14", "#ece6d6", "#a29d91", "#5d5a52"],
} satisfies Meta;

const LIT = 0, BRASS = 1, SHADE = 2, LEATHER = 3, BONE = 4, MID = 5, DARK = 6;
const LOOP = 10;

// The view: a circle, in cell widths, with a thin brass bezel round it.
const CX = 40, CY = 27, VIEW = 17, BEZEL = 18.6;
// The spyglass lies level across the foot of it, its objective end to the right: its axis runs from there to the
// eyepiece.
const OX = 72, OY = 50, DIR = [-1, 0];
// Along the axis: the barrel, then three draw tubes, each narrower, then the eyepiece.
const BARREL = 21, TUBE = 12, RADII = [5.6, 4.3, 3.3, 2.5], CAP = [2, 3];

const NONE = 0, RIM = 1, GLASS = 2, BODY = 3, BAND = 4, DRAW = 5, EYE = 6;

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// How far each draw tube is out, 0 home to 1 drawn, and how open the view is, at u seconds into the loop.
function state(u: number) {
  const out = [1, 1, 1];
  // home from the eyepiece end, 4.8 to 6.3 s; out again from the barrel, 7.6 to 9.1 s
  for (let i = 0; i < 3; i++) {
    const home = smooth((u - 4.8 - (2 - i) * 0.5) / 0.4), back = smooth((u - 7.6 - i * 0.5) / 0.4);
    out[i] = u < 7.6 ? 1 - home : back;
  }
  const open = u < 4 ? 1 : u < 4.8 ? 1 - smooth((u - 4) / 0.8) : u < 9.1 ? 0 : smooth((u - 9.1) / 0.8);
  return { out, open };
}

const TEMPLATES: [string, string][] = [
  ["_", "000000000555"], [".", "000000000050"], ["'", "050000000000"], ['"', "555000000000"],
  ["p", "000059599999"], ["q", "000950995999"], ["P", "999999995950"], ["Y", "999999599059"],
  ["d", "399399399399"], ["b", "993993993993"], ["|", "090090090090"], ["/", "009059590900"],
  ["\\", "900950095009"], [",", "000000005059"], ["o", "000000999999"], ["9", "999999999000"],
];
const SHAPE: string[] = [];
for (let bits = 0; bits < 4096; bits++) {
  let best = " ", err = Infinity;
  for (const [c, t] of TEMPLATES) {
    let e = 0;
    for (let i = 0; i < 12; i++) e += (((bits >> i) & 1) - +t[i] / 9) ** 2;
    if (e < err) (err = e), (best = c);
  }
  SHAPE[bits] = best;
}

const SHIP = [
  "    |\\    ",
  "    |_\\   ",
  "  __|__\\_ ",
  "  \\_____/ ",
];

export default function spyglass(): Frame {
  const { cols, rows } = meta;
  const n = cols * rows;
  const ids = new Uint8Array(12), shades = new Float32Array(12);
  const STARS = [[30, 9], [36, 7], [47, 8], [52, 11], [27, 12], [41, 10], [33, 13], [50, 6]];

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const { out, open } = state(u);
    // where each piece starts and ends along the axis
    const ends = [BARREL];
    for (let i = 0; i < 3; i++) ends.push(ends[i] + 0.6 + TUBE * out[i]);
    const capAt = ends[3];

    // what a point is, and for brass, how it is lit: -1 the lit edge to 1 the shadowed one
    const at = (x: number, y: number, k: number) => {
      shades[k] = 0;
      const tube = scope(x, y, k);
      if (tube) return tube;
      const r = Math.hypot(x - CX, y - CY);
      if (r < VIEW) return GLASS;
      if (r < BEZEL) return (shades[k] = (r - (VIEW + BEZEL) / 2) / 1.3 + ((x - CX) + (y - CY)) / (BEZEL * 2.5)), RIM;
      return NONE;
    };
    const scope = (x: number, y: number, k: number) => {
      const px = x - OX, py = y - OY;
      const s = px * DIR[0] + py * DIR[1], off = px * -DIR[1] + py * DIR[0];
      if (s < 0) return NONE;
      const piece = (radius: number) => {
        if (Math.abs(off) >= radius) return false;
        // lit from above: -1 its top edge, 1 its bottom
        shades[k] = -off / radius;
        return true;
      };
      if (s < ends[0]) {
        // a collar at each end of the barrel, leather round its middle and brass either side
        if ((s < 2 || s > ends[0] - 1.4) && piece(RADII[0] + 0.6)) return BAND;
        if (s > 6 && s < 15) return piece(RADII[0] + 0.15) ? BODY : NONE;
        return piece(RADII[0]) ? DRAW : NONE;
      }
      for (let i = 0; i < 3; i++)
        if (s < ends[i + 1]) {
          if (s > ends[i + 1] - 0.9 && piece(RADII[i + 1] + 0.35)) return BAND;
          return piece(RADII[i + 1]) ? DRAW : NONE;
        }
      if (s < capAt + CAP[1] && piece(CAP[0])) return EYE;
      return NONE;
    };

    const outCh = new Array<string>(n).fill(" "), ink = new Uint8Array(n);
    for (let cy = 0; cy < rows; cy++)
      for (let cx = 0; cx < cols; cx++) {
        let bits = 0, glass = 0, best = NONE, shade = 0, solid = 0;
        for (let j = 0; j < 4; j++)
          for (let i = 0; i < 3; i++) {
            const k = j * 3 + i;
            const m = (ids[k] = at(cx + (i + 0.5) / 3, (cy + (j + 0.5) / 4) * 2, k));
            if (m === GLASS) glass++;
            else if (m !== NONE) {
              bits |= 1 << k;
              solid++;
              shade += shades[k];
              if (m === BAND || best === NONE) best = m;
            }
          }
        const c = cy * cols + cx;
        if (glass >= 6) {
          outCh[c] = "\0";
          continue;
        }
        if (!solid) continue;
        shade /= solid;
        const tone = best === BODY ? LEATHER : best === BAND || shade < -0.45 ? LIT : shade < 0.3 ? BRASS : SHADE;
        // brass shines along its top in a line, and hatches into shadow underneath; the leather is stitched
        if (bits === 4095) outCh[c] = best === BODY ? ((cx + cy) % 3 ? "%" : "+") : best === BAND ? "║" : shade < -0.45 ? "=" : shade < 0.3 ? "8" : "#";
        else {
          const s = SHAPE[bits];
          const left = cx === 0 || !(ids[0] || ids[3] || ids[6] || ids[9]);
          outCh[c] = s === "o" ? (left ? "p" : "q") : s === "9" ? (left ? "Y" : "P") : s;
        }
        ink[c] = best === BODY ? (bits === 4095 ? SHADE : BRASS) : tone;
      }

    // the view: stars, the sea and the ship, inside as much of the circle as is open
    const reach = VIEW * open, horizon = 15;
    const bob = Math.round(0.6 * Math.sin((u / LOOP) * 4 * Math.PI));
    for (let cy = 0; cy < rows; cy++)
      for (let cx = 0; cx < cols; cx++) {
        const c = cy * cols + cx;
        if (outCh[c] !== "\0") continue;
        outCh[c] = " ";
        const r = Math.hypot(cx + 0.5 - CX, cy * 2 + 1 - CY);
        if (r > reach) continue;
        const edge = r > reach - 3;
        if (cy > horizon) {
          const w = (cx + Math.floor(u * 3) * (cy % 2 ? 1 : -1) + cy * 3) % 7;
          outCh[c] = cy === horizon + 1 ? (w < 5 ? "~" : "-") : w < 2 ? "~" : w < 3 ? "-" : " ";
          ink[c] = cy < horizon + 4 && !edge ? MID : DARK;
        } else if (cy === horizon) {
          outCh[c] = "_";
          ink[c] = MID;
        }
      }
    const inView = (cx: number, cy: number) => Math.hypot(cx + 0.5 - CX, cy * 2 + 1 - CY) < reach - 1;
    STARS.forEach(([sx, sy], i) => {
      if (!inView(sx, sy)) return;
      const k = sy * cols + sx;
      outCh[k] = Math.sin(u * 2.5 + i * 1.7) > 0.3 ? "+" : ".";
      ink[k] = i % 3 ? MID : BONE;
    });
    SHIP.forEach((line, j) =>
      [...line].forEach((ch, i) => {
        const x = 44 + i, y = horizon - 3 + j + bob;
        if (ch === " " || !inView(x, y)) return;
        const k = y * cols + x;
        outCh[k] = ch;
        ink[k] = BONE;
      }),
    );
    // a glint across the glass, about once a loop
    const g = (u - 1.6) / 0.9;
    if (open > 0.9 && g > 0 && g < 1)
      for (let cy = 0; cy < rows; cy++)
        for (let cx = 0; cx < cols; cx++) {
          const along = cx - CX + (cy * 2 - CY) * 0.5, at = -VIEW + 2.4 * VIEW * g;
          if (Math.abs(along - at) < 1.1 && inView(cx, cy)) {
            const k = cy * cols + cx;
            outCh[k] = "╱";
            ink[k] = BONE;
          }
        }

    if (color) color.set(ink);
    const lines: string[] = [];
    for (let y = 0; y < rows; y++) lines.push(outCh.slice(y * cols, (y + 1) * cols).join(""));
    return lines.join("\n");
  };
}
