"""Automotive swash-plate A/C compressor (~0.23 m long): cast-aluminium body with casting ribs and
through-bolts, four mounting ears, electromagnetic clutch coil housing with connector + lead, 6PK multi-rib
pulley, clutch (armature) plate with three rubber dampers and a centre nut, rear manifold block with
suction / discharge ports and caps, pressure-relief valve.

  Blender -b --factory-startup --python assets3d/build_ac_compressor.py -- --q hi [--out x.glb] [--look /tmp/a.png]

three.js space: shaft along X, pulley at +X, ports up (+Y). Origin: bbox centre, lowest point on y = 0.
Nodes: ac_compressor > body, pulley (spins about local X), clutch_plate (spins with it when engaged), manifold.
extras.explode: pulley and plate slide forward along X, manifold lifts.
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
    if hi:
        a, o, nn = T.cast_alu(512, seed=51, lum=0.60, rough=0.46)
        C.material("cast_alu", (1, 1, 1), albedo=C.image("a_alu_alb", a), orm=C.image("a_alu_orm", o, False),
                   normal=C.image("a_alu_n", nn, False), normal_strength=0.3, vcol=True, uv_scale=(4, 4))
    else:
        C.material("cast_alu", C.srgb("#a4a7aa"), 0.46, 1.0, vcol=True)
    C.material("pulley_steel", C.srgb("#7d8084"), 0.34, 1.0, vcol=True)
    C.material("machined", C.srgb("#c9ccd0"), 0.2, 1.0, vcol=True)
    C.material("black_paint", C.srgb("#17181a"), 0.45, 0.3, coat=0.3, coat_rough=0.25, vcol=True)
    C.material("rubber", C.srgb("#121212"), 0.8, 0.0, vcol=True)
    C.material("plastic", C.srgb("#1c1d1f"), 0.55, 0.0, vcol=True)
    C.material("steel", C.srgb("#b3b6ba"), 0.32, 1.0, vcol=True)
    C.material("zinc", C.srgb("#c7b98f"), 0.35, 1.0, vcol=True)
    C.material("bore_dark", C.srgb("#1a1a1b"), 0.7, 0.5, double=True)


def body(q):
    hi = q == "hi"
    segs = 64 if hi else 22
    # cylinder block + front head + rear head (one casting), with raised bands
    prof = [(0.0, -0.118), (0.040, -0.118), (0.050, -0.115), (0.056, -0.108), (0.056, -0.100), (0.059, -0.098),
            (0.059, -0.090), (0.056, -0.088), (0.056, -0.020), (0.0585, -0.018), (0.0585, -0.010), (0.056, -0.008),
            (0.056, 0.030), (0.061, 0.033), (0.061, 0.045), (0.050, 0.050), (0.030, 0.052), (0.020, 0.052), (0.0, 0.052)]
    bm = C.lathe(prof, segs, axis="X")
    # casting ribs along the block
    for k in range(6):
        a = 2 * math.pi * (k + 0.5) / 6
        r = C.box((0.08, 0.008, 0.006), loc=(0, 0, 0), bevel=0.002, segs=1)
        C.xform(r, loc=(-0.050, 0, 0.0575))
        C.xform(r, rot=Matrix.Rotation(a, 3, "X"))
        C.merge(bm, r)
    # mounting ears: bosses parallel to the shaft with a web back to the body
    ears = [(0.018, 0.070, 0.050), (0.018, -0.070, -0.050), (-0.098, 0.070, -0.050), (-0.098, -0.070, 0.050)]
    for x, y, z in ears:
        C.cyl(0.0125, 0.034, 20 if hi else 8, loc=(x, y, z), axis="X", bm=bm)
        d = V((0, y, z))
        web = C.box((0.020, 0.030, 0.018), bevel=0.003, segs=1)
        C.xform(web, rot=V((0, 1, 0)).rotation_difference(d.normalized()).to_matrix(), loc=(x, y * 0.72, z * 0.72))
        C.merge(bm, web)
    # coil housing boss for the connector, pressure-relief valve boss
    C.box((0.022, 0.018, 0.024), loc=(0.040, -0.030, 0.058), bevel=0.003, segs=1, bm=bm)
    C.cyl(0.010, 0.016, 16 if hi else 8, loc=(-0.060, -0.058, 0.0), axis="Y", bm=bm)
    ob = C.obj("body_cast", bm, ["cast_alu"], sharp=40)
    uv_box01(ob, 0.4)
    # ear bores (dark), through-bolts on the rear face, relief valve hex, connector + lead
    hb = bmesh.new()
    for x, y, z in ears:
        C.cyl(0.0068, 0.0345, 16 if hi else 8, loc=(x, y, z), axis="X", bm=hb)
    bores = C.obj("ear_bores", hb, ["bore_dark"], sharp=40)
    sb = bmesh.new()
    for k in range(5):
        a = 2 * math.pi * (k + 0.2) / 5
        C.cyl(0.0065, 0.006, 6, loc=(-0.121, 0.042 * math.cos(a), 0.042 * math.sin(a)), axis="X", bm=sb)
    C.cyl(0.009, 0.010, 6, loc=(-0.060, -0.071, 0.0), axis="Y", bm=sb)
    bolts = C.obj("body_bolts", sb, ["zinc"], sharp=30)
    cb = bmesh.new()
    C.box((0.026, 0.020, 0.018), loc=(0.040, -0.030, 0.078), bevel=0.003, segs=1, bm=cb)
    C.tube(C.bezier_path([V((0.040, -0.030, 0.088)), V((0.040, -0.030, 0.105)), V((0.000, -0.020, 0.115)),
                          V((-0.060, -0.012, 0.110))], 6), 0.003, 8 if hi else 5, bm=cb)
    C.box((0.022, 0.014, 0.012), loc=(-0.070, -0.011, 0.110), bevel=0.003, segs=1, bm=cb)  # harness plug
    conn = C.obj("connector", cb, ["plastic"], sharp=40)
    return C.join([ob, bores, bolts, conn], "body")


def pulley(q):
    hi = q == "hi"
    segs = 72 if hi else 28
    # 6PK: rib pitch 3.56 mm, grooves 40 deg; outer r 0.060, width 0.024
    x0, x1 = 0.058, 0.084
    prof = [(0.036, x0), (0.052, x0), (0.056, x0 + 0.0015), (0.060, x0 + 0.0022)]
    pitch = 0.00356
    xs = x0 + 0.0022
    for k in range(6):
        a = xs + k * pitch
        prof += [(0.060, a + 0.0004), (0.0572, a + pitch * 0.5), (0.060, a + pitch - 0.0004)]
    prof += [(0.060, x1 - 0.001), (0.057, x1), (0.048, x1), (0.046, x1 - 0.004), (0.036, x1 - 0.004), (0.036, x0)]
    bm = C.lathe(prof, segs, axis="X")
    mi = []
    ob = C.obj("pulley", bm, ["pulley_steel"], sharp=35)
    # machined rib crests get a brighter finish
    for p in ob.data.polygons:
        r = math.hypot(p.center.y, p.center.z)
        p.material_index = 0
    ob.data.materials.append(C.MATS["machined"])
    for p in ob.data.polygons:
        r = math.hypot(p.center.y, p.center.z)
        if r > 0.0575 and abs(p.normal.x) < 0.9:
            p.material_index = 1
    return ob


def clutch_plate(q):
    hi = q == "hi"
    segs = 64 if hi else 24
    prof = [(0.0, 0.094), (0.012, 0.094), (0.014, 0.092), (0.020, 0.091), (0.050, 0.089), (0.052, 0.088), (0.052, 0.086),
            (0.012, 0.086), (0.0, 0.086)]
    bm = C.lathe(prof, segs, axis="X")
    plate = C.obj("plate", bm, ["black_paint"], sharp=35)
    rb, sb = bmesh.new(), bmesh.new()
    for k in range(3):
        a = 2 * math.pi * k / 3
        c = V((0.0925, 0.032 * math.cos(a), 0.032 * math.sin(a)))
        blk = C.box((0.006, 0.020, 0.012), bevel=0.003, segs=1)
        C.xform(blk, rot=Matrix.Rotation(a + math.pi / 2, 3, "X"), loc=c)
        C.merge(rb, blk)
        for dd in (-0.012, 0.012):
            cc = c + V((0, -math.sin(a) * dd, math.cos(a) * dd))
            C.cyl(0.0028, 0.004, 8, loc=(0.0955, cc.y, cc.z), axis="X", bm=sb)
    C.cyl(0.0075, 0.008, 6, loc=(0.098, 0, 0), axis="X", bm=sb)
    C.cyl(0.004, 0.006, 10, loc=(0.103, 0, 0), axis="X", bm=sb)
    damp = C.obj("dampers", rb, ["rubber"], sharp=40)
    riv = C.obj("rivets", sb, ["steel"], sharp=30)
    return C.join([plate, damp, riv], "clutch_plate")


def manifold(q):
    hi = q == "hi"
    bm = bmesh.new()
    C.box((0.050, 0.070, 0.028), loc=(-0.095, 0.0, 0.066), bevel=0.005, segs=2 if hi else 1, bm=bm)
    blk = C.obj("man_block", bm, ["cast_alu"], sharp=40)
    uv_box01(blk, 0.4)
    pb, cb = bmesh.new(), bmesh.new()
    for y, r in ((0.018, 0.012), (-0.020, 0.009)):  # suction (bigger), discharge
        C.cyl(r, 0.020, 20 if hi else 8, loc=(-0.095, y, 0.088), axis="Z", bm=pb)
        C.cyl(r + 0.003, 0.010, 20 if hi else 8, loc=(-0.095, y, 0.103), axis="Z", bm=cb)
        C.cyl(r + 0.001, 0.004, 20 if hi else 8, loc=(-0.095, y, 0.110), axis="Z", bm=cb)
    for x in (-0.113, -0.077):
        C.cyl(0.0055, 0.006, 6, loc=(x, 0.0, 0.082), axis="Z", bm=pb)
    ports = C.obj("man_ports", pb, ["machined"], sharp=35)
    caps = C.obj("man_caps", cb, ["plastic"], sharp=35)
    return C.join([blk, ports, caps], "manifold")


def build(q, ao=True):
    C.reset()
    mats(q)
    root = C.empty("ac_compressor")
    parts = {"body": (body(q), (0, 0, 0)), "pulley": (pulley(q), (0.08, 0, 0)),
             "clutch_plate": (clutch_plate(q), (0.15, 0, 0)), "manifold": (manifold(q), (0, 0.07, 0))}
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
        az = math.radians(float(a.get("az", "40")))
        C.look(a["look"], target=(0, 0, 0.07), cam=(0.5 * math.sin(az), -0.5 * math.cos(az), 0.26), fov=30,
               hdr=H + a.get("env", "studio") + "-1k-v1.hdr", ground=True, spp=int(a.get("spp", "48")), res=(1100, 800))
    if a.get("out") or not a.get("look"):
        C.finish("ac_compressor", q, root, a.get("out"))
