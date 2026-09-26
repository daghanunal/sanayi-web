"""Inline-4 engine: modern 1.6 L DOHC 16-valve petrol, unbranded, every major part a separate node.

  Blender -b --factory-startup --python assets3d/build_engine.py -- --q hi [--out x.glb] [--look /tmp/e.png]

three.js space: crank axis along X, timing belt at +X, intake side at -Z, exhaust side at +Z, +Y up.
Origin: bottom of the oil pan, centred (the engine stands on y = 0). Real scale (m).

Kinematics (bore 78 mm, stroke 83.6 mm -> 1598 cc; conrod 140 mm; firing order 1-3-4-2; cyl 1 at +X):
  crank axis at y = CRANK_Y (0.160). crankshaft.rotation.x = theta (rest pose theta = 0: pins 1+4 at TDC).
  pin phase phi_i = [0, pi, pi, 0] for cylinders 1..4;  a = theta + phi_i;  r = 0.0418, L = 0.140
  piston_i.position.y = CRANK_Y + r*cos(a) + sqrt(L^2 - (r*sin(a))^2)
  conrod_i.rotation.x = -asin(r*sin(a) / L)   (conrod_i is a child of piston_i, pivot on the wrist pin)
  camshaft_intake / camshaft_exhaust .rotation.x = theta / 2 (the cam pulleys are their children).
Every part carries extras.explode = [x, y, z] (three space, metres).
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

CRANK_Y = 0.160  # crank axis height (Blender z)
R_CR = 0.0418  # crank throw (stroke / 2)
L_ROD = 0.140
BORE = 0.078
PITCH = 0.088
XC = [0.132, 0.044, -0.044, -0.132]  # cylinder 1..4 (cyl 1 at the timing end, +X)
PHASE = [0.0, math.pi, math.pi, 0.0]
DECK = 0.370
HEAD_TOP = 0.490
CAM_Z = 0.462
CAM_Y = 0.056
BELT_X = 0.226
Q = "hi"


def HI():
    return Q == "hi"


def seg(n_hi, n_lo):
    return n_hi if HI() else n_lo


# ── materials ────────────────────────────────────────────────────────────────
def engine_mats():
    n = 512 if HI() else 256
    us = 0.72 / 0.22  # UVs normalised over a 0.72 m box -> 22 cm texture tile
    a, o, nn = T.cast_alu(n, seed=31, lum=0.50, rough=0.46)
    a = 0.5 + (a - a.mean()) * 0.45  # calmer casting mottling (reads as stucco at full contrast)
    C.material("alu_cast", (1, 1, 1), albedo=C.image("e_alu_alb", a), orm=C.image("e_alu_orm", o, False),
               normal=(C.image("e_alu_n", nn, False) if HI() else None), normal_strength=0.25, vcol=True,
               uv_scale=(us * 1.8, us * 1.8))
    a2, o2, n2 = T.brushed(n, seed=32, lum=0.62, rough=0.24)
    C.material("steel_machined", (1, 1, 1), albedo=C.image("e_brush_alb", a2), orm=C.image("e_brush_orm", o2, False),
               normal=(C.image("e_brush_n", n2, False) if HI() else None), normal_strength=0.5, vcol=True, uv_scale=(us * 2, us * 2))
    C.material("steel_forged", C.srgb("#4d4f52"), 0.46, 1.0, vcol=True)
    C.material("piston_alu", C.srgb("#b9bcbf"), 0.34, 1.0, vcol=True)
    C.material("piston_crown", C.srgb("#3a3633"), 0.62, 0.55, vcol=True)
    C.material("bore", C.srgb("#6f7276"), 0.30, 1.0, vcol=True)
    C.material("gasket", C.srgb("#55585c"), 0.38, 0.9, vcol=True)
    pa, po, pn = T.textured_plastic(n, seed=33, lum=0.020, rough=0.5, grain=1.2)
    C.material("valve_cover", (1, 1, 1), albedo=C.image("e_vc_alb", pa), orm=C.image("e_vc_orm", po, False),
               normal=(C.image("e_vc_n", pn, False) if HI() else None), normal_strength=0.35, vcol=True, uv_scale=(us * 2, us * 2))
    ma, mo, mn = T.textured_plastic(n, seed=34, lum=0.030, rough=0.62, grain=1.0)
    C.material("plastic_black", (1, 1, 1), albedo=C.image("e_pl_alb", ma), orm=C.image("e_pl_orm", mo, False),
               normal=(C.image("e_pl_n", mn, False) if HI() else None), normal_strength=0.5, vcol=True, uv_scale=(us, us))
    C.material("plastic_gloss", C.srgb("#141416"), 0.32, 0.0, vcol=True)
    C.material("rubber_belt", C.srgb("#151516"), 0.78, 0.0, vcol=True)
    C.material("pulley_steel", C.srgb("#a4a7ab"), 0.28, 1.0, vcol=True)
    C.material("steel_dark", C.srgb("#2c2e31"), 0.42, 0.9, vcol=True)
    ha, ho, hn = T.heat_steel(256, seed=35, rough=0.36)
    C.material("exhaust_steel", (1, 1, 1), albedo=C.image("e_heat_alb", ha), orm=C.image("e_heat_orm", ho, False),
               normal=(C.image("e_heat_n", hn, False) if HI() else None), normal_strength=0.4, vcol=True, uv_scale=(2.2, 1))
    C.material("filter_paint", C.srgb("#1c3764"), 0.28, 0.2, coat=1.0, coat_rough=0.05, vcol=True)
    C.material("black_paint", C.srgb("#101012"), 0.4, 0.3, vcol=True)
    C.material("yellow", C.srgb("#e0a80c"), 0.4, 0.0, vcol=True)
    C.material("copper", C.srgb("#b8643a"), 0.3, 1.0, vcol=True)


# ── UVs: engine-box projection normalised to [0,1] (quantizable) ─────────────
def uv_eng(ob):
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
            x, y, z = p.x + 0.36, p.y + 0.36, p.z + 0.05
            if ax == 0:
                u, v = y, z
            elif ax == 1:
                u, v = x, z
            else:
                u, v = x, y
            lp[uvl].uv = (min(max(u / 0.72, 0), 1), min(max(v / 0.72, 0), 1))
    bm.to_mesh(me)
    bm.free()
    return ob


def mk(name, bm, mats, sharp=35, uv=True, recalc=True, smooth=True):
    o = C.obj(name, bm, mats, sharp=sharp, recalc=recalc, smooth=smooth)
    if uv:
        uv_eng(o)
    return o


def prism_x(poly, x0, x1, bm=None, mat=0):
    """extrude a closed (y, z) polygon along X from x0 to x1 (with n-gon caps)"""
    b = bmesh.new()
    r0 = [b.verts.new((x0, y, z)) for y, z in poly]
    r1 = [b.verts.new((x1, y, z)) for y, z in poly]
    n = len(poly)
    for i in range(n):
        j = (i + 1) % n
        b.faces.new((r0[i], r0[j], r1[j], r1[i]))
    b.faces.new(r0[::-1])
    b.faces.new(r1)
    for f in b.faces:
        f.material_index = mat
    if bm is None:
        return b
    C.merge(bm, b)
    return bm


def gear_poly(n, r_root, r_tip, cy=0.0, cz=0.0, per=4, ofs=0.0):
    pts = []
    for k in range(n):
        for j, (fa, rr) in enumerate(((0.0, r_root), (0.18, r_tip), (0.5, r_tip), (0.68, r_root))[:per]):
            a = 2 * math.pi * (k + fa) / n + ofs
            pts.append((cy + rr * math.cos(a), cz + rr * math.sin(a)))
    return pts


def ring_x(r_in, r_out, x0, x1, segs, bm=None, mat=0):
    """annulus (tube wall) along X"""
    prof = [(r_in, x0), (r_out, x0), (r_out, x1), (r_in, x1), (r_in, x0)]
    b = C.lathe(prof, segs, axis="X")
    for f in b.faces:
        f.material_index = mat
    if bm is None:
        return b
    C.merge(bm, b)
    return bm


def set_pivot(ob, p):
    p = Vector(p)
    ob.data.transform(Matrix.Translation(-p))
    ob.location = p
    return ob



def rrect(hx, hy, rc, n, cx=0.0, cy=0.0):
    """rounded rectangle (x, y) points CCW, n points per corner"""
    rc = min(rc, hx * 0.99, hy * 0.99)
    pts = []
    for k, (sx, sy, a0) in enumerate(((1, 1, 0.0), (-1, 1, 0.5 * math.pi), (-1, -1, math.pi), (1, -1, 1.5 * math.pi))):
        ox, oy = cx + sx * (hx - rc), cy + sy * (hy - rc)
        for j in range(n):
            a = a0 + 0.5 * math.pi * j / (n - 1)
            pts.append((ox + rc * math.cos(a), oy + rc * math.sin(a)))
    return pts


def loft_z(sections, n=6, cap0=True, cap1=True, bm=None, mat=0):
    """loft rounded rectangles stacked in z: sections = [(z, hx, hy, rc, cx, cy), ...]"""
    b = bmesh.new()
    rings = []
    for z, hx, hy, rc, cx, cy in sections:
        rings.append([b.verts.new((x, y, z)) for x, y in rrect(hx, hy, rc, n, cx, cy)])
    m = len(rings[0])
    for ra, rb in zip(rings, rings[1:]):
        for i in range(m):
            j = (i + 1) % m
            b.faces.new((ra[i], ra[j], rb[j], rb[i]))
    if cap0:
        b.faces.new(rings[0][::-1])
    if cap1:
        b.faces.new(rings[-1])
    for f in b.faces:
        f.material_index = mat
    if bm is None:
        return b
    C.merge(bm, b)
    return bm


def capsule_z(r, z0, z1, segs, loc=(0, 0), scale_y=1.0, bm=None, mat=0):
    prof = [(0.0, z0 - r * 0.2)]
    for k in range(1, 5):
        a = -0.5 * math.pi + 0.5 * math.pi * k / 4
        prof.append((r * math.cos(a), z0 + r * 0.8 * math.sin(a) + r * 0.0))
    for k in range(1, 5):
        a = 0.5 * math.pi * k / 4
        prof.append((r * math.cos(a), z1 + r * 0.8 * math.sin(a)))
    prof[-1] = (0.0, prof[-1][1])
    b = C.lathe(prof, segs, axis="Z")
    bmesh.ops.remove_doubles(b, verts=b.verts, dist=1e-6)
    C.xform(b, scale=(1, scale_y, 1), loc=(loc[0], loc[1], 0))
    for f in b.faces:
        f.material_index = mat
    if bm is None:
        return b
    C.merge(bm, b)
    return bm


def clip_poly(poly, z0, keep_above):
    """Sutherland-Hodgman clip of a (y, z) polygon by the line z = z0"""
    out = []
    n = len(poly)
    ins = lambda p: (p[1] >= z0) if keep_above else (p[1] <= z0)
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        if ins(a):
            out.append(a)
        if ins(a) != ins(b):
            t = (z0 - a[1]) / (b[1] - a[1])
            out.append((a[0] + (b[0] - a[0]) * t, z0))
    return out


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


# ── crankshaft ───────────────────────────────────────────────────────────────
def web_poly(phase, n=56):
    """crank web + counterweight outline around the crank axis (y, z), pin at angle `phase` from +z"""
    a_pin = 0.028
    pts = []
    for k in range(n):
        psi = 2 * math.pi * k / n
        s = math.sin(psi)
        lobe = 0.0
        if abs(R_CR * s) < a_pin and math.cos(psi) > -0.2:
            lobe = R_CR * math.cos(psi) + math.sqrt(a_pin ** 2 - (R_CR * s) ** 2)
        d = abs(((psi - math.pi) + math.pi) % (2 * math.pi) - math.pi)  # distance from the counterweight centre
        cw = 0.071 if d < 0.95 else (0.071 - (0.071 - 0.028) * min(1, (d - 0.95) / 0.45) ** 1.5)
        R = max(lobe, cw, 0.027)
        a = psi + phase
        pts.append((R * math.sin(a), CRANK_Y + R * math.cos(a)))
    return pts


def make_crank():
    bm = bmesh.new()
    segs = seg(40, 16)
    # main journals
    for xj in (0.176, 0.088, 0.0, -0.088, -0.176):
        C.cyl(0.025, 0.034, segs, loc=(xj, 0, CRANK_Y), axis="X", bm=bm, mat=1)
    for i, xc in enumerate(XC):
        ph = PHASE[i]
        py, pz = R_CR * math.sin(ph), CRANK_Y + R_CR * math.cos(ph)
        C.cyl(0.0215, 0.024, segs, loc=(xc, py, pz), axis="X", bm=bm, mat=1)
        for sgn in (1, -1):
            x0 = xc + sgn * 0.012
            x1 = xc + sgn * 0.027
            prism_x(web_poly(ph, seg(40, 20)), min(x0, x1), max(x0, x1), bm=bm, mat=0)
    # nose (timing end): snout, and the tail flange
    C.cyl(0.019, 0.07, segs, loc=(0.228, 0, CRANK_Y), axis="X", bm=bm, mat=1)
    C.cyl(0.045, 0.016, segs, loc=(-0.201, 0, CRANK_Y), axis="X", bm=bm, mat=0)
    o = mk("crankshaft", bm, ["steel_forged", "steel_machined"], sharp=38)
    if HI():
        C.bevel_mod(o, width=0.0015, segs=1, angle=40)
    return o


def make_sprocket(name, n_teeth, r, x, cy, cz, width=0.024, mat="pulley_steel", hub_r=None, holes=0):
    bm = bmesh.new()
    if HI():
        prism_x(gear_poly(n_teeth, r - 0.004, r, cy, cz), x - width / 2, x + width / 2, bm=bm)
    else:
        C.cyl(r - 0.002, width, 24, loc=(x, cy, cz), axis="X", bm=bm)
    C.cyl(r + 0.004, 0.002, seg(48, 20), loc=(x - width / 2 - 0.001, cy, cz), axis="X", bm=bm)  # inner flange
    if hub_r:
        C.cyl(hub_r, width + 0.012, seg(24, 12), loc=(x, cy, cz), axis="X", bm=bm)
    o = mk(name, bm, [mat], sharp=35)
    if holes and HI():
        cut = bmesh.new()
        for k in range(holes):
            a = 2 * math.pi * (k + 0.5) / holes
            rr = (r + (hub_r or 0.02)) / 2 - 0.002
            C.cyl(0.011 * r / 0.053, 0.1, 20, loc=(x, cy + rr * math.cos(a), cz + rr * math.sin(a)), axis="X", bm=cut)
        C.boolean(o, C.obj("_h", cut, [mat], smooth=False))
        uv_eng(o)
    return o


def make_crank_pulley():
    """accessory pulley with poly-V grooves + damper ring, outboard of the timing sprocket"""
    x0 = 0.244
    prof = [(0.018, x0)]
    r = 0.068
    prof.append((0.03, x0))
    prof.append((0.052, x0 + 0.004))
    prof.append((r - 0.004, x0 + 0.004))
    nx = 6
    for k in range(nx):
        xa = x0 + 0.006 + k * 0.0036
        prof += [(r, xa), (r - 0.0025, xa + 0.0018)]
    prof += [(r, x0 + 0.03), (r - 0.003, x0 + 0.034), (0.03, x0 + 0.034), (0.018, x0 + 0.03)]
    prof.append(prof[0])
    b = C.lathe(prof, seg(64, 28), axis="X")
    C.xform(b, loc=(0, 0, CRANK_Y))
    C.cyl(0.012, 0.004, 12, loc=(x0 + 0.036, 0, CRANK_Y), axis="X", bm=b)  # bolt head
    return mk("crank_pulley", b, ["pulley_steel"], sharp=40)


def make_flywheel():
    x = -0.222
    prof = [(0.03, x + 0.01), (0.135, x + 0.01), (0.139, x + 0.006), (0.139, x - 0.012), (0.12, x - 0.012),
            (0.12, x - 0.004), (0.06, x - 0.004), (0.045, x + 0.004), (0.03, x + 0.004), (0.03, x + 0.01)]
    b = C.lathe(prof[::-1], seg(72, 32), axis="X")
    C.xform(b, loc=(0, 0, CRANK_Y))
    if HI():  # ring gear teeth
        prism_x(gear_poly(120, 0.139, 0.1445, 0, CRANK_Y), x - 0.012, x - 0.002, bm=b, mat=1)
    for k in range(6):
        a = 2 * math.pi * k / 6
        C.cyl(0.006, 0.004, 10, loc=(x + 0.011, 0.038 * math.cos(a), CRANK_Y + 0.038 * math.sin(a)), axis="X", bm=b, mat=1)
    return mk("flywheel", b, ["steel_machined", "steel_dark"], sharp=35)


# ── pistons + conrods ────────────────────────────────────────────────────────
def make_piston(i):
    r = BORE / 2 - 0.0004
    top = 0.028  # wrist pin -> crown
    bot = -0.026
    prof = [(0.0, top - 0.002), (r - 0.006, top - 0.0005), (r - 0.001, top), (r, top - 0.002)]
    # three ring grooves
    zz = top - 0.006
    for k in range(3):
        prof += [(r, zz), (r - 0.003, zz - 0.0003), (r - 0.003, zz - 0.0017), (r, zz - 0.002)]
        zz -= 0.0045
    prof += [(r, bot + 0.004), (r - 0.0015, bot), (r - 0.004, bot), (r - 0.004, top - 0.02), (0.0, top - 0.02)]
    b = C.lathe(prof, seg(40, 18), axis="Z", mat_idx=[1, 1, 1] + [0] * (len(prof) - 4))
    # wrist pin ends (visible through the skirt window)
    C.cyl(0.0105, 0.064, seg(20, 10), loc=(0, 0, 0), axis="X", bm=b, mat=2)
    o = mk(f"piston_{i + 1}", b, ["piston_alu", "piston_crown", "steel_machined"], sharp=40)
    return o


def make_conrod(i):
    b = bmesh.new()
    w = 0.021
    segs = seg(28, 12)
    ring_x(0.0105, 0.0175, -w / 2, w / 2, segs, bm=b)  # small end at the origin
    bz = -L_ROD
    ring_x(0.0222, 0.036, -w / 2, w / 2, seg(36, 16), bm=b)
    C.xform(b, loc=(0, 0, 0)) if False else None
    big = ring_x(0.0222, 0.036, -w / 2, w / 2, seg(36, 16))
    C.xform(big, loc=(0, 0, bz))
    # remove the first big ring (placed at 0) by rebuilding cleanly
    b = bmesh.new()
    ring_x(0.0105, 0.0175, -w / 2, w / 2, segs, bm=b)
    C.merge(b, big)
    # I-beam: flanges + web, tapering toward the small end
    top, bottom = -0.014, bz + 0.03
    if HI():
        for sy in (1, -1):
            fl = C.box((0.017, 0.005, top - bottom), loc=(0, 0, (top + bottom) / 2))
            for v in fl.verts:
                t = (v.co.z - bottom) / (top - bottom)
                v.co.y = sy * (0.0085 + 0.0055 * (1 - t)) + (v.co.y * 1.0)
            C.merge(b, fl)
        web = C.box((0.007, 0.018, top - bottom), loc=(0, 0, (top + bottom) / 2))
        C.merge(b, web)
    else:
        web = C.box((0.017, 0.022, top - bottom), loc=(0, 0, (top + bottom) / 2))
        C.merge(b, web)
    # cap bolts
    for sy in (1, -1):
        C.cyl(0.0055, 0.03, 10, loc=(0, sy * 0.028, bz - 0.022), axis="Z", bm=b, mat=1)
    o = mk(f"conrod_{i + 1}", b, ["steel_forged", "steel_dark"], sharp=40)
    return o


# ── block ────────────────────────────────────────────────────────────────────
BLOCK_PROF = [(0.118, 0.178), (0.127, 0.178), (0.129, 0.168), (0.16, 0.164), (0.21, 0.152), (0.26, 0.146),
              (0.33, 0.147), (DECK - 0.004, 0.150), (DECK, 0.1485)]


def block_hw(z):
    zs, ws = zip(*BLOCK_PROF)
    return float(np.interp(z, zs, ws))


def make_block():
    segs = seg(48, 20)
    nc = seg(6, 3)
    # rounded-corner loft: oil-pan rail lip, skirt flaring out toward the rail, straight bore section
    secs = [(z, 0.206 if z < 0.128 else 0.203, hw, 0.024 if z > 0.128 else 0.026, 0.0, 0.0) for z, hw in BLOCK_PROF]
    bm = loft_z(secs, n=nc)
    blk = mk("block", bm, ["alu_cast", "bore"], sharp=30, uv=False)
    if HI():
        C.bevel_mod(blk, width=0.003, segs=2, angle=40)
    # bores through into the crankcase, crankcase cavity from below
    cut = bmesh.new()
    for xc in XC:
        C.cyl(BORE / 2, 0.3, segs, loc=(xc, 0, DECK + 0.1), axis="Z", bm=cut, mat=1)
    if HI():
        C.merge(cut, C.box((0.38, 0.30, 0.13), loc=(0, 0, 0.118 + 0.06)))
    co = C.obj("_cut", cut, ["alu_cast", "bore"], smooth=False)
    C.boolean(blk, co, transfer=True)
    parts = [blk]
    if HI():
        # main bearing bulkheads with half-round saddles + bearing caps
        for xj in (0.176, 0.088, 0.0, -0.088, -0.176):
            pb = C.box((0.020, 0.29, 0.12), loc=(xj, 0, 0.19))
            p = mk("_bulk", pb, ["alu_cast"], uv=False)
            sad = C.obj("_sad", C.cyl(0.026, 0.03, 32, loc=(xj, 0, CRANK_Y), axis="X"), ["alu_cast"], smooth=False)
            C.boolean(p, sad)
            capb = C.box((0.022, 0.13, 0.03), loc=(xj, 0, CRANK_Y - 0.035), bevel=0.004, segs=1)
            cp = mk("_cap", capb, ["steel_dark"], uv=False)
            sad2 = C.obj("_sad", C.cyl(0.026, 0.03, 32, loc=(xj, 0, CRANK_Y), axis="X"), ["alu_cast"], smooth=False)
            C.boolean(cp, sad2)
            parts += [p, cp]
    rb = bmesh.new()
    # skirt ribs over the bulkheads, following the flare
    for xj in (0.176, 0.088, 0.0, -0.088, -0.176):
        for sy in (1, -1):
            rs = []
            for z in (0.13, 0.16, 0.19, 0.22, 0.25, 0.275):
                t = 0.011 * (1 - (z - 0.13) / 0.16) + 0.002
                rs.append((z, 0.0065, t / 2 + 0.002, 0.002, xj, sy * (block_hw(z) + t / 2 - 0.002)))
            loft_z(rs, n=2, bm=rb)
    # intake side: cast water-jacket bulges over each bore (valleys between the cylinders read as siamesed bores)
    for xc in XC:
        capsule_z(0.036, 0.262, 0.345, seg(20, 10), loc=(xc, block_hw(0.3) - 0.004), scale_y=0.30, bm=rb)
    # exhaust side: freeze plugs, mount bosses, knock sensor boss, oil filter housing boss
    for xc in (0.088, -0.0):
        C.cyl(0.017, 0.006, 20, loc=(xc - 0.044, -0.149, 0.305), axis="Y", bm=rb, mat=1)
    for x in (0.18, -0.18):
        C.merge(rb, C.box((0.05, 0.016, 0.07), loc=(x, -0.152, 0.27), bevel=0.006 if HI() else 0, segs=1))
    C.cyl(0.016, 0.012, 16, loc=(0.044, -0.150, 0.262), axis="Y", bm=rb)
    fh = C.cyl(0.044, 0.026, seg(32, 14), axis="Y")
    C.xform(fh, rot=Matrix.Rotation(math.radians(25), 3, "X"), loc=(-0.10, -0.160, 0.205))
    C.merge(rb, fh)
    # oil pump / front cover around the crank snout
    C.merge(rb, C.box((0.016, 0.26, 0.17), loc=(0.212, 0, 0.19), bevel=0.02 if HI() else 0.0, segs=2))
    # intake side mount boss (starter / alternator bracket)
    C.merge(rb, C.box((0.05, 0.02, 0.05), loc=(0.0, 0.158, 0.23), bevel=0.006 if HI() else 0, segs=1))
    ribs = mk("_ribs", rb, ["alu_cast", "steel_dark"])
    parts.append(ribs)
    # knock sensor (black puck + connector) on its boss
    kb = bmesh.new()
    C.cyl(0.015, 0.012, 16, loc=(0.044, -0.161, 0.262), axis="Y", bm=kb)
    C.merge(kb, C.box((0.012, 0.012, 0.02), loc=(0.044, -0.163, 0.282)))
    parts.append(mk("_knock", kb, ["plastic_gloss"]))
    # water pump housing on the front, belt driven
    wp = bmesh.new()
    C.cyl(0.04, 0.02, seg(32, 14), loc=(0.214, 0.072, 0.272), axis="X", bm=wp)
    parts.append(mk("_wp", wp, ["alu_cast"]))
    o = C.join(parts, "block")
    uv_eng(o)
    C.smooth_by_angle(o, 32)
    return o


def make_gasket():
    b = C.box((0.408, 0.298, 0.0022), loc=(0, 0, DECK + 0.0011))
    g = C.obj("head_gasket", b, ["gasket"], smooth=False)
    cut = bmesh.new()
    for xc in XC:
        C.cyl(BORE / 2 + 0.002, 0.02, seg(48, 20), loc=(xc, 0, DECK), bm=cut)
    for x in (-0.176, -0.088, 0.0, 0.088, 0.176):
        for sy in (1, -1):
            C.cyl(0.006, 0.02, 10, loc=(x, sy * 0.118, DECK), bm=cut)
    C.boolean(g, C.obj("_c", cut, ["gasket"], smooth=False))
    if not HI():
        uv_eng(g)
        return g
    # beads (the raised fire rings)
    rb = bmesh.new()
    for xc in XC:
        C.torus(BORE / 2 + 0.0045, 0.0012, seg(48, 20), 6, loc=(xc, 0, DECK + 0.0022), bm=rb)
    beads = C.obj("_b", rb, ["gasket"])
    o = C.join([g, beads], "head_gasket")
    uv_eng(o)
    return o


# ── head ─────────────────────────────────────────────────────────────────────
def make_head():
    z0, z1 = DECK + 0.0022, HEAD_TOP
    nc = seg(5, 3)
    secs = [(z0, 0.205, 0.149, 0.02, 0, 0), (z0 + 0.012, 0.205, 0.151, 0.02, 0, 0), (0.43, 0.205, 0.150, 0.02, 0, 0),
            (z1 - 0.012, 0.205, 0.146, 0.02, 0, 0), (z1, 0.203, 0.140, 0.018, 0, 0)]
    head = mk("head", loft_z(secs, n=nc), ["alu_cast"], uv=False)
    cut = bmesh.new()
    C.merge(cut, C.box((0.37, 0.23, 0.08), loc=(0, 0, 0.452 + 0.04)))  # cam tub
    for xc in XC:  # spark plug wells
        C.cyl(0.013, 0.12, 20, loc=(xc, 0, 0.44), bm=cut)
    for xc in XC:  # combustion chambers under the head
        C.cyl(BORE / 2 - 0.002, 0.012, seg(40, 16), loc=(xc, 0, z0), bm=cut)
    C.boolean(head, C.obj("_c", cut, ["alu_cast"], smooth=False))
    parts = [head]
    cb = bmesh.new()
    # cam tunnels: rounded humps running along both top edges + a bolt boss over every journal
    for sy in (1, -1):
        C.cyl(0.021, 0.40, seg(24, 12), loc=(0.0, sy * 0.128, 0.476), axis="X", bm=cb)
        for x in ((0.19, 0.088, 0.0, -0.088, -0.176) if HI() else ()):
            C.cyl(0.011, 0.05, 12, loc=(x, sy * 0.145, 0.462), axis="Z", bm=cb)
    # cam bearing caps (inside the tub)
    for sy in (1, -1):
        for x in (0.19, 0.088, 0.0, -0.088, -0.176):
            C.merge(cb, C.box((0.02, 0.05, 0.016), loc=(x, sy * CAM_Y, CAM_Z + 0.012), bevel=0.003 if HI() else 0, segs=1))
            C.merge(cb, C.box((0.024, 0.05, 0.012), loc=(x, sy * CAM_Y, CAM_Z - 0.012)))
    # exhaust port bosses flowing out of the head face (the header flanges bolt onto these)
    for xc in XC:
        C.merge(cb, C.box((0.058, 0.012, 0.046), loc=(xc, -0.153, 0.422), bevel=0.008 if HI() else 0, segs=2))
    # intake port face + thermostat housing at the flywheel end
    C.merge(cb, C.box((0.36, 0.012, 0.07), loc=(0, 0.154, 0.425), bevel=0.004 if HI() else 0, segs=1))
    C.merge(cb, C.cyl(0.02, 0.04, 20, loc=(-0.225, -0.05, 0.43), axis="X"))
    parts.append(mk("_caps", cb, ["alu_cast"]))
    if HI():
        vb = bmesh.new()
        for xc in XC:
            for dx in (-0.017, 0.017):
                for sy in (1, -1):
                    y = sy * CAM_Y
                    C.cyl(0.0125, 0.009, 16, loc=(xc + dx, y, CAM_Z - 0.028), bm=vb)  # bucket tappet
                    C.torus(0.011, 0.0018, 16, 5, loc=(xc + dx, y, CAM_Z - 0.036), bm=vb)
        parts.append(mk("_valves", vb, ["steel_machined"]))
    pt = bmesh.new()
    for xc in XC:
        C.cyl(0.0165, 0.04, 24 if HI() else 12, loc=(xc, 0, 0.47), bm=pt)
    parts.append(mk("_tubes", pt, ["alu_cast"]))
    o = C.join(parts, "head")
    uv_eng(o)
    C.smooth_by_angle(o, 32)
    return o


def lobe_poly(phase, n=40, base=0.0175, lift=0.0085):
    pts = []
    for k in range(n):
        psi = 2 * math.pi * k / n
        d = abs(((psi - phase) + math.pi) % (2 * math.pi) - math.pi)
        R = base + (lift * (0.5 + 0.5 * math.cos(math.pi * d / 1.25)) if d < 1.25 else 0.0)
        pts.append((R, psi))
    return pts


def make_cam(side):
    sy = 1 if side == "intake" else -1
    y = sy * CAM_Y
    bm = bmesh.new()
    C.cyl(0.0125, 0.42, seg(24, 12), loc=(0.005, y, CAM_Z), axis="X", bm=bm, mat=0)
    order_deg = {0: 0, 2: 90, 3: 180, 1: 270}  # firing order 1-3-4-2 (cam degrees)
    for i, xc in enumerate(XC):
        base_ph = math.radians(order_deg[i] + (0 if side == "intake" else 110))
        for dx in (-0.017, 0.017):
            poly = [(y + R * math.sin(p), CAM_Z + R * math.cos(p)) for R, p in lobe_poly(base_ph, seg(40, 20))]
            prism_x(poly, xc + dx - 0.0065, xc + dx + 0.0065, bm=bm, mat=0)
    for x in (0.19, 0.088, 0.0, -0.088, -0.176):  # journals (slightly larger, polished)
        C.cyl(0.0135, 0.016, seg(24, 12), loc=(x, y, CAM_Z), axis="X", bm=bm, mat=0)
    o = mk("camshaft_" + side, bm, ["steel_machined"], sharp=40)
    return o


VC_TOP = 0.556


def make_valve_cover():
    z0, z1 = HEAD_TOP, VC_TOP
    nc = seg(6, 3)
    # moulded shell: flange, walls sloping in, crowned top
    secs = [(z0, 0.203, 0.138, 0.02, 0, 0), (z0 + 0.008, 0.203, 0.138, 0.02, 0, 0), (z0 + 0.010, 0.199, 0.132, 0.02, 0, 0),
            (z1 - 0.022, 0.196, 0.124, 0.024, 0, 0), (z1 - 0.008, 0.192, 0.112, 0.03, 0, 0), (z1, 0.186, 0.094, 0.03, 0, 0)]
    vc = mk("valve_cover", loft_z(secs, n=nc), ["valve_cover"], uv=False)
    # raised centre spine carrying the coil wells
    sp = loft_z([(z1 - 0.01, 0.176, 0.046, 0.02, 0, 0), (z1 + 0.006, 0.172, 0.043, 0.018, 0, 0),
                 (z1 + 0.010, 0.168, 0.038, 0.016, 0, 0)], n=nc)
    spo = mk("_spine", sp, ["valve_cover"], uv=False)
    if HI():
        C.boolean(vc, spo, op="UNION")
    cut = bmesh.new()
    for xc in XC:
        C.cyl(0.0195, 0.2, 24, loc=(xc, 0, 0.55), bm=cut)
    C.boolean(vc, C.obj("_c", cut, ["valve_cover"], smooth=False))
    if not HI():  # lo: the spine is just joined on top (a boolean on the joined, non-manifold shell eats the cover)
        vc = C.join([vc, spo], "valve_cover")
    parts = [vc]
    rb = bmesh.new()
    # coil well rims
    for xc in XC:
        ring = C.lathe([(0.0195, z1 + 0.004), (0.026, z1 + 0.004), (0.026, z1 + 0.014), (0.0195, z1 + 0.014),
                        (0.0195, z1 + 0.004)], seg(28, 12), axis="Z")
        C.xform(ring, loc=(xc, 0, 0))
        C.merge(rb, ring)
    # baffle ribs moulded across the sloped sides
    for sy in ((1, -1) if HI() else ()):
        for x in (-0.15, -0.09, -0.03, 0.03, 0.09, 0.15):
            r = C.box((0.005, 0.03, 0.012), loc=(0, 0, 0))
            C.xform(r, rot=Matrix.Rotation(sy * math.radians(35), 3, "X"), loc=(x, sy * 0.108, z1 - 0.006))
            C.merge(rb, r)
    # perimeter bolts with washers
    for x in ((-0.19, -0.095, 0.0, 0.095, 0.19) if HI() else ()):
        for sy in (1, -1):
            C.cyl(0.0085, 0.002, 12, loc=(x, sy * 0.1325, z0 + 0.009), bm=rb, mat=1)
            C.cyl(0.0058, 0.0045, 6, loc=(x, sy * 0.1325, z0 + 0.012), bm=rb, mat=1)
    # oil filler cap with grip lobes
    cap = prism_x(gear_poly(12, 0.021, 0.025, 0, 0), -0.009, 0.009)
    C.xform(cap, rot=Matrix.Rotation(math.pi / 2, 3, "Y"), loc=(0.148, 0.082, z1 - 0.004))
    for f in cap.faces:
        f.material_index = 2
    C.merge(rb, cap)
    # PCV outlet elbow at the flywheel end + hose stub
    path = C.bezier_path([(-0.16, -0.06, z1 - 0.006), (-0.16, -0.06, z1 + 0.02), (-0.19, -0.06, z1 + 0.03),
                          (-0.235, -0.06, z1 + 0.025)], seg(5, 3))
    C.tube(path, 0.007, seg(10, 6), bm=rb, mat=2)
    parts.append(mk("_vcr", rb, ["valve_cover", "steel_dark", "plastic_gloss"]))
    o = C.join(parts, "valve_cover")
    uv_eng(o)
    C.smooth_by_angle(o, 40)
    return o


def make_coil(i):
    xc = XC[i]
    bm = bmesh.new()
    zt = VC_TOP + 0.014  # sits on the well rim
    C.cyl(0.0125, 0.10, seg(20, 10), loc=(xc, 0, zt - 0.045), bm=bm, mat=0)  # boot into the plug well
    C.merge(bm, C.box((0.034, 0.064, 0.026), loc=(xc, 0.006, zt + 0.013), bevel=0.006 if HI() else 0, segs=2, mat=0))
    C.merge(bm, C.box((0.022, 0.022, 0.018), loc=(xc, 0.044, zt + 0.015), bevel=0.003 if HI() else 0, segs=1, mat=1))
    C.merge(bm, C.box((0.012, 0.012, 0.012), loc=(xc, -0.030, zt + 0.006), mat=0))  # bolt ear
    return mk(f"coil_{i + 1}", bm, ["plastic_gloss", "plastic_black"], sharp=40)


# ── timing ───────────────────────────────────────────────────────────────────
PULLEYS = [  # (y, z, r) in belt order (CCW seen from +X): crank, tensioner, exhaust cam, intake cam, water pump
    (0.0, CRANK_Y, 0.027),
    (-0.072, 0.300, 0.027),
    (-CAM_Y - 0.010, CAM_Z, 0.053),
    (CAM_Y + 0.010, CAM_Z, 0.053),
    (0.072, 0.272, 0.033),
]


def belt_path(pulleys=None):
    P = [(Vector((y, z)), r) for y, z, r in (pulleys or PULLEYS)]
    # make sure the ordering is CCW (positive area)
    area = sum(P[i][0].x * P[(i + 1) % len(P)][0].y - P[(i + 1) % len(P)][0].x * P[i][0].y for i in range(len(P)))
    if area < 0:
        P = P[::-1]
    n = len(P)
    tang = []
    for i in range(n):
        (c1, r1), (c2, r2) = P[i], P[(i + 1) % n]
        d = c2 - c1
        L = d.length
        dh = d / L
        perp = Vector((dh.y, -dh.x))  # right of travel = outside for a CCW hull
        k = (r1 - r2) / L
        nrm = dh * k + perp * math.sqrt(max(0, 1 - k * k))
        tang.append((c1 + nrm * r1, c2 + nrm * r2, nrm))
    pts, nrms = [], []
    for i in range(n):
        c, r = P[i]
        n_in = tang[i - 1][2]
        n_out = tang[i][2]
        a0 = math.atan2(n_in.y, n_in.x)
        a1 = math.atan2(n_out.y, n_out.x)
        # CCW hull: the outward normal turns CCW around each pulley (angle increases)
        while a1 < a0:
            a1 += 2 * math.pi
        steps = max(2, int((a1 - a0) / 0.08))
        for s in range(steps + 1):
            a = a0 + (a1 - a0) * s / steps
            nv = Vector((math.cos(a), math.sin(a)))
            pts.append(c + nv * r)
            nrms.append(nv)
        # straight span to the next pulley
        p0, p1, nv = tang[i]
        L = (p1 - p0).length
        m = max(1, int(L / 0.03))
        for s in range(1, m):
            pts.append(p0 + (p1 - p0) * s / m)
            nrms.append(nv)
    return pts, nrms


def make_belt(name="timing_belt", pulleys=None, bx=BELT_X, w=0.023, t=0.0035, teeth=True):
    pts, nrms = belt_path(pulleys)
    bm = bmesh.new()
    BELT_X_ = bx
    x0, x1 = bx - w / 2, bx + w / 2
    rings = []
    for p, nv in zip(pts, nrms):
        pi, po = p, p + nv * t
        rings.append([bm.verts.new((x0, pi.x, pi.y)), bm.verts.new((x1, pi.x, pi.y)),
                      bm.verts.new((x1, po.x, po.y)), bm.verts.new((x0, po.x, po.y))])
    n = len(rings)
    for i in range(n):
        a, b = rings[i], rings[(i + 1) % n]
        for k in range(4):
            j = (k + 1) % 4
            try:
                bm.faces.new((a[k], a[j], b[j], b[k]))
            except ValueError:
                pass
    # teeth on the inside
    if HI() and teeth:
        acc = [0.0]
        for i in range(1, n):
            acc.append(acc[-1] + (pts[i] - pts[i - 1]).length)
        total = acc[-1] + (pts[0] - pts[-1]).length
        pitch = 0.0095
        k = 0
        s = 0.0
        idx = 0
        while s < total - pitch:
            while idx < n - 2 and acc[idx + 1] < s:
                idx += 1
            f = (s - acc[idx]) / max(1e-9, acc[idx + 1] - acc[idx])
            p = pts[idx].lerp(pts[idx + 1], f)
            nv = nrms[idx].lerp(nrms[idx + 1], f).normalized()
            tv = Vector((-nv.y, nv.x))
            tooth = C.box((w * 0.98, 0.0045, 0.0028))
            M = Matrix(((1, 0, 0), (0, tv.x, -nv.x), (0, tv.y, -nv.y)))
            for v in tooth.verts:
                lc = v.co.copy()
                wc = M @ lc
                v.co = Vector((BELT_X + wc.x, p.x + wc.y, p.y + wc.z)) - Vector((0, nv.x, nv.y)) * 0.0012
            C.merge(bm, tooth)
            s += pitch
    return mk(name, bm, ["rubber_belt"], sharp=40, recalc=False)


def make_tensioner():
    y, z, r = PULLEYS[1]
    bm = bmesh.new()
    prof = [(0.008, BELT_X - 0.013), (r - 0.002, BELT_X - 0.013), (r, BELT_X - 0.011), (r, BELT_X + 0.011),
            (r - 0.002, BELT_X + 0.013), (0.008, BELT_X + 0.013), (0.008, BELT_X - 0.013)]
    b = C.lathe(prof, seg(40, 16), axis="X")
    C.xform(b, loc=(0, y, z))
    C.merge(bm, b)
    arm = C.box((0.01, 0.022, 0.07), loc=(BELT_X - 0.018, y + 0.012, z - 0.03), bevel=0.004 if HI() else 0, segs=1)
    C.merge(bm, arm)
    C.cyl(0.009, 0.006, 6, loc=(BELT_X + 0.016, y, z), axis="X", bm=bm)
    return mk("tensioner", bm, ["pulley_steel"], sharp=40)



def make_timing_cover():
    """black plastic upper + lower belt covers following the belt hull, ribbed fronts"""
    pts = []
    for y, z, r in PULLEYS:
        for k in range(48):
            a = 2 * math.pi * k / 48
            pts.append((round(y + (r + 0.017) * math.cos(a), 5), round(z + (r + 0.017) * math.sin(a), 5)))
    hull = hull2d(pts)
    zs = 0.335
    parts = []
    for name, keep_above, zc in (("upper", True, zs + 0.002), ("lower", False, zs - 0.002)):
        poly = clip_poly(hull, zc, keep_above)
        bm = prism_x(poly, 0.207, 0.243)
        o = mk("_tc_" + name, bm, ["plastic_black"], sharp=35, uv=False)
        if HI():
            C.bevel_mod(o, width=0.005, segs=2, angle=35)
        parts.append(o)
        # horizontal ribs on the front face
        rb = bmesh.new()
        zmin, zmax = min(p[1] for p in poly), max(p[1] for p in poly)
        nr = 5 if keep_above else 4
        for k in range(nr):
            z = zmin + (zmax - zmin) * (k + 0.8) / (nr + 0.6)
            ys = []
            for i in range(len(poly)):
                (y0, z0), (y1, z1) = poly[i], poly[(i + 1) % len(poly)]
                if (z0 - z) * (z1 - z) < 0:
                    ys.append(y0 + (y1 - y0) * (z - z0) / (z1 - z0))
            if len(ys) >= 2:
                a, bb = min(ys) + 0.02, max(ys) - 0.02
                if bb - a > 0.02:
                    C.merge(rb, C.box((0.004, bb - a, 0.004), loc=(0.2445, (a + bb) / 2, z), bevel=0.0015 if HI() else 0, segs=1))
        parts.append(mk("_tcr", rb, ["plastic_black"]))
    # bolts
    bb = bmesh.new()
    for y, z in ((-0.12, 0.44), (0.12, 0.44), (-0.10, 0.30), (0.1, 0.25), (0.0, 0.52)):
        C.cyl(0.006, 0.006, 6, loc=(0.245, y, z), axis="X", bm=bb)
    parts.append(mk("_tcb", bb, ["steel_dark"]))
    o = C.join(parts, "timing_cover")
    uv_eng(o)
    C.smooth_by_angle(o, 40)
    return o


def make_cam_pulley(name, r, x, cy, cz, width=0.024, n_teeth=42, spokes=5):
    """toothed rim + 5 spokes + hub: the lightening holes are the gaps between spokes (no booleans)"""
    bm = bmesh.new()
    ri = r - 0.012
    outer = gear_poly(n_teeth, r - 0.004, r, cy, cz) if HI() else [
        (cy + (r - 0.002) * math.cos(2 * math.pi * k / 48), cz + (r - 0.002) * math.sin(2 * math.pi * k / 48)) for k in range(48)]
    m = len(outer)
    inner = [(cy + ri * math.cos(math.atan2(p[1] - cz, p[0] - cy)), cz + ri * math.sin(math.atan2(p[1] - cz, p[0] - cy)))
             for p in outer]
    x0, x1 = x - width / 2, x + width / 2
    o0 = [bm.verts.new((x0, y, z)) for y, z in outer]
    o1 = [bm.verts.new((x1, y, z)) for y, z in outer]
    i0 = [bm.verts.new((x0, y, z)) for y, z in inner]
    i1 = [bm.verts.new((x1, y, z)) for y, z in inner]
    for k in range(m):
        j = (k + 1) % m
        bm.faces.new((o0[k], o0[j], o1[j], o1[k]))  # tooth wall
        bm.faces.new((i0[j], i0[k], i1[k], i1[j]))  # inner wall
        bm.faces.new((o0[j], o0[k], i0[k], i0[j]))  # back face
        bm.faces.new((o1[k], o1[j], i1[j], i1[k]))  # front face
    # spokes (a touch thinner than the rim, set back)
    for k in range(spokes):
        a = 2 * math.pi * (k + 0.25) / spokes
        L = ri - 0.018 + 0.004
        sp = C.box((width * 0.55, 0.012, L), loc=(x - width * 0.15, 0, 0.018 + L / 2 - 0.002),
                   bevel=0.002 if HI() else 0, segs=1)
        C.xform(sp, rot=Matrix.Rotation(a, 3, "X"), loc=(0, cy, cz))
        C.merge(bm, sp)
    C.cyl(0.022, width + 0.006, seg(28, 12), loc=(x, cy, cz), axis="X", bm=bm)
    C.cyl(0.009, 0.006, 6, loc=(x + width / 2 + 0.004, cy, cz), axis="X", bm=bm)  # bolt
    return mk(name, bm, ["steel_dark"], sharp=35, recalc=False)


def make_mount(name, x):
    """cast bracket on the exhaust-side boss + rubber bushing"""
    arm = C.box((0.04, 0.09, 0.03), loc=(x, -0.21, 0.30), bevel=0.006 if HI() else 0, segs=1, mat=0)
    for v in arm.verts:
        v.co.z += (v.co.y + 0.21) * -0.2
    # move the two rings into place (they were built on the crank axis)
    b2 = bmesh.new()
    C.merge(b2, C.box((0.06, 0.014, 0.08), loc=(x, -0.166, 0.27), bevel=0.006 if HI() else 0, segs=1, mat=0))
    C.merge(b2, arm)
    r1 = ring_x(0.018, 0.034, x - 0.03, x + 0.03, seg(24, 12), mat=1)
    r2 = ring_x(0.010, 0.018, x - 0.034, x + 0.034, seg(16, 8), mat=2)
    C.xform(r1, loc=(0, -0.262, 0.31))
    C.xform(r2, loc=(0, -0.262, 0.31))
    C.merge(b2, r1)
    C.merge(b2, r2)
    for sx in (-0.018, 0.018):
        C.cyl(0.006, 0.02, 6, loc=(x + sx, -0.176, 0.25), axis="Y", bm=b2, mat=2)
    return mk(name, b2, ["alu_cast", "rubber_belt", "steel_dark"], sharp=40)


# ── manifolds, fuel, ancillaries ─────────────────────────────────────────────
def make_intake():
    parts = []
    bm = bmesh.new()
    sides = seg(16, 8)
    for xc in XC:
        path = C.bezier_path([(xc, 0.160, 0.428), (xc, 0.200, 0.450), (xc * 0.97, 0.252, 0.436), (xc * 0.93, 0.292, 0.37),
                              (xc * 0.92, 0.290, 0.300)], seg(6, 3))
        rb = C.tube(path, 0.0175, sides, caps=False)
        for v in rb.verts:  # oval runner section: narrow along the crank, tall in the flow plane
            v.co.x = xc * 0.95 + (v.co.x - xc * 0.95) * 0.72
        C.merge(bm, rb)
    # web between the runners (moulded plastic manifolds are one piece)
    wb = C.box((0.30, 0.004, 0.05), loc=(0, 0.286, 0.35))
    C.merge(bm, wb)
    # plenum: capsule along X
    prof = [(0.0, -0.19), (0.03, -0.188), (0.044, -0.176), (0.047, -0.15), (0.047, 0.17), (0.044, 0.19), (0.036, 0.20)]
    pb = C.lathe(prof, seg(32, 14), axis="X")
    C.xform(pb, scale=(1, 0.85, 1.0), loc=(0, 0.278, 0.285))
    C.merge(bm, pb)
    # head flange
    C.merge(bm, C.box((0.37, 0.012, 0.062), loc=(0, 0.168, 0.428), bevel=0.004 if HI() else 0, segs=1))
    # support ribs between runners
    for x in (0.088, 0.0, -0.088):
        C.merge(bm, C.box((0.006, 0.05, 0.05), loc=(x, 0.262, 0.37)))
    o = mk("intake_manifold", bm, ["plastic_black"], sharp=45, recalc=False)
    parts.append(o)
    # throttle body (cast alu) at the +X end of the plenum
    tb = bmesh.new()
    C.merge(tb, ring_x(0.028, 0.036, 0.20, 0.245, seg(32, 14)))
    C.cyl(0.028, 0.002, seg(32, 14), loc=(0.212, 0.278, 0.285), axis="X", bm=None)
    C.xform(tb, loc=(0, 0.278, 0.285))
    C.merge(tb, C.box((0.012, 0.09, 0.09), loc=(0.202, 0.278, 0.285), bevel=0.006 if HI() else 0, segs=1))
    C.merge(tb, C.box((0.03, 0.03, 0.04), loc=(0.225, 0.318, 0.285), bevel=0.004 if HI() else 0, segs=1))  # motor housing
    disc = C.cyl(0.027, 0.002, seg(32, 14), loc=(0.222, 0.278, 0.285), axis="X")
    C.xform(disc, loc=(0, 0, 0))
    C.merge(tb, disc)
    parts.append(mk("_tb", tb, ["alu_cast"], sharp=40))
    o = C.join(parts, "intake_manifold")
    uv_eng(o)
    C.smooth_by_angle(o, 45)
    return o


def make_exhaust():
    bm = bmesh.new()
    sides = seg(16, 8)
    coll = Vector((0.0, -0.238, 0.235))
    for i, xc in enumerate(XC):
        p0 = Vector((xc, -0.160, 0.422))
        pts = [p0, Vector((xc, -0.200, 0.418)), Vector((xc * 0.85, -0.232, 0.385)), Vector((xc * 0.45, -0.246, 0.31)),
               Vector((xc * 0.12, -0.242, 0.262)), coll + Vector((xc * 0.05, 0, 0.0))]
        C.tube(C.bezier_path(pts, seg(6, 3)), 0.0185, sides, caps=False, bm=bm)
    # collector cone + outlet flange (down)
    cb = C.lathe([(0.034, 0.028), (0.036, 0.0), (0.03, -0.035), (0.026, -0.05)], seg(28, 12), axis="Z")
    C.xform(cb, loc=coll)
    C.merge(bm, cb)
    fl = C.box((0.075, 0.075, 0.008), loc=coll + Vector((0, 0, -0.054)), bevel=0.006 if HI() else 0, segs=1)
    C.merge(bm, fl)
    # individual port flanges (the primaries flow straight out of the head's port bosses) + a thin tie bar
    for xc in XC:
        C.merge(bm, C.box((0.062, 0.009, 0.05), loc=(xc, -0.1635, 0.422), bevel=0.006 if HI() else 0, segs=2))
        for sx in (-0.022, 0.022):
            C.cyl(0.0065, 0.008, 6, loc=(xc + sx, -0.170, 0.422 + (0.016 if sx > 0 else -0.016)), axis="Y", bm=bm)
    C.merge(bm, C.box((0.30, 0.006, 0.01), loc=(0, -0.1635, 0.444)))
    o = mk("exhaust_manifold", bm, ["exhaust_steel"], sharp=50, uv=False, recalc=False)
    # UVs: keep the tube UVs (u = metres along the pipe) for the heat-tint bands; box plates get engine UVs
    return o


def make_fuel():
    rail = bmesh.new()
    C.cyl(0.0095, 0.36, seg(20, 10), loc=(0.0, 0.118, 0.485), axis="X", bm=rail)
    C.cyl(0.006, 0.05, 12, loc=(0.2, 0.118, 0.485), axis="X", bm=rail)  # feed line stub
    for x in (-0.12, 0.12):
        C.merge(rail, C.box((0.012, 0.02, 0.03), loc=(x, 0.11, 0.47)))  # brackets
    r = mk("fuel_rail", rail, ["pulley_steel"], sharp=40)
    injs = []
    for i, xc in enumerate(XC):
        b = bmesh.new()
        C.cyl(0.0075, 0.05, seg(16, 8), loc=(0, 0, 0), bm=b, mat=0)
        C.merge(b, C.box((0.012, 0.018, 0.012), loc=(0, 0.012, 0.012), mat=0))  # connector
        C.torus(0.0078, 0.0015, 12, 4, loc=(0, 0, -0.022), bm=b, mat=1)  # o-ring
        C.xform(b, rot=Matrix.Rotation(math.radians(-28), 3, "X"), loc=(xc, 0.140, 0.462))
        injs.append(mk(f"injector_{i + 1}", b, ["plastic_gloss", "copper"], sharp=40))
    return r, injs


def make_oil_pan():
    b = bmesh.new()
    nc = seg(6, 3)
    # cast upper section under the rail, ribbed
    loft_z([(0.078, 0.200, 0.170, 0.03, 0, 0), (0.11, 0.204, 0.176, 0.026, 0, 0), (0.1175, 0.206, 0.178, 0.026, 0, 0)],
           n=nc, bm=b, mat=0)
    for sy in ((1, -1) if HI() else ()):
        for x in (-0.15, -0.09, -0.03, 0.03, 0.09, 0.15):
            C.merge(b, C.box((0.006, 0.008, 0.032), loc=(x, sy * 0.174, 0.094), mat=0))
    # pressed-steel tray + sump well (deep at the flywheel end)
    loft_z([(0.048, 0.188, 0.152, 0.03, 0, 0), (0.062, 0.192, 0.158, 0.03, 0, 0), (0.080, 0.194, 0.162, 0.03, 0, 0)],
           n=nc, bm=b, mat=1)
    loft_z([(0.0, 0.080, 0.118, 0.035, -0.095, 0), (0.012, 0.086, 0.126, 0.035, -0.095, 0),
            (0.052, 0.092, 0.136, 0.035, -0.095, 0)], n=nc, bm=b, mat=1)
    # pressed stiffening ribs on the well walls + drain plug on the end wall
    for sy in (1, -1):
        C.merge(b, C.box((0.13, 0.004, 0.008), loc=(-0.095, sy * 0.132, 0.03), bevel=0.002 if HI() else 0, segs=1, mat=1))
    C.merge(b, C.box((0.004, 0.18, 0.008), loc=(-0.179, 0, 0.03), mat=1))
    C.cyl(0.013, 0.004, 16, loc=(-0.178, 0.04, 0.02), axis="X", bm=b, mat=2)
    C.cyl(0.009, 0.01, 6, loc=(-0.184, 0.04, 0.02), axis="X", bm=b, mat=2)
    return mk("oil_pan", b, ["alu_cast", "black_paint", "steel_dark"], sharp=35)


def make_alternator():
    x0, x1 = 0.12, 0.215
    y, z = 0.214, 0.232
    prof = [(0.0, x0 - 0.004), (0.05, x0 - 0.004), (0.062, x0 + 0.006)]
    nr = seg(10, 4)
    for k in range(nr):
        xa = x0 + 0.012 + k * (x1 - x0 - 0.024) / nr
        prof += [(0.064, xa), (0.058, xa + 0.003), (0.064, xa + 0.006)]
    prof += [(0.062, x1 - 0.004), (0.045, x1), (0.015, x1), (0.015, x1 + 0.036), (0.0, x1 + 0.036)]
    b = C.lathe(prof, seg(40, 16), axis="X")
    C.xform(b, loc=(0, y, z))
    pul = C.lathe([(0.014, 0.0), (0.028, 0.0), (0.028, 0.022), (0.014, 0.022)], seg(32, 12), axis="X")
    C.xform(pul, loc=(x1 + 0.034, y, z))
    C.merge(b, pul)
    C.merge(b, C.box((0.03, 0.02, 0.07), loc=(0.16, 0.18, 0.19), mat=0))  # mounting ear
    return mk("alternator", b, ["alu_cast", "pulley_steel"], sharp=40)


def make_starter():
    b = bmesh.new()
    C.cyl(0.038, 0.12, seg(28, 12), loc=(-0.13, 0.19, 0.14), axis="X", bm=b, mat=0)
    C.cyl(0.03, 0.05, seg(24, 10), loc=(-0.205, 0.19, 0.14), axis="X", bm=b, mat=1)
    C.cyl(0.018, 0.1, seg(16, 8), loc=(-0.12, 0.19, 0.19), axis="X", bm=b, mat=0)  # solenoid
    return mk("starter", b, ["black_paint", "alu_cast"], sharp=40)


def make_oil_filter():
    """spin-on filter on the exhaust-side housing boss, tipped 25 deg down"""
    b = bmesh.new()
    prof = [(0.0, 0.0), (0.03, 0.0), (0.038, 0.006), (0.038, 0.085), (0.034, 0.092), (0.0, 0.093)]
    f = C.lathe(prof, seg(36, 14), axis="Y")
    C.xform(f, loc=(0, -0.093, 0))  # grows toward -y (outward)
    C.merge(b, f)
    C.merge(b, C.cyl(0.04, 0.012, seg(36, 14), loc=(0, -0.004, 0), axis="Y", mat=1))
    C.xform(b, rot=Matrix.Rotation(math.radians(25), 3, "X"), loc=(-0.10, -0.172, 0.205))
    return mk("oil_filter", b, ["filter_paint", "alu_cast"], sharp=40)


def make_dipstick():
    b = bmesh.new()
    path = C.bezier_path([(0.10, 0.165, 0.22), (0.10, 0.20, 0.34), (0.11, 0.205, 0.46), (0.115, 0.20, 0.53)], 5)
    C.tube(path, 0.005, 8, bm=b, mat=1)
    C.torus(0.016, 0.004, 16, 6, loc=(0.0, 0.0, 0.0), axis="X", bm=None)
    ring = C.torus(0.014, 0.0045, 16, 6, axis="Y")
    C.xform(ring, loc=(0.115, 0.20, 0.55))
    C.merge(b, ring)
    return mk("dipstick", b, ["yellow", "steel_dark"], sharp=40)


# ── assembly ─────────────────────────────────────────────────────────────────
EXPLODE = {
    "valve_cover": (0, 0.52, 0), "coil": (0, 0.66, 0), "head": (0, 0.30, 0), "head_gasket": (0, 0.15, 0),
    "camshaft_intake": (0, 0.42, -0.08), "camshaft_exhaust": (0, 0.42, 0.08),
    "cam_pulley_intake": (0.14, 0, 0), "cam_pulley_exhaust": (0.14, 0, 0),
    "timing_belt": (0.24, 0.02, 0), "tensioner": (0.30, 0, 0.04),
    "crankshaft": (0, -0.24, 0), "crank_pulley": (0.16, 0, 0), "flywheel": (-0.16, 0, 0),
    "piston": (0, 0.20, 0), "conrod": (0, 0, 0), "oil_pan": (0, -0.44, 0),
    "intake_manifold": (0, 0.10, -0.30), "fuel_rail": (0, 0.30, -0.16), "injector": (0, 0.05, 0),
    "exhaust_manifold": (0, 0.04, 0.30), "alternator": (0.10, 0, -0.26), "oil_filter": (0, -0.08, 0.26),
    "starter": (-0.06, -0.08, -0.26), "dipstick": (0, 0.24, -0.14), "block": (0, 0, 0),
    "accessory_belt": (0.30, -0.02, -0.08), "coolant_hose": (-0.14, 0.2, 0.1),
    "timing_cover": (0.46, 0.02, 0), "mount_front": (0.04, -0.02, 0.34), "mount_rear": (-0.04, -0.02, 0.34),
}


def build(q):
    global Q
    Q = q
    engine_mats()
    root = C.empty("engine")
    block = make_block()
    gasket = make_gasket()
    head = make_head()
    vc = make_valve_cover()
    coils = [make_coil(i) for i in range(4)]
    cam_i = make_cam("intake")
    cam_e = make_cam("exhaust")
    y_i, z_c, r_c = PULLEYS[3]
    y_e = PULLEYS[2][0]
    cp_i = make_cam_pulley("cam_pulley_intake", r_c, BELT_X, y_i, z_c)
    cp_e = make_cam_pulley("cam_pulley_exhaust", r_c, BELT_X, y_e, z_c)
    tcov = make_timing_cover()
    mounts = [make_mount("mount_front", 0.172), make_mount("mount_rear", -0.172)]
    crank = make_crank()
    sprocket = make_sprocket("_crank_sprocket", 21, PULLEYS[0][2], BELT_X, 0.0, CRANK_Y)
    crank = C.join([crank, sprocket], "crankshaft")
    wp = make_sprocket("_wp_sprocket", 19, PULLEYS[4][2], BELT_X, PULLEYS[4][0], PULLEYS[4][1], hub_r=0.014)
    block = C.join([block, wp], "block")
    cpul = make_crank_pulley()
    fly = make_flywheel()
    belt = make_belt()
    tens = make_tensioner()
    abelt = make_belt("accessory_belt", [(0.0, CRANK_Y, 0.0685), (0.214, 0.232, 0.0285)], bx=0.260, w=0.021, t=0.004,
                      teeth=False)
    hb = bmesh.new()
    C.tube(C.bezier_path([(-0.25, -0.05, 0.43), (-0.29, -0.06, 0.43), (-0.31, -0.10, 0.38), (-0.30, -0.16, 0.34)], seg(6, 3)),
           0.016, seg(14, 8), bm=hb)
    hose = mk("coolant_hose", hb, ["rubber_belt"], sharp=50)
    pistons, rods = [], []
    p0, rd0 = make_piston(0), make_conrod(0)
    for i in range(4):
        # the 4 pistons / rods share one mesh each (glTF instancing: stored once)
        if i == 0:
            p, rd = p0, rd0
        else:
            p, rd = p0.copy(), rd0.copy()
            p.name, rd.name = f"piston_{i + 1}", f"conrod_{i + 1}"
            bpy.context.scene.collection.objects.link(p)
            bpy.context.scene.collection.objects.link(rd)
        a = PHASE[i]
        h = CRANK_Y + R_CR * math.cos(a) + math.sqrt(L_ROD ** 2 - (R_CR * math.sin(a)) ** 2)
        p.location = (XC[i], 0, h)
        rd.location = (XC[i], 0, h)
        pistons.append(p)
        rods.append(rd)
    pan = make_oil_pan()
    intake = make_intake()
    exh = make_exhaust()
    rail, injs = make_fuel()
    alt = make_alternator()
    oilf = make_oil_filter()
    dip = make_dipstick()
    parts = [block, gasket, head, vc, cam_i, cam_e, cp_i, cp_e, crank, cpul, fly, belt, tens, pan, intake, exh, rail,
             alt, oilf, dip, abelt, hose, tcov] + mounts + coils + pistons + rods + injs
    if HI():
        st = make_starter()
        parts.append(st)
    bpy.context.view_layer.update()
    # AO with everything assembled
    uniq, seen = [], set()
    for o in parts:  # bake each mesh once (instanced pistons / rods share theirs)
        if o.data.name not in seen:
            seen.add(o.data.name)
            uniq.append(o)
    C.bake_ao_vcol(uniq, samples=48 if HI() else 16, max_dist=0.06, floor=0.25)
    # pivots
    set_pivot(crank, (0, 0, CRANK_Y))
    for o in (cpul, fly):
        set_pivot(o, (0, 0, CRANK_Y))
    set_pivot(cam_i, (0, CAM_Y, CAM_Z))
    set_pivot(cam_e, (0, -CAM_Y, CAM_Z))
    set_pivot(cp_i, (BELT_X, CAM_Y, CAM_Z))
    set_pivot(cp_e, (BELT_X, -CAM_Y, CAM_Z))
    set_pivot(rail, (0, 0.118, 0.485))
    for o in [block, gasket, head, vc, pan, intake, exh, alt, oilf, dip, belt, tens, abelt, hose, tcov] + mounts + coils + ([st] if HI() else []):
        c = sum((Vector(v) for v in o.bound_box), Vector()) / 8
        set_pivot(o, (c.x, c.y, c.z) if o is not block else (0, 0, 0))
    bpy.context.view_layer.update()
    # hierarchy
    for o in parts:
        o.parent = root
    bpy.context.view_layer.update()
    for child, par in ((cp_i, cam_i), (cp_e, cam_e), (cpul, crank), (fly, crank)):
        mw = child.matrix_world.copy()
        child.parent = par
        child.matrix_world = mw
    for p, rd in zip(pistons, rods):
        rd.parent = p
        rd.location = (0, 0, 0)
    for inj in injs:
        c = sum((Vector(v) for v in inj.bound_box), Vector()) / 8
        set_pivot(inj, c)
        bpy.context.view_layer.update()
        mw = inj.matrix_world.copy()
        inj.parent = rail
        inj.matrix_world = mw
    for o in [root] + list(root.children_recursive):
        base = o.name.split(".")[0]
        key = base.rsplit("_", 1)[0] if base.rsplit("_", 1)[-1].isdigit() else base
        if key in EXPLODE and o is not root:
            o["explode"] = list(EXPLODE[key])
    return root


if __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    C.reset()
    root = build(q)
    if a.get("look"):
        H = os.path.join(C.HERE, "..", "public/lib3d/env/")
        C.look(a["look"], target=(0, 0, 0.31), cam=(0.95, -1.05, 0.72), fov=34, hdr=H + a.get("env", "garage") + "-1k-v1.hdr",
               ground=True, spp=int(a.get("spp", "48")), res=(1200, 800))
    if a.get("look2"):
        H = os.path.join(C.HERE, "..", "public/lib3d/env/")
        C.look(a["look2"], target=(0, 0, 0.31), cam=(0.85, 1.1, 0.8), fov=34, hdr=H + a.get("env", "garage") + "-1k-v1.hdr",
               ground=True, spp=int(a.get("spp", "48")), res=(1200, 800))
    C.finish("engine", q, root, a.get("out"))
