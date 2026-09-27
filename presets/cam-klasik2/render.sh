#!/bin/sh
# cam-klasik2 hero layers (Cycles, lib3d windshield + a modelled suction lifter), square-on, transparent:
#   sh presets/cam-klasik2/render.sh        (~1 min on an M4 Max; uses assets3d/lock.sh)
set -e
cd "$(dirname "$0")/../.."
B="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
T="${TMPDIR:-/tmp}/ck2-render"; mkdir -p "$T"
assets3d/lock.sh "$B" -b --factory-startup --python presets/cam-klasik2/render_cycles.py -- --out "$T" --spp 128 --res 1280x790 >/dev/null
python3 - "$T" public/img/cam-klasik2 <<'PY'
import sys, os
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for n in ('dis', 'frit', 'vantuz', 'mask'):
    im = Image.open(os.path.join(src, n + '.png')).convert('RGBA')
    if n == 'mask':  # alpha only matters
        a = im.split()[3]
        im = Image.merge('RGBA', (a, a, a, a))
    if n == 'vantuz':  # crop to the lifter, keep its offset in the name-free layout via CSS
        pass
    im.save(os.path.join(dst, n + '.webp'), 'WEBP', quality=82 if n != 'mask' else 70, method=6)
    print(n, os.path.getsize(os.path.join(dst, n + '.webp')))
PY
