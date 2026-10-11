/*
 * blackbeard: Blackbeard's flag, a horned skeleton toasting the devil with
 * one hand and with the other driving a spear at a bleeding heart. The heart
 * beats, and with every beat a drop of blood falls from it into a pool.
 *
 * Drawn from the flag credited to Edward Teach, "Blackbeard", in the early
 * 1700s (public domain), as flat colour in block elements, two pixels a cell,
 * so it reads in one ink too.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "blackbeard",
  category: "scenes",
  note: "blackbeard's flag: a horned skeleton spearing a heart that bleeds",
  cols: 80,
  rows: 32,
  fps: 20,
  ground: "#000000",
  // bone and its shade, then blood, blood as the heart beats, and blood pooled
  palette: ["#f6f3ec", "#c4bfb4", "#d81f2a", "#ff3d47", "#8e1219"],
} satisfies Meta;

// The skeleton, its goblet and its spear.
const FIGURE = `
                                                                                
   ██▄                                ▀█▄                                       
   ████            █▄█▄▄█▄█▀            ▀█▄                                     
  ▄█▀              ▀███████               ▀█▄                                   
▄███               █  ██  █                 ▀█                                  
 ▀██▄              ▀██▄▄██▀                  ███                                
   ▀█▄              ▀▄▄▄▄▀  ▄              ▄▄█▀▀▄▄                              
    ▀██        ▄████▄████▄████▄▄         ▄██▀    ▀█▄                            
      ██▄  ▄▄█████████████████████▄▄  ▄████▀       ▀█▄                          
       ▀██████████████████████▀█████████▀▀           ▀█                         
        ▀▀▀▀▀    ████████████     ▀▀▀▀▀                ▀▄                       
                 ████████████                           ▀█▄ ▄█                  
                 ████████████                             ▀███▄▄                
                 ▀█████▄████▀                           ▄▄██████                
                  ▀█████████                            ▀▀▀▀████                
                ▄▄▄████████▄▄▄                                                  
                ██████████████                                                  
                ▀████████████▀                                                  
                ▄█████████████                                                  
                ██████████████                                                  
                ██████  ██████                                                  
                █████▀   █████                                                  
                █████    ▀████                                                  
                ▄███      ████                                                  
                ███       ████                                                  
                ▄██       ▄███                                                  
                ███       ███▀                                                  
                ███       ███                                                   
                ███       ███                                                   
                ███       ███                                                   
               ▄██        ▄██                                                   
           ▄███████       ██████▄▄                                              
`;
// The heart, at rest and swollen on a beat, from row HEART_TOP down.
const BEAT = [`
                                                                    ▄███▄▄      
                                                                   ████████     
                                                                   █████████    
                                                              ▄█████████████▄   
                                                             ▄███████████████   
                                                             ▀███████████████   
                                                              ▀███████████████  
                                                                ▀▀▀███████████  
                                                                                
`, `
                                                                   ▄▄████▄      
                                                                   ████████▄    
                                                                   ██████████   
                                                              ▄██████████████   
                                                             █████████████████  
                                                             █████████████████  
                                                              ████████████████  
                                                               ▀▀█████████████  
                                                                     ▀▀▀▀▀▀▀▀▀  
`];
const HEART_TOP = 15;

const BONE = 1, SHADE = 2, BLOOD = 3, BRIGHT = 4, POOL = 5; // pixel kinds; the palette index is one less
const BEAT_EVERY = 1.2; // seconds between heartbeats, and between drops
const SWELL = [[0, 0.12], [0.24, 0.36]]; // when in a beat the heart is swollen: lub, dub
const TIP = [74, 45]; // the pixel a drop gathers on below the heart's point: column, row
const POOL_TOP = 61; // the pool's top pixel row

const lines = (s: string) => s.slice(1, -1).split("\n").map((l) => l.padEnd(meta.cols));
// A cell's two pixels, top and bottom.
const halves = (c: string) => [c === "█" || c === "▀", c === "█" || c === "▄"];

export default function blackbeard(): Frame {
  const { cols, rows } = meta;
  const px = rows * 2;
  const base = Array.from({ length: px }, () => new Array<number>(cols).fill(0));
  lines(FIGURE).forEach((l, y) => [...l].forEach((c, x) => halves(c).forEach((on, h) => on && (base[2 * y + h][x] = BONE))));
  // the bone's right edges in its shade, as if lit from the left
  for (let y = 0; y < px; y++) for (let x = 0; x < cols - 1; x++) if (base[y][x] === BONE && !base[y][x + 1]) base[y][x] = SHADE;
  const hearts = BEAT.map((b) => {
    const p: [number, number][] = [];
    lines(b).forEach((l, y) => [...l].forEach((c, x) => halves(c).forEach((on, h) => on && p.push([x, 2 * (HEART_TOP + y) + h]))));
    // a shine on its higher lobe, as flash paints one
    const [sx, sy] = p.reduce((a, b) => (b[1] < a[1] || (b[1] === a[1] && b[0] < a[0]) ? b : a));
    return { p, shine: [[sx + 1, sy + 2], [sx + 2, sy + 2], [sx + 1, sy + 3]] };
  });
  // the pool the drops fall into, widest at the bottom
  const pool: [number, number][] = [];
  for (let x = TIP[0] - 3; x <= TIP[0] + 3; x++) pool.push([x, px - 1]);
  for (let x = TIP[0] - 2; x <= TIP[0] + 2; x++) pool.push([x, px - 2]);

  return (t, { color } = {}) => {
    const u = t % BEAT_EVERY;
    const swollen = SWELL.some(([a, b]) => u >= a && u < b);
    const p = base.map((r) => r.slice());
    const set = (x: number, y: number, k: number) => {
      if (x >= 0 && x < cols && y >= 0 && y < px) p[y][x] = k;
    };
    const heart = hearts[swollen ? 1 : 0];
    for (const [x, y] of heart.p) set(x, y, swollen ? BRIGHT : BLOOD);
    for (const [x, y] of heart.shine) set(x, y, BONE);
    for (const [x, y] of pool) set(x, y, POOL);

    // a drop: it gathers under the point, falls faster and faster, and splashes into the pool
    const [tx, ty] = TIP;
    if (u < 0.45) {
      set(tx, ty, BLOOD);
      if (u > 0.25) set(tx, ty + 1, BLOOD);
    } else if (u < 0.95) {
      const k = (u - 0.45) / 0.5, y = Math.round(ty + (POOL_TOP - 2 - ty) * k * k);
      set(tx, y, BLOOD);
      set(tx, y + 1, BLOOD);
    } else if (u < 1.15) {
      const k = (u - 0.95) / 0.2;
      set(tx - 1 - Math.round(k), POOL_TOP - 1 - Math.round(2 * Math.sin(Math.PI * k)), BLOOD);
      set(tx + 1 + Math.round(k), POOL_TOP - 1 - Math.round(2 * Math.sin(Math.PI * k)), BLOOD);
    }

    // two pixels a cell, in the colour of the one further down the palette where they differ
    const out: string[] = [];
    for (let y = 0; y < rows; y++) {
      let line = "";
      for (let x = 0; x < cols; x++) {
        const a = p[2 * y][x], b = p[2 * y + 1][x];
        line += a && b ? "█" : a ? "▀" : b ? "▄" : " ";
        if (color) color[y * cols + x] = Math.max(a, b) - 1 < 0 ? 0 : Math.max(a, b) - 1;
      }
      out.push(line);
    }
    return out.join("\n");
  };
}
