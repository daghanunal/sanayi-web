#!/bin/sh
# pist hero wheel (Cycles, lib3d wheel): face-on layers for the rolling wheel + a 3/4 beauty still.
#   sh presets/pist/render.sh          (~2 min on an M4 Max)
# Needs Blender 5.2 (BLENDER=…), cwebp, python3 + Pillow (motion-blur layers).
set -e
cd "$(dirname "$0")/../.."
B="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
T="${TMPDIR:-/tmp}/pist-render"; mkdir -p "$T"
OUT=public/img/pist
L="--key 3 --rake 7 --fill 0.3 --world 0.01 --rubber 0.45 --spp 256 --res 1400"
for p in back caliper front; do
  "$B" -b --factory-startup --python presets/pist/render_cycles.py -- --pass $p $L --out "$T/$p.png" >/dev/null
done
"$B" -b --factory-startup --python presets/pist/render_cycles.py -- --pass beauty --spp 256 --yaw -38 --glow 3 --rim 35 --floor_rough 0.42 --cz 0.55 --out "$T/beauty.png" >/dev/null
# spinning layers: sharp + rotational motion blur (crossfaded by scroll speed on the page)
python3 presets/pist/spinblur.py "$T/back.png" "$T/front.png" "$T"
for f in back front back-blur front-blur caliper; do
  cwebp -quiet -q 82 -alpha_q 90 -resize 1100 1100 "$T/$f.png" -o "$OUT/r-wheel-$f.webp"
done
cwebp -quiet -q 80 -resize 1600 0 "$T/beauty.png" -o "$OUT/r-wheel-beauty.webp"
cp "$T/front.json" presets/pist/render.json
ls -la $OUT/r-wheel-*.webp
