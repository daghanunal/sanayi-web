"""pist: Cycles stills of the lib3d wheel (public/lib3d/wheel-hi) for the rolling hero wheel.

The hero wheel rolls with scroll, so it is rendered face-on, straight down the axle, under a lighting rig
that is rotationally symmetric about that axle (a ring of soft boxes around the lens + a uniform dim
world). Under symmetric light a rotated render is exactly what a render of the rotated wheel would be,
so the page can spin the image with a CSS transform and the reflections stay right. Layers (all with
alpha, same camera, so they stack pixel-exactly):

  back    : brake disc (spins)            — the rim/tyre cast their shadows on it but are not seen
  caliper : 4-pot caliper (does NOT spin) — sits between disc and spokes, recoloured to the accent
  front   : tyre + rim + lugs + cap + valve (spins)
  beauty  : 3/4 product still on a dark floor (garage HDRI), for the finale

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      --python presets/pist/render_cycles.py -- --pass front --out /tmp/pist/front.png
  (see render.sh: cwebp → public/img/pist/r-*.webp, geometry → presets/pist/render.json)
"""

import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "assets3d"))

import bpy  # noqa: E402
from bpy_extras.object_utils import world_to_camera_view  # noqa: E402
from mathutils import Vector  # noqa: E402

import common as C  # noqa: E402

a = C.args()
PASS = a.get("pass", "front")
out = a.get("out", f"/tmp/pist/{PASS}.png")
spp = int(a.get("spp", "192"))
RES = int(a.get("res", "1400"))
ACCENT = a.get("accent", "#c8f025")
os.makedirs(os.path.dirname(out), exist_ok=True)

LIB = os.path.join(ROOT, "public", "lib3d")
man = json.load(open(os.path.join(LIB, "manifest.json")))
C.reset()
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.join(LIB, man["assets"]["wheel"]["hi"]["file"]))
objs = {o.name: o for o in sc.objects}
print("objects:", sorted(objs))


def under(name):
    o = objs.get(name)
    return [o] + list(o.children_recursive) if o else []


GROUPS = {
    "back": under("disc"),
    "caliper": under("caliper"),
    "front": [o for n in ("tyre", "rim", "lugs", "cap", "valve") for o in under(n)],
}

