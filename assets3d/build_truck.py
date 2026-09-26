"""Cab-over 4x2 tractor unit (ağır vasıta / çekici), unbranded: high-roof sleeper cab, 3.70 m wheelbase.

  Blender -b --factory-startup --python assets3d/build_truck.py -- --q hi --out /tmp/truck-hi.glb

three.js space: faces +X, +Y up, left side at -Z; origin on the ground midway between the axles.
Overall ~5.95 x 2.50 x 3.80 m. Tyres 315/80 R22.5 (build_wheel profile + lug tread), twin tyres on the drive axle.

Nodes (runtime contract, see README):
  truck > chassis (rails, axles, tanks, mudguards, rear light bar), bumper (+ headlamps), fifth_wheel,
          fuel_tank, adblue_tank, battery_box, air_tanks,
          cab (pivot = tilt hinge at the front bottom: rotate about local Z in three to tilt it forward)
              > cab_body, glass_windscreen, visor, extenders, interior, mirror_L / mirror_R,
                door_L / door_R (pivot on the front edge, > glass_L / glass_R)
          steer_FL / steer_FR > wheel_FL / wheel_FR ;  hub_R1L / hub_R1R > wheel_R1L / wheel_R1R (dual)
  wheels spin about their local Z (like the car).
Materials looked up at runtime: paint (cab colour), light_head, light_amber, light_tail (emissive), glass.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

import build_car as BC
import build_wheel as W
import common as C
import texgen as T

XF_AX, XR_AX = 1.85, -1.85
TRACK_F = 2.05
DUAL_C = 0.915  # rear dual centre (each side)
DUAL_S = 0.172  # half spacing between the twin tyres
CAB_XR = 0.95  # cab back wall
CAB_W = 1.245  # cab half width
CAB_Z0 = 0.98
HINGE = (3.02, 0.0, 0.98)
DOOR_X = (2.50, 1.12)  # door front / rear edge (x)

S_T = dict(W.SPEC["truck"])
WR = S_T["R"]

# cab front x per height (windscreen rake, high roof slope) and half width per height
XF_Z = BC.smooth_interp([0.98, 1.10, 1.50, 1.95, 2.00, 2.95, 3.08, 3.25, 3.45, 3.62, 3.72, 3.785],
                        [3.19, 3.225, 3.24, 3.245, 3.235, 3.105, 3.07, 3.01, 2.93, 2.80, 2.64, 2.44])
W_Z = BC.smooth_interp([0.98, 1.02, 1.10, 2.0, 3.0, 3.2, 3.5, 3.65, 3.74, 3.785],
                       [1.20, 1.23, 1.245, 1.245, 1.24, 1.232, 1.215, 1.19, 1.14, 1.06])
RF_Z = BC.smooth_interp([0.98, 2.0, 2.95, 3.3, 3.785], [0.20, 0.22, 0.24, 0.30, 0.34])


# ── materials ─────────────────────────────────────────────────────────────────
def truck_mats(q):
    hi = q == "hi"
    W.mats("hi" if hi else "min", "truck")
    if not hi:  # silver painted steel wheels for the flat set too
        for n in ("rim_face", "rim_paint"):
            nt = C.MATS[n].node_tree
            b = nt.nodes["Principled BSDF"]
            b.inputs["Base Color"].default_value = (*C.srgb("#c3c6ca"), 1)
            for nd in nt.nodes:
                if nd.type == "MIX":
                    nd.inputs[6].default_value = (*C.srgb("#c3c6ca"), 1)
            b.inputs["Metallic"].default_value = 0.3
            b.inputs["Roughness"].default_value = 0.4
    C.material("paint", C.srgb("#e9ebee"), 0.3, 0.15, coat=1.0, coat_rough=0.03, vcol=True)
    C.material("chassis_black", C.srgb("#141517"), 0.5, 0.3, vcol=True)
    C.material("trim_black", C.srgb("#0b0c0d"), 0.2, 0.0, coat=0.5, coat_rough=0.06, vcol=True)
    C.material("satin_grey", C.srgb("#4a4d52"), 0.38, 0.6, coat=0.6, coat_rough=0.1, vcol=True)
    if hi:
        ta, to, tn = T.textured_plastic(512, seed=17, lum=0.03, rough=0.62)
        C.material("plastic_black", (1, 1, 1), albedo=C.image("t_plastic_alb", ta), orm=C.image("t_plastic_orm", to, False),
                   normal=C.image("t_plastic_n", tn, False), normal_strength=0.6, vcol=True, uv_scale=(1, 1))
        ha, ho, hn = T.honeycomb(512, cells=18, lum=0.03, rough=0.4)
        C.material("grille", (1, 1, 1), albedo=C.image("t_grille_alb", ha), orm=C.image("t_grille_orm", ho, False),
                   normal=C.image("t_grille_n", hn, False), vcol=True, uv_scale=(1, 1))
        ba, bo, bn = T.brushed(512, seed=19, lum=0.78, rough=0.26)
        C.material("alu", (1, 1, 1), albedo=C.image("t_alu_alb", ba), orm=C.image("t_alu_orm", bo, False),
                   normal=C.image("t_alu_n", bn, False), normal_strength=0.5, vcol=True, uv_scale=(1, 1))
    else:
        C.material("plastic_black", C.srgb("#1b1c1d"), 0.62, 0.0, vcol=True)
        C.material("grille", C.srgb("#0d0d0e"), 0.5, 0.0, vcol=True)
        C.material("alu", C.srgb("#c8cacd"), 0.26, 1.0, vcol=True)
    C.material("glass", C.srgb("#0b1014"), 0.02, 0.0, alpha=0.62, spec_level=0.5, double=True)
    C.material("lamp_glass", C.srgb("#dfe4ea"), 0.02, 0.0, alpha=0.2, double=True)
    C.material("lamp_housing", C.srgb("#111214"), 0.25, 0.6, vcol=True)
    C.material("reflector", C.srgb("#d0d4d8"), 0.1, 1.0, vcol=True)
    C.material("light_head", C.srgb("#ffffff"), 0.2, 0.0, emission=(C.srgb("#eef4ff"), 3.0))
    C.material("light_amber", C.srgb("#b86a08"), 0.2, 0.0, coat=1.0, coat_rough=0.02, emission=(C.srgb("#ff9a10"), 0.6))
    C.material("light_tail", C.srgb("#520305"), 0.2, 0.0, coat=1.0, coat_rough=0.02, emission=(C.srgb("#ff1a12"), 0.3))
    C.material("interior", C.srgb("#151517"), 0.75, 0.0, vcol=True)
    C.material("seat", C.srgb("#202022"), 0.7, 0.0, sheen=(C.srgb("#3a3a3e"), 0.5), vcol=True)
    C.material("dash", C.srgb("#121214"), 0.55, 0.0, vcol=True)
    C.material("arch_liner", C.srgb("#101011"), 0.88, 0.0, vcol=True)
    C.material("mirror_glass", C.srgb("#e8e9eb"), 0.04, 1.0)
    C.material("rubber", C.srgb("#1a1a1b"), 0.7, 0.0, vcol=True)


# ── cab shell (level-contour loft, rounded-rectangle plan) ───────────────────
def cab_half(z, hi):
    """half plan contour at height z: (points, tags). tags: ('F'|'FC'|'S'|'RC'|'B', frac)"""
    xf, w, rf = float(XF_Z(z)), float(W_Z(z)), float(RF_Z(z))
    # bottom rounding (tuck under at the cab floor)
    dzb = z - CAB_Z0
    rb = 0.05
    if dzb < rb:
        w -= rb - math.sqrt(max(0.0, rb * rb - (rb - dzb) ** 2))
    rr = 0.12
    bow = 0.07
    nF, nC, nR, nB = (12, 10, 6, 8) if hi else (6, 5, 3, 4)
    pts, tags = [], []
    xfe = lambda y: xf - bow * (y / w) ** 2
    ye = w - rf
    for i in range(nF):
        y = ye * i / nF
        pts.append((xfe(y), y))
        tags.append(("F", i / nF))
    # front corner arc: centre so that it meets the bowed front at y=ye and the side at x = cx
    x_at = xfe(ye)
    cx = x_at - rf
    for i in range(nC):
        a = (math.pi / 2) * i / nC
        pts.append((cx + rf * math.cos(a), ye + rf * math.sin(a)))
        tags.append(("FC", i / nC))
    xs, xe = cx, CAB_XR + rr
    pins = [DOOR_X[0] + 0.01, DOOR_X[0], DOOR_X[0] - 0.012, 2.40, 1.30, DOOR_X[1] + 0.012, DOOR_X[1], DOOR_X[1] - 0.01]
    counts = [3, 1, 1, 2, 12, 2, 1, 1, 1] if hi else [2, 1, 1, 1, 5, 1, 1, 1, 1]
    mid = BC.pinned_mid(xs, xe, pins, counts)
    for x in mid[:-1]:
        pts.append((x, w))
        tags.append(("S", 0.0))
    for i in range(nR):
        a = (math.pi / 2) * i / nR
        pts.append((CAB_XR + rr - rr * math.sin(a), w - rr + rr * math.cos(a)))
        tags.append(("RC", i / nR))
    for i in range(nB):
        y = (w - rr) * (1 - i / nB)
        pts.append((CAB_XR, y))
        tags.append(("B", i / nB))
    pts.append((CAB_XR, 0.0))
    tags.append(("B", 1.0))
    return pts, tags


Z_LEV_HI = [0.98, 0.995, 1.02, 1.06, 1.12, 1.18, 1.35, 1.55, 1.75, 1.88, 1.93, 1.97, 2.0, 2.03, 2.25, 2.5, 2.72,
            2.8, 2.88, 2.93, 2.97, 3.02, 3.08, 3.16, 3.28, 3.42, 3.54, 3.63, 3.69, 3.735, 3.765, 3.78, 3.785]
Z_LEV_LO = [0.98, 1.02, 1.12, 1.18, 1.55, 1.88, 1.93, 2.0, 2.03, 2.45, 2.8, 2.88, 2.93, 3.02, 3.16, 3.4, 3.6, 3.7,
            3.76, 3.785]

MAT_LIST = ["paint", "trim_black", "plastic_black", "grille", "GLASS_W", "GLASS_S", "arch_liner", "chassis_black"]
MI = {m: i for i, m in enumerate(MAT_LIST)}
PANELS = ["cab_body", "door_L", "door_R"]


def classify(x, y, z, tag, frac):
    ay = abs(y)
    mat, panel = "paint", "cab_body"
    side = "L" if y > 0 else "R"
    if tag == "F":
        if 2.005 < z < 2.93:
            mat = "GLASS_W"
        elif 1.97 < z < 2.97:
            mat = "trim_black"
        elif 1.19 < z < 1.90 and ay < 0.98:
            mat = "grille"
        elif z < 1.13:
            mat = "plastic_black"
    elif tag == "FC":
        if frac < 0.45 and 2.005 < z < 2.93:
            mat = "GLASS_W"
        elif frac < 0.62 and 1.97 < z < 2.97:
            mat = "trim_black"
        elif z < 1.13 or (z < 1.26 and frac > 0.6):
            mat = "plastic_black"
    elif tag == "S":
        if DOOR_X[1] < x < DOOR_X[0] and 1.19 < z < 2.95:
            panel = "door_" + side
            zl = 2.03
            if zl < z < 2.84 and 1.26 < x < 2.44:
                mat = "GLASS_S"
            elif zl - 0.05 < z < 2.89 and 1.21 < x < 2.47:
                mat = "trim_black"
        if z < 1.26:
            mat = "plastic_black"  # lower cab cladding around the wheel arch / steps
    else:
        if z < 1.13:
            mat = "plastic_black"
    return mat, panel


def build_cab(q):
    hi = q == "hi"
    levs = Z_LEV_HI if hi else Z_LEV_LO
    rings, metas = [], []
    for z in levs:
        half, tags = cab_half(z, hi)
        ring = BC.ring_from_half(half, lambda x, y, z=z: z)
        rings.append(ring)
        metas.append(tags)
    H = len(half)
    bm = bmesh.new()
    pl = bm.faces.layers.int.new("panel")
    bm, vr, faces = BC.loft(rings, bm)
    n = len(rings[0])
    for f, li, i in faces:
        c = f.calc_center_median()
        hA, hB = BC.half_index(i, H), BC.half_index((i + 1) % n, H)
        h = min(hA, hB)
        tag, frac = metas[li][h]
        if tag in ("F", "FC", "RC", "B"):
            frac = (frac + (metas[li][max(hA, hB)][1] if metas[li][max(hA, hB)][0] == tag else 1.0)) / 2
        m, p = classify(c.x, c.y, c.z, tag, frac)
        f.material_index = MI[m]
        f[pl] = PANELS.index(p)
    mats = [C.MATS[m] if m in C.MATS else C.MATS["paint"] for m in MAT_LIST]
    ob = C.obj("cab_body", bm, mats, smooth=True, sharp=None, recalc=False)
    new, ring = BC.cap(ob, None, None, span=int(len(rings[-1]) * 0.36))
    me = ob.data
    ring_xy = np.array([(me.vertices[i].co.x, me.vertices[i].co.y) for i in ring])
    wfun = BC.ring_width_fn(ring_xy)
    cv = set()
    for fi in new:
        cv.update(me.polygons[fi].vertices)
        me.polygons[fi].material_index = 0
        me.attributes["panel"].data[fi].value = 0
    cv -= set(ring)
    ztop = levs[-1]
    for vi in cv:
        v = me.vertices[vi]
        wv = max(wfun(v.co.x), 1e-3)
        v.co.z = ztop + 0.02 * max(0.0, 1 - (v.co.y / wv) ** 2)
    BC.cap_bottom(ob, MI["chassis_black"])
    BC._orient_out(ob)
    return ob


def arch_cut(ob, hi):
    bm = bmesh.new()
    for sgn in (1, -1):
        C.cyl(0.625, 0.9, 64 if hi else 32, loc=(XF_AX, sgn * (0.80 + 0.45), WR), axis="Y", bm=bm)
    C.boolean(ob, C.obj("_arch", bm, ["arch_liner"], smooth=False), transfer=True)


# ── cab details ───────────────────────────────────────────────────────────────
def visor(hi):
    b = C.box((0.30, 2.22, 0.028), bevel=0.012, segs=2 if hi else 1)
    for v in b.verts:
        yy = v.co.y / 1.11
        v.co.x -= 0.08 * yy * yy
        v.co.z -= (v.co.x + 0.15) * 0.18
    C.xform(b, loc=(3.14, 0, 3.0))
    o = C.obj("visor", b, ["paint"], sharp=40)
    # marker lights under the visor lip
    lb = bmesh.new()
    for k in range(5):
        y = -0.8 + 0.4 * k
        C.box((0.03, 0.09, 0.025), loc=(3.285 - 0.08 * (y / 1.11) ** 2, y, 2.965), bevel=0.008, segs=1, bm=lb)
    lights = C.obj("visor_lights", lb, ["light_amber"], sharp=40)
    return C.join([o, lights], "visor")


def extenders(hi):
    parts = []
    for sg in (1, -1):
        b = C.box((0.36, 0.035, 2.30), bevel=0.014, segs=2 if hi else 1)
        for v in b.verts:
            v.co.y += 0.05 * (v.co.x + 0.18) / 0.36 * sg  # flare outward toward the rear
        C.xform(b, loc=(CAB_XR + 0.12, sg * (CAB_W + 0.03), 2.45))
        parts.append(C.obj("ext", b, ["paint"], sharp=40))
    return C.join(parts, "extenders")


def mirror(side, hi):
    sg = 1 if side == "L" else -1
    parts = []
    # arm: tube from the A-pillar top forward/outward then down
    p0 = Vector((2.98, sg * 1.20, 2.86))
    path = [p0, Vector((3.06, sg * 1.34, 2.90)), Vector((3.07, sg * 1.42, 2.84)), Vector((3.06, sg * 1.44, 2.55))]
    parts.append(C.obj("arm", C.tube(C.bezier_path(path, 5 if hi else 3), 0.016, 10 if hi else 6), ["trim_black"]))
    main = C.box((0.11, 0.24, 0.44), bevel=0.03, segs=2 if hi else 1, loc=(3.05, sg * 1.47, 2.62))
    parts.append(C.obj("hous", main, ["trim_black"], sharp=40))
    g = C.box((0.01, 0.2, 0.39), bevel=0.004, segs=1, loc=(2.99, sg * 1.47, 2.62))
    parts.append(C.obj("mg", g, ["mirror_glass"], sharp=40))
    wide = C.box((0.10, 0.22, 0.20), bevel=0.03, segs=2 if hi else 1, loc=(3.05, sg * 1.47, 2.28))
    parts.append(C.obj("wide", wide, ["trim_black"], sharp=40))
    g2 = C.box((0.01, 0.18, 0.16), bevel=0.004, segs=1, loc=(2.995, sg * 1.47, 2.28))
    parts.append(C.obj("mg2", g2, ["mirror_glass"], sharp=40))
    parts.append(C.obj("arm2", C.tube([Vector((3.06, sg * 1.44, 2.40)), Vector((3.05, sg * 1.45, 2.38))], 0.012, 6),
                       ["trim_black"]))
    m = C.join(parts, "mirror_" + side)
    for p in m.data.polygons:
        pass
    return m


def cab_bits(hi):
    """grab handles beside the doors, brow bar under the windscreen, side indicators"""
    parts = []
    for sg in (1, -1):
        for x in (2.60, 1.02):
            p = [Vector((x, sg * (CAB_W + 0.005), 1.40)), Vector((x, sg * (CAB_W + 0.04), 1.45)),
                 Vector((x, sg * (CAB_W + 0.04), 2.15)), Vector((x, sg * (CAB_W + 0.005), 2.20))]
            parts.append(C.obj("grab", C.tube(C.bend_path(p, 0.03, 3), 0.014, 8 if hi else 5), ["trim_black"]))
        ind = C.box((0.12, 0.02, 0.04), loc=(2.78, sg * (CAB_W + 0.004), 1.30), bevel=0.006, segs=1)
        parts.append(C.obj("sind", ind, ["light_amber"]))
    b = C.box((0.03, 2.0, 0.035), bevel=0.012, segs=2 if hi else 1)
    for v in b.verts:
        v.co.x -= 0.07 * (v.co.y / 1.245) ** 2
    C.xform(b, loc=(float(XF_Z(1.945)) + 0.005, 0, 1.945))
    parts.append(C.obj("brow", b, ["satin_grey"], sharp=40))
    return C.join(parts, "cab_bits")


def seat(x, y, hi):
    parts = []
    cb = C.box((0.52, 0.55, 0.14), loc=(x, y, 1.78), bevel=0.05, segs=2 if hi else 1)
    parts.append(C.obj("s", cb, ["seat"], sharp=50))
    bb = C.box((0.14, 0.55, 0.78), loc=(x - 0.28, y, 2.20), bevel=0.05, segs=2 if hi else 1)
    for v in bb.verts:
        v.co.x -= (v.co.z - 1.8) * 0.2
    parts.append(C.obj("s", bb, ["seat"], sharp=50))
    hb = C.box((0.1, 0.3, 0.2), loc=(x - 0.40, y, 2.72), bevel=0.04, segs=2 if hi else 1)
    parts.append(C.obj("s", hb, ["seat"], sharp=50))
    base = C.box((0.4, 0.4, 0.35), loc=(x, y, 1.55), bevel=0.02, segs=1)
    parts.append(C.obj("s", base, ["dash"], sharp=50))
    return C.join(parts, "seat")


def interior(hi, cab_src):
    objs = []
    o = cab_src
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bm.normal_update()
    for v in bm.verts:
        v.co -= v.normal * 0.04
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
    for f in bm.faces:
        f.material_index = 0
    bm.to_mesh(o.data)
    bm.free()
    o.data.materials.clear()
    o.data.materials.append(C.MATS["interior"])
    C.decimate(o, 0.35 if hi else 0.15)
    objs.append(o)
    objs.append(seat(2.35, 0.55, hi))
    objs.append(seat(2.35, -0.55, hi))
    db = C.box((0.55, 2.3, 0.45), loc=(2.92, 0, 1.78), bevel=0.08, segs=2 if hi else 1)
    for v in db.verts:
        if v.co.z > 1.9:
            v.co.x -= (v.co.y ** 2) * 0.06
    objs.append(C.obj("dash", db, ["dash"], sharp=50))
    bunk = C.box((0.75, 2.3, 0.18), loc=(1.40, 0, 1.75), bevel=0.05, segs=1)
    objs.append(C.obj("bunk", bunk, ["seat"], sharp=50))
    sb = bmesh.new()
    C.torus(0.235, 0.018, 32 if hi else 16, 8 if hi else 6, bm=sb)
    C.cyl(0.06, 0.06, 16, bm=sb)
    C.xform(sb, rot=Matrix.Rotation(math.radians(-50), 3, "Y"), loc=(2.70, 0.55, 2.10))
    objs.append(C.obj("steer", sb, ["dash"], sharp=40))
    return C.join(objs, "interior")


# ── bumper + lamps ───────────────────────────────────────────────────────────
def bumper(hi):
    levs = [0.42, 0.44, 0.48, 0.56, 0.66, 0.80, 0.92, 0.97, 0.995, 1.0] if hi else [0.42, 0.46, 0.6, 0.8, 0.95, 1.0]
    rings = []
    for z in levs:
        dz = min(z - 0.42, 1.0 - z)
        ins = 0.0 if dz > 0.04 else 0.04 - math.sqrt(max(0, 0.04 ** 2 - (0.04 - dz) ** 2))
        xf = 3.28 - 0.03 * ((z - 0.72) / 0.3) ** 2 - ins
        w = 1.245 - ins
        pts = []
        nF, nC = (12, 10) if hi else (6, 5)
        rf = 0.26
        bow = 0.08
        ye = w - rf
        for i in range(nF):
            y = ye * i / nF
            pts.append((xf - bow * (y / w) ** 2, y))
        cx = xf - bow * (ye / w) ** 2 - rf
        for i in range(nC + 1):
            a = (math.pi / 2) * i / nC
            pts.append((cx + rf * math.cos(a), ye + rf * math.sin(a)))
        pts.append((2.86, w))
        pts.append((2.86, 0.0))
        rings.append(BC.ring_from_half(pts, lambda x, y, z=z: z))
    bm, vr, faces = BC.loft(rings)
    for f, li, i in faces:
        c = f.calc_center_median()
        f.material_index = 1 if c.z < 0.62 else 0  # lower black plastic, upper painted
    for rr in (vr[0], vr[-1]):
        try:
            bm.faces.new(rr)
        except ValueError:
            pass
    ob = C.obj("bumper", bm, ["paint", "plastic_black", "lamp_housing"], smooth=True, sharp=50)
    # headlamp recesses at the corners + a lower grille slot
    lamp = lambda f: (0.655 < f.calc_center_median().z < 0.905 and abs(f.calc_center_median().y) > 0.66
                      and f.calc_center_median().x > 3.0)
    for p in ob.data.polygons:
        pass
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    for f in bm.faces:
        if lamp(f):
            f.material_index = 2
    bm.to_mesh(ob.data)
    bm.free()
    C.recess(ob, lambda f: f.material_index == 2, 0.05, wall_mat=2)
    C.recess(ob, lambda f: 0.48 < f.calc_center_median().z < 0.60 and abs(f.calc_center_median().y) < 0.62
             and f.calc_center_median().x > 3.1, 0.03, wall_mat=1)
    C.uv_box(ob, 0.3)
    return ob


def headlamps(hi):
    parts = []
    for sg in (1, -1):
        # lens following the bumper corner, reflectors, DRL light guide, fog lamp, amber indicator
        lens_pts = []
        for k in range(10 if hi else 5):
            t = k / (9 if hi else 4)
            y = sg * (0.72 + 0.46 * t)
            ay = abs(y)
            x = _bumper_x(ay, 0.78) - 0.004
            lens_pts.append((x, y))
        bm = bmesh.new()
        prev = None
        for (x, y) in lens_pts:
            a = bm.verts.new((x, y, 0.675))
            b = bm.verts.new((x, y, 0.885))
            if prev:
                bm.faces.new((prev[0], a, b, prev[1]) if sg > 0 else (prev[1], b, a, prev[0]))
            prev = (a, b)
        parts.append(C.obj("lens", bm, ["lamp_glass"], recalc=False))
        for yy in (0.83, 0.98):
            y = sg * yy
            x = _bumper_x(yy, 0.76) - 0.04
            b = C.lathe([(0.0, -0.03), (0.04, -0.024), (0.07, -0.004), (0.085, 0.012)], 24 if hi else 12, axis="X")
            parts.append(C.obj("refl", C.xform(b, loc=(x + 0.005, y, 0.765)), ["reflector"]))
            b2 = C.lathe([(0.0, 0.016), (0.03, 0.01), (0.04, 0.0)], 16 if hi else 8, axis="X")
            parts.append(C.obj("bulb", C.xform(b2, loc=(x - 0.012, y, 0.765)), ["lamp_glass"]))
        drl = [Vector((_bumper_x(abs(sg * (0.74 + 0.43 * k / 9)), 0.865) - 0.02, sg * (0.74 + 0.43 * k / 9), 0.865))
               for k in range(10)]
        parts.append(C.obj("drl", C.tube(drl, 0.007, 8), ["light_head"]))
        ind = C.box((0.02, 0.16, 0.035), loc=(_bumper_x(1.02, 0.70) - 0.02, sg * 1.02, 0.695), bevel=0.006, segs=1)
        parts.append(C.obj("ind", ind, ["light_amber"]))
        fog = C.cyl(0.045, 0.03, 16 if hi else 8, loc=(_bumper_x(0.9, 0.54) - 0.01, sg * 0.9, 0.54), axis="X")
        parts.append(C.obj("fog", fog, ["light_head"]))
    return C.join(parts, "headlamps")


def _bumper_x(ay, z):
    xf = 3.28 - 0.03 * ((z - 0.72) / 0.3) ** 2
    w, rf, bow = 1.245, 0.26, 0.08
    ye = w - rf
    if ay <= ye:
        return xf - bow * (ay / w) ** 2
    cx = xf - bow * (ye / w) ** 2 - rf
    s = min(1.0, (ay - ye) / rf)
    return cx + rf * math.sqrt(max(0.0, 1 - s * s))


def grille_bars(hi):
    parts = []
    for k, z in enumerate((1.32, 1.50, 1.68)):
        b = C.box((0.05, 1.86, 0.045), bevel=0.018, segs=2 if hi else 1)
        for v in b.verts:
            v.co.x -= 0.07 * (v.co.y / 1.245) ** 2
        C.xform(b, loc=(float(XF_Z(z)) - 0.01, 0, z))
        parts.append(C.obj("bar", b, ["satin_grey"], sharp=40))
    return C.join(parts, "grille_bars")


# ── chassis ──────────────────────────────────────────────────────────────────
def chassis(hi):
    parts = []
    bs = 2 if hi else 1
    for sg in (1, -1):
        # C-channel rail: web + two flanges
        y = sg * 0.43
        parts.append(C.obj("rail", C.box((5.70, 0.012, 0.29), loc=(0.20, y, 0.97)), ["chassis_black"], sharp=30))
        for zz in (0.83, 1.11):
            parts.append(C.obj("fl", C.box((5.70, 0.085, 0.012), loc=(0.20, y - sg * 0.036, zz)), ["chassis_black"], sharp=30))
    for x in (2.8, 1.5, 0.4, -0.8, -1.55, -2.5):
        parts.append(C.obj("xm", C.box((0.10, 0.80, 0.20), loc=(x, 0, 0.97), bevel=0.01, segs=1), ["chassis_black"], sharp=30))
    # front axle beam + leaf springs
    parts.append(C.obj("fax", C.box((0.12, 1.9, 0.14), loc=(XF_AX, 0, 0.47), bevel=0.02, segs=bs), ["chassis_black"], sharp=30))
    for sg in (1, -1):
        leaf = bmesh.new()
        for k in range(3):
            pts = [Vector((XF_AX - 0.75 + 1.5 * t / 10, sg * 0.43, 0.70 - 0.03 * k - 0.10 * math.sin(math.pi * t / 10)))
                   for t in range(11)]
            for p0, p1 in zip(pts, pts[1:]):
                C.merge(leaf, C.xform(C.box(((p1 - p0).length + 0.004, 0.08, 0.022)),
                                      rot=Matrix.Rotation(math.atan2(-(p1.z - p0.z), (p1.x - p0.x)), 3, "Y"),
                                      loc=(p0 + p1) / 2))
        parts.append(C.obj("leaf", leaf, ["chassis_black"], sharp=30))
    # rear axle housing + differential + air bellows
    ra = C.cyl(0.075, 1.72, 20 if hi else 10, loc=(XR_AX, 0, WR), axis="Y")
    parts.append(C.obj("rax", ra, ["chassis_black"], sharp=40))
    diff = bmesh.new()
    C.merge(diff, C.xform(C.lathe([(0.0, -0.20), (0.14, -0.16), (0.20, -0.02), (0.18, 0.10), (0.08, 0.16), (0.0, 0.17)],
                                   20 if hi else 10, axis="X"), loc=(XR_AX, 0, WR)))
    parts.append(C.obj("diff", diff, ["chassis_black"], sharp=40))
    for sg in (1, -1):
        for dx in (-0.30, 0.30):
            b = C.lathe([(0.10, 0.0), (0.135, 0.04), (0.14, 0.10), (0.135, 0.16), (0.10, 0.20)], 20 if hi else 10, axis="Z")
            parts.append(C.obj("bel", C.xform(b, loc=(XR_AX + dx, sg * 0.58, 0.64)), ["rubber"], sharp=50))
        parts.append(C.obj("trail", C.box((1.0, 0.09, 0.08), loc=(XR_AX, sg * 0.58, 0.60), bevel=0.02, segs=1),
                           ["chassis_black"], sharp=30))
    # rear mudguards (quarter shells over the duals) on brackets
    for sg in (1, -1):
        prof = [(0.60, -0.20), (0.62, -0.20), (0.62, 0.20), (0.60, 0.20)]
        mg = C.lathe(prof + [prof[0]], 32 if hi else 14, axis="Y", angle=math.radians(160), ofs=math.radians(-80))
        C.xform(mg, loc=(XR_AX, sg * DUAL_C, WR))
        # lathe axis Y: (s, h, c) -> the arc sits in X/Z around the axle
        parts.append(C.obj("mudguard", mg, ["plastic_black"], sharp=50))
        parts.append(C.obj("mgb", C.box((0.06, 0.40, 0.05), loc=(XR_AX, sg * 0.62, 1.16)), ["chassis_black"], sharp=30))
    # rear light bar with tail / indicator lamps + number plate bracket
    parts.append(C.obj("lbar", C.box((0.08, 2.30, 0.12), loc=(-2.62, 0, 0.82), bevel=0.01, segs=1), ["chassis_black"], sharp=30))
    lamps = bmesh.new()
    for sg in (1, -1):
        C.box((0.03, 0.30, 0.13), loc=(-2.675, sg * 0.95, 0.82), bevel=0.01, segs=1, bm=lamps)
    tail = C.obj("tail_lamps", lamps, ["light_tail"], sharp=40)
    amb = bmesh.new()
    for sg in (1, -1):
        C.box((0.03, 0.10, 0.13), loc=(-2.675, sg * 0.72, 0.82), bevel=0.01, segs=1, bm=amb)
        # side marker lights along the chassis
        for x in (0.5, -0.6, -2.2):
            C.box((0.08, 0.02, 0.04), loc=(x, sg * 1.02, 0.78), bevel=0.006, segs=1, bm=amb)
    ambo = C.obj("amber_lamps", amb, ["light_amber"], sharp=40)
    # exhaust: side silencer + tail pipe (right side, -Y)
    sil = C.box((0.70, 0.36, 0.42), loc=(-0.95, -0.78, 0.72), bevel=0.06, segs=bs)
    parts.append(C.obj("silencer", sil, ["alu"], sharp=40))
    tp = C.tube(C.bend_path([Vector((-1.30, -0.80, 0.62)), Vector((-1.40, -0.95, 0.60)), Vector((-1.42, -1.05, 0.52))], 0.05, 5),
                0.045, 14 if hi else 8)
    parts.append(C.obj("tailpipe", tp, ["chrome"], sharp=50))
    # steps under the doors (behind the front wheels)
    for sg in (1, -1):
        st = C.box((0.34, 0.26, 0.62), loc=(1.10, sg * 1.10, 0.76), bevel=0.03, segs=bs)
        parts.append(C.obj("steps", st, ["plastic_black"], sharp=40))
        for zz in (0.52, 0.80):
            parts.append(C.obj("tread", C.box((0.30, 0.22, 0.025), loc=(1.10, sg * 1.13, zz), bevel=0.005, segs=1),
                               ["alu"], sharp=40))
    ch = C.join(parts, "chassis_mesh")
    for o in (ch,):
        C.uv_box(o, 0.4)
    return ch, tail, ambo


def fifth_wheel(hi):
    parts = []
    # coupling plate: disc with a rear V throat, on a mounting plate and two pedestals
    prof = [(0.0, 1.265), (0.40, 1.265), (0.44, 1.255), (0.46, 1.22), (0.44, 1.20), (0.0, 1.20)]
    b = C.lathe(prof, 40 if hi else 20, axis="Z", cap0=True, cap1=True)
    C.xform(b, loc=(-1.50, 0, 0))
    plate = C.obj("fw_plate", b, ["chassis_black"], sharp=40)
    cut = bmesh.new()
    v = C.box((0.6, 0.30, 0.3), loc=(-1.80, 0, 1.23))
    for vv in v.verts:
        if vv.co.x < -1.7:
            vv.co.y *= 2.2
    C.merge(cut, v)
    C.boolean(plate, C.obj("_c", cut, ["chassis_black"], smooth=False))
    parts.append(plate)
    parts.append(C.obj("fw_grease", C.box((0.5, 0.5, 0.004), loc=(-1.45, 0, 1.267)), ["steel_dark"], sharp=40))
    for sg in (1, -1):
        parts.append(C.obj("ped", C.box((0.36, 0.10, 0.10), loc=(-1.5, sg * 0.30, 1.15), bevel=0.01, segs=1), ["chassis_black"], sharp=30))
    parts.append(C.obj("mp", C.box((0.9, 1.0, 0.03), loc=(-1.5, 0, 1.125)), ["chassis_black"], sharp=30))
    return C.join(parts, "fifth_wheel_mesh")


def tank(name, x0, x1, y_in, y_out, z0, z1, mat, hi):
    """D-shaped side tank extruded along x (rounded outer corners) with two straps"""
    r = min(0.18, (z1 - z0) / 2)
    prof = []
    n = 8 if hi else 4
    sg = 1 if y_out > 0 else -1
    yo = abs(y_out)
    yi = abs(y_in)
    for k in range(n + 1):
        a = -math.pi / 2 + (math.pi / 2) * k / n
        prof.append((yo - r + r * math.cos(a), z0 + r + r * math.sin(a)))
    for k in range(n + 1):
        a = (math.pi / 2) * k / n
        prof.append((yo - r + r * math.cos(a), z1 - r + r * math.sin(a)))
    prof += [(yi, z1), (yi, z0)]
    bm = bmesh.new()
    rings = []
    for x in (x0, x0 + 0.03, x1 - 0.03, x1):
        e = 0.02 if x in (x0, x1) else 0.0
        rings.append([bm.verts.new((x, sg * (y - (e if y > yi + 0.01 else 0)), z + (e if z < (z0 + z1) / 2 else -e) * 0.5))
                      for (y, z) in prof])
    m = len(prof)
    for a, b in zip(rings, rings[1:]):
        for i in range(m):
            j = (i + 1) % m
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(rings[0][::-1])
    bm.faces.new(rings[-1])
    o = C.obj(name, bm, [mat], sharp=40)
    straps = []
    for xs in (x0 + 0.18, x1 - 0.18):
        sb = bmesh.new()
        for (y, z), (y2, z2) in zip(prof[:-2], prof[1:-2]):
            p0 = Vector((xs, sg * (y + 0.006), z))
            p1 = Vector((xs, sg * (y2 + 0.006), z2))
            C.merge(sb, C.box((0.05, 0.008, (p1 - p0).length + 0.004)) if False else C.tube([p0, p1], 0.008, 4, caps=False))
        straps.append(C.obj("strap", sb, ["chassis_black"], sharp=60))
    return C.join([o] + straps, name)


# ── wheels ───────────────────────────────────────────────────────────────────
ROT = W.ROT


def truck_rim(q, a_d):
    """22.5 x 9.00 steel disc wheel; a_d = disc plane offset from the rim centre (wheel frame, +a = face side)"""
    hi = q == "hi"
    segs = 72 if hi else (40 if q == "lo" else 28)
    Rb, RW = S_T["Rb"], S_T["RW"]
    h = RW / 2
    fl = Rb + 0.0127
    outer = [(fl + 0.004, h + 0.004), (fl, h - 0.001), (Rb + 0.002, h - 0.012), (Rb - 0.006, h - 0.040),
             (Rb - 0.040, h - 0.060), (Rb - 0.040, -h + 0.110), (Rb - 0.010, -h + 0.060), (Rb, -h + 0.012),
             (fl, -h - 0.001), (fl + 0.004, -h - 0.004)]
    inner = [(fl - 0.004, -h - 0.004), (Rb - 0.006, -h + 0.012), (Rb - 0.016, -h + 0.060), (Rb - 0.046, -h + 0.110),
             (Rb - 0.046, h - 0.060), (Rb - 0.012, h - 0.040), (Rb - 0.004, h - 0.010), (fl - 0.004, h + 0.004)]
    bm = C.lathe(outer + inner + [outer[0]], segs, axis="Z")
    barrel = C.obj("rim_barrel", bm, ["rim_paint"], sharp=40)
    # dished disc from the hub plane (a_d) to the well
    rw = Rb - 0.043
    aw = 0.0
    t = 0.012
    front = [(0.11, a_d + t), (0.17, a_d + t), (0.20, a_d + t + (aw - a_d) * 0.35), (0.235, aw + 0.02), (rw, aw + 0.02)]
    back = [(rw, aw - 0.01), (0.23, aw - 0.01), (0.195, a_d + (aw - a_d) * 0.35), (0.165, a_d), (0.11, a_d)]
    fb = C.lathe((front + back + [front[0]])[::-1] if a_d > 0 else (front + back + [front[0]]), segs, axis="Z")
    face = C.obj("rim_face", fb, ["rim_face"], sharp=40)
    lb = bmesh.new()
    for k in range(10):
        ang = 2 * math.pi * k / 10
        C.cyl(0.013, 0.4, 12 if hi else 8, loc=(math.cos(ang) * 0.1675, math.sin(ang) * 0.1675, a_d), bm=lb)
    for k in range(5 if hi else 5):
        ang = 2 * math.pi * (k + 0.5) / 5
        b = C.cyl(0.030, 0.6, 16 if hi else 10, loc=(0, 0, 0))
        C.xform(b, scale=(1.5, 1, 1))
        C.xform(b, rot=Matrix.Rotation(ang, 3, "Z"), loc=(math.cos(ang) * 0.212, math.sin(ang) * 0.212, a_d))
        C.merge(lb, b)
    C.boolean(face, C.obj("_lug", lb, ["rim_face"], smooth=False))
    if hi:
        C.bevel_mod(face, width=0.002, segs=2, angle=40)
    else:
        C.cleanup(face)
    rim = C.join([barrel, face], "rim")
    rim.data.transform(ROT)
    C.smooth_by_angle(rim, 40)
    return rim


def truck_hub(q, a_face, cap_len):
    """10 hex nuts + protruding hub cap on the outer disc face (plane a_face), wheel frame -> Blender"""
    hi = q == "hi"
    bm = bmesh.new()
    for k in range(10):
        ang = 2 * math.pi * k / 10
        b = C.lathe([(0.0, a_face + 0.042), (0.012, a_face + 0.042), (0.016, a_face + 0.036), (0.016, a_face + 0.012),
                     (0.019, a_face + 0.008), (0.019, a_face)], 6, axis="Z")
        C.xform(b, loc=(math.cos(ang) * 0.1675, math.sin(ang) * 0.1675, 0))
        C.merge(bm, b)
    nuts = C.obj("nuts", bm, ["chrome"], sharp=30)
    cb = C.lathe([(0.0, a_face + cap_len), (0.05, a_face + cap_len - 0.005), (0.075, a_face + cap_len * 0.6),
                  (0.085, a_face + 0.02), (0.11, a_face + 0.01), (0.11, a_face)], 28 if hi else 14, axis="Z")
    cap = C.obj("hubcap", cb, ["chrome"], sharp=40)
    drum = C.lathe([(0.21, a_face - 0.02), (0.21, a_face - 0.26), (0.10, a_face - 0.26)], 32 if hi else 14, axis="Z")
    dr = C.obj("drum", drum, ["disc_hat"], sharp=40)
    hub = C.join([nuts, cap, dr], "hub")
    hub.data.transform(ROT)
    C.smooth_by_angle(hub, 40)
    return hub


def wheel_sets(q):
    """shared meshes: tyre, front rim (disc toward the face), dual rim (disc toward the back), hubs"""
    tq = q if q == "hi" else "min"
    tyre = W.make_tyre(S_T, tq, "truck")
    rim_f = truck_rim(q, 0.045)
    rim_f.name = "rim_front"
    rim_d = truck_rim(q, -0.095)
    rim_d.name = "rim_dual"
    hub_f = truck_hub(q, 0.057, 0.10)
    hub_f.name = "hub_front"
    hub_d = truck_hub(q, -0.095 + 0.012, 0.16)
    hub_d.name = "hub_dual"
    return tyre, rim_f, rim_d, hub_f, hub_d


def build(q, ao=True):
    hi = q == "hi"
    truck_mats(q)
    cab = build_cab(q)
    cab_src = cab.copy()
    cab_src.data = cab.data.copy()
    bpy.context.scene.collection.objects.link(cab_src)
    arch_cut(cab, hi)
    C.recess(cab, lambda f: f.material_index == MI["grille"], 0.03, wall_mat=MI["plastic_black"])
    glass = C.split_faces(cab, lambda p, me: {MI["GLASS_W"]: "glass_windscreen"}.get(p.material_index) or
                          (("glass_L" if p.center.y > 0 else "glass_R") if p.material_index == MI["GLASS_S"] else None))
    doors = C.split_faces(cab, lambda p, me: PANELS[me.attributes["panel"].data[p.index].value]
                          if me.attributes["panel"].data[p.index].value else None)
    C.uv_box(cab, 0.3)
    for o in [cab] + list(doors.values()):
        C.flange(o, gap=0.003, depth=0.025)
        C.smooth_by_angle(o, 50)
    for o in glass.values():
        o.data.materials.clear()
        o.data.materials.append(C.MATS["glass"])
        for p in o.data.polygons:
            p.material_index = 0
    cab_body = C.join([cab, visor(hi), extenders(hi), grille_bars(hi), cab_bits(hi)], "cab_body")
    inter = interior(hi, cab_src)
    mirrors = {s: mirror(s, hi) for s in ("L", "R")}
    bmp = bumper(hi)
    lamps = headlamps(hi)
    ch, tail, amb = chassis(hi)
    fw = fifth_wheel(hi)
    fuel = tank("fuel_tank_mesh", -0.75, 0.70, 0.50, 1.20, 0.42, 1.02, "alu", hi)
    adb = tank("adblue_mesh", -1.25, -0.85, 0.50, 1.10, 0.55, 0.98, "plastic_black", hi)
    batt = C.obj("battery_box_mesh", C.box((0.85, 0.62, 0.48), loc=(0.15, -0.86, 0.74), bevel=0.03, segs=2 if hi else 1),
                 ["plastic_black"], sharp=40)
    C.uv_box(batt, 0.3)
    air = bmesh.new()
    for yy, zz in ((-0.72, 0.62), (-0.72, 0.90)):
        C.merge(air, C.lathe([(0.0, -0.55), (0.10, -0.54), (0.13, -0.50), (0.13, 0.50), (0.10, 0.54), (0.0, 0.55)],
                             20 if hi else 10, axis="X"))
        C.xform(air, loc=(0, 0, 0))
    air.free()
    air_o = []
    for zz in (0.60, 0.88):
        b = C.lathe([(0.0, -0.40), (0.09, -0.39), (0.12, -0.35), (0.12, 0.35), (0.09, 0.39), (0.0, 0.40)], 20 if hi else 10, axis="X")
        air_o.append(C.obj("air", C.xform(b, loc=(-1.60 + 0.0, -0.66, zz)), ["chassis_black"], sharp=50))
    airt = C.join(air_o, "air_tanks_mesh")
    # hierarchy
    root = C.empty("truck")
    chn = C.empty("chassis", root)
    for o in (ch, tail, amb, bmp, lamps):
        o.parent = chn
    bmp.name = "bumper"
    lamps.name = "headlamps"
    cabn = C.empty("cab", root, loc=HINGE)

    def attach(o, par, pivot):
        o.parent = par
        o.location = (o.location.x - pivot[0], o.location.y - pivot[1], o.location.z - pivot[2])

    for o in [cab_body, inter, glass.get("glass_windscreen")] + list(mirrors.values()):
        if o:
            attach(o, cabn, HINGE)
    for d in doors.values():
        d.name = d.name + "_panel"
        d.data.name = d.name
    for side in ("L", "R"):
        d = doors.get("door_" + side)
        if not d:
            continue
        piv = (DOOR_X[0], (CAB_W if side == "L" else -CAB_W), 2.0)
        e = C.empty("door_" + side, cabn, loc=(piv[0] - HINGE[0], piv[1] - HINGE[1], piv[2] - HINGE[2]))
        attach(d, e, piv)
        g = glass.get("glass_" + side)
        if g:
            attach(g, e, piv)
    for nm, o in (("fifth_wheel", fw), ("fuel_tank", fuel), ("adblue_tank", adb), ("battery_box", batt), ("air_tanks", airt)):
        e = C.empty(nm, root)
        o.parent = e
    # wheels
    tyre, rim_f, rim_d, hub_f, hub_d = wheel_sets(q)
    wheel_objs = []

    def inst(src, name, par, loc=(0, 0, 0), rz=0.0):
        o = src.copy()
        o.name = name
        bpy.context.scene.collection.objects.link(o)
        o.parent = par
        o.location = loc
        o.rotation_euler = (0, 0, rz)
        wheel_objs.append(o)
        return o

    for tag, x, y in (("FL", XF_AX, TRACK_F / 2), ("FR", XF_AX, -TRACK_F / 2)):
        hub = C.empty("steer_" + tag, root, loc=(x, y, WR))
        hub.rotation_euler = (0, 0, math.pi if y > 0 else 0.0)
        spin = C.empty("wheel_" + tag, hub)
        inst(tyre, "tyre_" + tag, spin)
        inst(rim_f, "rim_" + tag, spin)
        inst(hub_f, "hubcap_" + tag, spin)
    for tag, y in (("R1L", DUAL_C), ("R1R", -DUAL_C)):
        hub = C.empty("hub_" + tag, root, loc=(XR_AX, y, WR))
        hub.rotation_euler = (0, 0, math.pi if y > 0 else 0.0)
        spin = C.empty("wheel_" + tag, hub)
        # wheel frame face = Blender -Y: outer tyre at -DUAL_S, inner at +DUAL_S (the inner rim turned round)
        inst(tyre, "tyre_" + tag + "_o", spin, loc=(0, -DUAL_S, 0))
        inst(tyre, "tyre_" + tag + "_i", spin, loc=(0, DUAL_S, 0))
        inst(rim_d, "rim_" + tag + "_o", spin, loc=(0, -DUAL_S, 0))
        inst(rim_d, "rim_" + tag + "_i", spin, loc=(0, DUAL_S, 0), rz=math.pi)
        inst(hub_d, "hubcap_" + tag, spin, loc=(0, -DUAL_S, 0))
    for src in (tyre, rim_f, rim_d, hub_f, hub_d):
        bpy.data.objects.remove(src)
    # exploded view offsets (three space: x fwd, y up, z = -blender y)
    ex = {"cab": (0.8, 1.6, 0), "fifth_wheel": (0, 0.9, 0), "fuel_tank": (0, 0, -0.9), "adblue_tank": (0, 0, -0.9),
          "battery_box": (0, 0, 0.9), "air_tanks": (0, 0, 0.9), "steer_FL": (0.3, 0, -0.9), "steer_FR": (0.3, 0, 0.9),
          "hub_R1L": (0, 0, -0.9), "hub_R1R": (0, 0, 0.9)}
    for o in root.children_recursive:
        if o.name in ex:
            o["explode"] = list(ex[o.name])
    bpy.context.view_layer.update()
    meshes = [o for o in root.children_recursive if o.type == "MESH"]
    if not ao:
        for o in meshes:
            C.vcol_fill(o)
        return root
    big = [o for o in meshes if o not in wheel_objs and not o.name.startswith(("glass", "headlamps"))]
    C.bake_ao_vcol(big, samples=48 if hi else 20, max_dist=0.6, floor=0.25)
    firsts = {}
    for o in wheel_objs:
        firsts.setdefault(o.data.name, o)
    C.bake_ao_vcol(list(firsts.values()), samples=32 if hi else 16, max_dist=0.08, floor=0.3)
    for o in root.children_recursive:
        if o.type == "MESH" and o.name.startswith(("glass", "headlamps")):
            C.vcol_fill(o)
    return root


if __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    C.reset()
    root = build(q, ao=not a.get("noao"))
    if a.get("look"):
        H = os.path.join(C.HERE, "..", "public/lib3d/env/")
        views = {"side": ((0.3, -16, 1.9), (0.3, 0, 1.8), 24), "front": ((15, 0.0, 1.9), (0, 0, 1.8), 20),
                 "q3": ((9.5, -9.0, 3.2), (0.4, 0, 1.5), 28), "rear3": ((-9.0, -8.0, 3.5), (0, 0, 1.3), 28),
                 "close": ((6.0, -3.6, 1.6), (2.6, 0, 1.3), 36), "rearc": ((-4.8, -3.8, 1.8), (-1.8, 0, 0.8), 36),
                 "front": ((12.5, -1.0, 2.0), (0, 0, 1.8), 22)}
        for k in a.get("views", "side,q3,rear3,close").split(","):
            cam, tgt, fov = views[k]
            C.look(f"/tmp/l3d/truck_{k}.png", target=tgt, cam=cam, fov=fov, hdr=H + a.get("env", "workshop") + "-1k-v1.hdr",
                   ground=True, spp=int(a.get("spp", "24")), res=(1100, 620))
    if a.get("out") or not a.get("look"):
        C.finish("truck", q, root, a.get("out"))
