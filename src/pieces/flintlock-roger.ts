/*
 * flintlock-roger: a skull with one eye screwed up to take aim, over two
 * flintlock pistols crossed behind and below it, their muzzles in the upper
 * corners and their brass-capped grips in the lower ones. One pistol fires,
 * then the other: the cock snaps down, a spark jumps at the pan, the muzzle
 * flashes and a curl of smoke drifts up and thins away.
 *
 * Pixel art in block elements, two square pixels a cell, in five flat
 * colours. The skull is geometry, a pixel at a time, shaded down its
 * right-hand edges. Each pistol is drawn lying flat (barrel, stock, lock,
 * cock, frizzen, trigger guard, curved grip) and turned into place a pixel at
 * a time. Black gaps keep the shapes apart, so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "flintlock roger",
  category: "scenes",
  note: "a squinting skull over two crossed flintlocks that fire in turn",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // iron, wood, bone's shade, bone, brass
  palette: ["#8a94a6", "#a8703a", "#aaa390", "#e8e2d0", "#f2b632"],
} satisfies Meta;

// ---- the pixel kit: a canvas of square pixels, one a cell wide and half a cell tall

const W = meta.cols, H = meta.rows * 2;
// A pixel is 0 for empty, else a palette index plus one.
const IRON = 1, WOOD = 2, SHADE = 3, BONE = 4, GOLD = 5;

const set = (p: Uint8Array, x: number, y: number, k: number) => {
  x = Math.round(x), y = Math.round(y);
  if (x >= 0 && x < W && y >= 0 && y < H) p[y * W + x] = k;
};
const rect = (p: Uint8Array, x: number, y: number, w: number, h: number, k: number) => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(p, x + i, y + j, k);
};
// Rows of characters as pixels `scale` across: "." leaves the pixel alone, "_" empties it, others are looked up in `keys`.
const sprite = (p: Uint8Array, x: number, y: number, rows: string[], keys: Record<string, number>, scale = 1) => {
  rows.forEach((row, j) =>
    [...row].forEach((c, i) => {
      if (c !== ".") rect(p, x + i * scale, y + j * scale, scale, scale, c === "_" ? 0 : keys[c]);
    }),
  );
};
// One canvas laid over another, with a black gap cut around it first.
const over = (dst: Uint8Array, src: Uint8Array, gap = 1) => {
  for (let pass = 0; pass < 2; pass++)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const k = src[y * W + x];
        if (!k) continue;
        if (pass) set(dst, x, y, k);
        else rect(dst, x - gap, y - gap, 2 * gap + 1, 2 * gap + 1, 0);
      }
};
// Sweep up the crumbs a gap can leave behind: any speck of fewer than `least` pixels.
const tidy = (p: Uint8Array, least = 6) => {
  const seen = new Uint8Array(W * H);
  for (let i = 0; i < p.length; i++) {
    if (!p[i] || seen[i]) continue;
    const blob = [i];
    seen[i] = 1;
    for (let n = 0; n < blob.length; n++) {
      const x = blob[n] % W, y = (blob[n] - x) / W;
      for (const [a, b] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const j = b * W + a;
        if (a >= 0 && a < W && b >= 0 && b < H && p[j] && !seen[j]) (seen[j] = 1), blob.push(j);
      }
    }
    if (blob.length < least) for (const j of blob) p[j] = 0;
  }
  return p;
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

// ---- the skull, row by row from its crown: broad-browed, one eye open and one narrowed

const CX = 39.5, ROWS = 34, MOUTH = 29;
// Half its width on row j: the cranium, the cheekbones, the jaw and the chin.
const halfAt = (j: number) => {
  if (j < 20) return 18 * Math.sqrt(1 - ((j - 15) / 15.6) ** 2);
  if (j < 23) return 17.1 - (j - 20) * 0.5;
  if (j < 26) return 15.6 - (j - 23) * 1.5;
  if (j < 31) return 11;
  return 11 - [0.6, 1.8, 3.6][j - 31];
};
// The open eye is a round socket; the other is the same socket with a heavy lid drawn down over it.
const inSocket = (x: number, y: number) => {
  const open = ((x - 31.7) / 5.4) ** 2 + ((y - 15.2) / 5.2) ** 2 < 1;
  const shut = ((x - 47.3) / 6) ** 2 + ((y - 15.2) / 5.2) ** 2 < 1 && y > 15.6 + (x - 47.3) * 0.22 && y < 19.6;
  return open || shut;
};
const NOSE = ["..__..", ".____.", ".____.", "__.___", "__..__"];
// A crack down from the crown, on the open eye's side.
const CRACK = [[0, 0], [0, 1], [-1, 2], [-1, 3], [0, 4], [-1, 5], [-2, 6], [-2, 7], [-1, 8]];

// ---- a pistol, lying flat: u runs along the barrel from the breech to the muzzle, v across it, down being positive

const BARREL = 56;
const seg = (u: number, v: number, a: number, b: number, c: number, d: number) => {
  const l = (c - a) ** 2 + (d - b) ** 2, k = Math.max(0, Math.min(1, ((u - a) * (c - a) + (v - b) * (d - b)) / l));
  return Math.hypot(u - a - (c - a) * k, v - b - (d - b) * k);
};
// The grip's middle line, curving down from the lock to the butt.
const GRIP: number[][] = [];
for (let i = 0; i <= 40; i++) {
  const s = i / 40, a = 1 - s;
  GRIP.push([a * a * -7 + 2 * a * s * -16 + s * s * -19.5, a * a * 0.9 + 2 * a * s * 0.4 + s * s * 7, s]);
}
// What a pistol is made of at (u, v), its cock back or fallen.
const gun = (u: number, v: number, fired: boolean) => {
  // the cock: an arm from its pivot on the lock up to the jaws that hold the flint
  const [tu, tv] = fired ? [-1.2, -6.2] : [-8.4, -7.4];
  if (seg(u, v, tu, tv, tu + 2.6, tv + (fired ? 1.6 : 0.2)) < 1.25) return u > tu + 2.2 ? BONE : IRON;
  if (seg(u, v, -5, -1.5, tu, tv) < 1.05) return IRON;
  // the frizzen, upright over the pan until the flint knocks it forward
  if (fired ? seg(u, v, 3.6, -3, 7.4, -5.6) < 0.9 : seg(u, v, 3.4, -3, 3.2, -6.6) < 0.9) return IRON;
  if (u >= -0.5 && u < 4.5 && v >= -3.6 && v < -2.2) return IRON;
  // the barrel, a ring at its muzzle
  if (u >= BARREL - 2.6 && u <= BARREL && v >= -3.1 && v < 1.7) return IRON;
  if (u >= 0 && u <= BARREL && v >= -2.2 && v < 1) return IRON;
  // the trigger guard, a brass bow under the lock, and the trigger in it
  const bow = ((u + 6) / 5.6) ** 2 + ((v - 3.4) / 5) ** 2;
  if (v >= 3.4 && bow < 1 && bow > 0.52) return GOLD;
  if (seg(u, v, -5.4, 3.4, -6.6, 6) < 0.7) return IRON;
  // the lock plate, let into the stock
  if (u >= -8.5 && u < 2.5 && v >= -0.6 && v < 2.2 && !(u < -7.5 && v < 0.2)) return IRON;
  // the stock: the fore-end under the barrel with a brass band round it, and the body the lock sits in
  if (u >= -9 && u <= 28 - Math.max(0, v - 2) * 1.5 && v >= 1 && v < 3.7) return u >= 23 && u < 25 ? GOLD : WOOD;
  if (u >= -9.5 && u < 0 && v >= -2.2 && v < 3.7) return WOOD;
  // the grip, thickening to the butt, and its brass cap
  if (Math.hypot(u + 20.6, v - 8) < 3.4) return GOLD;
  let best = 99, at = 0;
  for (const [gu, gv, s] of GRIP) {
    const d = Math.hypot(u - gu, v - gv);
    if (d < best) (best = d), (at = s);
  }
  if (best < 2.6 + at * 0.6) return WOOD;
  return 0;
};
// Where the pistols cross, how far along the barrel that is, and the way the left-hand pistol points.
const XC = 39.5, YC = 39, AT = 18, DU = 0.934, DV = -0.358;
// The left-hand pistol's muzzle and pan on the canvas; the other's are their mirror image.
const spot = (u: number, v: number) => [Math.round(XC + (u - AT) * DU - v * DV), Math.round(YC + (u - AT) * DV + v * DU)];
const MUZZLE = spot(BARREL + 2, -0.6), PAN = spot(2, -5);

const LOOP = 6, SHOTS = [0.7, 3.7];
const FLASH = [
  [".g.", "gbg", ".g."],
  ["..g..", ".gbg.", "gbbbg", ".gbg.", "..g.."],
  ["...g...", ".g.g.g.", "..gbg..", "ggbbbgg", "..gbg..", ".g.g.g.", "...g..."],
];
const SPARK = [["g"], [".g.", "gbg", ".g."], ["g.g", ".g.", "g.g"]];
// A puff of smoke, by its age: round, then smaller, then a speck.
const PUFF = [[".ss.", "ssss", "ssss", ".ss."], [".s.", "sss", ".s."], ["ss", "ss"], ["s"]];

export default function flintlockRoger(): Frame {
  // each pistol on a canvas of its own, cocked and fired
  const pistols = [false, true].map((fired) => {
    const left = new Uint8Array(W * H), right = new Uint8Array(W * H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const dx = x - XC, dy = y - YC;
        let k = gun(dx * DU + dy * DV + AT, -dx * DV + dy * DU, fired);
        // a cell has one ink, so where both its pixels are pistol, both take what the middle of the cell is made of
        const my = (y & ~1) + 0.5 - YC, m = k ? gun(dx * DU + my * DV + AT, -dx * DV + my * DU, fired) : 0;
        if (m) k = m;
        (left[y * W + x] = k), (right[y * W + W - 1 - x] = k);
      }
    return [left, right];
  });
  // the skull: bone, two pixels of shade down its right side and one on the near side of every hollow
  const skull = new Uint8Array(W * H);
  for (let j = 0; j < ROWS; j++)
    for (let x = 0; x < W; x++) if (Math.abs(x - CX) < halfAt(j) && !inSocket(x, j)) skull[j * W + x] = x > CX && x + 2 - CX >= halfAt(j) ? SHADE : BONE;
  sprite(skull, 37, 20, NOSE, {});
  for (const [x, y] of CRACK) skull[(1 + y) * W + 31 + x] = 0;
  // the mouth, turned up at one end, and the gaps between its teeth
  rect(skull, 30, MOUTH, 20, 1, 0);
  rect(skull, 29, MOUTH - 1, 1, 1, 0);
  for (let x = 32; x < 48; x += 3) rect(skull, x, MOUTH - 3, 1, 7, 0);
  for (let y = 1; y < ROWS; y++) for (let x = 1; x < CX + 14; x++) if (skull[y * W + x] === BONE && !skull[y * W + x + 1] && skull[y * W + x - 1]) skull[y * W + x] = SHADE;

  // every pose: each pistol cocked or fired, the right-hand one laid over the left, the skull over both
  const poses = [0, 1].map((a) =>
    [0, 1].map((b) => {
      const p = new Uint8Array(pistols[a][0]);
      over(p, pistols[b][1]);
      over(p, skull, 2);
      return tidy(p);
    }),
  );

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const since = SHOTS.map((s) => u - s);
    // a cock stays down a while after its shot, then is drawn back
    const down = since.map((d) => (d >= 0 && d < 1.5 ? 1 : 0));
    const p = new Uint8Array(poses[down[0]][down[1]]);
    since.forEach((d, i) => {
      if (d < 0 || d > 2.6) return;
      const flip = (x: number) => (i ? W - 1 - x : x);
      const stamp = (at: number[], rows: string[]) => sprite(p, flip(at[0]) - (rows[0].length >> 1), at[1] - (rows.length >> 1), rows, { g: GOLD, b: BONE });
      // the spark at the pan, then the flash at the muzzle
      if (d < 0.25) stamp(PAN, SPARK[Math.floor(d / 0.09)]);
      if (d >= 0.1 && d < 0.4) stamp(MUZZLE, FLASH[[1, 2, 2, 1, 0, 0][Math.floor((d - 0.1) / 0.05)]]);
      // the smoke: four puffs let go one after another, each swaying as it climbs, shrinking and gone
      for (let n = 0; n < 4; n++) {
        const k = d - 0.2 - n * 0.14;
        if (k < 0 || k >= 2.2 - n * 0.2) continue;
        const rows = PUFF[Math.min(3, Math.floor((k + n * 0.25) / 0.55))];
        const x0 = MUZZLE[0] - 1 + Math.round(1.6 * Math.sin(k * 3.2 + n * 1.9)), y0 = MUZZLE[1] - 4 - Math.round(k * (9.5 - n * 1.6));
        rows.forEach((row, j) => [...row].forEach((c, m) => c === "s" && set(p, flip(x0 + m - (row.length >> 1)), y0 + j - rows.length, SHADE)));
      }
    });
    return emit(p, color);
  };
}
