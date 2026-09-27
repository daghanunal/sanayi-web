"""Radiator pack of a compact car (crossflow), unbranded, real scale: brazed aluminium core (39 flat tubes,
louvred corrugated fins: real zig-zag fin geometry in hi, a textured core face in lo), crimped aluminium header
plates, black glass-filled nylon end tanks with ribs, upper inlet / lower outlet hose necks, filler neck +
pressure cap, drain cock, rubber mounting pins, A/C condenser in front (+ receiver-dryer), fan shroud with a
bell-mouth ring and struts, 7-blade skewed electric fan and its motor.

  Blender -b --factory-startup --python assets3d/build_radiator.py -- --q hi [--out x.glb] [--look /tmp/r.png]

three.js space: the core faces +X (car forward: air flows towards -X), core width along Z (tank_L at -Z = the
car's left), +Y up. Origin: bbox centre in x / z, the mounting pins stand on y = 0.
Nodes: radiator > core, tank_L, tank_R, neck_upper, neck_lower, cap, drain_cock, mount_L, mount_R, condenser, shroud,
  fan_motor, fan. fan spins about its local X (extras.spin; lib3d spin(angle)), origin on the fan axis.
extras.explode: condenser forward, tanks out sideways (necks / cap / drain follow their tank), shroud, fan and
  motor back in steps.
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
W, H, D = 0.640, 0.400, 0.027  # core (Blender: W along Y, H along Z, D along X)
Z0 = 0.052  # core bottom
ZC = Z0 + H / 2
TUBE_T = 0.0019
FIN_H = 0.0081
FIN_P = 0.0025  # fin pitch (one full zig-zag); real 1.6-2.2 mm, a touch coarser to stay in budget
TANK_W = 0.046  # tank outboard width (Y)
TANK_D = 0.050  # tank depth (X)
SH_X = -D / 2 - 0.004  # shroud front
FAN_X = -0.068  # fan blade mid-plane
FAN_R = 0.168
RING_R = 0.176


def HI():
    return Q == "hi"


def seg(a, b):
    return a if HI() else b


# ── textures ─────────────────────────────────────────────────────────────────
def fin_tex(nu=64, nv=512):
    """louvred fin, u across the fin face (crest to crest), v through the core depth (0 back .. 1 front):
    two louvre banks with a flat turn-around in the middle, cavity darkening towards mid-depth"""
    v = (np.arange(nv) + 0.5) / nv
    h = np.zeros(nv, np.float32)
    n_l = 11
    for a, b, s in ((0.07, 0.46, 1.0), (0.54, 0.93, -1.0)):
        m = (v > a) & (v < b)
        t = (v[m] - a) / (b - a) * n_l
        fr = t - np.floor(t)
        h[m] = (fr if s > 0 else 1 - fr) * 0.8
    slit = np.zeros(nv, np.float32)
    for a, b in ((0.07, 0.46), (0.54, 0.93)):
        t = (v - a) / (b - a) * n_l
        fr = t - np.floor(t)
        slit += (((v > a) & (v < b)) * np.clip(1 - np.minimum(fr, 1 - fr) * 14, 0, 1)).astype(np.float32)
    f = T.fbm(nv, nu, base=8, octaves=3, seed=71)
    cav = 0.42 + 0.58 * np.abs(2 * v - 1) ** 0.8
    lum = (0.62 * cav[:, None] * (1 - 0.55 * slit[:, None]) * (0.94 + 0.12 * f)).astype(np.float32)
    alb = T.gray3(lum) * np.array([1.0, 1.0, 1.015], np.float32)
    rough = np.clip(0.36 + 0.25 * slit[:, None] + 0.08 * (f - 0.5), 0, 1)
    hh = np.repeat(h[:, None], nu, 1)
    nrm = T.normal_from_height(hh * 6.0, 1.0, wrap=False)
    return alb.astype(np.float32), T.orm(1.0, rough, 1.0), nrm


def core_face_tex(n=128, pitches=4, lum_deep=0.11):
    """head-on core face tile (1 tube pitch high, `pitches` fin pitches wide): bright tube band, zig-zag fin
    edges over a dark deep core. For the lo core and the condenser. Rows = v (bottom-up)"""
    y = (np.arange(n) + 0.5) / n  # 0..1 over one tube pitch
    x = (np.arange(n) + 0.5) / n
    tube_f = TUBE_T / (TUBE_T + FIN_H)
    tube = (y < tube_f)[:, None] * np.ones((1, n), bool)
    # fin zig-zag between y=tube_f..1: line from bottom crest to top crest
    yy = np.clip((y - tube_f) / (1 - tube_f), 0, 1)[:, None]
    ph = (x[None, :] * pitches) % 1.0
    tri = np.abs(ph * 2 - 1)  # 1 at crest (bottom), 0 at the other crest
    d = np.abs(tri - yy)
    fin = np.clip(1 - d * 9, 0, 1) * (~tube)
    f = T.fbm(n, n, base=8, octaves=3, seed=72)
    lum = np.where(tube, 0.70 + 0.05 * (f - 0.5), lum_deep + 0.55 * fin)
    edge = (np.abs(y - tube_f) < 0.03)[:, None] | (y > 0.985)[:, None]
    lum = np.where(edge & ~tube, lum * 0.5, lum)
    alb = T.gray3(lum.astype(np.float32))
    rough = np.where(tube, 0.32, 0.45 + 0.3 * (1 - fin))
    metal = np.where(tube, 1.0, 0.2 + 0.8 * fin)
    hgt = np.where(tube, 1.0, 0.25 * fin) + 0.0 * f
    nrm = T.normal_from_height(T.blur(hgt.astype(np.float32), 1) * 3.0, 1.0)
    ao = np.where(tube, 1.0, 0.4 + 0.6 * fin)
    return alb, T.orm(ao, rough, metal), nrm


def mats():
    n = seg(512, 256)
    C.material("alu_core", C.srgb("#b8bbbf"), 0.34, 1.0, vcol=True)
    ba, bo, bn = T.brushed(n, seed=73, lum=0.66, rough=0.32)
    C.material("alu_header", (1, 1, 1), albedo=C.image("r_hdr_alb", ba), orm=C.image("r_hdr_orm", bo, False),
               normal=(C.image("r_hdr_n", bn, False) if HI() else None), normal_strength=0.3, vcol=True, uv_scale=(3, 3))
    if HI():
        fa, fo, fn = fin_tex()
        C.material("fin", (1, 1, 1), albedo=C.image("r_fin_alb", fa), orm=C.image("r_fin_orm", fo, False),
                   normal=C.image("r_fin_n", fn, False), normal_strength=1.0, vcol=True, double=True)
    ca, co, cn = core_face_tex(128)
    C.material("core_face", (1, 1, 1), albedo=C.image("r_cf_alb", ca), orm=C.image("r_cf_orm", co, False),
               normal=C.image("r_cf_n", cn, False), normal_strength=1.0, vcol=True, uv_scale=(W / 0.01, H / (TUBE_T + FIN_H)))
    ka, ko, kn = core_face_tex(128, pitches=5, lum_deep=0.10)
    C.material("condenser_face", (1, 1, 1), albedo=C.image("r_cd_alb", ka), orm=C.image("r_cd_orm", ko, False),
               normal=C.image("r_cd_n", kn, False), normal_strength=1.0, vcol=True, uv_scale=(0.60 / 0.01, 0.36 / 0.0075))
    pa, po, pn = T.textured_plastic(n, seed=74, lum=0.028, rough=0.52, grain=1.0)
    C.material("tank_plastic", (1, 1, 1), albedo=C.image("r_tank_alb", pa), orm=C.image("r_tank_orm", po, False),
               normal=(C.image("r_tank_n", pn, False) if HI() else None), normal_strength=0.45, vcol=True, uv_scale=(5, 5))
    sa, so, sn = T.textured_plastic(n, seed=75, lum=0.022, rough=0.72, grain=1.3)
    C.material("shroud_plastic", (1, 1, 1), albedo=C.image("r_shr_alb", sa), orm=C.image("r_shr_orm", so, False),
               normal=(C.image("r_shr_n", sn, False) if HI() else None), normal_strength=0.5, vcol=True, uv_scale=(4, 4))
    C.material("fan_plastic", C.srgb("#141416"), 0.48, 0.0, vcol=True)
    C.material("rubber", C.srgb("#101011"), 0.82, 0.0, vcol=True)
    C.material("motor_can", C.srgb("#2a2c2f"), 0.42, 0.85, vcol=True)
    C.material("steel_zinc", C.srgb("#b7b39f"), 0.32, 1.0, vcol=True)
    C.material("steel", C.srgb("#a8abb0"), 0.28, 1.0, vcol=True)
    C.material("cap_black", C.srgb("#18191b"), 0.4, 0.0, coat=0.4, coat_rough=0.2, vcol=True)
    C.material("alu_pipe", C.srgb("#c4c7cb"), 0.26, 1.0, vcol=True)
    C.material("copper_wire", C.srgb("#141414"), 0.5, 0.0, vcol=True)


def uv_box01(ob, span=0.8, center=(0, 0, ZC)):
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    uvl = bm.loops.layers.uv.verify()
    cx, cy, cz = center
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            p = lp.vert.co
            x, y, z = p.x - cx, p.y - cy, p.z - cz
            u, v = ((y, z), (x, z), (x, y))[ax]
            lp[uvl].uv = (min(max(u / span + 0.5, 0.0), 1.0), min(max(v / span + 0.5, 0.0), 1.0))
    bm.to_mesh(me)
    bm.free()
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


def loft(sections, n, axis="Z", cap0=True, cap1=True, bm=None, mat=0):
    """loft rounded rectangles: sections [(t, h1, h2, rc, c1, c2)], axis = extrusion axis"""
    b = bmesh.new()
    rings = []
    for t, h1, h2, rc, c1, c2 in sections:
        ring = []
        for a, bb in rrect(h1, h2, rc, n, c1, c2):
            p = {"Z": (a, bb, t), "Y": (a, t, bb), "X": (t, a, bb)}[axis]
            ring.append(b.verts.new(p))
        rings.append(ring)
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


# ── core ─────────────────────────────────────────────────────────────────────
def tube_levels():
    """z of every tube centre + fin rows [(zb, zt)] from bottom side plate to top side plate"""
    zb = Z0 + 0.0022  # above the bottom side plate
    zt = Z0 + H - 0.0022
    pitch = TUBE_T + FIN_H
    n = int(round((zt - zb - FIN_H) / pitch))
    pitch = (zt - zb - FIN_H) / n
    fin_h = pitch - TUBE_T
    tubes, rows = [], []
    z = zb
    for k in range(n):
        rows.append((z, z + fin_h))
        z += fin_h
        tubes.append(z + TUBE_T / 2)
        z += TUBE_T
    rows.append((z, zt))
    return tubes, rows


def fin_rows(rows):
    """corrugated fin ribbons (zero thickness, double sided), u alternates per crest, v front/back"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    x0, x1 = -D / 2 + 0.0004, D / 2 - 0.0004
    y0, y1 = -W / 2 + 0.0015, W / 2 - 0.0015
    nseg = int(round((y1 - y0) / (FIN_P / 2)))
    for zb, zt in rows:
        zb2, zt2 = zb + 0.0002, zt - 0.0002
        cols = []
        for i in range(nseg + 1):
            y = y0 + (y1 - y0) * i / nseg
            z = zb2 if i % 2 == 0 else zt2
            cols.append((bm.verts.new((x0, y, z)), bm.verts.new((x1, y, z)), float(i % 2)))
        for i in range(nseg):
            a, b = cols[i], cols[i + 1]
            f = bm.faces.new((a[0], b[0], b[1], a[1]))
            for lp, uv in zip(f.loops, ((a[2], 0.0), (b[2], 0.0), (b[2], 1.0), (a[2], 1.0))):
                lp[uvl].uv = uv
    ob = C.obj("_fins", bm, ["fin"], smooth=True, sharp=None, recalc=False)
    return ob


