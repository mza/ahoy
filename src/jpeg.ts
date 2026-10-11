/*
 * A baseline JPEG from pixels in memory: full-resolution colour (no chroma
 * subsampling, so flat colour keeps its edges), the standard's own tables.
 */

// The standard's quantization tables, row by row, for luminance and for chrominance.
const LUMA = [
  16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55, 14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92, 49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
];
const CHROMA = [
  17, 18, 24, 47, 99, 99, 99, 99, 18, 21, 26, 66, 99, 99, 99, 99, 24, 26, 56, 99, 99, 99, 99, 99, 47, 66, 99, 99, 99, 99, 99, 99,
  ...new Array<number>(32).fill(99),
];
// Where in a block, row by row, each coefficient of the zigzag is.
const ZIGZAG = [
  0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28,
  35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63,
];
// The standard's Huffman tables: how many codes of each length, 1 to 16 bits, then the symbols in code order.
const hex = (s: string) => s.match(/../g)!.map((h) => parseInt(h, 16));
const DC_LUMA = { bits: [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0], vals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
const DC_CHROMA = { bits: [0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0], vals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
const AC_LUMA = {
  bits: [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7d],
  vals: hex(
    "01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a" +
      "535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9ca" +
      "d2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9fa",
  ),
};
const AC_CHROMA = {
  bits: [0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77],
  vals: hex(
    "000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a" +
      "535455565758595a636465666768696a737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9ca" +
      "d2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9fa",
  ),
};
type Table = typeof DC_LUMA;

// Each symbol's code and its length in bits.
function codes({ bits, vals }: Table) {
  const code = new Uint16Array(256), size = new Uint8Array(256);
  let c = 0, k = 0;
  for (let len = 1; len <= 16; len++) {
    for (let i = 0; i < bits[len - 1]; i++) (code[vals[k]] = c++), (size[vals[k++]] = len);
    c <<= 1;
  }
  return { code, size };
}

// cos((2x + 1) u pi / 16), scaled as the transform wants it, for each u and x.
const COS = Float64Array.from({ length: 64 }, (_, i) => {
  const u = i >> 3, x = i & 7;
  return (u ? 0.5 : Math.SQRT1_2 / 2) * Math.cos(((2 * x + 1) * u * Math.PI) / 16);
});

/** `rgb` is `width * height * 3` bytes, row by row; `quality` from 1 to 100. */
export function jpeg(rgb: Uint8Array, width: number, height: number, quality = 92) {
  const scale = quality < 50 ? 5000 / quality : 200 - 2 * quality;
  const quant = (base: number[]) => base.map((q) => Math.max(1, Math.min(255, Math.floor((q * scale + 50) / 100))));
  const tables = [quant(LUMA), quant(CHROMA)];
  const dc = [codes(DC_LUMA), codes(DC_CHROMA)], ac = [codes(AC_LUMA), codes(AC_CHROMA)];

  const out: number[] = [];
  const word = (n: number) => out.push(n >> 8, n & 255);
  const segment = (marker: number, data: number[]) => (out.push(0xff, marker), word(data.length + 2), out.push(...data));
  out.push(0xff, 0xd8);
  segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]); // JFIF, square pixels
  tables.forEach((t, i) => segment(0xdb, [i, ...ZIGZAG.map((z) => t[z])]));
  segment(0xc0, [8, height >> 8, height & 255, width >> 8, width & 255, 3, 1, 0x11, 0, 2, 0x11, 1, 3, 0x11, 1]);
  [DC_LUMA, AC_LUMA, DC_CHROMA, AC_CHROMA].forEach((t, i) => segment(0xc4, [((i & 1) << 4) | (i >> 1), ...t.bits, ...t.vals]));
  segment(0xda, [3, 1, 0x00, 2, 0x11, 3, 0x11, 0, 63, 0]);

  // the bits of the scan, a zero stuffed after every byte of ones
  let acc = 0, held = 0;
  const put = (code: number, size: number) => {
    acc = (acc << size) | code;
    held += size;
    while (held >= 8) {
      const b = (acc >> (held - 8)) & 255;
      out.push(b);
      if (b === 255) out.push(0);
      held -= 8;
    }
    acc &= (1 << held) - 1;
  };
  // a coefficient as its size in bits and those bits
  const bitsOf = (v: number) => {
    const a = Math.abs(v);
    let size = 0;
    while (a >> size) size++;
    return [size, v < 0 ? v + (1 << size) - 1 : v];
  };

  const block = new Float64Array(64), half = new Float64Array(64), coef = new Int32Array(64);
  const last = [0, 0, 0];
  for (let by = 0; by < height; by += 8)
    for (let bx = 0; bx < width; bx += 8)
      for (let comp = 0; comp < 3; comp++) {
        // the block in this component, its edge pixels repeated past the picture's edge
        for (let y = 0; y < 8; y++)
          for (let x = 0; x < 8; x++) {
            const i = (Math.min(height - 1, by + y) * width + Math.min(width - 1, bx + x)) * 3;
            const r = rgb[i], g = rgb[i + 1], b = rgb[i + 2];
            block[y * 8 + x] =
              comp === 0 ? 0.299 * r + 0.587 * g + 0.114 * b - 128
              : comp === 1 ? -0.168736 * r - 0.331264 * g + 0.5 * b
              : 0.5 * r - 0.418688 * g - 0.081312 * b;
          }
        // the cosine transform, along the rows and then down the columns
        for (let y = 0; y < 8; y++)
          for (let u = 0; u < 8; u++) {
            let s = 0;
            for (let x = 0; x < 8; x++) s += block[y * 8 + x] * COS[u * 8 + x];
            half[y * 8 + u] = s;
          }
        const table = tables[comp ? 1 : 0];
        for (let u = 0; u < 8; u++)
          for (let v = 0; v < 8; v++) {
            let s = 0;
            for (let y = 0; y < 8; y++) s += half[y * 8 + u] * COS[v * 8 + y];
            coef[v * 8 + u] = Math.round(s / table[v * 8 + u]);
          }
        // the first coefficient as its change from the block before, the rest as runs of zeros and a value
        const d = dc[comp ? 1 : 0], a = ac[comp ? 1 : 0];
        const [size, bits] = bitsOf(coef[0] - last[comp]);
        last[comp] = coef[0];
        put(d.code[size], d.size[size]);
        put(bits, size);
        let end = 63;
        while (end > 0 && coef[ZIGZAG[end]] === 0) end--;
        for (let k = 1, run = 0; k <= end; k++) {
          const v = coef[ZIGZAG[k]];
          if (v === 0) {
            run++;
            continue;
          }
          for (; run > 15; run -= 16) put(a.code[0xf0], a.size[0xf0]);
          const [n, b] = bitsOf(v);
          put(a.code[(run << 4) | n], a.size[(run << 4) | n]);
          put(b, n);
          run = 0;
        }
        if (end < 63) put(a.code[0], a.size[0]);
      }
  if (held) put((1 << (8 - held)) - 1, 8 - held);
  out.push(0xff, 0xd9);
  return Uint8Array.from(out);
}
