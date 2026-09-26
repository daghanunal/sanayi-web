"""tork: Cycles still for the final section ("Getirin, bir ölçelim."): the lib3d hatchback raised on
the two-post lift of the lib3d garage bay, shot low from the open side. Product/scene visual only
(generic asset, no brand), not presented as the shop's own photo.

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      --python presets/tork/render_cycles.py -- --shot wide --out /tmp/tork/wide.png
  shots: wide (1920x1080, desktop) | tall (1080x1700, phone). See render.sh.
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
shot = a.get("shot", "wide")
out = a.get("out", f"/tmp/tork/{shot}.png")
spp = int(a.get("spp", "256"))
os.makedirs(os.path.dirname(out), exist_ok=True)
LIB = os.path.join(ROOT, "public", "lib3d")
man = json.load(open(os.path.join(LIB, "manifest.json")))

C.reset()
sc = bpy.context.scene


def load(name):
    before = set(sc.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(LIB, man["assets"][name]["hi"]["file"]))
    new = [o for o in sc.objects if o not in before]
    return {o.name: o for o in new}


garage = load("garage")
car = load("car")
LIFT = float(a.get("lift", "1.15"))
# raise the lift carriage and the car together (three y = Blender z)
carriage = garage.get("lift_carriage")
if carriage:
    carriage.location.z += LIFT
car_root = next(o for o in car.values() if o.parent is None)
car_root.location.z += LIFT

# tork blue paint (clearcoat metallic), headlamps on low
paint = bpy.data.materials.get("paint")
if paint and paint.node_tree:
    P = next(n for n in paint.node_tree.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled")
    for ln in list(paint.node_tree.links):
        if ln.to_socket == P.inputs["Base Color"]:
            paint.node_tree.links.remove(ln)
    P.inputs["Base Color"].default_value = (*C.srgb(a.get("paint", "#1b37c9")), 1)
    P.inputs["Metallic"].default_value = 0.55
    P.inputs["Roughness"].default_value = 0.28
    P.inputs["Coat Weight"].default_value = 1.0
    P.inputs["Coat Roughness"].default_value = 0.04

C.cycles(spp)
sc.cycles.use_denoising = True
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Medium High Contrast"
sc.view_settings.exposure = float(a.get("exp", "-0.5"))
w = bpy.data.worlds.new("w")
sc.world = w
w.use_nodes = True
wn = w.node_tree
env = wn.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(LIB, "env", "workshop-1k-v1.hdr"))
wn.links.new(env.outputs["Color"], wn.nodes["Background"].inputs["Color"])
wn.nodes["Background"].inputs["Strength"].default_value = float(a.get("env", "0.8"))

# the bay's emissive tubes are the key light; a cool rim from the back wall reads the roofline
for m in bpy.data.materials:
    if m.name.startswith("light_panel") and m.node_tree:
        P = next((n for n in m.node_tree.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled"), None)
        if P:
            P.inputs["Emission Strength"].default_value = float(a.get("tubes", "14"))


def area(loc, target, size, energy, color):
    ld = bpy.data.lights.new("L", "AREA")
    ld.size = size
    ld.energy = energy
    ld.color = color
    lo = bpy.data.objects.new("L", ld)
    lo.location = loc
    lo.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.collection.objects.link(lo)


area((-2.8, 2.6, 3.4), (0.2, 0, 1.6), 2.5, 900, (0.62, 0.72, 1.0))     # cool rim, back left
area((3.5, -3.0, 3.0), (0.2, 0, 1.5), 3.0, 380, (1.0, 0.92, 0.82))     # soft key from the door

cd = bpy.data.cameras.new("cam")
cd.sensor_width = 36
co = bpy.data.objects.new("cam", cd)
sc.collection.objects.link(co)
sc.camera = co
if shot == "tall":
    sc.render.resolution_x, sc.render.resolution_y = 1080, 1700
    co.location = (3.9, -1.3, 0.42)
    tgt = Vector((0.7, 0.05, 1.75))
    cd.lens = 16
else:
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    co.location = (3.8, -0.9, 0.5)
    tgt = Vector((0.2, 0.35, 1.55))
    cd.lens = 17
co.rotation_euler = (tgt - co.location).to_track_quat("-Z", "Y").to_euler()
cd.dof.use_dof = True
cd.dof.focus_distance = (tgt - co.location).length
cd.dof.aperture_fstop = 5.6
sc.render.resolution_percentage = int(a.get("pct", "100"))
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print("done", out)