def make_core():
    tubes, rows = tube_levels()
    parts = []
    tb = bmesh.new()
    if HI():
        for z in tubes:
            C.box((D, W + 0.004, TUBE_T), loc=(0, 0, z), bevel=0.0007, segs=1, bm=tb)
    # side plates (U channels) top + bottom
    for z, sgn in ((Z0, 1), (Z0 + H, -1)):
        C.box((D + 0.002, W + 0.002, 0.0014), loc=(0, 0, z + sgn * 0.0007), bm=tb)
        for sx in (-1, 1):
            C.box((0.0012, W + 0.002, 0.009), loc=(sx * (D / 2 + 0.0006), 0, z + sgn * 0.0045), bm=tb)
    tob = C.obj("_tubes", tb, ["alu_core"], sharp=30)
    parts.append(tob)
    fins = None
    if HI():
        fins = fin_rows(rows)
        C.vcol_fill(fins)  # joined after the AO bake: the louvre texture carries its own cavity shading
    else:
        # textured core faces (front + back) between the side plates
        fb = bmesh.new()
        uvl = fb.loops.layers.uv.verify()
        for x, flip in ((D / 2, False), (-D / 2, True)):
            vs = [fb.verts.new((x, -W / 2, Z0 + 0.0014)), fb.verts.new((x, W / 2, Z0 + 0.0014)),
                  fb.verts.new((x, W / 2, Z0 + H - 0.0014)), fb.verts.new((x, -W / 2, Z0 + H - 0.0014))]
            uvs = [(0, 0), (1, 0), (1, 1), (0, 1)]
            if flip:
                vs, uvs = vs[::-1], uvs[::-1]
            f = fb.faces.new(vs)
            for lp, uv in zip(f.loops, uvs):
                lp[uvl].uv = uv
        # dark inner box so the core never looks hollow edge-on
        C.box((D - 0.001, W, H - 0.004), loc=(0, 0, ZC), bm=fb, mat=1)
        fo = C.obj("_face", fb, ["core_face", "rubber"], smooth=False, recalc=False)
        parts.append(fo)
    # header plates with crimp teeth over the tank feet
    hb = bmesh.new()
    for sy in (1, -1):
        yh = sy * (W / 2 + 0.0022)
        C.box((D + 0.014, 0.0016, H + 0.024), loc=(0, yh, ZC), bevel=0.0012 if HI() else 0, segs=1, bm=hb)
        nt = int((H + 0.02) / 0.0125)
        for k in range(nt if HI() else 0):
            z = ZC - (H + 0.02) / 2 + (k + 0.5) * (H + 0.02) / nt
            for sx in (-1, 1):
                C.box((0.0016, 0.0055, 0.0075), loc=(sx * (D / 2 + 0.0075), yh + sy * 0.0035, z), bevel=0.0005, segs=1, bm=hb)
        for sz in (-1, 1):
            for x in ((-0.008, 0.008) if HI() else ()):
                C.box((0.0055, 0.0055, 0.0016), loc=(x, yh + sy * 0.0035, ZC + sz * (H / 2 + 0.0125)), bm=hb)
    hob = C.obj("_headers", hb, ["alu_header"], sharp=35)
    uv_box01(hob, 0.8)
    parts.append(hob)
    for o in parts:
        C.vcol_fill(o)  # join() fills a missing colour layer with black
    return C.join(parts, "core"), fins


