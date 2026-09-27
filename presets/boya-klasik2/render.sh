#!/bin/sh
# boya-klasik2 stills (Cycles, lib3d car in a paint booth): four layers (desktop + phone framing) and the colour picker.
#   nice -n 10 sh presets/boya-klasik2/render.sh  (~8 min on an idle M4 Max)
#   FORCE=1 sh presets/boya-klasik2/render.sh     re-render everything (default: skip stills that exist)
#   ONLY=renk sh presets/boya-klasik2/render.sh   just the colours
set -e
cd "$(dirname "$0")/../.."
B="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
T="${TMPDIR:-/tmp}/bk2-render"; mkdir -p "$T"
OUT=public/img/boya-klasik2
PY=presets/boya-klasik2/render_cycles.py
SPP="${SPP:-128}"
todo() { [ -n "${FORCE:-}" ] || [ ! -f "$1" ]; }
# desktop: photo pane on the right half (1200x1560); phone: full screen, car in the top half (1:2)
D="--res 1200x1560 --cam -6.0,3.5,1.0 --tgt -0.15,0,0.62 --lens 32 --shift 0.04"
P="--res 1000x2000 --cam -6.9,3.9,1.2 --tgt -0.25,0,0.6 --lens 24 --shift -0.2"
if [ "${ONLY:-}" != "renk" ]; then
  for l in sac astar boya vernik; do
    if todo "$OUT/r-kat-$l-d.webp"; then
      "$B" -b --factory-startup --python $PY -- --layer $l --spp $SPP --fstop 4 $D --out "$T/kat-$l-d.png" >/dev/null
      cwebp -quiet -q 80 "$T/kat-$l-d.png" -o "$OUT/r-kat-$l-d.webp"
    fi
    if todo "$OUT/r-kat-$l-m.webp"; then
      "$B" -b --factory-startup --python $PY -- --layer $l --spp $SPP --fstop 4 $P --out "$T/kat-$l-m.png" >/dev/null
      cwebp -quiet -q 78 -resize 780 1560 "$T/kat-$l-m.png" -o "$OUT/r-kat-$l-m.webp"
    fi
  done
fi
# colour picker: right rear three-quarter, clear coat, one render per colour
R="--res 1200x1500 --cam -5.3,-3.8,1.05 --tgt -0.3,0,0.62 --lens 34 --fstop 4"
for c in turuncu:ff4d1a kirmizi:c8161d mavi:1f3fbf yesil:1c7a48 sari:f2c21b siyah:111214 beyaz:eeeeea; do
  n=${c%%:*}; h=${c#*:}
  if todo "$OUT/r-renk-$n.webp"; then
    "$B" -b --factory-startup --python $PY -- --layer vernik --color "#$h" --spp $SPP $R --out "$T/renk-$n.png" >/dev/null
    cwebp -quiet -q 80 -resize 960 1200 "$T/renk-$n.png" -o "$OUT/r-renk-$n.webp"
  fi
done
rm -f "$T"/*.png
ls -la $OUT/r-*.webp
