/*
 * treasure-map: a map on a scroll, an island with a palm tree and a
 * mountain, a compass rose and a boat at anchor. A dotted trail walks from
 * the beach across the island to the X, which pulses when it gets there.
 */
import type { Frame, Meta } from "../types.ts";

export const meta = {
  name: "treasure map",
  category: "objects",
  note: "a trail of dots crossing an island on a scroll to a pulsing x",
  cols: 68,
  rows: 26,
  fps: 12,
} satisfies Meta;

// The scroll, the sea and the island, with no trail and no X.
const MAP = [
  "╭──╮                                                            ╭──╮",
  "│  │────────────────────────────────────────────────────────────│  │",
  "│· │                                                            │· │",
  "│  │    ~ ~         ~ ~                                   N     │  │",
  "│  │                                        ~ ~         ╱ │ ╲   │  │",
  "│· │                                                   W──┼──E  │· │",
  "│  │                     _.--''''--._                   ╲ │ ╱   │  │",
  "│  │               _.--''            `--._         _.-.   S     │  │",
  "│· │            .-'                       `-.   _.'    `.       │· │",
  "│  │          .'   ,-.\\/,-.     /\\/\\         `''         )      │  │",
  "│  │         (    '  /||\\  '   /    \\                  .'       │  │",
  "│· │          `.      ||                              (     ~ ~ │· │",
  "│  │            )     ||                 ╲ ╱           `.       │  │",
  "│  │          .'                          ╳              )      │  │",
  "│· │         (                           ╱ ╲           .'       │· │",
  "│  │          `-._                                _.-'          │  │",
  "│  │              `--..__                  __..--'      ~ ~     │  │",
  "│· │  _|\\_               ``--..______..--''                     │· │",
  "│  │  \\__/                                                      │  │",
  "│  │                                                            │  │",
  "│· │                                                     ~ ~    │· │",
  "│  │  ~ ~                               ~ ~                     │  │",
  "│  │                  ~ ~                                       │  │",
  "│· │                                                            │· │",
  "│  │────────────────────────────────────────────────────────────│  │",
  "╰──╯                                                            ╰──╯"
];
// The trail from the beach to the X, in the order it is walked.
const TRAIL: [number, number][] = [[19, 14], [21, 14], [23, 14], [25, 13], [27, 13], [29, 12], [31, 12], [33, 12], [35, 13]];
const X = [42, 13]; // the middle of the X
const CROSS = ["╲ ╱", " ╳ ", "╱ ╲"];
// The ring the X flashes inside when it pulses: offsets from its middle.
const RING: [number, number][] = [[-3, -1], [3, -1], [-4, 0], [4, 0], [-3, 1], [3, 1]];

const LOOP = 8;
const START = 3, STEP = 0.3; // when the trail starts walking, and seconds a step
const END = START + TRAIL.length * STEP;

export default function treasureMap(): Frame {
  const { cols } = meta;
  const base = MAP.map((line) => [...line.padEnd(cols)]);
  const [cx, cy] = X;
  CROSS.forEach((line, j) => [...line].forEach((c, i) => c !== " " && (base[cy - 1 + j][cx - 1 + i] = c)));

  return (t) => {
    const u = ((t % LOOP) + LOOP) % LOOP;
    const grid = base.map((r) => r.slice());
    // The whole trail before it is wiped and after it is walked again; in between, as far as it has gone.
    const walked = u < START - 0.4 ? TRAIL.length : u < START ? 0 : Math.min(TRAIL.length, Math.floor((u - START) / STEP) + 1);
    for (let i = 0; i < walked; i++) {
      const [x, y] = TRAIL[i];
      grid[y][x] = "·";
    }
    const there = walked === TRAIL.length;
    if (there && Math.floor(u * 2.5) % 2 === 0) for (const [dx, dy] of RING) grid[cy + dy][cx + dx] = "°";
    if (!there && walked > 0 && u < END) {
      const [x, y] = TRAIL[walked - 1];
      grid[y][x] = "o";
    }
    return grid.map((r) => r.join("")).join("\n");
  };
}
