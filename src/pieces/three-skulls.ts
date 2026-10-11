/*
 * three-skulls: Christopher Condent's flag, three skulls in a row over crossed
 * bones, bone on black. Their eyes kindle red one after another, left to
 * right, blaze together, then go out the same way, so a wave of light passes
 * along the row and back again.
 *
 * The skulls are drawn by hand in the flag's own dense fill, 8 where the bone
 * is solid, over bones traced from a painting of the flag at 80 by 32. The
 * sockets are lit at run time, brightest at their middles. The flag (c. 1718)
 * is in the public domain.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "three skulls",
  category: "scenes",
  note: "condent's flag, three skulls over crossbones, their eyes lit in a wave",
  cols: 80,
  rows: 32,
  fps: 20,
  // skull bone, and warmed by the glow; the crossed bones; the glow, dim to hot
  palette: ["#e8dfca", "#f7d9c6", "#b7a687", "#3e0f0c", "#8c1f16", "#d8341f", "#ff6a3d", "#ffc29c"],
  ground: "#000000",
} satisfies Meta;

// The flag, and what each cell is made of: 1 a skull, 2 the crossed bones, 3 an eye socket.
const ART = [
  "    ,p888q                                                            p888q_    ",
  "   _888888'                                                          ,888888_   ",
  " ,88888888'                                                           88888888q ",
  " d888888888q_                                                      ,p888888888b ",
  " \"P88PPPY8888qq                                                  pp88888PPY88P' ",
  "         \"P88888q_                                            ,p88888P'         ",
  "           \"\"Y88888q                                        pp8888P''           ",
  "              \"P88888q_                                  ,p88888P'              ",
  "                 \"Y88888q_       _pp88888888qq_       _p88888P'\"                ",
  "                      8888q_  ,p8888888888888888q,  ,p8888                      ",
  "       _pp88888888qq_    88  d88888888888888888888b  88    _pp88888888qq_       ",
  "    ,p8888888888888888q,  8 d8888888888888888888888b 8  ,p8888888888888888q,    ",
  "   d88888888888888888888b   888P     Y8888P     Y888   d88888888888888888888b   ",
  "  d8888888888888888888888b  88P       Y88P       Y88  d8888888888888888888888b  ",
  "  888P     Y8888P     Y888  88b       d88b       d88  888P     Y8888P     Y888  ",
  "  88P       Y88P       Y88  888b     d8888b     d888  88P       Y88P       Y88  ",
  "  88b       d88b       d88  Y88888888P'  'Y88888888P  88b       d88b       d88  ",
  "  888b     d8888b     d888     Y888888b  d888888P     888b     d8888b     d888  ",
  "  Y88888888P'  'Y88888888P   ,  8888888888888888  _   Y88888888P'  'Y88888888P  ",
  "     Y888888b  d888888P    pp88  88 88 88 88 88  88qq    Y888888b  d888888P     ",
  "      8888888888888888  ,p88888P YP YP YP YP YP P88888q_  8888888888888888      ",
  "       88 88 88 88 88  p88888P'                  \"PY8888q  88 88 88 88 88       ",
  "       YP YP YP YP YP 8888P'                        \"P8888 YP YP YP YP YP       ",
  "                      8P''                            \"\"Y8                      ",
  "              ,p88888P'                                  \"P88888q_              ",
  "            p88888P'\"                                      \"\"Y88888q_           ",
  "         ,p88888P'                                            \"P88888q_         ",
  " ,p888qp88888P'                                                  \"Y88888qp888q_ ",
  " d888888888P'                                                      \"P888888888b ",
  " \"88888888                                                            88888888' ",
  "   \"888888'                                                          ,888888\"   ",
  "    \"Y888P                                                            P888P'    ",
];
const MAT = [
  "00002222220000000000000000000000000000000000000000000000000000000000002222220000",
  "00022222222000000000000000000000000000000000000000000000000000000000022222222000",
  "02222222222000000000000000000000000000000000000000000000000000000000002222222220",
  "02222222222220000000000000000000000000000000000000000000000000000002222222222220",
  "02222222222222200000000000000000000000000000000000000000000000000222222222222220",
  "00000000022222222200000000000000000000000000000000000000000000222222222000000000",
  "00000000000222222222000000000000000000000000000000000000000022222222200000000000",
  "00000000000000222222222000000000000000000000000000000000022222222200000000000000",
  "00000000000000000222222222000000011111111111111000000022222222220000000000000000",
  "00000000000000000000002222220011111111111111111111002222220000000000000000000000",
  "00000001111111111111100002200111111111111111111111100220000111111111111110000000",
  "00001111111111111111111100201111111111111111111111110200111111111111111111110000",
  "00011111111111111111111110001111333331111113333311110001111111111111111111111000",
  "00111111111111111111111111001113333333111133333331110011111111111111111111111100",
  "00111133333111111333331111001113333333111133333331110011113333311111133333111100",
  "00111333333311113333333111001111333331111113333311110011133333331111333333311100",
  "00111333333311113333333111001111111111100111111111110011133333331111333333311100",
  "00111133333111111333331111000001111111100111111110000011113333311111133333111100",
  "00111111111110011111111111000200111111111111111100200011111111111001111111111100",
  "00000111111110011111111000022220011011011011011002222000011111111001111111100000",
  "00000011111111111111110022222222011011011011011022222222001111111111111111000000",
  "00000001101101101101100222222220000000000000000002222222200110110110110110000000",
  "00000001101101101101102222220000000000000000000000002222220110110110110110000000",
  "00000000000000000000002222000000000000000000000000000022220000000000000000000000",
  "00000000000000222222222000000000000000000000000000000000022222222200000000000000",
  "00000000000022222222200000000000000000000000000000000000000222222222200000000000",
  "00000000022222222200000000000000000000000000000000000000000000222222222000000000",
  "02222222222222200000000000000000000000000000000000000000000000000222222222222220",
  "02222222222220000000000000000000000000000000000000000000000000000002222222222220",
  "02222222220000000000000000000000000000000000000000000000000000000000002222222220",
  "00022222222000000000000000000000000000000000000000000000000000000000022222222000",
  "00002222220000000000000000000000000000000000000000000000000000000000002222220000",
];

const LOOP = 6;
const STEP = 0.45; // seconds between one skull and the next
const RAMP = " .:+*#@"; // a socket's glow, faint to blazing

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
// How lit a skull is, 0 to 1, at `p` seconds into its own turn: lit, going out, dark, coming back.
const lit = (p: number) => (p < 2.4 ? 1 : p < 3.2 ? 1 - 0.85 * smooth((p - 2.4) / 0.8) : p < 5.2 ? 0.15 : 0.15 + 0.85 * smooth((p - 5.2) / 0.8));

export default function threeSkulls(): Frame {
  const { cols, rows } = meta;
  const n = cols * rows;
  // which skull each cell belongs to, and for a socket, how far it is from the socket's middle (0 to 1)
  const owner = new Int8Array(n).fill(-1);
  const depth = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const x = k % cols, m = MAT[Math.floor(k / cols)][x];
    if (m === "1" || m === "3") owner[k] = x < 27 ? 0 : x < 53 ? 1 : 2;
  }
  // each socket in turn, flooded from one of its cells
  const seen = new Uint8Array(n);
  for (let k = 0; k < n; k++) {
    if (seen[k] || MAT[Math.floor(k / cols)][k % cols] !== "3") continue;
    const cells: number[] = [], stack = [k];
    seen[k] = 1;
    while (stack.length) {
      const c = stack.pop()!;
      cells.push(c);
      for (const d of [-1, 1, -cols, cols]) {
        const e = c + d;
        if (e < 0 || e >= n || seen[e] || Math.abs((e % cols) - (c % cols)) > 1) continue;
        if (MAT[Math.floor(e / cols)][e % cols] !== "3") continue;
        seen[e] = 1;
        stack.push(e);
      }
    }
    let sx = 0, sy = 0;
    for (const c of cells) (sx += c % cols), (sy += Math.floor(c / cols));
    sx /= cells.length;
    sy /= cells.length;
    let far = 0;
    const dist = (c: number) => Math.hypot((c % cols) - sx, 2 * (Math.floor(c / cols) - sy));
    for (const c of cells) far = Math.max(far, dist(c));
    for (const c of cells) depth[c] = dist(c) / (far + 0.5);
  }

  return (t, { color } = {}) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const glow = [0, 1, 2].map((i) => {
      // a flicker of its own, so the three never burn quite alike
      const flick = 0.5 + 0.5 * Math.sin(u * 19 + i * 2.1) * Math.sin(u * 6.7 + i);
      return lit((((u - i * STEP + 2 * STEP) % LOOP) + LOOP) % LOOP) * (0.86 + 0.14 * flick);
    });
    let out = "";
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const k = y * cols + x, m = MAT[y][x];
        let ch = ART[y][x], c = 0;
        if (m === "3") {
          // brightest at the middle of the socket, fading to its rim
          const e = glow[owner[k]] * (1.15 - 0.75 * depth[k]);
          const level = Math.max(0, Math.min(RAMP.length - 1, Math.round(e * (RAMP.length - 1))));
          ch = RAMP[level];
          c = 3 + Math.min(4, Math.floor(e * 5));
        } else if (m === "1") c = glow[owner[k]] > 0.8 ? 1 : 0;
        else if (m === "2") c = 2;
        if (color) color[k] = c;
        out += ch;
      }
      if (y < rows - 1) out += "\n";
    }
    return out;
  };
}
