"""kurumsal-cekici: Cycles hero still built only from lib3d assets (replaces the stock tow-truck photo, which carried
a truck maker's badge and an operator's wordmark). The `truck` tractor with the `tow_bed` bolted on (same transform,
fifth wheel hidden, bed in transport position) carries the lib3d `car`, strapped over its tyres, on a wet road at
dusk: dusk HDRI (highway_bridge_sunset, CC0) for sky and reflections, amber beacons, work lights and headlamps on.
No badges, wordmarks or plates with text: the assets carry none. Shown on the page as a representative 3D image.

Two framings, same scene:
  genis  1920x1200 landscape for desktop: rig in the right half, left half kept calm for the headline
  dar     1000x2750 portrait for phones (the hero box is ~0.3 wide:tall): rig small, centred, a little below the middle
  kare    1200x1200 square, rig centred: the "Yoldan" gallery tile

  assets3d/lock.sh /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      --python presets/kurumsal-cekici/render_cycles.py -- --out /tmp/kcek [--only genis|dar] [--spp 160] [--pct 100]

then (cwebp):  cwebp -q 85 /tmp/kcek/genis.png -o public/img/kurumsal-cekici/hero-3d.webp
               cwebp -q 82 /tmp/kcek/dar.png   -o public/img/kurumsal-cekici/hero-3d-dar.webp
               cwebp -q 82 /tmp/kcek/kare.png  -o public/img/kurumsal-cekici/galeri-3d.webp
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
OUT = a.get("out", "/tmp/kcek")
spp = int(a.get("spp", "160"))
pct = int(a.get("pct", "100"))
only = set(filter(None, a.get("only", "").split(",")))
os.makedirs(OUT, exist_ok=True)
LIB = os.path.join(ROOT, "public", "lib3d")
man = json.load(open(os.path.join(LIB, "manifest.json")))

C.reset()
sc = bpy.context.scene


def load(asset, tag):
    """import one published GLB; its materials get a '<tag>_' prefix so same-named materials stay apart."""
    before = set(sc.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(LIB, man["assets"][asset]["hi"]["file"]))
    new = [o for o in sc.objects if o not in before]
    seen = set()
    for o in new:
        for ms in o.material_slots:
            m = ms.material
            if m and m not in seen:
                seen.add(m)
                m.name = f"{tag}_{m.name.split('.')[0]}"
    return new, {o.name.split(".")[0]: o for o in new}


def principled(m):
    return next((n for n in m.node_tree.nodes if n.bl_idname == "ShaderNodeBsdfPrincipled"), None) if m and m.node_tree else None


def set_mat(name, **kw):
    m = bpy.data.materials.get(name)
    P = principled(m)
    if not P:
        print("no material", name)
        return
    for k, v in kw.items():
        sock = P.inputs.get(k)
        if sock is None:
            continue
        for ln in list(m.node_tree.links):
            if ln.to_socket == sock:
                m.node_tree.links.remove(ln)
        sock.default_value = v


def glow(name, color, strength):
    set_mat(name, **{"Emission Color": (*C.srgb(color), 1), "Emission Strength": strength})


# --- the rig ------------------------------------------------------------------------------------
truck, tn = load("truck", "tr")
bed, bn = load("tow_bed", "tb")
car, cn = load("car", "car")
for o in [tn["fifth_wheel"]] + list(tn["fifth_wheel"].children_recursive):
    o.hide_render = True

CAR_X = float(a.get("car_x", "-1.78"))
DECK = 1.328 + 0.004
for o in car:
    if o.parent is None:
        o.location += Vector((CAR_X, 0, DECK))
bpy.context.view_layer.update()

# paint: white cab, hi-vis lime bed (the site's accent), deep red car
set_mat("tr_paint", **{"Base Color": (*C.srgb(a.get("cab", "#e9ecef")), 1), "Roughness": 0.3, "Coat Weight": 0.8,
                        "Coat Roughness": 0.05})
set_mat("tb_paint", **{"Base Color": (*C.srgb(a.get("bedc", "#b9d62a")), 1), "Roughness": 0.34, "Coat Weight": 0.5})
set_mat("car_paint", **{"Base Color": (*C.srgb(a.get("carc", "#7d1016")), 1), "Metallic": 0.55, "Roughness": 0.3,
                         "Coat Weight": 1.0, "Coat Roughness": 0.03})
# lights on
glow("tr_light_head", "#fff4e0", 40)
glow("tr_light_amber", "#ffa21a", 18)
glow("tr_light_tail", "#ff1a10", 10)
glow("tb_light_amber", "#ffa21a", 60)
glow("tb_light_head", "#fff4e0", 30)
glow("tb_light_tail", "#ff1a10", 10)
glow("car_light_tail", "#ff1a10", 1.5)


def bbox(objs):
    lo = Vector((1e9,) * 3)
    hi = Vector((-1e9,) * 3)
    for o in objs:
        for s in [o] + list(o.children_recursive):
            if s.type == "MESH" and not s.hide_render:
                for c in s.bound_box:
                    w = s.matrix_world @ Vector(c)
                    lo = Vector(map(min, lo, w))
                    hi = Vector(map(max, hi, w))
    return lo, hi


def add_light(kind, loc, energy, color, size=0.1, target=None, spot=None, cam=False):
    ld = bpy.data.lights.new("L", kind)
    ld.energy = energy
    ld.color = C.srgb(color)
    if kind in ("POINT", "SPOT"):
        ld.shadow_soft_size = size
    if kind == "AREA":
        ld.size = size
    if spot:
        ld.spot_size = math.radians(spot)
        ld.spot_blend = 0.6
    lo = bpy.data.objects.new("L", ld)
    lo.location = loc
    if target is not None:
        lo.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    lo.visible_camera = cam
    sc.collection.objects.link(lo)
    return lo


# beacons on the headboard light bar: warm amber pools on the deck and the car roof
lb_lo, lb_hi = bbox([bn["light_bar"]]) if "light_bar" in bn else (Vector((0.6, -1, 2.4)), Vector((0.8, 1, 2.45)))
for y in (lb_lo.y + 0.12, lb_hi.y - 0.12):
    add_light("POINT", ((lb_lo.x + lb_hi.x) / 2, y, lb_hi.z + 0.05), float(a.get("beacon", "70")), "#ffa21a", 0.06)
# headlamp beams on the road
hl_lo, hl_hi = bbox([tn["headlamps"]])
for y in (hl_lo.y + 0.2, hl_hi.y - 0.2):
    p = Vector((hl_hi.x + 0.05, y, (hl_lo.z + hl_hi.z) / 2))
    add_light("SPOT", p, float(a.get("beam", "900")), "#fff1dc", 0.08, target=p + Vector((12, 0, -1.1)), spot=46)

# wheel straps: yellow ribbons over the car's tyres, anchored to the deck
m_strap = C.material("_strap", C.srgb("#e7b50f"), 0.62)
for w in ("wheel_FL", "wheel_FR", "wheel_RL", "wheel_RR"):
    o = cn.get(w)
    if not o:
        continue
    lo, hi = bbox([o])
    cen = (lo + hi) / 2
    r = (hi.z - lo.z) / 2 + 0.008
    yo = hi.y + 0.004 if cen.y > 0 else lo.y - 0.004  # outer shoulder only: the strap runs over the tread edge
    yc = (lo.y + hi.y) / 2
    bm = bmesh.new()
    path = [Vector((cen.x + 0.42, yc, DECK + 0.004))]
    for k in range(15):
        t = math.radians(28 + (152 - 28) * k / 14)
        path.append(Vector((cen.x + r * math.cos(t), yc, cen.z + r * math.sin(t))))
    path.append(Vector((cen.x - 0.42, yc, DECK + 0.004)))
    half = 0.028
    rows = [(bm.verts.new(p + Vector((0, -half, 0))), bm.verts.new(p + Vector((0, half, 0)))) for p in path]
    for (a0, b0), (a1, b1) in zip(rows, rows[1:]):
        bm.faces.new((a0, b0, b1, a1))
    st = C.obj("_strap_" + w, bm, m_strap, smooth=True)
    st.modifiers.new("s", "SOLIDIFY").thickness = 0.004

# --- road -----------------------------------------------------------------------------------------
def asphalt():
    m = bpy.data.materials.new("_asphalt")
    m.use_nodes = True
    nt = m.node_tree
    P = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    fine = nt.nodes.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = 420
    fine.inputs["Detail"].default_value = 2
    wet = nt.nodes.new("ShaderNodeTexNoise")
    wet.inputs["Scale"].default_value = 0.22
    wet.inputs["Detail"].default_value = 4
    wet.inputs["Roughness"].default_value = 0.62
    nt.links.new(tc.outputs["Object"], fine.inputs["Vector"])
    nt.links.new(tc.outputs["Object"], wet.inputs["Vector"])
    # colour: dark grey grit
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = (*C.srgb("#17181a"), 1)
    cr.color_ramp.elements[1].color = (*C.srgb("#3a3b3e"), 1)
    nt.links.new(fine.outputs["Fac"], cr.inputs["Fac"])
    # puddles: glossy wet patches where the large noise is high (darker, near-mirror)
    pr = nt.nodes.new("ShaderNodeValToRGB")
    pr.color_ramp.elements[0].position = 0.5
    pr.color_ramp.elements[1].position = 0.62
    nt.links.new(wet.outputs["Fac"], pr.inputs["Fac"])
    rough = nt.nodes.new("ShaderNodeMapRange")
    rough.inputs["To Min"].default_value = 0.62
    rough.inputs["To Max"].default_value = 0.06
    nt.links.new(pr.outputs["Color"], rough.inputs["Value"])
    nt.links.new(rough.outputs["Result"], P.inputs["Roughness"])
    dark = nt.nodes.new("ShaderNodeMix")
    dark.data_type = "RGBA"
    dark.blend_type = "MULTIPLY"
    nt.links.new(pr.outputs["Color"], dark.inputs["Factor"])
    nt.links.new(cr.outputs["Color"], dark.inputs["A"])
    dark.inputs["B"].default_value = (0.45, 0.45, 0.47, 1)
    nt.links.new(dark.outputs["Result"], P.inputs["Base Color"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.18
    bump.inputs["Distance"].default_value = 0.002
    nt.links.new(fine.outputs["Fac"], bump.inputs["Height"])
    inv = nt.nodes.new("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.inputs[0].default_value = 1.0
    nt.links.new(pr.outputs["Color"], inv.inputs[1])
    nt.links.new(inv.outputs[0], bump.inputs["Strength"])
    nt.links.new(bump.outputs["Normal"], P.inputs["Normal"])
    return m


bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=160)
road = C.obj("_road", bm, asphalt(), smooth=False)
# lane paint: dashed centre line on the truck's left, solid edge line on its right
m_line = C.material("_line", C.srgb("#d9d6cc"), 0.55)
bm = bmesh.new()
for i in range(-14, 14):
    C.box((3.0, 0.14, 0.004), loc=(i * 9.0 + 1.0, 2.05, 0.002), bm=bm)
C.box((300, 0.16, 0.004), loc=(0, -1.95, 0.002), bm=bm)
C.box((300, 0.16, 0.004), loc=(0, 6.05, 0.002), bm=bm)
C.obj("_lines", bm, m_line, smooth=False)
# kerb + pavement beyond the edge line (catches a little light, gives the road an edge)
m_kerb = C.material("_kerb", C.srgb("#6b6a66"), 0.8)
bm = C.box((300, 0.22, 0.16), loc=(0, -3.3, 0.08), bevel=0.02)
C.box((300, 3.0, 0.14), loc=(0, -4.9, 0.07), bm=bm)
C.obj("_kerb", bm, m_kerb, smooth=False)
# verge beyond the pavement: dry, dark, rough (else the wet asphalt plane reads as a lake up to the horizon)
m_verge = C.material("_verge", C.srgb("#1d1f18"), 0.95)
bm = C.box((320, 150, 0.1), loc=(0, -6.4 - 75, 0.09))
C.obj("_verge", bm, m_verge, smooth=False)
# street lamps along the pavement behind the rig: sodium heads, out of focus in the background
m_pole = C.material("_pole", C.srgb("#3a3d42"), 0.5, metal=0.6)
m_sod = C.material("_sodium", C.srgb("#ffb35c"), 0.4, emission=(C.srgb("#ffa040"), 1.0))
glow("_sodium", "#ffa040", float(a.get("sodium", "40")))
bm_p = bmesh.new()
bm_h = bmesh.new()
for i in range(-5, 6):
    x = i * 28.0 + 9.0
    C.cyl(0.07, 8.0, 12, loc=(x, -4.3, 4.0), bm=bm_p)
    C.box((1.4, 0.08, 0.08), loc=(x, -3.65, 7.95), bm=bm_p)
    C.box((0.55, 0.22, 0.08), loc=(x, -3.05, 7.9), bm=bm_h)
C.obj("_poles", bm_p, m_pole, smooth=False)
C.obj("_lamps", bm_h, m_sod, smooth=False)
for i in range(-2, 3):
    add_light("SPOT", (i * 28.0 + 9.0, -3.05, 7.8), float(a.get("lamp", "2500")), "#ffac55", 0.2,
              target=(i * 28.0 + 9.0, -1.0, 0), spot=110)

# --- world, render ------------------------------------------------------------------------------------
C.cycles(spp)
sc.cycles.use_denoising = True
sc.cycles.max_bounces = 8
sc.render.film_transparent = False
w = bpy.data.worlds.new("w")
sc.world = w
w.use_nodes = True
wn = w.node_tree
bg = wn.nodes["Background"]
env = wn.nodes.new("ShaderNodeTexEnvironment")
env.image = bpy.data.images.load(os.path.join(LIB, "env", "dusk-1k-v1.hdr"))
tc = wn.nodes.new("ShaderNodeTexCoord")
mp = wn.nodes.new("ShaderNodeMapping")
mp.inputs["Rotation"].default_value = (0, 0, math.radians(float(a.get("rot", "60"))))
wn.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
wn.links.new(mp.outputs["Vector"], env.inputs["Vector"])
wn.links.new(env.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = float(a.get("env", "0.2"))
sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "AgX - Medium High Contrast"
sc.view_settings.exposure = float(a.get("exposure", "-0.8"))
# a cool street-light key from high front-left and a warm rim from behind (sunset side)
add_light("AREA", (7, 9, 9), float(a.get("key", "1200")), "#c9d6ff", 5, target=(-0.8, 0, 1.2))
add_light("AREA", (-12, -3, 4), float(a.get("rim", "1800")), "#ffb070", 6, target=(-0.8, 0, 1.6))

cd = bpy.data.cameras.new("cam")
cd.dof.use_dof = True
co = bpy.data.objects.new("cam", cd)
sc.collection.objects.link(co)
sc.camera = co
sc.render.image_settings.file_format = "PNG"
sc.render.image_settings.color_mode = "RGB"
sc.render.resolution_percentage = pct

# framings: camera position, target, lens mm, lens shift, resolution
SHOTS = {
    "genis": dict(cam=(7.5, 14.5, 1.35), tgt=(-0.9, 0.0, 1.7), lens=27.5, shift=(-0.215, 0.0), res=(1920, 1200), f=4.0),
    "dar": dict(cam=(13.3, 11.0, 1.0), tgt=(-0.9, 0.0, 1.75), lens=20, shift=(-0.025, 0.095), res=(1000, 2750), f=8.0),
    "kare": dict(cam=(7.5, 14.5, 1.35), tgt=(-0.7, 0.0, 1.5), lens=56, shift=(0.0, 0.0), res=(1200, 1200), f=4.0),
}
for name, s in SHOTS.items():
    if only and name not in only:
        continue
    for k in ("cam", "tgt"):
        v = a.get(f"{name}_{k}")
        if v:
            s[k] = tuple(float(x) for x in v.split(","))
    co.location = s["cam"]
    co.rotation_euler = (Vector(s["tgt"]) - Vector(s["cam"])).to_track_quat("-Z", "Y").to_euler()
    cd.lens = float(a.get(f"{name}_lens", s["lens"]))
    cd.sensor_fit = "AUTO"
    cd.shift_x, cd.shift_y = s["shift"]
    cd.dof.focus_distance = (Vector(s["tgt"]) - Vector(s["cam"])).length
    cd.dof.aperture_fstop = s["f"]
    sc.render.resolution_x, sc.render.resolution_y = s["res"]
    sc.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)
    print("done", sc.render.filepath)
