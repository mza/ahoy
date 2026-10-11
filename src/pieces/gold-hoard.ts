/*
 * gold-hoard: an open treasure chest seen from the front, its barrel-topped
 * lid thrown back behind it, a mound of gold rising out of it. A goblet and a
 * red gem poke out of the gold and a string of pearls hangs over the front
 * edge. Sparkles twinkle across the gold in turn, and now and then a coin
 * slides down the mound and drops over the front of the chest to the ground.
 *
 * Pixel art in block elements, two square pixels a cell, each pixel drawn on
 * its own, in six flat colours. The chest is a box of planks with brass
 * bands, corners and a lock; the mound is one mass of gold, darker
 * underneath, with coins along its skyline and a few coin edges inside it. A
 * black gap round each part keeps it readable in one ink.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "gold hoard",
  category: "scenes",
  note: "an open treasure chest heaped with gold, sparkling, a coin sliding off",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // wood and its shade, gold and its shade, bone, and a red gem
  palette: ["#a8703a", "#6f4722", "#f2b632", "#b9821c", "#e8e2d0", "#e23a2e"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const WOOD = 1, DARK = 2, GOLD = 3, DEEP = 4, BONE = 5, RED = 6;

const set = (p: Uint8Array, x: number, y: number, k: number) => {
  x = Math.round(x), y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) p[y * W + x] = k;
};
const rect = (p: Uint8Array, x: number, y: number, w: number, h: number, k: number) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(p, x + i, y + j, k);
};
const disc = (p: Uint8Array, cx: number, cy: number, rx: number, ry: number, k: number) => {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) set(p, x, y, k);
};
const line = (p: Uint8Array, x0: number, y0: number, x1: number, y1: number, k: number, thick = 1) => {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  for (let i = 0; i <= n; i++) rect(p, Math.round(x0 + ((x1 - x0) * i) / n - (thick - 1) / 2), Math.round(y0 + ((y1 - y0) * i) / n - (thick - 1) / 2), thick, thick, k);
};
// Rows of characters as pixels `scale` across: "." leaves the pixel alone, "_" empties it, others are looked up in `keys`.
const sprite = (p: Uint8Array, x: number, y: number, rows: string[], keys: Record<string, number>, scale = 1) => {
  rows.forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c !== ".") rect(p, x + i * scale, y + j * scale, scale, scale, c === "_" ? 0 : keys[c]);
    }),
  );
};
// The canvas as half blocks. A cell has one ink: where its two pixels differ, the one further down the palette.
const emit = (p: Uint8Array, color?: Uint8Array) => {
  const out: string[] = [];
  for (let y = 0; y < meta.rows; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      const a = p[2 * y * W + x], b = p[(2 * y + 1) * W + x];
      row += a && b ? "█" : a ? "▀" : b ? "▄" : " ";
      if (color) color[y * W + x] = Math.max(a, b, 1) - 1;
    }
    out.push(row);
  }
  return out.join("\n");
};

// A sprite with a black gap cut around it.
const stamp = (p: Uint8Array, x: number, y: number, rows: string[], keys: Record<string, number>) => {
  rows.forEach((row, j) => [...row].forEach((c, i) => c !== "." && rect(p, x + i - 1, y + j - 1, 3, 3, 0)));
  sprite(p, x, y, rows, keys);
};
// Draw on a fresh canvas and lay it over `p`, with a black gap cut around it.
const part = (p: Uint8Array, draw: (q: Uint8Array) => void) => {
  const q = new Uint8Array(W * H);
  draw(q);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (q[y * W + x]) rect(p, x - 1, y - 1, 3, 3, 0);
  for (let i = 0; i < q.length; i++) if (q[i]) p[i] = q[i];
};

// ---- the hoard

const KEYS = { g: GOLD, d: DEEP, w: BONE, r: RED };
// A coin lying flat, one standing on its edge, the gem, and the goblet.
const COIN = [".gggggg.", "gggggggg", "ggggggdd", ".ggggdd."];
const DISC = ["..ggg..", ".ggggd.", "gg_gggd", "gg_gggd", "ggg_ggd", ".ggggd.", "..ddd.."];
const GEM = ["..rrrrr..", ".rwwrrrr.", "rrwrrrrrr", "rrrrrrrrr", ".rrrrrrr.", "..rrrrr..", "...rrr...", "....r...."];
const GOBLET = [
  "..ggggggggg..",
  ".g_________g.",
  "g___________g",
  "gg_________gd",
  "ggggggggggggd",
  "gwgggggggdddd",
  "gwggggggggddd",
  ".gwggggggddd.",
  ".gwgggggggdd.",
  "..gggggggdd..",
  "...gggggdd...",
  "....gggdd....",
  ".....ggd.....",
  "....ggggd....",
  ".....ggd.....",
  ".....ggd.....",
  ".....ggd.....",
  "....ggggd....",
  "..ggggggggd..",
];
// The edge of a coin showing in the mound.
const EDGE = [".____.", "_...._"];
// The sparkle, small to large.
const STAR = [
  [".w.", "www", ".w."],
  ["..w..", "..w..", "wwwww", "..w..", "..w.."],
  ["....w....", "....w....", "....w....", "...www...", "wwwwwwwww", "...www...", "....w....", "....w....", "....w...."],
];

const LEFT = 10, RIGHT = 69, TOP = 40, FOOT = 61; // the front of the chest
const BANDS = [18, 58]; // the left-hand columns of its two brass bands, each four wide
const MID = 40, SPREAD = 25, RISE = 19; // the mound: its middle column, half its width, and its height
// The top of the mound at a column.
const crest = (x: number) => TOP - 1 - RISE * Math.sqrt(Math.max(0, 1 - ((x - MID) / SPREAD) ** 2));
// Coins along the mound's skyline, standing and lying: [column, how far above the crest, standing].
const SKYLINE = [[17, 2, 0], [20, 5, 1], [26, 4, 0], [34, 4, 1], [40, 2, 0], [45, 5, 1], [58, 4, 0], [61, 3, 1], [63, 0, 0]];
// Coins lying on the mound's front, and edges of others showing in it.
const FRONT = [[22, 30], [36, 26], [52, 30], [42, 34]];
const EDGES = [[30, 24], [44, 24], [24, 26], [50, 26], [37, 24], [31, 32], [57, 34], [46, 30], [18, 34], [38, 32]];
// Where the pearls hang: out of the gold, down over the front edge, and back up.
const PEARLS = [[46, 33], [46, 36], [46, 39], [46, 42], [46, 45], [47, 48], [49, 50], [52, 51], [55, 50], [56, 47], [56, 44], [56, 41], [56, 38], [56, 35]];
// The coins on the ground, and the one of them a sliding coin lands on.
const GROUND = [[1, 60], [71, 60], [27, 60]];
const START = [26, 32], LAND = GROUND[2];
// Where the sparkles come, in turn.
const SPOTS = [[34, 25], [61, 30], [40, 46], [44, 27], [5, 60], [51, 9], [23, 31], [74, 60]];
const LOOP = 6, TWINKLE = LOOP / SPOTS.length, SLIDE = 2.7; // seconds

export default function goldHoard(): Frame {
  const still = new Uint8Array(W * H);
  // the lid, thrown back and standing up behind: a barrel top seen from inside, darker within its rim
  const lid = (q: Uint8Array, inset: number, k: number) => {
    disc(q, 39.5, 17, 30.5 - inset, 14.5 - inset, k);
    rect(q, LEFT + inset, 17, RIGHT - LEFT + 1 - 2 * inset, TOP - 18, k);
  };
  lid(still, 0, WOOD);
  lid(still, 3, 0);
  const inside = new Uint8Array(W * H);
  lid(inside, 4, DARK);
  for (let i = 0; i < inside.length; i++) if (inside[i] && ![30, 49].includes(i % W)) still[i] = DARK;
  // the bands carry on up over it
  for (const x of BANDS)
    part(still, (q) => {
      for (let y = 0; y < TOP - 1; y++) for (let i = 0; i < 4; i++) if (still[y * W + x + i] || still[(y + 2) * W + x + i]) q[y * W + x + i] = i === 3 ? DEEP : GOLD;
    });
  // the hinges along the back edge
  for (const x of [28, 48]) part(still, (q) => rect(q, x, TOP - 4, 5, 3, GOLD));
  rect(still, 0, TOP - 1, W, 1, 0);

  // the goblet, leaning, its foot where the gold will bury it
  part(still, (q) => GOBLET.forEach((row, j) => sprite(q, 46 + Math.round((GOBLET.length - 1 - j) * 0.25), 3 + j, [row], KEYS)));

  // the mound: one mass of gold, darker underneath and down its right-hand side
  part(still, (q) => {
    for (let x = MID - SPREAD; x <= MID + SPREAD; x++)
      for (let y = Math.round(crest(x)); y < TOP - 1; y++) q[y * W + x] = y >= TOP - 5 || x - MID > SPREAD - 3 - (TOP - y) / 6 ? DEEP : GOLD;
  });
  // coins along its skyline and lying on its front, and the edges of a few more
  for (const [x, up, standing] of SKYLINE) {
    if (standing) stamp(still, x - 3, Math.round(crest(x)) - up, DISC, KEYS);
    else stamp(still, x - 4, 2 * Math.round((crest(x) - up) / 2), COIN, KEYS);
  }
  for (const [x, y] of EDGES) sprite(still, x, y, EDGE, KEYS);
  for (const [x, y] of [...FRONT, START]) stamp(still, x, y, COIN, KEYS);
  // the gem, up on the left
  stamp(still, 25, 17, GEM, KEYS);
  rect(still, 0, TOP - 1, W, 1, 0);

  // the chest: a box of planks, its right-hand edge in shade
  rect(still, LEFT, TOP, RIGHT - LEFT + 1, FOOT - TOP + 1, WOOD);
  rect(still, RIGHT - 1, TOP, 2, FOOT - TOP + 1, DARK);
  for (const y of [47, 54]) rect(still, LEFT, y, RIGHT - LEFT + 1, 1, 0);
  // its brass: two bands, four corners, and the lock with its keyhole
  for (const x of BANDS)
    part(still, (q) => {
      rect(q, x, TOP, 4, FOOT - TOP + 1, GOLD);
      rect(q, x + 3, TOP, 1, FOOT - TOP + 1, DEEP);
      for (const y of [TOP + 3, TOP + 10, TOP + 17]) set(q, x + 1, y, 0);
    });
  for (const s of [0, 1])
    for (const v of [0, 1])
      part(still, (q) => {
        for (let j = 0; j < 6; j++) for (let i = 0; i < 6 - j; i++) set(q, s ? RIGHT - i : LEFT + i, v ? FOOT - j : TOP + j, s && i < 2 ? DEEP : GOLD);
      });
  part(still, (q) => {
    rect(q, 34, TOP, 11, 12, GOLD);
    rect(q, 35, TOP + 12, 9, 1, GOLD);
    rect(q, 36, TOP + 13, 7, 1, GOLD);
    rect(q, 44, TOP, 1, 12, DEEP);
    rect(q, 38, TOP + 4, 3, 3, 0);
    rect(q, 39, TOP + 7, 1, 3, 0);
  });
  // the pearls, and the coins on the ground
  for (const [x, y] of PEARLS) stamp(still, x, y, ["ww", "ww"], KEYS);
  for (const [x, y] of GROUND) stamp(still, x, y, COIN, KEYS);

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const p = new Uint8Array(W * H);
    p.set(still);

    // the coin: it slides down the front of the mound, tips over the edge and drops to the ground
    const v = u - SLIDE;
    if (v >= 0 && v < 1.4) {
      const a = Math.min(1, v / 0.6) ** 2, b = Math.max(0, (v - 0.6) / 0.8) ** 2;
      const x = START[0] + (LAND[0] - START[0]) * a, y = START[1] + (TOP - 4 - START[1]) * a + (LAND[1] - TOP + 4) * b;
      stamp(p, Math.round(x), Math.round(y), COIN, KEYS);
    }
    // the sparkles: each swells and dies as the next one starts
    const w = (u + 2 * 0.11) % LOOP, n = Math.floor(w / TWINKLE), k = Math.floor((w - n * TWINKLE) / 0.11);
    if (k < 5) {
      const s = STAR[[0, 1, 2, 1, 0][k]], h = (s.length - 1) / 2;
      stamp(p, SPOTS[n][0] - h, SPOTS[n][1] - h, s, KEYS);
    }
    return emit(p, color);
  };
}
