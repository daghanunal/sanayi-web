"""kurumsal-cam: Cycles top view of the lib3d sedan for the kasko application module (replaces the drawn car).
Orthographic, nose up, transparent film with a soft contact shadow. A panoramic sunroof panel is added,
conformed to the roof by ray casts. Besides the car it writes one alpha mask per glass group, so the page can
light up the glass the visitor picks:

  arac      the car (pearl silver, tinted glass)
  m-on      windscreen            m-arka   rear window
  m-yan     all side glass        m-tavan  sunroof

Generic asset, no brand; shown on the page as a representative drawing.

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      --python presets/kurumsal-cam/render_cycles.py -- --out /tmp/kc [--spp 128] [--res 560x1200]
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
OUT = a.get("out", "/tmp/kc")
spp = int(a.get("spp", "128"))
os.makedirs(OUT, exist_ok=True)
LIB = os.path.join(ROOT, "public", "lib3d")
man = json.load(open(os.path.join(LIB, "manifest.json")))

C.reset()
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.join(LIB, man["assets"]["car_sedan"]["hi"]["file"]))


def principled(m):
    return next((n for n in m.node_tree.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled"), None) if m and m.node_tree else None


def set_mat(name, **kw):
    m = bpy.data.materials.get(name)
    P = principled(m)
    if not P:
        return
    for k, v in kw.items():
        sock = P.inputs.get(k)
        if sock is None:
            continue
        for ln in list(m.node_tree.links):
            if ln.to_socket == sock:
                m.node_tree.links.remove(ln)
        sock.default_value = v


set_mat("paint", **{"Base Color": (*C.srgb(a.get("paint", "#a9b5bd")), 1), "Metallic": 0.8, "Roughness": 0.26,
                    "Coat Weight": 1.0, "Coat Roughness": 0.03})
set_mat("glass", **{"Base Color": (*C.srgb("#10181c"), 1), "Roughness": 0.03, "Alpha": 1.0, "Transmission Weight": 0.0,
                    "Metallic": 0.0, "Specular IOR Level": 0.6})
gl = bpy.data.materials.get("glass")
if gl and hasattr(gl, "blend_method"):
    gl.blend_method = "OPAQUE"

meshes = [o for o in sc.objects if o.type == "MESH"]
deps = bpy.context.evaluated_depsgraph_get()


def node_meshes(names):
    out = []
    for o in meshes:
        p = o
        while p is not None:
            if p.name in names or p.name.split(".")[0] in names:
                out.append(o)
                break
            p = p.parent
    # only the glass-material parts of those nodes
    return [o for o in out if any(ms.material and ms.material.name == "glass" for ms in o.material_slots)]


# --- panoramic sunroof conformed to the roof --------------------------------------------------
xs = []
zs = []
for o in meshes:
    for v in list(o.data.vertices)[::7]:
        w = o.matrix_world @ v.co
        xs.append(w.x)
        zs.append(w.z)
ztop = max(zs)
rx0, rx1 = float(a.get("sr_x0", "-0.95")), float(a.get("sr_x1", "0.05"))
ry = float(a.get("sr_w", "0.36"))
bm = bmesh.new()
NX, NY = 24, 12
grid = []
for i in range(NX + 1):
    row = []
    for j in range(NY + 1):
        x = rx0 + (rx1 - rx0) * i / NX
        y = -ry + 2 * ry * j / NY
        hit, loc, *_ = sc.ray_cast(deps, Vector((x, y, ztop + 1)), Vector((0, 0, -1)))
        z = (loc.z if hit else ztop) + 0.004
        row.append(bm.verts.new((x, y, z)))
    grid.append(row)
for i in range(NX):
    for j in range(NY):
        bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
sr_m = C.material("_sunroof_glass", C.srgb("#0c1216"), 0.06, spec_level=0.25)
sunroof = C.obj("_sunroof", bm, sr_m)
# a thin black frit frame around it
bm = bmesh.new()
for (x0, x1, y0, y1) in ((rx0 - 0.03, rx1 + 0.03, -ry - 0.03, -ry), (rx0 - 0.03, rx1 + 0.03, ry, ry + 0.03),
                         (rx0 - 0.03, rx0, -ry, ry), (rx1, rx1 + 0.03, -ry, ry)):
    vs = []
    for (x, y) in ((x0, y0), (x1, y0), (x1, y1), (x0, y1)):
        hit, loc, *_ = sc.ray_cast(deps, Vector((x, y, ztop + 1)), Vector((0, 0, -1)))
        vs.append(bm.verts.new((x, y, (loc.z if hit else ztop) + 0.005)))
    bm.faces.new(vs)
frame = C.obj("_sunroof_frame", bm, C.material("_frit", C.srgb("#0a0b0c"), 0.5), smooth=False)

# dark cabin/engine-bay floor: panel gaps seen from above must not show the (transparent) floor
bm = C.box((3.9, 1.5, 0.02), loc=(-0.2, 0, 0.62))
C.obj("_underfloor", bm, C.material("_under", C.srgb("#070809"), 0.9), smooth=False)

groups = {
    "on": node_meshes({"glass_front"}),
    "arka": node_meshes({"glass_rear"}),
    "yan": node_meshes({"glass_FL", "glass_FR", "glass_RL", "glass_RR", "glass_QL", "glass_QR"}),
    "tavan": [sunroof],
}
for k, v in groups.items():
    print("group", k, [o.name for o in v])

# --- shadow catcher, light, world -----------------------------------------------------------
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=6)
floor = C.obj("_floor", bm, C.material("_floor_m", C.srgb("#808080"), 0.8), smooth=False)
floor.is_shadow_catcher = True
ld = bpy.data.lights.new("key", "AREA")
ld.size = 5.0
ld.energy = float(a.get("key", "420"))
lo = bpy.data.objects.new("key", ld)
lo.location = (0.3, -0.4, 6.0)
lo.rotation_euler = (Vector((0, 0, 0)) - lo.location).to_track_quat("-Z", "Y").to_euler()
sc.collection.objects.link(lo)

C.cycles(spp)
sc.cycles.use_denoising = True
sc.render.film_transparent = True
w = bpy.data.worlds.new("w")
sc.world = w
w.use_nodes = True
wn = w.node_tree
bg = wn.nodes["Background"]
env = wn.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(LIB, "env", "studio-1k-v1.hdr"))
wn.links.new(env.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = float(a.get("env", "0.55"))
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Medium High Contrast"

cd = bpy.data.cameras.new("cam")
cd.type = "ORTHO"
rx, ry_ = map(int, a.get("res", "560x1200").split("x"))
cd.ortho_scale = float(a.get("frame", "5.05"))
co = bpy.data.objects.new("cam", cd)
sc.collection.objects.link(co)
sc.camera = co
# from above, tilted a little towards the tail (no panel gap is seen edge-on), image-up = car nose (+X)
tilt = math.radians(float(a.get("tilt", "16")))
tgt = Vector((float(a.get("cx", "-0.05")), 0, 0.7))
co.location = tgt + Vector((-math.sin(tilt), 0, math.cos(tilt))) * 9
co.rotation_euler = (tgt - co.location).to_track_quat("-Z", "Y").to_euler()
sc.render.resolution_x, sc.render.resolution_y = rx, ry_
sc.render.image_settings.file_format = "PNG"
sc.render.image_settings.color_mode = "RGBA"

sc.render.filepath = os.path.join(OUT, "arac.png")
bpy.ops.render.render(write_still=True)
print("done arac")

# --- masks: holdout everything, the group glows white ---------------------------------------
white = bpy.data.materials.new("_white")
white.use_nodes = True
nt = white.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
em = nt.nodes.new("ShaderNodeEmission")
em.inputs["Color"].default_value = (1, 1, 1, 1)
mo = nt.nodes.new("ShaderNodeOutputMaterial")
nt.links.new(em.outputs[0], mo.inputs[0])
floor.hide_render = True
sc.cycles.samples = 16
sc.view_settings.view_transform = "Standard"
sc.view_settings.look = "None"
saved = {o: [ms.material for ms in o.material_slots] for o in list(groups["on"] + groups["arka"] + groups["yan"] + groups["tavan"])}
for k, objs in groups.items():
    for o in [x for x in sc.objects if x.type == "MESH"]:
        o.is_holdout = o not in objs
    for o in objs:
        for ms in o.material_slots:
            if ms.material and ms.material.name in ("glass", "_sunroof_glass"):
                ms.material = white
    sc.render.filepath = os.path.join(OUT, "m-" + k + ".png")
    bpy.ops.render.render(write_still=True)
    for o in objs:
        for ms, m in zip(o.material_slots, saved[o]):
            ms.material = m
    print("done", k)
