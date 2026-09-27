"""Manual 5-speed + reverse FWD transaxle (two-shaft, ~0.50 m long), unbranded, every rotating part a node.

  Blender -b --factory-startup --python assets3d/build_gearbox.py -- --q hi [--out x.glb] [--look /tmp/g.png]

three.js space: shafts along X. The bellhousing face (engine side) is the plane x = 0 and the box extends toward
-X (so it bolts to the flywheel end of the `engine` asset: engine flywheel at x = -0.23, crank axis y = 0.160 ->
put the gearbox at (engine x - 0.235, 0.160 - INPUT_Y, 0)). Input shaft axis at y = 0.302, z = 0. Output shaft
below and behind it (+Z), differential further down / back. Origin: on the bellhousing face, below the input
axis, on the ground (the case sits on y = 0).

Gear pairs (input / output teeth; centre distance 75 mm; helical 25 deg, opposite hands):
  1st 11/38 = 3.45   2nd 18/35 = 1.94   3rd 25/32 = 1.28   4th 31/30 = 0.97   5th 35/28 = 0.80
  reverse 11 -> idler 19 -> 33 = 3.00 (teeth on the 1-2 synchro sleeve)   final drive 17/66 = 3.88
extras.spin = [1, 0, 0, ratio] on every rotating node (angle relative to the input shaft), posed with 3rd engaged.
extras.explode on every part (metres, three space).
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

Q = "hi"
ZI = 0.302  # input axis height (Blender z)
A1 = 0.075  # input-output centre distance
A2 = 0.1245  # output-ring gear centre distance
HELIX = math.radians(25)
XS = -0.135  # case split plane (clutch housing | gear housing)
XE = -0.390  # gear housing end wall / end cover joint
XC_END = -0.468  # end cover tip
_o = Vector((-0.035, -0.0663)).normalized() * A1
OY, OZ = _o.x, ZI + _o.y
_d = Vector((-0.55, -0.835)).normalized() * A2
DY, DZ = OY + _d.x, OZ + _d.y
RLY, RLZ = 0.054, ZI - 0.062  # shift-rail pocket centre
X_RING = -0.140

PAIRS = {  # name: (z_in, z_out, x centre, width)
    "1": (11, 38, -0.182, 0.020),
    "2": (18, 35, -0.242, 0.019),
    "3": (25, 32, -0.272, 0.018),
    "4": (31, 30, -0.322, 0.018),
    "5": (35, 28, -0.416, 0.017),
}
X_SYNC = {"12": -0.212, "34": -0.297, "5": -0.441}
X_REV = -0.212
I_ENG = 1.28  # 3rd engaged
W_OUT = -1.0 / I_ENG


def HI():
    return Q == "hi"


def seg(a, b):
    return a if HI() else b


# ── materials ────────────────────────────────────────────────────────────────
def mats():
    n = 512 if HI() else 256
    a, o, nn = T.cast_alu(n, seed=61, lum=0.50, rough=0.56)
    a = 0.48 + (a - a.mean()) * 0.35
    C.material("case_alu", (1, 1, 1), albedo=C.image("g_alu_alb", a), orm=C.image("g_alu_orm", o, False),
               normal=(C.image("g_alu_n", nn, False) if HI() else None), normal_strength=0.18, vcol=True, uv_scale=(6, 6))
    C.material("alu_machined", C.srgb("#c4c7ca"), 0.22, 1.0, vcol=True)
    C.material("gear_steel", C.srgb("#b3b7bc"), 0.33, 1.0, vcol=True)  # ground teeth (flat: no UVs -> fewer vertex splits)
    C.material("gear_face", C.srgb("#6f7378"), 0.36, 1.0, vcol=True)  # turned faces, slightly oily darker
    C.material("shaft_steel", C.srgb("#b4b8bc"), 0.28, 1.0, vcol=True)
    C.material("steel_dark", C.srgb("#303235"), 0.42, 0.85, vcol=True)
    C.material("cast_iron", C.srgb("#3f4144"), 0.55, 0.8, vcol=True)
    C.material("bronze", C.srgb("#b88a4a"), 0.3, 1.0, vcol=True)
    C.material("fork_steel", C.srgb("#8a8166"), 0.38, 0.9, vcol=True)  # yellow-zinc passivated
    C.material("rubber", C.srgb("#141415"), 0.8, 0.0, vcol=True)
    C.material("plastic_black", C.srgb("#18181a"), 0.5, 0.0, vcol=True)


def uv01(ob, span=0.8, cx=-0.24, cy=-0.05, cz=0.2):
    me = ob.data
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
    bm = bmesh.new()
    bm.from_mesh(me)
    uvl = bm.loops.layers.uv.verify()
    mw = ob.matrix_world
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            p = mw @ lp.vert.co
            x, y, z = p.x - cx, p.y - cy, p.z - cz
            u, v = ((y, z), (x, z), (x, y))[ax]
            lp[uvl].uv = (min(max(u / span + 0.5, 0), 1), min(max(v / span + 0.5, 0), 1))
    bm.to_mesh(me)
    bm.free()
    return ob


def mk(name, bm, mats_, sharp=35, recalc=True, uv=True):
    o = C.obj(name, bm, mats_, sharp=sharp, recalc=recalc)
    if uv:
        uv01(o)
    return o


def lathe_x(prof, segs, cy, cz, bm=None, mat=0, angle=2 * math.pi, ofs=0.0):
    """prof [(r, x)] revolved about the X axis through (cy, cz)"""
    b = C.lathe(prof, segs, axis="X", angle=angle, ofs=ofs)
    bmesh.ops.remove_doubles(b, verts=b.verts, dist=1e-7)
    if abs(angle - 2 * math.pi) > 1e-6:
        bmesh.ops.holes_fill(b, edges=b.edges[:], sides=12)
    C.xform(b, loc=(0, cy, cz))
    for f in b.faces:
        f.material_index = mat
    if bm is None:
        return b
    C.merge(bm, b)
    return bm


# ── gear teeth ───────────────────────────────────────────────────────────────
def tooth_profile(z, rp, ofs, coarse=False):
    """one closed ring of (angle, radius) around a gear: rounded root, flanks through the pitch circle, flat tip"""
    m = 2 * rp / z
    ra, rr = rp + m, rp - 1.25 * m
    if HI() and not coarse:
        us = [(0.06, rr), (0.25, rp), (0.32, ra - 0.3 * m), (0.37, ra), (0.63, ra), (0.68, ra - 0.3 * m), (0.75, rp),
              (0.94, rr)]
    else:
        us = [(0.08, rr), (0.3, ra), (0.7, ra), (0.92, rr)]
    out = []
    for k in range(z):
        for u, r in us:
            out.append((ofs + 2 * math.pi * (k + u) / z, r))
    return out, ra, rr


def toothed(z, rp, x0, x1, cy, cz, ofs=0.0, hand=1, inner_r=None, bm=None, mat=0, chamfer=True, helix=True,
            scale1=1.0, coarse=False):
    """toothed ring from x0 to x1 about the X axis through (cy, cz): helical twist (hand +-1), tip chamfers at
    both ends, flat annular end faces down to inner_r (a closed solid). scale1 != 1 tapers the teeth linearly
    (bevel gears: radius scale at x1)."""
    prof, ra, rr = tooth_profile(z, rp, ofs, coarse)
    w = abs(x1 - x0)
    twist = (w * math.tan(HELIX) / rp * hand) if (helix and HI()) else 0.0
    ch = min(0.0009, 0.18 * (ra - rr)) if (chamfer and HI() and not coarse) else 0.0
    ns = 1  # the helix twist spans the face in one ruled segment (reads helical, half the vertices)
    xs = [x0 + (x1 - x0) * k / ns for k in range(ns + 1)]
    rings_x = []
    if ch:
        rings_x.append((x0, True))
        rings_x += [(x0 + (x1 - x0) * (ch / w) + (x - x0) * (1 - 2 * ch / w), False) for x in xs]
        rings_x.append((x1, True))
    else:
        rings_x = [(x, False) for x in xs]
    inner_r = inner_r if inner_r is not None else rr * 0.55
    b = bmesh.new()
    rings = []
    for x, clamp in rings_x:
        t = (x - x0) / (x1 - x0) if x1 != x0 else 0
        sc = 1 + (scale1 - 1) * t
        tw = twist * (t - 0.5)
        ring = []
        for a, r in prof:
            rr_ = min(r, ra - ch) if clamp else r
            aa = a + tw
            ring.append(b.verts.new((x, cy + rr_ * sc * math.cos(aa), cz + rr_ * sc * math.sin(aa))))
        rings.append((ring, sc, tw))
    n = len(prof)
    for (ra_, _, _), (rb_, _, _) in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            b.faces.new((ra_[i], ra_[j], rb_[j], rb_[i]))
    # end faces: one planar n-gon per tooth (outer tooth outline + 2 inner-circle vertices), so the bore circle
    # carries 2 vertices per tooth instead of one per outline point (the exporter triangulates the concave n-gons)
    per = n // z
    inn = []
    for (ring, sc, tw), x in ((rings[0], rings_x[0][0]), (rings[-1], rings_x[-1][0])):
        iv = []
        for k in range(z):
            for u in (0.0, 0.5):
                a = prof[k * per][0] + 2 * math.pi * u / z + tw
                iv.append(b.verts.new((x, cy + inner_r * sc * math.cos(a), cz + inner_r * sc * math.sin(a))))
        inn.append(iv)
    ni = 2 * z
    for side, (ring, _, _) in enumerate((rings[0], rings[-1])):
        iv = inn[side]
        for k in range(z):
            outer = [ring[(k * per + j) % n] for j in range(per + 1)]
            inner = [iv[(2 * k + 2) % ni], iv[2 * k + 1], iv[2 * k]]
            f = outer + inner
            b.faces.new(f if side else f[::-1])
    for i in range(ni):  # inner wall
        j = (i + 1) % ni
        b.faces.new((inn[0][j], inn[0][i], inn[1][i], inn[1][j]))
    for f in b.faces:
        f.material_index = mat
    if bm is None:
        return b
    C.merge(bm, b)
    return bm


def pitch_r(pair, side):
    zi, zo = PAIRS[pair][:2]
    return A1 * (zi if side == "in" else zo) / (zi + zo)


ANG_IO = math.atan2(OZ - ZI, OY - 0.0)  # direction input -> output in the (y, z) plane


def gear_ofs(z, toward, tooth):
    """rotation offset so a tooth (tooth=True) or a gap points along angle `toward`"""
    return toward - (2 * math.pi * 0.5 / z if tooth else 0.0)


def make_gear(name, z, rp, xc, w, cy, cz, ofs, hand, bore_r, dog=None, web=True, mats_=("gear_steel", "gear_face")):
    """spur/helical gear: toothed rim, recessed web, hub; dog = side (+1/-1) for the synchro dog-teeth ring"""
    x0, x1 = xc - w / 2, xc + w / 2
    m = 2 * rp / z
    rr = rp - 1.25 * m
    rim_r = rr - 2.2 * m
    hub_r = bore_r + 0.007
    b = bmesh.new()
    if web and rim_r > hub_r + 0.008:
        toothed(z, rp, x0, x1, cy, cz, ofs, hand, inner_r=rim_r, bm=b, mat=0)
        rec = w * 0.28 if HI() else 0.0
        prof = [(rim_r + 0.0005, x0 + rec), (hub_r + 0.002, x0 + rec), (hub_r, x0 + rec * 0.6), (hub_r, x0 - 0.0),
                (bore_r, x0), (bore_r, x1), (hub_r, x1), (hub_r, x1 - rec * 0.6), (hub_r + 0.002, x1 - rec),
                (rim_r + 0.0005, x1 - rec)]
        lathe_x(prof, seg(48, 20), cy, cz, bm=b, mat=1)
        if HI():  # lightening holes read through the web: dark bolt-circle dimples
            pass
    else:
        toothed(z, rp, x0, x1, cy, cz, ofs, hand, inner_r=min(bore_r, rr - 0.0015), bm=b, mat=0)
    if dog and HI():  # dog-teeth ring + cone for the synchro on one face
        xd = x1 if dog > 0 else x0
        rd = min(rr - 0.004, max(bore_r + 0.012, 0.03))
        zd = max(24, int(rd * 1000))
        toothed(zd, rd, xd, xd + dog * 0.0045, cy, cz, 0, 1, inner_r=bore_r + 0.001, bm=b, mat=1, helix=False, coarse=True)
        lathe_x([(bore_r + 0.001, xd + dog * 0.0045), (rd - 0.004, xd + dog * 0.0045), (rd - 0.007, xd + dog * 0.011),
                 (bore_r + 0.001, xd + dog * 0.011)], seg(40, 16), cy, cz, bm=b, mat=1)
    return mk(name, b, list(mats_), sharp=40, recalc=False)


def make_sync(name, cy, cz, xc, r_sleeve, bore_r, rev_teeth=None, hand=1, ofs=0.0):
    """synchro hub + sliding sleeve (fork groove) + two brass baulk rings. returns hub, sleeve"""
    w = 0.024
    x0, x1 = xc - w / 2, xc + w / 2
    hb = bmesh.new()
    lathe_x([(bore_r, x0 + 0.002), (r_sleeve - 0.009, x0 + 0.002), (r_sleeve - 0.009, x1 - 0.002), (bore_r, x1 - 0.002)],
            seg(40, 16), cy, cz, bm=hb, mat=0)
    for s in (-1, 1):  # baulk rings
        xr = xc + s * (w / 2 + 0.0035)
        if HI():
            toothed(30, r_sleeve - 0.0075, xr - 0.0022, xr + 0.0022, cy, cz, 0, 1, inner_r=r_sleeve - 0.014, bm=hb, mat=1,
                    helix=False, coarse=True)
        else:
            lathe_x([(r_sleeve - 0.014, xr - 0.002), (r_sleeve - 0.007, xr - 0.002), (r_sleeve - 0.007, xr + 0.002),
                     (r_sleeve - 0.014, xr + 0.002)], 20, cy, cz, bm=hb, mat=1)
    hub = mk(name + "_hub", hb, ["gear_face", "bronze"], sharp=40)
    sb = bmesh.new()
    g0, g1 = xc - 0.0035, xc + 0.0035  # fork groove
    r_in = r_sleeve - 0.009
    if rev_teeth:
        z, rp = rev_teeth
        toothed(z, rp, x0, g0 - 0.0005, cy, cz, ofs, 0, inner_r=r_in, bm=sb, mat=0, helix=False, coarse=True)
        toothed(z, rp, g1 + 0.0005, x1, cy, cz, ofs, 0, inner_r=r_in, bm=sb, mat=0, helix=False, coarse=True)
        lathe_x([(r_in, g0 - 0.001), (rp - 0.012, g0 - 0.001), (rp - 0.012, g1 + 0.001), (r_in, g1 + 0.001)],
                seg(48, 20), cy, cz, bm=sb, mat=1)
    else:
        ch = 0.0012
        prof = [(r_in, x0), (r_sleeve - ch, x0), (r_sleeve, x0 + ch), (r_sleeve, g0 - 0.0006), (r_sleeve - 0.0045, g0),
                (r_sleeve - 0.0045, g1), (r_sleeve, g1 + 0.0006), (r_sleeve, x1 - ch), (r_sleeve - ch, x1), (r_in, x1), (r_in, x0)]
        lathe_x(prof, seg(64, 24), cy, cz, bm=sb, mat=0)
    sleeve = mk(name + "_sleeve", sb, ["gear_steel", "gear_face"], sharp=40)
    return hub, sleeve


def make_bearing(bm, cy, cz, xc, r_in, r_out, w):
    t = (r_out - r_in) * 0.28
    prof = [(r_in, xc - w / 2), (r_in + t, xc - w / 2), (r_in + t, xc + w / 2), (r_in, xc + w / 2), (r_in, xc - w / 2)]
    lathe_x(prof, seg(40, 16), cy, cz, bm=bm, mat=0)
    prof = [(r_out - t, xc - w / 2), (r_out, xc - w / 2), (r_out, xc + w / 2), (r_out - t, xc + w / 2), (r_out - t, xc - w / 2)]
    lathe_x(prof, seg(40, 16), cy, cz, bm=bm, mat=0)
    rc = (r_in + r_out) / 2
    lathe_x([(rc - t * 0.5, xc - w * 0.3), (rc + t * 0.5, xc - w * 0.3), (rc + t * 0.5, xc + w * 0.3), (rc - t * 0.5, xc + w * 0.3),
             (rc - t * 0.5, xc - w * 0.3)], seg(40, 16), cy, cz, bm=bm, mat=1)
    if False:  # balls: hidden inside the races at any sane distance (kept out of the triangle budget)
        nb = max(8, int(2 * math.pi * rc / ((r_out - r_in) * 0.62)))
        rb = (r_out - r_in) * 0.27
        for k in range(nb):
            a = 2 * math.pi * k / nb
            s = bmesh.new()
            bmesh.ops.create_uvsphere(s, u_segments=8, v_segments=5, radius=rb)
            C.xform(s, loc=(xc, cy + rc * math.cos(a), cz + rc * math.sin(a)))
            for f in s.faces:
                f.material_index = 0
            C.merge(bm, s)


# ── shafts ───────────────────────────────────────────────────────────────────
def make_input_shaft():
    b = bmesh.new()
    prof = [(0.0, -0.004), (0.0105, -0.004), (0.0115, -0.006), (0.0115, -0.085), (0.0135, -0.09), (0.0135, -0.104),
            (0.0175, -0.108), (0.0175, -0.125), (0.0185, -0.128), (0.0185, -0.168), (0.0115, -0.171), (0.0115, -0.1935),
            (0.0185, -0.1965), (0.0185, -0.2035), (0.0115, -0.2065), (0.0115, -0.2175), (0.0185, -0.2205),
            (0.0185, -0.44), (0.0155, -0.444), (0.0155, -0.458), (0.0, -0.46)]
    lathe_x(prof, seg(32, 14), 0, ZI, bm=b, mat=0)
    if HI():  # clutch-disc splines in the bell
        toothed(22, 0.0122, -0.082, -0.012, 0, ZI, 0, 0, inner_r=0.008, bm=b, mat=0, helix=False, chamfer=False, coarse=True)
    for xc, ri, ro, w in ((-0.118, 0.0175, 0.036, 0.016), (-0.398, 0.0185, 0.04, 0.017)):
        make_bearing(b, 0, ZI, xc, ri, ro, w)
    return mk("input_shaft", b, ["shaft_steel", "steel_dark"], sharp=40)


def make_output_shaft():
    b = bmesh.new()
    prof = [(0.0, -0.100), (0.017, -0.100), (0.0195, -0.104), (0.0195, -0.455), (0.016, -0.46), (0.0, -0.462)]
    lathe_x(prof, seg(32, 14), OY, OZ, bm=b, mat=0)
    for xc, ri, ro, w in ((-0.112, 0.0195, 0.042, 0.018), (-0.398, 0.0195, 0.044, 0.018)):
        make_bearing(b, OY, OZ, xc, ri, ro, w)
    return mk("output_shaft", b, ["shaft_steel", "steel_dark"], sharp=40)


# ── differential ─────────────────────────────────────────────────────────────
def make_diff():
    parts = {}
    # ring gear (helical, bolted to the case flange)
    zr, zp = 66, 17
    rr_ = A2 * zr / (zr + zp)
    rp_ = A2 * zp / (zr + zp)
    ang_od = math.atan2(DZ - OZ, DY - OY)
    ofs_ring = gear_ofs(zr, ang_od + math.pi, tooth=False)
    b = bmesh.new()
    toothed(zr, rr_, X_RING - 0.013, X_RING + 0.013, DY, DZ, ofs_ring, -1, inner_r=rr_ - 0.02, bm=b, mat=0)
    for k in range(10 if HI() else 0):
        a = 2 * math.pi * (k + 0.5) / 10
        C.cyl(0.0062, 0.006, 6, loc=(X_RING + 0.015, DY + 0.074 * math.cos(a), DZ + 0.074 * math.sin(a)), axis="X", bm=b, mat=1)
    parts["ring_gear"] = mk("ring_gear", b, ["gear_steel", "steel_dark"], sharp=40, recalc=False)
    # case: necks, spherical body, ring flange
    xl, xr = -0.232, -0.052
    xm = -0.150
    prof = [(0.0, xr), (0.021, xr), (0.022, xr - 0.022), (0.03, xr - 0.024), (0.034, xr - 0.034)]
    for k in range(1, 8):
        a = math.pi * k / 8
        prof.append((0.034 + 0.028 * math.sin(a), xr - 0.034 - (xr - 0.034 - (xl + 0.034)) * (1 - math.cos(a)) / 2))
    prof += [(0.034, xl + 0.034), (0.03, xl + 0.024), (0.022, xl + 0.022), (0.021, xl), (0.0, xl)]
    prof = prof[::-1]
    db = lathe_x(prof, seg(48, 20), DY, DZ, mat=0)
    lathe_x([(0.04, X_RING - 0.023), (0.082, X_RING - 0.023), (0.084, X_RING - 0.021), (0.084, X_RING - 0.013),
             (0.04, X_RING - 0.013), (0.04, X_RING - 0.023)], seg(64, 24), DY, DZ, bm=db, mat=0)
    case = mk("diff_case", db, ["cast_iron"], sharp=40)
    if HI():
        cut = bmesh.new()
        for s in (-1, 1):
            C.merge(cut, C.box((0.05, 0.08, 0.05), loc=(xm + 0.012, DY, DZ + s * 0.058)))
        C.boolean(case, C.obj("_w", cut, ["cast_iron"], smooth=False))
        uv01(case)
    parts["diff_case"] = case
    # cross pin + planets (axis along Blender Z) + side gears (axis X)
    pb = bmesh.new()
    C.cyl(0.0075, 0.108, 16, loc=(xm, DY, DZ), axis="Z", bm=pb)
    parts["cross_pin"] = mk("cross_pin", pb, ["shaft_steel"])
    for i, s in enumerate((1, -1)):
        g = toothed(10, 0.021, 0.0, 0.016, 0, 0, 0, 0, inner_r=0.0078, helix=False, chamfer=False, scale1=0.6, coarse=True)
        C.xform(g, rot=Matrix.Rotation(math.radians(90 if s > 0 else -90), 3, "Y"), loc=(xm, DY, DZ + s * 0.05))
        parts[f"planet_{i + 1}"] = mk(f"planet_{i + 1}", g, ["gear_steel"], sharp=40, recalc=True)
    for name, s in (("side_gear_L", -1), ("side_gear_R", 1)):
        g = toothed(16, 0.03, 0.0, 0.017, 0, 0, 0, 0, inner_r=0.011, helix=False, chamfer=False, scale1=0.62, coarse=True)
        C.xform(g, rot=Matrix.Rotation(0 if s < 0 else math.pi, 3, "Z"), loc=(xm + s * 0.055, DY, DZ))
        parts[name] = mk(name, g, ["gear_steel"], sharp=40, recalc=True)
    # drive flanges (CV joint flanges, 6 bolt holes) outside the case
    for name, x0, s in (("flange_L", -0.266, -1), ("flange_R", -0.012, 1)):
        fb = bmesh.new()
        prof = [(0.0, x0), (0.02, x0), (0.02, x0 - s * 0.028), (0.03, x0 - s * 0.03), (0.047, x0 - s * 0.003 * 0),
                (0.049, x0 + s * 0.0015), (0.049, x0 + s * 0.012), (0.046, x0 + s * 0.014), (0.0, x0 + s * 0.014)]
        if s < 0:
            prof = prof[::-1]
        lathe_x(prof, seg(48, 20), DY, DZ, bm=fb, mat=0)
        o = mk(name, fb, ["steel_dark", "shaft_steel"], sharp=35)
        cut = bmesh.new()
        for k in range(6):
            a = 2 * math.pi * k / 6
            C.cyl(0.0045, 0.05, 12, loc=(x0, DY + 0.037 * math.cos(a), DZ + 0.037 * math.sin(a)), axis="X", bm=cut)
        C.cyl(0.011, 0.012, 20, loc=(x0 + s * 0.014, DY, DZ), axis="X", bm=cut)
        C.boolean(o, C.obj("_c", cut, ["steel_dark"], smooth=False))
        uv01(o)
        parts[name] = o
    return parts


# ── casing (loft of convex hulls of circles, per X section) ──────────────────
def hull2d(pts):
    pts = sorted(set(pts))
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]


def section(circles, n):
    """convex hull of circles [(cy, cz, r)] resampled to n points (arc length), starting at the topmost, CCW"""
    pts = []
    for cy, cz, r in circles:
        for k in range(72):
            a = 2 * math.pi * k / 72
            pts.append((round(cy + r * math.cos(a), 6), round(cz + r * math.sin(a), 6)))
    h = hull2d(pts)
    i0 = max(range(len(h)), key=lambda i: (h[i][1], -abs(h[i][0])))
    h = h[i0:] + h[:i0]
    h.append(h[0])
    acc = [0.0]
    for a, b in zip(h, h[1:]):
        acc.append(acc[-1] + math.dist(a, b))
    L = acc[-1]
    out = []
    j = 0
    for k in range(n):
        s = L * k / n
        while acc[j + 1] < s:
            j += 1
        t = (s - acc[j]) / max(1e-12, acc[j + 1] - acc[j])
        out.append((h[j][0] + (h[j + 1][0] - h[j][0]) * t, h[j][1] + (h[j + 1][1] - h[j][1]) * t))
    return out


def loft_x(xs, circ_fn, n, bm=None, mat=0):
    b = bmesh.new()
    rings = []
    for x in xs:
        rings.append([b.verts.new((x, y, z)) for y, z in section(circ_fn(x), n)])
    for ra, rb in zip(rings, rings[1:]):
        for i in range(n):
            j = (i + 1) % n
            b.faces.new((ra[i], ra[j], rb[j], rb[i]))
    b.faces.new(rings[0][::-1])
    b.faces.new(rings[-1])
    for f in b.faces:
        f.material_index = mat
    if bm is None:
        return b
    C.merge(bm, b)
    return bm


def sstep(a, b, x):
    t = min(1, max(0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def bell_r(x):
    """bellhousing outer radius about the input axis"""
    return lerp(0.150, 0.066, sstep(-0.05, -0.118, x))


def outer_clutch(x, inset=0.0):
    lip = 0.018 * (1 - sstep(-0.011, -0.015, x)) + 0.008 * sstep(XS + 0.016, XS + 0.012, x)
    c = [(0.0, ZI, bell_r(x) + lip - inset)]
    if x < -0.090:
        c += [(OY, OZ, 0.072 + lip - inset), (RLY, RLZ, 0.034 + lip - inset)]
    # the diff lobe runs up to the engine face (the right drive flange exits through the bell face, as on real
    # FWD transaxles), then swells into the final-drive drum
    rd = lerp(0.066, 0.118, sstep(-0.040, -0.066, x))
    c.append((DY, DZ, rd + lip - inset))
    return c


def rib_bump(x, ribs):
    if not HI():
        return 0.0
    return sum(0.0035 * (1 - sstep(0.002, 0.004, abs(x - r))) for r in ribs)


def outer_gear(x, inset=0.0):
    lip = 0.008 * sstep(XS - 0.016, XS - 0.012, x) + 0.006 * (1 - sstep(XE + 0.012, XE + 0.008, x))
    tap = 0.004 * sstep(-0.35, -0.385, x)
    rib = rib_bump(x, (-0.19, -0.29))
    e = lip - tap + rib - inset
    c = [(0.0, ZI, 0.058 + e), (OY, OZ, 0.072 + e), (RLY, RLZ, 0.034 + e)]
    if x > -0.262:
        rd = lerp(0.118, 0.045, sstep(-0.228, -0.244, x))
        c.append((DY, DZ, rd + e))
    return c


def outer_cover(x, inset=0.0):
    lip = 0.006 * sstep(XE - 0.012, XE - 0.008, x)
    t = sstep(XE - 0.03, XC_END, x)
    dome = 0.0
    if x < XC_END + 0.016:
        u = (XC_END + 0.016 - x) / 0.016
        dome = 0.016 * (1 - math.sqrt(max(0, 1 - u * u)))
    e = lip - 0.006 * t - dome - inset
    return [(0.0, ZI, 0.058 + e), (OY, OZ, 0.070 + e), (RLY, RLZ, 0.034 + e)]


def xs_between(a, b, n, extra=()):
    xs = sorted(set([a + (b - a) * k / n for k in range(n + 1)] + [x for x in extra if min(a, b) <= x <= max(a, b)]), reverse=True)
    return xs


def boss_ring(bm, pts, x0, x1, r, mat=0):
    for y, z in pts:
        C.cyl(r, abs(x1 - x0), seg(14, 8), loc=((x0 + x1) / 2, y, z), axis="X", bm=bm, mat=mat)


def perim_points(circ, n_bolts, grow):
    sec = section(circ, 360)
    cy = sum(p[0] for p in sec) / len(sec)
    cz = sum(p[1] for p in sec) / len(sec)
    out = []
    step = len(sec) / n_bolts
    for k in range(n_bolts):
        y, z = sec[int(k * step)]
        d = Vector((y - cy, z - cz)).normalized()
        out.append((y + d.x * grow, z + d.y * grow))
    return out


def lug(bm, x, y, z, circ, r=0.0075, L=0.014):
    """cast bolt lug: boss + a web back to the wall (reads as part of the casting, not a peg)"""
    sec = section(circ, 120)
    cy = sum(p[0] for p in sec) / len(sec)
    cz = sum(p[1] for p in sec) / len(sec)
    d = Vector((y - cy, z - cz)).normalized()
    C.cyl(r, L, seg(16, 8), loc=(x, y, z), axis="X", bm=bm)
    w = C.box((L, 2 * r * 0.9, 0.018), loc=(0, 0, 0))
    C.xform(w, rot=Matrix.Rotation(math.atan2(d.y, d.x) - math.pi / 2, 3, "X"), loc=(x, y - d.x * 0.009, z - d.y * 0.009))
    C.merge(bm, w)


def make_case_clutch():
    n = seg(84, 32)
    xs = xs_between(0.0, XS, seg(22, 12), extra=(-0.011, -0.013, -0.015, -0.040, -0.066, -0.0895, -0.0905, XS + 0.012, XS + 0.016))
    b = loft_x(xs, outer_clutch, n)
    o = mk("case_clutch", b, ["case_alu"], sharp=32, uv=False)
    cut = bmesh.new()
    # bell cavity (open at the engine face)
    xb = xs_between(0.012, -0.100, seg(16, 8))
    loft_x(xb, lambda x: [(0.0, ZI, bell_r(min(x, 0.0)) - 0.0065 - 0.004 * sstep(-0.06, -0.1, x))], n, bm=cut)
    # gear / diff cavity, open at the split plane
    def gc(x):
        c = [(DY, DZ, 0.111)]
        if x < -0.112:
            c += [(0.0, ZI, 0.051), (OY, OZ, 0.065), (RLY, RLZ, 0.026)]
        return c
    xg = [-0.066, -0.0875, -0.111, -0.1125, -0.12, XS - 0.03]
    loft_x(xg, gc, n, bm=cut)
    C.cyl(0.028, 0.08, 32, loc=(-0.02, DY, DZ), axis="X", bm=cut)  # right drive-shaft hole
    C.cyl(0.053, 0.026, seg(48, 24), loc=(0.0, DY, DZ), axis="X", bm=cut)  # flange recess in the lobe face
    ring = perim_points(outer_clutch(-0.004), seg(14, 10), -0.0095)  # bolt holes through the face flange
    for y, z in ring:
        C.cyl(0.0052, 0.05, seg(16, 8), loc=(0.0, y, z), axis="X", bm=cut)
    C.cyl(0.021, 0.04, 32, loc=(-0.106, 0.0, ZI), axis="X", bm=cut)  # input shaft through the web
    C.boolean(o, C.obj("_cut", cut, ["case_alu"], smooth=False))
    parts = [o]
    rb = bmesh.new()
    # flange bolt ears at the bell face, split-flange bolt bosses, breather boss, ribs
    if HI():  # radial ribs cast on the bell's back web (seen through the open bell)
        for k in range(8):
            a = 2 * math.pi * (k + 0.5) / 8
            w = C.box((0.008, 0.004, 0.036), loc=(0, 0, 0))
            C.xform(w, rot=Matrix.Rotation(a - math.pi / 2, 3, "X"), loc=(-0.097, 0.058 * math.cos(a), ZI + 0.058 * math.sin(a)))
            C.merge(rb, w)
    for y, z in (ring[::2] if HI() else []):  # dowel / bolt bosses on the gearbox side of the face flange
        if z > 0.04:
            C.cyl(0.0085, 0.01, seg(16, 8), loc=(-0.019, y, z), axis="X", bm=rb)
    for y, z in perim_points(outer_clutch(XS + 0.006), seg(10, 6), 0.004):
        if z > DZ - 0.08:  # no lugs under the drum (the case stands on its drum)
            lug(rb, XS + 0.007, y, z, outer_clutch(XS + 0.006))
    for ang in (-0.95, -0.35, 0.3, 0.9, 1.6, 2.3, 2.85):  # cast gussets filling the bell's flare (in axial planes)
        d = Vector((math.cos(ang), math.sin(ang)))
        gx = [-0.013 - 0.1 * k / 12 for k in range(13)]
        chord = lambda x: lerp(bell_r(-0.013) + 0.003, 0.068, (x + 0.013) / -0.1)
        pts = [(x, bell_r(x) - 0.003) for x in gx] + [(x, max(bell_r(x) + 0.0035, chord(x))) for x in gx[::-1]]
        g = bmesh.new()
        t = 0.0045
        r0 = [g.verts.new((x, d.x * r - d.y * t / 2, ZI + d.y * r + d.x * t / 2)) for x, r in pts]
        r1 = [g.verts.new((x, d.x * r + d.y * t / 2, ZI + d.y * r - d.x * t / 2)) for x, r in pts]
        nn = len(pts)
        for i in range(nn):
            j = (i + 1) % nn
            g.faces.new((r0[i], r0[j], r1[j], r1[i]))
        g.faces.new(r0[::-1])
        g.faces.new(r1)
        C.merge(rb, g)
    C.cyl(0.012, 0.012, 16, loc=(-0.07, 0.03, ZI + bell_r(-0.07) - 0.004), axis="Z", bm=rb)  # breather boss
    # speed sensor boss above the diff
    C.cyl(0.011, 0.02, 16, loc=(-0.075, DY - 0.06, DZ + 0.095), axis="Z", bm=rb)
    parts.append(mk("_cr", rb, ["case_alu", "steel_dark"]))
    sb = bmesh.new()
    C.cyl(0.0085, 0.03, 16, loc=(-0.075, DY - 0.06, DZ + 0.118), axis="Z", bm=sb)
    C.merge(sb, C.box((0.018, 0.014, 0.012), loc=(-0.075, DY - 0.06, DZ + 0.138), bevel=0.002 if HI() else 0, segs=1))
    parts.append(mk("_sensor", sb, ["plastic_black"]))
    o = C.join(parts, "case_clutch")
    uv01(o)
    C.smooth_by_angle(o, 32)
    return o


def make_case_gear():
    n = seg(84, 32)
    xs = xs_between(XS, XE, seg(22, 12), extra=(XS - 0.012, XS - 0.016, -0.228, -0.244, -0.2615, -0.2625, -0.35, -0.385,
                                              XE + 0.012, XE + 0.008) + ((-0.186, -0.188, -0.19, -0.192, -0.194, -0.286,
                                              -0.288, -0.29, -0.292, -0.294) if HI() else ()))
    b = loft_x(xs, outer_gear, n)
    o = mk("case_gear", b, ["case_alu"], sharp=32, uv=False)
    cut = bmesh.new()
    def gc(x):
        c = [(0.0, ZI, 0.051), (OY, OZ, 0.065), (RLY, RLZ, 0.026)]
        if x > -0.219:
            c.append((DY, DZ, 0.111))
        return c
    loft_x([XS + 0.03, -0.18, -0.2185, -0.2195, -0.30, XE + 0.007], gc, n, bm=cut)
    C.cyl(0.028, 0.08, 32, loc=(-0.25, DY, DZ), axis="X", bm=cut)  # left drive-shaft hole
    for (cy, cz, r) in ((0.0, ZI, 0.024), (OY, OZ, 0.027)):
        C.cyl(r, 0.04, 32, loc=(XE, cy, cz), axis="X", bm=cut)
    C.boolean(o, C.obj("_cut", cut, ["case_alu"], smooth=False))
    parts = [o]
    rb = bmesh.new()
    for y, z in perim_points(outer_gear(XS - 0.006), seg(10, 6), 0.004):
        if z < DZ - 0.08:
            continue
        lug(rb, XS - 0.007, y, z, outer_gear(XS - 0.006))
        C.cyl(0.0068, 0.005, 6, loc=(XS - 0.0165, y, z), axis="X", bm=rb, mat=1)  # bolt heads
        if HI():
            C.cyl(0.0082, 0.0012, 16, loc=(XS - 0.0145, y, z), axis="X", bm=rb, mat=1)
    for y, z in perim_points(outer_gear(XE + 0.004), seg(8, 5), 0.003):
        C.cyl(0.0065, 0.012, seg(14, 8), loc=(XE + 0.006, y, z), axis="X", bm=rb)
    # selector housing turret on the +Y side (three -Z) above the rails
    sx = -0.262
    C.merge(rb, C.box((0.07, 0.05, 0.06), loc=(sx, RLY + 0.045, RLZ + 0.045), bevel=0.008 if HI() else 0, segs=2))
    C.cyl(0.02, 0.03, seg(24, 12), loc=(sx, RLY + 0.075, RLZ + 0.045), axis="Y", bm=rb)
    # mount ears: two cast lugs on top of the gear housing (drilled before the join: EXACT booleans need one shell)
    ears = mk("_ears", C.box((0.13, 0.014, 0.04), loc=(-0.265, 0.0, ZI + 0.086), bevel=0.004 if HI() else 0, segs=1),
              ["case_alu"])
    for x in (-0.20, -0.33):
        C.boolean(ears, C.obj("_e", C.box((0.03, 0.05, 0.05), loc=(x, 0.0, ZI + 0.075), bevel=0.006 if HI() else 0, segs=1),
                              ["case_alu"]), op="UNION")
    cut = bmesh.new()
    for x in (-0.20, -0.33):
        C.cyl(0.0065, 0.1, 16, loc=(x, 0.0, ZI + 0.08), axis="Y", bm=cut)
    C.boolean(ears, C.obj("_c", cut, ["case_alu"], smooth=False))
    parts.append(ears)
    # fill plug boss (side) + drain boss (bottom of the diff drum)
    C.cyl(0.013, 0.012, 16, loc=(-0.17, DY - 0.118 * 0.707 - 0.004, DZ - 0.02), axis="Y", bm=rb)
    parts.append(mk("_gr", rb, ["case_alu", "steel_dark"]))
    o = C.join(parts, "case_gear")
    uv01(o)
    C.smooth_by_angle(o, 32)
    return o


def make_end_cover():
    n = seg(72, 28)
    xs = xs_between(XE, XC_END, seg(14, 8), extra=(XE - 0.008, XE - 0.012))
    b = loft_x(xs, outer_cover, n)
    o = mk("end_cover", b, ["case_alu"], sharp=32, uv=False)
    cut = bmesh.new()
    loft_x(xs_between(XE + 0.01, XC_END + 0.005, 8), lambda x: outer_cover(min(x, XE - 0.02), 0.0055), n, bm=cut)
    C.boolean(o, C.obj("_c", cut, ["case_alu"], smooth=False))
    rb = bmesh.new()
    for y, z in perim_points(outer_cover(XE - 0.004), seg(8, 5), 0.003):
        C.cyl(0.0065, 0.012, seg(14, 8), loc=(XE - 0.006, y, z), axis="X", bm=rb)
        C.cyl(0.006, 0.005, 6, loc=(XE - 0.0145, y, z), axis="X", bm=rb, mat=1)
    parts = [o, mk("_ec", rb, ["case_alu", "steel_dark"])]
    o = C.join(parts, "end_cover")
    uv01(o)
    C.smooth_by_angle(o, 32)
    return o


# ── forks, selector, small parts ─────────────────────────────────────────────
def make_fork(name, cy, cz, xc, r_groove, rail_y, rail_z, rail_x0, rail_x1):
    b = bmesh.new()
    to_rail = math.atan2(rail_z - cz, rail_y - cy)
    t = 0.006
    # yoke: half ring riding in the groove, centred on the rail side
    lathe_x([(r_groove - 0.0015, xc - t / 2), (r_groove + 0.009, xc - t / 2), (r_groove + 0.009, xc + t / 2),
             (r_groove - 0.0015, xc + t / 2), (r_groove - 0.0015, xc - t / 2)], seg(28, 12), cy, cz, bm=b, mat=0,
            angle=math.radians(170), ofs=to_rail - math.radians(85))
    # arm to the rail boss
    d = Vector((math.cos(to_rail), math.sin(to_rail)))
    p0 = Vector((cy, cz)) + d * (r_groove + 0.006)
    p1 = Vector((rail_y, rail_z))
    L = (p1 - p0).length
    mid = (p0 + p1) / 2
    arm = C.box((0.012, 0.012, L + 0.004), loc=(0, 0, 0), bevel=0.002 if HI() else 0, segs=1)
    C.xform(arm, rot=Matrix.Rotation(to_rail - math.pi / 2, 3, "X"), loc=(xc, mid.x, mid.y))
    C.merge(b, arm)
    C.cyl(0.011, 0.024, seg(20, 10), loc=(xc, rail_y, rail_z), axis="X", bm=b, mat=0)
    # bronze pads at the yoke tips
    for s in (-1, 1):
        a = to_rail + s * math.radians(85)
        C.merge(b, C.box((0.009, 0.006, 0.006), loc=(xc, cy + (r_groove + 0.001) * math.cos(a), cz + (r_groove + 0.001) * math.sin(a)), mat=1))
    # rail
    C.cyl(0.0075, abs(rail_x1 - rail_x0), seg(16, 8), loc=((rail_x0 + rail_x1) / 2, rail_y, rail_z), axis="X", bm=b, mat=2)
    return mk(name, b, ["fork_steel", "bronze", "shaft_steel"], sharp=40)


def make_selector():
    b = bmesh.new()
    sx = -0.262
    y0 = RLY + 0.02
    C.cyl(0.009, 0.10, seg(16, 8), loc=(sx, y0 + 0.05, RLZ + 0.045), axis="Y", bm=b, mat=0)
    # finger inside + two external levers with ball ends
    C.merge(b, C.box((0.012, 0.012, 0.03), loc=(sx, y0, RLZ + 0.03), mat=0))
    for dz, L in ((1, 0.07), (-1, 0.05)):
        yy = y0 + 0.098 + (0.012 if dz < 0 else 0)
        C.merge(b, C.box((0.012, 0.006, L), loc=(sx, yy, RLZ + 0.045 + dz * L / 2), bevel=0.002 if HI() else 0, segs=1))
        s = bmesh.new()
        bmesh.ops.create_uvsphere(s, u_segments=seg(16, 8), v_segments=seg(10, 6), radius=0.0075)
        C.xform(s, loc=(sx, yy, RLZ + 0.045 + dz * L))
        C.merge(b, s)
    return mk("selector_shaft", b, ["shaft_steel"], sharp=40)


def make_plug(name, loc, axis, head=0.012, hexa=True):
    b = bmesh.new()
    C.cyl(head * 0.9, 0.012, 6 if hexa else seg(20, 10), axis=axis, bm=b)
    C.cyl(head * 1.1, 0.0025, seg(20, 10), loc=(0, 0, 0), axis=axis, bm=b, mat=1)
    o = mk(name, b, ["steel_dark", "alu_machined"], sharp=40)
    o.location = loc
    return o


def make_breather():
    b = bmesh.new()
    C.cyl(0.005, 0.02, 12, loc=(0, 0, 0.01), bm=b, mat=1)
    C.cyl(0.011, 0.014, seg(20, 10), loc=(0, 0, 0.026), bm=b, mat=0, bevel=0.003 if HI() else 0)
    o = mk("breather", b, ["rubber", "steel_dark"], sharp=40)
    o.location = (-0.07, 0.03, ZI + bell_r(-0.07) + 0.002)
    return o


def make_release():
    b = bmesh.new()
    lathe_x([(0.0205, -0.012), (0.026, -0.012), (0.026, -0.085), (0.034, -0.088), (0.034, -0.095), (0.0205, -0.095),
             (0.0205, -0.012)], seg(40, 16), 0, ZI, bm=b, mat=1)  # guide tube + flange
    lathe_x([(0.027, -0.018), (0.037, -0.018), (0.039, -0.022), (0.039, -0.04), (0.027, -0.04), (0.027, -0.018)],
            seg(40, 16), 0, ZI, bm=b, mat=0)  # release bearing
    # release fork shaft across the bell + the fork fingers on the bearing
    C.cyl(0.0085, 0.25, seg(16, 8), loc=(-0.045, 0.0, ZI - 0.052), axis="Y", bm=b, mat=0)
    for sy in (-1, 1):
        f = C.box((0.008, 0.008, 0.05), loc=(-0.042, sy * 0.036, ZI - 0.03), bevel=0.002 if HI() else 0, segs=1)
        C.merge(b, f)
    C.merge(b, C.box((0.012, 0.08, 0.016), loc=(-0.045, 0.0, ZI - 0.052), bevel=0.003 if HI() else 0, segs=1))
    return mk("release_bearing", b, ["steel_dark", "alu_machined"], sharp=40)


# ── assembly ─────────────────────────────────────────────────────────────────
def build(q):
    global Q
    Q = q
    mats()
    root = C.empty("gearbox")
    case_c = make_case_clutch()
    case_g = make_case_gear()
    cover = make_end_cover()
    ish = make_input_shaft()
    osh = make_output_shaft()
    gears = {}
    spins = {}
    for p, (zi, zo, xc, w) in PAIRS.items():
        ri, ro = pitch_r(p, "in"), pitch_r(p, "out")
        oi = gear_ofs(zi, ANG_IO, tooth=True)
        oo = gear_ofs(zo, ANG_IO + math.pi, tooth=False)
        free_in = p in ("3", "4")
        free_out = p in ("1", "2", "5")
        dog_in = {"3": -1, "4": 1}.get(p)
        dog_out = {"1": -1, "2": 1, "5": -1}.get(p)
        gi = make_gear(f"gear_{p}_in", zi, ri, xc, w, 0.0, ZI, oi, 1, 0.0185 if not free_in else 0.0195, dog=dog_in,
                       web=free_in)
        go = make_gear(f"gear_{p}_out", zo, ro, xc, w, OY, OZ, oo, -1, 0.0195 if not free_out else 0.0205, dog=dog_out)
        gears[gi.name], gears[go.name] = gi, go
        # angular speeds relative to the input shaft (3rd engaged)
        wi = 1.0 if not free_in else (1.0 if p == "3" else -W_OUT * zo / zi)
        wo = W_OUT if not free_out else -1.0 * zi / zo
        spins[gi.name], spins[go.name] = wi, wo
    # reverse: input gear (11), idler (19, slid out of mesh), teeth on the 1-2 sleeve (37)
    m_r = 2 * A1 / (11 + 38)
    r_ri, r_id, r_ro = 11 * m_r / 2, 19 * m_r / 2, 33 * m_r / 2
    x_rev_in = X_REV + 0.0
    grev = make_gear("gear_rev_in", 11, r_ri, X_REV, 0.011, 0.0, ZI, 0.0, 0, 0.0185, web=False)
    # idler centre: intersection of circles around input (r_ri + r_id) and output (r_id + r_ro), on the +y side
    P0, P1 = Vector((0.0, ZI)), Vector((OY, OZ))
    d0, d1 = r_ri + r_id, r_id + r_ro
    D = (P1 - P0).length
    a = (d0 * d0 - d1 * d1 + D * D) / (2 * D)
    h = math.sqrt(max(0, d0 * d0 - a * a))
    mid = P0 + (P1 - P0) * (a / D)
    perp = Vector((-(P1 - P0).y, (P1 - P0).x)) / D
    cands = [mid + perp * h, mid - perp * h]
    RI = max(cands, key=lambda v: v.x)
    idl = make_gear("reverse_idler", 19, r_id, X_REV - 0.012, 0.012, RI.x, RI.y, 0.0, 0, 0.0085, web=False)
    rsb = bmesh.new()
    C.cyl(0.0085, 0.11, seg(16, 8), loc=(-0.215, RI.x, RI.y), axis="X", bm=rsb)
    rshaft = mk("reverse_shaft", rsb, ["shaft_steel"])
    # final drive pinion on the output shaft
    zp = 17
    ang_od = math.atan2(DZ - OZ, DY - OY)
    fp = make_gear("final_pinion", zp, A2 * zp / (66 + zp), X_RING, 0.026, OY, OZ, gear_ofs(zp, ang_od, tooth=True), 1,
                   0.0195, web=False)
    # synchros
    h34, s34 = make_sync("sync_34", 0.0, ZI, X_SYNC["34"], 0.043, 0.0185)
    h12, s12 = make_sync("sync_12", OY, OZ, X_SYNC["12"], 0.044, 0.0195, rev_teeth=(33, r_ro))
    h5, s5 = make_sync("sync_5", OY, OZ, X_SYNC["5"], 0.041, 0.0195)
    diff = make_diff()
    forks = [
        make_fork("fork_34", 0.0, ZI, X_SYNC["34"], 0.043 - 0.0045, 0.052, ZI - 0.045, -0.13, -0.385),
        make_fork("fork_12", OY, OZ, X_SYNC["12"], r_ro - 0.012, 0.064, ZI - 0.066, -0.13, -0.385),
        make_fork("fork_5", OY, OZ, X_SYNC["5"], 0.041 - 0.0045, 0.046, ZI - 0.078, -0.30, -0.455),
    ]
    sel = make_selector()
    drain = make_plug("drain_plug", (-0.2385, DY, DZ - 0.07), "X")
    fill = make_plug("fill_plug", (-0.17, DY - 0.118 * 0.707 - 0.012, DZ - 0.02), "Y")
    breather = make_breather()
    rel = make_release()
    allparts = [case_c, case_g, cover, ish, osh, grev, idl, rshaft, fp, h34, s34, h12, s12, h5, s5, sel, drain, fill,
                breather, rel] + list(gears.values()) + list(diff.values()) + forks
    for o in allparts:  # UVs only where a material samples a texture (box-projection seams split vertices)
        textured = any(m and m.node_tree and any(n.type == "TEX_IMAGE" for n in m.node_tree.nodes) for m in o.data.materials)
        if not textured:
            while o.data.uv_layers:
                o.data.uv_layers.remove(o.data.uv_layers[0])
    bpy.context.view_layer.update()
    C.bake_ao_vcol(allparts, samples=48 if HI() else 16, max_dist=0.03, floor=0.3)
    if not HI():  # lo: AO vertex colours only on the castings (the budget goes to geometry)
        for o in allparts:
            if o.name not in ("case_clutch", "case_gear", "end_cover", "diff_case") and o.data.color_attributes.get("Color"):
                o.data.color_attributes.remove(o.data.color_attributes["Color"])

    def piv(o, p):
        p = Vector(p)
        o.data.transform(Matrix.Translation(-p))
        o.location = p

    # pivots: every rotating part on its axis (x at its own centre so explode offsets read naturally)
    def cx(o):
        return sum((Vector(v) for v in o.bound_box), Vector()).x / 8

    for o in [ish, h34, s34, grev] + [gears[f"gear_{p}_in"] for p in PAIRS]:
        piv(o, (cx(o), 0.0, ZI))
    for o in [osh, fp, h12, s12, h5, s5] + [gears[f"gear_{p}_out"] for p in PAIRS]:
        piv(o, (cx(o), OY, OZ))
    piv(idl, (cx(idl), RI.x, RI.y))
    xm = -0.150
    dnode = C.empty("diff", root, loc=(xm, DY, DZ))
    for k, o in diff.items():
        if not k.startswith("planet"):
            piv(o, (cx(o), DY, DZ))
    for i, s in enumerate((1, -1)):
        piv(diff[f"planet_{i + 1}"], (xm, DY, DZ + s * 0.042))
    for o in [case_c, case_g, cover, rshaft, rel] + forks:
        c = sum((Vector(v) for v in o.bound_box), Vector()) / 8
        piv(o, c)
    piv(sel, (-0.262, RLY + 0.07, RLZ + 0.045))
    bpy.context.view_layer.update()
    for o in allparts:
        if o.parent is None:
            o.parent = root
    for o in diff.values():
        o.parent = dnode
        o.location = o.location - dnode.location
    # fixed members ride on their shaft
    for o in [grev, h34, s34, gears["gear_1_in"], gears["gear_2_in"], gears["gear_5_in"]]:
        o.parent = ish
        o.location = o.location - ish.location
    for o in [fp, h12, s12, h5, s5, gears["gear_3_out"], gears["gear_4_out"]]:
        o.parent = osh
        o.location = o.location - osh.location
    bpy.context.view_layer.update()
    # spin contract (three space axis: local X for everything on a shaft)
    C.set_spin(ish, (1, 0, 0), 1.0)
    C.set_spin(osh, (1, 0, 0), W_OUT)
    for nme in ("gear_3_in", "gear_4_in", "gear_1_out", "gear_2_out", "gear_5_out"):
        C.set_spin(gears[nme], (1, 0, 0), round(spins[nme], 5))
    C.set_spin(idl, (1, 0, 0), 0.0)
    C.set_spin(dnode, (1, 0, 0), round(-W_OUT * 17 / 66, 5))
    # explode (three space: x = X, y = up, z = -Blender y)
    def sp(o, base, k=0.9):
        x = o.matrix_world.translation.x
        return (base[0] + (x - (-0.27)) * k, base[1], base[2])
    C.set_explode(case_c, (0.26, 0, 0))
    C.set_explode(case_g, (-0.16, 0.0, -0.34))
    C.set_explode(cover, (-0.34, 0.0, -0.34))
    C.set_explode(ish, (0.0, 0.26, 0.0))
    C.set_explode(osh, (0.0, 0.10, 0.20))
    for nme in ("gear_3_in", "gear_4_in"):
        C.set_explode(gears[nme], sp(gears[nme], (0.0, 0.26, 0.0)))
    for nme in ("gear_1_out", "gear_2_out", "gear_5_out"):
        C.set_explode(gears[nme], sp(gears[nme], (0.0, 0.10, 0.20)))
    for o in [grev, h34, s34, gears["gear_1_in"], gears["gear_2_in"], gears["gear_5_in"]]:
        C.set_explode(o, ((o.matrix_world.translation.x + 0.27) * 0.9, 0, 0))
    for o in [fp, h12, s12, h5, s5, gears["gear_3_out"], gears["gear_4_out"]]:
        C.set_explode(o, ((o.matrix_world.translation.x + 0.27) * 0.9, 0, 0))
    C.set_explode(idl, (0.0, 0.18, -0.16))
    C.set_explode(rshaft, (0.0, 0.18, -0.16))
    C.set_explode(dnode, (0.0, -0.06, 0.36))
    C.set_explode(diff["flange_L"], (-0.12, 0, 0))
    C.set_explode(diff["flange_R"], (0.14, 0, 0))
    C.set_explode(diff["ring_gear"], (0.07, 0, 0))
    C.set_explode(diff["side_gear_L"], (-0.06, 0, 0))
    C.set_explode(diff["side_gear_R"], (0.06, 0, 0))
    C.set_explode(diff["cross_pin"], (0, 0.09, 0))
    C.set_explode(diff["planet_1"], (0, 0.045, 0))
    C.set_explode(diff["planet_2"], (0, -0.045, 0))
    for i, f in enumerate(forks):
        C.set_explode(f, (0.0, 0.40 + 0.05 * i, -0.18))
    C.set_explode(sel, (0.0, 0.16, -0.40))
    C.set_explode(drain, (-0.08, 0, 0))
    C.set_explode(fill, (0, 0, 0.1))
    C.set_explode(breather, (0.1, 0.12, 0))
    C.set_explode(rel, (0.34, 0.0, 0.0))
    for o in [root] + list(root.children_recursive):  # keep explode(1) within ~1.6x the assembled size
        if "explode" in o.keys():
            o["explode"] = [round(v * 0.6, 4) for v in o["explode"]]
    return root


if __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    C.reset()
    root = build(q)
    if a.get("look"):
        H = os.path.join(C.HERE, "..", "public/lib3d/env/")
        hide = [o for o in bpy.data.objects if o.name in a.get("hide", "").split(",")]
        if a.get("only"):
            keep = set(a["only"].split(","))
            hide = [o for o in bpy.data.objects if o.type == "MESH" and o.name not in keep]
        cams = {"q3": (0.55, -0.9, 0.55), "back": (-0.2, 1.0, 0.5), "face": (0.9, -0.3, 0.35), "end": (-1.0, -0.5, 0.45),
                "top": (-0.2, -0.1, 1.2), "low": (0.3, -0.9, 0.08), "gears": (-0.12, -0.42, 0.42)}
        for v in a.get("views", "q3").split(","):
            tg = (-0.27, -0.03, 0.22) if v == "gears" else (-0.22, -0.02, 0.2)
            C.look(a["look"].replace(".png", f"_{v}.png"), target=tg, cam=cams[v], fov=34,
                   hdr=H + a.get("env", "studio") + "-1k-v1.hdr", ground=True, spp=int(a.get("spp", "24")), res=(900, 600), hide=hide)
    if a.get("tris"):
        for o in sorted(root.children_recursive, key=lambda o: -C.ntris([o]))[:25]:
            print("TRIS", o.name, C.ntris([o]))
    if a.get("out") or not a.get("look"):
        C.finish("gearbox", q, root, a.get("out"), pivots=True)
