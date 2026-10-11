# render-cells.py frames.json out.png [per-row]: draws dump.mjs frames as character cells (blocks and shades as
# filled rects, other characters in Menlo) in their palette colours on the ground, side by side.
import json, sys
from PIL import Image, ImageDraw, ImageFont
d = json.load(open(sys.argv[1]))
pal = [tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) for h in d["palette"]]
g = d["ground"]; ground = tuple(int(g[i:i+2], 16) for i in (1, 3, 5))
f = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 16)
cw = round(f.getlength("M")); a, b = f.getmetrics(); chh = a + b
frames = d["frames"]; cols, rows = d["cols"], d["rows"]
per = int(sys.argv[3]) if len(sys.argv) > 3 else len(frames)
n = len(frames); gw = cols * cw + 20; gh = rows * chh + 20
img = Image.new("RGB", (gw * min(n, per), gh * ((n + per - 1) // per)), (60, 0, 0))
for k, fr in enumerate(frames):
    ox, oy = (k % per) * gw, (k // per) * gh
    ImageDraw.Draw(img).rectangle([ox, oy, ox + gw - 3, oy + gh - 3], fill=ground)
    dr = ImageDraw.Draw(img)
    lines = fr["text"].split("\n")
    for y, line in enumerate(lines):
        for x, c in enumerate(line):
            if c == " ": continue
            col = pal[fr["color"][y * cols + x]] if fr.get("color") else (230, 230, 230)
            X, Y = ox + 10 + x * cw, oy + 10 + y * chh
            if c == "█": dr.rectangle([X, Y, X + cw - 1, Y + chh - 1], fill=col)
            elif c == "▀": dr.rectangle([X, Y, X + cw - 1, Y + chh // 2 - 1], fill=col)
            elif c == "▄": dr.rectangle([X, Y + chh // 2, X + cw - 1, Y + chh - 1], fill=col)
            elif c in "░▒▓": k={"░":.3,"▒":.55,"▓":.8}[c]; dr.rectangle([X, Y, X + cw - 1, Y + chh - 1], fill=tuple(int(ground[i]+(col[i]-ground[i])*k) for i in range(3)))
            elif c == "▌": dr.rectangle([X, Y, X + cw // 2 - 1, Y + chh - 1], fill=col)
            elif c == "▐": dr.rectangle([X + cw // 2, Y, X + cw - 1, Y + chh - 1], fill=col)
            else: dr.text((X, Y), c, font=f, fill=col)
img.save(sys.argv[2])
