"""Sequential LPG (autogas) conversion kit, unbranded, real scale, laid out on the floor like a product shot:
toroidal spare-wheel-well tank (630 x 210 mm, two pressed halves with weld seams, valve boss, blank data plate)
with its mounting bracket and multivalve (float gauge dial without text, outlet solenoid, filling / outlet
fittings), reducer-vaporiser (cast aluminium, diaphragm cover, coolant nipples, inlet solenoid valve, temperature
sensor), vapour-phase gas filter, 4-injector rail with nozzle hoses and calibrated brass nozzles, MAP sensor,
ECU, filling valve, a coil of 8 mm copper-coated gas line and the rubber hoses between the parts.

  Blender -b --factory-startup --python assets3d/build_lpg_kit.py -- --q hi [--out x.glb] [--look /tmp/l.png]

three.js space: +Y up, everything stands on y = 0, origin at the centre of the layout's bbox. The tank sits at
the back-left (-X, -Z), the small parts in a front row (+Z) and to the right (+X).
Nodes: lpg_kit > tank, tank_bracket, multivalve (> gauge_needle), reducer, filter, injector_rail
  (> injector_1..4), nozzle_hoses, map_sensor, ecu, fill_valve, gas_line, valve_housing, hoses.
extras.explode: parts lift and spread out from the tank; the multivalve rises off its boss, the injectors
  lift out of the rail, the bracket rises through the tank's centre hole.
gauge_needle turns about its local Z (three, the dial normal): rest (0) = half, rotation.z = +2.36 empty (red),
  -2.36 full (green).
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

V = Vector
Q = "hi"
TANK_C = V((-0.12, 0.13, 0.0))  # tank centre on the floor (Blender)
T_RM, T_A, T_B = 0.2125, 0.1025, 0.105  # torus: mean radius, section half-width, half-height
T_H = 2 * T_B


def HI():
    return Q == "hi"


def seg(a, b):
    return a if HI() else b


# ── textures / materials ─────────────────────────────────────────────────────
def dial_tex(n=256):
    """float gauge face: white disc, tick ring, red reserve + green full sectors, no text. rows bottom-up"""
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    x = (xx + 0.5) / n * 2 - 1
    y = (yy + 0.5) / n * 2 - 1
    r = np.sqrt(x * x + y * y)
    a = np.arctan2(y, x)  # ccw from +u
    img = np.zeros((n, n, 3), np.float32) + np.array(C.srgb("#f1f1ec"), np.float32)
    # gauge arc from 225 deg (empty, lower left) clockwise to -45 deg (full, lower right)
    t = ((np.radians(225) - a) % (2 * np.pi)) / np.radians(270)
    on_arc = t <= 1.0
    ring = (r > 0.62) & (r < 0.74) & on_arc
    img[ring & (t < 0.18)] = np.array(C.srgb("#c0262b"), np.float32)
    img[ring & (t > 0.72)] = np.array(C.srgb("#2c9a45"), np.float32)
    ticks = (r > 0.76) & (r < 0.88) & on_arc & (np.abs(((t * 8) + 0.5) % 1.0 - 0.5) < 0.035)
    small = (r > 0.80) & (r < 0.86) & on_arc & (np.abs(((t * 32) + 0.5) % 1.0 - 0.5) < 0.06)
    img[ticks | small] = np.array(C.srgb("#141414"), np.float32)
    img[r > 0.95] = np.array(C.srgb("#2a2b2d"), np.float32)
    img[(r < 0.10)] = np.array(C.srgb("#1a1a1a"), np.float32)
    rough = np.where(r > 0.95, 0.5, 0.35).astype(np.float32)
    return img, T.orm(1.0, rough, 0.0)


def mats():
    n = seg(512, 256)
    pa, _, pn = T.painted_metal(256, seed=81, rgb=C.srgb("#17181b"), rough=0.34, orange=0.5)
    po = T.orm(np.ones((256, 256), np.float32), 0.34, 0.0)
    C.material("tank_paint", (1, 1, 1), albedo=C.image("l_tank_alb", pa), orm=C.image("l_tank_orm", po, False),
               normal=(C.image("l_tank_n", pn, False) if HI() else None), normal_strength=0.12, coat=0.6, coat_rough=0.18,
               vcol=True, uv_scale=(6, 6))
    C.material("weld", C.srgb("#2b2c2f"), 0.45, 0.6, vcol=True)
    ca, co, cn = T.cast_alu(n, seed=82, lum=0.58, rough=0.5)
    C.material("alu_cast", (1, 1, 1), albedo=C.image("l_alu_alb", ca), orm=C.image("l_alu_orm", co, False),
               normal=(C.image("l_alu_n", cn, False) if HI() else None), normal_strength=0.3, vcol=True, uv_scale=(5, 5))
    C.material("brass", C.srgb("#c9a64f"), 0.3, 1.0, vcol=True)
    C.material("steel_zinc", C.srgb("#b9b5a2"), 0.32, 1.0, vcol=True)
    C.material("steel", C.srgb("#aeb1b5"), 0.28, 1.0, vcol=True)
    ta, to, tn = T.textured_plastic(n, seed=83, lum=0.03, rough=0.55, grain=1.0)
    C.material("plastic_black", (1, 1, 1), albedo=C.image("l_pl_alb", ta), orm=C.image("l_pl_orm", to, False),
               normal=(C.image("l_pl_n", tn, False) if HI() else None), normal_strength=0.4, vcol=True, uv_scale=(8, 8))
    C.material("coil_black", C.srgb("#121214"), 0.35, 0.0, coat=0.5, coat_rough=0.2, vcol=True)
    C.material("rubber", C.srgb("#121213"), 0.78, 0.0, vcol=True)
    C.material("hose_blue", C.srgb("#1f3f7a"), 0.55, 0.0, vcol=True)
    C.material("copper", C.srgb("#b8673e"), 0.32, 1.0, coat=0.4, coat_rough=0.15, vcol=True)
    ba, bo, bn = T.brushed(n, seed=84, lum=0.20, rough=0.36)
    C.material("ecu_alu", (1, 1, 1), albedo=C.image("l_ecu_alb", ba), orm=C.image("l_ecu_orm", bo, False),
               normal=(C.image("l_ecu_n", bn, False) if HI() else None), normal_strength=0.4, vcol=True, uv_scale=(4, 4))
    da, do = dial_tex(256)
    C.material("dial", (1, 1, 1), albedo=C.image("l_dial_alb", da), orm=C.image("l_dial_orm", do, False), vcol=True)
    C.material("glass", C.srgb("#dfe6ea"), 0.03, 0.0, alpha=0.18, ior=1.5, spec_level=0.6)
    C.material("needle_red", C.srgb("#d0201e"), 0.35, 0.0)
    C.material("label_silver", C.srgb("#a9acb0"), 0.4, 0.8, vcol=True)
    C.material("plastic_yellow", C.srgb("#d9a210"), 0.45, 0.0, vcol=True)
    C.material("housing_grey", C.srgb("#9a9ea3"), 0.5, 0.0, vcol=True)


def uv_box01(ob, span=0.5):
    """box projection around the object's own bbox centre, remapped into [0, 1]"""
    me = ob.data
    c = sum((V(v) for v in ob.bound_box), V()) / 8
    bm = bmesh.new()
    bm.from_mesh(me)
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            p = lp.vert.co - c
            u, v = ((p.y, p.z), (p.x, p.z), (p.x, p.y))[ax]
            lp[uvl].uv = (min(max(u / span + 0.5, 0.0), 1.0), min(max(v / span + 0.5, 0.0), 1.0))
    bm.to_mesh(me)
    bm.free()
    return ob