# ── tanks ────────────────────────────────────────────────────────────────────
def tank_sections(sy):
    """horizontal (x, y) rounded-rect sections of an end tank along z; flat on the header side"""
    y_in = sy * (W / 2 + 0.0045)
    hw = TANK_W / 2
    yc = y_in + sy * hw
    z_lo, z_hi = Z0 - 0.022, Z0 + H + 0.022
    nd = seg(6, 3)
    bot = []
    for k in range(nd + 1):
        a = 0.5 * math.pi * k / nd  # 0 -> pi/2
        bot.append((z_lo + 0.02 * (1 - math.cos(a)), TANK_D / 2 * (0.55 + 0.45 * math.sin(a)), hw * (0.6 + 0.4 * math.sin(a))))
    top = []
    for k in range(nd + 1):
        a = 0.5 * math.pi * k / nd
        top.append((z_hi - 0.02 + 0.02 * math.sin(a), TANK_D / 2 * (0.55 + 0.45 * math.cos(a)), hw * (0.6 + 0.4 * math.cos(a))))
    out = [(z, hx, hy, min(0.012, hy * 0.9), 0.0, yc) for z, hx, hy in bot + top]
    return out, yc, y_in


def make_tank(side):
    sy = 1 if side == "L" else -1
    secs, yc, y_in = tank_sections(sy)
    bm = loft(secs, seg(6, 3))
    # flatten the header side: every vertex inboard of y_in is pushed onto the flange plane
    for v in bm.verts:
        if (v.co.y - y_in) * sy < 0:
            v.co.y = y_in
    ob = C.obj("_shell", bm, ["tank_plastic"], sharp=40)
    parts = [ob]
    rb = bmesh.new()
    # foot flange sitting on the header plate
    C.box((TANK_D + 0.008, 0.006, H + 0.05), loc=(0, y_in + sy * 0.003, ZC), bevel=0.002 if HI() else 0, segs=1, bm=rb)
    # moulded ribs: horizontal hoops around the outer face + two vertical ribs
    for k in range(seg(9, 5)):
        z = Z0 + 0.03 + k * (H - 0.06) / (seg(9, 5) - 1)
        C.box((TANK_D + 0.004, TANK_W * 0.72, 0.004), loc=(0, yc + sy * 0.004, z), bevel=0.0015 if HI() else 0, segs=1, bm=rb)
    for sx in (-1, 1):
        C.box((0.004, 0.012, H - 0.02), loc=(sx * (TANK_D / 2 - 0.004), yc + sy * (TANK_W / 2 - 0.006), ZC),
              bevel=0.0015 if HI() else 0, segs=1, bm=rb)
    # mould parting line bead
    C.box((0.0025, TANK_W * 0.8, H + 0.03), loc=(0, yc + sy * 0.003, ZC), bm=rb)
    # clip bosses for the shroud (back face)
    for z in (Z0 + 0.06, Z0 + H - 0.06):
        C.box((0.012, 0.018, 0.022), loc=(-TANK_D / 2 - 0.004, yc, z), bevel=0.002 if HI() else 0, segs=1, bm=rb)
    if side == "R":  # filler neck on the top of the outlet tank
        C.cyl(0.019, 0.034, seg(28, 12), loc=(0.0, yc, Z0 + H + 0.034), bm=rb)
        C.cyl(0.023, 0.004, seg(28, 12), loc=(0.0, yc, Z0 + H + 0.051), bm=rb)
        C.cyl(0.013, 0.01, 10, loc=(-0.018, yc, Z0 + H + 0.045), axis="X", bm=rb)  # overflow spigot
    else:  # drain boss at the bottom back
        C.cyl(0.011, 0.012, 16, loc=(-TANK_D / 2 - 0.004, yc, Z0 + 0.006), axis="X", bm=rb)
    rob = C.obj("_ribs", rb, ["tank_plastic"], sharp=35)
    parts.append(rob)
    o = C.join(parts, "tank_" + side)
    uv_box01(o, 0.8)
    return o, yc


