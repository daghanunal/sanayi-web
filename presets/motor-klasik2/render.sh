#!/bin/sh
# motor-klasik2 hero stills (Cycles, lib3d engine): deck row / column behind the gasket + bore close-up.
#   sh presets/motor-klasik2/render.sh        (~3 min on an M4 Max)
set -e
cd "$(dirname "$0")/../.."
B="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
T="${TMPDIR:-/tmp}/mk2-render"; mkdir -p "$T"
OUT=public/img/motor-klasik2
for s in deck-h deck-v; do
  "$B" -b --factory-startup --python presets/motor-klasik2/render_cycles.py -- --shot $s --key 8 --spp 256 --out "$T/$s.png" >/dev/null
  cwebp -quiet -q 80 "$T/$s.png" -o "$OUT/cycles-$s.webp"
done
"$B" -b --factory-startup --python presets/motor-klasik2/render_cycles.py -- --shot bore --theta -1.3 --spp 256 --out "$T/bore.png" >/dev/null
cwebp -quiet -q 78 -resize 1400 1400 "$T/bore.png" -o "$OUT/cycles-bore.webp"
# bore centres / radius (px) of the deck stills for main.js
node -e "const f=require('fs');const r=(n)=>JSON.parse(f.readFileSync('$T/'+n+'.json'));f.writeFileSync('presets/motor-klasik2/render.json',JSON.stringify({h:r('deck-h'),v:r('deck-v')},null,1)+'\n')"
ls -la $OUT/cycles-*.webp
