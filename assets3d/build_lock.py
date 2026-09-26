"""Pin-tumbler lock cylinder (brass, 30 mm body, 60 mm long) with its key, built cutaway-ready: the housing
and the plug are split in two halves along the vertical plane through the axis, so a site can hide the front
halves and show the pin stacks (key pins at the shear line when the key is in, driver pins, springs).

  Blender -b --factory-startup --python assets3d/build_lock.py -- --q hi --out /tmp/lock-hi.glb

three.js space: lock axis along X, the key enters from +X (face of the lock at x = +0.03), pins point up (+Y).
Nodes: lock > housing > housing_front (the +Z half, faces the default camera), housing_back, driver_1..5, spring_1..5
            plug (rotates about local X) > plug_front, plug_back, key_pin_1..5, key (slides along local +X) > key_blade, key_head
extras.explode: housing halves apart along Z, drivers/springs up, key pins up (less), key out along +X.
Materials: brass (housing/plug), pin_brass, pin_steel, spring, key_metal (nickel silver), key_plastic.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bmesh
import bpy
from mathutils import Matrix, Vector

import common as C
import texgen as T

R_H = 0.0150  # housing radius
R_P = 0.0086  # plug radius (shear line)
L_H = 0.060
X_FACE = 0.030
BIB = 0.0105  # "bible" (pin tower) height above the housing top
PIN_R = 0.00145
NPIN = 5
PITCH = 0.0082
PIN_X = [X_FACE - 0.010 - i * PITCH for i in range(NPIN)]
CUTS = [0.0034, 0.0012, 0.0026, 0.0004, 0.0021]  # key blade top height (from the axis) under each pin
BLADE_TOP, BLADE_BOT = 0.0040, -0.0042


def mats(q):
    hi = q == "hi"
    n = 256
    ba, bo, bn = T.brushed(n, seed=41, lum=1.0, rough=0.26)
    col = C.srgb("#c9a45c")
    C.material("brass", col, 0.28, 1.0, normal=C.image("brass_n", bn, False), normal_strength=0.25, vcol=True, uv_scale=(3, 40))
    C.material("pin_brass", C.srgb("#d6b36a"), 0.22, 1.0, vcol=True)
    C.material("pin_steel", C.srgb("#b8bcc2"), 0.2, 1.0, vcol=True)
    C.material("spring", C.srgb("#8f9399"), 0.3, 1.0)
    C.material("key_metal", C.srgb("#cfccc4"), 0.24, 1.0, vcol=True)
    C.material("key_plastic", C.srgb("#141416"), 0.42, 0.0, coat=0.4, coat_rough=0.2, vcol=True)
    C.material("cut_face", C.srgb("#e3c27c"), 0.5, 1.0, vcol=True)


def halves(ob, name, hi):
    """split a closed solid by the XZ plane (Blender y=0) into two capped halves: y<0 -> '_front' (three +Z)"""
    out = {}
    for side, keep_neg in (("front", True), ("back", False)):
        o = ob.copy()
        o.data = ob.data.copy()
        bpy.context.scene.collection.objects.link(o)
        bm = bmesh.new()
        bm.from_mesh(o.data)
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, 0), plane_no=(0, 1, 0),
                                     clear_outer=keep_neg, clear_inner=not keep_neg)
        edges = [e for e in res["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
        # cap the cut: the cut face shows machined brass
        if edges:
            f = bmesh.ops.edgenet_fill(bm, edges=edges) if False else bmesh.ops.triangle_fill(bm, edges=edges, use_beauty=True)
            for g in f["geom"]:
                if isinstance(g, bmesh.types.BMFace):
                    g.material_index = 1
                    g.smooth = False
            for e in edges:
                e.smooth = False
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(o.data)
        bm.free()
        o.name = f"{name}_{side}"
        o.data.name = o.name
        if len(o.data.materials) < 2:
            o.data.materials.append(C.MATS["cut_face"])
        out[side] = o
    bpy.data.objects.remove(ob)
    return out


def build_housing(hi):
    seg = 64 if hi else 28
    # round body + flange at the face, keyed tail
    prof = [(0.0, -L_H / 2 + 0.03 - 0.03), (R_H - 0.0008, -L_H / 2), (R_H, -L_H / 2 + 0.0008), (R_H, X_FACE - 0.004),
            (R_H + 0.003, X_FACE - 0.0035), (R_H + 0.0034, X_FACE - 0.0012), (R_H + 0.002, X_FACE), (0.0, X_FACE)]
    b = C.lathe(prof, seg, axis="X")
    body = C.obj("housing", b, ["brass", "cut_face"], sharp=40)
    # bible (pin tower): a rounded block on top along the pin row
    tb = C.box((NPIN * PITCH + 0.008, 0.0105, BIB + 0.01), loc=((PIN_X[0] + PIN_X[-1]) / 2, 0, R_H + BIB / 2 - 0.004),
               bevel=0.0035, segs=3 if hi else 1)
    tower = C.obj("_tower", tb, ["brass"], smooth=False)
    C.boolean(body, tower, op="UNION")
    # plug bore + keyway clearance + pin chambers
    cut = bmesh.new()
    C.cyl(R_P + 0.00005, 0.2, seg, loc=(0, 0, 0), axis="X", bm=cut)
    for x in PIN_X:
        C.cyl(PIN_R + 0.00012, 0.0245, 20 if hi else 10, loc=(x, 0, 0.01225), axis="Z", bm=cut)  # sealed at the top
    C.boolean(body, C.obj("_bore", cut, ["brass"], smooth=False))
    C.cleanup(body)
    C.smooth_by_angle(body, 40)
    C.weighted_normals(body)
    return halves(body, "housing", hi)


def keyway_profile():
    """warded keyway section (y, z) in the plug face: a zig-zag slot"""
    return [(-0.0011, BLADE_TOP + 0.0006), (0.0011, BLADE_TOP + 0.0006), (0.0011, 0.0012), (0.0004, 0.0004),
            (0.0011, -0.0010), (0.0011, BLADE_BOT - 0.0005), (-0.0011, BLADE_BOT - 0.0005), (-0.0011, -0.0022),
            (-0.0004, -0.0030), (-0.0011, -0.0036)][:0] or \
        [(-0.00115, BLADE_TOP + 0.0007), (0.00115, BLADE_TOP + 0.0007), (0.00115, BLADE_BOT - 0.0006),
         (-0.00115, BLADE_BOT - 0.0006)]


def build_plug(hi):
    seg = 48 if hi else 24
    prof = [(0.0, -L_H / 2 + 0.002), (R_P - 0.0005, -L_H / 2 + 0.002), (R_P, -L_H / 2 + 0.0025), (R_P, X_FACE - 0.0005),
            (R_P - 0.0006, X_FACE + 0.0006), (0.0, X_FACE + 0.0006)]
    b = C.lathe(prof, seg, axis="X")
    plug = C.obj("plug", b, ["brass", "cut_face"], sharp=40)
    cut = bmesh.new()
    # keyway slot through the front 45 mm
    kw = C.box((0.047, 0.0023, BLADE_TOP - BLADE_BOT + 0.0013), loc=(X_FACE - 0.0225, 0, (BLADE_TOP + BLADE_BOT) / 2 + 0.00005))
    C.merge(cut, kw)
    for x in PIN_X:
        C.cyl(PIN_R + 0.00012, 0.02, 20 if hi else 10, loc=(x, 0, R_P), axis="Z", bm=cut)
    C.boolean(plug, C.obj("_kw", cut, ["brass"], smooth=False))
    C.cleanup(plug)
    C.smooth_by_angle(plug, 40)
    C.weighted_normals(plug)
    return halves(plug, "plug", hi)


def pin(x, z0, z1, mat, name, hi, point=False):
    r = PIN_R
    seg = 16 if hi else 8
    if point:  # key pin: rounded/pointed bottom riding on the key
        prof = [(0.0, z0), (r * 0.5, z0 + 0.0005), (r, z0 + 0.0011), (r, z1 - 0.0002), (r - 0.0002, z1), (0.0, z1)]
    else:
        prof = [(0.0, z0), (r - 0.0002, z0), (r, z0 + 0.0002), (r, z1 - 0.0002), (r - 0.0002, z1), (0.0, z1)]
    b = C.lathe(prof, seg, axis="Z")
    C.xform(b, loc=(x, 0, 0))
    return C.obj(name, b, [mat], sharp=40)


def spring(x, z0, z1, name, hi):
    turns = 7
    n = turns * (16 if hi else 8)
    pts = [Vector((x + math.cos(2 * math.pi * t / (n / turns)) * (PIN_R * 0.85), math.sin(2 * math.pi * t / (n / turns)) * (PIN_R * 0.85),
                   z0 + (z1 - z0) * t / n)) for t in range(n + 1)]
    return C.obj(name, C.tube(pts, 0.00022, 5 if hi else 4), ["spring"], sharp=None)


def build_key(hi):
    """blade (nickel silver) with bitting matching CUTS, shoulder stop, black plastic head (no logo)"""
    # blade side profile in XZ (from the tip at x_tip to the shoulder at X_FACE + 0.001)
    x_tip = PIN_X[-1] - 0.004
    x_sh = X_FACE + 0.0012
    top = [(x_tip, BLADE_TOP - 0.0022), (x_tip + 0.0022, BLADE_TOP)]
    for x, c in sorted(zip(PIN_X, CUTS)):
        top += [(x - 0.0017, BLADE_TOP), (x - 0.0006, c), (x + 0.0006, c), (x + 0.0017, BLADE_TOP)]
    top = [p for p in top if p[0] < x_sh]
    top += [(x_sh, BLADE_TOP), (x_sh, BLADE_TOP + 0.0030), (x_sh + 0.0060, BLADE_TOP + 0.0030)]
    bot = [(x_sh + 0.0060, BLADE_BOT - 0.0015), (x_sh, BLADE_BOT - 0.0015), (x_sh, BLADE_BOT), (x_tip + 0.0015, BLADE_BOT),
           (x_tip, BLADE_BOT + 0.0015)]
    outline = top + bot
    bm = bmesh.new()
    t = 0.00105
    fr = [bm.verts.new((x, -t, z)) for x, z in outline]
    bk = [bm.verts.new((x, t, z)) for x, z in outline]
    n = len(outline)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((fr[i], fr[j], bk[j], bk[i]))
    bm.faces.new(fr[::-1])
    bm.faces.new(bk)
    blade = C.obj("key_blade", bm, ["key_metal"], smooth=False, recalc=True)
    # milled groove along both sides (warding)
    cut = bmesh.new()
    for sy in (-1, 1):
        C.box((x_sh - x_tip - 0.002, 0.0006, 0.0011), loc=((x_sh + x_tip) / 2 - 0.001, sy * t, -0.0012), bm=cut)
    C.boolean(blade, C.obj("_g", cut, ["key_metal"], smooth=False))
    if hi:
        C.bevel_mod(blade, 0.00018, 1, 40)
    C.smooth_by_angle(blade, 35)
    # head: rounded plastic bow with a key-ring hole, the blade tang inside
    hb = bmesh.new()
    bmesh.ops.create_cube(hb, size=1.0)
    bmesh.ops.scale(hb, vec=Vector((0.030, 0.0062, 0.026)), verts=hb.verts)
    bmesh.ops.subdivide_edges(hb, edges=hb.edges[:], cuts=2 if hi else 1, use_grid_fill=True)
    for v in hb.verts:
        # taper toward the blade + dome the sides
        tt = (v.co.x + 0.015) / 0.03
        v.co.z *= 0.62 + 0.38 * min(1, tt * 1.4)
        v.co.y *= 0.8 + 0.2 * (1 - abs(v.co.z) / 0.013)
    C.xform(hb, loc=(x_sh + 0.006 + 0.015, 0, (BLADE_TOP + BLADE_BOT) / 2 + 0.001))
    head = C.obj("key_head", hb, ["key_plastic"], smooth=True, sharp=None)
    C.subsurf(head, 2 if hi else 1)
    ring = C.cyl(0.0033, 0.02, 24 if hi else 12, loc=(x_sh + 0.006 + 0.022, 0, (BLADE_TOP + BLADE_BOT) / 2 + 0.001), axis="Y")
    C.boolean(head, C.obj("_ring", ring, ["key_plastic"], smooth=False))
    C.smooth_by_angle(head, 60)
    return blade, head


def build(q):
    hi = q == "hi"
    mats(q)
    hs = build_housing(hi)
    ps = build_plug(hi)
    drivers, springs_, keypins = [], [], []
    top_chamber = 0.0243
    for i, (x, c) in enumerate(zip(PIN_X, CUTS)):
        k = i + 1
        keypins.append(pin(x, c, R_P - 0.00005, "pin_brass", f"key_pin_{k}", hi, point=True))
        dz = R_P + 0.0043 + 0.0004 * (i % 2)
        drivers.append(pin(x, R_P + 0.00005, dz, "pin_steel", f"driver_{k}", hi))
        springs_.append(spring(x, dz + 0.0001, top_chamber, f"spring_{k}", hi))
    blade, head = build_key(hi)
    for o in list(hs.values()) + list(ps.values()) + [blade, head]:
        if o.data.uv_layers:
            o.data.uv_layers[0].name = "UVMap"
    allm = list(hs.values()) + list(ps.values()) + drivers + keypins + [blade, head]
    C.bake_ao_vcol(allm, samples=48 if hi else 16, max_dist=0.006, floor=0.4)
    for o in list(hs.values()) + list(ps.values()):  # flat cut caps: no AO smear across their long triangles
        ca = o.data.color_attributes.get("Color")
        for p in o.data.polygons:
            if p.material_index == 1:
                for li in p.loop_indices:
                    ca.data[li].color = (1, 1, 1, 1)
    root = C.empty("lock")
    housing = C.empty("housing", root)
    for o in hs.values():
        o.parent = housing
    plug = C.empty("plug", root)
    for o in ps.values():
        o.parent = plug
    for o in drivers + springs_:
        o.parent = housing
    for o in keypins:
        o.parent = plug
    key = C.empty("key", plug)
    blade.parent = key
    head.parent = key
    # explode (three space: +Z = Blender -Y = the front half's side)
    hs["front"]["explode"] = [0.0, 0.0, 0.035]
    hs["back"]["explode"] = [0.0, 0.0, -0.035]
    ps["front"]["explode"] = [0.0, 0.0, 0.016]
    ps["back"]["explode"] = [0.0, 0.0, -0.016]
    for i, o in enumerate(drivers):
        o["explode"] = [0.0, 0.030, 0.0]
    for i, o in enumerate(springs_):
        o["explode"] = [0.0, 0.042, 0.0]
    for o in keypins:
        o["explode"] = [0.0, 0.018, 0.0]
    key["explode"] = [0.07, 0.0, 0.0]
    return root


if __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    C.reset()
    root = build(q)
    if a.get("look"):
        Hd = os.path.join(C.HERE, "..", "public/lib3d/env/")
        hide = []
        if a.get("cut"):
            hide = [o for o in bpy.data.objects if o.name.endswith("_front")]
        cams = {"q3": ((0.13, -0.12, 0.07), (0.012, 0.0, 0.002), 30), "cut": ((0.02, -0.16, 0.02), (0.0, 0.0, 0.004), 30),
                "face": ((0.12, -0.03, 0.02), (0.03, 0, 0.0), 26)}
        for k in a.get("views", "q3").split(","):
            cam, tgt, fov = cams[k]
            C.look(a["look"].replace(".png", f"_{k}.png"), target=tgt, cam=cam, fov=fov, hdr=Hd + a.get("env", "studio") + "-1k-v1.hdr",
                   ground=False, spp=int(a.get("spp", "48")), res=(1000, 800), hide=hide)
    if a.get("out") or not a.get("look"):
        C.finish("lock", q, root, a.get("out"))