def neck(name, side, z, out_dir):
    """moulded hose neck with a retaining bead, leaving the tank outboard then turning back (-X)"""
    sy = 1 if side == "L" else -1
    yc = sy * (W / 2 + 0.0045 + TANK_W / 2)
    p0 = V((0.0, yc + sy * 0.010, z))
    pts = [p0, p0 + V((0, sy * 0.030, 0)), p0 + V((-0.02, sy * 0.050, out_dir * 0.004)), p0 + V((-0.07, sy * 0.058, out_dir * 0.01))]
    path = C.bezier_path(pts, seg(8, 4))
    bm = bmesh.new()
    C.tube(path, 0.0165, seg(24, 10), caps=True, bm=bm)
    # bead ring near the end + base collar
    end, prev = path[-1], path[-3]
    d = (end - prev).normalized()
    ring = C.torus(0.0165, 0.0022, seg(24, 10), 6, axis="Z")
    C.xform(ring, rot=V((0, 0, 1)).rotation_difference(d).to_matrix(), loc=end - d * 0.012)
    C.merge(bm, ring)
    col = C.cyl(0.022, 0.012, seg(24, 10), axis="Y", loc=(0.0, yc + sy * 0.006, z))
    C.merge(bm, col)
    o = C.obj(name, bm, ["tank_plastic"], sharp=40)
    uv_box01(o, 0.8)
    return o


