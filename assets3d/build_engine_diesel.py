"""Inline-4 common-rail turbo diesel (~2.0 L, DOHC 16 V), unbranded, every major part a separate node.

  Blender -b --factory-startup --python assets3d/build_engine_diesel.py -- --q hi [--out x.glb] [--look /tmp/d.png]

Same frame as the petrol `engine`: three.js space, crank axis along X, timing belt at +X (cylinder 1 at +X),
intake side at -Z, exhaust side (+ turbo) at +Z, +Y up. Origin: bottom of the oil pan, centred. Real scale (m).
Silhouette differs from the petrol engine on purpose: a taller cast-iron block (deck at 0.403 m vs 0.370),
flat-deck head with the injectors standing vertically on the centre line through the cam cover, the forged
common rail + high-pressure lines on top, the HP pump on the timing belt, turbo hanging off a cast log manifold,
EGR cooler + crossover pipe over the flywheel end, intercooler pipe stubs, glow plugs, vacuum pump.

Kinematics (bore 81 mm, stroke 95.5 mm -> 1968 cc; conrod 144 mm; firing order 1-3-4-2; cyl 1 at +X):
  crank axis at y = CRANK_Y (0.175). crankshaft.rotation.x = theta (rest pose theta = 0: pins 1 + 4 at TDC).
  pin phase phi_i = [0, pi, pi, 0] for cylinders 1..4;  a = theta + phi_i;  r = 0.04775, L = 0.144
  piston_i.position.y = 0.175 + r*cos(a) + sqrt(L^2 - (r*sin(a))^2)
  conrod_i.rotation.x = -asin(r*sin(a) / L)   (conrod_i is a child of piston_i; its node origin IS the wrist pin)
  camshaft_intake / camshaft_exhaust .rotation.x = theta / 2.
extras.spin (lib3d spin(theta)): crankshaft 1, camshafts 0.5, hp_pump_pulley 0.5 (pump runs at cam speed),
  compressor_wheel 12 (visual only). Pistons are not spinners: drive them with the formula above.
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

import build_turbo as TB
import common as C
import texgen as T

CRANK_Y = 0.175  # crank axis height (Blender z)
R_CR = 0.04775  # crank throw (stroke / 2)
L_ROD = 0.144
BORE = 0.081
COMP_H = 0.036  # wrist pin -> crown
XC = [0.132, 0.044, -0.044, -0.132]  # cylinder 1..4 (cyl 1 at the timing end, +X)
XJ = [0.176, 0.088, 0.0, -0.088, -0.176]  # main journals
PHASE = [0.0, math.pi, math.pi, 0.0]
DECK = 0.403
HEAD_Z0 = DECK + 0.0016
HEAD_TOP = 0.525
CAM_Z = 0.500
CAM_Y = 0.046
VC_TOP = 0.585
BELT_X = 0.240
RAIL_Y, RAIL_Z, RAIL_R = 0.108, 0.598, 0.0135
TURBO = Vector((0.010, -0.232, 0.312))
TS = 0.62  # turbo scale vs the lib3d turbo asset
Q = "hi"

def HI():
    return Q == "hi"


def seg(n_hi, n_lo):
    return n_hi if HI() else n_lo


# ── materials ────────────────────────────────────────────────────────────────
def mats():
    if not HI():  # phone LOD: flat PBR (no textures -> no UV seams, no TEXCOORD: fewer vertices + accessors)
        for nm, hexc, r, m in (("iron_cast", "#5e5f61", 0.66, 1.0), ("cast_iron", "#5e5f61", 0.66, 1.0),
                               ("iron_hot", "#5a4a42", 0.74, 0.6), ("cast_iron_hot", "#5a4a42", 0.74, 0.6),
                               ("alu_cast", "#b9babc", 0.46, 1.0), ("cast_alu", "#b9babc", 0.46, 1.0),
                               ("plastic_black", "#2b2b2c", 0.55, 0.0), ("steel_machined", "#cfcfd0", 0.26, 1.0)):
            C.material(nm, C.srgb(hexc), r, m, vcol=True)
    n = 512 if HI() else 256
    us = 0.8 / 0.22  # UVs normalised over a 0.8 m box -> 22 cm texture tile
    a, o, nn = T.cast_iron(n, seed=41, lum=0.12, rough=0.66, rust=0.0)
    a = a.mean() + (a - a.mean()) * 0.7
    nn = T.cast_iron(256, seed=41, lum=0.12, rough=0.66, rust=0.0)[2]
    iron = dict(albedo=C.image("d_iron_alb", a), orm=C.image("d_iron_orm", o, False),
                normal=(C.image("d_iron_n", nn, False) if HI() else None))
    C.material("iron_cast", (1, 1, 1), normal_strength=0.3, vcol=True, uv_scale=(us * 1.6, us * 1.6), **iron)
    C.material("cast_iron", (1, 1, 1), normal_strength=0.3, vcol=True, uv_scale=(us * 1.6, us * 1.6), **iron)  # turbo CHRA
    a2, o2, n2 = T.cast_iron(256, seed=42, lum=0.14, rough=0.74, rust=0.5)
    a2 = a2 * np.array([1.0, 0.86, 0.78], np.float32)
    hot = dict(albedo=C.image("d_hot_alb", a2), orm=C.image("d_hot_orm", o2, False))
    C.material("iron_hot", (1, 1, 1), normal_strength=0.5, vcol=True, uv_scale=(us * 2, us * 2), **hot)
    C.material("cast_iron_hot", (1, 1, 1), normal_strength=0.5, vcol=True, uv_scale=(us * 2, us * 2), **hot)
    a3, o3, n3 = T.cast_alu(n, seed=43, lum=0.52, rough=0.46)
    a3 = 0.5 + (a3 - a3.mean()) * 0.45
    n3 = T.cast_alu(256, seed=43, lum=0.52, rough=0.46)[2]  # 256 px normal tile: 0.9 mm / texel, saves ~60 KB
    alu = dict(albedo=C.image("d_alu_alb", a3), orm=C.image("d_alu_orm", o3, False),
               normal=(C.image("d_alu_n", n3, False) if HI() else None))
    C.material("alu_cast", (1, 1, 1), normal_strength=0.12, vcol=True, uv_scale=(us * 2.6, us * 2.6), **alu)
    C.material("cast_alu", (1, 1, 1), normal_strength=0.12, vcol=True, uv_scale=(us * 2.6, us * 2.6), **alu)
    pa, po, pn = T.textured_plastic(256, seed=44, lum=0.024, rough=0.55, grain=1.1)
    C.material("plastic_black", (1, 1, 1), albedo=C.image("d_pl_alb", pa), orm=C.image("d_pl_orm", po, False),
               normal=(C.image("d_pl_n", pn, False) if HI() else None), normal_strength=0.4, vcol=True,
               uv_scale=(us * 2, us * 2))
    ba, bo, bn = T.brushed(256, seed=45, lum=0.62, rough=0.24)
    C.material("steel_machined", (1, 1, 1), albedo=C.image("d_brush_alb", ba), orm=C.image("d_brush_orm", bo, False),
               vcol=True, uv_scale=(us * 2, us * 2))
    C.material("steel_forged", C.srgb("#6a6d71"), 0.42, 1.0, vcol=True)
    C.material("rail_steel", C.srgb("#8d9094"), 0.36, 1.0, vcol=True)
    C.material("hp_tube", C.srgb("#c3c6ca"), 0.26, 1.0, vcol=True)
    C.material("zinc", C.srgb("#b7b39c"), 0.34, 1.0, vcol=True)
    C.material("piston_alu", C.srgb("#b9bcbf"), 0.34, 1.0, vcol=True)
    C.material("piston_crown", C.srgb("#3a3531"), 0.62, 0.5, vcol=True)
    C.material("bore", C.srgb("#6f7276"), 0.30, 1.0, vcol=True)
    C.material("gasket", C.srgb("#55585c"), 0.38, 0.9, vcol=True)
    C.material("plastic_gloss", C.srgb("#141416"), 0.32, 0.0, vcol=True)
    C.material("rubber", C.srgb("#151516"), 0.76, 0.0, vcol=True)
    C.material("pulley_steel", C.srgb("#a4a7ab"), 0.28, 1.0, vcol=True)
    C.material("steel_dark", C.srgb("#2c2e31"), 0.42, 0.9, vcol=True)
    C.material("black_paint", C.srgb("#101012"), 0.42, 0.3, vcol=True)
    C.material("yellow", C.srgb("#e0a80c"), 0.4, 0.0, vcol=True)
    C.material("copper", C.srgb("#b8643a"), 0.3, 1.0, vcol=True)
    C.material("stainless", C.srgb("#a9abae"), 0.3, 1.0, vcol=True)
    # names the imported lib3d turbo part builders use
    C.material("alu_machined", C.srgb("#d4d6d9"), 0.22, 1.0, vcol=True)
    C.material("alu_milled", C.srgb("#dcdee1"), 0.16, 1.0, vcol=True)
    C.material("steel", C.srgb("#b3b6ba"), 0.32, 1.0, vcol=True)
    C.material("actuator_paint", C.srgb("#1b1c1e"), 0.55, 0.3, vcol=True)
    C.material("bore_dark", C.srgb("#2a2b2d"), 0.6, 0.8, double=True)


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
            x, y, z = p.x + 0.4, p.y + 0.4, p.z + 0.02
            if ax == 0:
                u, v = y, z
            elif ax == 1:
                u, v = x, z
            else:
                u, v = x, y
            lp[uvl].uv = (min(max(u / 0.8, 0), 1), min(max(v / 0.8, 0), 1))
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


def gear_poly(n, r_root, r_tip, cy=0.0, cz=0.0, ofs=0.0):
    pts = []
    for k in range(n):
        for fa, rr in ((0.0, r_root), (0.18, r_tip), (0.5, r_tip), (0.68, r_root)):
            a = 2 * math.pi * (k + fa) / n + ofs
            pts.append((cy + rr * math.cos(a), cz + rr * math.sin(a)))
    return pts


def ring_x(r_in, r_out, x0, x1, segs, bm=None, mat=0):
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
    rc = min(rc, hx * 0.99, hy * 0.99)
    pts = []
    for sx, sy, a0 in ((1, 1, 0.0), (-1, 1, 0.5 * math.pi), (-1, -1, math.pi), (1, -1, 1.5 * math.pi)):
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
        prof.append((r * math.cos(a), z0 + r * 0.8 * math.sin(a)))
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


def hexnut(p, d, r, h, bm, mat=0):
    """hex (6-sided cylinder) centred at p along direction d"""
    b = C.cyl(r, h, 6, mat=mat)
    C.xform(b, rot=Vector(d).normalized().to_track_quat("Z", "X").to_matrix(), loc=p)
    C.merge(bm, b)


def cyl_dir(r, h, p, d, segs, bm, mat=0):
    b = C.cyl(r, h, segs, mat=mat)
    C.xform(b, rot=Vector(d).normalized().to_track_quat("Z", "X").to_matrix(), loc=p)
    C.merge(bm, b)


# ── crankshaft ───────────────────────────────────────────────────────────────
def web_poly(phase, n=56):
    a_pin = 0.032
    pts = []
    for k in range(n):
        psi = 2 * math.pi * k / n
        s = math.sin(psi)
        lobe = 0.0
        if abs(R_CR * s) < a_pin and math.cos(psi) > -0.2:
            lobe = R_CR * math.cos(psi) + math.sqrt(a_pin ** 2 - (R_CR * s) ** 2)
        d = abs(((psi - math.pi) + math.pi) % (2 * math.pi) - math.pi)
        cw = 0.079 if d < 0.95 else (0.079 - (0.079 - 0.031) * min(1, (d - 0.95) / 0.45) ** 1.5)
        R = max(lobe, cw, 0.030)
        a = psi + phase
        pts.append((R * math.sin(a), CRANK_Y + R * math.cos(a)))
    return pts


def make_crank():
    bm = bmesh.new()
    segs = seg(40, 16)
    for xj in XJ:
        C.cyl(0.027, 0.026, segs, loc=(xj, 0, CRANK_Y), axis="X", bm=bm, mat=1)
    for i, xc in enumerate(XC):
        ph = PHASE[i]
        py, pz = R_CR * math.sin(ph), CRANK_Y + R_CR * math.cos(ph)
        C.cyl(0.0245, 0.026, segs, loc=(xc, py, pz), axis="X", bm=bm, mat=1)
        for sgn in (1, -1):
            x0, x1 = xc + sgn * 0.013, xc + sgn * 0.031
            prism_x(web_poly(ph, seg(44, 20)), min(x0, x1), max(x0, x1), bm=bm, mat=0)
    C.cyl(0.021, 0.07, segs, loc=(0.222, 0, CRANK_Y), axis="X", bm=bm, mat=1)  # snout
    C.cyl(0.048, 0.016, segs, loc=(-0.197, 0, CRANK_Y), axis="X", bm=bm, mat=0)  # tail flange
    return mk("crankshaft", bm, ["steel_forged", "steel_machined"], sharp=38)


def make_sprocket(name, n_teeth, r, x, cy, cz, width=0.026, mat="pulley_steel", hub_r=None):
    bm = bmesh.new()
    if HI():
        prism_x(gear_poly(n_teeth, r - 0.004, r, cy, cz), x - width / 2, x + width / 2, bm=bm)
    else:
        C.cyl(r - 0.002, width, 24, loc=(x, cy, cz), axis="X", bm=bm)
    C.cyl(r + 0.004, 0.002, seg(48, 20), loc=(x - width / 2 - 0.001, cy, cz), axis="X", bm=bm)
    C.cyl(r + 0.004, 0.002, seg(48, 20), loc=(x + width / 2 + 0.001, cy, cz), axis="X", bm=bm)
    if hub_r:
        C.cyl(hub_r, width + 0.012, seg(24, 12), loc=(x, cy, cz), axis="X", bm=bm)
    return mk(name, bm, [mat], sharp=35)


def make_crank_pulley():
    """torsional-damper pulley: poly-V rim, rubber ring, hub + 4 bolts"""
    x0 = 0.270
    r = 0.074
    prof = [(0.02, x0), (0.034, x0), (0.056, x0 + 0.003), (r - 0.004, x0 + 0.003)]
    for k in range(7):
        xa = x0 + 0.006 + k * 0.0036
        prof += [(r, xa), (r - 0.0025, xa + 0.0018)]
    prof += [(r, x0 + 0.032), (r - 0.003, x0 + 0.036), (0.034, x0 + 0.036), (0.02, x0 + 0.032), (0.02, x0)]
    b = C.lathe(prof, seg(48, 24), axis="X")
    C.xform(b, loc=(0, 0, CRANK_Y))
    rr = C.lathe([(0.049, x0 + 0.036), (0.056, x0 + 0.036), (0.056, x0 + 0.037), (0.049, x0 + 0.037)], seg(48, 20), axis="X")
    C.xform(rr, loc=(0, 0, CRANK_Y))
    for f in rr.faces:
        f.material_index = 1
    C.merge(b, rr)
    for k in range(4):
        a = 2 * math.pi * (k + 0.5) / 4
        C.cyl(0.0065, 0.005, 6, loc=(x0 + 0.039, 0.026 * math.cos(a), CRANK_Y + 0.026 * math.sin(a)), axis="X", bm=b, mat=2)
    return mk("crank_pulley", b, ["pulley_steel", "rubber", "steel_dark"], sharp=40)


def make_flywheel():
    """dual-mass flywheel: pressed outer mass with ring gear, secondary face"""
    x = -0.218
    prof = [(0.0, x + 0.006), (0.024, x + 0.006), (0.03, x + 0.004), (0.14, x + 0.004), (0.146, x - 0.002),
            (0.146, x - 0.03), (0.13, x - 0.034), (0.13, x - 0.028), (0.075, x - 0.028), (0.06, x - 0.02),
            (0.02, x - 0.02), (0.0, x - 0.02)]
    b = C.lathe(prof[::-1], seg(72, 32), axis="X")
    C.xform(b, loc=(0, 0, CRANK_Y))
    if HI():
        prism_x(gear_poly(132, 0.146, 0.151, 0, CRANK_Y), x - 0.012, x - 0.002, bm=b, mat=1)
    for k in range(8):
        a = 2 * math.pi * k / 8
        C.cyl(0.006, 0.004, 10, loc=(x + 0.006, 0.042 * math.cos(a), CRANK_Y + 0.042 * math.sin(a)), axis="X", bm=b, mat=1)
    return mk("flywheel", b, ["steel_machined", "steel_dark"], sharp=35)


# ── pistons + conrods ────────────────────────────────────────────────────────
def make_piston(i):
    """diesel piston: re-entrant omega bowl in the crown, 3 ring grooves, thick wrist pin. Origin = wrist pin."""
    r = BORE / 2 - 0.0004
    top = COMP_H
    bot = -0.032
    prof = [(0.0, top - 0.009), (0.006, top - 0.013), (0.014, top - 0.0175), (0.020, top - 0.0165),
            (0.0245, top - 0.011), (0.0255, top - 0.005), (0.0238, top - 0.0012), (0.0255, top)]
    prof += [(r - 0.004, top), (r - 0.001, top), (r, top - 0.002)]
    zz = top - 0.008
    for k in range(3):
        prof += [(r, zz), (r - 0.0032, zz - 0.0003), (r - 0.0032, zz - 0.0019), (r, zz - 0.0022)]
        zz -= 0.0048
    prof += [(r, bot + 0.004), (r - 0.0015, bot), (r - 0.004, bot), (r - 0.004, top - 0.024), (0.0, top - 0.024)]
    nb = 8  # bowl + crown segments
    b = C.lathe(prof, seg(44, 18), axis="Z", mat_idx=[1] * nb + [0] * (len(prof) - 1 - nb))
    C.cyl(0.0132, 0.066, seg(20, 10), loc=(0, 0, 0), axis="X", bm=b, mat=2)
    return mk(f"piston_{i + 1}", b, ["piston_alu", "piston_crown", "steel_machined"], sharp=40)


def make_conrod(i):
    """fracture-split rod, small end AT THE ORIGIN (node pivot = wrist pin), big end at -L"""
    b = bmesh.new()
    w = 0.024
    ring_x(0.0133, 0.021, -w / 2 + 0.002, w / 2 - 0.002, seg(28, 12), bm=b)
    big = ring_x(0.0255, 0.040, -w / 2, w / 2, seg(36, 16))
    C.xform(big, loc=(0, 0, -L_ROD))
    C.merge(b, big)
    top, bottom = -0.017, -L_ROD + 0.032
    if HI():
        for sy in (1, -1):
            fl = C.box((0.019, 0.0055, top - bottom), loc=(0, 0, (top + bottom) / 2))
            for v in fl.verts:
                t = (v.co.z - bottom) / (top - bottom)
                v.co.y = sy * (0.0095 + 0.0065 * (1 - t)) + v.co.y
            C.merge(b, fl)
        C.merge(b, C.box((0.008, 0.02, top - bottom), loc=(0, 0, (top + bottom) / 2)))
    else:
        C.merge(b, C.box((0.019, 0.025, top - bottom), loc=(0, 0, (top + bottom) / 2)))
    for sy in (1, -1):
        C.cyl(0.006, 0.032, 10, loc=(0, sy * 0.031, -L_ROD - 0.024), axis="Z", bm=b, mat=1)
    return mk(f"conrod_{i + 1}", b, ["steel_forged", "steel_dark"], sharp=40)


# ── block ────────────────────────────────────────────────────────────────────
BLOCK_Z0 = 0.128
BLOCK_PROF = [(BLOCK_Z0, 0.172), (BLOCK_Z0 + 0.010, 0.172), (BLOCK_Z0 + 0.012, 0.163), (0.18, 0.167), (0.235, 0.160),
              (0.29, 0.151), (0.36, 0.149), (DECK - 0.004, 0.152), (DECK, 0.1505)]
BLOCK_HX = 0.214


def block_hw(z):
    zs, ws = zip(*BLOCK_PROF)
    return float(np.interp(z, zs, ws))


def make_block():
    segs = seg(48, 20)
    nc = seg(6, 3)
    secs = [(z, BLOCK_HX + (0.003 if z < BLOCK_Z0 + 0.011 else 0), hw, 0.024, 0.0, 0.0) for z, hw in BLOCK_PROF]
    blk = mk("block", loft_z(secs, n=nc), ["iron_cast", "bore"], sharp=30, uv=False)
    if HI():
        C.bevel_mod(blk, width=0.003, segs=2, angle=40)
    cut = bmesh.new()
    zb = 0.232  # bores run down into the crankcase: pistons stay visible at BDC with the head off
    for xc in XC:
        h = DECK + 0.1 - zb
        C.cyl(BORE / 2, h, segs, loc=(xc, 0, zb + h / 2), axis="Z", bm=cut, mat=1)
    if HI():
        C.merge(cut, C.box((0.40, 0.29, 0.15), loc=(0, 0, BLOCK_Z0 - 0.01 + 0.075)))
    C.boolean(blk, C.obj("_cut", cut, ["iron_cast", "bore"], smooth=False), transfer=True)
    parts = [blk]
    if HI():
        for xj in XJ:
            p = mk("_bulk", C.box((0.022, 0.30, 0.13), loc=(xj, 0, 0.196)), ["iron_cast"], uv=False)
            C.boolean(p, C.obj("_sad", C.cyl(0.028, 0.03, 32, loc=(xj, 0, CRANK_Y), axis="X"), ["iron_cast"], smooth=False))
            cp = mk("_cap", C.box((0.024, 0.14, 0.032), loc=(xj, 0, CRANK_Y - 0.038), bevel=0.004, segs=1), ["iron_cast"], uv=False)
            C.boolean(cp, C.obj("_sad", C.cyl(0.028, 0.03, 32, loc=(xj, 0, CRANK_Y), axis="X"), ["iron_cast"], smooth=False))
            parts += [p, cp]
    rb = bmesh.new()
    # vertical skirt ribs over the bulkheads (both sides), following the flare
    for xj in XJ:
        for sy in (1, -1):
            rs = []
            for z in (0.14, 0.17, 0.20, 0.23, 0.26, 0.29, 0.31):
                t = 0.012 * (1 - (z - 0.14) / 0.19) + 0.002
                rs.append((z, 0.007, t / 2 + 0.002, 0.002, xj, sy * (block_hw(z) + t / 2 - 0.002)))
            loft_z(rs, n=2, bm=rb)
    # water-jacket bulges over each bore on both sides (siamesed-bore valleys)
    for xc in XC:
        for sy in (1, -1):
            capsule_z(0.038, 0.30, 0.378, seg(20, 10), loc=(xc, sy * (block_hw(0.34) - 0.004)), scale_y=0.30, bm=rb)
    # freeze plugs (exhaust side), core plugs, mount bosses
    for xc in (0.088, 0.0, -0.088):
        C.cyl(0.017, 0.006, 20, loc=(xc, -0.151, 0.262), axis="Y", bm=rb, mat=1)
    for x in (0.185, -0.185):
        C.merge(rb, C.box((0.05, 0.018, 0.075), loc=(x, -0.160, 0.30), bevel=0.006 if HI() else 0, segs=1))
    # oil filter / cooler module pad on the intake side
    C.merge(rb, C.box((0.09, 0.02, 0.12), loc=(-0.045, 0.170, 0.25), bevel=0.008 if HI() else 0, segs=1))
    # HP pump / alternator bracket boss (intake side, timing end)
    C.merge(rb, C.box((0.09, 0.03, 0.16), loc=(0.17, 0.163, 0.30), bevel=0.008 if HI() else 0, segs=1))
    # oil pump / front seal housing around the crank snout
    C.merge(rb, C.box((0.016, 0.27, 0.18), loc=(BLOCK_HX + 0.006, 0, 0.21), bevel=0.02 if HI() else 0.0, segs=2))
    ribs = mk("_ribs", rb, ["iron_cast", "steel_dark"])
    parts.append(ribs)
    o = C.join(parts, "block")
    uv_eng(o)
    C.smooth_by_angle(o, 32)
    return o


def make_gasket():
    g = C.obj("head_gasket", C.box((0.424, 0.302, 0.0016), loc=(0, 0, DECK + 0.0008)), ["gasket"], smooth=False)
    cut = bmesh.new()
    for xc in XC:
        C.cyl(BORE / 2 + 0.002, 0.02, seg(48, 20), loc=(xc, 0, DECK), bm=cut)
    for x in XJ:
        for sy in (1, -1):
            C.cyl(0.0065, 0.02, 10, loc=(x, sy * 0.122, DECK), bm=cut)
    C.boolean(g, C.obj("_c", cut, ["gasket"], smooth=False))
    if not HI():
        uv_eng(g)
        return g
    rb = bmesh.new()
    for xc in XC:
        C.torus(BORE / 2 + 0.0045, 0.0012, seg(40, 20), 4, loc=(xc, 0, DECK + 0.0016), bm=rb)
    o = C.join([g, C.obj("_b", rb, ["gasket"])], "head_gasket")
    uv_eng(o)
    return o


# ── head ─────────────────────────────────────────────────────────────────────
def make_head():
    z0, z1 = HEAD_Z0, HEAD_TOP
    nc = seg(5, 3)
    secs = [(z0, 0.211, 0.150, 0.02, 0, 0), (z0 + 0.012, 0.211, 0.152, 0.02, 0, 0), (0.47, 0.211, 0.151, 0.02, 0, 0),
            (z1 - 0.012, 0.211, 0.147, 0.02, 0, 0), (z1, 0.209, 0.142, 0.018, 0, 0)]
    head = mk("head", loft_z(secs, n=nc), ["alu_cast"], uv=False)
    cut = bmesh.new()
    C.merge(cut, C.box((0.38, 0.19, 0.08), loc=(0, 0, 0.478 + 0.04)))  # cam tub
    for xc in XC:  # vertical injector wells on the centre line
        C.cyl(0.0125, 0.16, 20, loc=(xc, 0, 0.46), bm=cut)
    C.boolean(head, C.obj("_c", cut, ["alu_cast"], smooth=False))
    parts = [head]
    cb = bmesh.new()
    # cam tunnels along both top edges + bearing caps
    for sy in (1, -1):
        C.cyl(0.02, 0.41, seg(24, 12), loc=(0.0, sy * 0.122, 0.51), axis="X", bm=cb)
        for x in (0.19, 0.088, 0.0, -0.088, -0.176):
            C.merge(cb, C.box((0.02, 0.046, 0.016), loc=(x, sy * CAM_Y, CAM_Z + 0.012), bevel=0.003 if HI() else 0, segs=1))
            C.merge(cb, C.box((0.024, 0.046, 0.024), loc=(x, sy * CAM_Y, CAM_Z - 0.016)))
    # injector bosses around the wells (centre line) + hold-down claws
    for xc in XC:
        ring = C.lathe([(0.0125, 0.478), (0.021, 0.478), (0.021, 0.508), (0.0125, 0.508), (0.0125, 0.478)], seg(24, 12), axis="Z")
        C.xform(ring, loc=(xc, 0, 0))
        C.merge(cb, ring)
    # exhaust port bosses (-Y face), intake face (+Y), thermostat / coolant flange at the flywheel end
    for xc in XC:
        C.merge(cb, C.box((0.056, 0.012, 0.044), loc=(xc, -0.156, 0.462), bevel=0.008 if HI() else 0, segs=2))
    C.merge(cb, C.box((0.37, 0.012, 0.06), loc=(0, 0.157, 0.455), bevel=0.004 if HI() else 0, segs=1))
    C.merge(cb, C.cyl(0.022, 0.035, 20, loc=(-0.225, 0.07, 0.47), axis="X"))
    # vacuum pump seat on the exhaust cam axis (flywheel end)
    C.merge(cb, C.cyl(0.04, 0.012, seg(28, 12), loc=(-0.214, -CAM_Y, CAM_Z), axis="X"))
    parts.append(mk("_caps", cb, ["alu_cast"]))
    if HI():
        vb = bmesh.new()
        for xc in XC:
            for dx in (-0.018, 0.018):
                for sy in (1, -1):
                    C.cyl(0.0125, 0.009, 16, loc=(xc + dx, sy * CAM_Y, CAM_Z - 0.029), bm=vb)
        parts.append(mk("_valves", vb, ["steel_machined"]))
    o = C.join(parts, "head")
    uv_eng(o)
    C.smooth_by_angle(o, 32)
    return o


def lobe_poly(phase, n=40, base=0.018, lift=0.008):
    pts = []
    for k in range(n):
        psi = 2 * math.pi * k / n
        d = abs(((psi - phase) + math.pi) % (2 * math.pi) - math.pi)
        R = base + (lift * (0.5 + 0.5 * math.cos(math.pi * d / 1.2)) if d < 1.2 else 0.0)
        pts.append((R, psi))
    return pts


def make_cam(side):
    sy = 1 if side == "intake" else -1
    y = sy * CAM_Y
    bm = bmesh.new()
    x_end = -0.216 if side == "exhaust" else -0.20  # exhaust cam drives the vacuum pump
    x_front = 0.23 if side == "exhaust" else 0.205
    C.cyl(0.0125, x_front - x_end, seg(24, 12), loc=((x_front + x_end) / 2, y, CAM_Z), axis="X", bm=bm)
    order_deg = {0: 0, 2: 90, 3: 180, 1: 270}
    for i, xc in enumerate(XC):
        base_ph = math.radians(order_deg[i] + (0 if side == "intake" else 110))
        for dx in (-0.018, 0.018):
            poly = [(y + R * math.sin(p), CAM_Z + R * math.cos(p)) for R, p in lobe_poly(base_ph, seg(40, 20))]
            prism_x(poly, xc + dx - 0.007, xc + dx + 0.007, bm=bm)
    for x in (0.19, 0.088, 0.0, -0.088, -0.176):
        C.cyl(0.0135, 0.018, seg(24, 12), loc=(x, y, CAM_Z), axis="X", bm=bm)
    # spur gear pair at the timing end: the belt turns the exhaust cam, which drives the intake cam
    gx = 0.172
    if HI():
        prism_x(gear_poly(34, 0.043, 0.047, y, CAM_Z, ofs=(math.pi / 34 if sy > 0 else 0)), gx - 0.006, gx + 0.006, bm=bm)
    else:
        C.cyl(0.045, 0.012, 24, loc=(gx, y, CAM_Z), axis="X", bm=bm)
    return mk("camshaft_" + side, bm, ["steel_machined"], sharp=40)


def make_valve_cover():
    """cast-alu cam cover with 4 injector wells on the centre line, oil separator on top"""
    z0, z1 = HEAD_TOP, VC_TOP
    nc = seg(6, 3)
    secs = [(z0, 0.209, 0.142, 0.02, 0, 0), (z0 + 0.008, 0.209, 0.142, 0.02, 0, 0), (z0 + 0.010, 0.205, 0.136, 0.02, 0, 0),
            (z1 - 0.022, 0.201, 0.127, 0.024, 0, 0), (z1 - 0.008, 0.197, 0.114, 0.03, 0, 0), (z1, 0.191, 0.094, 0.03, 0, 0)]
    vc = mk("valve_cover", loft_z(secs, n=nc), ["alu_cast"], uv=False)
    cut = bmesh.new()
    for xc in XC:
        C.cyl(0.0175, 0.2, 24, loc=(xc, 0, 0.56), bm=cut)
    C.boolean(vc, C.obj("_c", cut, ["alu_cast"], smooth=False))
    parts = [vc]
    rb = bmesh.new()
    for xc in XC:  # well collars with seals
        ring = C.lathe([(0.0175, z1 - 0.004), (0.026, z1 - 0.004), (0.026, z1 + 0.008), (0.0175, z1 + 0.008),
                        (0.0175, z1 - 0.004)], seg(28, 12), axis="Z")
        C.xform(ring, loc=(xc, 0, 0))
        C.merge(rb, ring)
    # oil separator / PCV housing on top (exhaust half), with its hose outlet
    C.merge(rb, C.box((0.19, 0.05, 0.022), loc=(-0.02, -0.058, z1 + 0.004), bevel=0.008 if HI() else 0, segs=2, mat=2))
    C.tube(C.bezier_path([(-0.12, -0.058, z1 + 0.008), (-0.16, -0.058, z1 + 0.012), (-0.2, -0.06, z1)], seg(5, 3)),
           0.008, seg(12, 6), bm=rb, mat=2)
    for x in ((-0.19, -0.095, 0.0, 0.095, 0.19) if HI() else ()):
        for sy in (1, -1):
            C.cyl(0.0085, 0.002, 12, loc=(x, sy * 0.1355, z0 + 0.009), bm=rb, mat=1)
            C.cyl(0.0058, 0.0045, 6, loc=(x, sy * 0.1355, z0 + 0.012), bm=rb, mat=1)
    cap = prism_x(gear_poly(12, 0.021, 0.025), -0.009, 0.009)
    C.xform(cap, rot=Matrix.Rotation(math.pi / 2, 3, "Y"), loc=(0.16, -0.06, z1 + 0.002))
    for f in cap.faces:
        f.material_index = 2
    C.merge(rb, cap)
    parts.append(mk("_vcr", rb, ["alu_cast", "steel_dark", "plastic_gloss"]))
    o = C.join(parts, "valve_cover")
    uv_eng(o)
    C.smooth_by_angle(o, 40)
    return o


# ── fuel system ──────────────────────────────────────────────────────────────
INJ_TOP = 0.628
INJ_INLET = (0.028, 0.594)  # (y, z) of the HP inlet cone on each injector


def make_injector(i):
    """solenoid common-rail injector standing in its well: nozzle body, steel body, HP inlet, solenoid cap"""
    xc = XC[i]
    b = bmesh.new()
    s = seg(20, 10)
    prof = [(0.0, 0.44), (0.0035, 0.442), (0.0045, 0.448), (0.0085, 0.452), (0.0085, 0.566), (0.0115, 0.568),
            (0.0115, 0.604), (0.0105, 0.606)]
    C.lathe(prof, s, axis="Z", bm=b, cap1=True)
    C.cyl(0.013, 0.008, 6, loc=(0, 0, 0.598), bm=b)  # body nut hex
    # HP inlet: horizontal cone + thread toward the rail (+Y)
    C.cyl(0.0058, 0.02, s, loc=(0, 0.018, INJ_INLET[1]), axis="Y", bm=b)
    # solenoid cap (black) + connector (-Y) + return-line nipple on top
    C.cyl(0.0122, 0.022, s, loc=(0, 0, 0.617), bm=b, mat=1)
    C.merge(b, C.box((0.014, 0.022, 0.016), loc=(0, -0.017, 0.618), bevel=0.002 if HI() else 0, segs=1, mat=1))
    C.cyl(0.0035, 0.008, 10, loc=(0.006, 0, INJ_TOP + 0.002), bm=b, mat=2)
    # hold-down claw across the body
    C.merge(b, C.box((0.012, 0.05, 0.006), loc=(0, -0.004, 0.515), mat=2))
    C.xform(b, loc=(xc, 0, 0))
    return mk(f"injector_{i + 1}", b, ["steel_machined", "plastic_gloss", "steel_dark"], sharp=40)


def make_rail():
    """forged rail: pressure sensor at -X, pressure-control valve at +X, 4 outlets, 1 inlet, 2 brackets"""
    b = bmesh.new()
    s = seg(24, 12)
    C.cyl(RAIL_R, 0.33, s, loc=(0.0, RAIL_Y, RAIL_Z), axis="X", bm=b)
    for xc in XC:  # outlet bosses (toward -Y, the injectors)
        C.cyl(0.0085, 0.02, 6, loc=(xc + 0.012, RAIL_Y - 0.012, RAIL_Z), axis="Y", bm=b)
    C.cyl(0.0085, 0.02, 6, loc=(0.118, RAIL_Y, RAIL_Z - 0.013), axis="Z", bm=b)  # inlet (from the pump)
    # end plugs
    C.cyl(0.011, 0.02, 6, loc=(-0.172, RAIL_Y, RAIL_Z), axis="X", bm=b, mat=1)
    C.cyl(0.011, 0.018, 6, loc=(0.171, RAIL_Y, RAIL_Z), axis="X", bm=b, mat=1)
    # pressure sensor (-X): body + connector ; pressure control valve (+X): solenoid + connector
    C.cyl(0.0085, 0.024, s, loc=(-0.192, RAIL_Y, RAIL_Z), axis="X", bm=b, mat=2)
    C.merge(b, C.box((0.012, 0.014, 0.02), loc=(-0.205, RAIL_Y, RAIL_Z + 0.008), mat=2))
    C.cyl(0.0135, 0.03, s, loc=(0.194, RAIL_Y, RAIL_Z), axis="X", bm=b, mat=2)
    C.merge(b, C.box((0.018, 0.016, 0.02), loc=(0.2, RAIL_Y, RAIL_Z + 0.017), mat=2))
    # brackets down to the cover shoulder / head
    for x in (-0.09, 0.075):  # cast brackets bolted to the cover shoulder, clamping the rail
        C.merge(b, C.box((0.024, 0.016, 0.052), loc=(x, RAIL_Y + 0.017, RAIL_Z - 0.03), bevel=0.003 if HI() else 0, segs=1, mat=3))
        C.merge(b, C.box((0.024, 0.03, 0.03), loc=(x, RAIL_Y + 0.004, RAIL_Z - 0.004), bevel=0.004 if HI() else 0, segs=1, mat=3))
        C.cyl(0.0065, 0.008, 6, loc=(x, RAIL_Y + 0.027, RAIL_Z - 0.044), axis="Y", bm=b, mat=1)
    return mk("common_rail", b, ["rail_steel", "steel_dark", "plastic_gloss", "alu_cast"], sharp=40)


def hp_line(pts, bm, r=0.003, nut=True):
    path = C.bezier_path(pts, seg(5, 3))
    C.tube(path, r, seg(8, 5), bm=bm, mat=0)
    if nut:
        for a, b2 in ((path[0], path[1]), (path[-1], path[-2])):
            d = (a - b2).normalized()
            hexnut(a - d * 0.002, d, 0.0075, 0.012, bm, mat=1)


def make_hp_lines():
    b = bmesh.new()
    y0 = RAIL_Y - 0.023
    for xc in XC:
        xo = xc + 0.012
        hp_line([(xo, y0, RAIL_Z), (xo, y0 - 0.012, RAIL_Z + 0.004), (xo - 0.004, 0.058, RAIL_Z + 0.02),
                 (xc + 0.001, 0.046, INJ_INLET[1] + 0.012), (xc, INJ_INLET[0] + 0.002, INJ_INLET[1])], b)
    # pump -> rail inlet
    hp_line([(0.176, 0.176, 0.402), (0.19, 0.178, 0.43), (0.198, 0.17, 0.49), (0.195, 0.15, 0.55), (0.15, 0.12, 0.585),
             (0.118, RAIL_Y, RAIL_Z - 0.026), (0.118, RAIL_Y, RAIL_Z - 0.021)], b, r=0.0032)
    return mk("hp_lines", b, ["hp_tube", "zinc"], sharp=50, recalc=False)


def make_return_line():
    """black leak-off line over the injector tops, T-pieces on each return nipple, back to the -X end"""
    b = bmesh.new()
    z = INJ_TOP + 0.008
    pts = []
    for xc in XC:
        pts.append((xc + 0.006, 0.0, z))
    C.tube(C.bezier_path([(0.15, 0.0, z)] + pts + [(-0.17, 0.004, z), (-0.2, 0.02, z - 0.01), (-0.22, 0.05, z - 0.04)],
                         seg(5, 2)), 0.0032, seg(10, 6), bm=b)
    for xc in XC:
        C.cyl(0.0048, 0.014, 10, loc=(xc + 0.006, 0, z), axis="X", bm=b, mat=1)
    return mk("return_line", b, ["rubber", "plastic_gloss"], sharp=50, recalc=False)


HP_Y, HP_Z = 0.182, 0.335


def make_hp_pump():
    """radial-piston HP pump on the intake side, belt-driven at cam speed; flange, head with inlet / outlet"""
    b = bmesh.new()
    s = seg(32, 14)
    prof = [(0.0, 0.10), (0.03, 0.10), (0.036, 0.106), (0.036, 0.176), (0.044, 0.18), (0.044, 0.192), (0.02, 0.196),
            (0.02, 0.222), (0.0, 0.222)]
    bb = C.lathe(prof, s, axis="X")
    C.xform(bb, loc=(0, HP_Y, HP_Z))
    C.merge(b, bb)
    C.merge(b, C.box((0.012, 0.11, 0.11), loc=(0.186, HP_Y, HP_Z), bevel=0.01 if HI() else 0, segs=2))  # mounting flange
    C.merge(b, C.box((0.05, 0.04, 0.05), loc=(0.14, HP_Y, HP_Z + 0.042), bevel=0.006 if HI() else 0, segs=1))  # pumping head
    C.cyl(0.009, 0.02, 6, loc=(0.176, HP_Y - 0.006, HP_Z + 0.07), axis="Z", bm=b, mat=1)  # outlet union
    C.cyl(0.006, 0.03, 12, loc=(0.12, HP_Y + 0.03, HP_Z + 0.03), axis="Y", bm=b, mat=1)  # low-pressure inlet
    C.merge(b, C.box((0.02, 0.018, 0.022), loc=(0.11, HP_Y - 0.02, HP_Z + 0.05), mat=2))  # metering valve connector
    for dy in (-0.042, 0.042):
        for dz in (-0.042, 0.042):
            C.cyl(0.0065, 0.008, 6, loc=(0.194, HP_Y + dy, HP_Z + dz), axis="X", bm=b, mat=1)
    return mk("hp_pump", b, ["alu_cast", "steel_dark", "plastic_gloss"], sharp=40)


def make_hp_pulley():
    return make_sprocket("hp_pump_pulley", 36, 0.042, BELT_X, HP_Y, HP_Z, hub_r=0.018)


# ── timing ───────────────────────────────────────────────────────────────────
PULLEYS = [  # (y, z, r) CCW seen from +X: crank, HP pump, idler, exhaust cam, tensioner
    (0.0, CRANK_Y, 0.030),
    (HP_Y, HP_Z, 0.042),
    (0.118, 0.478, 0.022),
    (-CAM_Y, CAM_Z, 0.060),
    (-0.075, 0.340, 0.028),
]


def belt_path(pulleys):
    P = [(Vector((y, z)), r) for y, z, r in pulleys]
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
        perp = Vector((dh.y, -dh.x))
        k = (r1 - r2) / L
        nrm = dh * k + perp * math.sqrt(max(0, 1 - k * k))
        tang.append((c1 + nrm * r1, c2 + nrm * r2, nrm))
    pts, nrms = [], []
    for i in range(n):
        c, r = P[i]
        a0 = math.atan2(tang[i - 1][2].y, tang[i - 1][2].x)
        a1 = math.atan2(tang[i][2].y, tang[i][2].x)
        while a1 < a0:
            a1 += 2 * math.pi
        steps = max(2, int((a1 - a0) / seg(0.08, 0.2)))
        for s in range(steps + 1):
            a = a0 + (a1 - a0) * s / steps
            nv = Vector((math.cos(a), math.sin(a)))
            pts.append(c + nv * r)
            nrms.append(nv)
        p0, p1, nv = tang[i]
        m = max(1, int((p1 - p0).length / seg(0.03, 0.2)))
        for s in range(1, m):
            pts.append(p0 + (p1 - p0) * s / m)
            nrms.append(nv)
    return pts, nrms


def make_belt(name, pulleys, bx, w=0.025, t=0.0035, teeth=True, ribs=False):
    pts, nrms = belt_path(pulleys)
    bm = bmesh.new()
    x0, x1 = bx - w / 2, bx + w / 2
    rings = []
    for p, nv in zip(pts, nrms):
        po = p + nv * t
        rings.append([bm.verts.new((x0, p.x, p.y)), bm.verts.new((x1, p.x, p.y)),
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
    if HI() and teeth:
        acc = [0.0]
        for i in range(1, n):
            acc.append(acc[-1] + (pts[i] - pts[i - 1]).length)
        total = acc[-1]
        s, idx = 0.0, 0
        while s < total - 0.0095:
            while idx < n - 2 and acc[idx + 1] < s:
                idx += 1
            f = (s - acc[idx]) / max(1e-9, acc[idx + 1] - acc[idx])
            p = pts[idx].lerp(pts[idx + 1], f)
            nv = nrms[idx].lerp(nrms[idx + 1], f).normalized()
            tv = Vector((-nv.y, nv.x))
            tooth = C.box((w * 0.98, 0.0045, 0.0028))
            M = Matrix(((1, 0, 0), (0, tv.x, -nv.x), (0, tv.y, -nv.y)))
            for v in tooth.verts:
                wc = M @ v.co.copy()
                v.co = Vector((bx + wc.x, p.x + wc.y, p.y + wc.z)) - Vector((0, nv.x, nv.y)) * 0.0012
            C.merge(bm, tooth)
            s += 0.0095
    return mk(name, bm, ["rubber"], sharp=40, recalc=False)


def make_tensioner():
    bm = bmesh.new()
    for (y, z, r) in (PULLEYS[4], PULLEYS[2]):
        prof = [(0.008, BELT_X - 0.014), (r - 0.002, BELT_X - 0.014), (r, BELT_X - 0.012), (r, BELT_X + 0.012),
                (r - 0.002, BELT_X + 0.014), (0.008, BELT_X + 0.014), (0.008, BELT_X - 0.014)]
        b = C.lathe(prof, seg(40, 16), axis="X")
        C.xform(b, loc=(0, y, z))
        C.merge(bm, b)
        C.cyl(0.009, 0.006, 6, loc=(BELT_X + 0.017, y, z), axis="X", bm=bm, mat=1)
    y, z, r = PULLEYS[4]
    C.merge(bm, C.box((0.01, 0.024, 0.07), loc=(BELT_X - 0.019, y + 0.012, z - 0.03), bevel=0.004 if HI() else 0, segs=1))
    return mk("tensioner", bm, ["pulley_steel", "steel_dark"], sharp=40)


def make_cam_pulley():
    """exhaust-cam belt sprocket: toothed rim, 5 spokes, hub (no booleans)"""
    y, z, r = PULLEYS[3]
    x, width = BELT_X, 0.026
    bm = bmesh.new()
    ri = r - 0.012
    outer = gear_poly(46, r - 0.004, r, y, z) if HI() else [
        (y + (r - 0.002) * math.cos(2 * math.pi * k / 48), z + (r - 0.002) * math.sin(2 * math.pi * k / 48)) for k in range(48)]
    m = len(outer)
    inner = [(y + ri * math.cos(math.atan2(p[1] - z, p[0] - y)), z + ri * math.sin(math.atan2(p[1] - z, p[0] - y))) for p in outer]
    x0, x1 = x - width / 2, x + width / 2
    o0 = [bm.verts.new((x0, a, c)) for a, c in outer]
    o1 = [bm.verts.new((x1, a, c)) for a, c in outer]
    i0 = [bm.verts.new((x0, a, c)) for a, c in inner]
    i1 = [bm.verts.new((x1, a, c)) for a, c in inner]
    for k in range(m):
        j = (k + 1) % m
        bm.faces.new((o0[k], o0[j], o1[j], o1[k]))
        bm.faces.new((i0[j], i0[k], i1[k], i1[j]))
        bm.faces.new((o0[j], o0[k], i0[k], i0[j]))
        bm.faces.new((o1[k], o1[j], i1[j], i1[k]))
    for k in range(5):
        a = 2 * math.pi * (k + 0.25) / 5
        L = ri - 0.018 + 0.004
        sp = C.box((width * 0.55, 0.013, L), loc=(x - width * 0.15, 0, 0.018 + L / 2 - 0.002), bevel=0.002 if HI() else 0, segs=1)
        C.xform(sp, rot=Matrix.Rotation(a, 3, "X"), loc=(0, y, z))
        C.merge(bm, sp)
    C.cyl(0.022, width + 0.006, seg(28, 12), loc=(x, y, z), axis="X", bm=bm)
    C.cyl(0.009, 0.006, 6, loc=(x + width / 2 + 0.004, y, z), axis="X", bm=bm)
    return mk("cam_pulley_exhaust", bm, ["steel_dark"], sharp=35, recalc=False)


def make_timing_cover():
    """smooth moulded two-piece belt cover following the belt hull (no ribs: plain draft faces + rim bead)"""
    pts = []
    for y, z, r in PULLEYS:
        for k in range(48):
            a = 2 * math.pi * k / 48
            pts.append((round(y + (r + 0.017) * math.cos(a), 5), round(z + (r + 0.017) * math.sin(a), 5)))
    hull = hull2d(pts)
    zs = 0.395
    parts = []
    for name, keep_above, zc in (("upper", True, zs + 0.002), ("lower", False, zs - 0.002)):
        poly = clip_poly(hull, zc, keep_above)
        o = mk("_tc_" + name, prism_x(poly, 0.222, 0.263), ["plastic_black"], sharp=35, uv=False)
        if HI():
            C.bevel_mod(o, width=0.007, segs=3, angle=35)
        parts.append(o)
    bb = bmesh.new()
    for y, z in ((-0.12, 0.47), (0.10, 0.49), (-0.11, 0.33), (0.13, 0.30), (0.0, 0.55), (0.06, 0.15)):
        C.cyl(0.006, 0.006, 6, loc=(0.264, y, z), axis="X", bm=bb)
    parts.append(mk("_tcb", bb, ["steel_dark"]))
    o = C.join(parts, "timing_cover")
    uv_eng(o)
    C.smooth_by_angle(o, 40)
    return o


# ── air / exhaust ────────────────────────────────────────────────────────────
PLENUM_Y, PLENUM_Z = 0.214, 0.44


def make_intake():
    """compact cast-alu intake manifold: 4 short runners into a plenum along X; swirl-flap actuator"""
    bm = bmesh.new()
    for xc in XC:
        path = C.bezier_path([(xc, 0.160, 0.455), (xc, 0.185, 0.458), (xc, 0.205, 0.448), (xc * 0.97, PLENUM_Y, PLENUM_Z)], seg(5, 3))
        rb = C.tube(path, 0.019, seg(16, 8), caps=False)
        for v in rb.verts:
            v.co.x = xc + (v.co.x - xc) * 0.75
        C.merge(bm, rb)
    # plenum: cast rounded box along X (loft built along z, turned onto X), domed ends, cast ribs on top
    secs = [(-0.2, 0.026, 0.024, 0.018, 0, 0), (-0.195, 0.034, 0.032, 0.02, 0, 0), (-0.185, 0.038, 0.036, 0.022, 0, 0),
            (0.165, 0.038, 0.036, 0.022, 0, 0), (0.176, 0.034, 0.032, 0.02, 0, 0), (0.182, 0.024, 0.022, 0.016, 0, 0)]
    pb = loft_z(secs, n=seg(5, 3))
    C.xform(pb, rot=Matrix.Rotation(math.pi / 2, 3, "Y"), loc=(0, PLENUM_Y, PLENUM_Z))
    C.merge(bm, pb)
    for x in ((-0.13, -0.044, 0.044, 0.13) if HI() else ()):
        C.merge(bm, C.box((0.006, 0.05, 0.012), loc=(x, PLENUM_Y - 0.004, PLENUM_Z + 0.036), bevel=0.002, segs=1))
    C.merge(bm, C.box((0.37, 0.012, 0.056), loc=(0, 0.166, 0.455), bevel=0.004 if HI() else 0, segs=1))
    for x in (0.088, 0.0, -0.088):
        C.merge(bm, C.box((0.006, 0.045, 0.05), loc=(x, 0.19, 0.44)))
    # throttle / flap body at the -X end: the intercooler pipe and the EGR valve meet here
    tb = ring_x(0.027, 0.035, -0.245, -0.2, seg(32, 14))
    C.xform(tb, loc=(0, PLENUM_Y, PLENUM_Z))
    C.merge(bm, tb)
    C.merge(bm, C.box((0.012, 0.085, 0.085), loc=(-0.2, PLENUM_Y, PLENUM_Z), bevel=0.006 if HI() else 0, segs=1))
    C.merge(bm, C.box((0.035, 0.03, 0.04), loc=(-0.222, PLENUM_Y + 0.045, PLENUM_Z - 0.01), bevel=0.004 if HI() else 0, segs=1, mat=1))
    return mk("intake_manifold", bm, ["alu_cast", "plastic_gloss"], sharp=45, recalc=False)


def make_exhaust():
    """cast-iron log manifold: port flanges -> log -> elbow down onto the turbine inlet flange"""
    bm = bmesh.new()
    s = seg(16, 8)
    ylog, zlog = -0.196, 0.448
    for xc in XC:
        C.tube(C.bezier_path([(xc, -0.158, 0.462), (xc, -0.176, 0.46), (xc * 0.97, ylog, zlog)], seg(4, 2)), 0.018, s, caps=False, bm=bm)
        C.merge(bm, C.box((0.058, 0.01, 0.046), loc=(xc, -0.165, 0.462), bevel=0.006 if HI() else 0, segs=1))
        for sx in (-0.021, 0.021):
            C.cyl(0.0065, 0.009, 6, loc=(xc + sx, -0.172, 0.462 + (0.015 if sx > 0 else -0.015)), axis="Y", bm=bm, mat=1)
    lg = C.lathe([(0.0, -0.17), (0.018, -0.168), (0.023, -0.155), (0.024, 0.14), (0.02, 0.155), (0.0, 0.158)], seg(24, 10), axis="X")
    C.xform(lg, loc=(0, ylog, zlog))
    C.merge(bm, lg)
    fl = turbine_flange_world()
    C.tube(C.bezier_path([(fl.x, ylog, zlog - 0.01), (fl.x, ylog - 0.012, zlog - 0.03), (fl.x, fl.y, fl.z + 0.02),
                          (fl.x, fl.y, fl.z + 0.004)], seg(5, 3)), 0.022, s, bm=bm)
    C.merge(bm, C.box((0.046, 0.045, 0.008), loc=(fl.x, fl.y, fl.z + 0.004), bevel=0.003 if HI() else 0, segs=1))
    # EGR take-off at the +X end of the log
    C.cyl(0.013, 0.03, s, loc=(0.16, ylog, zlog + 0.012), axis="X", bm=bm)
    return mk("exhaust_manifold", bm, ["iron_hot", "steel_dark"], sharp=45, recalc=False)


def turbo_matrix():
    """lib3d turbo parts (shaft along X, compressor +X) -> scaled, flipped (turbine inlet up), placed"""
    return Matrix.Translation(TURBO) @ Matrix.Rotation(math.pi, 4, "X") @ Matrix.Scale(TS, 4)


def turbine_flange_world():
    p0z = -(0.052 + 0.030 * 0.95)
    return turbo_matrix() @ Vector((-0.071, 0.030, p0z - 0.062))


def compressor_outlet_world():
    th = math.radians(36) + 2 * math.pi * 0.9
    tang = Vector((0, -math.sin(th), math.cos(th)))
    rc = 0.050 + 0.0255 * 0.95
    end = Vector((0.053, rc * math.cos(th), rc * math.sin(th))) + tang * 0.075
    M = turbo_matrix()
    return M @ end, (M.to_3x3() @ tang).normalized()


def make_turbo():
    """turbo node (empty on the shaft axis) > compressor_housing, center_housing, turbine_housing,
    compressor_wheel (spins about local X), turbo_actuator — the lib3d turbo geometry at 0.62 scale"""
    root = C.empty("turbo", loc=TURBO)
    root.rotation_euler = (math.pi, 0, 0)
    root.scale = (TS, TS, TS)
    kids = {
        "compressor_housing": TB.compressor_housing("lo"),
        "center_housing": TB.center_housing("lo"),
        "turbine_housing": TB.turbine_housing("lo"),
        "compressor_wheel": TB.compressor_wheel("lo"),
        "turbo_actuator": TB.actuator("lo"),
    }
    M = turbo_matrix()
    out = []
    for k, o in kids.items():
        o.name = k
        o.data.name = k
        o.data.transform(M)  # bake to engine space for UVs + AO; re-parented under the empty after the bake
        uv_eng(o)
        out.append(o)
    return root, out


def make_charge_pipes():
    p, d = compressor_outlet_world()
    bo = bmesh.new()
    s = seg(18, 8)
    # intercooler_pipe_out: compressor outlet -> down the exhaust side -> hose stub pointing out (-Y blender)
    path = C.bezier_path([p - d * 0.004, p + d * 0.03, Vector((p.x + 0.01, p.y - 0.01, 0.20)), Vector((p.x + 0.02, p.y - 0.03, 0.14)),
                          Vector((p.x + 0.02, p.y - 0.07, 0.12)), Vector((p.x + 0.02, p.y - 0.10, 0.118))], seg(6, 3))
    C.tube(path, 0.0175, s, bm=bo)
    end = path[-1]
    C.cyl(0.0205, 0.004, s, loc=end + Vector((0, 0.012, 0)), axis="Y", bm=bo)  # bead
    C.cyl(0.023, 0.05, s, loc=end + Vector((0, -0.02, 0)), axis="Y", bm=bo, mat=1)  # hose stub
    C.cyl(0.0245, 0.01, s, loc=end + Vector((0, -0.005, 0)), axis="Y", bm=bo, mat=2)  # clamp
    out = mk("intercooler_pipe_out", bo, ["alu_cast", "rubber", "zinc"], sharp=50, recalc=False)
    # intercooler_pipe_in: from the intercooler (hose stub, low, flywheel end) up into the throttle body
    bi = bmesh.new()
    path = C.bezier_path([(-0.244, PLENUM_Y, PLENUM_Z), (-0.27, PLENUM_Y, PLENUM_Z), (-0.29, PLENUM_Y + 0.03, PLENUM_Z - 0.06),
                          (-0.292, PLENUM_Y + 0.05, 0.30), (-0.292, PLENUM_Y + 0.05, 0.23)], seg(6, 3))
    C.tube(path, 0.025, s, bm=bi)
    end = Vector(path[-1])
    C.cyl(0.028, 0.004, s, loc=end + Vector((0, 0, 0.012)), axis="Z", bm=bi)
    C.cyl(0.0305, 0.055, s, loc=end + Vector((0, 0, -0.022)), axis="Z", bm=bi, mat=1)
    C.cyl(0.032, 0.01, s, loc=end + Vector((0, 0, -0.006)), axis="Z", bm=bi, mat=2)
    inn = mk("intercooler_pipe_in", bi, ["alu_cast", "rubber", "zinc"], sharp=50, recalc=False)
    # air inlet hose on the compressor (from the air filter): short rubber elbow
    M = turbo_matrix()
    ci = M @ Vector((0.136, 0, 0))
    ba = bmesh.new()
    C.tube(C.bezier_path([ci + Vector((-0.004, 0, 0)), ci + Vector((0.03, 0, 0)), ci + Vector((0.055, -0.01, 0.03)),
                          ci + Vector((0.06, -0.012, 0.07))], seg(6, 3)), 0.024, s, bm=ba)
    C.cyl(0.026, 0.012, s, loc=ci + Vector((0.012, 0, 0)), axis="X", bm=ba, mat=1)
    air = mk("air_inlet_hose", ba, ["rubber", "zinc"], sharp=50, recalc=False)
    return out, inn, air


def make_downpipe():
    M = turbo_matrix()
    o = M @ Vector((-0.138, 0, 0))
    b = bmesh.new()
    s = seg(18, 8)
    path = C.bezier_path([o + Vector((0.004, 0, 0)), o + Vector((-0.03, 0, 0)), o + Vector((-0.055, 0.0, -0.04)),
                          o + Vector((-0.06, 0.0, -0.1)), Vector((o.x - 0.06, o.y, 0.1))], seg(6, 3))
    C.tube(path, 0.0215, s, bm=b)
    C.merge(b, C.box((0.07, 0.07, 0.008), loc=(o.x - 0.06, o.y, 0.1), bevel=0.006 if HI() else 0, segs=1, mat=1))
    return mk("downpipe", b, ["stainless", "steel_dark"], sharp=50, recalc=False)


def make_egr():
    """EGR cooler (stainless, corrugated shell) above the log manifold, crossover pipe over the flywheel end
    into the EGR valve on the throttle body"""
    s = seg(16, 10)
    cb = bmesh.new()
    y, z = -0.192, 0.515
    prof = [(0.0, 0.10), (0.016, 0.10), (0.026, 0.085)]
    n = seg(14, 4)
    for k in range(n):
        xa = 0.075 - k * 0.2 / n
        prof += [(0.029, xa), (0.0265, xa - 0.2 / n * 0.5)]
    prof += [(0.029, -0.13), (0.026, -0.14), (0.016, -0.15), (0.0, -0.15)]
    b = C.lathe(prof, s, axis="X")
    C.xform(b, loc=(0, y, z))
    C.merge(cb, b)
    for x in (0.1, -0.15):  # end flanges
        C.cyl(0.03, 0.006, s, loc=(x, y, z), axis="X", bm=cb, mat=1)
    # feed from the manifold's +X take-off, crossover pipe to the valve
    C.tube(C.bezier_path([(0.172, -0.196, 0.46), (0.19, -0.196, 0.49), (0.16, y, z + 0.01), (0.105, y, z)], seg(5, 3)),
           0.011, seg(12, 6), bm=cb)
    C.tube(C.bezier_path([(-0.155, y, z), (-0.235, y + 0.005, z + 0.015), (-0.28, -0.12, 0.57), (-0.284, 0.02, 0.585),
                          (-0.28, 0.14, 0.56), (-0.285, 0.205, 0.52), (-0.262, PLENUM_Y, PLENUM_Z + 0.052), (-0.246, PLENUM_Y, PLENUM_Z + 0.05)],
                         seg(6, 3)), 0.013, seg(12, 6), bm=cb)
    cooler = mk("egr_cooler", cb, ["stainless", "steel_dark"], sharp=45, recalc=False)
    vb = bmesh.new()
    C.merge(vb, C.box((0.04, 0.05, 0.03), loc=(-0.225, PLENUM_Y, PLENUM_Z + 0.048), bevel=0.005 if HI() else 0, segs=1))
    C.cyl(0.024, 0.045, s, loc=(-0.225, PLENUM_Y + 0.004, PLENUM_Z + 0.085), axis="Z", bm=vb, mat=1)  # actuator
    C.merge(vb, C.box((0.014, 0.018, 0.016), loc=(-0.225, PLENUM_Y + 0.03, PLENUM_Z + 0.1), mat=1))
    valve = mk("egr_valve", vb, ["alu_cast", "plastic_gloss"], sharp=40)
    return cooler, valve


def make_glow_plug(i):
    xc = XC[i] - 0.022
    b = bmesh.new()
    d = Vector((0, 1, 0.35)).normalized()
    p = Vector((xc, 0.157, 0.505))
    cyl_dir(0.004, 0.02, p + d * 0.006, d, 10, b)
    hexnut(p + d * 0.017, d, 0.0062, 0.008, b)
    cyl_dir(0.003, 0.012, p + d * 0.027, d, 8, b, mat=1)
    hexnut(p + d * 0.033, d, 0.004, 0.004, b, mat=1)
    return mk(f"glow_plug_{i + 1}", b, ["steel_machined", "copper"], sharp=40)


def make_vacuum_pump():
    b = bmesh.new()
    s = seg(28, 12)
    C.lathe([(0.0, -0.22), (0.036, -0.22), (0.036, -0.232), (0.033, -0.25), (0.02, -0.256), (0.0, -0.256)], s, axis="X", bm=b)
    C.xform(b, loc=(0, -CAM_Y, CAM_Z))
    C.cyl(0.0075, 0.03, 12, loc=(-0.238, -CAM_Y - 0.035, CAM_Z + 0.01), axis="Y", bm=b, mat=1)  # vacuum outlet
    for a in (0.6, 2.7, 4.8):
        C.cyl(0.0055, 0.006, 6, loc=(-0.226, -CAM_Y + 0.03 * math.cos(a), CAM_Z + 0.03 * math.sin(a)), axis="X", bm=b, mat=2)
    return mk("vacuum_pump", b, ["black_paint", "alu_cast", "steel_dark"], sharp=40)


# ── lubrication / ancillaries ────────────────────────────────────────────────
def make_oil_pan():
    b = bmesh.new()
    nc = seg(6, 3)
    loft_z([(0.088, 0.206, 0.168, 0.03, 0, 0), (0.12, 0.212, 0.174, 0.026, 0, 0), (BLOCK_Z0, 0.217, 0.175, 0.026, 0, 0)],
           n=nc, bm=b, mat=0)
    for sy in ((1, -1) if HI() else ()):
        for x in (-0.15, -0.09, -0.03, 0.03, 0.09, 0.15):
            C.merge(b, C.box((0.006, 0.008, 0.034), loc=(x, sy * 0.172, 0.106), mat=0))
    loft_z([(0.056, 0.194, 0.152, 0.03, 0, 0), (0.07, 0.198, 0.158, 0.03, 0, 0), (0.09, 0.2, 0.162, 0.03, 0, 0)], n=nc, bm=b, mat=1)
    loft_z([(0.0, 0.084, 0.122, 0.035, -0.09, 0), (0.012, 0.09, 0.13, 0.035, -0.09, 0), (0.06, 0.096, 0.14, 0.035, -0.09, 0)],
           n=nc, bm=b, mat=1)
    for sy in (1, -1):
        C.merge(b, C.box((0.13, 0.004, 0.008), loc=(-0.09, sy * 0.136, 0.032), bevel=0.002 if HI() else 0, segs=1, mat=1))
    C.cyl(0.013, 0.004, 16, loc=(-0.182, 0.04, 0.022), axis="X", bm=b, mat=2)
    C.cyl(0.009, 0.01, 6, loc=(-0.188, 0.04, 0.022), axis="X", bm=b, mat=2)
    return mk("oil_pan", b, ["alu_cast", "black_paint", "steel_dark"], sharp=35)


def make_oil_filter():
    """oil filter / cooler module: cast housing, black cartridge cap with hex, plate cooler underneath"""
    b = bmesh.new()
    s = seg(36, 14)
    x, y = -0.045, 0.205
    C.lathe([(0.0, 0.245), (0.034, 0.245), (0.034, 0.33), (0.036, 0.332), (0.0, 0.332)], s, axis="Z", bm=b)
    C.xform(b, loc=(x, y, 0))
    cap = C.lathe([(0.0, 0.332), (0.037, 0.332), (0.037, 0.35), (0.033, 0.356), (0.0, 0.356)], s, axis="Z")
    C.cyl(0.015, 0.014, 6, loc=(0, 0, 0.362), bm=cap)
    C.xform(cap, loc=(x, y, 0))
    for f in cap.faces:
        f.material_index = 1
    C.merge(b, cap)
    for k in range(seg(8, 3)):  # plate-type oil cooler
        C.merge(b, C.box((0.075, 0.06, 0.0045), loc=(x, y, 0.19 + k * 0.0065), bevel=0.0015 if HI() else 0, segs=1, mat=2))
    C.merge(b, C.box((0.08, 0.02, 0.1), loc=(x, 0.18, 0.25)))  # bracket onto the block pad
    for dz in (0.2, 0.235):
        C.cyl(0.007, 0.03, 12, loc=(x + 0.045, y, dz), axis="X", bm=b, mat=3)  # coolant nipples
    return mk("oil_filter", b, ["alu_cast", "plastic_gloss", "stainless", "steel_dark"], sharp=40)


ALT = (0.236, 0.18)  # alternator (y, z)


def make_alternator():
    x0, x1 = 0.165, 0.262
    y, z = ALT
    prof = [(0.0, x0 - 0.004), (0.05, x0 - 0.004), (0.062, x0 + 0.006)]
    nr = seg(10, 4)
    for k in range(nr):
        xa = x0 + 0.012 + k * (x1 - x0 - 0.024) / nr
        prof += [(0.064, xa), (0.058, xa + 0.003), (0.064, xa + 0.006)]
    prof += [(0.062, x1 - 0.004), (0.045, x1), (0.015, x1), (0.015, x1 + 0.012), (0.0, x1 + 0.012)]
    b = C.lathe(prof, seg(32, 14), axis="X")
    C.xform(b, loc=(0, y, z))
    pul = C.lathe([(0.014, 0.0), (0.028, 0.0), (0.028, 0.026), (0.014, 0.026)], seg(32, 12), axis="X")
    C.xform(pul, loc=(0.272, y, z))
    for f in pul.faces:
        f.material_index = 1
    C.merge(b, pul)
    C.merge(b, C.box((0.03, 0.07, 0.03), loc=(0.2, y - 0.055, z + 0.03), mat=0))  # mounting ear onto the block boss
    return mk("alternator", b, ["alu_cast", "pulley_steel"], sharp=40)


def make_starter():
    b = bmesh.new()
    C.cyl(0.038, 0.12, seg(28, 12), loc=(-0.15, 0.20, 0.14), axis="X", bm=b, mat=0)
    C.cyl(0.03, 0.04, seg(24, 10), loc=(-0.225, 0.20, 0.14), axis="X", bm=b, mat=1)
    C.cyl(0.018, 0.09, seg(16, 8), loc=(-0.145, 0.20, 0.19), axis="X", bm=b, mat=0)
    return mk("starter", b, ["black_paint", "alu_cast"], sharp=40)


def make_dipstick():
    b = bmesh.new()
    C.tube(C.bezier_path([(-0.172, 0.168, 0.25), (-0.172, 0.17, 0.42), (-0.175, 0.16, 0.55), (-0.176, 0.155, 0.605)], 5),
           0.005, 8, bm=b, mat=1)
    ring = C.torus(0.014, 0.0045, 16, 6, axis="Y")
    C.xform(ring, loc=(-0.176, 0.155, 0.624))
    C.merge(b, ring)
    return mk("dipstick", b, ["yellow", "steel_dark"], sharp=40)


def make_coolant_hose():
    b = bmesh.new()
    C.tube(C.bezier_path([(-0.24, 0.07, 0.47), (-0.27, 0.075, 0.46), (-0.3, 0.08, 0.38), (-0.3, 0.07, 0.30)], seg(6, 3)),
           0.016, seg(14, 8), bm=b)
    return mk("coolant_hose", b, ["rubber"], sharp=50)


# ── assembly ─────────────────────────────────────────────────────────────────
# explode offsets, three space (x, y, z = -blender y): intake side is -Z, exhaust / turbo side +Z
EXPLODE = {
    "return_line": (0, 0.80, 0), "hp_lines": (0, 0.70, -0.06), "common_rail": (0, 0.74, -0.16), "injector": (0, 0.62, 0),
    "valve_cover": (0, 0.50, 0), "glow_plug": (0, 0.20, -0.18), "head": (0, 0.30, 0), "head_gasket": (0, 0.15, 0),
    "camshaft_intake": (0, 0.42, -0.08), "camshaft_exhaust": (0, 0.42, 0.08), "cam_pulley_exhaust": (0.14, 0, 0),
    "vacuum_pump": (-0.20, 0.30, 0.05),
    "timing_cover": (0.50, 0.02, 0), "timing_belt": (0.28, 0.02, 0), "tensioner": (0.34, 0, 0.04),
    "hp_pump": (0.14, 0.02, -0.32), "hp_pump_pulley": (0.12, 0, 0),
    "crankshaft": (0, -0.26, 0), "crank_pulley": (0.18, 0, 0), "flywheel": (-0.18, 0, 0),
    "piston": (0, 0.22, 0), "oil_pan": (0, -0.46, 0),
    "intake_manifold": (0, 0.10, -0.32), "egr_valve": (0, 0.26, -0.34), "egr_cooler": (0, 0.36, 0.30),
    "intercooler_pipe_in": (-0.12, 0.02, -0.46), "exhaust_manifold": (0, 0.06, 0.30),
    "turbo": (0, -0.02, 0.44), "compressor_housing": (0.10, 0, 0), "compressor_wheel": (0.05, 0, 0),
    "turbine_housing": (-0.10, 0, 0), "turbo_actuator": (0, -0.08, 0.06),
    "intercooler_pipe_out": (0.04, -0.10, 0.60), "air_inlet_hose": (0.14, 0.02, 0.50), "downpipe": (-0.14, -0.12, 0.48),
    "alternator": (0.10, -0.10, -0.34), "oil_filter": (0, 0.02, -0.30), "starter": (-0.08, -0.08, -0.30),
    "dipstick": (0, 0.30, -0.18), "accessory_belt": (0.34, -0.02, -0.06), "coolant_hose": (-0.18, 0.2, -0.1),
    "block": (0, 0, 0),
}
SPIN = {"crankshaft": 1.0, "camshaft_intake": 0.5, "camshaft_exhaust": 0.5, "hp_pump_pulley": 0.5, "compressor_wheel": 12.0}


ALIAS = {"cast_alu": "alu_cast", "cast_iron": "iron_cast", "cast_iron_hot": "iron_hot"}  # turbo builder names
LO_MERGE = {  # phone LOD: fewer primitives (every material slot is its own glTF primitive + 5 accessors)
    "black_paint": "steel_dark", "plastic_gloss": "steel_dark", "actuator_paint": "steel_dark", "bore_dark": "steel_dark",
    "rubber": "steel_dark", "steel_machined": "pulley_steel", "hp_tube": "pulley_steel", "zinc": "pulley_steel",
    "stainless": "pulley_steel", "alu_machined": "pulley_steel", "alu_milled": "pulley_steel", "steel": "pulley_steel",
    "rail_steel": "pulley_steel", "bore": "pulley_steel", "gasket": "pulley_steel", "piston_alu": "pulley_steel",
    "copper": "pulley_steel", "steel_forged": "pulley_steel",
}


def consolidate(ob, mapping):
    """remap material slots through `mapping` and merge slots that end up on the same material"""
    me = ob.data
    names = [(m.name if m else None) for m in me.materials]
    tgt = [mapping.get(n, n) for n in names]
    uniq = []
    for t in tgt:
        if t not in uniq:
            uniq.append(t)
    if uniq == names:
        return
    remap = [uniq.index(t) for t in tgt]
    idx = np.zeros(len(me.polygons), np.int32)
    me.polygons.foreach_get("material_index", idx)
    idx = np.array(remap, np.int32)[np.clip(idx, 0, len(remap) - 1)]
    me.materials.clear()
    for t in uniq:
        me.materials.append(bpy.data.materials[t])
    me.polygons.foreach_set("material_index", idx)


def reparent(child, par):
    mw = child.matrix_world.copy()
    child.parent = par
    child.matrix_world = mw


def build(q):
    global Q
    Q = q
    mats()
    root = C.empty("engine_diesel")
    block = make_block()
    gasket = make_gasket()
    head = make_head()
    vc = make_valve_cover()
    cam_i, cam_e = make_cam("intake"), make_cam("exhaust")
    cpul_e = make_cam_pulley()
    tcov = make_timing_cover()
    crank = make_crank()
    sprocket = make_sprocket("_crank_sprocket", 22, PULLEYS[0][2], BELT_X, 0.0, CRANK_Y)
    crank = C.join([crank, sprocket], "crankshaft")
    cpul = make_crank_pulley()
    fly = make_flywheel()
    belt = make_belt("timing_belt", PULLEYS, BELT_X)
    tens = make_tensioner()
    abelt = make_belt("accessory_belt", [(0.0, CRANK_Y, 0.0745), (ALT[0], ALT[1], 0.0285), (0.105, 0.075, 0.024)],
                      bx=0.285, w=0.022, t=0.004, teeth=False)
    abelt_idler = bmesh.new()
    ib = C.lathe([(0.008, 0.272), (0.022, 0.272), (0.022, 0.298), (0.008, 0.298), (0.008, 0.272)], seg(28, 12), axis="X")
    C.xform(ib, loc=(0, 0.105, 0.075))
    C.merge(abelt_idler, ib)
    idl = mk("_idl", abelt_idler, ["pulley_steel"])
    abelt = C.join([abelt, idl], "accessory_belt")
    pistons, rods = [], []
    p0, rd0 = make_piston(0), make_conrod(0)
    for i in range(4):
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
    rail = make_rail()
    injs = [make_injector(i) for i in range(4)]
    hpl = make_hp_lines()
    ret = make_return_line()
    hpp = make_hp_pump()
    hpp_pul = make_hp_pulley()
    turbo, tparts = make_turbo()
    pipe_out, pipe_in, air = make_charge_pipes()
    dp = make_downpipe()
    egr_c, egr_v = make_egr()
    glows = [make_glow_plug(i) for i in range(4)]
    vac = make_vacuum_pump()
    alt = make_alternator()
    oilf = make_oil_filter()
    dip = make_dipstick()
    hose = make_coolant_hose()
    parts = [block, gasket, head, vc, cam_i, cam_e, cpul_e, tcov, crank, cpul, fly, belt, tens, abelt, pan, intake, exh,
             rail, hpl, ret, hpp, hpp_pul, pipe_out, pipe_in, air, dp, egr_c, egr_v, vac, alt, oilf, dip, hose] + \
        pistons + rods + injs + glows + tparts
    if HI():
        parts.append(make_starter())
    seen_m = set()
    two_tone = ("injector", "piston", "dipstick", "oil_filter", "intercooler_pipe", "common_rail", "valve_cover")
    for o in parts:
        if o.data.name in seen_m:
            continue
        seen_m.add(o.data.name)
        consolidate(o, ALIAS if HI() else {**ALIAS, **LO_MERGE})
        if not HI() and not o.name.startswith(two_tone) and len(o.data.materials) > 1:
            # phone LOD: one primitive per part (the dominant material wins; small hardware takes its colour)
            idx = np.zeros(len(o.data.polygons), np.int32)
            o.data.polygons.foreach_get("material_index", idx)
            dom = o.data.materials[int(np.bincount(idx).argmax())].name
            consolidate(o, {m.name: dom for m in o.data.materials})
    if not HI():  # phone LOD: collapse-decimate the dense meshes (belts / lines / thin shells keep their topology)
        keep = {"timing_belt", "accessory_belt", "hp_lines", "return_line", "timing_cover"}
        done = set()
        for o in parts:
            if o.data.name in done or o.name in keep:
                continue
            done.add(o.data.name)
            nt = sum(len(p.vertices) - 2 for p in o.data.polygons)
            if nt > 500:
                old_me = o.data
                C.decimate(o, 0.35 if nt > 1500 else 0.5)
                for o2 in parts:  # instanced pistons / rods share the decimated mesh
                    if o2 is not o and o2.data is old_me:
                        o2.data = o.data
    bpy.context.view_layer.update()
    uniq, seen = [], set()
    for o in parts:
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
    set_pivot(cpul_e, (BELT_X, -CAM_Y, CAM_Z))
    set_pivot(hpp, (0.15, HP_Y, HP_Z))
    set_pivot(hpp_pul, (BELT_X, HP_Y, HP_Z))
    set_pivot(rail, (0, RAIL_Y, RAIL_Z))
    for i, o in enumerate(injs):
        set_pivot(o, (XC[i], 0, 0.52))
    Minv = turbo_matrix().inverted()
    for o in tparts:  # back into turbo-local space (the empty carries the scale / flip / placement)
        o.data.transform(Minv)
    fixed = {crank, cpul, fly, cam_i, cam_e, cpul_e, hpp, hpp_pul, rail} | set(injs) | set(pistons) | set(rods) | set(tparts)
    for o in parts:
        if o in fixed or o is block:
            continue
        c = sum((Vector(v) for v in o.bound_box), Vector()) / 8
        set_pivot(o, c)
    bpy.context.view_layer.update()
    for o in parts:
        if o not in tparts:
            o.parent = root
    turbo.parent = root
    for o in tparts:
        o.parent = turbo
        o.matrix_parent_inverse = Matrix.Identity(4)
        o.location = (0, 0, 0)
    bpy.context.view_layer.update()
    for child, par in ((cpul_e, cam_e), (cpul, crank), (fly, crank), (hpp_pul, hpp)):
        reparent(child, par)
    for p, rd in zip(pistons, rods):
        rd.parent = p
        rd.location = (0, 0, 0)
    for o in [root] + list(root.children_recursive):
        base = o.name.split(".")[0]
        key = base.rsplit("_", 1)[0] if base.rsplit("_", 1)[-1].isdigit() else base
        if key in EXPLODE and o is not root:
            v = EXPLODE[key]
            if o.parent is turbo:  # lib3d converts by the parent's rotation only: undo the turbo empty's scale
                v = [c / TS for c in v]
            C.set_explode(o, v)
        if base in SPIN:
            C.set_spin(o, (1, 0, 0), SPIN[base])
    return root


if __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    C.reset()
    root = build(q)
    if a.get("look"):
        H = os.path.join(C.HERE, "..", "public/lib3d/env/")
        C.look(a["look"], target=(0, 0, 0.33), cam=tuple(float(v) for v in a.get("cam", "0.95,-1.15,0.8").split(",")), fov=34,
               hdr=H + a.get("env", "workshop") + "-1k-v1.hdr", ground=True, spp=int(a.get("spp", "32")), res=(1200, 800))
    C.finish("engine_diesel", q, root, a.get("out"), pivots=True)
