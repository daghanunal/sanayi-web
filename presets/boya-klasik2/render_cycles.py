"""boya-klasik2: Cycles stills of the lib3d car in a paint booth, for the four-layer hero and the colour picker.

  layer shots (same camera, same light, only the body material changes):
    sac     bare steel after sanding: random-orbit swirl scratches, grinder marks, a filler patch
    astar   grey 2K filler primer, wet-sanded (matte, fine orange peel)
    boya    base coat, no clear yet (satin, slightly flat)
    vernik  base coat + 2 coats of clear (clearcoat, booth light strips reflect sharp)
  colour shots: --layer vernik --color '#rrggbb'

  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      --python presets/boya-klasik2/render_cycles.py -- --layer vernik --color '#ff4d1a' --out /tmp/bk2/v.png
  (see render.sh: PNG -> JPEG/WebP into public/img/boya-klasik2/)
  Representative 3D images: the site footer says so ("3D görseller temsilîdir").
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
layer = a.get("layer", "vernik")
color = a.get("color", "#ff4d1a")
out = a.get("out", f"/tmp/bk2/{layer}.png")
spp = int(a.get("spp", "192"))
res = tuple(int(v) for v in a.get("res", "1200x1600").split("x"))
os.makedirs(os.path.dirname(out), exist_ok=True)

LIB = os.path.join(ROOT, "public", "lib3d")
man = json.load(open(os.path.join(LIB, "manifest.json")))
C.reset()
sc = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=os.path.join(LIB, man["assets"]["car"]["hi"]["file"]))


def principled(m):
    return next(n for n in m.node_tree.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled")


def clear_links(m, sock):
    for ln in list(m.node_tree.links):
        if ln.to_socket == sock:
            m.node_tree.links.remove(ln)


paint = bpy.data.materials["paint"]
P = principled(paint)
nt = paint.node_tree
N, L = nt.nodes.new, nt.links.new
for s in ("Base Color", "Roughness", "Metallic", "Normal", "Coat Weight", "Coat Roughness"):
    clear_links(paint, P.inputs[s])
tc = N("ShaderNodeTexCoord")
OBJ = tc.outputs["Object"]


def noise(scale, detail=2.0, rough=0.5, vec=None):
    n = N("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = scale
    n.inputs["Detail"].default_value = detail
    n.inputs["Roughness"].default_value = rough
    L(vec or OBJ, n.inputs["Vector"])
    return n.outputs["Fac"]


def bump(height, dist, strength=1.0, normal=None):
    b = N("ShaderNodeBump")
    b.inputs["Distance"].default_value = dist
    b.inputs["Strength"].default_value = strength
    L(height, b.inputs["Height"])
    if normal is not None:
        L(normal, b.inputs["Normal"])
    return b.outputs["Normal"]


def ramp(fac, stops):
    r = N("ShaderNodeValToRGB")
    els = r.color_ramp.elements
    for i, (pos, col) in enumerate(stops):
        e = els[i] if i < len(els) else els.new(pos)
        e.position = pos
        e.color = col
    L(fac, r.inputs["Fac"])
    return r.outputs["Color"]


def maprange(v, a0, a1, b0, b1):
    m = N("ShaderNodeMapRange")
    m.inputs["From Min"].default_value = a0
    m.inputs["From Max"].default_value = a1
    m.inputs["To Min"].default_value = b0
    m.inputs["To Max"].default_value = b1
    L(v, m.inputs["Value"])
    return m.outputs["Result"]


if layer == "sac":
    # bare steel: random-orbit sander swirls (stretched noise in many small cells) + grinder streaks,
    # a feathered body-filler patch low on the rear quarter
    P.inputs["Metallic"].default_value = 1.0
    swirl_v = N("ShaderNodeMapping")
    swirl_v.inputs["Scale"].default_value = (1.0, 1.0, 1.0)
    L(OBJ, swirl_v.inputs["Vector"])
    vor = N("ShaderNodeTexVoronoi")
    vor.inputs["Scale"].default_value = 26
    L(OBJ, vor.inputs["Vector"])
    # distorted lines: wave texture in rings, per-voronoi-cell offset -> overlapping orbital marks
    wv = N("ShaderNodeTexWave")
    wv.wave_type = "RINGS"
    wv.rings_direction = "SPHERICAL"
    wv.inputs["Scale"].default_value = 420
    wv.inputs["Distortion"].default_value = 6
    wv.inputs["Detail"].default_value = 3
    wv.inputs["Detail Scale"].default_value = 3
    add = N("ShaderNodeVectorMath")
    add.operation = "ADD"
    L(OBJ, add.inputs[0])
    L(vor.outputs["Color"], add.inputs[1])
    L(add.outputs[0], wv.inputs["Vector"])
    scratch = maprange(wv.outputs["Fac"], 0.55, 1.0, 0.0, 1.0)
    grain = noise(900, 4, 0.7)
    h = N("ShaderNodeMath")
    h.operation = "ADD"
    L(scratch, h.inputs[0])
    L(grain, h.inputs[1])
    P.inputs["Anisotropic"].default_value = 0.0
    nrm = bump(h.outputs[0], 0.00012, 0.35)
    L(nrm, P.inputs["Normal"])
    # blotchy tone: fresh steel is lighter where the grinder went, darker oxide film elsewhere
    tone = ramp(noise(3.5, 5, 0.6), [(0.35, (0.36, 0.37, 0.38, 1)), (0.7, (0.56, 0.57, 0.58, 1))])
    # filler patch (macun): a soft blob, matte pinkish grey
    blob = noise(2.2, 2, 0.5)
    patch = maprange(blob, 0.70, 0.72, 0.0, 1.0)
    mixc = N("ShaderNodeMix")
    mixc.data_type = "RGBA"
    L(patch, mixc.inputs["Factor"])
    L(tone, mixc.inputs[6])
    mixc.inputs[7].default_value = (0.55, 0.50, 0.47, 1)
    L(mixc.outputs[2], P.inputs["Base Color"])
    met = maprange(patch, 0, 1, 1.0, 0.0)
    L(met, P.inputs["Metallic"])
    rough = maprange(scratch, 0, 1, 0.24, 0.38)
    rmix = N("ShaderNodeMix")
    rmix.data_type = "FLOAT"
    L(patch, rmix.inputs["Factor"])
    L(rough, rmix.inputs[2])
    rmix.inputs[3].default_value = 0.8
    L(rmix.outputs[0], P.inputs["Roughness"])
    P.inputs["Coat Weight"].default_value = 0.0
elif layer == "astar":
    P.inputs["Base Color"].default_value = (*C.srgb("#8f928f"), 1)
    P.inputs["Metallic"].default_value = 0.0
    L(maprange(noise(60, 3, 0.6), 0, 1, 0.62, 0.78), P.inputs["Roughness"])
    L(bump(noise(420, 3, 0.55), 0.00006, 0.5), P.inputs["Normal"])
    P.inputs["Coat Weight"].default_value = 0.0
    P.inputs["Specular IOR Level"].default_value = 0.35
else:
    base = (*C.srgb(color), 1)
    P.inputs["Base Color"].default_value = base
    P.inputs["Metallic"].default_value = 0.0
    peel = noise(260, 2, 0.5)
    if layer == "boya":
        # base coat without clear: satin, a touch dusty
        L(maprange(noise(40, 2, 0.5), 0, 1, 0.42, 0.5), P.inputs["Roughness"])
        L(bump(peel, 0.00004, 0.4), P.inputs["Normal"])
        P.inputs["Coat Weight"].default_value = 0.0
        P.inputs["Specular IOR Level"].default_value = 0.4
    else:
        P.inputs["Roughness"].default_value = 0.32
        P.inputs["Coat Weight"].default_value = 1.0
        P.inputs["Coat Roughness"].default_value = 0.02
        P.inputs["Coat IOR"].default_value = 1.5
        L(bump(peel, 0.00002, 0.25), P.inputs["Coat Normal"])

# before the clear coat is on, glass and lamps are masked with paper + tape, the plates are off
for o in list(sc.objects):
    if o.type == "MESH" and any(ms.material and ms.material.name.startswith("plate") for ms in o.material_slots):
        if all(ms.material and ms.material.name.startswith("plate") for ms in o.material_slots):
            o.hide_render = True
# the plate backing takes the body finish (plates are off in the booth)
for o in sc.objects:
    if o.type == "MESH":
        for ms in o.material_slots:
            if ms.material and ms.material.name.startswith("plate"):
                ms.link = "OBJECT"
                ms.material = paint
if layer == "vernik" and "light_tail" in bpy.data.materials:
    lt = principled(bpy.data.materials["light_tail"])
    lt.inputs["Emission Strength"].default_value = float(a.get("tail", "3"))
if layer != "vernik":
    mp = bpy.data.materials.new("_masking_paper")
    mp.use_nodes = True
    mpn = mp.node_tree
    mpp = principled(mp)
    mpp.inputs["Roughness"].default_value = 0.85
    t2 = mpn.nodes.new("ShaderNodeTexCoord")
    nz = mpn.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 9
    nz.inputs["Detail"].default_value = 8
    nz.inputs["Roughness"].default_value = 0.62
    mpn.links.new(t2.outputs["Object"], nz.inputs["Vector"])
    cr = mpn.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = (*C.srgb("#b99b72"), 1)
    cr.color_ramp.elements[1].color = (*C.srgb("#d8c3a0"), 1)
    mpn.links.new(nz.outputs["Fac"], cr.inputs["Fac"])
    mpn.links.new(cr.outputs["Color"], mpp.inputs["Base Color"])
    bb = mpn.nodes.new("ShaderNodeBump")
    bb.inputs["Distance"].default_value = 0.004
    bb.inputs["Strength"].default_value = 0.9
    mpn.links.new(nz.outputs["Fac"], bb.inputs["Height"])
    mpn.links.new(bb.outputs["Normal"], mpp.inputs["Normal"])
    MASK = ("glass", "lamp_glass", "tail_lens", "light_tail", "light_head", "reflector", "lamp_housing")
    for o in sc.objects:
        if o.type != "MESH":
            continue
        for ms in o.material_slots:
            if ms.material and ms.material.name in MASK:
                ms.link = "OBJECT"
                ms.material = mp

# --- paint booth ---------------------------------------------------------------------------------
W, D, H = 10.0, 16.0, 3.6
floor_m = C.material("_floor", C.srgb("#6b6d6c"), 0.42)
fn = floor_m.node_tree
fp = principled(floor_m)
fg = fn.nodes.new("ShaderNodeTexCoord")
bricks = fn.nodes.new("ShaderNodeTexBrick")  # booth floor grating
bricks.inputs["Scale"].default_value = 70
bricks.inputs["Mortar Size"].default_value = 0.12
bricks.inputs["Brick Width"].default_value = 0.5
bricks.inputs["Row Height"].default_value = 0.5
bricks.inputs["Color1"].default_value = (0.085, 0.087, 0.09, 1)
bricks.inputs["Color2"].default_value = (0.095, 0.097, 0.1, 1)
bricks.inputs["Mortar"].default_value = (0.03, 0.03, 0.032, 1)
bricks.offset = 0.0
fn.links.new(fg.outputs["Object"], bricks.inputs["Vector"])
fn.links.new(bricks.outputs["Color"], fp.inputs["Base Color"])
fb = fn.nodes.new("ShaderNodeBump")
fb.inputs["Strength"].default_value = 0.5
fn.links.new(bricks.outputs["Fac"], fb.inputs["Height"])
fn.links.new(fb.outputs["Normal"], fp.inputs["Normal"])
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0))
fl = bpy.context.object
fl.scale = (D, W, 1)
fl.data.materials.append(floor_m)

wall_m = C.material("_wall", C.srgb(a.get("wall", "#b9bbb8")), 0.8)
for loc, rot, sc_ in (((0, W / 2, H / 2), (math.pi / 2, 0, 0), (D, H, 1)),
                      ((0, -W / 2, H / 2), (math.pi / 2, 0, 0), (D, H, 1)),
                      ((-D / 2, 0, H / 2), (math.pi / 2, 0, math.pi / 2), (W, H, 1)),
                      ((D / 2, 0, H / 2), (math.pi / 2, 0, math.pi / 2), (W, H, 1))):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.scale = sc_
    o.data.materials.append(wall_m)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, H))
ce = bpy.context.object
ce.scale = (D, W, 1)
ce.data.materials.append(C.material("_ceil", C.srgb("#a8aaa7"), 0.8))

# ceiling light rows: long diffuser panels along the car (the reflections every booth photo has)
lm = bpy.data.materials.new("_panel")
lm.use_nodes = True
ln = lm.node_tree
em = ln.nodes.new("ShaderNodeEmission")
em.inputs["Strength"].default_value = float(a.get("panel", "10"))
em.inputs["Color"].default_value = (1.0, 0.98, 0.95, 1)
ln.links.new(em.outputs[0], ln.nodes["Material Output"].inputs["Surface"])
for y in (-1.7, 0.0, 1.7):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, y, H - 0.02))
    p = bpy.context.object
    p.scale = (7.5, 0.36, 1)
    p.rotation_euler = (math.pi, 0, 0)
    p.data.materials.append(lm)
# wall light strips (booth side lights, angled down) along the whole length, and two on the back wall
for y in (-W / 2 + 0.03, W / 2 - 0.03):
    for z in (1.1, 2.4):
        bpy.ops.mesh.primitive_plane_add(size=1, location=(0, y, z))
        p = bpy.context.object
        p.scale = (D - 1.5, 0.3, 1)
        p.rotation_euler = (math.pi / 2 + (0.35 if y > 0 else -0.35), 0, 0)
        p.data.materials.append(lm)
for z in (1.1, 2.4):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(-D / 2 + 0.03, 0, z))
    p = bpy.context.object
    p.scale = (0.3, W - 1.5, 1)
    p.rotation_euler = (0, math.pi / 2, 0)
    p.data.materials.append(lm)

C.cycles(spp)
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 8
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = a.get("look", "AgX - Medium High Contrast")
w = bpy.data.worlds.new("w")
sc.world = w
w.use_nodes = True
w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0

# camera: rear three-quarter from the car's left, low, portrait
cd = bpy.data.cameras.new("cam")
cd.sensor_fit = "VERTICAL"
cd.sensor_height = 24
cd.lens = float(a.get("lens", "50"))
co = bpy.data.objects.new("cam", cd)
sc.collection.objects.link(co)
sc.camera = co
cam = Vector(tuple(float(v) for v in a.get("cam", "-4.6,2.9,1.05").split(",")))
tgt = Vector(tuple(float(v) for v in a.get("tgt", "-0.9,0.1,0.62").split(",")))
co.location = cam
co.rotation_euler = (tgt - cam).to_track_quat("-Z", "Y").to_euler()
cd.shift_y = float(a.get("shift", "0"))
cd.dof.use_dof = True
cd.dof.focus_distance = (tgt - cam).length
cd.dof.aperture_fstop = float(a.get("fstop", "5.6"))

sc.render.resolution_x, sc.render.resolution_y = res
sc.render.resolution_percentage = int(a.get("pct", "100"))
sc.render.image_settings.file_format = "PNG"
sc.view_settings.exposure = float(a.get("exp", "0"))
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print("done", out)
