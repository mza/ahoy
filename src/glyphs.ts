/*
 * The characters a piece is made of, drawn as pixels, for a picture of a frame
 * saved to a file, where there is no terminal and no font to draw them:
 *  - block elements as the parts of the cell they fill, shades as part ink;
 *  - box drawing as lines from the middle of the cell to its edges;
 *  - the dots a scene is painted in as discs;
 *  - everything else in a small bitmap font of ahoy's own, five pixels by seven
 *    with two more for descenders.
 */

/** A picture being drawn: `size` pixels each way, four bytes a pixel, red, green, blue and how solid. */
export interface Canvas {
  size: number;
  rgba: Uint8Array;
}

// The font: a character, then its rows from the top, each a base-32 digit of five bits, the left pixel the high one.
const FONT = new Map<string, number[]>(
  [
  "!4444404",
  "\"aaa0000",
  "#aavavaa",
  "$4fke5u4",
  "%pp248jj",
  "&cik8lid",
  "'4440000",
  "(2488842",
  ")8422248",
  "*04lel40",
  "+044v440",
  ",00000448",
  "-000v000",
  ".00000cc",
  "/11248gg",
  "0ehjlphe",
  "14c4444e",
  "2eh1248v",
  "3v2421he",
  "426aiv22",
  "5vgu11he",
  "668guhhe",
  "7v124888",
  "8ehhehhe",
  "9ehhf12c",
  ":0cc0cc0",
  ";0cc0c48",
  "<248g842",
  "=00v0v00",
  ">8421248",
  "?eh12404",
  "@ehnlngf",
  "Aehhvhhh",
  "Buhhuhhu",
  "Cehggghe",
  "Dsihhhis",
  "Evgguggv",
  "Fvgguggg",
  "Gehgnhhf",
  "Hhhhvhhh",
  "Ie44444e",
  "J72222ic",
  "Khikokih",
  "Lggggggv",
  "Mhrllhhh",
  "Nhhpljhh",
  "Oehhhhhe",
  "Puhhuggg",
  "Qehhhlid",
  "Ruhhukih",
  "Sfgge11u",
  "Tv444444",
  "Uhhhhhhe",
  "Vhhhhha4",
  "Whhhllla",
  "Xhha4ahh",
  "Yhhha444",
  "Zv1248gv",
  "[e88888e",
  "\\gg84211",
  "]e22222e",
  "^4ah0000",
  "_0000000v",
  "`8420000",
  "a00e1fhf",
  "bggmphhu",
  "c00egghe",
  "d11djhhf",
  "e00ehvge",
  "f698s888",
  "g00fhhf11e",
  "hggmphhh",
  "i40c444e",
  "j2062222ic",
  "kggikoki",
  "lc44444e",
  "m00qllhh",
  "n00mphhh",
  "o00ehhhe",
  "p00uhhuggg",
  "q00fhhf111",
  "r00mpggg",
  "s00fge1u",
  "t88s8896",
  "u00hhhjd",
  "v00hhha4",
  "w00hhlla",
  "x00ha4ah",
  "y00hhhf11e",
  "z00v248v",
  "{2448442",
  "|444444444",
  "}8442448",
  "~008l200",
  ].map((g) => [g[0], [...g.slice(1)].map((d) => parseInt(d, 32))]),
);

// Box drawing, U+2500 to U+257F, five characters each: the weight of its arm up, down, left and right (0 none, 1 light,
// 2 heavy, 3 double), then "a" for a rounded corner, 1, 2 or 3 for a diagonal (rising, falling, both), or "-".
const BOX = [
  "0011-0022-1100-2200-0011-0022-1100-2200-0011-0022-1100-2200-0101-0102-0201-0202-0110-0120-0210-0220-1001-1002-2001-2002-1010-1020-2010-2020-1101-1102-2101-1201-",
  "2201-2102-1202-2202-1110-1120-2110-1210-2210-2120-1220-2220-0111-0121-0112-0122-0211-0221-0212-0222-1011-1021-1012-1022-2011-2021-2012-2022-1111-1121-1112-1122-",
  "2111-1211-2211-2121-2112-1221-1212-2122-1222-2221-2212-2222-0011-0022-1100-2200-0033-3300-0103-0301-0303-0130-0310-0330-1003-3001-3003-1030-3010-3030-1103-3301-",
  "3303-1130-3310-3330-0133-0311-0333-1033-3011-3033-1133-3311-3333-0101a0110a1010a1001a0000100002000030010-1000-0001-0100-0020-2000-0002-0200-0012-1200-0021-2100-",
].join("");