def mk(name, bm, mats_, sharp=40, uv=None, recalc=True):
    o = C.obj(name, bm, mats_, sharp=sharp, recalc=recalc)
    if uv:
        uv_box01(o, uv)
    return o


def hex_nut(r, h, loc, axis="Z", bm=None, mat=0):
    return C.cyl(r, h, 6, loc=loc, axis=axis, bm=bm, mat=mat)


def barb(bm, p, d, r=0.005, L=0.03, mat=0, segs=12):
    """hose barb from p along unit vector d (two cones)"""
    d = V(d).normalized()
    prof = [(0.0, 0.0), (r * 1.25, 0.0), (r * 1.25, 0.006), (r * 0.95, 0.008)]
    x = 0.008
    for k in range(3):
        prof += [(r * 1.18, x + 0.004), (r * 0.95, x + 0.0045)]
        x += (L - 0.01) / 3
    prof += [(r * 0.95, L), (r * 0.6, L), (0.0, L)]
    b = C.lathe(prof, segs, axis="Z")
    C.xform(b, rot=V((0, 0, 1)).rotation_difference(d).to_matrix(), loc=p)
    for f in b.faces:
        f.material_index = mat
    C.merge(bm, b)


# ── tank ─────────────────────────────────────────────────────────────────────
def tank_section(n):
    """superellipse section (r, z) of the torus tube, ccw from the outer equator"""
    pts = []
    e = 2.6
    for k in range(n):
        a = 2 * math.pi * k / n
        c, s = math.cos(a), math.sin(a)
        r = T_RM + T_A * math.copysign(abs(c) ** (2 / e), c)
        z = T_B + T_B * math.copysign(abs(s) ** (2 / e), s)
        pts.append((r, z))
    return pts


