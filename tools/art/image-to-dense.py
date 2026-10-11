# image-to-dense.py image.png [content-cols] [cell-aspect] [rows-offset]: turns a white-on-black logo into dense
# fill (8 inside, an edge character chosen by coverage at the edges), as aws.ts was made. It also writes an INK
# map that splits the art in two at the widest empty band of rows (the AWS wordmark from its smile); edit that
# part for other logos.
import sys
from PIL import Image

src, CONTENT = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 74
ASPECT = float(sys.argv[3]) if len(sys.argv) > 3 else 1.95  # cell height / width
MARGIN = 2
OFF = float(sys.argv[4]) if len(sys.argv) > 4 else 0.0  # rows the grid shifts up

img = Image.open(src).convert("L")
w, h = img.size
px = img.load()
on = lambda x, y: px[x, y] > 128
xs = [x for x in range(w) if any(on(x, y) for y in range(0, h, 2))]
ys = [y for y in range(h) if any(on(x, y) for x in range(0, w, 2))]
x0, x1, y0, y1 = xs[0], xs[-1] + 1, ys[0], ys[-1] + 1
bw, bh = x1 - x0, y1 - y0
cw = bw / CONTENT
ch = cw * ASPECT
ROWS = round(bh / ch + OFF + 0.49)
# split between the letters and the smile: the widest empty band of rows in the middle
gaps = [y for y in range(y0 + bh // 3, y0 + 3 * bh // 4) if not any(on(x, y) for x in range(x0, x1))]
split = (gaps[0] + gaps[-1]) / 2
y0 -= OFF * ch

GX, GY = 3, 4  # template grid
SX, SY = 4, 4  # samples per template cell


def coverage(cx, cy):
    g = []
    for j in range(GY):
        for i in range(GX):
            n = 0
            for b in range(SY):
                for a in range(SX):
                    x = x0 + (cx + (i + (a + 0.5) / SX) / GX) * cw
                    y = y0 + (cy + (j + (b + 0.5) / SY) / GY) * ch
                    n += 0 <= y < h and on(min(int(x), w - 1), int(y))
            g.append(n / (SX * SY))
    return g


T = {
    " ": ["000", "000", "000", "000"],
    "8": ["999", "999", "999", "999"],
    "_": ["000", "000", "000", "555"],
    ".": ["000", "000", "000", "050"],
    "'": ["050", "000", "000", "000"],
    '"': ["555", "000", "000", "000"],
    "^": ["999", "000", "000", "000"],
    "o": ["000", "000", "999", "999"],
    "p": ["000", "059", "599", "999"],
    "q": ["000", "950", "995", "999"],
    "P": ["999", "999", "995", "950"],
    "Y": ["999", "999", "599", "059"],
    "d": ["399", "399", "399", "399"],
    "b": ["993", "993", "993", "993"],
    "|": ["090", "090", "090", "090"],
    "/": ["009", "059", "590", "900"],
    "\\": ["900", "950", "095", "009"],
    ",": ["000", "000", "005", "059"],
    "`": ["950", "500", "000", "000"],
    "9": ["999", "999", "999", "000"],
    "6": ["000", "999", "999", "999"],
    ")": ["500", "900", "900", "500"],
    "(": ["005", "009", "009", "005"],
}
T = {k: [int(c) / 9 for row in v for c in row] for k, v in T.items()}
T["^"] = T['"']  # same char family; keep picking simple
del T["^"]
# the half fills read better as these
ALIAS = {"`": "'", "(": "d", ")": "b"}

art, ink = [], []
fuzz = cells = 0
for cy in range(ROWS):
    line, inks = "", ""
    for cx in range(CONTENT):
        g = coverage(cx, cy)
        tot = sum(g) / len(g)
        if tot > 0.02:
            cells += 1
            fuzz += 0.15 < tot < 0.85
        if tot < 0.06:
            c = " "
        elif tot > 0.9:
            c = "8"
        else:
            c = min(T, key=lambda k: sum((a - b) ** 2 for a, b in zip(g, T[k])))
            c = ALIAS.get(c, c)
        line += c
        mid = y0 + (cy + 0.5) * ch
        inks += " " if c == " " else ("0" if mid < split else "1")
    # half fills take their side of the run: p/q along a top edge, Y/P along a bottom one
    out = list(line)
    for x, c in enumerate(out):
        if c in "o69":
            a = x
            while a > 0 and line[a - 1] != " ":
                a -= 1
            b = x
            while b < len(line) - 1 and line[b + 1] != " ":
                b += 1
            left = x - a < b - x
            out[x] = ("p" if left else "q") if c in "o6" else ("Y" if left else "P")
    line = "".join(out)
    art.append(" " * MARGIN + line.rstrip())
    ink.append(" " * MARGIN + inks.rstrip())

cols = CONTENT + 2 * MARGIN
print(f"// cols {cols} rows {ROWS + 2} fuzz {fuzz / cells:.3f}")
print("ART")
print("\n" + "\n".join(art) + "\n")
print("INK")
print("\n" + "\n".join(ink) + "\n")
