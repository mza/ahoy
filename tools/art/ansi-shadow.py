# ansi-shadow.py: turns a mask of # cells into ANSI Shadow lettering, █ with ╔═╗║╚╝ shadows down and to the right,
# as no-prey-no-pay, tortuga and wanted-poster are lettered. Import shadow(mask) or pipe a mask in.
import sys
def shadow(mask):
    H = len(mask) + 1; W = max(map(len, mask)) + 1
    M = [[(y < len(mask) and x < len(mask[y]) and mask[y][x] == "#") for x in range(W)] for y in range(H)]
    m = lambda x, y: 0 <= y < H and 0 <= x < W and M[y][x]
    S = [[not M[y][x] and (m(x-1, y) or m(x, y-1) or m(x-1, y-1)) for x in range(W)] for y in range(H)]
    s = lambda x, y: 0 <= y < H and 0 <= x < W and S[y][x]
    out = []
    for y in range(H):
        row = ""
        for x in range(W):
            if M[y][x]: row += "█"; continue
            if not S[y][x]: row += " "; continue
            us, ds, ls, rs = s(x, y-1), s(x, y+1), s(x-1, y), s(x+1, y)
            um, dm, lm, rm = m(x, y-1), m(x, y+1), m(x-1, y), m(x+1, y)
            if rs and (ds or dm) and not us: c = "╔"
            elif (ls or lm) and (ds or dm) and not us: c = "╗"
            elif us and ds: c = "║"
            elif (us or um) and (rs or rm) and not ls: c = "╚"
            elif us and ls and not rs: c = "╝"
            elif ls or rs: c = "═"
            else: c = "║"
            row += c
        out.append(row.rstrip())
    return out
if __name__ == "__main__":
    print("\n".join(shadow(open(sys.argv[1]).read().split("\n"))))
