"""motor-klasik2: Cycles stills of the lib3d engine (public/lib3d/engine-hi) for the gasket hero.

  deck-h / deck-v : block deck seen straight from above, head removed, pistons at crank angle THETA.
                    The camera looks straight down, so the four bores (deck plane) project to exact
                    circles; their pixel centres + radius are written to render.json so main.js can
                    line the photo up behind the SVG gasket holes (h = desktop row, v = phone column).
  bore            : looking down cylinder 2 at its piston crown (the "dive" at the end of the hero).

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      --python presets/motor-klasik2/render_cycles.py -- --shot deck-h --out /tmp/mk2/deck-h.png
  (then cwebp → public/img/motor-klasik2/*.webp, see render.sh)
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
shot = a.get("shot", "deck-h")
out = a.get("out", f"/tmp/mk2/{shot}.png")
spp = int(a.get("spp", "256"))
os.makedirs(os.path.dirname(out), exist_ok=True)

LIB = os.path.join(ROOT, "public", "lib3d")
man = json.load(open(os.path.join(LIB, "manifest.json")))
C.reset()
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.join(LIB, man["assets"]["engine"]["hi"]["file"]))
objs = {o.name: o for o in sc.objects}

# engine constants (assets3d/build_engine.py)
CRANK_Z, R_CR, L_ROD, BORE, DECK = 0.160, 0.0418, 0.140, 0.078, 0.370
XC = [0.132, 0.044, -0.044, -0.132]
PHASE = [0.0, math.pi, math.pi, 0.0]
THETA = float(a.get("theta", "0.55"))

# head and everything above the deck off
HIDE = ("head", "head_gasket", "valve_cover", "camshaft", "cam_pulley", "timing_cover", "timing_belt",
        "tensioner", "intake_manifold", "exhaust_manifold", "fuel_rail", "injector", "coil", "dipstick",
        "coolant_hose", "accessory_belt", "alternator", "oil_filter")


def hide(o):
    o.hide_render = True
    for c in o.children_recursive:
        c.hide_render = True


for n, o in objs.items():
    if n.startswith(HIDE):
        hide(o)

# The published block only has ~50 mm deep bore pockets (enough for the realtime asset, where the
# head sits on top). For a head-off view the bores must run down to the crankcase: bore them through
# here, render-only, with the cutter carrying the 'bore' material onto the new walls.
import bmesh  # noqa: E402

_honed = None


def honed():
    """bore wall with a plateau-honed 60° cross-hatch (object coords of the tube = metres, axis Z)"""
    global _honed
    if _honed:
        return _honed
    m = bpy.data.materials.new("bore_honed")
    m.use_nodes = True
    nt = m.node_tree
    N, L = nt.nodes.new, nt.links.new
    P = nt.nodes["Principled BSDF"]
    P.inputs["Base Color"].default_value = (0.60, 0.61, 0.62, 1)
    P.inputs["Metallic"].default_value = 1.0
    tc = N("ShaderNodeTexCoord")
    sep = N("ShaderNodeSeparateXYZ")
    L(tc.outputs["Object"], sep.inputs[0])
    at = N("ShaderNodeMath"); at.operation = "ARCTAN2"
    L(sep.outputs["Y"], at.inputs[0]); L(sep.outputs["X"], at.inputs[1])
    arc = N("ShaderNodeMath"); arc.operation = "MULTIPLY"; arc.inputs[1].default_value = BORE / 2
    L(at.outputs[0], arc.inputs[0])
    lines = []
    for sgn in (1, -1):
        zz = N("ShaderNodeMath"); zz.operation = "MULTIPLY"; zz.inputs[1].default_value = sgn * math.tan(math.radians(30))
        L(sep.outputs["Z"], zz.inputs[0])
        ad = N("ShaderNodeMath"); ad.operation = "ADD"
        L(arc.outputs[0], ad.inputs[0]); L(zz.outputs[0], ad.inputs[1])
        fr = N("ShaderNodeMath"); fr.operation = "MULTIPLY"; fr.inputs[1].default_value = 2 * math.pi / 0.0011
        L(ad.outputs[0], fr.inputs[0])
        sn = N("ShaderNodeMath"); sn.operation = "SINE"
        L(fr.outputs[0], sn.inputs[0])
        pw = N("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 8
        ab = N("ShaderNodeMath"); ab.operation = "ABSOLUTE"
        L(sn.outputs[0], ab.inputs[0]); L(ab.outputs[0], pw.inputs[0])
        lines.append(pw.outputs[0])
    mx = N("ShaderNodeMath"); mx.operation = "MAXIMUM"
    L(lines[0], mx.inputs[0]); L(lines[1], mx.inputs[1])
    nz = N("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 400
    L(tc.outputs["Object"], nz.inputs["Vector"])
    ml = N("ShaderNodeMath"); ml.operation = "MULTIPLY"
    L(mx.outputs[0], ml.inputs[0]); L(nz.outputs["Fac"], ml.inputs[1])
    bump = N("ShaderNodeBump"); bump.inputs["Distance"].default_value = 0.00008
    bump.inputs["Strength"].default_value = 0.6
    L(ml.outputs[0], bump.inputs["Height"])
    L(bump.outputs["Normal"], P.inputs["Normal"])
    rr = N("ShaderNodeMapRange")
    rr.inputs["To Min"].default_value = 0.16
    rr.inputs["To Max"].default_value = 0.32
    L(ml.outputs[0], rr.inputs["Value"])
    L(rr.outputs["Result"], P.inputs["Roughness"])
    _honed = m
    return m



blk = objs["block"]
bm = bmesh.new()
bm.from_mesh(blk.data)
mw = blk.matrix_world
kill = []
for f in bm.faces:
    c = mw @ f.calc_center_median()
    n = (mw.to_3x3() @ f.normal).normalized()
    near = any((c.x - xc) ** 2 + c.y ** 2 < (BORE / 2 + 0.0015) ** 2 for xc in XC)
    if near and n.z > 0.9 and c.z < DECK - 0.01:
        kill.append(f)  # pocket floor
    elif near and abs(n.z) < 0.3 and 0.30 < c.z < DECK - 0.004:
        kill.append(f)  # pocket wall (coarse normals): replaced by the smooth tube below
bmesh.ops.delete(bm, geom=kill, context="FACES")
bm.to_mesh(blk.data)
bm.free()
print("pocket floors removed:", len(kill))
floor_z = 0.3225  # pocket floor height in the asset (~52 mm below the deck)
for xc in XC:
    top = DECK - 0.0035
    bpy.ops.mesh.primitive_cylinder_add(vertices=192, radius=BORE / 2, depth=top - 0.19,
                                        location=(xc, 0, (top + 0.19) / 2), end_fill_type="NOTHING")
    tube = bpy.context.object
    tube.data.materials.append(honed())
    tube.data.flip_normals() if hasattr(tube.data, "flip_normals") else None
    bpy.ops.object.shade_smooth()

# piston + rod pose (Blender Z up; piston origin = gudgeon pin)
for i in range(4):
    p = objs.get(f"piston_{i + 1}")
    rod = objs.get(f"conrod_{i + 1}")
    ang = THETA + PHASE[i]
    s = R_CR * math.sin(ang)
    if p:
        p.location.z = CRANK_Z + R_CR * math.cos(ang) + math.sqrt(L_ROD ** 2 - s ** 2)
    if rod:
        rod.rotation_mode = "XYZ"
        rod.rotation_euler.x = -math.asin(s / L_ROD)
crank = objs.get("crankshaft")
if crank:
    crank.rotation_mode = "XYZ"
    crank.rotation_euler.x = THETA

# --- render-only material dressing (the GLB stays untouched) ---------------------------------
def principled(m):
    return next(n for n in m.node_tree.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled")


def dress_crown():
    """machined crown with two intake + two exhaust valve reliefs (bump only)"""
    m = bpy.data.materials["piston_crown"]
    nt = m.node_tree
    P = principled(m)
    N = nt.nodes.new
    L = nt.links.new
    tc = N("ShaderNodeTexCoord")
    # quantized GLB meshes carry their scale on the object; Cycles' object coordinates for these
    # instanced meshes come out ~2.3x the mesh units, so the factor below was calibrated on a render
    # (a half-plane test at x = 20 mm) to give metres on the crown
    k = 0.03
    om = N("ShaderNodeVectorMath"); om.operation = "SCALE"; om.inputs["Scale"].default_value = k
    L(tc.outputs["Object"], om.inputs[0])
    OBJ = om.outputs["Vector"]
    sep = N("ShaderNodeSeparateXYZ")
    L(OBJ, sep.inputs[0])
    mask = None
    # (x, y, r) in the piston's local frame (metres): intake side −Y, exhaust side +Y
    for cx, cy, r in ((0.0150, -0.0140, 0.0118), (-0.0150, -0.0140, 0.0118),
                      (0.0140, 0.0145, 0.0102), (-0.0140, 0.0145, 0.0102)):
        dx = N("ShaderNodeMath"); dx.operation = "SUBTRACT"; dx.inputs[1].default_value = cx
        dy = N("ShaderNodeMath"); dy.operation = "SUBTRACT"; dy.inputs[1].default_value = cy
        L(sep.outputs["X"], dx.inputs[0]); L(sep.outputs["Y"], dy.inputs[0])
        cxy = N("ShaderNodeCombineXYZ")
        L(dx.outputs[0], cxy.inputs["X"]); L(dy.outputs[0], cxy.inputs["Y"])
        ln = N("ShaderNodeVectorMath"); ln.operation = "LENGTH"
        L(cxy.outputs[0], ln.inputs[0])
        sm = N("ShaderNodeMapRange"); sm.interpolation_type = "SMOOTHSTEP"
        sm.inputs["From Min"].default_value = r - 0.0007
        sm.inputs["From Max"].default_value = r
        sm.inputs["To Min"].default_value = 1.0
        sm.inputs["To Max"].default_value = 0.0
        L(ln.outputs["Value"], sm.inputs["Value"])
        if mask is None:
            mask = sm.outputs["Result"]
        else:
            mx = N("ShaderNodeMath"); mx.operation = "MAXIMUM"
            L(mask, mx.inputs[0]); L(sm.outputs["Result"], mx.inputs[1])
            mask = mx.outputs[0]
    inv = N("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0
    L(mask, inv.inputs[1])
    bump = N("ShaderNodeBump"); bump.inputs["Distance"].default_value = 0.0012
    bump.inputs["Strength"].default_value = 1.0
    L(inv.outputs[0], bump.inputs["Height"])
    L(bump.outputs["Normal"], P.inputs["Normal"])
    # freshly rebuilt engine: new pistons, machined aluminium crowns with faint turning marks
    rad = N("ShaderNodeVectorMath"); rad.operation = "LENGTH"
    L(OBJ, rad.inputs[0])
    wv = N("ShaderNodeTexWave"); wv.wave_type = "RINGS"; wv.rings_direction = "Z"
    wv.inputs["Scale"].default_value = 900; wv.inputs["Distortion"].default_value = 0.4
    wv.inputs["Detail"].default_value = 2
    L(OBJ, wv.inputs["Vector"])
    nz = N("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 70; nz.inputs["Detail"].default_value = 4
    L(OBJ, nz.inputs["Vector"])
    cr = N("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].position = 0.3
    cr.color_ramp.elements[0].color = (0.46, 0.46, 0.47, 1)
    cr.color_ramp.elements[1].position = 0.8
    cr.color_ramp.elements[1].color = (0.66, 0.66, 0.67, 1)
    L(nz.outputs["Fac"], cr.inputs["Fac"])
    L(cr.outputs["Color"], P.inputs["Base Color"])
    P.inputs["Metallic"].default_value = 1.0
    rr = N("ShaderNodeMapRange")
    rr.inputs["To Min"].default_value = 0.26
    rr.inputs["To Max"].default_value = 0.31
    L(wv.outputs["Fac"], rr.inputs["Value"])
    L(rr.outputs["Result"], P.inputs["Roughness"])


def dress_bore():
    m = bpy.data.materials["bore"]
    P = principled(m)
    P.inputs["Roughness"].default_value = 0.22
    P.inputs["Anisotropic"].default_value = 0.4
    for ln in list(m.node_tree.links):
        if ln.to_socket == P.inputs["Base Color"]:
            m.node_tree.links.remove(ln)
    P.inputs["Base Color"].default_value = (0.62, 0.63, 0.64, 1)


def dress_deck():
    m = bpy.data.materials["alu_cast"]
    for n in m.node_tree.nodes:
        if n.bl_idname == "ShaderNodeNormalMap":
            n.inputs["Strength"].default_value = 0.04


dress_crown()
dress_bore()
dress_deck()

# a dark workbench under the block (only seen through the bores in the deck shots: never, but it
# grounds the bore shot's bounce light)
bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0))
floor = bpy.context.object
floor.data.materials.append(C.material("_bench", C.srgb("#1b1c1e"), 0.7))

C.cycles(spp)
sc.cycles.use_denoising = True
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Medium High Contrast"
w = bpy.data.worlds.new("w")
sc.world = w
w.use_nodes = True
wn = w.node_tree
bg = wn.nodes["Background"]
env = wn.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(LIB, "env", "garage-1k-v1.hdr"))
wn.links.new(env.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = float(a.get("env", "0.2"))


def area(loc, rot, size, energy, color=(1, 0.93, 0.85)):
    ld = bpy.data.lights.new("L", "AREA")
    ld.size = size
    ld.energy = energy
    ld.color = color
    lo = bpy.data.objects.new("L", ld)
    lo.location = loc
    lo.rotation_euler = rot
    sc.collection.objects.link(lo)
    return lo


cd = bpy.data.cameras.new("cam")
cd.sensor_width = cd.sensor_height = 36
co = bpy.data.objects.new("cam", cd)
sc.collection.objects.link(co)
sc.camera = co
sc.render.image_settings.file_format = "PNG"
sc.render.resolution_percentage = int(a.get("pct", "100"))

meta = {}
if shot.startswith("deck"):
    vertical = shot == "deck-v"
    # straight down from 0.55 m above the deck, lens chosen so the block top fills the frame
    H = 0.55
    co.location = (0, 0, DECK + H)
    co.rotation_euler = (0, 0, math.pi / 2 if vertical else 0)
    cd.sensor_fit = "HORIZONTAL"
    W_M = 0.42  # metres across the long side at deck level
    cd.lens = 36 * H / W_M
    if vertical:
        sc.render.resolution_x, sc.render.resolution_y = 760, 1900
        cd.sensor_fit = "VERTICAL"
        cd.lens = 36 * H / W_M
    else:
        sc.render.resolution_x, sc.render.resolution_y = 1900, 760
    # work lamp above + a warm grazing light from the exhaust side into the bores
    # raking key from the exhaust side (shows the valve reliefs, lights one flank of each bore),
    # soft cool fill from the intake side
    key = area((0.02, 0.42, DECK + 0.30), (0, 0, 0), 0.22, float(a.get("key", "9")), (1, 0.9, 0.78))
    key.rotation_euler = (Vector((0, 0, DECK)) - key.location).to_track_quat("-Z", "Y").to_euler()
    fill = area((-0.1, -0.5, DECK + 0.5), (0, 0, 0), 0.6, float(a.get("fill", "3")), (0.8, 0.88, 1))
    fill.rotation_euler = (Vector((0, 0, DECK)) - fill.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.view_layer.update()
    rx, ry = sc.render.resolution_x, sc.render.resolution_y
    bores = []
    for xc in XC[::-1]:  # left → right (desktop) / top → bottom (phone) = cylinder 4 … 1
        c = world_to_camera_view(sc, co, Vector((xc, 0, DECK)))
        e = world_to_camera_view(sc, co, Vector((xc + BORE / 2, 0, DECK)))
        e2 = world_to_camera_view(sc, co, Vector((xc, BORE / 2, DECK)))
        r = max(abs(e.x - c.x) * rx, abs(e.y - c.y) * ry, abs(e2.x - c.x) * rx, abs(e2.y - c.y) * ry)
        bores.append([round(c.x * rx, 1), round((1 - c.y) * ry, 1)])
    if vertical:
        bores.sort(key=lambda b: b[1])
    else:
        bores.sort(key=lambda b: b[0])
    meta = {"w": rx, "h": ry, "r": round(r, 1), "bores": bores}
else:  # bore: close above cylinder 2 (x = 0.044), straight down its bore at the crown
    xc = XC[1]
    co.location = (xc, 0.0, DECK + 0.13)
    co.rotation_euler = (0, 0, math.radians(90))
    cd.sensor_fit = "HORIZONTAL"
    cd.lens = 40
    sc.render.resolution_x, sc.render.resolution_y = 1600, 1600
    # a warm lamp just off-axis (like a torch held over the bore) + cool fill
    key = area((xc + 0.02, 0.30, DECK + 0.22), (0, 0, 0), 0.12, float(a.get("key", "5")), (1, 0.88, 0.74))
    key.rotation_euler = (Vector((xc, 0, DECK - 0.04)) - key.location).to_track_quat("-Z", "Y").to_euler()
    fill = area((xc - 0.1, -0.4, DECK + 0.4), (0, 0, 0), 0.5, float(a.get("fill", "2")), (0.8, 0.88, 1))
    fill.rotation_euler = (Vector((xc, 0, DECK)) - fill.location).to_track_quat("-Z", "Y").to_euler()

sc.view_settings.exposure = float(a.get("exp", "0"))
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
if meta:
    with open(out.rsplit(".", 1)[0] + ".json", "w") as f:
        json.dump(meta, f)
print("done", out, meta)
