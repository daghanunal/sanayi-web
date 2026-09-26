#!/usr/bin/env bash
# Rebuild the whole lib3d asset library from scratch (assets3d/README.md):
# Poly Haven CC0 HDRIs -> Blender 5.2 headless builds (hi + lo) -> gltf-transform (WebP + meshopt)
# -> public/lib3d/manifest.json + CREDITS.txt with measured sizes (budgets asserted).
#   assets3d/build_all.sh                 (from the repo root)
#   BLENDER=/path/to/Blender LIB3D_BUILD=/tmp/x assets3d/build_all.sh
#   ONLY="car wheel" assets3d/build_all.sh        (rebuild a subset; the manifest is always refreshed)
# A re-cut asset gets a new -vN (assets3d/versions.json) so CDN / browser caches never serve a stale GLB.
set -euo pipefail
cd "$(dirname "$0")/.."
B="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
OUT=public/lib3d
BUILD="${LIB3D_BUILD:-/tmp/lib3d-build}"; export LIB3D_BUILD="$BUILD"
D=assets3d
mkdir -p "$OUT/env" "$BUILD/stats"
ver() { python3 -c "import json,sys;print(json.load(open('$D/versions.json')).get(sys.argv[1],1))" "$1"; }
want() { [ -z "${ONLY:-}" ] || [[ " $ONLY " == *" $1 "* ]]; }
run() { "$B" -b --factory-startup --python "$D/$1" -- "${@:2}" 2>&1 | grep -E " tris |HDRI|Error|Traceback" || true; }

want env && run fetch_env.py --out "$OUT/env"
# name  script  (hi quality args) ; lo is built with --q lo and compressed with 256 px textures
ASSETS="wheel:build_wheel.py car:build_car.py engine:build_engine.py seat:build_seat.py truck:build_truck.py
turbo:build_turbo.py exhaust:build_exhaust.py ac_compressor:build_ac_compressor.py garage:build_garage.py
studio:build_studio.py windshield:build_windshield.py battery:build_battery.py lock:build_lock.py"
for e in $ASSETS; do
  n="${e%%:*}"; s="${e##*:}"
  [ -f "$D/$s" ] || continue
  want "$n" || continue
  v="$(ver "$n")"
  for q in hi lo; do
    run "$s" --q "$q" --out "$BUILD/$n-$q.raw.glb"
  done
  # WebP qualities (normal colour [max px]) per asset; seat hi only fits 1.2 MB with normals at q78
  case "$n" in
    seat) QH="78 85"; QL="78 80 256" ;;
    battery|lock) QH="85 85"; QL="80 80 256" ;;
    garage|studio) QH="88 82"; QL="80 75 256" ;;
    engine) QH="90 85"; QL="80 75 256 0.85" ;;
    *) QH="90 85"; QL="85 80 256" ;;
  esac
  "$D/compress.sh" "$BUILD/$n-hi.raw.glb" "$OUT/$n-hi-v$v.glb" $QH
  "$D/compress.sh" "$BUILD/$n-lo.raw.glb" "$OUT/$n-lo-v$v.glb" $QL
done
python3 "$D/build_manifest.py" "$OUT"
