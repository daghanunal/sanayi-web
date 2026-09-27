#!/bin/sh
# kurumsal-cam kasko module: Cycles top view of the lib3d sedan + one alpha mask per glass group.
#   sh presets/kurumsal-cam/render.sh        (~1 min on an M4 Max; uses assets3d/lock.sh)
set -e
cd "$(dirname "$0")/../.."
B="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
T="${TMPDIR:-/tmp}/kc-render"; mkdir -p "$T"
assets3d/lock.sh "$B" -b --factory-startup --python presets/kurumsal-cam/render_cycles.py -- --out "$T" --spp 160 --res 520x1120 >/dev/null
python3 - "$T" public/img/kurumsal-cam <<'PY'
import sys, os
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for n in ('arac', 'm-on', 'm-yan', 'm-arka', 'm-tavan'):
    im = Image.open(os.path.join(src, n + '.png')).convert('RGBA')
    if n.startswith('m-'):
        a = im.split()[3]
        im = Image.merge('RGBA', (a, a, a, a))
    im.save(os.path.join(dst, n + '.webp'), 'WEBP', quality=84 if n == 'arac' else 70, method=6)
    print(n, os.path.getsize(os.path.join(dst, n + '.webp')))
PY