// How much of the cell each block element fills: left, top, right, bottom, in eighths.
const BLOCKS: Record<string, number[]> = {
  "█": [0, 0, 8, 8], "▀": [0, 0, 8, 4], "▄": [0, 4, 8, 8], "▌": [0, 0, 4, 8], "▐": [4, 0, 8, 8],
  "▁": [0, 7, 8, 8], "▂": [0, 6, 8, 8], "▃": [0, 5, 8, 8], "▅": [0, 3, 8, 8], "▆": [0, 2, 8, 8], "▇": [0, 1, 8, 8],
  "▉": [0, 0, 7, 8], "▊": [0, 0, 6, 8], "▋": [0, 0, 5, 8], "▍": [0, 0, 3, 8], "▎": [0, 0, 2, 8], "▏": [0, 0, 1, 8],
  "▔": [0, 0, 8, 1], "▕": [7, 0, 8, 8],
};
// The quadrants: which of upper left, upper right, lower left and lower right are filled.
const QUADRANTS: Record<string, number[]> = {
  "▖": [0, 0, 1, 0], "▗": [0, 0, 0, 1], "▘": [1, 0, 0, 0], "▙": [1, 0, 1, 1], "▚": [1, 0, 0, 1],
  "▛": [1, 1, 1, 0], "▜": [1, 1, 0, 1], "▝": [0, 1, 0, 0], "▞": [0, 1, 1, 0], "▟": [0, 1, 1, 1],
};
const SHADES: Record<string, number> = { "░": 0.25, "▒": 0.5, "▓": 0.75 };
// The dots, as a share of the room a disc has in its cell.
const DOTS: Record<string, number> = { "·": 0.3, "•": 0.6, "●": 1 };

function fill(c: Canvas, x0: number, y0: number, x1: number, y1: number, rgb: number, alpha = 255) {
  x0 = Math.max(0, Math.round(x0)), y0 = Math.max(0, Math.round(y0));
  x1 = Math.min(c.size, Math.round(x1)), y1 = Math.min(c.size, Math.round(y1));
  for (let y = y0; y < y1; y++)
    for (let x = x0, i = (y * c.size + x0) * 4; x < x1; x++, i += 4) {
      c.rgba[i] = rgb >> 16;
      c.rgba[i + 1] = (rgb >> 8) & 255;
      c.rgba[i + 2] = rgb & 255;
      c.rgba[i + 3] = alpha;
    }
}

// A disc, or a ring `ring` pixels thick, its edge softened: each pixel as solid as the share of it inside.
function disc(c: Canvas, cx: number, cy: number, r: number, rgb: number, ring = 0) {
  for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(c.size, cy + r + 1); y++)
    for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(c.size, cx + r + 1); x++) {
      let n = 0;
      for (let j = 0; j < 4; j++)
        for (let i = 0; i < 4; i++) {
          const d = Math.hypot(x + (i + 0.5) / 4 - cx, y + (j + 0.5) / 4 - cy);
          if (d <= r && (!ring || d >= r - ring)) n++;
        }
      if (n) fill(c, x, y, x + 1, y + 1, rgb, Math.round((n / 16) * 255));
    }
}

// A line `t` pixels thick from one point to another, as square dabs along it.
function stroke(c: Canvas, x0: number, y0: number, x1: number, y1: number, t: number, rgb: number) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
    fill(c, x - t / 2, y - t / 2, x + t / 2, y + t / 2, rgb);
  }
}

