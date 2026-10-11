# render-dots.py frames.json out.png [scale]: draws a square-celled scene (cell: 1) as the site and the macOS
# screensaver do, each cell a dot sized by its character: · small, • medium, ● large.
import json, sys
from PIL import Image, ImageDraw
d = json.load(open(sys.argv[1])); S = int(sys.argv[3]) if len(sys.argv) > 3 else 6
pal = [tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) for h in d["palette"]]
g = d["ground"]; ground = tuple(int(g[i:i+2], 16) for i in (1, 3, 5))
cols, rows = d["cols"], d["rows"]; frames = d["frames"]
img = Image.new("RGB", (cols * S, rows * S * len(frames) + 4 * (len(frames) - 1)), (40, 0, 0))
dr = ImageDraw.Draw(img)
SIZE = {"·": 0.3, "•": 0.6, "●": 1.0}
for n, fr in enumerate(frames):
    oy = n * (rows * S + 4)
    dr.rectangle([0, oy, cols * S - 1, oy + rows * S - 1], fill=ground)
    lines = fr["text"].split("\n")
    for y, line in enumerate(lines):
        for x, c in enumerate(line):
            if c == " ": continue
            k = SIZE.get(c, 0.6); r = S * k * 0.55
            col = pal[fr["color"][y * cols + x]]
            cx, cy = x * S + S / 2, oy + y * S + S / 2
            dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
img.save(sys.argv[2])