def make_tank():
    ns, nr = seg(48, 20), seg(96, 36)
    sec = tank_section(ns)
    sec.append(sec[0])
    bm = C.lathe(sec, nr, axis="Z")
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    tank = mk("_tank", bm, ["tank_paint"], sharp=60)
    # UVs: metric box projection (orange peel normal tiles ~8 cm)
    uv_box01(tank, 0.8)
    parts = [tank]
    wb = bmesh.new()
    # weld seams: outer + inner equator beads
    for R in (T_RM + T_A, T_RM - T_A):
        C.torus(R, 0.0032, nr, 6, loc=(0, 0, T_B), bm=wb)
    # valve boss + ring of flange bolts (top, inner edge, facing the front-right)
    bb = bmesh.new()
    vb = valve_frame()
    C.cyl(0.052, 0.014, seg(40, 16), loc=(0, 0, 0.004), bm=bb)
    C.cyl(0.046, 0.004, seg(40, 16), loc=(0, 0, 0.012), bm=bb)
    C.xform(bb, mat=vb)
    C.merge(wb, bb)
    # welded feet under the tank (4 pads) + blank data plate on the outer wall
    for k in range(4):
        a = 2 * math.pi * (k + 0.5) / 4
        C.box((0.05, 0.03, 0.006), loc=(T_RM * math.cos(a), T_RM * math.sin(a), 0.004), bm=wb)
    lab = C.box((0.10, 0.004, 0.05))
    a = math.radians(-100)
    C.xform(lab, rot=Matrix.Rotation(a + math.pi / 2, 3, "Z"), loc=((T_RM + T_A + 0.0015) * math.cos(a), (T_RM + T_A + 0.0015) * math.sin(a), T_B))
    for f in lab.faces:
        f.material_index = 1
    C.merge(wb, lab)
    parts.append(mk("_welds", wb, ["weld", "label_silver"], sharp=40))
    o = C.join(parts, "tank")
    return o


def valve_frame():
    """matrix of the multivalve seat: on the torus top at azimuth -50 deg (front-right), turned so the gauge
    (seat -Y) faces outward to the front-right camera, leaning 10 deg in towards the hole"""
    az = math.radians(-50)
    r = T_RM - 0.01
    # surface height of the section at radius r (superellipse top)
    u = (r - T_RM) / T_A
    z = T_B + T_B * (1 - abs(u) ** 2.6) ** (1 / 2.6)
    M = (Matrix.Translation((r * math.cos(az), r * math.sin(az), z - 0.006)) @ Matrix.Rotation(az + math.pi / 2, 4, "Z")
         @ Matrix.Rotation(math.radians(-10), 4, "X"))
    return M


def make_bracket():
    bm = bmesh.new()
    # flat strap across the centre hole + centre bolt with a big washer (fixes the tank to the spare well)
    L = 2 * (T_RM - T_A) + 0.08
    C.box((L, 0.05, 0.004), loc=(0, 0, 0.012), bevel=0.0015 if HI() else 0, segs=1, bm=bm)
    for sx in (-1, 1):
        C.box((0.03, 0.05, 0.03), loc=(sx * (T_RM - T_A + 0.01), 0, 0.026), bm=bm)
    C.cyl(0.03, 0.003, seg(32, 12), loc=(0, 0, 0.0155), bm=bm, mat=1)
    hex_nut(0.012, 0.009, (0, 0, 0.0215), bm=bm, mat=1)
    C.cyl(0.0055, 0.06, 12, loc=(0, 0, 0.03), bm=bm, mat=1)
    return mk("tank_bracket", bm, ["tank_paint", "steel_zinc"], sharp=40)


