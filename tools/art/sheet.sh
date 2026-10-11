#!/bin/sh
# tools/art/sheet.sh out.png t slug...: frame t of each piece, rendered in colour, two to a row.
# Run from the repo root with node 23.6+ and Python 3 with Pillow.
set -eu
out=$1; t=$2; shift 2
tmp=$(mktemp -d)
for s in "$@"; do
  node tools/art/dump.mjs "$s" "$t" > "$tmp/$s.json"
  python3 -E tools/art/render-cells.py "$tmp/$s.json" "$tmp/$s.png"
done
python3 -E - "$out" "$tmp" "$@" <<'PY'
import sys
from PIL import Image, ImageDraw
out, tmp, names = sys.argv[1], sys.argv[2], sys.argv[3:]
ims = [Image.open(f"{tmp}/{n}.png") for n in names]
w = max(i.size[0] for i in ims); h = max(i.size[1] for i in ims); rows = (len(ims) + 1) // 2
s = Image.new("RGB", (w * 2, h * rows), "#222")
for j, im in enumerate(ims):
    s.paste(im, ((j % 2) * w, (j // 2) * h)); ImageDraw.Draw(s).text(((j % 2) * w + 12, (j // 2) * h + 2), names[j], fill="#ff9900")
s.save(out)
PY
rm -rf "$tmp"
