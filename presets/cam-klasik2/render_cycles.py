"""cam-klasik2 (Vantuz): Cycles stills of the lib3d windshield, seen square-on (orthographic, along the glass
normal), for the hero's layered glass. Transparent film, so the page composites them over its own photo:

  mask   the glass silhouette (moulding included), white on transparent: CSS mask for photo / PVB / inner layers
  dis    outer ply: glass with reflections, ceramic frit, moulding, the mirror seen through the glass
  frit   frit + moulding only (the inner ply's black band and dot fade)
  vantuz a double suction-cup glass lifter (modelled here: rubber pads, red housings, levers, aluminium bridge)
         sitting on the glass, same camera, so it lines up with the other layers

Generic asset, no brand; the page labels it as a representative 3D drawing.

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      --python presets/cam-klasik2/render_cycles.py -- --out /tmp/ck2 [--spp 128] [--res 1280x790] [--only dis]
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
from mathutils import Matrix, Vector  # noqa: E402

import common as C  # noqa: E402

a = C.args()
OUT = a.get("out", "/tmp/ck2")
spp = int(a.get("spp", "128"))
only = set(filter(None, a.get("only", "").split(",")))
os.makedirs(OUT, exist_ok=True)
LIB = os.path.join(ROOT, "public", "lib3d")
man = json.load(open(os.path.join(LIB, "manifest.json")))

C.reset()
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.join(LIB, man["assets"]["windshield"]["hi"]["file"]))
objs = {o.name: o for o in sc.objects}


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


# laminated glass: a pure Glass BSDF (film_transparent_glass turns what is seen through it into alpha,
# the reflections stay), edge band slightly green
def glass_bsdf(name, color, rough=0.0):
    m = bpy.data.materials.get(name)
    if not m:
        return
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    gb = nt.nodes.new("ShaderNodeBsdfGlass")
    gb.inputs["Color"].default_value = (*C.srgb(color), 1)
    gb.inputs["Roughness"].default_value = rough
    gb.inputs["IOR"].default_value = 1.52
    mo = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(gb.outputs[0], mo.inputs[0])


glass_bsdf("glass", "#f4faf7")
glass_bsdf("glass_edge", "#7fae96", 0.02)
set_mat("rubber", **{"Roughness": 0.55})
# ceramic frit: coal black enamel (the halftone stays in the alpha)
set_mat("frit", **{"Base Color": (*C.srgb("#0b0b0c"), 1), "Roughness": 0.32})

# hide what a loose windshield on a bench does not carry
for n, o in objs.items():
    if n.startswith(("cowl", "wiper")):
        o.hide_render = True

# --- glass geometry frame -------------------------------------------------------------------
# glTF (+X forward, +Y up, 28° rake) → Blender (x, -z, y): normal n = (sin28, 0, cos28), up-slope d = (-cos28, 0, sin28)
R = math.radians(28)
N = Vector((math.sin(R), 0, math.cos(R)))
D = Vector((-math.cos(R), 0, math.sin(R)))
glass = objs.get("glass")
gm = [o for o in sc.objects if o.type == "MESH" and any(ms.material and ms.material.name == "glass" for ms in o.material_slots)]
deps = bpy.context.evaluated_depsgraph_get()
pts = []
for o in gm:
    for v in o.data.vertices:
        pts.append(o.matrix_world @ v.co)
cen = sum(pts, Vector()) / len(pts)
us = [p.dot(Vector((0, 1, 0))) for p in pts]
vs = [p.dot(D) for p in pts]
cx = (min(us) + max(us)) / 2
cv = (min(vs) + max(vs)) / 2
H = max(vs) - min(vs)
W = max(us) - min(us)
print("glass W", W, "H", H)
# a point on the glass centre plane
C0 = cen + Vector((0, cx - cen.y, 0)) + D * (cv - cen.dot(D))


def on_glass(u, v):
    """world point on the outer glass surface at width u, slope v (metres from the centre)."""
    p = C0 + Vector((0, u, 0)) + D * v
    hit, loc, nor, *_ = sc.ray_cast(deps, p + N * 0.5, -N)
    return (loc, nor) if hit else (p, N)


# --- suction-cup lifter ------------------------------------------------------------------------
m_rub = C.material("_pad", C.srgb("#141516"), 0.62)
m_red = C.material("_housing", C.srgb("#a3121b"), 0.5)
m_alu = C.material("_alu", C.srgb("#b9bec4"), 0.28, metal=1.0)
m_grip = C.material("_grip", C.srgb("#1a1c1f"), 0.7)
m_lev = C.material("_lever", C.srgb("#2a2d31"), 0.4)
lifter = []
SEP = float(a.get("sep", "0.2"))
K = float(a.get("cup", "1.45"))  # a touch larger than life so it reads at phone size
for side in (-1, 1):
    loc, nor = on_glass(side * SEP, float(a.get("liftv", "0.02")))
    bm = C.lathe([(0.0, 0.0), (0.058, 0.0), (0.061, 0.003), (0.058, 0.008), (0.03, 0.012), (0.0, 0.013)], 64, cap0=True)
    pad = C.obj("_pad", bm, m_rub)
    pad.scale = (K, K, K)
    bm = C.lathe([(0.0, 0.034), (0.02, 0.034), (0.043, 0.028), (0.054, 0.016), (0.056, 0.011), (0.045, 0.01), (0.0, 0.01)], 64)
    hou = C.obj("_housing", bm, m_red)
    bm = C.box((0.085, 0.018, 0.01), loc=(0.0, 0.0, 0.042), bevel=0.004)
    C.box((0.012, 0.018, 0.014), loc=(0.036, 0.0, 0.035), bevel=0.003, bm=bm)
    lev = C.obj("_lever", bm, m_lev)
    bm = C.cyl(0.011, 0.03, 24, loc=(0, 0, 0.049), bevel=0.003)
    post = C.obj("_post", bm, m_alu)
    grp = bpy.data.objects.new("_cup", None)
    sc.collection.objects.link(grp)
    for o in (pad, hou, lev, post):
        o.parent = grp
        o.scale = (K, K, K)
    # stand on the glass, lever across the bridge
    q = Vector((0, 0, 1)).rotation_difference(nor)
    grp.matrix_world = Matrix.Translation(loc + nor * 0.0005) @ q.to_matrix().to_4x4() @ Matrix.Rotation(math.pi / 2, 4, "Z")
    lifter += [grp, pad, hou, lev, post]
# bridge: an arched aluminium handle with a rubber grip between the two posts
la, na = on_glass(-SEP, float(a.get("liftv", "0.02")))
lb, nb = on_glass(SEP, float(a.get("liftv", "0.02")))
nn = (na + nb).normalized()
h0 = 0.062 * K
path = []
for k in range(25):
    t = k / 24
    p = la.lerp(lb, t) + nn * (h0 + 0.035 * K * math.sin(math.pi * t))
    path.append(p)
bm = C.tube(path, 0.0095 * K, sides=20)
bridge = C.obj("_bridge", bm, m_alu)
gpath = path[8:17]
bm = C.tube(gpath, 0.0135 * K, sides=24)
grip = C.obj("_grip", bm, m_grip)
lifter += [bridge, grip]

# --- light: soft key from top-left, cool fill, studio HDRI in reflections ----------------------
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


area(C0 + N * 1.6 + D * 1.2 + Vector((0, 0.9, 0)), C0, 1.6, float(a.get("key", "160")), (1.0, 0.97, 0.93))
area(C0 + N * 1.4 - D * 0.6 - Vector((0, 1.2, 0)), C0, 2.0, float(a.get("fill", "90")), (0.88, 0.92, 1.0))

C.cycles(spp)
sc.cycles.use_denoising = True
sc.render.film_transparent = True
sc.cycles.film_transparent_glass = True
w = bpy.data.worlds.new("w")
sc.world = w
w.use_nodes = True
wn = w.node_tree
bg = wn.nodes["Background"]
env = wn.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(LIB, "env", "studio-1k-v1.hdr"))
wn.links.new(env.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = float(a.get("env", "0.45"))
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Medium High Contrast"

# --- camera: orthographic, square-on to the glass --------------------------------------------
cd = bpy.data.cameras.new("cam")
cd.type = "ORTHO"
rx, ry = map(int, a.get("res", "1280x790").split("x"))
cd.ortho_scale = float(a.get("frame", "1.0")) * rx / ry  # vertical coverage ≈ frame metres
co = bpy.data.objects.new("cam", cd)
sc.collection.objects.link(co)
sc.camera = co
co.location = C0 + N * 3.0
co.rotation_euler = (-N).to_track_quat("-Z", "Y").to_euler()
# roll so image-up = up the slope
up = co.matrix_world.to_3x3() @ Vector((0, 1, 0))
if up.dot(D) < 0:
    co.rotation_euler.rotate_axis("Z", math.pi)
sc.render.resolution_x, sc.render.resolution_y = rx, ry
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = "PNG"
sc.render.image_settings.color_mode = "RGBA"

every = [o for o in sc.objects if o.type == "MESH"]
frit_like = [o for o in every if any(ms.material and ms.material.name in ("frit", "rubber") for ms in o.material_slots)]
mirror_like = [o for o in every if o.name.startswith("mirror") or (o.parent and o.parent.name.startswith("mirror"))]


def show(objs_on):
    on = set(objs_on)
    for o in every:
        o.hide_render = bool(o not in on or o.name.startswith(("cowl", "wiper")) or (o.parent and o.parent.name.startswith(("cowl", "wiper"))))


def shot(name):
    if only and name not in only:
        return
    sc.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)
    print("done", sc.render.filepath)


base = [o for o in every if o not in lifter]
# 1) outer ply
show(base)
shot("dis")
# 2) frit + moulding only
show(frit_like)
shot("frit")
# 3) lifter only (holdout glass so the cups' contact reads right)
show(lifter)
shot("vantuz")
# 4) silhouette mask: glass + moulding as flat white emission
mask_m = bpy.data.materials.new("_mask")
mask_m.use_nodes = True
nt = mask_m.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
em = nt.nodes.new("ShaderNodeEmission")
em.inputs["Color"].default_value = (1, 1, 1, 1)
mo = nt.nodes.new("ShaderNodeOutputMaterial")
nt.links.new(em.outputs[0], mo.inputs[0])
sil = [o for o in every if o not in lifter and o not in mirror_like]
for o in sil:
    for ms in o.material_slots:
        ms.material = mask_m
show(sil)
sc.view_settings.view_transform = "Standard"
sc.view_settings.look = "None"
sc.cycles.samples = 8
shot("mask")