# ── multivalve ───────────────────────────────────────────────────────────────
def make_multivalve():
    """built in the seat frame (z up from the boss), then transformed onto the tank"""
    bm = bmesh.new()
    s = seg(32, 14)
    C.cyl(0.044, 0.01, s, loc=(0, 0, 0.021), bm=bm, mat=0)  # flange
    for k in range(6):
        a = 2 * math.pi * k / 6
        hex_nut(0.0055, 0.006, (0.037 * math.cos(a), 0.037 * math.sin(a), 0.029), bm=bm, mat=3)
    C.box((0.075, 0.05, 0.045), loc=(0, 0, 0.048), bevel=0.006 if HI() else 0, segs=2, bm=bm, mat=0)  # body
    # float gauge housing (round, facing -Y after the seat rotation it faces outward)
    C.cyl(0.028, 0.016, s, loc=(0.0, -0.030, 0.050), axis="Y", bm=bm, mat=0)
    bz = C.lathe([(0.0262, -0.0415), (0.0305, -0.0415), (0.0305, -0.0365), (0.0262, -0.0365), (0.0262, -0.0415)], s, axis="Y")
    C.xform(bz, loc=(0, 0, 0.050))
    for f in bz.faces:
        f.material_index = 3
    C.merge(bm, bz)  # bezel ring
    # outlet solenoid (black coil) with connector + brass fittings (filling in, outlet out)
    C.cyl(0.017, 0.036, s, loc=(0.020, 0.010, 0.090), bm=bm, mat=1)
    C.cyl(0.006, 0.01, 12, loc=(0.020, 0.010, 0.112), bm=bm, mat=3)
    C.merge(bm, C.box((0.018, 0.014, 0.014), loc=(0.036, 0.010, 0.096), mat=1))
    hex_nut(0.009, 0.012, (-0.045, 0.0, 0.050), axis="X", bm=bm, mat=2)
    C.cyl(0.005, 0.02, 12, loc=(-0.058, 0.0, 0.050), axis="X", bm=bm, mat=2)
    hex_nut(0.009, 0.012, (0.045, 0.0, 0.040), axis="X", bm=bm, mat=2)
    C.cyl(0.005, 0.018, 12, loc=(0.057, 0.0, 0.040), axis="X", bm=bm, mat=2)
    # safety valve cap (yellow) + manual shut-off knob
    C.cyl(0.009, 0.014, 16, loc=(-0.020, 0.012, 0.078), bm=bm, mat=4)
    C.cyl(0.012, 0.008, 16, loc=(-0.020, -0.012, 0.075), bm=bm, mat=1)
    body = mk("_mv", bm, ["alu_cast", "coil_black", "brass", "steel_zinc", "plastic_yellow"], sharp=40, uv=0.2)
    # dial face + glass
    db = bmesh.new()
    uvl = db.loops.layers.uv.verify()
    ns = seg(40, 16)
    c = db.verts.new((0, -0.0385, 0.050))
    ring = [db.verts.new((0.026 * math.cos(2 * math.pi * k / ns), -0.0385, 0.050 + 0.026 * math.sin(2 * math.pi * k / ns))) for k in range(ns)]
    for k in range(ns):
        a0, a1 = 2 * math.pi * k / ns, 2 * math.pi * (k + 1) / ns
        f = db.faces.new((c, ring[k], ring[(k + 1) % ns]))  # normal -Y (out of the gauge)
        for lp in f.loops:
            p = lp.vert.co
            lp[uvl].uv = (0.5 + p.x / 0.052, 0.5 + (p.z - 0.050) / 0.052)
    dial = C.obj("_dial", db, ["dial"], smooth=False, recalc=False)
    gb = C.cyl(0.027, 0.002, ns, loc=(0, -0.0405, 0.050), axis="Y")
    glass = C.obj("_glass", gb, ["glass"], smooth=True)
    o = C.join([body, dial, glass], "multivalve")
    # needle (child): pivot at the dial centre, rotates about the dial normal
    nb = bmesh.new()
    C.merge(nb, C.box((0.0022, 0.0008, 0.020), loc=(0, 0, 0.009)))
    C.cyl(0.003, 0.0012, 12, loc=(0, 0, 0), axis="Y", bm=nb)
    needle = C.obj("gauge_needle", nb, ["needle_red"], sharp=30)
    C.vcol_fill(needle)
    return o, needle


def make_housing():
    """gas-tight housing that covers the multivalve in the car (round, grey plastic, two vent spigots),
    lying next to the tank in the kit layout"""
    bm = bmesh.new()
    s = seg(48, 18)
    prof = [(0.0, 0.070), (0.06, 0.069), (0.085, 0.064), (0.095, 0.055), (0.098, 0.012), (0.106, 0.008), (0.106, 0.0),
            (0.094, 0.0), (0.092, 0.008), (0.090, 0.05), (0.0, 0.058)]
    C.merge(bm, C.lathe(prof, s, axis="Z"))
    for k in range(seg(16, 0)):  # stiffening ribs on the dome
        a = 2 * math.pi * k / 16
        C.xform(r := C.box((0.035, 0.003, 0.004), loc=(0.07, 0, 0.066)), rot=Matrix.Rotation(a, 3, "Z"))
        C.merge(bm, r)
    for a in (0.4, 0.4 + math.pi):
        C.cyl(0.011, 0.03, 16, loc=(0.1 * math.cos(a), 0.1 * math.sin(a), 0.03), axis="X", bm=bm, mat=1)
    o = mk("valve_housing", bm, ["housing_grey", "rubber"], sharp=40, uv=0.3)
    return o


