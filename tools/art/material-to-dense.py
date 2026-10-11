# material-to-dense.py in.png cols rows fills -> prints JSON {art:[...], mat:[...]}
# in.png is a material map exactly cols*CW x rows*CH, each material a distinct colour, black empty.
# fills: "rrggbb=c,rrggbb=c" the solid character per material (default 8); materials are numbered in order given.
import json, sys
from PIL import Image

src, COLS, ROWS = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
spec = [kv.split("=") for kv in sys.argv[4].split(",")]
mats = [tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) for h, _ in spec]
fills = [c for _, c in spec]
img = Image.open(src).convert("RGB")
W, H = img.size
CW, CH = W / COLS, H / ROWS
px = img.load()


def mat_at(x, y):
    p = px[min(W - 1, int(x)), min(H - 1, int(y))]
    best, bd = -1, 60 ** 2 * 3
    for i, m in enumerate(mats):
        d = sum((a - b) ** 2 for a, b in zip(p, m))
        if d < bd:
            best, bd = i, d
    return best


GX, GY, S = 3, 4, 4
T = {
    " ": ["000", "000", "000", "000"], "8": ["999", "999", "999", "999"],
    "_": ["000", "000", "000", "555"], ".": ["000", "000", "000", "050"],
    "'": ["050", "000", "000", "000"], '"': ["555", "000", "000", "000"],
    "o": ["000", "000", "999", "999"], "9": ["999", "999", "999", "000"],
    "p": ["000", "059", "599", "999"], "q": ["000", "950", "995", "999"],
    "P": ["999", "999", "995", "950"], "Y": ["999", "999", "599", "059"],
    "d": ["399", "399", "399", "399"], "b": ["993", "993", "993", "993"],
    "|": ["090", "090", "090", "090"], "/": ["009", "059", "590", "900"],
    "\\": ["900", "950", "095", "009"], ",": ["000", "000", "005", "059"],
    "`": ["950", "500", "000", "000"], "-": ["000", "999", "000", "000"],
    "=": ["000", "999", "999", "000"],
}
T = {k: [int(c) / 9 for row in v for c in row] for k, v in T.items()}

art, matrows = [], []
for cy in range(ROWS):
    line, ml = [], []
    for cx in range(COLS):
        g, counts = [], {}
        for j in range(GY):
            for i in range(GX):
                n = 0
                for b in range(S):
                    for a in range(S):
                        m = mat_at((cx + (i + (a + .5) / S) / GX) * CW, (cy + (j + (b + .5) / S) / GY) * CH)
                        if m > 0:
                            n += 1
                            counts[m] = counts.get(m, 0) + 1
                g.append(n / S / S)
        tot = sum(g) / len(g)
        if tot < 0.07:
            c, m = " ", 0
        else:
            m = max(counts, key=counts.get)
            if tot > 0.88:
                c = fills[m]
            else:
                c = min(T, key=lambda k: sum((x - y) ** 2 for x, y in zip(g, T[k])))
                c = {"`": "'", "9": "P", "o": "o"}.get(c, c)
                if c == "8":
                    c = fills[m]
        line.append(c)
        ml.append(m)
    # half fills take their side of the run
    s = "".join(line)
    for x, c in enumerate(line):
        if c in "o":
            a = x
            while a > 0 and s[a - 1] != " ":
                a -= 1
            b = x
            while b < len(s) - 1 and s[b + 1] != " ":
                b += 1
            line[x] = "p" if x - a < b - x else "q"
    art.append("".join(line))
    matrows.append("".join("0123456789abcdefghij"[m] for m in ml))
print(json.dumps({"art": art, "mat": matrows}))
