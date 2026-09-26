"""Cycles reference still of a PUBLISHED asset (public/lib3d/*.glb), framed exactly like the three.js
preview page (same fov 35, bbox fit, az/el/dist), lit only by the same HDRI, on a shadow catcher.
Compare it with the preview screenshot to judge the realtime look against a path tracer.

  Blender -b --factory-startup --python assets3d/render_cycles.py -- --asset car --q hi --env workshop \
      --az 35 --el 14 --dist 1 --explode 0 --spp 128 --out assets3d/shots/car-cycles.png
"""

import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy
from mathutils import Vector

import common as C

a = C.args()
ROOT = os.path.join(C.HERE, "..", "public", "lib3d")
man = json.load(open(os.path.join(ROOT, "manifest.json")))
name = a.get("asset", "car")
q = a.get("q", "hi")
env = a.get("env", "workshop")
out = a.get("out", os.path.join(C.HERE, "shots", f"{name}-cycles.png"))
os.makedirs(os.path.dirname(out), exist_ok=True)
C.reset()
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, man["assets"][name][q]["file"]))
objs = list(sc.objects)
# exploded view from extras.explode (three space metres -> Blender (x, -z, y)), applied in world space
t = float(a.get("explode", "0"))
if t:
    for o in objs:
        v = o.get("explode")
        if v is not None and len(v) == 3:
            o.matrix_world.translation += Vector((v[0], -v[2], v[1])) * t
bpy.context.view_layer.update()
lo = Vector((1e9,) * 3)
hi = Vector((-1e9,) * 3)
for o in objs:
    if o.type == "MESH":
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
# ground at bbox bottom, centred (as the preview does)
off = Vector((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z))
for o in objs:
    if o.parent is None:
        o.location += off
lo += off
hi += off
size = hi - lo
fit = max(size) * 0.5
fov = 35
az, el = math.radians(float(a.get("az", "35"))), math.radians(float(a.get("el", "14")))
d = fit / math.tan(math.radians(fov / 2)) * 1.25 * float(a.get("dist", "1"))
tgt = Vector((0, 0, size.z * 0.45))
# three camera (sin az, ., cos az) in three space -> Blender (x, -z, y)
cam3 = (d * math.cos(el) * math.sin(az), d * math.sin(el), d * math.cos(el) * math.cos(az))
cam = tgt + Vector((cam3[0], -cam3[2], cam3[1]))
if not a.get("noground") and name not in ("garage", "studio"):
    bpy.ops.mesh.primitive_plane_add(size=fit * 24)
    g = bpy.context.object
    g.is_shadow_catcher = True
sc.render.film_transparent = False
C.look(out, target=tgt, cam=cam, fov=fov, hdr=os.path.join(ROOT, "env", f"{env}-1k-v1.hdr"), ground=False,
       spp=int(a.get("spp", "128")), res=(1440, 900), rot=math.radians(-90), strength=float(a.get("strength", "1")))
