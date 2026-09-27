"""kurumsal-boya2: Cycles still for the "Boya ölçümü" page — the lib3d hatchback in pearl white on a cobalt
seamless studio, its opening panels painted in the page's ekspertiz colour code (rear door "macun + boya"
pink, hood "boyanmış" phosphor green) like the mikron module's sample car. Flat, graphic, technical-plate
light — the opposite of the dark sibling scenes. Generic asset, no brand; shown on the page as
"Temsilî 3D çizim", never as the shop's own photo.

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      --python presets/kurumsal-boya2/render_cycles.py -- --out /tmp/kb2/panel.png [--spp 256] [--res 2100x900]
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
out = a.get("out", "/tmp/kb2/panel.png")
spp = int(a.get("spp", "256"))
os.makedirs(os.path.dirname(out), exist_ok=True)
LIB = os.path.join(ROOT, "public", "lib3d")
man = json.load(open(os.path.join(LIB, "manifest.json")))

C.reset()
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.join(LIB, man["assets"]["car"]["hi"]["file"]))
car = {o.name: o for o in sc.objects}


def principled(m):
    return next(n for n in m.node_tree.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled")


def set_paint(m, hexc, metal, rough):
    P = principled(m)
    for ln in list(m.node_tree.links):
        if ln.to_socket == P.inputs["Base Color"]:
            m.node_tree.links.remove(ln)
    P.inputs["Base Color"].default_value = (*C.srgb(hexc), 1)
    P.inputs["Metallic"].default_value = metal
    P.inputs["Roughness"].default_value = rough
    P.inputs["Coat Weight"].default_value = 1.0
    P.inputs["Coat Roughness"].default_value = 0.03


paint = bpy.data.materials.get("paint")
set_paint(paint, a.get("paint", "#eceef4"), 0.15, 0.3)   # pearl / primer-white body


def repaint(names, hexc):
    m = paint.copy()
    m.name = "paint_" + hexc
    set_paint(m, hexc, 0.1, 0.28)
    for nm in names:
        for o in [car.get(nm)] + [c for c in (car.get(nm).children_recursive if car.get(nm) else [])]:
            if not o or o.type != "MESH":
                continue
            for s in o.material_slots:
                if s.material == paint:
                    s.link = "OBJECT"
                    s.material = m


repaint(["door_RL", "door_RR"], a.get("macun", "#ff2e63"))
repaint(["hood"], a.get("boyali", "#a6f04a"))
# rear door a little open: reads as "this panel is the one we're talking about"
if "door_RL" in car:
    car["door_RL"].rotation_mode = "XYZ"
for k in ("door_RR",):
    if k in car:
        car[k].rotation_mode = "XYZ"
        car[k].rotation_euler.rotate_axis("Z", math.radians(float(a.get("door", "0"))))

# cobalt cyclorama (floor + curved wall), slightly satin
bgc = C.srgb(a.get("bg", "#1b2bd0"))
bm = bmesh.new()
R, W, D = 3.0, 60.0, 30.0
prof = [(y, 0.0) for y in (-D, 0.0)]
for i in range(1, 17):
    ang = math.pi / 2 * i / 16
    prof.append((R * math.sin(ang), R * (1 - math.cos(ang))))
prof.append((R, 14.0))
vl = [bm.verts.new((-W / 2, 5.0 + y, z)) for y, z in prof]
vr = [bm.verts.new((W / 2, 5.0 + y, z)) for y, z in prof]
for i in range(len(prof) - 1):
    bm.faces.new((vl[i], vr[i], vr[i + 1], vl[i + 1]))
cyc = C.obj("_cyc", bm, C.material("_cyc_m", bgc, 0.62), smooth=True)
cyc.rotation_euler = (0, 0, math.radians(float(a.get("wall", "-8"))))


def area(loc, target, size, energy, color=(1, 1, 1)):
    ld = bpy.data.lights.new("L", "AREA")
    ld.size = size
    ld.energy = energy
    ld.color = color
    lo = bpy.data.objects.new("L", ld)
    lo.location = loc
    lo.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    lo.visible_camera = False
    sc.collection.objects.link(lo)


k = float(a.get("key", "0.8"))
area((0.5, -1.0, 6.0), (0.2, 0, 0), 5.0, 1400 * k)                    # big soft top: flat plate light
area((5.0, -5.5, 2.2), (0, 0, 0.6), 4.0, 520 * k, (0.95, 0.97, 1.0))  # front key from camera side
area((-5.0, 3.0, 2.5), (0, 0, 0.8), 3.0, 420 * k, (0.8, 0.86, 1.0))   # rim off the wall

C.cycles(spp)
sc.cycles.use_denoising = True
w = bpy.data.worlds.new("w")
sc.world = w
w.use_nodes = True
wn = w.node_tree
env = wn.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(LIB, "env", "studio-1k-v1.hdr"))
wn.links.new(env.outputs["Color"], wn.nodes["Background"].inputs["Color"])
wn.nodes["Background"].inputs["Strength"].default_value = float(a.get("env", "0.5"))
sc.view_settings.view_transform = a.get("view", "Standard")
if sc.view_settings.view_transform == "AgX":
    sc.view_settings.look = "AgX - Medium High Contrast"
sc.view_settings.exposure = float(a.get("exp", "-0.9"))

cd = bpy.data.cameras.new("cam")
cd.sensor_width = 36
cd.lens = float(a.get("lens", "52"))
co = bpy.data.objects.new("cam", cd)
sc.collection.objects.link(co)
sc.camera = co
co.location = (float(a.get("camx", "5.0")), float(a.get("camy", "-7.4")), float(a.get("camz", "1.6")))
tgt = Vector((float(a.get("tx", "0.15")), float(a.get("ty", "0.0")), float(a.get("tz", "0.62"))))
co.rotation_euler = (tgt - co.location).to_track_quat("-Z", "Y").to_euler()
rx, ry = map(int, a.get("res", "2100x900").split("x"))
sc.render.resolution_x, sc.render.resolution_y = rx, ry
sc.render.resolution_percentage = int(a.get("pct", "100"))
sc.render.image_settings.file_format = "PNG"
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print("done", out)
