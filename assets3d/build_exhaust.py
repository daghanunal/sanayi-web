"""Passenger-car exhaust line (~3.8 m): tubular 4-1 stainless manifold with heat tint, braided flex joint,
downpipe, oval catalytic converter under a dimpled heat shield, DPF can with sensor bosses and a
differential-pressure line, mid pipe with resonator and a kick-up over the rear axle, oval rear muffler
with lock seams and stiffening beads, tailpipe with a rolled chrome tip, welded hangers with rubber
isolators, 2-bolt flanges with graphite gaskets and a band clamp.

  Blender -b --factory-startup --python assets3d/build_exhaust.py -- --q hi [--out x.glb] [--look /tmp/e.png]

three.js space: along X, engine end at +X, up +Y. Origin: bbox centre, lowest point on y = 0.
Nodes: exhaust > manifold, flex, downpipe, catalyst, dpf, midpipe, resonator, muffler, tailpipe, hangers.
Every part carries extras.explode (segments pulled apart along X with small lifts).
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
from build_turbo import ground_center, set_explode, uv_box01

V = Vector


def mats(q):
    hi = q == "hi"
    n = 512 if hi else 256
    if hi:
        a, o, nn = T.heat_steel(n, seed=41, rough=0.34)
        C.material("steel_heat", (1, 1, 1), albedo=C.image("e_heat_alb", a), orm=C.image("e_heat_orm", o, False),
                   normal=C.image("e_heat_n", nn, False), normal_strength=0.4, vcol=True)
        # aluminized steel: mottled dull grey with light surface rust at the seams
        m = T.fbm(n, n, base=5, octaves=5, seed=42)
        f = T.fbm(n, n, base=64, octaves=3, seed=43)
        rust = np.clip((T.fbm(n, n, base=8, octaves=5, seed=44) - 0.62) * 3.0, 0, 1)
        base = T.gray3(0.50 + 0.10 * (m - 0.5) + 0.05 * (f - 0.5))
        rc = np.array([0.30, 0.13, 0.05], np.float32)
        alb = base * (1 - rust[..., None]) + rc * rust[..., None]
        C.material("aluminized", (1, 1, 1), albedo=C.image("e_alz_alb", alb),
                   orm=C.image("e_alz_orm", T.orm(1, np.clip(0.5 + 0.1 * (f - 0.5) + 0.3 * rust, 0, 1), 0.9 - 0.7 * rust), False),
                   normal=C.image("e_alz_n", T.normal_from_height(f + rust * 0.8, 0.8), False), normal_strength=0.5,
                   vcol=True, uv_scale=(14, 14))
        # dimpled heat shield
        f1, e, v = T.voronoi(256, 256, 400, seed=45)
        h = np.clip(1 - f1 * 1.6, 0, 1) ** 2
        C.material("heat_shield", C.srgb("#d0d3d6"), 0.35, 1.0, normal=C.image("e_shield_n", T.normal_from_height(-h, 2.2), False),
                   vcol=True, uv_scale=(6, 6), double=True)
        yy, xx = np.mgrid[0:256, 0:256].astype(np.float32)
        hb = 0.5 + 0.25 * np.sin((xx + yy) * 2 * np.pi / 16) + 0.25 * np.sin((xx - yy) * 2 * np.pi / 16)
        C.material("flex_braid", C.srgb("#b6b9bd"), 0.4, 1.0, normal=C.image("e_braid_n", T.normal_from_height(hb, 5.0), False),
                   vcol=True, uv_scale=(28, 7))
    else:
        C.material("steel_heat", C.srgb("#8a7f78"), 0.36, 1.0, vcol=True)
        C.material("aluminized", C.srgb("#7c7e80"), 0.52, 0.85, vcol=True)
        C.material("heat_shield", C.srgb("#c3c6c9"), 0.45, 1.0, vcol=True)
        C.material("flex_braid", C.srgb("#b6b9bd"), 0.45, 1.0, vcol=True)
    C.material("stainless", C.srgb("#b8bbbf"), 0.3, 1.0, vcol=True)
    C.material("chrome", C.srgb("#eceef0"), 0.06, 1.0, vcol=True)
    C.material("bore_dark", C.srgb("#141414"), 0.8, 0.3, double=True)
    C.material("rubber", C.srgb("#141414"), 0.8, 0.0, vcol=True)
    C.material("gasket", C.srgb("#2c2c2e"), 0.7, 0.3, vcol=True)
    C.material("bolt", C.srgb("#4a4b4e"), 0.45, 1.0, vcol=True)


def seg_q(hi, a, b):
    return a if hi else b


def pipe(path, r, hi, mat=0, bm=None, sides=None, bend=0.08):
    pts = C.bend_path(path, r=bend, res=seg_q(hi, 8, 3))
    return C.tube(pts, r, sides or seg_q(hi, 20, 8), bm=bm, mat=mat)


def flange2(bm, center, axis, hi, gasket_bm=None, bolt_bm=None, r=0.052):
    """2-bolt diamond flange pair + gasket, centred on `center`, facing `axis`"""
    rot = V(axis).normalized().to_track_quat("Z", "Y").to_matrix()
    for d in (-0.007, 0.007):
        fb = bmesh.new()
        C.cyl(0.034, 0.008, seg_q(hi, 24, 10), bm=fb)
        for sg in (1, -1):
            C.cyl(0.016, 0.008, seg_q(hi, 12, 6), loc=(0, sg * 0.040, 0), bm=fb)
        C.box((0.024, 0.080, 0.008), bm=fb)
        C.xform(fb, rot=rot, loc=V(center) + V(axis).normalized() * d)
        C.merge(bm, fb)
    if gasket_bm is not None:
        g = C.cyl(0.032, 0.004, seg_q(hi, 24, 10))
        C.xform(g, rot=rot, loc=center)
        C.merge(gasket_bm, g)
    if bolt_bm is not None:
        for sg in (1, -1):
            b = bmesh.new()
            C.cyl(0.0065, 0.036, 8, loc=(0, sg * 0.040, 0), bm=b)
            C.cyl(0.0095, 0.007, 6, loc=(0, sg * 0.040, 0.015), bm=b)
            C.cyl(0.0095, 0.007, 6, loc=(0, sg * 0.040, -0.015), bm=b)
            C.xform(b, rot=rot, loc=center)
            C.merge(bolt_bm, b)


def can(profile_rx, hi, scale_yz=(1.0, 1.0), loc=(0, 0, 0), segs=None, mat=0, bm=None):
    """lathe around X from (r, x) profile, squashed to an oval"""
    b = C.lathe(profile_rx, segs or seg_q(hi, 48, 16), axis="X")
    for v in b.verts:
        v.co.y *= scale_yz[0]
        v.co.z *= scale_yz[1]
    C.xform(b, loc=loc)
    for f in b.faces:
        f.material_index = mat
    if bm is None:
        return b
    C.merge(bm, b)
    return bm


def ring(x, r, rr, hi, scale_yz=(1, 1), loc_yz=(0, 0), bm=None):
    b = C.torus(r, rr, seg_q(hi, 48, 16), seg_q(hi, 8, 4), axis="X")
    for v in b.verts:
        v.co.y = v.co.y * scale_yz[0] + loc_yz[0]
        v.co.z = v.co.z * scale_yz[1] + loc_yz[1]
        v.co.x += x
    if bm is None:
        return b
    C.merge(bm, b)
    return bm


# ── layout (Blender space, metres) ────────────────────────────────────────────
PORTS = [0.135, 0.045, -0.045, -0.135]
COLL = V((1.655, 0.0, 0.405))
FLEX0, FLEX1 = V((1.625, 0.0, 0.345)), V((1.475, 0.0, 0.275))
CAT0, CAT1 = 1.265, 0.945
DPF0, DPF1 = 0.895, 0.52
Z_LINE = 0.24


def manifold(q):
    hi = q == "hi"
    bm = bmesh.new()
    for y in PORTS:
        path = C.bend_path([V((1.815, y, 0.55)), V((1.765, y, 0.55)), V((1.715, y * 0.62, 0.50)),
                            V((1.672, y * 0.18, 0.44)), COLL + V((0, y * 0.05, 0))], r=0.045, res=seg_q(hi, 8, 3))
        b = C.tube(path, 0.0185, seg_q(hi, 18, 8))
        # heat-tint UV: u runs from blue (hot, at the head) to straw (collector)
        uvl = b.loops.layers.uv.verify()
        L = sum((path[i + 1] - path[i]).length for i in range(len(path) - 1))
        for f in b.faces:
            for lp in f.loops:
                u, v = lp[uvl].uv
                lp[uvl].uv = (min(max(0.80 - 0.55 * u / L, 0.02), 0.98), v)
        C.merge(bm, b)
    # collector cone down to the flange
    d = (FLEX0 - COLL).normalized()
    cb = C.lathe([(0.046, 0.0), (0.044, 0.012), (0.032, 0.040), (0.027, 0.062)], seg_q(hi, 24, 10), axis="Z")
    uvl = cb.loops.layers.uv.verify()
    for f in cb.faces:
        for lp in f.loops:
            lp[uvl].uv = (0.3, lp[uvl].uv.x)
    C.xform(cb, rot=d.to_track_quat("Z", "Y").to_matrix(), loc=COLL - d * 0.012)
    C.merge(bm, cb)
    tube = C.obj("manifold_tubes", bm, ["steel_heat"], sharp=50)
    # head flange plate with port bosses and studs
    pb = bmesh.new()
    C.box((0.012, 0.40, 0.075), loc=(1.821, 0, 0.55), bevel=0.004, segs=seg_q(hi, 2, 1), bm=pb)
    sb = bmesh.new()
    for y in (0.18, 0.09, 0.0, -0.09, -0.18):
        for z in (0.522, 0.578):
            if abs(y) > 0.001 and (y in (0.18, -0.18) or z > 0.55):
                C.cyl(0.0075, 0.009, 6, loc=(1.812, y, z), axis="X", bm=sb)
    plate = C.obj("manifold_plate", pb, ["stainless"], sharp=40)
    nuts = C.obj("manifold_nuts", sb, ["bolt"], sharp=30)
    fb, gb, bb = bmesh.new(), bmesh.new(), bmesh.new()
    flange2(fb, FLEX0 + (COLL - FLEX0).normalized() * 0.018, COLL - FLEX0, hi, gb, bb)
    fl = C.obj("m_fl", fb, ["stainless"], sharp=40)
    ga = C.obj("m_ga", gb, ["gasket"], sharp=40)
    bo = C.obj("m_bo", bb, ["bolt"], sharp=30)
    return C.join([tube, plate, nuts, fl, ga, bo], "manifold")


def flex(q):
    hi = q == "hi"
    bm = C.tube([FLEX0, FLEX1], 0.0275, seg_q(hi, 24, 10))
    uvl = bm.loops.layers.uv.verify()
    L = (FLEX1 - FLEX0).length
    for f in bm.faces:
        for lp in f.loops:
            u, v = lp[uvl].uv
            lp[uvl].uv = (u / max(L, 1e-6), v)
    braid = C.obj("flex_braid", bm, ["flex_braid"], sharp=60)
    cb = bmesh.new()
    d = (FLEX1 - FLEX0).normalized()
    for p in (FLEX0 + d * 0.012, FLEX1 - d * 0.012):
        c = C.cyl(0.0305, 0.024, seg_q(hi, 24, 10))
        C.xform(c, rot=d.to_track_quat("Z", "Y").to_matrix(), loc=p)
        C.merge(cb, c)
    col = C.obj("flex_collars", cb, ["stainless"], sharp=40)
    return C.join([braid, col], "flex")


def downpipe(q):
    hi = q == "hi"
    bm = pipe([FLEX1, FLEX1 + V((-0.06, 0, -0.02)), V((CAT0 + 0.075, 0, Z_LINE + 0.006)), V((CAT0 + 0.02, 0, Z_LINE))], 0.0265, hi, bend=0.12)
    p = C.obj("downpipe_tube", bm, ["stainless"], sharp=50)
    fb, gb, bb = bmesh.new(), bmesh.new(), bmesh.new()
    flange2(fb, V((CAT0 + 0.03, 0, Z_LINE)), (1, 0, 0), hi, gb, bb)
    return C.join([p, C.obj("d_fl", fb, ["stainless"], sharp=40), C.obj("d_ga", gb, ["gasket"]), C.obj("d_bo", bb, ["bolt"], sharp=30)],
                  "downpipe")


def catalyst(q):
    hi = q == "hi"
    L0, L1 = CAT0, CAT1
    prof = [(0.0265, L0 + 0.02), (0.030, L0), (0.070, L0 - 0.045), (0.080, L0 - 0.058), (0.080, L1 + 0.058), (0.070, L1 + 0.045),
            (0.030, L1), (0.0265, L1 - 0.02)]
    bm = can(prof, hi, (1.0, 0.70), loc=(0, 0, Z_LINE))
    body = C.obj("cat_can", bm, ["aluminized"], sharp=40)
    uv_box01(body, 4.0)
    sb = bmesh.new()
    for x in (L0 - 0.058, L1 + 0.058):
        ring(x, 0.080, 0.003, hi, (1.0, 0.70), (0, Z_LINE), bm=sb)
    seams = C.obj("cat_seams", sb, ["stainless"], sharp=40)
    # heat shield: top half shell, offset outward
    shp = [(0.086, L0 - 0.050), (0.096, L0 - 0.062), (0.097, L0 - 0.070), (0.097, L1 + 0.070), (0.096, L1 + 0.062), (0.086, L1 + 0.050)]
    hb = C.lathe(shp, seg_q(hi, 32, 12), axis="X", angle=math.pi * 0.8, ofs=math.pi * 0.1)
    for v in hb.verts:
        v.co.z = v.co.z * 0.78 + Z_LINE + 0.004
    C.solidify if False else None
    shield = C.obj("cat_shield", hb, ["heat_shield"], sharp=40, recalc=False)
    uv_box01(shield, 4.0)
    # O2 sensor boss behind the can
    ob = bmesh.new()
    C.cyl(0.010, 0.030, 12, loc=(L1 - 0.02, 0, Z_LINE + 0.035), axis="Z", bm=ob)
    C.cyl(0.012, 0.012, 6, loc=(L1 - 0.02, 0, Z_LINE + 0.055), axis="Z", bm=ob)
    sens = C.obj("cat_o2", ob, ["stainless"], sharp=35)
    return C.join([body, seams, shield, sens], "catalyst")


def dpf(q):
    hi = q == "hi"
    L0, L1 = DPF0, DPF1
    tie = [(0.0265, CAT1 - 0.02), (0.0265, L0 + 0.01)]
    prof = [(0.0265, CAT1 - 0.019), (0.0265, L0 + 0.012), (0.034, L0), (0.070, L0 - 0.040), (0.078, L0 - 0.052), (0.078, L1 + 0.052),
            (0.070, L1 + 0.040), (0.030, L1), (0.0245, L1 - 0.02)]
    bm = can(prof, hi, (1.0, 0.95), loc=(0, 0, Z_LINE))
    body = C.obj("dpf_can", bm, ["aluminized"], sharp=40)
    uv_box01(body, 4.0)
    sb = bmesh.new()
    for x in (L0 - 0.052, L1 + 0.052, (L0 + L1) / 2):
        ring(x, 0.078, 0.0028, hi, (1.0, 0.95), (0, Z_LINE), bm=sb)
    # sensor bosses (temperature + differential pressure) and the pressure line
    for x in (L0 - 0.03, L1 + 0.03):
        C.cyl(0.009, 0.034, 12, loc=(x, 0.02, Z_LINE + 0.07), axis="Z", bm=sb)
        C.cyl(0.011, 0.010, 6, loc=(x, 0.02, Z_LINE + 0.09), axis="Z", bm=sb)
    C.tube(C.bend_path([V((L0 - 0.03, 0.02, Z_LINE + 0.095)), V((L0 - 0.03, 0.02, Z_LINE + 0.115)),
                        V((L1 + 0.03, 0.02, Z_LINE + 0.115)), V((L1 + 0.03, 0.02, Z_LINE + 0.095))], r=0.015, res=4),
           0.003, 8, bm=sb)
    fit = C.obj("dpf_fit", sb, ["stainless"], sharp=35)
    fb, gb, bb = bmesh.new(), bmesh.new(), bmesh.new()
    flange2(fb, V((L1 - 0.03, 0, Z_LINE)), (1, 0, 0), hi, gb, bb)
    return C.join([body, fit, C.obj("p_fl", fb, ["stainless"], sharp=40), C.obj("p_ga", gb, ["gasket"]),
                   C.obj("p_bo", bb, ["bolt"], sharp=30)], "dpf")


MID = [V((DPF1 - 0.04, 0, Z_LINE)), V((-0.05, 0.0, Z_LINE - 0.01)), V((-0.45, 0.0, Z_LINE - 0.01)), V((-0.90, 0.0, Z_LINE - 0.01)),
       V((-1.02, 0.0, Z_LINE + 0.075)), V((-1.18, -0.06, Z_LINE + 0.085)), V((-1.30, -0.16, Z_LINE + 0.02)), V((-1.37, -0.23, Z_LINE))]
RES0, RES1 = -0.10, -0.40
MUF0, MUF1 = -1.38, -1.84
MUF_Y = -0.25


def midpipe(q):
    hi = q == "hi"
    bm = pipe(MID, 0.024, hi, bend=0.10)
    p = C.obj("midpipe_tube", bm, ["aluminized"], sharp=50)
    uv_box01(p, 4.0)
    return p


def resonator(q):
    hi = q == "hi"
    prof = [(0.024, RES0 + 0.02), (0.028, RES0), (0.052, RES0 - 0.03), (0.057, RES0 - 0.045), (0.057, RES1 + 0.045), (0.052, RES1 + 0.03),
            (0.028, RES1), (0.024, RES1 - 0.02)]
    bm = can(prof, hi, (1.0, 1.0), loc=(0, 0.0, Z_LINE - 0.01))
    body = C.obj("res_can", bm, ["aluminized"], sharp=40)
    uv_box01(body, 4.0)
    sb = bmesh.new()
    for x in (RES0 - 0.045, RES1 + 0.045):
        ring(x, 0.057, 0.0028, hi, (1, 1), (0.0, Z_LINE - 0.01), bm=sb)
    return C.join([body, C.obj("res_seam", sb, ["stainless"], sharp=40)], "resonator")


def muffler(q):
    hi = q == "hi"
    prof = [(0.0245, MUF0 + 0.02), (0.030, MUF0 + 0.004), (0.090, MUF0), (0.100, MUF0 - 0.012), (0.100, MUF1 + 0.012), (0.090, MUF1),
            (0.030, MUF1 - 0.004), (0.0, MUF1 - 0.004)]
    bm = can(prof, hi, (1.55, 0.72), loc=(0, MUF_Y, Z_LINE + 0.01), segs=seg_q(hi, 56, 18))
    body = C.obj("muf_box", bm, ["aluminized"], sharp=40)
    uv_box01(body, 4.0)
    sb = bmesh.new()
    for x, rr in ((MUF0 - 0.006, 0.0045), (MUF1 + 0.006, 0.0045), (MUF0 - 0.16, 0.0025), (MUF1 + 0.16, 0.0025)):
        ring(x, 0.100 if rr > 0.003 else 0.1005, rr, hi, (1.55, 0.72), (MUF_Y, Z_LINE + 0.01), bm=sb)
    seams = C.obj("muf_seams", sb, ["aluminized"], sharp=40)
    # band clamp on the inlet
    cb = bmesh.new()
    ring(MUF0 + 0.05, 0.028, 0.004, hi, (1, 1), (-0.23, Z_LINE), bm=cb)
    C.box((0.018, 0.012, 0.024), loc=(MUF0 + 0.05, -0.23, Z_LINE + 0.033), bm=cb)
    clamp = C.obj("muf_clamp", cb, ["stainless"], sharp=40)
    return C.join([body, seams, clamp], "muffler")


def tailpipe(q):
    hi = q == "hi"
    y0 = MUF_Y - 0.09
    bm = pipe([V((MUF1 + 0.01, y0, Z_LINE)), V((MUF1 - 0.08, y0, Z_LINE)), V((MUF1 - 0.14, y0 - 0.01, Z_LINE - 0.012))], 0.024, hi, bend=0.06)
    p = C.obj("tail_tube", bm, ["stainless"], sharp=50)
    d = V((-1, -0.1, -0.15)).normalized()
    tip_c = V((MUF1 - 0.14, y0 - 0.01, Z_LINE - 0.012))
    rot = d.to_track_quat("Z", "Y").to_matrix()
    tb = C.lathe([(0.026, -0.03), (0.037, 0.0), (0.037, 0.095), (0.039, 0.100), (0.037, 0.104), (0.033, 0.104),
                  (0.033, 0.0)], seg_q(hi, 32, 12), axis="Z")
    C.xform(tb, rot=rot, loc=tip_c)
    tip = C.obj("tail_tip", tb, ["chrome"], sharp=35)
    ib = C.lathe([(0.033, 0.101), (0.024, 0.02), (0.0, 0.02)], seg_q(hi, 32, 12), axis="Z")
    C.xform(ib, rot=rot, loc=tip_c)
    bore = C.obj("tail_bore", ib, ["bore_dark"], sharp=40, recalc=False)
    return C.join([p, tip, bore], "tailpipe")


HANGERS = [(0.72, 0.0, Z_LINE + 0.075, 0.0), (-0.60, 0.0, Z_LINE + 0.02, 0.0), (MUF0 - 0.05, MUF_Y + 0.14, Z_LINE + 0.05, 0.0),
           (MUF1 + 0.05, MUF_Y - 0.14, Z_LINE + 0.05, 0.0)]


def hangers(q):
    hi = q == "hi"
    rb, ib = bmesh.new(), bmesh.new()
    for x, y, z, _ in HANGERS:
        C.tube(C.bend_path([V((x, y, z - 0.03)), V((x, y, z + 0.045)), V((x - 0.035, y, z + 0.065))], r=0.012, res=4),
               0.0055, 8 if hi else 5, bm=rb)
        # rubber isolator: flat block with two eyes, the upper rod goes to the body
        blk = C.box((0.020, 0.032, 0.070), loc=(x - 0.05, y, z + 0.085), bevel=0.008, segs=2 if hi else 1)
        C.merge(ib, blk)
        C.tube([V((x - 0.05, y, z + 0.108)), V((x - 0.10, y, z + 0.108))], 0.0055, 8 if hi else 5, bm=rb)
    rods = C.obj("hanger_rods", rb, ["stainless"], sharp=40)
    iso = C.obj("hanger_rubber", ib, ["rubber"], sharp=40)
    return C.join([rods, iso], "hangers")


def build(q, ao=True):
    C.reset()
    mats(q)
    root = C.empty("exhaust")
    parts = {
        "manifold": (manifold(q), (0.55, 0.12, 0)),
        "flex": (flex(q), (0.40, 0.08, 0)),
        "downpipe": (downpipe(q), (0.28, 0.04, 0)),
        "catalyst": (catalyst(q), (0.16, 0.06, 0)),
        "dpf": (dpf(q), (0.04, 0.06, 0)),
        "midpipe": (midpipe(q), (-0.10, 0.0, 0)),
        "resonator": (resonator(q), (-0.10, 0.10, 0)),
        "muffler": (muffler(q), (-0.30, 0.06, 0)),
        "tailpipe": (tailpipe(q), (-0.45, 0.05, 0)),
        "hangers": (hangers(q), (0.0, 0.18, 0)),
    }
    for k, (o, ex) in parts.items():
        o.name = k
        o.data.name = k
        o.parent = root
        set_explode(o, ex)
    meshes = [o for o, _ in parts.values()]
    if ao:
        C.bake_ao_vcol(meshes, samples=48 if q == "hi" else 16, max_dist=0.06, floor=0.35)
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
        views = {"q3": ((2.6, -3.2, 1.6), (0, 0, 0.1), 38), "front": ((2.9, -1.0, 0.8), (1.3, 0, 0.3), 30),
                 "rear": ((-2.6, -1.4, 0.7), (-1.4, 0, 0.1), 30), "side": ((0, -5.2, 0.6), (0, 0, 0.15), 40)}
        for k in a.get("views", "q3,front,rear").split(","):
            cam, tgt, fov = views[k]
            C.look(a["look"].replace(".png", f"_{k}.png"), target=tgt, cam=cam, fov=fov,
                   hdr=H + a.get("env", "studio") + "-1k-v1.hdr", ground=True, spp=int(a.get("spp", "32")), res=(1100, 700))
    if a.get("out") or not a.get("look"):
        C.finish("exhaust", q, root, a.get("out"))
