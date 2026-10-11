// node tools/art/check.mjs <slug>...: checks pieces in src/pieces against the piece contract (see
// docs/MAKING-PIECES.md): the meta, exact frame size, allowed characters, determinism, movement, colour indexes,
// speed, and the source rules (no runtime imports, no Math.random, no banned words, no non-ascii in String.raw).
// It is ahoy's own stand-in for ascii.rest's `npm run check`, and exits 1 if any piece fails.
import { readFileSync } from "node:fs";

const CATEGORIES = "scenes ui data type logos companies distros shapes space physics nature creatures objects generative effects".split(" ");
const COLOURED = ["scenes", "logos", "companies", "distros"];
const BANNED = /\b(document|window|globalThis|navigator|localStorage|sessionStorage|process|require|fetch|eval|XMLHttpRequest)\b/;
const TIMES = [0, 1, 2, 3, 4, 6];
const allowed = (c) => {
  const k = c.codePointAt(0);
  return (k >= 0x20 && k <= 0x7e) || c === "·" || c === "°" || c === "•" || c === "●" || (k >= 0x2500 && k <= 0x259f);
};

let failed = 0;
for (const slug of process.argv.slice(2)) {
  const errors = [], warn = [];
  const url = new URL(`../../src/pieces/${slug}.ts`, import.meta.url);
  const src = readFileSync(url, "utf8");
  for (const [i, line] of src.split("\n").entries()) {
    if (/^\s*import\s+(?!type\b)/.test(line)) errors.push(`line ${i + 1}: a runtime import`);
    if (/Math\.random|Date\.now|new Date/.test(line)) errors.push(`line ${i + 1}: Math.random or Date`);
    const banned = line.match(BANNED);
    if (banned) errors.push(`line ${i + 1}: the banned word "${banned[1]}"`);
  }
  for (const raw of src.matchAll(/String\.raw`[^`]*`/g)) if (/[^\x00-\x7f]/.test(raw[0])) errors.push("non-ascii in a String.raw template (Bun escapes it)");

  const m = await import(`${url.href}?${Date.now()}`);
  const meta = m.meta;
  if (typeof meta.name !== "string" || !meta.name || meta.name !== meta.name.toLowerCase()) errors.push("name: a lowercase name");
  if (!CATEGORIES.includes(meta.category)) errors.push(`category "${meta.category}"`);
  if (typeof meta.note !== "string" || meta.note.length > 72 || meta.note !== meta.note.toLowerCase()) errors.push("note: one lowercase line of up to 72 characters");
  const square = meta.cell === 1;
  if (!square && (meta.cols > 80 || meta.rows > 32)) errors.push(`size ${meta.cols}x${meta.rows} is over 80x32`);
  if (meta.palette) {
    if (!COLOURED.includes(meta.category)) errors.push(`a palette on category "${meta.category}"; only ${COLOURED.join(", ")} may colour`);
    if (meta.palette.length > 64 || meta.palette.some((c) => !/^#[0-9a-f]{6}$/i.test(c))) errors.push("palette: up to 64 colours as #rrggbb");
    if (meta.category === "scenes" && !meta.ground) errors.push("a scene needs a ground");
  }

  const play = () => m.default({ ...meta.options });
  const size = (text, what) => {
    const lines = text.split("\n");
    if (lines.length !== meta.rows) return errors.push(`${what}: ${lines.length} lines, not ${meta.rows}`);
    lines.forEach((l, y) => {
      const n = [...l].length;
      if (n !== meta.cols) errors.push(`${what}: line ${y} is ${n} characters, not ${meta.cols}`);
    });
    const bad = [...new Set([...text].filter((c) => c !== "\n" && !allowed(c)))];
    if (bad.length) errors.push(`${what}: characters outside the contract: ${bad.join(" ")}`);
  };
  const frame = play(), again = play();
  const stills = new Set();
  for (const t of [...TIMES, 0.37, 2.5, 17.3, 61]) {
    const color = meta.palette ? new Uint8Array(meta.cols * meta.rows) : undefined;
    const text = frame(t, { paper: false, color });
    if (errors.length < 8) size(text, `t=${t}`);
    if (color && color.some((i) => i >= meta.palette.length)) errors.push(`t=${t}: a colour index past the palette`);
    if (again(t, { paper: false, color: color && new Uint8Array(color.length) }) !== text) errors.push(`t=${t}: not deterministic`);
    if (TIMES.includes(t)) stills.add(text);
    // it must also play in one ink, on a light page, and with no env at all
    for (const env of [{}, { paper: true }, undefined]) if (errors.length < 8) size(play()(t, env), `t=${t} mono`);
  }
  if (frame(0, { paper: false, color: meta.palette && new Uint8Array(meta.cols * meta.rows) }) !== play()(0, { paper: false, color: meta.palette && new Uint8Array(meta.cols * meta.rows) }))
    errors.push("frame 0 changes after later frames are drawn");
  if (meta.fps > 0 && stills.size < 3) errors.push(`only ${stills.size} distinct frames among t = ${TIMES.join(", ")}`);
  const ink = [...frame(0, {})].filter((c) => c !== " " && c !== "\n").length;
  if (ink < meta.cols * meta.rows * 0.03) warn.push("frame 0 is nearly empty");

  const color = meta.palette ? new Uint8Array(meta.cols * meta.rows) : undefined;
  let total = 0, worst = 0;
  const N = 240;
  for (let i = 0; i < N; i++) {
    const a = performance.now();
    frame(i / (meta.fps || 12), { paper: false, color });
    const d = performance.now() - a;
    total += d;
    if (i > 5 && d > worst) worst = d;
  }
  const mean = total / N, budget = meta.category === "scenes" && square ? 10 : 4;
  if (mean > budget) errors.push(`${mean.toFixed(2)} ms a frame, over ${budget}`);
  if (worst > 30) warn.push(`worst frame ${worst.toFixed(1)} ms`);

  if (errors.length) failed++;
  console.log(`${errors.length ? "FAIL" : "ok  "} ${slug.padEnd(22)} ${meta.cols}x${meta.rows} ${String(meta.palette?.length ?? 1).padStart(2)} colours  ${stills.size} stills  ${mean.toFixed(2)} ms`);
  for (const e of [...new Set(errors)].slice(0, 10)) console.log(`     ${e}`);
  for (const w of warn) console.log(`     note: ${w}`);
}
process.exit(failed ? 1 : 0);