def make_cap(yc):
    z = Z0 + H + 0.053
    prof = [(0.0, z + 0.022), (0.012, z + 0.022), (0.02, z + 0.02), (0.027, z + 0.014), (0.029, z + 0.004),
            (0.029, z), (0.022, z - 0.001), (0.0, z - 0.001)]
    bm = C.lathe(prof[::-1], seg(40, 16), axis="Z")
    C.xform(bm, loc=(0, yc, 0))
    # grip ribs around the skirt + the pressure lever (flat tab)
    for k in range(seg(24, 0)):
        a = 2 * math.pi * k / 24
        r = C.box((0.004, 0.0025, 0.012), loc=(0.029 * math.cos(a), yc + 0.029 * math.sin(a), z + 0.007))
        C.xform(r, loc=(0, 0, 0))
        for v in r.verts:
            pass
        C.merge(bm, r)
    lev = C.box((0.034, 0.006, 0.008), loc=(0, yc, z + 0.025), bevel=0.002 if HI() else 0, segs=1, mat=1)
    C.merge(bm, lev)
    return C.obj("cap", bm, ["cap_black", "steel"], sharp=40)


def make_drain(yc):
    x = -TANK_D / 2 - 0.012
    bm = bmesh.new()
    C.cyl(0.009, 0.012, 16, loc=(x, yc, Z0 + 0.006), axis="X", bm=bm)
    C.merge(bm, C.box((0.008, 0.030, 0.008), loc=(x - 0.009, yc, Z0 + 0.006), bevel=0.002 if HI() else 0, segs=1))
    return C.obj("drain_cock", bm, ["cap_black"], sharp=40)


def make_mount(side):
    sy = 1 if side == "L" else -1
    bm = bmesh.new()
    yc = sy * (W / 2 + 0.0045 + TANK_W / 2)
    # bottom pin: grommet + stem to the floor (y = 0)
    C.cyl(0.0055, Z0 - 0.022, 12, loc=(0, yc, (Z0 - 0.022) / 2), bm=bm, mat=1)
    C.cyl(0.013, 0.012, seg(20, 10), loc=(0, yc, Z0 - 0.028), bevel=0.003 if HI() else 0, bm=bm)
    # top pin + grommet
    zt = Z0 + H + 0.022
    x = 0.0 if sy > 0 else 0.030
    C.cyl(0.0055, 0.026, 12, loc=(x, yc, zt + 0.013), bm=bm, mat=1)
    C.cyl(0.012, 0.012, seg(20, 10), loc=(x, yc, zt + 0.02), bevel=0.003 if HI() else 0, bm=bm)
    return C.obj("mount_" + side, bm, ["rubber", "steel_zinc"], sharp=40)


# ── condenser ────────────────────────────────────────────────────────────────
def make_condenser():
    cw, ch, cd = 0.60, 0.36, 0.016
    x = D / 2 + 0.016 + cd / 2
    zc = ZC + 0.01
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    for xx, flip in ((x + cd / 2, False), (x - cd / 2, True)):
        vs = [bm.verts.new((xx, -cw / 2, zc - ch / 2)), bm.verts.new((xx, cw / 2, zc - ch / 2)),
              bm.verts.new((xx, cw / 2, zc + ch / 2)), bm.verts.new((xx, -cw / 2, zc + ch / 2))]
        uvs = [(0, 0), (1, 0), (1, 1), (0, 1)]
        if flip:
            vs, uvs = vs[::-1], uvs[::-1]
        f = bm.faces.new(vs)
        for lp, uv in zip(f.loops, uvs):
            lp[uvl].uv = uv
    C.box((cd - 0.001, cw, ch - 0.002), loc=(x, 0, zc), bm=bm, mat=2)
    face = C.obj("_cface", bm, ["condenser_face", "alu_pipe", "rubber"], smooth=False, recalc=False)
    pb = bmesh.new()
    # side plates, round header tubes, receiver-dryer bottle, pipe stubs with fittings, brackets
    for sz in (-1, 1):
        C.box((cd + 0.002, cw + 0.004, 0.003), loc=(x, 0, zc + sz * (ch / 2 + 0.0015)), bm=pb)
    for sy in (1, -1):
        C.cyl(0.012, ch + 0.03, seg(20, 8), loc=(x, sy * (cw / 2 + 0.012), zc), bm=pb)
        for sz in (-1, 1):
            C.cyl(0.0125, 0.003, seg(20, 8), loc=(x, sy * (cw / 2 + 0.012), zc + sz * (ch / 2 + 0.015)), bm=pb)
    yb = -(cw / 2 + 0.042)
    C.cyl(0.024, 0.20, seg(28, 12), loc=(x, yb, zc - 0.03), bevel=0.008 if HI() else 0, bm=pb)
    C.cyl(0.018, 0.012, seg(20, 8), loc=(x, yb, zc + 0.078), bm=pb)
    for sz in (-1, 1):
        C.box((0.01, 0.03, 0.012), loc=(x, yb + 0.02, zc - 0.03 + sz * 0.06), bm=pb)
    for z, r in ((zc + ch / 2 - 0.03, 0.008), (zc - ch / 2 + 0.05, 0.006)):
        path = C.bend_path([V((x, cw / 2 + 0.012, z)), V((x, cw / 2 + 0.04, z)), V((x - 0.03, cw / 2 + 0.05, z)),
                            V((x - 0.06, cw / 2 + 0.05, z))], r=0.015, res=seg(5, 2))
        C.tube(path, r, seg(14, 6), bm=pb)
        C.merge(pb, C.box((0.02, 0.026, 0.026), loc=(x - 0.06, cw / 2 + 0.05, z), bevel=0.003 if HI() else 0, segs=1))
    for sy in (1, -1):  # rubber-bushed brackets to the radiator tanks
        C.box((0.024, 0.016, 0.012), loc=(x - 0.014, sy * (cw / 2 + 0.018), zc + ch / 2 + 0.01), bm=pb, mat=2)
    po = C.obj("_cpipes", pb, ["alu_pipe", "alu_pipe", "rubber"], sharp=35)
    return C.join([face, po], "condenser")


