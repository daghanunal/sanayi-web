#!/bin/sh
# tork final-section stills (Cycles, lib3d car + garage): desktop + phone crops.
#   sh presets/tork/render.sh
set -e
cd "$(dirname "$0")/../.."
B="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
T="${TMPDIR:-/tmp}/tork-render"; mkdir -p "$T"
for s in wide tall; do
  "$B" -b --factory-startup --python presets/tork/render_cycles.py -- --shot $s --spp 256 --out "$T/$s.png" >/dev/null
  cwebp -quiet -q 76 "$T/$s.png" -o "public/img/tork/lift-$s.webp"
done
ls -la public/img/tork/lift-*.webp
