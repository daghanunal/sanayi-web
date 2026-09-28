"""kurumsal-lastik: exploded 3/4 Cycles still of the lib3d wheel (tyre, rim, lugs, cap, disc, caliper pulled apart
along the axle) for the "Tekerde neye bakıyoruz" module. Transparent film, petrol studio light; generic wheel, no
brand; the page labels it "Temsilî 3D çizim".

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      --python presets/kurumsal-lastik/render_cycles.py -- --out /tmp/kl/patlat.png [--cpu 1]
See render.sh.
"""

import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "assets3d"))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import common as C  # noqa: E402

a = C.args()
out = a.get("out", "/tmp/kl/patlat.png")
spp = int(a.get("spp", "256"))
os.makedirs(os.path.dirname(out), exist_ok=True)
LIB = os.path.join(ROOT, "public", "lib3d")
man = json.load(open(os.path.join(LIB, "manifest.json")))

C.reset()
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.join(LIB, man["assets"]["wheel"]["hi"]["file"]))
objs = list(sc.objects)
t = float(a.get("explode", "1"))
for o in objs:   # extras.explode: three-space metres -> Blender (x, -z, y), world space
    v = o.get("explode")
    if v is not None and len(v) == 3:
        o.matrix_world.translation += Vector((v[0], -v[2], v[1])) * t
bpy.context.view_layer.update()


def principled(m):
    return next((n for n in m.node_tree.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled"), None) if m and m.node_tree else None


# satin graphite rim paint, the machined face stays bright
rp = principled(bpy.data.materials.get("rim_paint"))
if rp:
    for ln in list(bpy.data.materials["rim_paint"].node_tree.links):
        if ln.to_socket == rp.inputs["Base Color"]:
            bpy.data.materials["rim_paint"].node_tree.links.remove(ln)
    rp.inputs["Base Color"].default_value = (*C.srgb(a.get("rim", "#2b3336")), 1)
    rp.inputs["Metallic"].default_value = 0.6
    rp.inputs["Roughness"].default_value = 0.38

# rubber: near-black satin; machined face: brushed, not mirror
for nm, rough in (("tyre_side", 0.62), ("tyre_tread", 0.7)):
    pm = principled(bpy.data.materials.get(nm))
    if pm:
        pm.inputs["Roughness"].default_value = rough
        mt = bpy.data.materials[nm].node_tree
        mix = mt.nodes.new("ShaderNodeMixRGB")
        mix.blend_type = "MULTIPLY"
        mix.inputs[0].default_value = 1.0
        mix.inputs[2].default_value = (0.42, 0.42, 0.44, 1)
        src = next((ln.from_socket for ln in mt.links if ln.to_socket == pm.inputs["Base Color"]), None)
        if src:
            mt.links.new(src, mix.inputs[1])
        else:
            mix.inputs[1].default_value = pm.inputs["Base Color"].default_value
        mt.links.new(mix.outputs[0], pm.inputs["Base Color"])
cp = principled(bpy.data.materials.get("caliper_paint"))
if cp:
    mt = bpy.data.materials["caliper_paint"].node_tree
    for ln in list(mt.links):
        if ln.to_socket == cp.inputs["Base Color"]:
            mt.links.remove(ln)
    cp.inputs["Base Color"].default_value = (*C.srgb(a.get("caliper", "#0b5258")), 1)
    cp.inputs["Roughness"].default_value = 0.42
rf = principled(bpy.data.materials.get("rim_face"))
if rf:
    rf.inputs["Roughness"].default_value = float(a.get("face", "0.3"))

C.cycles(spp)
if a.get("cpu"):
    sc.cycles.device = "CPU"   # when the GPU queue is busy with other renders
sc.cycles.use_denoising = True
sc.render.film_transparent = True
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Medium High Contrast"
sc.view_settings.exposure = float(a.get("exp", "-0.3"))
w = bpy.data.worlds.new("w")
sc.world = w
w.use_nodes = True
env = w.node_tree.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(LIB, "env", "studio-1k-v1.hdr"))
w.node_tree.links.new(env.outputs["Color"], w.node_tree.nodes["Background"].inputs["Color"])
w.node_tree.nodes["Background"].inputs["Strength"].default_value = float(a.get("env", "0.7"))


def area(loc, target, size, energy, color=(1, 1, 1)):
    ld = bpy.data.lights.new("L", "AREA")
    ld.size = size
    ld.energy = energy
    ld.color = color
    lo = bpy.data.objects.new("L", ld)
    lo.location = loc
    lo.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.collection.objects.link(lo)


# bbox of the exploded assembly -> frame it
lo = Vector((1e9,) * 3)
hi = Vector((-1e9,) * 3)
for o in objs:
    if o.type == "MESH" and not o.hide_render:
        for c in o.bound_box:
            w_ = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w_))
            hi = Vector(map(max, hi, w_))
ctr = (lo + hi) / 2
# key high front-left, petrol-tinted kicker from the right, cool rim from behind
area(ctr + Vector((-1.6, -2.0, 1.8)), ctr, 1.8, float(a.get("key", "240")), (1.0, 0.97, 0.93))
area(ctr + Vector((2.2, -0.6, 0.2)), ctr, 1.4, 80, (0.45, 0.85, 0.85))
area(ctr + Vector((0.6, 2.4, 1.4)), ctr, 1.6, 180, (0.8, 0.9, 1.0))

cd = bpy.data.cameras.new("cam")
cd.sensor_width = 36
cd.lens = float(a.get("lens", "50"))
co = bpy.data.objects.new("cam", cd)
sc.collection.objects.link(co)
sc.camera = co
az, el = math.radians(float(a.get("az", "-58"))), math.radians(float(a.get("el", "12")))
dist = float(a.get("dist", "2.15"))
# az measured from the wheel face (-Y) towards +X
co.location = ctr + Vector((math.sin(az) * math.cos(el) * dist, -math.cos(az) * math.cos(el) * dist, math.sin(el) * dist))
co.rotation_euler = (ctr - co.location).to_track_quat("-Z", "Y").to_euler()
sc.render.resolution_x = int(a.get("w", "1400"))
sc.render.resolution_y = int(a.get("h", "1000"))
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = "PNG"
sc.render.image_settings.color_mode = "RGBA"
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print("done", out)