function box(c: Canvas, code: number, x: number, y: number, w: number, h: number, rgb: number) {
  const [u, d, l, r] = [0, 1, 2, 3].map((i) => Number(BOX[code * 5 + i])), kind = BOX[code * 5 + 4];
  const light = Math.max(1, Math.round(w / 9)), heavy = light * 2 + 1, cx = x + w / 2, cy = y + h / 2;
  if (kind === "1" || kind === "3") stroke(c, x, y + h, x + w, y, light, rgb);
  if (kind === "2" || kind === "3") stroke(c, x, y, x + w, y + h, light, rgb);
  if (kind >= "1" && kind <= "3") return;
  if (kind === "a") {
    // a quarter circle between the two arms, and what is left of each arm beyond it
    const rad = Math.min(w, h) / 2, sx = r ? 1 : -1, sy = d ? 1 : -1, ox = cx + sx * rad, oy = cy + sy * rad;
    for (let a = 0; a <= 32; a++) {
      const t = (a / 32) * (Math.PI / 2);
      const px = ox - sx * rad * Math.cos(t), py = oy - sy * rad * Math.sin(t);
      fill(c, px - light / 2, py - light / 2, px + light / 2, py + light / 2, rgb);
    }
    stroke(c, ox, cy, sx > 0 ? x + w : x, cy, light, rgb);
    stroke(c, cx, oy, cx, sy > 0 ? y + h : y, light, rgb);
    return;
  }
  // a double arm is two light lines `gap` either side of the middle, stopping at the square where they meet
  const gap = Math.max(1, Math.round(light * 1.5)), t = (k: number) => (k === 2 ? heavy : light) / 2;
  const single = (k: number) => k === 1 || k === 2;
  if (single(u)) fill(c, cx - t(u), y, cx + t(u), cy + t(u), rgb);
  if (single(d)) fill(c, cx - t(d), cy - t(d), cx + t(d), y + h, rgb);
  if (single(l)) fill(c, x, cy - t(l), cx + t(l), cy + t(l), rgb);
  if (single(r)) fill(c, cx - t(r), cy - t(r), x + w, cy + t(r), rgb);
  if (![u, d, l, r].includes(3)) return;
  const e = light / 2;
  for (const s of [-gap, gap]) {
    if (u === 3) fill(c, cx + s - e, y, cx + s + e, cy - gap + e, rgb);
    if (d === 3) fill(c, cx + s - e, cy + gap - e, cx + s + e, y + h, rgb);
    if (l === 3) fill(c, x, cy + s - e, cx - gap + e, cy + s + e, rgb);
    if (r === 3) fill(c, cx + gap - e, cy + s - e, x + w, cy + s + e, rgb);
  }
  // the sides of that square with no double arm through them close it
  if (u !== 3) fill(c, cx - gap - e, cy - gap - e, cx + gap + e, cy - gap + e, rgb);
  if (d !== 3) fill(c, cx - gap - e, cy + gap - e, cx + gap + e, cy + gap + e, rgb);
  if (l !== 3) fill(c, cx - gap - e, cy - gap - e, cx - gap + e, cy + gap + e, rgb);
  if (r !== 3) fill(c, cx + gap - e, cy - gap - e, cx + gap + e, cy + gap + e, rgb);
}

/** Draws one character into the cell at (x, y), `w` pixels by `h`, in the colour `rgb`. */
export function glyph(c: Canvas, ch: string, x: number, y: number, w: number, h: number, rgb: number) {
  if (ch === " ") return;
  const code = ch.codePointAt(0)!;
  const block = BLOCKS[ch], quad = QUADRANTS[ch];
  if (block) return fill(c, x + (block[0] * w) / 8, y + (block[1] * h) / 8, x + (block[2] * w) / 8, y + (block[3] * h) / 8, rgb);
  if (quad) return quad.forEach((on, i) => on && fill(c, x + ((i & 1) * w) / 2, y + ((i >> 1) * h) / 2, x + (((i & 1) + 1) * w) / 2, y + (((i >> 1) + 1) * h) / 2, rgb));
  if (ch in SHADES) return fill(c, x, y, x + w, y + h, rgb, Math.round(SHADES[ch] * 255));
  if (code >= 0x2500 && code <= 0x257f) return box(c, code - 0x2500, x, y, w, h, rgb);
  if (ch in DOTS) return disc(c, x + w / 2, y + h / 2, Math.max(0.8, w * 0.5 * DOTS[ch] * (h > w ? 0.9 : 1.1)), rgb);
  if (ch === "°") return disc(c, x + w / 2, y + h * 0.3, w * 0.28, rgb, Math.max(1, w / 9));
  const rows = FONT.get(ch), unit = Math.floor(Math.min(w / 6, h / 10));
  // a cell too small for the font, or a character it has not got: a dot
  if (!rows || unit < 1) return disc(c, x + w / 2, y + h / 2, Math.max(0.8, w * 0.3), rgb);
  const left = x + Math.round((w - 5 * unit) / 2), top = y + Math.round((h - 9 * unit) / 2);
  rows.forEach((bits, j) => {
    for (let i = 0; i < 5; i++) if (bits & (16 >> i)) fill(c, left + i * unit, top + j * unit, left + (i + 1) * unit, top + (j + 1) * unit, rgb);
  });
}
