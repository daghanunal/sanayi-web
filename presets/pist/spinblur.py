"""Rotational motion blur for the face-on wheel layers: average of copies rotated over ±ARC degrees
about the image centre (premultiplied alpha, so the transparent gaps between the spokes stay clean).
  python3 presets/pist/spinblur.py back.png front.png outdir
"""
import os
import sys

import numpy as np
from PIL import Image

ARC = 11.0
N = 23


def blur(path, out):
    im = Image.open(path).convert("RGBA")
    acc = np.zeros((im.height, im.width, 4), np.float64)
    for i in range(N):
        a = -ARC + 2 * ARC * i / (N - 1)
        r = np.asarray(im.rotate(a, resample=Image.BICUBIC), np.float64) / 255
        r[..., :3] *= r[..., 3:4]
        acc += r
    acc /= N
    rgb = np.where(acc[..., 3:4] > 1e-4, acc[..., :3] / np.maximum(acc[..., 3:4], 1e-4), 0)
    o = np.concatenate([rgb, acc[..., 3:4]], -1)
    Image.fromarray((np.clip(o, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA").save(out)


outdir = sys.argv[-1]
for p in sys.argv[1:-1]:
    base = os.path.splitext(os.path.basename(p))[0]
    blur(p, os.path.join(outdir, base + "-blur.png"))
