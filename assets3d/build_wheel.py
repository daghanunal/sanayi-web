"""Wheel + tyre: 225/45 R17 summer tyre with real tread blocks, 5-twin-spoke two-tone alloy (diamond-cut
face, gunmetal pockets), ventilated 312 mm disc, fixed 4-pot caliper, lug nuts, valve, plain centre cap.

  Blender -b --factory-startup --python assets3d/build_wheel.py -- --q hi --out /tmp/wheel-hi.glb

Standalone asset (three.js space): axle along Z, the face looks at +Z, hub centre at the origin.
Nodes: wheel > spin (rotate .rotation.z) > tyre, rim, disc, lugs, cap, valve ;  wheel > caliper (static).
Every part carries extras.explode = [x, y, z] (metres, three space) for the exploded view.
make_wheel() is imported by build_car.py / build_truck.py (kind='car' | 'truck').
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

ROT = Matrix.Rotation(math.pi / 2, 4, "X")  # wheel frame (axle +Z, face +Z) -> Blender (axle -Y)

SPEC = {
    # tyre: bead radius, outer radius, section width, tread width, tread depth | rim width, PCD, studs, et
    "car": dict(Rb=0.2159, R=0.3172, SW=0.225, TW=0.192, D=0.0075, RW=0.19, PCD=0.112, NS=5, ET=0.045,
                disc_r=0.156, disc_t=0.025, NP=60),
    "truck": dict(Rb=0.2858, R=0.5370, SW=0.315, TW=0.270, D=0.016, RW=0.229, PCD=0.335, NS=10, ET=0.120,
                  disc_r=0.215, disc_t=0.045, NP=48),
}


def mats(q, kind):
    """wheel materials (created once per scene)"""
    if "tyre_tread" in C.MATS:
        return
    hi = q == "hi"
    n = 512 if hi else 256
    if q == "min":  # phone-in-a-car: flat PBR, no textures
        C.material("tyre_tread", C.srgb("#1e1e1f"), 0.82, vcol=True)
        C.material("tyre_side", C.srgb("#1e1e1f"), 0.66, vcol=True)
        C.material("rim_face", C.srgb("#d8d9db"), 0.2, 1.0, coat=1.0, coat_rough=0.04, vcol=True)
        C.material("rim_paint", C.srgb("#2c2e31"), 0.42, 0.7, coat=1.0, coat_rough=0.08, vcol=True)
        C.material("disc_face", C.srgb("#8a8c8f"), 0.35, 1.0, vcol=True)
        C.material("disc_hat", C.srgb("#3a3432"), 0.7, 0.8, vcol=True)
        C.material("caliper_paint", C.srgb("#b3121b"), 0.32, 0.0, coat=1.0, coat_rough=0.06, vcol=True)
        C.material("chrome", C.srgb("#e6e7e9"), 0.08, 1.0, vcol=True)
        C.material("steel_dark", C.srgb("#3b3d40"), 0.45, 1.0, vcol=True)
        C.material("cap_plastic", C.srgb("#1b1c1e"), 0.25, 0.0, coat=1.0, coat_rough=0.03, vcol=True)
        return
    a, o, nn = T.rubber(n, seed=1, lum=0.022, rough=0.84)
    C.material("tyre_tread", (1, 1, 1), albedo=C.image("rubber_alb", a), orm=C.image("rubber_orm", o, False),
               normal=C.image("rubber_n", nn, False), normal_strength=0.6, vcol=True, uv_scale=(24 * C.SQUEEZE, 4))
    C.material("tyre_side", (1, 1, 1), albedo=C.image("rubber_alb", a) if False else bpy.data.images["rubber_alb"],
               orm=C.image("rubber_side_orm", T.orm(1, np.clip(o[..., 1] - 0.12, 0, 1), 0), False),
               normal=bpy.data.images["rubber_n"], normal_strength=0.35, vcol=True, uv_scale=(24 * C.SQUEEZE, 4))
    if kind == "truck":
        C.material("rim_paint", C.srgb("#c9ccd0"), 0.38, 0.0, coat=0.5, coat_rough=0.12, vcol=True)
        C.material("rim_face", C.srgb("#c9ccd0"), 0.38, 0.0, coat=0.5, coat_rough=0.12, vcol=True)
    else:
        C.material("rim_face", C.srgb("#dcdddf"), 0.22, 1.0, coat=1.0, coat_rough=0.04, vcol=True)
        C.material("rim_paint", C.srgb("#2c2e31"), 0.42, 0.7, coat=1.0, coat_rough=0.08, vcol=True)
    ba, bo, bn = T.brushed(n, seed=21, lum=0.52, rough=0.32, radial=False)
    C.material("disc_face", (1, 1, 1), albedo=C.image("disc_alb", ba), orm=C.image("disc_orm", bo, False),
               normal=C.image("disc_n", bn, False), normal_strength=0.8, vcol=True, uv_scale=(2 * C.SQUEEZE, 5))
    ia, io, inn = T.cast_iron(256, seed=22, lum=0.16, rough=0.7, rust=0.35)
    C.material("disc_hat", (1, 1, 1), albedo=C.image("iron_alb", ia), orm=C.image("iron_orm", io, False),
               normal=C.image("iron_n", inn, False), vcol=True, uv_scale=(2 * C.SQUEEZE, 5))
    C.material("caliper_paint", C.srgb("#b3121b"), 0.32, 0.0, coat=1.0, coat_rough=0.06, vcol=True)
    C.material("chrome", C.srgb("#e6e7e9"), 0.08, 1.0, vcol=True)
    C.material("steel_dark", C.srgb("#3b3d40"), 0.45, 1.0, vcol=True)
    C.material("cap_plastic", C.srgb("#1b1c1e"), 0.25, 0.0, coat=1.0, coat_rough=0.03, vcol=True)


# ── tyre ─────────────────────────────────────────────────────────────────────
def tyre_profile(S):
    """half profile (r, a) from tread centre to the bead (a >= 0), groove-bottom level on the tread"""
    R, D, TW, SW, Rb = S["R"], S["D"], S["TW"], S["SW"], S["Rb"]
    hw = TW / 2
    sw = SW / 2
    side_h = R - Rb
    crown = lambda a: R - 0.006 * (a / hw) ** 2 * (SW / 0.225)
    pts = []
    pts.append((crown(0) - D, 0.0))
    pts.append((crown(hw * 0.55) - D, hw * 0.55))
    pts.append((crown(hw) - D, hw))
    # shoulder rounding down into the sidewall
    for k in range(1, 7):
        t = k / 6
        ang = t * math.pi / 2
        rr = crown(hw) - D - side_h * 0.20 * (1 - math.cos(ang))
        aa = hw + (sw - hw) * math.sin(ang) * 0.93
        pts.append((rr, aa))
    # sidewall bulge (max width ~45% up the sidewall), rim protector rib, bead
    top = pts[-1][0]
    for k in range(1, 13):
        t = k / 12
        rr = top - (top - (Rb + side_h * 0.30)) * t
        aa = sw * (0.93 + 0.07 * math.sin(t * math.pi * 0.9))
        # two moulded rings on the sidewall (a fine raised bead each) - the eye reads them as a real tyre
        if k in (3, 9):
            aa += 0.0012
        pts.append((rr, aa))
    rp = Rb + side_h * 0.20
    pts.append((rp + 0.004, sw * 0.975))
    pts.append((rp, sw * 0.99 + 0.002))   # rim protector rib
    pts.append((rp - 0.006, sw * 0.93))
    pts.append((Rb + 0.018, S["RW"] / 2 + 0.006))
    pts.append((Rb + 0.004, S["RW"] / 2 - 0.004))
    pts.append((Rb, S["RW"] / 2 - 0.012))
    return pts, crown


def tread_layout(S, kind):
    """list of blocks per pitch: each is (w0, w1, slant_rad, s_gap, center_frac) in metres across the tread;
    center rib (continuous) handled by the lathe."""
    hw = S["TW"] / 2
    if kind == "truck":
        # regional drive tyre: two rows of chunky lugs each side + a zig-zag centre rib
        return [(0.020, 0.058, 0.35, 0.010), (0.070, hw + 0.012, -0.10, 0.014),
                (-0.058, -0.020, -0.35, 0.010), (-hw - 0.012, -0.070, 0.10, 0.014)], 0.012, [(0.012, 0.020), (0.058, 0.070)]
    return [(0.026, 0.057, 0.42, 0.0045), (0.068, hw + 0.010, -0.08, 0.0065),
            (-0.057, -0.026, 0.42, 0.0045), (-hw - 0.010, -0.068, -0.08, 0.0065)], 0.013, [(0.013, 0.026), (0.057, 0.068)]


def base_radius(prof, a):
    a = abs(a)
    for (r0, a0), (r1, a1) in zip(prof, prof[1:]):
        if a1 >= a >= a0 and a1 > a0:
            t = (a - a0) / (a1 - a0)
            return r0 + (r1 - r0) * t
    return prof[-1][0]


def make_tyre(S, q, kind):
    hi = q == "hi"
    prof, crown = tyre_profile(S)
    blocks, rib, grooves = tread_layout(S, kind)
    D = S["D"]
    # lathe: centre rib raised to the crown, the rest at groove bottom
    half = [(crown(0), 0.0), (crown(rib), rib), (crown(rib) - D, rib + 0.0003)] + [p for p in prof if p[1] > rib + 0.0003]
    if not hi:  # lo: all ribs in the lathe (grooves only), blocks come from the normal map
        half = [(crown(0), 0.0)]
        for g0, g1 in grooves:
            half += [(crown(g0), g0), (crown(g0) - D * 0.8, g0 + 0.0008), (crown(g1) - D * 0.8, g1 - 0.0008), (crown(g1), g1)]
        half += [(crown(S["TW"] / 2), S["TW"] / 2)] + [p for p in prof if p[1] > S["TW"] / 2 + 1e-4]
    full = [(r, -a) for r, a in reversed(half)] + [(r, a) for r, a in half[1:]]
    segs = 160 if hi else (72 if q == "lo" else 40)
    mi = []
    for (r0, a0), (r1, a1) in zip(full, full[1:]):
        mi.append(0 if max(abs(a0), abs(a1)) <= S["TW"] / 2 + 0.004 else 1)
    bm = C.lathe(full, segs, axis="Z", mat_idx=mi)
    # UVs in 0..1 (u around, v along the profile); the rubber tile repeat is a texture transform
    uvl = bm.loops.layers.uv.verify()
    plen = sum(math.dist(a, b) for a, b in zip(full, full[1:]))
    for f in bm.faces:
        for lp in f.loops:
            u, v = lp[uvl].uv
            lp[uvl].uv = (u, v / plen)
    if hi:
        NP = S["NP"]
        P = 2 * math.pi * S["R"] / NP
        for k in range(NP):
            s0 = k * P
            for (w0, w1, slant, gap) in blocks:
                _tread_block(bm, S, prof, crown, s0, P, w0, w1, slant, gap, D, k)
    C.fix_uv_wrap(bm)
    bmesh.ops.transform(bm, matrix=ROT, verts=bm.verts)
    ob = C.obj("tyre", bm, ["tyre_tread", "tyre_side"], smooth=True, sharp=50)
    return ob


def _tread_block(bm, S, prof, crown, s0, P, w0, w1, slant, gap, D, k):
    """one tread block: chamfered top following the crown, walls down to the groove bottom"""
    R = S["R"]
    ns, nw = 3, 3
    ch = 0.0012
    uvl = bm.loops.layers.uv.verify()
    wc = (w0 + w1) / 2

    def corner(si, wi, inset=0.0):
        w = w0 + (w1 - w0) * wi
        ww = w0 + inset + (w1 - w0 - 2 * inset) * wi
        s = s0 + gap / 2 + inset + (P - gap - 2 * inset) * si + (ww - wc) * math.tan(slant)
        return s, ww

    def place(s, w, h):
        ang = s / R
        if h == "top":
            r = crown(w)
        elif h == "chamfer":
            r = crown(w) - 0.0012
        else:
            r = base_radius(prof, w) - 0.0015
        return Vector((math.cos(ang) * r, math.sin(ang) * r, w))

    # rings: top grid (inset ch), chamfer outline (inset 0), bottom outline
    top = [[bm.verts.new(place(*corner(i / ns, j / nw, ch), "top")) for j in range(nw + 1)] for i in range(ns + 1)]
    for i in range(ns):
        for j in range(nw):
            f = bm.faces.new((top[i][j], top[i + 1][j], top[i + 1][j + 1], top[i][j + 1]))
            f.material_index = 0
            for lp in f.loops:
                p = lp.vert.co
                lp[uvl].uv = ((math.atan2(p.y, p.x) / (2 * math.pi)) % 1.0, 0.5 + p.z / 0.35)
    # outline loop order (counter-clockwise in (s,w)): along w at s=0, along s at w=1, back...
    def loop_idx():
        out = []
        for j in range(nw):
            out.append((0, j))
        for i in range(ns):
            out.append((i, nw))
        for j in range(nw, 0, -1):
            out.append((ns, j))
        for i in range(ns, 0, -1):
            out.append((i, 0))
        return out

    L = loop_idx()
    ring_top = [top[i][j] for i, j in L]
    ring_ch = [bm.verts.new(place(*corner(i / ns, j / nw, 0.0), "chamfer")) for i, j in L]
    ring_bt = [bm.verts.new(place(*corner(i / ns, j / nw, -0.0006), "bottom")) for i, j in L]
    n = len(L)
    for ra, rb in ((ring_top, ring_ch), (ring_ch, ring_bt)):
        for m in range(n):
            m2 = (m + 1) % n
            try:
                f = bm.faces.new((ra[m2], ra[m], rb[m], rb[m2]))
            except ValueError:
                continue
            f.material_index = 0
            for lp in f.loops:
                p = lp.vert.co
                lp[uvl].uv = ((math.atan2(p.y, p.x) / (2 * math.pi)) % 1.0, 0.5 + (p.z + p.length - R) / 0.35)


# ── rim ──────────────────────────────────────────────────────────────────────
def make_rim(S, q):
    hi = q == "hi"
    segs = 96 if hi else (48 if q == "lo" else 24)
    Rb, RW = S["Rb"], S["RW"]
    h = RW / 2
    fl = Rb + 0.0175  # flange top
    # barrel: outer surface (tyre side) from outer lip to inner lip, then the inner surface back
    outer = [(fl + 0.002, h + 0.009), (fl + 0.004, h + 0.004), (fl, h + 0.0005), (Rb + 0.003, h - 0.002),
             (Rb, h - 0.012), (Rb, h - 0.030), (Rb - 0.004, h - 0.034), (Rb - 0.024, h - 0.046),
             (Rb - 0.026, -h + 0.050), (Rb - 0.004, -h + 0.036), (Rb, -h + 0.030), (Rb, -h + 0.012),
             (Rb + 0.003, -h + 0.002), (fl, -h - 0.0005), (fl + 0.003, -h - 0.005), (fl, -h - 0.009)]
    inner = [(fl - 0.006, -h - 0.009), (Rb - 0.005, -h + 0.004), (Rb - 0.006, -h + 0.034),
             (Rb - 0.031, -h + 0.050), (Rb - 0.030, h - 0.046), (Rb - 0.010, h - 0.030),
             (Rb - 0.008, h - 0.004), (fl - 0.007, h + 0.007)]
    prof = outer + inner + [outer[0]]
    bm = C.lathe(prof, segs, axis="Z")
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    barrel = C.obj("rim_barrel", bm, ["rim_paint"], sharp=40)
    for p in barrel.data.polygons:
        p.material_index = 0

    # face disk: concave, thick at the hub
    et = S["ET"]
    r_in, r_out = 0.028, Rb - 0.010
    front = [(r_in, et + 0.030), (0.045, et + 0.034), (0.068, et + 0.030), (0.10, et + 0.024), (0.14, et + 0.030),
             (0.17, et + 0.040), (r_out, h + 0.004)]
    back = [(r_out + 0.002, h - 0.040), (0.17, et + 0.012), (0.12, et + 0.004), (0.07, et - 0.002), (r_in, et)]
    fprof = front + back + [front[0]]
    fb = C.lathe(fprof[::-1], segs, axis="Z")
    face = C.obj("rim_face", fb, ["rim_face", "rim_paint"], smooth=True, sharp=30)
    # window cutters (5 big + 5 small between twin spokes)
    cut = bmesh.new()
    NSP = 5
    sw = 0.029  # spoke width at the rim (wider toward the hub, see _window)
    for k in range(NSP):
        base = 2 * math.pi * k / NSP
        _window(cut, base, 2 * math.pi / NSP / 2 - math.radians(6.5), sw, 0.082, r_out - 0.010, 0.012)
        _window(cut, base + math.pi / NSP, math.radians(6.5), sw, 0.118, r_out - 0.010, 0.006)
    cutter = C.obj("_cut", cut, ["rim_paint"], smooth=False)
    C.boolean(face, cutter)
    # lug holes + centre bore
    lb = bmesh.new()
    for k in range(S["NS"]):
        ang = 2 * math.pi * (k + 0.5) / S["NS"]
        C.cyl(0.0105, 0.2, 24 if hi else 12, loc=(math.cos(ang) * S["PCD"] / 2, math.sin(ang) * S["PCD"] / 2, et), bm=lb)
        C.cyl(0.017, 0.03, 24 if hi else 12, loc=(math.cos(ang) * S["PCD"] / 2, math.sin(ang) * S["PCD"] / 2, et + 0.044), bm=lb)
    C.cyl(r_in + 0.004, 0.2, 32, loc=(0, 0, et), bm=lb)
    C.boolean(face, C.obj("_lug", lb, ["rim_paint"], smooth=False))
    if q != "min":
        C.bevel_mod(face, width=0.0022 if hi else 0.0018, segs=2 if hi else 1, angle=35)
    else:
        C.cleanup(face)
    # two-tone: faces looking out of the front get the machined finish
    me = face.data
    for p in me.polygons:
        c = p.center
        p.material_index = 0 if (p.normal.z > 0.80 and c.z > et + 0.016) else 1
    C.smooth_by_angle(face, 32)
    C.weighted_normals(face)
    C.smooth_by_angle(barrel, 40)
    rim = C.join([barrel, face], "rim")
    rim.data.transform(ROT)
    # metric UVs are unused by the plain paint; keep a UV map for the exporter
    return rim


def _window(bm, a0, half_ang, sw, r0, r1, rc):
    """prism cutter for one window centred at angle a0 whose spoke edges sit at a0 +- half_ang (+ spoke half width)"""
    pts = []
    n = 12

    def edge_ang(r):
        w = sw * (1 + 0.55 * max(0.0, (0.19 - r) / 0.11))  # spokes flare toward the hub
        return max(half_ang - math.asin(min(0.95, (w / 2) / r)), 0.002)

    # right edge (inner -> outer), outer arc, left edge (outer -> inner), inner round
    rs = [r0 + (r1 - r0) * i / n for i in range(n + 1)]
    right = [(r, a0 - edge_ang(r)) for r in rs]
    left = [(r, a0 + edge_ang(r)) for r in reversed(rs)]
    arc = [(r1 + 0.004 * math.sin(math.pi * i / 8), a0 - edge_ang(r1) + 2 * edge_ang(r1) * i / 8) for i in range(1, 8)]
    wi = edge_ang(r0) * r0
    inner = [(r0 - wi * math.sin(math.pi * i / 8), a0 + edge_ang(r0) - 2 * edge_ang(r0) * i / 8) for i in range(1, 8)]
    poly = right + arc + left + inner
    ring0 = [bm.verts.new((r * math.cos(a), r * math.sin(a), -0.1)) for r, a in poly]
    ring1 = [bm.verts.new((r * math.cos(a) * 0.985, r * math.sin(a) * 0.985 + 0, 0.25)) for r, a in poly]
    m = len(poly)
    for i in range(m):
        j = (i + 1) % m
        bm.faces.new((ring0[i], ring0[j], ring1[j], ring1[i]))
    bm.faces.new(ring0[::-1])
    bm.faces.new(ring1)


# ── brakes ───────────────────────────────────────────────────────────────────
def make_disc(S, q):
    hi = q == "hi"
    segs = 96 if hi else (48 if q == "lo" else 28)
    Rd, t = S["disc_r"], S["disc_t"]
    et = S["ET"]
    ac = et - 0.042 - (0.02 if S["NS"] > 5 else 0)  # rotor centre plane
    ri = Rd * 0.58
    pl = t * 0.32  # plate thickness
    bm = bmesh.new()
    # two friction plates (face material 0), edges material 1
    for sgn in (1, -1):
        a_out = ac + sgn * t / 2
        a_in = ac + sgn * (t / 2 - pl)
        prof = [(ri, a_in), (ri, a_out), (Rd - 0.0015, a_out), (Rd, a_out - sgn * 0.0015), (Rd, a_in), (ri, a_in)]
        if sgn < 0:
            prof = prof[::-1]
        C.lathe(prof, segs, axis="Z", mat_idx=[1, 0, 1, 1, 1], bm=bm)
    # vanes
    nv = 36 if hi else 0
    for k in range(nv):
        ang = 2 * math.pi * k / nv
        vb = C.box((Rd - ri - 0.006, 0.004, t - 2 * pl + 0.001), loc=((Rd + ri) / 2, 0, ac), mat=1)
        C.xform(vb, rot=Matrix.Rotation(ang + 0.12, 3, "Z"))
        C.merge(bm, vb)
    # hat
    hat = [(ri + 0.004, ac + t / 2 - pl), (ri - 0.004, ac + t / 2 - pl * 0.5), (ri - 0.006, et - 0.006),
           (ri - 0.012, et), (0.034, et), (0.034, et - 0.006), (ri - 0.014, et - 0.006), (ri - 0.012, ac + t / 2 - pl)]
    C.lathe(hat + [hat[0]], segs, axis="Z", mat_idx=[2] * len(hat), bm=bm)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:  # concentric grinding marks: v = radius
        for lp in f.loops:
            p = lp.vert.co
            lp[uvl].uv = ((math.atan2(p.y, p.x) / (2 * math.pi)) % 1.0, math.hypot(p.x, p.y) / 0.16)
    C.fix_uv_wrap(bm)
    bmesh.ops.transform(bm, matrix=ROT, verts=bm.verts)
    ob = C.obj("disc", bm, ["disc_face", "disc_hat", "disc_hat"], sharp=40)
    return ob, ac


def make_caliper(S, q, ac, angle_deg=145):
    hi = q == "hi"
    Rd, t = S["disc_r"], S["disc_t"]
    k = Rd / 0.156
    g = 0.004 * k  # clearance
    body_w = 0.022 * k
    r0, r1 = Rd - 0.052 * k, Rd + 0.020 * k
    a_o = ac + t / 2 + g
    a_i = ac - t / 2 - g
    # C-profile (r, a): outboard half, bridge over the disc edge, inboard half
    prof = [(r0, a_o), (r0, a_o + body_w), (r1, a_o + body_w), (r1 + 0.004, a_o + body_w * 0.4),
            (r1 + 0.004, a_i - body_w * 0.6), (r1, a_i - body_w * 1.3), (r0 + 0.006, a_i - body_w * 1.3),
            (r0 + 0.006, a_i), (Rd + g, a_i), (Rd + g, a_o), (r0, a_o)]
    span = math.radians(62)
    segs = 20 if hi else 8
    bm = C.lathe(prof, segs, axis="Z", angle=span, ofs=-span / 2)
    # end caps
    n = segs + 1
    L = len(prof)
    verts = list(bm.verts)
    ring0 = [verts[i * n] for i in range(L - 1)]
    ring1 = [verts[i * n + segs] for i in range(L - 1)]
    try:
        bm.faces.new(ring0)
        bm.faces.new(ring1[::-1])
    except ValueError:
        pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = C.obj("caliper", bm, ["caliper_paint"], smooth=True, sharp=40)
    if hi:
        C.bevel_mod(ob, width=0.004 * k, segs=3, angle=30)
    # pad pins + bleed nipple
    pb = bmesh.new()
    for s in (-0.25, 0.25):
        a = s * span
        C.cyl(0.0035 * k, (a_o + body_w + 0.004) - (a_i - body_w * 1.3 - 0.004), 10,
              loc=((Rd + 0.012 * k) * math.cos(a), (Rd + 0.012 * k) * math.sin(a), (a_o + a_i) / 2 + 0.0), bm=pb)
    C.cyl(0.004 * k, 0.012, 8, loc=(r1 * math.cos(span * 0.4), r1 * math.sin(span * 0.4), a_i - body_w), axis="Z", bm=pb)
    pins = C.obj("caliper_pins", pb, ["chrome"])
    cal = C.join([ob, pins], "caliper")
    cal.data.transform(Matrix.Rotation(math.radians(angle_deg), 4, "Z"))
    cal.data.transform(ROT)
    C.smooth_by_angle(cal, 40)
    return cal


def make_lugs(S, q):
    hi = q == "hi"
    bm = bmesh.new()
    et = S["ET"]
    for k in range(S["NS"]):
        ang = 2 * math.pi * (k + 0.5) / S["NS"]
        x, y = math.cos(ang) * S["PCD"] / 2, math.sin(ang) * S["PCD"] / 2
        z0 = et + 0.030
        prof = [(0.0, z0 + 0.034), (0.006, z0 + 0.034), (0.0095, z0 + 0.030), (0.0095, z0 + 0.012),
                (0.0105, z0 + 0.010), (0.0105, z0 + 0.004), (0.008, z0)]
        b = C.lathe(prof, 6, axis="Z") if True else None
        # hex: 6-sided lathe gives a hex nut; a round dome on top
        C.xform(b, loc=(x, y, 0))
        C.merge(bm, b)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.transform(bm, matrix=ROT, verts=bm.verts)
    return C.obj("lugs", bm, ["chrome"], sharp=30)


def make_cap(S, q):
    et = S["ET"]
    prof = [(0.0, et + 0.047), (0.018, et + 0.046), (0.027, et + 0.043), (0.029, et + 0.038), (0.027, et + 0.030)]
    bm = C.lathe(prof, 32 if q == "hi" else 16, axis="Z")
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.transform(bm, matrix=ROT, verts=bm.verts)
    return C.obj("cap", bm, ["cap_plastic"], sharp=40)


def make_valve(S, q):
    h = S["RW"] / 2
    r = S["Rb"] - 0.02
    bm = bmesh.new()
    prof = [(0.0035, 0), (0.0035, 0.022), (0.0042, 0.024), (0.0042, 0.034), (0.0, 0.035)]
    b = C.lathe(prof, 10, axis="Z")
    # tilt it out of the barrel through the outer bead seat
    C.xform(b, rot=Matrix.Rotation(math.radians(-58), 3, "Y"))
    C.xform(b, loc=(r, 0, h - 0.020))
    C.xform(b, rot=Matrix.Rotation(math.radians(18), 3, "Z"))
    C.merge(bm, b)
    bmesh.ops.transform(bm, matrix=ROT, verts=bm.verts)
    return C.obj("valve", bm, ["steel_dark"], sharp=40)


def make_wheel(q="hi", kind="car", name="wheel", caliper_angle=145, ao=True):
    S = SPEC[kind]
    mats(q, kind)
    tyre = make_tyre(S, q, kind)
    rim = make_rim(S, q) if kind == "car" else make_steel_rim(S, q)
    disc, ac = make_disc(S, q)
    cal = make_caliper(S, q, ac, caliper_angle) if kind == "car" else None
    lugs = make_lugs(S, q)
    cap = make_cap(S, q) if kind == "car" else None
    valve = make_valve(S, q)
    parts = [p for p in (tyre, rim, disc, cal, lugs, cap, valve) if p is not None]
    if ao:
        C.bake_ao_vcol(parts, samples=64 if q == "hi" else 24, max_dist=0.06, floor=0.25)
    root = C.empty(name)
    spin = C.empty("spin", root)
    for p in (tyre, rim, disc, lugs, cap, valve):
        if p is not None:
            p.parent = spin
    if cal:
        cal.parent = root
    # exploded view offsets (three space: +Z = out of the face)
    ex = {"tyre": (0, 0, 0.0), "rim": (0, 0, 0.30), "lugs": (0, 0, 0.52), "cap": (0, 0, 0.62), "valve": (0, 0, 0.30),
          "disc": (0, 0, -0.30), "caliper": (0, 0.18, -0.46)}
    for p in parts:
        p["explode"] = list(ex.get(p.name.split(".")[0], (0, 0, 0)))
    return root, dict(tyre=tyre, rim=rim, disc=disc, caliper=cal, lugs=lugs, cap=cap, valve=valve, spin=spin)


def make_steel_rim(S, q):
    """truck: 22.5 x 9.00 steel disc wheel, 10 stud holes, 5 oval hand holes (painted silver)"""
    hi = q == "hi"
    segs = 96 if hi else 48
    Rb, RW = S["Rb"], S["RW"]
    h = RW / 2
    fl = Rb + 0.0127
    # 15-degree drop centre tubeless: outer lip, taper seat, well, inner seat, inner lip
    outer = [(fl + 0.004, h + 0.004), (fl, h - 0.001), (Rb + 0.002, h - 0.012), (Rb - 0.006, h - 0.040),
             (Rb - 0.040, h - 0.060), (Rb - 0.040, -h + 0.110), (Rb - 0.010, -h + 0.060), (Rb, -h + 0.012),
             (fl, -h - 0.001), (fl + 0.004, -h - 0.004)]
    inner = [(fl - 0.004, -h - 0.004), (Rb - 0.006, -h + 0.012), (Rb - 0.016, -h + 0.060), (Rb - 0.046, -h + 0.110),
             (Rb - 0.046, h - 0.060), (Rb - 0.012, h - 0.040), (Rb - 0.004, h - 0.010), (fl - 0.004, h + 0.004)]
    bm = C.lathe(outer + inner + [outer[0]], segs, axis="Z")
    barrel = C.obj("rim_barrel", bm, ["rim_paint"], sharp=40)
    et = S["ET"]
    front = [(0.08, et + 0.004), (0.14, et + 0.004), (0.17, et - 0.010), (0.20, et - 0.040), (Rb - 0.044, -0.010)]
    back = [(Rb - 0.050, -0.012), (0.20, et - 0.050), (0.165, et - 0.018), (0.14, et - 0.010), (0.08, et - 0.010)]
    fb = C.lathe((front + back + [front[0]])[::-1], segs, axis="Z")
    face = C.obj("rim_face", fb, ["rim_face"], sharp=40)
    lb = bmesh.new()
    for k in range(S["NS"]):
        ang = 2 * math.pi * k / S["NS"]
        C.cyl(0.013, 0.2, 16 if hi else 8, loc=(math.cos(ang) * S["PCD"] / 2, math.sin(ang) * S["PCD"] / 2, et), bm=lb)
    for k in range(5):
        ang = 2 * math.pi * (k + 0.5) / 5
        b = C.cyl(0.028, 0.3, 20 if hi else 10, loc=(0, 0, 0))
        C.xform(b, scale=(1.6, 1, 1))
        C.xform(b, rot=Matrix.Rotation(ang, 3, "Z"), loc=(math.cos(ang) * 0.205, math.sin(ang) * 0.205, 0))
        C.merge(lb, b)
    C.boolean(face, C.obj("_lug", lb, ["rim_face"], smooth=False))
    if hi:
        C.bevel_mod(face, width=0.002, segs=2, angle=40)
    rim = C.join([barrel, face], "rim")
    rim.data.transform(ROT)
    C.smooth_by_angle(rim, 40)
    return rim


if __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    kind = a.get("kind", "car")
    C.reset()
    root, parts = make_wheel(q, kind)
    C.finish("wheel" if kind == "car" else f"wheel_{kind}", q, root, a.get("out"))
    if a.get("look"):
        C.look(a["look"], target=(0, 0, 0.02), cam=(0.55, -1.25, 0.25), fov=32,
               hdr=os.path.join(C.HERE, "..", "public/lib3d/env/studio-1k-v1.hdr"), ground=False, spp=96)
