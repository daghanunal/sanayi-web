"""kurumsal-boya: Cycles still for the "son kontrol" section — the lib3d hatchback in champagne metallic
under two long daylight inspection tubes in a black studio, the tubes' reflections running along the body
lines (that is how a paint shop checks orange peel and colour match before handing a car back).
Generic asset, no brand; shown on the page as "Temsilî 3D çizim", never as the shop's own photo.

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      --python presets/kurumsal-boya/render_cycles.py -- --out /tmp/kb/kontrol.png [--spp 256] [--res 1600x1200]
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
out = a.get("out", "/tmp/kb/kontrol.png")
spp = int(a.get("spp", "256"))
os.makedirs(os.path.dirname(out), exist_ok=True)
LIB = os.path.join(ROOT, "public", "lib3d")
man = json.load(open(os.path.join(LIB, "manifest.json")))

C.reset()
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.join(LIB, man["assets"]["car"]["hi"]["file"]))
car = {o.name: o for o in sc.objects}

# champagne metallic with a glassy clearcoat
paint = bpy.data.materials.get("paint")
P = next(n for n in paint.node_tree.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled")
for ln in list(paint.node_tree.links):
    if ln.to_socket == P.inputs["Base Color"]:
        paint.node_tree.links.remove(ln)
P.inputs["Base Color"].default_value = (*C.srgb(a.get("paint", "#c9b48c")), 1)
P.inputs["Metallic"].default_value = float(a.get("metal", "0.85"))
P.inputs["Roughness"].default_value = float(a.get("rough", "0.24"))
P.inputs["Coat Weight"].default_value = 1.0
P.inputs["Coat Roughness"].default_value = 0.03
# lamps on low: DRL reads as "car", not "toy"
for nm, s in (("light_head", 3.0), ("light_tail", 1.2)):
    m = bpy.data.materials.get(nm)
    if m and m.node_tree:
        Q = next((n for n in m.node_tree.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled"), None)
        if Q:
            Q.inputs["Emission Strength"].default_value = s
# front wheels steered a touch towards camera
for k in ("steer_FL", "steer_FR"):
    if k in car:
        car[k].rotation_mode = "XYZ"
        car[k].rotation_euler.rotate_axis("Y", math.radians(float(a.get("steer", "-14"))))

# floor: black, semi-gloss (a soft reflection, not a mirror)
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=30)
floor = C.obj("_floor", bm, C.material("_floor_m", C.srgb("#060607"), float(a.get("froughness", "0.42"))), smooth=False)

# daylight inspection tubes: long, thin, visible, 5600 K-ish white
tube_m = bpy.data.materials.new("tube")
tube_m.use_nodes = True
nt = tube_m.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
em = nt.nodes.new("ShaderNodeEmission")
em.inputs["Color"].default_value = (1.0, 0.97, 0.92, 1)
em.inputs["Strength"].default_value = float(a.get("tubes", "38"))
mo = nt.nodes.new("ShaderNodeOutputMaterial")
nt.links.new(em.outputs[0], mo.inputs[0])
H = float(a.get("th", "2.35"))
for y in [float(v) for v in a.get("ty_list", "-1.1,0,1.1").split(",")]:
    bm = bmesh.new()
    C.box((float(a.get("tl", "9")), float(a.get("tw", "0.16")), 0.03), bm=bm)
    t = C.obj("_tube", bm, tube_m, smooth=False)
    t.location = (0.1, y, H)
    t.visible_shadow = False
# one low side bar on the camera side: its streak runs along the doors like an inspection tunnel
if a.get("side", "1") == "1":
    bm = bmesh.new()
    C.box((float(a.get("sl", "5")), 0.03, 0.12), bm=bm)
    t = C.obj("_side", bm, tube_m, smooth=False)
    t.location = (float(a.get("sx", "-1.5")), float(a.get("sy", "-2.9")), float(a.get("sz", "1.3")))
    t.visible_shadow = False
    t.visible_camera = a.get("sidecam", "0") == "1"

# warm rim from behind-left (champagne edge), cool low fill from camera side
def area(loc, target, size, energy, color):
    ld = bpy.data.lights.new("L", "AREA")
    ld.size = size
    ld.energy = energy
    ld.color = color
    lo = bpy.data.objects.new("L", ld)
    lo.location = loc
    lo.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    lo.visible_camera = False
    sc.collection.objects.link(lo)


area((-4.2, 2.6, 1.6), (0, 0, 0.7), 2.6, float(a.get("rim", "520")), (1.0, 0.82, 0.58))
area((3.6, -3.4, 0.8), (0, 0, 0.6), 3.0, float(a.get("fill", "90")), (0.86, 0.9, 1.0))

# world: studio HDRI only in reflections, camera sees near-black
C.cycles(spp)
sc.cycles.use_denoising = True
w = bpy.data.worlds.new("w")
sc.world = w
w.use_nodes = True
wn = w.node_tree
bg = wn.nodes["Background"]
env = wn.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(LIB, "env", "studio-1k-v1.hdr"))
wn.links.new(env.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = float(a.get("env", "0.18"))
dark = wn.nodes.new("ShaderNodeBackground")
dark.inputs["Color"].default_value = (*C.srgb("#070708"), 1)
lp = wn.nodes.new("ShaderNodeLightPath")
mix = wn.nodes.new("ShaderNodeMixShader")
wn.links.new(lp.outputs["Is Camera Ray"], mix.inputs[0])
wn.links.new(bg.outputs[0], mix.inputs[1])
wn.links.new(dark.outputs[0], mix.inputs[2])
wn.links.new(mix.outputs[0], wn.nodes["World Output"].inputs["Surface"])

sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Medium High Contrast"
sc.view_settings.exposure = float(a.get("exp", "0"))

cd = bpy.data.cameras.new("cam")
cd.sensor_width = 36
cd.lens = float(a.get("lens", "50"))
co = bpy.data.objects.new("cam", cd)
sc.collection.objects.link(co)
sc.camera = co
co.location = (float(a.get("camx", "5.9")), float(a.get("camy", "-4.4")), float(a.get("camz", "1.5")))
tgt = Vector((float(a.get("tx", "0.25")), float(a.get("ty", "0.0")), float(a.get("tz", "0.62"))))
co.rotation_euler = (tgt - co.location).to_track_quat("-Z", "Y").to_euler()
cd.dof.use_dof = True
cd.dof.focus_distance = (Vector((1.6, -0.9, 0.7)) - co.location).length
cd.dof.aperture_fstop = float(a.get("f", "4"))
rx, ry = map(int, a.get("res", "1600x1200").split("x"))
sc.render.resolution_x, sc.render.resolution_y = rx, ry
sc.render.resolution_percentage = int(a.get("pct", "100"))
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print("done", out)
