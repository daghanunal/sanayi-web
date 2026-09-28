#!/bin/sh
# asfalt top-down car still (Cycles, lib3d car): transparent WebP used by hero / fren / rot / final.
#   sh presets/asfalt/render.sh        (~40 s on an M4 Max)
set -e
cd "$(dirname "$0")/../.."
B="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
T="${TMPDIR:-/tmp}/asfalt-render"; mkdir -p "$T"
X=""; [ -n "$CPU" ] && X="--cpu 1"
"$B" -b --factory-startup --python presets/asfalt/render_cycles.py -- $X --spp 200 --out "$T/top.png" >/dev/null
# the shadow catcher leaves a faint ambient veil over the whole frame: drop it, keep the contact shadow
python3 - "$T/top.png" "$T/top-clean.png" <<'PY'
import sys
import numpy as np
from PIL import Image
im = np.asarray(Image.open(sys.argv[1]).convert("RGBA")).astype(np.float32)
H, W = im.shape[:2]
y, x = np.mgrid[0:H, 0:W]
dx, dy = np.abs(x - W / 2) / (W / 2), np.abs(y - H / 2) / (H / 2)
edge = (dx ** 4 + dy ** 4) ** 0.25                      # rounded-rect distance, 1 at the frame edge
fade = np.clip((1 - edge) / 0.3, 0, 1) ** 1.5
shadow = (im[..., 3] < 255) & (im[..., :3].sum(-1) < 6)
a = im[..., 3]
a[shadow] = np.clip((a[shadow] - 6) * 1.1, 0, 255) * fade[shadow]
out = Image.fromarray(im.astype(np.uint8), "RGBA").resize((320, 600), Image.LANCZOS)
out.save(sys.argv[2])
PY
cwebp -quiet -q 82 -alpha_q 90 "$T/top-clean.png" -o public/img/asfalt/arac-ust.webp
ls -la public/img/asfalt/arac-ust.webp
