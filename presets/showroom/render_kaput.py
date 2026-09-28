"""showroom: Cycles still for the red-bonnet before/after pair (kaput.jpg; kaput-once.jpg is made from it in
render.sh). The lib3d hatchback in deep red with a glassy clearcoat, camera low in front of the car looking back
along the bonnet; a warm sunlit wall with windows behind the car reflects in the paint. Generic asset, no badge.

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      --python presets/showroom/render_kaput.py -- --out /tmp/sr/kaput.png [--spp 256] [--res 975x1400]
"""

import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "assets3d"))

import bmesh  # noqa: E402
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import common as C  # noqa: E402

a = C.args()
out = a.get("out", "/tmp/sr/kaput.png")
spp = int(a.get("spp", "256"))
os.makedirs(os.path.dirname(out), exist_ok=True)
LIB = os.path.join(ROOT, "public", "lib3d")
man = json.load(open(os.path.join(LIB, "manifest.json")))

C.reset()
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.join(LIB, man["assets"][a.get("asset", "car")]["hi"]["file"]))

paint = bpy.data.materials.get("paint")
P = next(n for n in paint.node_tree.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled")
for ln in list(paint.node_tree.links):
    if ln.to_socket == P.inputs["Base Color"]:
        paint.node_tree.links.remove(ln)
P.inputs["Base Color"].default_value = (*C.srgb(a.get("paint", "#8a0a10")), 1)
P.inputs["Metallic"].default_value = float(a.get("metal", "0.25"))
P.inputs["Roughness"].default_value = float(a.get("rough", "0.28"))
P.inputs["Coat Weight"].default_value = 1.0
P.inputs["Coat Roughness"].default_value = float(a.get("coat", "0.015"))


def emit_mat(name, color, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color, 1)
    em.inputs["Strength"].default_value = strength
    mo = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(em.outputs[0], mo.inputs[0])
    return m


# Sunlit wall behind the car (reflects in the bonnet), a grid of dark windows on it.
wall_m = emit_mat("wall", C.srgb(a.get("wall", "#f2b377")), float(a.get("wallE", "2.2")))
# plaster: a soft noise between two warm tones, so the reflection is not a flat colour field
_nt = wall_m.node_tree
_em = next(n for n in _nt.nodes if n.bl_idname == "ShaderNodeEmission")
_no = _nt.nodes.new("ShaderNodeTexNoise")
_no.inputs["Scale"].default_value = float(a.get("nscale", "0.6"))
_no.inputs["Detail"].default_value = 4
_cr = _nt.nodes.new("ShaderNodeValToRGB")
_cr.color_ramp.elements[0].color = (*C.srgb(a.get("wall2", "#b8683a")), 1)
_cr.color_ramp.elements[1].color = (*C.srgb(a.get("wall", "#f2b377")), 1)
_nt.links.new(_no.outputs["Fac"], _cr.inputs["Fac"])
_nt.links.new(_cr.outputs["Color"], _em.inputs["Color"])
win_m = emit_mat("win", C.srgb("#2a1410"), 1.0)
WX = float(a.get("wx", "-7"))
bm = bmesh.new()
C.box((0.2, float(a.get("wallw", "30")), 14), bm=bm)
w = C.obj("_wall", bm, wall_m, smooth=False)
w.location = (WX, float(a.get("wally", "0")), 5)
w.visible_camera = False
cols = [float(v) for v in a.get("wcols", "-5.5,-2.5,0.5,3.5,6.5").split(",")]
rows = [float(v) for v in a.get("wrows", "3.2,5.8,8.4").split(",")]
for y in cols:
    for z in rows:
        bm = bmesh.new()
        C.box((0.1, 1.5, 1.2), bm=bm)
        o = C.obj("_win", bm, win_m, smooth=False)
        o.location = (WX + 0.15, y, z)
        o.visible_camera = False

# Ground: dark asphalt, a little gloss.
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=40)
C.obj("_floor", bm, C.material("_floor_m", C.srgb("#141214"), 0.6), smooth=False)

# Warm low sun from behind the wall side, soft fill from camera side.
sun = bpy.data.lights.new("sun", "SUN")
sun.energy = float(a.get("sun", "2.5"))
sun.color = (1.0, 0.78, 0.55)
sun.angle = math.radians(3)
so = bpy.data.objects.new("sun", sun)
so.rotation_euler = (math.radians(70), 0, math.radians(float(a.get("sunaz", "-60"))))
sc.collection.objects.link(so)

C.cycles(spp)
sc.cycles.use_denoising = True
wd = bpy.data.worlds.new("w")
sc.world = wd
wd.use_nodes = True
wn = wd.node_tree
bg = wn.nodes["Background"]
env = wn.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(LIB, "env", a.get("env", "dusk") + "-1k-v1.hdr"))
wn.links.new(env.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = float(a.get("envE", "0.8"))

sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Medium High Contrast"
sc.view_settings.exposure = float(a.get("exp", "0"))

cd = bpy.data.cameras.new("cam")
cd.sensor_width = 36
cd.lens = float(a.get("lens", "70"))
co = bpy.data.objects.new("cam", cd)
sc.collection.objects.link(co)
sc.camera = co
co.location = (float(a.get("camx", "3.2")), float(a.get("camy", "-0.55")), float(a.get("camz", "1.18")))
tgt = Vector((float(a.get("tx", "1.0")), float(a.get("ty", "0.05")), float(a.get("tz", "0.88"))))
co.rotation_euler = (tgt - co.location).to_track_quat("-Z", "Y").to_euler()
cd.dof.use_dof = True
fx = Vector((float(a.get("fx", "1.55")), float(a.get("fy", "-0.1")), float(a.get("fz", "0.9"))))
cd.dof.focus_distance = (fx - co.location).length
cd.dof.aperture_fstop = float(a.get("f", "2.8"))
rx, ry = map(int, a.get("res", "975x1400").split("x"))
sc.render.resolution_x, sc.render.resolution_y = rx, ry
sc.render.resolution_percentage = int(a.get("pct", "100"))
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print("done", out)