# ── reducer / filter / rail / small parts ────────────────────────────────────
def make_reducer():
    bm = bmesh.new()
    s = seg(48, 18)
    # main casting: round housing with a cast skirt + square base block
    prof = [(0.0, 0.0), (0.050, 0.0), (0.056, 0.006), (0.056, 0.040), (0.060, 0.044), (0.060, 0.052), (0.0, 0.052)]
    C.merge(bm, C.lathe(prof[::-1], s, axis="Z"))
    C.box((0.10, 0.06, 0.05), loc=(0.045, 0, 0.025), bevel=0.006 if HI() else 0, segs=2, bm=bm)
    # cast fins on the housing
    for k in range(seg(10, 0)):
        a = 2 * math.pi * k / 10 + 0.3
        f = C.box((0.012, 0.003, 0.030), loc=(0.061, 0, 0.022))
        C.xform(f, rot=Matrix.Rotation(a, 3, "Z"))
        C.merge(bm, f)
    body = mk("_rbody", bm, ["alu_cast"], sharp=38, uv=0.3)
    cb = bmesh.new()
    # diaphragm cover (domed, bolted)
    prof = [(0.0, 0.070), (0.03, 0.069), (0.05, 0.064), (0.058, 0.058), (0.058, 0.052), (0.0, 0.052)]
    C.merge(cb, C.lathe(prof[::-1], s, axis="Z"))
    for k in range(6):
        a = 2 * math.pi * k / 6
        hex_nut(0.005, 0.006, (0.052 * math.cos(a), 0.052 * math.sin(a), 0.062), bm=cb, mat=1)
    hex_nut(0.008, 0.01, (0, 0, 0.074), bm=cb, mat=2)  # pressure adjust screw
    cover = mk("_rcover", cb, ["alu_cast", "steel_zinc", "brass"], sharp=38, uv=0.3)
    fb = bmesh.new()
    # coolant nipples (two, on the block), gas outlet (bigger), inlet electrovalve
    barb(fb, V((0.095, 0.018, 0.020)), (1, 0, 0), r=0.0075, L=0.034, mat=0, segs=seg(16, 8))
    barb(fb, V((0.095, -0.018, 0.020)), (1, 0, 0), r=0.0075, L=0.034, mat=0, segs=seg(16, 8))
    barb(fb, V((-0.020, -0.050, 0.030)), (0, -1, 0.25), r=0.0085, L=0.036, mat=0, segs=seg(16, 8))
    C.cyl(0.012, 0.016, 6, loc=(0.045, 0.036, 0.028), axis="Y", bm=fb, mat=0)  # inlet fitting hex
    C.cyl(0.016, 0.036, seg(24, 10), loc=(0.045, 0.062, 0.028), axis="Y", bm=fb, mat=1)  # solenoid coil
    C.merge(fb, C.box((0.018, 0.012, 0.016), loc=(0.045, 0.062, 0.050), mat=1))
    C.cyl(0.006, 0.02, 12, loc=(0.045, 0.086, 0.028), axis="Y", bm=fb, mat=0)
    # temperature sensor
    hex_nut(0.007, 0.008, (0.070, -0.034, 0.040), axis="Y", bm=fb, mat=0)
    C.merge(fb, C.box((0.012, 0.014, 0.012), loc=(0.070, -0.046, 0.040), mat=1))
    fit = mk("_rfit", fb, ["brass", "coil_black"], sharp=40)
    o = C.join([body, cover, fit], "reducer")
    return o


def make_filter():
    bm = bmesh.new()
    s = seg(32, 12)
    prof = [(0.0, -0.046), (0.012, -0.046), (0.019, -0.042), (0.021, -0.036), (0.021, 0.036), (0.019, 0.042),
            (0.012, 0.046), (0.0, 0.046)]
    C.merge(bm, C.lathe(prof, s, axis="X"))
    for sx in (-1, 1):
        C.torus(0.0205, 0.0015, s, 5, loc=(sx * 0.030, 0, 0), axis="X", bm=bm)
    body = mk("_fbody", bm, ["alu_cast"], sharp=40, uv=0.2)
    fb = bmesh.new()
    barb(fb, V((0.046, 0, 0)), (1, 0, 0), r=0.006, L=0.026, segs=seg(14, 8))
    barb(fb, V((-0.046, 0, 0)), (-1, 0, 0), r=0.006, L=0.026, segs=seg(14, 8))
    # strap bracket
    C.box((0.014, 0.05, 0.004), loc=(0, 0, -0.019), bm=fb, mat=1)
    fit = mk("_ffit", fb, ["brass", "steel_zinc"], sharp=40)
    o = C.join([body, fit], "filter")
    return o


def make_rail():
    bm = bmesh.new()
    L = 0.13
    C.box((L, 0.034, 0.026), loc=(0, 0, 0.013), bevel=0.004 if HI() else 0, segs=2, bm=bm)
    body = mk("_rail", bm, ["alu_cast"], sharp=40, uv=0.2)
    fb = bmesh.new()
    barb(fb, V((L / 2, 0, 0.013)), (1, 0, 0), r=0.006, L=0.024, segs=seg(14, 8))  # gas inlet
    C.cyl(0.004, 0.012, 10, loc=(-L / 2 - 0.006, 0, 0.018), axis="X", bm=fb, mat=1)  # temp sensor / MAP port
    for i in range(4):
        x = -0.0465 + i * 0.031
        barb(fb, V((x, -0.017, 0.009)), (0, -1, 0), r=0.0028, L=0.016, segs=seg(10, 6))  # outlets
    for sx in (-1, 1):  # mounting ears
        C.box((0.012, 0.05, 0.004), loc=(sx * (L / 2 - 0.012), 0.0, 0.002), bm=fb, mat=2)
    fit = mk("_rfit2", fb, ["brass", "coil_black", "steel_zinc"], sharp=40)
    return C.join([body, fit], "injector_rail")


def make_injector(i):
    bm = bmesh.new()
    s = seg(24, 10)
    C.cyl(0.0115, 0.040, s, loc=(0, 0, 0.020), bm=bm)  # coil body
    C.cyl(0.0125, 0.004, s, loc=(0, 0, 0.002), bm=bm, mat=1)  # base ring
    C.merge(bm, C.box((0.016, 0.020, 0.013), loc=(0, 0.004, 0.046), bevel=0.002 if HI() else 0, segs=1))  # connector
    C.merge(bm, C.box((0.012, 0.004, 0.008), loc=(0, 0.016, 0.046), mat=2))  # latch
    return mk(f"injector_{i + 1}", bm, ["coil_black", "steel_zinc", "plastic_black"], sharp=40)


