#!/bin/sh
# kurumsal-lastik "Tekerde neye bakıyoruz" still (Cycles, lib3d wheel, exploded): transparent WebP.
#   sh presets/kurumsal-lastik/render.sh        (CPU=1 to render on the CPU when the GPU is busy)
set -e
cd "$(dirname "$0")/../.."
B="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
T="${TMPDIR:-/tmp}/kl-render"; mkdir -p "$T"
X=""; [ -n "$CPU" ] && X="--cpu 1"
"$B" -b --factory-startup --python presets/kurumsal-lastik/render_cycles.py -- $X --spp 160 --w 1400 --h 1000 --out "$T/patlat.png" >/dev/null
# trim the empty studio around the parts (4 % margin) before encoding
python3 - "$T/patlat.png" "$T/patlat-crop.png" <<'PY'
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGBA")
x0, y0, x1, y1 = im.getchannel("A").point(lambda v: 255 if v > 12 else 0).getbbox()
m = int(0.04 * im.width)
im.crop((max(0, x0 - m), max(0, y0 - m), min(im.width, x1 + m), min(im.height, y1 + m))).save(sys.argv[2])
PY
cwebp -quiet -q 80 -alpha_q 90 -resize 1200 0 "$T/patlat-crop.png" -o public/img/kurumsal-lastik/teker-3d.webp
python3 -c "from PIL import Image; print(Image.open('public/img/kurumsal-lastik/teker-3d.webp').size)"
ls -la public/img/kurumsal-lastik/teker-3d.webp
