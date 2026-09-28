"""asfalt: top-down Cycles stills of the lib3d hatchback for the painted-road scenes (hero, fren, rot, final).
Orthographic camera straight down, nose up, transparent film + shadow catcher (the contact shadow is in the
alpha), road-paint white clearcoat. Illustration of a generic car (no brand), labelled "3D görseller temsilîdir".

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      --python presets/asfalt/render_cycles.py -- --tail 0.4 --out /tmp/asfalt/top.png
  --tail  light_tail emission (0.4 = off-ish, 18 = braking)   --paint '#e9e7e1'   --spp 192
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
out = a.get("out", "/tmp/asfalt/top.png")
spp = int(a.get("spp", "192"))
os.makedirs(os.path.dirname(out), exist_ok=True)
LIB = os.path.join(ROOT, "public", "lib3d")
man = json.load(open(os.path.join(LIB, "manifest.json")))

C.reset()
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.join(LIB, man["assets"]["car"]["hi"]["file"]))


def principled(m):
    return next((n for n in m.node_tree.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled"), None) if m and m.node_tree else None


paint = bpy.data.materials.get("paint")
P = principled(paint)
if P:
    for ln in list(paint.node_tree.links):
        if ln.to_socket == P.inputs["Base Color"]:
            paint.node_tree.links.remove(ln)
    P.inputs["Base Color"].default_value = (*C.srgb(a.get("paint", "#dedcd5")), 1)
    P.inputs["Metallic"].default_value = 0.0
    P.inputs["Roughness"].default_value = 0.32
    P.inputs["Coat Weight"].default_value = 1.0
    P.inputs["Coat Roughness"].default_value = 0.05

for name, key in (("light_head", "head"), ("light_tail", "tail")):
    m = bpy.data.materials.get(name)
    Pm = principled(m)
    if Pm:
        Pm.inputs["Emission Strength"].default_value = float(a.get(key, "6" if key == "head" else "0.4"))

C.cycles(spp)
if a.get("cpu"):
    sc.cycles.device = "CPU"   # when the GPU queue is busy with other renders
sc.cycles.use_denoising = True
sc.render.film_transparent = True
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Medium High Contrast"
sc.view_settings.exposure = float(a.get("exp", "-0.8"))

w = bpy.data.worlds.new("w")
sc.world = w
w.use_nodes = True
env = w.node_tree.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(LIB, "env", "dusk-1k-v1.hdr"))
w.node_tree.links.new(env.outputs["Color"], w.node_tree.nodes["Background"].inputs["Color"])
w.node_tree.nodes["Background"].inputs["Strength"].default_value = float(a.get("env", "0.9"))

# shadow catcher road
bpy.ops.mesh.primitive_plane_add(size=30)
bpy.context.object.is_shadow_catcher = True


def area(loc, target, size, energy, color=(1, 1, 1)):
    ld = bpy.data.lights.new("L", "AREA")
    ld.size = size
    ld.energy = energy
    ld.color = color
    lo = bpy.data.objects.new("L", ld)
    lo.location = loc
    lo.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.collection.objects.link(lo)


# street light ahead and above: soft key, the shadow falls back (down the image)
area((0.3, 0.0, 7.0), (0, 0, 0), 7.0, float(a.get("top", "1500")), (1.0, 0.97, 0.92))   # overcast sky: soft halo shadow
area((4.2, 2.6, 3.6), (0, 0, 0.5), 3.0, float(a.get("key", "600")), (1.0, 0.95, 0.86))
area((-3.0, -2.5, 4.0), (0, 0, 0.6), 3.0, float(a.get("fill", "260")), (0.72, 0.8, 1.0))   # cool fill, rear left

cd = bpy.data.cameras.new("cam")
cd.type = "ORTHO"
cd.ortho_scale = float(a.get("scale", "4.9"))
co = bpy.data.objects.new("cam", cd)
sc.collection.objects.link(co)
sc.camera = co
co.location = (float(a.get("cx", "-0.05")), 0, 20)
co.rotation_euler = (0, 0, -math.pi / 2)   # image up = +X (the car's nose)
sc.render.resolution_x, sc.render.resolution_y = int(a.get("w", "640")), int(a.get("h", "1200"))
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = "PNG"
sc.render.image_settings.color_mode = "RGBA"
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print("done", out)