def make_nozzle_hoses(rail_loc):
    bm = bmesh.new()
    for i in range(4):
        x = rail_loc.x - 0.0465 + i * 0.031
        p0 = V((x, rail_loc.y - 0.030, 0.009))
        end = V((x - 0.10 + i * 0.05, rail_loc.y - 0.22 + (i % 2) * 0.02, 0.006))
        pts = [p0, p0 + V((0, -0.04, 0.004)), (p0 + end) / 2 + V((0.0, 0.0, 0.03)), end + V((0, 0.04, 0.0)), end]
        C.tube(C.bezier_path(pts, seg(8, 4)), 0.0038, seg(10, 6), bm=bm)
        # calibrated brass nozzle at the free end
        d = (end - pts[-2]).normalized()
        nz = C.lathe([(0.0, 0.0), (0.004, 0.0), (0.004, 0.012), (0.0065, 0.012), (0.0065, 0.018), (0.0035, 0.02),
                      (0.0035, 0.034), (0.0, 0.034)], seg(12, 6), axis="Z")
        C.xform(nz, rot=V((0, 0, 1)).rotation_difference(d).to_matrix(), loc=end)
        for f in nz.faces:
            f.material_index = 1
        C.merge(bm, nz)
    return mk("nozzle_hoses", bm, ["rubber", "brass"], sharp=40, recalc=False)


def make_map_sensor():
    bm = bmesh.new()
    C.box((0.042, 0.032, 0.022), loc=(0, 0, 0.011), bevel=0.003 if HI() else 0, segs=1, bm=bm)
    C.merge(bm, C.box((0.018, 0.014, 0.016), loc=(0, 0.022, 0.012), mat=0))  # connector
    body = mk("_map", bm, ["plastic_black"], sharp=40, uv=0.2)
    fb = bmesh.new()
    barb(fb, V((-0.008, -0.016, 0.010)), (0, -1, 0), r=0.0028, L=0.014, segs=seg(10, 6))
    barb(fb, V((0.008, -0.016, 0.010)), (0, -1, 0), r=0.0028, L=0.014, segs=seg(10, 6))
    C.merge(fb, C.box((0.06, 0.012, 0.003), loc=(0, 0.0, 0.0015), mat=1))
    fit = mk("_mapf", fb, ["brass", "steel_zinc"], sharp=40)
    return C.join([body, fit], "map_sensor")


def make_ecu():
    bm = bmesh.new()
    w, d, h = 0.15, 0.105, 0.034
    C.box((w, d, h), loc=(0, 0, h / 2), bevel=0.004 if HI() else 0, segs=2, bm=bm)
    for k in range(seg(9, 0)):  # extrusion fins on the lid
        C.box((w - 0.02, 0.0035, 0.005), loc=(0, -d / 2 + 0.012 + k * (d - 0.024) / 8, h + 0.002), bm=bm)
    body = mk("_ecu", bm, ["ecu_alu"], sharp=40, uv=0.3)
    cb = bmesh.new()
    for sx in (-1, 1):  # black end caps
        C.box((0.006, d + 0.002, h + 0.002), loc=(sx * (w / 2 + 0.002), 0, h / 2), bevel=0.002 if HI() else 0, segs=1, bm=cb)
        for sy in (-1, 1):
            C.box((0.012, 0.014, 0.003), loc=(sx * (w / 2 + 0.009), sy * (d / 2 - 0.01), 0.0015), bm=cb, mat=1)
    C.merge(cb, C.box((0.02, 0.07, 0.024), loc=(w / 2 + 0.014, 0, h / 2), bevel=0.003 if HI() else 0, segs=1))  # connector
    C.merge(cb, C.box((0.008, 0.06, 0.012), loc=(w / 2 + 0.028, 0, h / 2), mat=2))
    caps = mk("_ecuc", cb, ["plastic_black", "steel_zinc", "plastic_black"], sharp=40, uv=0.2)
    return C.join([body, caps], "ecu")


def make_fill_valve():
    bm = bmesh.new()
    s = seg(24, 10)
    # lying along X: threaded shank, hex, flange, head with rubber cap, bracket plate
    C.cyl(0.010, 0.05, s, loc=(-0.035, 0, 0.022), axis="X", bm=bm)
    if HI():
        for k in range(10):
            C.torus(0.0102, 0.0009, s, 4, loc=(-0.055 + k * 0.004, 0, 0.022), axis="X", bm=bm)
    hex_nut(0.017, 0.012, (-0.004, 0, 0.022), axis="X", bm=bm)
    C.cyl(0.020, 0.004, s, loc=(0.006, 0, 0.022), axis="X", bm=bm)
    C.cyl(0.014, 0.02, s, loc=(0.018, 0, 0.022), axis="X", bm=bm)
    C.cyl(0.0165, 0.016, s, loc=(0.034, 0, 0.022), axis="X", bm=bm, mat=1)  # cap
    C.torus(0.0155, 0.002, s, 6, loc=(0.043, 0, 0.022), axis="X", bm=bm, mat=1)
    barb(bm, V((-0.06, 0, 0.022)), (-1, 0, 0), r=0.004, L=0.016, segs=seg(12, 6))
    C.box((0.004, 0.06, 0.044), loc=(0.0035 + 0.008, 0, 0.022), bm=bm, mat=2)
    return mk("fill_valve", bm, ["brass", "rubber", "steel_zinc"], sharp=40)


