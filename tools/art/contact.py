# python3 tools/art/contact.py out.png per-row slug...: the first frame of each piece, in colour, as a labelled
# contact sheet, as the sheets in docs/sheets were made. Run from the repo root, with Pillow.
import json, subprocess, sys, tempfile, os
from PIL import Image, ImageDraw, ImageFont
out, per, names = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
tmp = tempfile.mkdtemp(); ims = []
for n in names:
    j = os.path.join(tmp, n + ".json"); p = os.path.join(tmp, n + ".png")
    open(j, "w").write(subprocess.run(["node", "tools/art/dump.mjs", n, "0"], capture_output=True, text=True, check=True).stdout)
    # a scene, wider than any piece in character cells, is painted in dots
    scene = json.load(open(j))["cols"] > 80
    subprocess.run(["python3", "-E", "tools/art/render-dots.py", j, p, "5"] if scene else ["python3", "-E", "tools/art/render-cells.py", j, p], check=True)
    im = Image.open(p).convert("RGB"); im.thumbnail((400, 360)); ims.append(im)
W, H = 410, 392
FONTS = [os.environ.get("AHOY_FONT", ""), "/System/Library/Fonts/Menlo.ttc", "/usr/share/fonts/TTF/JetBrainsMonoNerdFont-Regular.ttf",
         "/usr/share/fonts/liberation/LiberationMono-Regular.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"]
font = ImageFont.truetype(next(p for p in FONTS if p and os.path.exists(p)), 15)
s = Image.new("RGB", (W * per, H * ((len(ims) + per - 1) // per)), "#000")
d = ImageDraw.Draw(s)
for k, im in enumerate(ims):
    x, y = (k % per) * W, (k // per) * H
    s.paste(im, (x + (W - im.size[0]) // 2, y + 26 + (360 - im.size[1]) // 2)); d.text((x + 8, y + 4), names[k], fill="#ff9900", font=font)
s.save(out, optimize=True); print(out, s.size, os.path.getsize(out) // 1024, "KB")
