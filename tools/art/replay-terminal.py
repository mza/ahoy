# replay-terminal.py capture.raw out.png cols rows: replays the escape codes ahoy wrote (captured with `script`)
# onto a grid as it stood just before ahoy quit, and renders it, to see the TUI without a terminal. See
# docs/MAKING-PIECES.md for the capture command.
import os, re, sys
from PIL import Image, ImageDraw, ImageFont
data = open(sys.argv[1], "rb").read().decode("utf8", "replace")
W, H = int(sys.argv[3]), int(sys.argv[4])
cut = data.rfind("\x1b[?1049l") if "\x1b[?1049l" in data else len(data)
data = data[:cut]
ch = [[" "] * W for _ in range(H)]; fg = [[None] * W for _ in range(H)]; bg = [[None] * W for _ in range(H)]
x = y = 0; cf = cb = None
i = 0
tok = re.compile(r"\x1b\[([?0-9;]*)([A-Za-z])|\x1b.|([^\x1b])", re.S)
for m in tok.finditer(data):
    if m.group(3) is not None:
        c = m.group(3)
        if c in "\r\n": continue
        if 0 <= y < H and 0 <= x < W: ch[y][x] = c; fg[y][x] = cf; bg[y][x] = cb
        x += 1; continue
    p, f = m.group(1), m.group(2)
    if f is None: continue
    if f == "H":
        a = (p or "1;1").split(";"); y = int(a[0] or 1) - 1; x = int(a[1] if len(a) > 1 else 1) - 1
    elif f == "J" and p == "2":
        ch = [[" "] * W for _ in range(H)]; fg = [[None] * W for _ in range(H)]; bg = [[None] * W for _ in range(H)]
    elif f == "m":
        a = [int(v) for v in (p or "0").split(";") if v]
        j = 0
        while j < len(a):
            v = a[j]
            if v == 0: cf = cb = None
            elif v == 39: cf = None
            elif v == 49: cb = None
            elif v in (38, 48) and a[j+1] == 2:
                col = tuple(a[j+2:j+5]); j += 4
                if v == 38: cf = col
                else: cb = col
            j += 1
# a monospace font: $AHOY_FONT, else the first of these that is installed
FONTS = [os.environ.get("AHOY_FONT", ""), "/System/Library/Fonts/Menlo.ttc", "/usr/share/fonts/TTF/JetBrainsMonoNerdFont-Regular.ttf",
         "/usr/share/fonts/liberation/LiberationMono-Regular.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"]
f = ImageFont.truetype(next(p for p in FONTS if p and os.path.exists(p)), 16)
cw = round(f.getlength("M")); asc, desc = f.getmetrics(); chh = asc + desc
img = Image.new("RGB", (W * cw, H * chh), (13, 17, 23)); d = ImageDraw.Draw(img)
for yy in range(H):
    for xx in range(W):
        X, Y = xx * cw, yy * chh
        if bg[yy][xx]: d.rectangle([X, Y, X + cw - 1, Y + chh - 1], fill=bg[yy][xx])
        c = ch[yy][xx]; col = fg[yy][xx] or (232, 235, 239)
        if c == " ": continue
        if c == "█": d.rectangle([X, Y, X + cw - 1, Y + chh - 1], fill=col)
        elif c == "▀": d.rectangle([X, Y, X + cw - 1, Y + chh // 2 - 1], fill=col)
        elif c == "▄": d.rectangle([X, Y + chh // 2, X + cw - 1, Y + chh - 1], fill=col)
        elif 0x2800 <= ord(c) <= 0x28ff:
            # braille as a terminal that draws it itself does: eight dots, two across and four down
            bits, w = ord(c) - 0x2800, max(1, min(cw // 4, chh // 8))
            for n, (bx, by) in enumerate([(0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (1, 2), (0, 3), (1, 3)]):
                if bits & (1 << n):
                    x0, y0 = X + round((bx + 0.5) * cw / 2 - w / 2), Y + round((by + 0.5) * chh / 4 - w / 2)
                    d.rectangle([x0, y0, x0 + w - 1, y0 + w - 1], fill=col)
        else: d.text((X, Y), c, font=f, fill=col)
img.save(sys.argv[2])
