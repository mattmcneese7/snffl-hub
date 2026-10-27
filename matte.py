"""Squirt matting: cut the studio background out of OpenArt stills and clips.

Reads jobs.json, writes out/: transparent stills (PNG master, WebP at app
sizes) and, per clip, a transparent WebM (VP9 alpha, Chrome and Android),
a transparent MOV (HEVC alpha, Safari and iPhone) and a poster frame.
"""
import glob, json, os, subprocess, time
import numpy as np
from PIL import Image
import imageio_ffmpeg
from rembg import new_session, remove

FF = imageio_ffmpeg.get_ffmpeg_exe()
jobs = json.load(open("jobs.json"))
OUT = "out"
os.makedirs(OUT, exist_ok=True)
session = new_session(jobs["model"])
size, fps = jobs["size"], jobs["fps"]
report = []


def ff(*args):
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def fetch(url, path):
    # The OpenArt CDN refuses Python's default client, so download with curl.
    subprocess.run(["curl", "-fsSL", "--retry", "3", "-o", path, url], check=True)
    return path


for s in jobs.get("stills", []):
    t = time.time()
    src = Image.open(fetch(s["url"], f"/tmp/{s['name']}.png")).convert("RGB")
    cut = remove(src, session=session)
    cut.save(f"{OUT}/{s['name']}.png")
    for px in (480, 960):
        cut.resize((px, px), Image.LANCZOS).save(f"{OUT}/{s['name']}-{px}.webp", quality=88, method=6)
    report.append(f"still {s['name']}: {round(time.time() - t, 1)} s")
    print(report[-1], flush=True)

for c in jobs.get("clips", []):
    t = time.time()
    raw = fetch(c["url"], f"/tmp/{c['name']}.mp4")
    frames, rgba = f"/tmp/{c['name']}-f", f"/tmp/{c['name']}-a"
    os.makedirs(frames, exist_ok=True)
    os.makedirs(rgba, exist_ok=True)
    ff("-i", raw, "-vf", f"fps={fps},scale={size}:{size}:flags=lanczos", f"{frames}/%03d.png")
    prev, diffs = None, []
    for f in sorted(glob.glob(f"{frames}/*.png")):
        im = remove(Image.open(f).convert("RGB"), session=session)
        a = np.asarray(im)[:, :, 3].astype(np.int16)
        if prev is not None:
            diffs.append(float(np.abs(a - prev).mean()))
        prev = a
        im.save(f"{rgba}/{os.path.basename(f)}")
    seq = f"{rgba}/%03d.png"
    ff("-framerate", str(fps), "-i", seq, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "34", "-row-mt", "1", "-auto-alt-ref", "0", "-an", f"{OUT}/{c['name']}.webm")
    ff("-framerate", str(fps), "-i", seq, "-c:v", "hevc_videotoolbox", "-allow_sw", "1", "-alpha_quality", "0.8", "-tag:v", "hvc1", "-pix_fmt", "bgra", "-b:v", "900k", "-an", f"{OUT}/{c['name']}.mov")
    Image.open(sorted(glob.glob(f"{rgba}/*.png"))[0]).save(f"{OUT}/{c['name']}-poster.webp", quality=88, method=6)
    sizes = {ext: os.path.getsize(f"{OUT}/{c['name']}.{ext}") // 1024 for ext in ("webm", "mov")}
    report.append(f"clip {c['name']}: {len(diffs) + 1} frames, {round(time.time() - t)} s, edge change per frame mean {round(sum(diffs) / max(1, len(diffs)), 3)} max {round(max(diffs or [0]), 3)}, webm {sizes['webm']} KB, mov {sizes['mov']} KB")
    print(report[-1], flush=True)

open(f"{OUT}/report.txt", "w").write("\n".join(report) + "\n")
