# python3 tools/smoke.py [command...]: plays every piece, the picker and the screensaver in pretend terminals of
# several sizes, pressing keys, and fails if anything crashes, hangs, or prints an error or a \uXXXX escape. It also
# pauses a few pieces and saves their frames, and checks the PNG and JPEG that come out.
# The command defaults to `node src/cli.ts`; pass `./dist/ahoy` to test the binary. Runs are made side by side and
# each is killed if it outlives its time, so the whole thing takes about a minute and always ends.
import fcntl, os, pty, re, select, shutil, signal, struct, subprocess, sys, tempfile, termios, time
from multiprocessing import Pool

CMD = sys.argv[1:] or ["node", "src/cli.ts"]
BAD = re.compile(rb"(Error|undefined|NaN|\\u[0-9a-f]{4}|\n    at )")
LIMIT = 8  # seconds a run may take before it is killed


def run(job):
    name, args, cols, rows, keys, wait = job
    pid, fd = pty.fork()
    if pid == 0:
        os.environ.update(TERM="xterm-256color", COLORTERM="truecolor")
        os.execvp(CMD[0], CMD + args)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))
    os.kill(pid, signal.SIGWINCH)
    out, start, status = b"", time.time(), None

    def pump(secs):
        nonlocal out
        end = time.time() + secs
        while time.time() < end:
            try:
                if select.select([fd], [], [], 0.02)[0]:
                    out += os.read(fd, 65536)
            except OSError:
                return

    pump(wait)
    for key in keys:
        try:
            os.write(fd, key)
        except OSError:
            break
        pump(0.08)
    while status is None and time.time() - start < LIMIT:
        pump(0.05)
        done, st = os.waitpid(pid, os.WNOHANG)
        if done:
            status = os.waitstatus_to_exitcode(st)
    if status is None:
        os.kill(pid, signal.SIGKILL)
        os.waitpid(pid, 0)
    os.close(fd)
    bad = BAD.search(out)
    why = "hung" if status is None else f"exit {status}" if status else f"printed {bad.group(0)!r}" if bad else "drew nothing" if len(out) < 50 else ""
    return f"{name} at {cols}x{rows}", why


if __name__ == "__main__":
    # every piece of ahoy's own, the prototypes with them: any can be played by name, listed or not
    listing = subprocess.run(CMD + ["list", "--prototypes"], capture_output=True, text=True, check=True).stdout
    slugs = [line.split()[0] for line in listing.splitlines() if line.startswith("  ")]
    jobs = [(s, [s], c, r, [b" ", b".", b",", b"m", b"t", b"q"], 0.4) for s in slugs for c, r in [(200, 60), (80, 24), (24, 8)]]
    sizes = [(160, 50), (80, 24), (30, 8)]
    picker = [b"j", b"j", b"p", b"G", b"g", b"p", b"p", b"t", b"t", b"m", b"/", b"skull", b"\r", b"x", b"\x1b[6~", b"\r", b"\x1b[C", b"\x1b[D", b"q", b"q"]
    jobs += [("picker", [], c, r, picker, 0.8) for c, r in sizes]
    jobs += [("picker --all", ["--all"], c, r, [b"G", b"k", b"\r", b"q", b"q"], 0.8) for c, r in sizes]
    jobs += [("saver", ["saver", "--shuffle", "-d", "1"], c, r, [b"\x1b[C", b" ", b" ", b"q"], 2.5) for c, r in sizes]
    jobs += [("saver pixels --mono", ["saver", "pixels", "-d", "1", "--mono"], c, r, [b"q"], 2.5) for c, r in sizes]
    jobs += [(f"scene {how}", ["kraken-rising", "--scenes", how], c, r, [b"d", b"d", b" ", b"d", b"q"], 0.8) for how in ["ascii", "crisp", "soft"] for c, r in [(220, 60), (90, 28)]]
    jobs += [("picker --prototypes", ["--prototypes"], c, r, [b"G", b"p", b"j", b"\r", b"q", b"q"], 0.8) for c, r in sizes]
    jobs += [("saver lore --light", ["saver", "lore", "-d", "1", "--light"], c, r, [b"q"], 2.5) for c, r in sizes]
    # a frame saved from a pause: a piece in blocks, one in letters, one in box drawing and a scene
    saved = ["doubloon", "calico-jack", "treasure-chest", "burning-ship"]
    out = tempfile.mkdtemp(prefix="ahoy-smoke-")
    jobs += [(f"export {s}", [s, "-o", out], 100, 30, [b" ", b".", b"e", b"", b"", b"", b"", b"", b"", b"q"], 0.6) for s in saved if s in slugs]
    start = time.time()
    with Pool(min(16, (os.cpu_count() or 4) * 2)) as pool:
        results = pool.map(run, jobs, chunksize=1)
    for s in saved:
        if s not in slugs:
            continue
        found = sorted(f for f in os.listdir(out) if f.startswith(f"ahoy-{s}-"))
        png = next((open(os.path.join(out, f), "rb").read() for f in found if f.endswith(".png")), b"")
        jpg = next((open(os.path.join(out, f), "rb").read() for f in found if f.endswith(".jpg")), b"")
        # a PNG says its size and that it has alpha in its first chunk; a JPEG says its size after the marker ff c0
        at = jpg.find(b"\xff\xc0")
        ok = png[:8] == b"\x89PNG\r\n\x1a\n" and struct.unpack(">IIBB", png[16:26]) == (1500, 1500, 8, 6) and len(png) > 2000
        ok = ok and jpg[:2] == b"\xff\xd8" and jpg[-2:] == b"\xff\xd9" and at > 0 and struct.unpack(">HH", jpg[at + 5:at + 9]) == (1500, 1500)
        results.append((f"export {s} files", "" if ok else f"bad or missing files: {found}"))
    shutil.rmtree(out, ignore_errors=True)
    failed = [(what, why) for what, why in results if why]
    for what, why in failed:
        print(f"FAIL {what}: {why}")
    print(f"{len(results) - len(failed)} of {len(results)} runs ok, {len(slugs)} pieces, in {time.time() - start:.0f}s")
    sys.exit(1 if failed else 0)