def make_gas_line():
    """pancake coil of 8 mm copper-coated steel gas line (flat spiral, 6 turns), the inner end bridged out over
    the turns, flare nuts on both ends"""
    bm = bmesh.new()
    turns, r0, pitch = 6, 0.048, 0.0092
    n = int(turns * seg(48, 18))
    pts = []
    for k in range(n + 1):
        t = k / n
        a = 2 * math.pi * turns * t
        r = r0 + pitch * turns * t
        pts.append(V((r * math.cos(a), r * math.sin(a), 0.004)))
    r1 = r0 + pitch * turns
    inner = [V((0.04, -0.14, 0.013)), V((0.0, -r1 - 0.01, 0.013)), V((-0.02, -r0 - 0.02, 0.012)), V((-0.03, -0.02, 0.006))]
    lead = C.bezier_path(inner + [pts[0] + V((0, 0, 0.0))], seg(6, 3))
    tail = [pts[-1] + V((0.0, 0.03, 0.0)), pts[-1] + V((-0.02, 0.09, 0.0))]
    path = lead[:-1] + pts + tail
    C.tube(path, 0.004, seg(12, 6), bm=bm)
    for p, q in ((path[0], path[1]), (path[-1], path[-2])):
        d = (p - q).normalized()
        nut = C.cyl(0.0075, 0.012, 6, axis="Z")
        C.xform(nut, rot=V((0, 0, 1)).rotation_difference(d).to_matrix(), loc=p)
        for f in nut.faces:
            f.material_index = 1
        C.merge(bm, nut)
    C.xform(bm, loc=(0, 0, 0.0036))  # the flare nuts (r 7.5 mm) rest on the floor, the pipe just above it
    return mk("gas_line", bm, ["copper", "brass"], sharp=40, recalc=False)


def hose(bm, pts, r, mat=0, res=None):
    C.tube(C.bezier_path(pts, res or seg(8, 4)), r, seg(12, 6), bm=bm, mat=mat)


# ── layout ───────────────────────────────────────────────────────────────────
LAY = {  # Blender (x, y) floor positions + z rotation
    "reducer": ((0.40, 0.25), math.radians(-25)),
    "filter": ((0.40, 0.02), 0.0),
    "injector_rail": ((0.13, -0.30), 0.0),
    "map_sensor": ((0.44, -0.24), math.radians(10)),
    "ecu": ((-0.25, -0.33), math.radians(8)),
    "fill_valve": ((0.62, -0.20), math.radians(-60)),
    "valve_housing": ((-0.55, -0.20), 0.0),
    "gas_line": ((0.70, 0.16), 0.0),
}

EXPLODE = {  # three.js space
    "tank": (0.0, 0.0, 0.0), "tank_bracket": (0.0, 0.34, 0.0), "multivalve": (0.02, 0.22, 0.02),
    "reducer": (0.14, 0.10, -0.06), "filter": (0.16, 0.08, 0.02), "injector_rail": (0.02, 0.08, 0.16),
    "injector": (0.0, 0.07, 0.0), "nozzle_hoses": (0.0, 0.04, 0.24), "map_sensor": (0.12, 0.08, 0.14),
    "ecu": (-0.10, 0.06, 0.16), "fill_valve": (0.2, 0.06, 0.12), "gas_line": (0.22, 0.03, -0.04), "hoses": (0.08, 0.18, 0.0), "valve_housing": (-0.16, 0.10, 0.12),
}


def place(o, key):
    (x, y), rz = LAY[key]
    o.data.transform(Matrix.Rotation(rz, 4, "Z"))
    o.location = (x, y, 0)


def world_pt(o, p):
    return o.matrix_world @ V(p)


