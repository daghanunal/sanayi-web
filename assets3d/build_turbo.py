"""Turbocharger (passenger car / light diesel, ~0.27 m long): cast-aluminium compressor housing with a
volute scroll, machined inlet lip and tangential outlet; cast-iron CHRA with oil feed / drain and water
ports; cast-iron turbine housing (heat-darkened) with a 4-bolt inlet flange and a V-band outlet;
milled compressor wheel (6 full + 6 splitter blades, twisted inducer, backswept exducer); inconel
turbine wheel (11 blades) on the shaft; wastegate actuator can + rod; braided oil feed line; drain tube.

  Blender -b --factory-startup --python assets3d/build_turbo.py -- --q hi [--out x.glb] [--look /tmp/t.png]

three.js space: shaft along X, compressor at +X, oil feed up (+Y). Origin: centred, sits on y = 0.
Nodes: turbo > compressor_housing, center_housing, turbine_housing, compressor_wheel, turbine_wheel, shaft,
actuator, oil_feed, oil_drain. compressor_wheel / turbine_wheel / shaft spin about their local X.
Every part carries extras.explode (metres, three space).
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

import common as C
import texgen as T


# ── shared helpers (also imported by build_exhaust.py / build_ac_compressor.py) ─────────
def uv_box01(ob, span=0.4):
    """box-projected metric UVs remapped into [0,1] (u = coord / span + 0.5) so meshopt can quantize
    them; the material repeat is uv_scale = span / tile."""
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            p = lp.vert.co
            if ax == 0:
                u, v = p.y, p.z
            elif ax == 1:
                u, v = p.x, p.z
            else:
                u, v = p.x, p.y
            lp[uvl].uv = (min(max(u / span + 0.5, 0.0), 1.0), min(max(v / span + 0.5, 0.0), 1.0))
    bm.to_mesh(me)
    bm.free()
    return ob


def set_explode(ob, v):
    ob["explode"] = [float(v[0]), float(v[1]), float(v[2])]


def ground_center(root):
    """move root so the bbox centre is at x = z = 0 (three) and the lowest point at y = 0"""
    bpy.context.view_layer.update()
    lo = Vector((1e9,) * 3)
    hi = Vector((-1e9,) * 3)
    for o in root.children_recursive:
        if o.type == "MESH":
            for c in o.bound_box:
                w = o.matrix_world @ Vector(c)
                lo = Vector(map(min, lo, w))
                hi = Vector(map(max, hi, w))
    root.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)
    bpy.context.view_layer.update()


def blade_mesh(bm, hub, shroud, theta, nm, ns, t, m0=0.0, mat=0):
    """thin blade between a hub and a shroud meridional curve around the X axis.
    hub(m), shroud(m) -> (x, r); theta(m, s) -> angle; t = thickness (m)."""
    grid = {}
    for side in (-1, 1):
        for i in range(nm + 1):
            m = m0 + (1 - m0) * i / nm
            xh, rh = hub(m)
            xs, rs = shroud(m)
            for j in range(ns + 1):
                s = j / ns
                x = xh + (xs - xh) * s
                r = rh + (rs - rh) * s
                th = theta(m, s) + side * (t / 2) / max(r, 1e-4)
                grid[(side, i, j)] = bm.verts.new((x, r * math.cos(th), r * math.sin(th)))
    fs = []
    for side in (-1, 1):
        for i in range(nm):
            for j in range(ns):
                q = [grid[(side, i, j)], grid[(side, i + 1, j)], grid[(side, i + 1, j + 1)], grid[(side, i, j + 1)]]
                fs.append(bm.faces.new(q if side > 0 else q[::-1]))
    # edges: leading (i=0), trailing (i=nm), tip (j=ns), root (j=0)
    for i in range(nm):
        for j in (0, ns):
            a, b = grid[(-1, i, j)], grid[(-1, i + 1, j)]
            c, d = grid[(1, i + 1, j)], grid[(1, i, j)]
            fs.append(bm.faces.new((a, b, c, d) if j == ns else (d, c, b, a)))
    for j in range(ns):
        for i in (0, nm):
            a, b = grid[(-1, i, j)], grid[(-1, i, j + 1)]
            c, d = grid[(1, i, j + 1)], grid[(1, i, j)]
            fs.append(bm.faces.new((d, c, b, a) if i == nm else (a, b, c, d)))
    for f in fs:
        f.material_index = mat
    return bm


def spiral_volute(bm, x0, r_base, rs0, rs1, turns=0.93, n=48, sides=20, exit_len=0.06, exit_r=None,
                  start=0.0, direction=1, mat=0, exit_tilt=0.0, open_end=False):
    """scroll: a tube spiralling around the X axis (section radius rs0 -> rs1, centre radius r_base + rs),
    then a straight tangential exit. Returns (bm, exit end point, exit direction)."""
    path, radii = [], []
    for k in range(n + 1):
        f = k / n
        th = start + direction * 2 * math.pi * turns * f
        rs = rs0 + (rs1 - rs0) * f
        rc = r_base + rs * 0.95
        path.append(Vector((x0 - 0.15 * rs * direction * 0, rc * math.cos(th), rc * math.sin(th))))
        radii.append(rs)
    th = start + direction * 2 * math.pi * turns
    tang = Vector((0, -math.sin(th), math.cos(th))) * direction
    tang = (tang + Vector((exit_tilt, 0, 0))).normalized()
    er = exit_r or rs1
    last = path[-1]
    for k in range(1, 7):
        f = k / 6
        path.append(last + tang * exit_len * f)
        radii.append(rs1 + (er - rs1) * f)
    if open_end:
        C.tube(path, 0, sides, caps=False, bm=bm, mat=mat, radii=radii)
        d0 = (path[1] - path[0]).normalized()
        cb = C.cyl(rs0 * 1.02, 0.004, sides, loc=(0, 0, 0))
        C.xform(cb, rot=d0.to_track_quat("Z", "X").to_matrix(), loc=path[0])
        C.merge(bm, cb)
    else:
        C.tube(path, 0, sides, caps=True, bm=bm, mat=mat, radii=radii)
    return bm, path[-1], tang


def mats(q):
    hi = q == "hi"
    n = 512 if hi else 256
    if hi:
        a, o, nn = T.cast_alu(n, seed=31, lum=0.55, rough=0.5)
        C.material("cast_alu", (1, 1, 1), albedo=C.image("t_alu_alb", a), orm=C.image("t_alu_orm", o, False),
                   normal=C.image("t_alu_n", nn, False), normal_strength=0.3, vcol=True, uv_scale=(4, 4))
        a, o, nn = T.cast_iron(n, seed=32, lum=0.20, rough=0.6, rust=0.12)
        C.material("cast_iron", (1, 1, 1), albedo=C.image("t_iron_alb", a), orm=C.image("t_iron_orm", o, False),
                   normal=C.image("t_iron_n", nn, False), normal_strength=0.35, vcol=True, uv_scale=(4, 4))
        a, o, nn = T.cast_iron(n, seed=33, lum=0.15, rough=0.72, rust=0.45)
        a = a * np.array([1.0, 0.86, 0.78], np.float32)  # heat-browned
        C.material("cast_iron_hot", (1, 1, 1), albedo=C.image("t_hot_alb", a), orm=C.image("t_hot_orm", o, False),
                   normal=C.image("t_hot_n", nn, False), normal_strength=0.45, vcol=True, uv_scale=(4, 4))
        # stainless braid for the oil feed (crosshatch)
        yy, xx = np.mgrid[0:256, 0:256].astype(np.float32)
        h = 0.5 + 0.25 * np.sin((xx + yy) * 2 * np.pi / 16) + 0.25 * np.sin((xx - yy) * 2 * np.pi / 16)
        C.material("braid", C.srgb("#b9bcc0"), 0.38, 1.0, normal=C.image("t_braid_n", T.normal_from_height(h, 2.5), False),
                   vcol=True, uv_scale=(20, 1))
    else:
        C.material("cast_alu", C.srgb("#9ea1a4"), 0.5, 1.0, vcol=True)
        C.material("cast_iron", C.srgb("#4a4b4d"), 0.6, 1.0, vcol=True)
        C.material("cast_iron_hot", C.srgb("#3c3431"), 0.72, 0.8, vcol=True)
        C.material("braid", C.srgb("#b9bcc0"), 0.38, 1.0, vcol=True)
    C.material("alu_machined", C.srgb("#d4d6d9"), 0.22, 1.0, vcol=True)
    C.material("alu_milled", C.srgb("#dcdee1"), 0.16, 1.0, vcol=True)
    C.material("inconel", C.srgb("#4b4750"), 0.38, 1.0, vcol=True)
    C.material("steel", C.srgb("#b3b6ba"), 0.32, 1.0, vcol=True)
    C.material("steel_dark", C.srgb("#3a3b3e"), 0.42, 1.0, vcol=True)
    C.material("actuator_paint", C.srgb("#1b1c1e"), 0.55, 0.3, coat=0.2, coat_rough=0.35, vcol=True)
    C.material("rubber", C.srgb("#151515"), 0.75, 0.0, vcol=True)
    C.material("brass", C.srgb("#b08d4a"), 0.3, 1.0, vcol=True)
    C.material("bore_dark", C.srgb("#2a2b2d"), 0.6, 0.8, double=True)


# ── parts ────────────────────────────────────────────────────────────────────
# compressor wheel meridional curves (x, r) — see module docstring for the layout
def c_hub(m):
    ph = m * math.pi / 2
    return 0.058 + 0.042 * (1 - math.sin(ph)), 0.0085 + 0.0355 * (1 - math.cos(ph))


def c_shroud(m):
    ph = m * math.pi / 2
    return 0.0625 + 0.0425 * (1 - math.sin(ph)), 0.0265 + 0.0175 * (1 - math.cos(ph))


def compressor_wheel(q):
    hi = q == "hi"
    bm = bmesh.new()
    segs = 64 if hi else 24
    # hub body: nose -> concave flow surface -> back disc
    prof = [(0.0, 0.118), (0.0045, 0.118), (0.0062, 0.114), (0.0062, 0.106)]  # nut
    for k in range(13):
        x, r = c_hub(k / 12)
        prof.append((r - 0.0004, x))
    prof += [(0.0442, 0.0555), (0.043, 0.0535), (0.012, 0.052), (0.0, 0.052)]
    C.lathe(prof, segs, axis="X", bm=bm)
    nm, ns = (16, 5) if hi else (8, 2)
    t = 0.0011
    for k in range(6):
        base = 2 * math.pi * k / 6
        th = lambda m, s, b=base: b - 0.95 * (1 - m) ** 2.2 * (0.55 + 0.45 * s) + 0.42 * m ** 2
        blade_mesh(bm, c_hub, c_shroud, th, nm, ns, t)
        th2 = lambda m, s, b=base + math.pi / 6: b - 0.95 * (1 - m) ** 2.2 * (0.55 + 0.45 * s) + 0.42 * m ** 2
        blade_mesh(bm, c_hub, c_shroud, th2, nm, ns, t, m0=0.38)
    # nose nut hex
    C.cyl(0.0068, 0.009, 6, loc=(0.1095, 0, 0), axis="X", bm=bm)
    ob = C.obj("compressor_wheel", bm, ["alu_milled"], sharp=35, recalc=False)
    return ob


def t_hub(m):
    ph = m * math.pi / 2
    return -0.052 - 0.040 * (1 - math.cos(ph)), 0.029 - 0.0195 * math.sin(ph)


def t_shroud(m):
    ph = m * math.pi / 2
    return -0.0645 - 0.0275 * (1 - math.cos(ph)), 0.0305 - 0.0045 * math.sin(ph)


def turbine_wheel(q):
    hi = q == "hi"
    bm = bmesh.new()
    segs = 64 if hi else 24
    prof = [(0.0, -0.0935), (0.0085, -0.0935)]
    for k in range(12, -1, -1):
        x, r = t_hub(k / 12)
        prof.append((r - 0.0004, x))
    prof += [(0.0295, -0.0505), (0.028, -0.0485), (0.010, -0.047), (0.0065, -0.044), (0.0, -0.044)]
    C.lathe(prof, segs, axis="X", bm=bm)
    nm, ns = (14, 4) if hi else (7, 2)
    for k in range(11):
        base = 2 * math.pi * k / 11
        th = lambda m, s, b=base: b + 0.85 * max(0.0, m - 0.35) ** 2.2 * (0.6 + 0.4 * s)
        blade_mesh(bm, t_hub, t_shroud, th, nm, ns, 0.0013)
    return C.obj("turbine_wheel", bm, ["inconel"], sharp=35, recalc=False)


def shaft(q):
    bm = bmesh.new()
    C.cyl(0.0045, 0.155, 16 if q == "hi" else 8, loc=(0.03, 0, 0), axis="X", bm=bm)
    # thrust collar + piston-ring grooves
    C.cyl(0.0085, 0.006, 20 if q == "hi" else 10, loc=(0.047, 0, 0), axis="X", bm=bm)
    C.cyl(0.0075, 0.008, 20 if q == "hi" else 10, loc=(-0.040, 0, 0), axis="X", bm=bm)
    return C.obj("shaft", bm, ["steel"], sharp=40)


def compressor_housing(q):
    hi = q == "hi"
    segs = 72 if hi else 28
    bm = bmesh.new()
    # inlet + shroud shell: inner surface follows the wheel shroud (+0.6 mm), outer cast skin
    inner = [(0.0285, 0.136), (0.0275, 0.118)]
    for k in range(13):
        x, r = c_shroud(k / 12)
        inner.append((r + 0.0006, x))
    inner += [(0.056, 0.0625)]
    outer = [(0.060, 0.057), (0.052, 0.068), (0.040, 0.080), (0.0345, 0.092), (0.0345, 0.118), (0.0370, 0.121),
             (0.0370, 0.1255), (0.0345, 0.128), (0.0345, 0.133), (0.0335, 0.136)]
    prof = inner + outer + [inner[0]]
    mi = [1 if (i < 2 or i >= len(prof) - 5) else 0 for i in range(len(prof) - 1)]
    C.lathe(prof[::-1], segs, axis="X", bm=bm, mat_idx=mi[::-1])
    # back plate ring (diffuser wall, bolted to the CHRA)
    C.lathe([(0.056, 0.0575), (0.071, 0.0575), (0.073, 0.052), (0.073, 0.046), (0.070, 0.044), (0.056, 0.044), (0.056, 0.0575)],
            segs, axis="X", bm=bm)
    # volute: grows from the tongue, exits tangentially upward
    vb = bmesh.new()
    spiral_volute(vb, 0.053, 0.050, 0.009, 0.0255, turns=0.9, n=40 if hi else 16, sides=20 if hi else 10,
                  exit_len=0.075, exit_r=0.0255, start=math.radians(36), direction=1, open_end=True)
    C.merge(bm, vb)
    # outlet hose bead + flange ring at the end of the exit
    th = math.radians(36) + 2 * math.pi * 0.9
    tang = Vector((0, -math.sin(th), math.cos(th)))
    rc = 0.050 + 0.0255 * 0.95
    end = Vector((0.053, rc * math.cos(th), rc * math.sin(th))) + tang * 0.075
    rot = tang.to_track_quat("Z", "X").to_matrix()
    for d, rr, w in ((-0.004, 0.0275, 0.004), (-0.014, 0.0275, 0.003)):
        rb = C.lathe([(0.0240, -w / 2), (rr, -w / 2), (rr, w / 2), (0.0240, w / 2)], 24 if hi else 10, axis="Z")
        C.xform(rb, rot=rot, loc=end + tang * d)
        C.merge(bm, rb)
    # open outlet: machined lip ring + dark bore (double-sided)
    lip = C.lathe([(0.0205, 0.0), (0.0255, 0.0), (0.0255, 0.0015), (0.0205, 0.0015)], 24 if hi else 10, axis="Z")
    C.xform(lip, rot=rot, loc=end - tang * 0.0012)
    for f in lip.faces:
        f.material_index = 1
    C.merge(bm, lip)
    bore = C.lathe([(0.0205, 0.0), (0.0205, -0.05), (0.0, -0.05)], 24 if hi else 10, axis="Z")
    C.xform(bore, rot=rot, loc=end)
    for f in bore.faces:
        f.material_index = 2
    # mounting bosses for the actuator bracket
    for ang in (math.radians(235), math.radians(265)):
        C.cyl(0.006, 0.014, 12, loc=(0.052, 0.074 * math.cos(ang), 0.074 * math.sin(ang)), axis="X", bm=bm)
    ob = C.obj("compressor_housing", bm, ["cast_alu", "alu_machined", "bore_dark"], sharp=40)
    uv_box01(ob, 0.4)
    return ob


def center_housing(q):
    hi = q == "hi"
    segs = 56 if hi else 24
    prof = [(0.020, 0.044), (0.056, 0.044), (0.056, 0.036), (0.040, 0.032), (0.034, 0.022), (0.034, -0.012),
            (0.038, -0.020), (0.046, -0.028), (0.052, -0.034), (0.052, -0.044), (0.020, -0.044), (0.020, 0.044)]
    bm = C.lathe(prof, segs, axis="X")
    # oil inlet boss (top), drain flange (bottom), water ports (sides)
    C.cyl(0.011, 0.024, 20 if hi else 10, loc=(0.006, 0, 0.042), axis="Z", bm=bm)
    C.box((0.034, 0.030, 0.012), loc=(0.004, 0, -0.040), bevel=0.003, segs=1, bm=bm)
    C.box((0.050, 0.040, 0.007), loc=(0.004, 0, -0.049), bevel=0.003, segs=1, bm=bm)
    for sg in (1, -1):
        C.cyl(0.008, 0.016, 16 if hi else 8, loc=(-0.004, sg * 0.040, 0.004), axis="Y", bm=bm)
    ob = C.obj("center_housing", bm, ["cast_iron"], sharp=40)
    uv_box01(ob, 0.4)
    # fittings (steel hex)
    fb = bmesh.new()
    for sg in (1, -1):
        C.cyl(0.0095, 0.008, 6, loc=(-0.004, sg * 0.052, 0.004), axis="Y", bm=fb)
        C.cyl(0.005, 0.008, 12, loc=(-0.004, sg * 0.060, 0.004), axis="Y", bm=fb)
    for yy in (-0.019, 0.019):  # drain flange bolts
        C.cyl(0.0055, 0.006, 6, loc=(0.004 + 0.0, yy, -0.0555), axis="Z", bm=fb)
    for k in range(8):  # CHRA / turbine housing clamp bolts
        a = 2 * math.pi * (k + 0.5) / 8
        C.cyl(0.0048, 0.006, 6, loc=(-0.047, 0.059 * math.cos(a), 0.059 * math.sin(a)), axis="X", bm=fb)
    fit = C.obj("chra_fittings", fb, ["steel"], sharp=30)
    return C.join([ob, fit], "center_housing")


def turbine_housing(q):
    hi = q == "hi"
    segs = 64 if hi else 24
    bm = bmesh.new()
    inner = []
    for k in range(13):
        x, r = t_shroud(k / 12)
        inner.append((r + 0.0006, x))
    inner = [(0.052, -0.058), (0.034, -0.0605)] + inner + [(0.0265, -0.100), (0.029, -0.126)]
    outer = [(0.036, -0.126), (0.036, -0.112), (0.0405, -0.110), (0.043, -0.114), (0.043, -0.124), (0.046, -0.126),
             (0.046, -0.131), (0.0355, -0.131), (0.0355, -0.126)]
    # outlet tube + V-band flange
    prof = [(0.029, -0.131), (0.029, -0.126), (0.0355, -0.126)]
    C.lathe([(0.0265, -0.100), (0.029, -0.131), (0.0355, -0.131), (0.0355, -0.121), (0.0415, -0.119), (0.0445, -0.123),
             (0.0445, -0.131), (0.0475, -0.133), (0.0475, -0.138), (0.034, -0.138), (0.033, -0.100), (0.040, -0.090),
             (0.048, -0.076), (0.056, -0.062), (0.058, -0.052), (0.052, -0.050), (0.034, -0.060), (0.028, -0.080),
             (0.0265, -0.100)][::-1], segs, axis="X", bm=bm)
    # scroll: starts at the tangential inlet (down), wraps once around the wheel
    vb = bmesh.new()
    spiral_volute(vb, -0.071, 0.052, 0.030, 0.011, turns=0.92, n=40 if hi else 16, sides=20 if hi else 10,
                  exit_len=0.001, start=math.radians(-90), direction=-1)
    C.merge(bm, vb)
    # inlet duct from the scroll start down to the flange
    th0 = math.radians(-90)
    p0 = Vector((-0.071, 0.0, -(0.052 + 0.030 * 0.95)))
    duct = [p0 + Vector((0, 0.030, 0.0)), p0 + Vector((0, 0.03, -0.035)), p0 + Vector((0, 0.03, -0.050))]
    C.tube(duct, 0.029, 20 if hi else 10, bm=bm)
    fl = C.box((0.074, 0.072, 0.012), loc=(-0.071, 0.030, p0.z - 0.056), bevel=0.004, segs=1)
    C.merge(bm, fl)
    # wastegate boss + lever at the outlet side (-Y blender = +Z three)
    C.cyl(0.009, 0.020, 14 if hi else 8, loc=(-0.108, -0.043, 0.012), axis="Y", bm=bm)
    ob = C.obj("turbine_housing", bm, ["cast_iron_hot"], sharp=40)
    uv_box01(ob, 0.4)
    sb = bmesh.new()
    for dx in (-0.026, 0.026):
        for dy in (-0.026, 0.026):
            C.cyl(0.0065, 0.010, 6, loc=(-0.071 + dx, 0.030 + dy, p0.z - 0.066), axis="Z", bm=sb)
    lever = C.box((0.030, 0.006, 0.010), loc=(-0.100, -0.056, 0.014), bevel=0.002, segs=1)
    C.merge(sb, lever)
    C.cyl(0.004, 0.012, 10, loc=(-0.108, -0.056, 0.012), axis="Y", bm=sb)
    studs = C.obj("th_hw", sb, ["steel_dark"], sharp=30)
    # V-band clamp at the outlet flange
    vb2 = C.torus(0.050, 0.0045, 48 if hi else 20, 8 if hi else 5, loc=(0, 0, 0), axis="X")
    C.xform(vb2, loc=(-0.1325, 0, 0))
    C.box((0.012, 0.016, 0.022), loc=(-0.1325, 0.0, 0.058), bevel=0.002, segs=1, bm=vb2)
    clamp = C.obj("vband", vb2, ["steel"], sharp=40)
    return C.join([ob, studs, clamp], "turbine_housing")


def actuator(q):
    hi = q == "hi"
    segs = 40 if hi else 16
    # pressed-steel can, axis along X, on a bracket off the compressor housing
    prof = [(0.0, 0.0675), (0.020, 0.0672), (0.027, 0.0662), (0.0305, 0.0640), (0.0318, 0.0605), (0.0340, 0.0600),
            (0.0340, 0.0575), (0.0318, 0.0570), (0.0305, 0.0535), (0.027, 0.0512), (0.020, 0.0503), (0.0, 0.050)]
    bm = C.lathe(prof, segs, axis="X")
    C.xform(bm, loc=(0.0, -0.070, -0.068))
    can = C.obj("act_can", bm, ["actuator_paint"], sharp=35)
    hb = bmesh.new()
    C.cyl(0.0035, 0.016, 10, loc=(0.076, -0.070 + 0.010, -0.068 + 0.008), axis="X", bm=hb)  # pressure nipple
    C.tube(C.bezier_path([Vector((0.083, -0.060, -0.060)), Vector((0.098, -0.058, -0.052)), Vector((0.104, -0.050, -0.030)),
                          Vector((0.100, -0.040, -0.012))], 6), 0.0042, 10 if hi else 6, bm=hb)
    hose = C.obj("act_hose", hb, ["rubber"], sharp=40)
    rb = bmesh.new()
    rod_end = Vector((-0.100, -0.056, 0.004))
    C.tube([Vector((0.046, -0.070, -0.068)), Vector((-0.03, -0.066, -0.036)), rod_end], 0.0028, 10 if hi else 6, bm=rb)
    C.cyl(0.0055, 0.006, 6, loc=(-0.045, -0.067, -0.042), axis="X", bm=rb)  # lock nut
    # bracket plate from the compressor housing boss down to the can
    br = C.box((0.006, 0.030, 0.050), loc=(0.044, -0.070, -0.050), bevel=0.003, segs=1)
    C.xform(br, loc=(0, 0, 0))
    C.merge(rb, br)
    rod = C.obj("act_rod", rb, ["steel"], sharp=35)
    return C.join([can, hose, rod], "actuator")


def oil_feed(q):
    hi = q == "hi"
    pts = C.bend_path([Vector((0.006, 0, 0.054)), Vector((0.006, 0, 0.098)), Vector((0.040, 0.0, 0.118)),
                       Vector((0.130, 0.006, 0.122))], r=0.02, res=6 if hi else 3)
    bm = C.tube(pts, 0.0048, 14 if hi else 6)
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        for lp in f.loops:
            u, v = lp[uvl].uv
            lp[uvl].uv = (min(u / 0.3, 1.0), v)
    line = C.obj("oil_line", bm, ["braid"], sharp=50)
    fb = bmesh.new()
    C.cyl(0.0085, 0.010, 6, loc=(0.006, 0, 0.058), axis="Z", bm=fb)  # banjo / fitting hex
    C.cyl(0.0070, 0.014, 6, loc=(0.126, 0.006, 0.122), axis="X", bm=fb)
    fit = C.obj("oil_fit", fb, ["brass"], sharp=30)
    return C.join([line, fit], "oil_feed")


def oil_drain(q):
    hi = q == "hi"
    bm = C.tube(C.bend_path([Vector((0.004, 0, -0.052)), Vector((0.004, 0, -0.080)), Vector((0.020, 0, -0.100)),
                             Vector((0.030, 0, -0.118))], r=0.02, res=6 if hi else 3), 0.0095, 18 if hi else 8)
    pipe = C.obj("drain_pipe", bm, ["steel"], sharp=50)
    hb = C.tube([Vector((0.030, 0, -0.112)), Vector((0.036, 0, -0.130))], 0.0125, 18 if hi else 8)
    hose = C.obj("drain_hose", hb, ["rubber"], sharp=50)
    return C.join([pipe, hose], "oil_drain")


def build(q, ao=True):
    C.reset()
    mats(q)
    root = C.empty("turbo")
    parts = {
        "compressor_housing": (compressor_housing(q), (0.12, 0.0, 0.0)),
        "center_housing": (center_housing(q), (0.0, 0.0, 0.0)),
        "turbine_housing": (turbine_housing(q), (-0.12, 0.0, 0.0)),
        "compressor_wheel": (compressor_wheel(q), (0.055, 0.0, 0.0)),
        "turbine_wheel": (turbine_wheel(q), (-0.05, 0.0, 0.0)),
        "shaft": (shaft(q), (-0.05, 0.0, 0.0)),
        "actuator": (actuator(q), (0.02, -0.02, 0.10)),
        "oil_feed": (oil_feed(q), (0.0, 0.07, 0.0)),
        "oil_drain": (oil_drain(q), (0.0, -0.06, 0.0)),
    }
    for k, (o, ex) in parts.items():
        o.name = k
        o.data.name = k
        o.parent = root
        set_explode(o, ex)
    meshes = [o for o, _ in parts.values()]
    if ao:
        C.bake_ao_vcol(meshes, samples=64 if q == "hi" else 24, max_dist=0.03, floor=0.3)
    else:
        for o in meshes:
            C.vcol_fill(o)
    ground_center(root)
    return root


if __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    root = build(q, ao=not a.get("noao"))
    if a.get("look"):
        H = os.path.join(C.HERE, "..", "public/lib3d/env/")
        s = float(a.get("s", "1"))
        az = math.radians(float(a.get("az", "35")))
        cam = (0.62 * s * math.sin(az), -0.62 * s * math.cos(az), 0.10 + 0.20 * s)
        C.look(a["look"], target=(0, 0, 0.11), cam=cam, fov=30, hdr=H + a.get("env", "studio") + "-1k-v1.hdr",
               ground=True, spp=int(a.get("spp", "48")), res=(1100, 800))
    if a.get("out") or not a.get("look"):
        C.finish("turbo", q, root, a.get("out"))