# ── shroud + fan ─────────────────────────────────────────────────────────────
def make_shroud():
    sw, shh = W + 0.05, H + 0.02
    xb = SH_X - 0.030  # back plate
    bm = bmesh.new()
    # back plate with the fan opening
    plate = C.box((0.003, sw, shh), loc=(xb, 0, ZC))
    C.merge(bm, plate)
    po = C.obj("_plate", bm, ["shroud_plastic"], smooth=False)
    cut = bmesh.new()
    C.cyl(RING_R + 0.002, 0.05, seg(64, 28), loc=(xb, 0, ZC), axis="X", bm=cut)
    if HI():  # corner ram-air openings (closed by rubber flaps)
        for sy in (1, -1):
            for sz in (-1, 1):
                C.box((0.05, 0.07, 0.05), loc=(xb, sy * 0.25, ZC + sz * 0.135), bm=cut)
    C.boolean(po, C.obj("_cut", cut, ["shroud_plastic"], smooth=False))
    parts = [po]
    wb = bmesh.new()
    # perimeter wall towards the core + rolled lip
    for sz in (-1, 1):
        C.box((0.032, sw, 0.003), loc=(xb + 0.016, 0, ZC + sz * shh / 2), bm=wb)
    for sy in (1, -1):
        C.box((0.032, 0.003, shh), loc=(xb + 0.016, sy * sw / 2, ZC), bm=wb)
    # bell-mouth ring
    prof = [(RING_R + 0.012, xb + 0.0), (RING_R + 0.002, xb - 0.002), (RING_R, xb - 0.012), (RING_R + 0.001, xb - 0.042),
            (RING_R + 0.004, xb - 0.050)]
    ring = C.lathe(prof, seg(72, 28), axis="X")
    C.xform(ring, loc=(0, 0, ZC))
    C.merge(wb, ring)
    prof2 = [(p[0] + 0.0025, p[1]) for p in prof[::-1]]
    ring2 = C.lathe(prof2, seg(72, 28), axis="X")
    C.xform(ring2, loc=(0, 0, ZC))
    C.merge(wb, ring2)
    # stiffening ribs radiating from the ring on the back face
    for k in range(seg(8, 4)):
        a = 2 * math.pi * (k + 0.5) / 8 if HI() else 2 * math.pi * (k + 0.5) / 4
        dy, dz = math.cos(a), math.sin(a)
        r0 = RING_R + 0.012
        edge = min((sw / 2 - 0.01) / max(abs(dy), 1e-3), (shh / 2 - 0.01) / max(abs(dz), 1e-3))
        L = max(0.02, edge - r0)
        rib = C.box((0.012, L, 0.005), loc=(0, r0 + L / 2, 0))
        C.xform(rib, rot=Matrix.Rotation(a, 3, "X"), loc=(xb - 0.0075, 0, ZC))
        C.merge(wb, rib)
    # rubber flaps over the ram-air openings
    fb = bmesh.new()
    if HI():
        for sy in (1, -1):
            for sz in (-1, 1):
                for k in range(3):
                    fl = C.box((0.002, 0.066, 0.017), loc=(xb - 0.004, sy * 0.25, ZC + sz * 0.135 + (k - 1) * 0.0165))
                    C.xform(fl, loc=(0, 0, 0))
                    C.merge(fb, fl)
    # fan spider: flat struts from the ring's rear edge in to the motor ring, just behind the blades
    sb = bmesh.new()
    xs = -0.106
    for k in range(5):
        a = 2 * math.pi * (k + 0.1) / 5
        r0, r1 = 0.056, RING_R + 0.004
        st = C.box((0.010, r1 - r0, 0.007), loc=(0, (r0 + r1) / 2, 0), bevel=0.002 if HI() else 0, segs=1)
        for v in st.verts:  # meet the ring edge slightly forward
            v.co.x += (v.co.y - r0) / (r1 - r0) * (xb - 0.050 - xs + 0.004)
        C.xform(st, rot=Matrix.Rotation(a, 3, "X"), loc=(xs, 0, ZC))
        C.merge(sb, st)
    # motor mounting ring
    mr = C.lathe([(0.046, xs + 0.005), (0.058, xs + 0.005), (0.058, xs - 0.005), (0.046, xs - 0.005), (0.046, xs + 0.005)],
                 seg(40, 16), axis="X")
    C.xform(mr, loc=(0, 0, ZC))
    C.merge(sb, mr)
    parts.append(C.obj("_walls", wb, ["shroud_plastic"], sharp=40))
    if HI():
        parts.append(C.obj("_flaps", fb, ["rubber"], sharp=40))
    parts.append(C.obj("_struts", sb, ["shroud_plastic"], sharp=40))
    # clips onto the tank bosses
    cb = bmesh.new()
    for sy in (1, -1):
        for z in (Z0 + 0.06, Z0 + H - 0.06):
            C.box((0.02, 0.03, 0.03), loc=(xb + 0.004, sy * (sw / 2 - 0.018), z), bevel=0.003 if HI() else 0, segs=1, bm=cb)
    parts.append(C.obj("_clips", cb, ["shroud_plastic"], sharp=40))
    o = C.join(parts, "shroud")
    uv_box01(o, 0.9)
    return o


