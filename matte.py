"""Squirt matting: cut the studio background out of one OpenArt still or clip.

  python matte.py still <name> <url>   -> out/<name>.png and WebP at 480 and 960
  python matte.py clip <name> <url>    -> out/<name>/NNN.png (transparent frames),
                                          out/<name>.webm (VP9 alpha), poster, report
The iPhone format (HEVC alpha) is encoded from the frames on a Mac runner.
"""
import glob, json, os, subprocess, sys, time
import numpy as np
from PIL import Image
import imageio_ffmpeg
from rembg import new_session, remove

FF = imageio_ffmpeg.get_ffmpeg_exe()
cfg = json.load(open("jobs.json"))
kind, name, url = sys.argv[1:4]
os.makedirs("out", exist_ok=True)
t0 = time.time()
src = f"/tmp/{name}"
subprocess.run(["curl", "-fsSL", "--retry", "3", "-o", src, url], check=True)
session = new_session(cfg["model"])
print(f"model ready {round(time.time() - t0)} s", flush=True)


def ff(*args):
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


if kind == "still":
    cut = remove(Image.open(src).convert("RGB"), session=session)
    cut.save(f"out/{name}.png")
    for px in (480, 960):
        cut.resize((px, px), Image.LANCZOS).save(f"out/{name}-{px}.webp", quality=88, method=6)
    line = f"still {name}: {round(time.time() - t0)} s"
else:
    size, fps = cfg["size"], cfg["fps"]
    frames, rgba = f"/tmp/{name}-f", f"out/{name}"
    os.makedirs(frames, exist_ok=True)
    os.makedirs(rgba, exist_ok=True)
    ff("-i", src, "-vf", f"fps={fps},scale={size}:{size}:flags=lanczos", f"{frames}/%03d.png")
    files = sorted(glob.glob(f"{frames}/*.png"))
    prev, diffs = None, []
    for i, f in enumerate(files):
        im = remove(Image.open(f).convert("RGB"), session=session)
        a = np.asarray(im)[:, :, 3].astype(np.int16)
        if prev is not None:
            diffs.append(float(np.abs(a - prev).mean()))
        prev = a
        im.save(f"{rgba}/{os.path.basename(f)}")
        print(f"frame {i + 1}/{len(files)} at {round(time.time() - t0)} s", flush=True)
    ff("-framerate", str(fps), "-i", f"{rgba}/%03d.png", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "34",
       "-row-mt", "1", "-auto-alt-ref", "0", "-an", f"out/{name}.webm")
    Image.open(f"{rgba}/001.png").save(f"out/{name}-poster.webp", quality=88, method=6)
    line = (f"clip {name}: {len(files)} frames, {round(time.time() - t0)} s, edge change per frame mean "
            f"{round(sum(diffs) / max(1, len(diffs)), 3)} max {round(max(diffs or [0]), 3)}, webm {os.path.getsize(f'out/{name}.webm') // 1024} KB")
print(line, flush=True)
open(f"out/{name}.report.txt", "w").write(line + "\n")