# --- render-only material dressing ----------------------------------------------------------------
def principled(m):
    return next((n for n in m.node_tree.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled"), None)


mats = {m.name: m for m in bpy.data.materials}
cal = mats.get("caliper_paint")
if cal:
    P = principled(cal)
    for ln in list(cal.node_tree.links):
        if ln.to_socket == P.inputs["Base Color"]:
            cal.node_tree.links.remove(ln)
    P.inputs["Base Color"].default_value = (*C.srgb(ACCENT), 1)
    P.inputs["Roughness"].default_value = 0.32
    try:
        P.inputs["Coat Weight"].default_value = 0.6
        P.inputs["Coat Roughness"].default_value = 0.08
    except KeyError:
        pass
# the gunmetal paint a touch darker: the machined faces read better against it on a dark page
rp = mats.get("rim_paint")
if rp:
    P = principled(rp)
    if not P.inputs["Base Color"].is_linked:
        P.inputs["Base Color"].default_value = (0.035, 0.037, 0.04, 1)

# real tyre rubber is very dark (albedo ~4 %): scale the sidewall / tread albedo down
for mn in ("tyre_side", "tyre_tread"):
    m = mats.get(mn)
    if not m:
        continue
    P = principled(m)
    k = float(a.get("rubber", "0.45"))
    src = P.inputs["Base Color"]
    if src.is_linked:
        ln = src.links[0]
        mul = m.node_tree.nodes.new("ShaderNodeMix")
        mul.data_type = "RGBA"
        mul.blend_type = "MULTIPLY"
        mul.inputs["Factor"].default_value = 1.0
        mul.inputs[7].default_value = (k, k, k, 1)
        m.node_tree.links.new(ln.from_socket, mul.inputs[6])
        m.node_tree.links.new(mul.outputs[2], src)
    else:
        c = src.default_value
        src.default_value = (c[0] * k, c[1] * k, c[2] * k, 1)

C.cycles(spp)
sc.cycles.use_denoising = True
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = a.get("look", "AgX - Medium High Contrast")
sc.render.image_settings.file_format = "PNG"
sc.render.image_settings.color_mode = "RGBA"
sc.render.resolution_percentage = 100
sc.view_settings.exposure = float(a.get("exp", "0"))

w = bpy.data.worlds.new("w")
sc.world = w
w.use_nodes = True
bg = w.node_tree.nodes["Background"]


def area(loc, target, size, energy, color=(1, 1, 1), shape="SQUARE", size_y=None):
    ld = bpy.data.lights.new("L", "AREA")
    ld.shape = shape
    ld.size = size
    if size_y:
        ld.size_y = size_y
    ld.energy = energy
    ld.color = color
    lo = bpy.data.objects.new("L", ld)
    lo.location = loc
    lo.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    sc.collection.objects.link(lo)
    return lo


cd = bpy.data.cameras.new("cam")
cd.sensor_fit = "HORIZONTAL"
cd.sensor_width = 36
co = bpy.data.objects.new("cam", cd)
sc.collection.objects.link(co)
sc.camera = co
meta = {}

if PASS in GROUPS:
    # face of the wheel = three +Z = Blender -Y. Camera straight down the axle.
    D = 4.0
    FRAME = 0.662  # metres across the frame at the hub plane
    co.location = (0, -D, 0)
    co.rotation_euler = (math.radians(90), 0, 0)
    cd.lens = 36 * D / FRAME
    sc.render.resolution_x = sc.render.resolution_y = RES
    sc.render.film_transparent = True
    bg.inputs["Color"].default_value = (1, 1, 1, 1)
    bg.inputs["Strength"].default_value = float(a.get("world", "0.05"))
    # ring of soft boxes around the lens (symmetric about the axle), slightly warm/cool alternating
    N = 18
    R = float(a.get("ring", "1.25"))
    for i in range(N):
        t = 2 * math.pi * i / N
        area((R * math.cos(t), -2.2, R * math.sin(t)), (0, 0, 0), 0.28, float(a.get("key", "90")),
             (1, 0.97, 0.93) if i % 2 else (0.93, 0.97, 1))
    # a wide grazing ring further out: rakes the sidewall lettering / tread shoulders
    for i in range(N):
        t = 2 * math.pi * (i + 0.5) / N
        area((2.2 * math.cos(t), -0.55, 2.2 * math.sin(t)), (0, 0.05, 0), 0.5, float(a.get("rake", "40")))
    # coaxial fill (sits behind the lens)
    area((0, -D - 0.3, 0), (0, 0, 0), 1.4, float(a.get("fill", "25")))
    if PASS == "caliper":
        # the caliper does not spin, so it may have a real key light: top-left softbox, like the page's sheen
        area((-0.9, -1.2, 1.1), (0, 0, 0), 0.6, float(a.get("calkey", "30")), (1, 0.97, 0.92))
    keep = set(GROUPS[PASS])
    for o in sc.objects:
        if o.type == "MESH":
            o.visible_camera = o in keep
            # the tyre's own glossy highlights on the disc look odd when the disc is seen alone:
            # other layers still shadow/bounce, but are not seen in reflections
            o.visible_glossy = True
    bpy.context.view_layer.update()

    def px(v):
        c = world_to_camera_view(sc, co, Vector(v))
        return [round(c.x * RES, 1), round((1 - c.y) * RES, 1)]

    # sidewall face plane ≈ three z = +0.09 → Blender y = -0.09
    cx, cy = px((0, 0, 0))
    meta = {"size": RES, "cx": cx, "cy": cy}
    for name, r, yy in (("tyre", 0.317, -0.06), ("side_out", 0.300, -0.09), ("side_in", 0.228, -0.09), ("rim", 0.216, -0.10)):
        p = px((r, yy, 0))
        meta[name] = round(p[0] - cx, 1)
else:  # beauty: 3/4 product shot in a dark studio, accent strip light reflected in a glossy floor
    sc.render.resolution_x, sc.render.resolution_y = int(a.get("w", "1600")), int(a.get("h", "1200"))
    sc.render.film_transparent = False
    env = w.node_tree.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(os.path.join(LIB, "env", a.get("env", "garage") + "-1k-v1.hdr"))
    w.node_tree.links.new(env.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = float(a.get("world", "0.18"))
    root = objs["wheel"]
    root.rotation_mode = "XYZ"
    root.location = (0, 0, 0.317)  # hub height: the tyre stands on the floor
    root.rotation_euler = (0, 0, math.radians(float(a.get("yaw", "34"))))
    # cyclorama: floor curving up into a back wall, so the HDRI only shows in reflections
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0))
    cyc = bpy.context.object
    import bmesh
    bm = bmesh.new()
    prof = [(y, 0.0) for y in (-6, -2, 0, 1.2)] + [(1.2 + 0.6 * math.sin(t * math.pi / 12), 0.6 - 0.6 * math.cos(t * math.pi / 12)) for t in range(1, 7)] + [(1.8, 3.0)]
    rows = []
    for (y, z) in prof:
        rows.append([bm.verts.new((x, y, z)) for x in (-8, 8)])
    for r0, r1 in zip(rows, rows[1:]):
        bm.faces.new((r0[0], r0[1], r1[1], r1[0]))
    bm.to_mesh(cyc.data)
    bm.free()
    for f in cyc.data.polygons:
        f.use_smooth = True
    cyc.data.materials.append(C.material("_cyc", C.srgb("#101113"), float(a.get("floor_rough", "0.3"))))
    key = area((-1.3, -1.5, 1.7), (0, 0, 0.3), 1.4, float(a.get("key", "90")), (1, 0.96, 0.92))
    area((1.4, 0.9, 1.0), (0, 0, 0.35), 0.9, float(a.get("rim", "60")), (0.85, 0.92, 1))
    acc = C.srgb(ACCENT)
    # a long accent strip light low behind the wheel: a coloured edge + a streak in the floor
    area((0.15, 0.75, 0.10), (0, 0, 0.2), 1.6, float(a.get("glow", "10")), acc, "RECTANGLE", 0.06)
    co.location = (float(a.get("cx", "-0.9")), -1.95, float(a.get("cz", "0.46")))
    co.rotation_euler = (Vector((0.02, 0, 0.30)) - co.location).to_track_quat("-Z", "Y").to_euler()
    cd.lens = float(a.get("lens", "58"))

sc.render.filepath = out
bpy.ops.render.render(write_still=True)
if meta:
    with open(out.rsplit(".", 1)[0] + ".json", "w") as f:
        json.dump(meta, f)
print("done", out, meta)