def blade(bm, k, nb, nr, nc):
    """one skewed, twisted fan blade (closed thin shell) about the X axis, fan centred at the origin"""
    r0, r1 = 0.050, FAN_R
    t_root, t_tip = 0.0032, 0.0016
    base = 2 * math.pi * k / nb
    top, bot = [], []
    for i in range(nr + 1):
        s = i / nr
        r = r0 + (r1 - r0) * s
        chord = 0.056 + 0.050 * math.sin(math.pi * min(1, s * 1.15) * 0.62)
        beta = math.radians(36 - 18 * s)  # pitch: steeper at the root
        skew = 0.55 * s ** 1.6  # forward-swept tips (rad)
        th = t_root + (t_tip - t_root) * s
        rt, rb_ = [], []
        for j in range(nc + 1):
            c = (j / nc - 0.5) * chord
            camber = 0.012 * chord / 0.08 * (1 - (2 * j / nc - 1) ** 2)
            ang = base + skew + c * math.cos(beta) / r
            x = -c * math.sin(beta) + camber
            thick = th * (0.35 + 0.65 * math.sin(math.pi * j / nc) ** 0.5)
            for lst, off in ((rt, thick / 2), (rb_, -thick / 2)):
                lst.append(bm.verts.new((x + off * math.cos(beta), r * math.cos(ang), r * math.sin(ang))))
        top.append(rt)
        bot.append(rb_)
    for i in range(nr):
        for j in range(nc):
            bm.faces.new((top[i][j], top[i][j + 1], top[i + 1][j + 1], top[i + 1][j]))
            bm.faces.new((bot[i][j], bot[i + 1][j], bot[i + 1][j + 1], bot[i][j + 1]))
    for i in range(nr):  # leading / trailing edges
        bm.faces.new((top[i][0], top[i + 1][0], bot[i + 1][0], bot[i][0]))
        bm.faces.new((top[i][nc], bot[i][nc], bot[i + 1][nc], top[i + 1][nc]))
    for j in range(nc):  # tip + root caps
        bm.faces.new((top[nr][j], top[nr][j + 1], bot[nr][j + 1], bot[nr][j]))
        bm.faces.new((top[0][j], bot[0][j], bot[0][j + 1], top[0][j + 1]))


def make_fan():
    bm = bmesh.new()
    nb = 7
    for k in range(nb):
        blade(bm, k, nb, seg(14, 6), seg(10, 4))
    # hub cup (open towards the motor), blade root band, centre spinner
    prof = [(0.0, 0.028), (0.02, 0.027), (0.04, 0.022), (0.052, 0.014), (0.056, 0.004), (0.056, -0.028),
            (0.052, -0.030), (0.052, -0.004), (0.046, 0.010), (0.0, 0.016)]
    hub = C.lathe(prof, seg(48, 20), axis="X")
    C.merge(bm, hub)
    if HI():  # hub ribs inside the cup
        for k in range(nb):
            a = 2 * math.pi * (k + 0.5) / nb
            rib = C.box((0.03, 0.03, 0.0025), loc=(-0.014, 0.036, 0))
            C.xform(rib, rot=Matrix.Rotation(a, 3, "X"))
            C.merge(bm, rib)
    C.cyl(0.009, 0.006, 6, loc=(0.030, 0, 0), axis="X", bm=bm, mat=1)  # clip nut
    o = C.obj("fan", bm, ["fan_plastic", "steel"], sharp=35, recalc=True)
    o.location = (FAN_X, 0, ZC)
    return o


