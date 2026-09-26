#!/usr/bin/env bash
# raw Blender GLB -> web GLB: WebP textures (EXT_texture_webp) + meshopt geometry
# (EXT_meshopt_compression + KHR_mesh_quantization). Node names, extras and materials are kept
# (no flatten/join/palette: sites look nodes up by name and animate them).
# usage: compress.sh <in.glb> <out.glb> [normal-quality=90] [colour-quality=85] [max-texture-size] [simplify-ratio]
# (simplify: meshoptimizer simplification, error-bounded at 0.1 % of the mesh size; only used where a lo LOD
#  must lose a little more geometry to meet the 350 KB budget)
set -euo pipefail
IN="$1"; OUT="$2"; QN="${3:-90}"; QC="${4:-85}"; MAX="${5:-}"; SIMP="${6:-}"
GT="npx -y @gltf-transform/cli@4.5.0"
T0="$(mktemp -t l3d).glb"; T1="$(mktemp -t l3d).glb"; T2="$(mktemp -t l3d).glb"
cp "$IN" "$T0"
if [ -n "$MAX" ]; then $GT resize "$T0" "$T0" --width "$MAX" --height "$MAX" >/dev/null; fi
$GT prune "$T0" "$T0" --keep-leaves true --keep-attributes false >/dev/null
if [ -n "$SIMP" ]; then $GT simplify "$T0" "$T0" --ratio "$SIMP" --error 0.001 >/dev/null; fi
$GT webp "$T0" "$T1" --slots "*ormal*" --quality "$QN" --effort 100 >/dev/null
$GT webp "$T1" "$T2" --formats png --quality "$QC" --effort 100 >/dev/null
$GT meshopt "$T2" "$OUT" --level high >/dev/null
rm -f "$T0" "$T1" "$T2"
ls -l "$OUT" | awk '{print $5, $9}'
