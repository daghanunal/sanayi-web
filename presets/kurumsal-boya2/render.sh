#!/bin/sh
# kurumsal-boya2 "Boya ölçümü" page band (Cycles, lib3d car): pearl-white car on cobalt, panels in the ekspertiz
# colour code (rear doors macun pink, hood painted phosphor green).  sh presets/kurumsal-boya2/render.sh
set -e
cd "$(dirname "$0")/../.."
B="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
T="${TMPDIR:-/tmp}/kb2-render"; mkdir -p "$T"
"$B" -b --factory-startup --python presets/kurumsal-boya2/render_cycles.py -- --out "$T/panel.png" --spp 160 --res 2100x900 >/dev/null
# 21:7 band (the kurumsal page-header ratio), JPEG
python3 - "$T/panel.png" public/img/kurumsal-boya2/panel-3d.jpg <<'PY'
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB'); w, h = im.size
top = int(h * .12)
im.crop((0, top, w, top + w // 3)).save(sys.argv[2], quality=82, optimize=True, progressive=True)
PY
ls -la public/img/kurumsal-boya2/panel-3d.jpg