def make_motor():
    bm = bmesh.new()
    x0 = FAN_X - 0.036
    prof = [(0.0, x0), (0.02, x0), (0.044, x0 - 0.004), (0.046, x0 - 0.010), (0.046, x0 - 0.068), (0.043, x0 - 0.074),
            (0.03, x0 - 0.078), (0.012, x0 - 0.080), (0.0, x0 - 0.080)]
    C.merge(bm, C.lathe(prof[::-1], seg(40, 16), axis="X"))
    C.cyl(0.006, 0.02, 12, loc=(x0 + 0.008, 0, 0), axis="X", bm=bm, mat=1)  # shaft
    if HI():  # cooling slots (dark insets) + tie bolts
        for k in range(6):
            a = 2 * math.pi * k / 6
            sl = C.box((0.018, 0.004, 0.006), loc=(x0 - 0.064, 0.0455 * math.cos(a), 0.0455 * math.sin(a)), mat=2)
            C.xform(sl, loc=(0, 0, 0))
            C.merge(bm, sl)
        for k in range(2):
            a = math.pi * k + 0.4
            C.cyl(0.0035, 0.07, 8, loc=(x0 - 0.04, 0.0445 * math.cos(a), 0.0445 * math.sin(a)), axis="X", bm=bm, mat=0)
    # connector + lead
    C.merge(bm, C.box((0.018, 0.022, 0.016), loc=(x0 - 0.074, 0.03, 0.03), bevel=0.003 if HI() else 0, segs=1, mat=2))
    C.tube(C.bezier_path([V((x0 - 0.08, 0.03, 0.036)), V((x0 - 0.1, 0.05, 0.06)), V((x0 - 0.1, 0.12, 0.09))], seg(6, 3)),
           0.004, seg(8, 5), bm=bm, mat=3)
    C.xform(bm, loc=(0, 0, ZC))
    return C.obj("fan_motor", bm, ["motor_can", "steel", "rubber", "copper_wire"], sharp=40)


EXPLODE = {
    "condenser": (0.24, 0.0, 0.0), "core": (0.0, 0.0, 0.0),
    "tank_L": (0.0, 0.0, -0.20), "tank_R": (0.0, 0.0, 0.20),
    "neck_upper": (0.0, 0.0, -0.26), "neck_lower": (0.0, 0.0, 0.26), "drain_cock": (-0.04, 0.0, -0.24),
    "cap": (0.0, 0.14, 0.20), "mount_L": (0.0, 0.0, -0.20), "mount_R": (0.0, 0.0, 0.20),
    "shroud": (-0.22, 0.0, 0.0), "fan": (-0.36, 0.0, 0.0), "fan_motor": (-0.50, 0.0, 0.0),
}


def build(q):
    global Q
    Q = q
    C.reset()
    mats()
    root = C.empty("radiator")
    core, fins = make_core()
    tl, ycl = make_tank("L")
    tr, ycr = make_tank("R")
    nu = neck("neck_upper", "L", Z0 + H - 0.055, 1)
    nl = neck("neck_lower", "R", Z0 + 0.05, -1)
    cap = make_cap(ycr)
    drain = make_drain(ycl)
    mounts = [make_mount("L"), make_mount("R")]
    cond = make_condenser()
    shroud = make_shroud()
    fan = make_fan()
    motor = make_motor()
    parts = [core, tl, tr, nu, nl, cap, drain, cond, shroud, fan, motor] + mounts
    bpy.context.view_layer.update()
    # the core first with the tanks hidden (their feet would bake the header plates black), then the rest
    covers = [tl, tr, nu, nl, cap, drain] + mounts
    for o in covers:
        o.hide_render = True
    C.bake_ao_vcol([core], samples=seg(48, 16), max_dist=0.05, floor=0.3)
    for o in covers:
        o.hide_render = False
    C.bake_ao_vcol([p for p in parts if p is not core], samples=seg(48, 16), max_dist=0.05, floor=0.3)
    if fins is not None:
        core = C.join([core, fins], "core")
        parts[0] = core
    # pivots at part centres (fan: its axis)
    for o in parts:
        if o is fan:
            continue
        c = sum((V(v) for v in o.bound_box), V()) / 8
        o.data.transform(Matrix.Translation(-c))
        o.location = c
    for o in parts:
        o.parent = root
        C.set_explode(o, EXPLODE[o.name])
    C.set_spin(fan, (1, 0, 0), 1.0)
    # ground + centre (x / y of the bbox, lowest point on the floor)
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
        az = math.radians(float(a.get("az", "40")))
        d = float(a.get("d", "1.6"))
        C.look(a["look"], target=(0, 0, 0.25), cam=(d * math.cos(az), -d * math.sin(az), 0.55), fov=32,
               hdr=H_ + a.get("env", "workshop") + "-1k-v1.hdr", ground=True, spp=int(a.get("spp", "48")), res=(1200, 800))
    if a.get("out") or not a.get("look"):
        C.finish("radiator", q, root, a.get("out"), pivots=True)
