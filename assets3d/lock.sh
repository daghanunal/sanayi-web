#!/usr/bin/env bash
# Run one heavy job at a time across parallel asset builders (Blender builds / Cycles stills / preview shots):
#   assets3d/lock.sh Blender -b --factory-startup --python assets3d/build_x.py -- --q hi
# A mkdir mutex at $LIB3D_LOCK (default /tmp/lib3d-heavy.lock); a stale lock (holder pid gone) is taken over.
L="${LIB3D_LOCK:-/tmp/lib3d-heavy.lock}"
while ! mkdir "$L" 2>/dev/null; do
  p="$(cat "$L/pid" 2>/dev/null)"
  if [ -n "$p" ] && ! kill -0 "$p" 2>/dev/null; then rm -rf "$L"; continue; fi
  sleep 2
done
echo $$ > "$L/pid"
trap 'rm -rf "$L"' EXIT INT TERM
"$@"
