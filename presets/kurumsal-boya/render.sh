#!/bin/sh
# kurumsal-boya "son kontrol" still (Cycles, lib3d car): champagne metallic under daylight inspection bars.
#   sh presets/kurumsal-boya/render.sh        (~1 min on an M4 Max)
set -e
cd "$(dirname "$0")/../.."
B="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
T="${TMPDIR:-/tmp}/kb-render"; mkdir -p "$T"
"$B" -b --factory-startup --python presets/kurumsal-boya/render_cycles.py -- --out "$T/kontrol.png" --spp 256 --res 1600x1200 \
  --tz 0.55 --lens 60 --side 0 --tubes 22 --tl 40 --ty_list "-2.4,-1.2,0,1.2,2.4" --th 2.6 \
  --paint "#9c8660" --rough 0.34 --fill 40 --rim 420 --exp -0.2 >/dev/null
# soft vignette (the floor falls off into the black studio), then JPEG
python3 - "$T/kontrol.png" public/img/kurumsal-boya/kontrol-3d.jpg <<'PY'
import sys
from PIL import Image, ImageDraw, ImageFilter
im = Image.open(sys.argv[1]).convert('RGB'); w, h = im.size
m = Image.new('L', (w, h), 0); d = ImageDraw.Draw(m)
d.ellipse((-w * .1, -h * .2, w * 1.1, h * .98), fill=255)
m = m.filter(ImageFilter.GaussianBlur(w * .09))
out = Image.composite(im, Image.new('RGB', (w, h), (6, 6, 7)), m)
out.save(sys.argv[2], quality=84, optimize=True, progressive=True)
PY
ls -la public/img/kurumsal-boya/kontrol-3d.jpg
