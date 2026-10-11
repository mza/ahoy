// node tools/art/dump.mjs <slug> <t1,t2,...> [mono] > frames.json
// The frames of a piece in src/pieces at those times, with their colours, for render-cells.py and render-dots.py.
const [slug, ts = "0", mono] = process.argv.slice(2);
const m = await import(new URL(`../../src/pieces/${slug}.ts?${Date.now()}`, import.meta.url).href);
const meta = m.meta, f = m.default({ ...meta.options });
const frames = ts.split(",").map(Number).map((t) => {
  const color = mono ? undefined : new Uint8Array(meta.cols * meta.rows);
  const text = f(t, { paper: false, color });
  return { text, color: color ? [...color] : null };
});
process.stdout.write(JSON.stringify({ cols: meta.cols, rows: meta.rows, palette: meta.palette ?? ["#e8ebef"], ground: meta.ground ?? "#000000", frames }));