def build(q):
    global Q
    Q = q
    C.reset()
    mats()
    root = C.empty("lpg_kit")
    tank = make_tank()
    tank.location = TANK_C
    bracket = make_bracket()
    bracket.location = TANK_C
    mv, needle = make_multivalve()
    M = Matrix.Translation(TANK_C) @ valve_frame()
    mv.data.transform(M)
    # needle: its own pivot at the dial centre
    needle.matrix_world = M @ Matrix.Translation((0, -0.0395, 0.050))
    red = make_reducer()
    place(red, "reducer")
    flt = make_filter()
    place(flt, "filter")
    flt.location.z = 0.021
    rail = make_rail()
    place(rail, "injector_rail")
    injs = []
    for i in range(4):
        inj = make_injector(i)
        inj.location = (LAY["injector_rail"][0][0] - 0.0465 + i * 0.031, LAY["injector_rail"][0][1], 0.026)
        injs.append(inj)
    nh = make_nozzle_hoses(V((*LAY["injector_rail"][0], 0)))
    mp = make_map_sensor()
    place(mp, "map_sensor")
    ecu = make_ecu()
    place(ecu, "ecu")
    fv = make_fill_valve()
    place(fv, "fill_valve")
    gl = make_gas_line()
    place(gl, "gas_line")
    hs = make_housing()
    place(hs, "valve_housing")
    bpy.context.view_layer.update()
    # hoses between the parts (world space): reducer gas out -> filter in, filter out -> rail in,
    # rail -> MAP (thin vacuum line), plus the two coolant hose stubs on the reducer
    hb = bmesh.new()
    rz = LAY["reducer"][1]
    Rr = Matrix.Rotation(rz, 3, "Z")
    r0 = V((*LAY["reducer"][0], 0))
    gas_out = r0 + Rr @ V((-0.020, -0.086, 0.039))
    f_in = V((LAY["filter"][0][0] + 0.072, LAY["filter"][0][1], 0.021))
    f_out = V((LAY["filter"][0][0] - 0.072, LAY["filter"][0][1], 0.021))
    hose(hb, [gas_out, gas_out + Rr @ V((0, -0.05, -0.01)), f_in + V((0.08, 0.04, 0.0)), f_in + V((0.03, 0, 0)), f_in], 0.0105, 1)
    rail_in = V((LAY["injector_rail"][0][0] + 0.089, LAY["injector_rail"][0][1], 0.013))
    hose(hb, [f_out, f_out + V((-0.05, 0.0, 0.0)), V((0.18, -0.10, 0.012)), rail_in + V((0.06, 0.02, 0.0)), rail_in], 0.0085, 1)
    m_port = V((LAY["map_sensor"][0][0] - 0.004, LAY["map_sensor"][0][1] - 0.04, 0.01))
    hose(hb, [V((LAY["injector_rail"][0][0] - 0.071, LAY["injector_rail"][0][1], 0.018)),
              V((LAY["injector_rail"][0][0] - 0.10, LAY["injector_rail"][0][1] - 0.06, 0.006)),
              V((0.25, -0.44, 0.004)), m_port + V((0.0, -0.06, 0.0)), m_port], 0.003, 0)
    for dy in (0.018, -0.018):
        p = r0 + Rr @ V((0.129, dy, 0.020))
        d = Rr @ V((1, 0, 0))
        hose(hb, [p, p + d * 0.05, p + d * 0.1 + V((0, dy * 2, 0.0)), p + d * 0.13 + V((0, dy * 3, -0.008))], 0.0115, 1)
    hoses = mk("hoses", hb, ["rubber", "rubber"], sharp=50, recalc=False)
    parts = [tank, bracket, mv, needle, red, flt, rail, nh, mp, ecu, fv, gl, hs, hoses] + injs
    bpy.context.view_layer.update()
    C.bake_ao_vcol([p for p in parts if p is not needle], samples=seg(40, 16), max_dist=0.05, floor=0.3)
    # pivots at part centres (tank / bracket keep the tank centre; needle keeps its dial pivot)
    for o in parts:
        if o in (tank, bracket, needle):
            continue
        mw = o.matrix_world.copy()
        c = mw @ (sum((V(v) for v in o.bound_box), V()) / 8)
        o.data.transform(mw)
        o.matrix_world = Matrix.Identity(4)
        o.data.transform(Matrix.Translation(-c))
        o.location = c
    bpy.context.view_layer.update()
    for o in parts:
        o.parent = root
    for inj in injs:
        mw = inj.matrix_world.copy()
        inj.parent = rail
        inj.matrix_world = mw
    mw = needle.matrix_world.copy()
    needle.parent = mv
    needle.matrix_world = mw
    for o in parts:
        key = o.name.rsplit("_", 1)[0] if o.name.rsplit("_", 1)[-1].isdigit() else o.name
        if key in EXPLODE:
            C.set_explode(o, EXPLODE[key])
    bpy.context.view_layer.update()
    lo = V((1e9,) * 3)
    hi = V((-1e9,) * 3)
    for o in parts:
        for c in o.bound_box:
            w = o.matrix_world @ V(c)
            lo = V(map(min, lo, w))
            hi = V(map(max, hi, w))
    root.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)
    bpy.context.view_layer.update()
    return root


if __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    root = build(q)
    if a.get("look"):
        H_ = os.path.join(C.HERE, "..", "public/lib3d/env/")
        az = math.radians(float(a.get("az", "30")))
        d = float(a.get("d", "1.7"))
        C.look(a["look"], target=(0, 0, 0.08), cam=(d * math.sin(az), -d * math.cos(az), 1.1), fov=34,
               hdr=H_ + a.get("env", "workshop") + "-1k-v1.hdr", ground=True, spp=int(a.get("spp", "48")), res=(1200, 800))
    if a.get("out") or not a.get("look"):
        C.finish("lpg_kit", q, root, a.get("out"), pivots=True)
