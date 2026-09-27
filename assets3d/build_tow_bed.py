"""Tilt-and-slide recovery bed ("kayar kasa" çekici üst yapısı) for the lib3d `truck` chassis, unbranded.

  Blender -b --factory-startup --python assets3d/build_tow_bed.py -- --q hi [--out x.glb] [--look /tmp/t.png]

Authored in the TRUCK's frame (three.js: faces +X, +Y up, left at -Z, origin on the ground midway between the
truck axles): add tow_bed.scene with the same transform as truck.scene and it sits on the chassis rails
(rails at z = +-0.43, top flange y = 1.116). Hide truck.nodes.fifth_wheel (the bed replaces it).

Nodes (runtime contract, README "tow_bed"):
  tow_bed > subframe (rails on the chassis + rear crossmember, fixed), toolbox_L, toolbox_R,
            ram_L / ram_R (tilt cylinders, pivot = base eye) > ram_L_rod / ram_R_rod (slides along local +X),
            bed_tilt (pivot = rear tilt hinge, x -2.66, y 1.245)
              > tilt_frame, ram_anchor_L / ram_anchor_R (empties: where the rod eyes attach),
                bed_slide (position.x < 0 slides the bed back along the tilted frame)
                  > bed (deck + side rails + tail + lamps), headboard (> light_bar), winch (> winch_drum spins),
                    cable, hook, ramp_L / ramp_R (hinged on the tail, stowed flat on the deck)
            wheel_lift (pivot on the subframe rear, rotation.z > 0 lowers the fork end) > wheel_lift_boom (position.x < 0
            extends) > wheel_lift_cross (fork arms)
Materials: paint (bed colour), deck_plate (checker plate), frame_black, steel_dark, hydraulic (chrome rods),
light_amber / light_tail / light_head (emissive), rubber, alu.
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

RAIL_Y = 0.43
RAIL_TOP = 1.116
SUB_H = 0.10
SUB_TOP = RAIL_TOP + SUB_H  # 1.216
TILT_H = 0.10
DECK = SUB_TOP + TILT_H + 0.012  # deck plate top 1.328
BED_XF, BED_XR = 0.80, -4.40  # bed front / rear (5.2 m)
BED_W = 1.20  # half width (2.40 m)
PIV = Vector((-2.66, 0.0, SUB_TOP + 0.03))  # tilt hinge
SUB_XF, SUB_XR = 0.88, -2.74
RAM_BASE = [Vector((0.12, sg * 0.24, 0.93)) for sg in (1, -1)]
RAM_TIP = [Vector((-0.62, sg * 0.24, SUB_TOP + 0.02)) for sg in (1, -1)]
Q = "hi"


def HI():
    return Q == "hi"


def t3(v):
    return (v[0], v[2], -v[1])


# ── materials ────────────────────────────────────────────────────────────────
def diamond_plate(n=512, cells=8, seed=81):
    """tileable checker (diamond tread) plate: raised lozenges alternating +-45 deg, galvanised speckle"""
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32) / n * cells
    ci, cj = np.floor(xx), np.floor(yy)
    u, v = xx - ci - 0.5, yy - cj - 0.5
    s = np.where((ci + cj) % 2 == 0, 1.0, -1.0)
    a = math.radians(45)
    ru = (u * math.cos(a) + s * v * math.sin(a))
    rv = (-s * u * math.sin(a) + v * math.cos(a))
    e = (ru / 0.40) ** 2 + (rv / 0.10) ** 2
    h = np.sqrt(np.clip(1 - e, 0, 1))
    f = T.fbm(n, n, base=32, octaves=4, seed=seed)
    sp = T.blur(T.white(n, n, seed + 1), 1)
    lum = 0.40 + 0.08 * (f - 0.5) + 0.05 * (sp - 0.5) + 0.07 * h
    rough = np.clip(0.42 + 0.14 * (f - 0.5) - 0.12 * h, 0, 1)
    return T.gray3(lum), T.orm(1 - 0.2 * (1 - h) * (h > 0), rough, 0.9), T.normal_from_height(h * 3.0 + sp * 0.2, 1.6)


def mats(q):
    hi = q == "hi"
    n = 512 if hi else 256
    da, do, dn = diamond_plate(n)
    C.material("deck_plate", (1, 1, 1), albedo=C.image("tb_deck_alb", da), orm=C.image("tb_deck_orm", do, False),
               normal=(C.image("tb_deck_n", dn, False) if hi else None), normal_strength=1.0, vcol=True,
               uv_scale=(5.4 / 0.30, 2.5 / 0.30))
    k = np.arange(256)
    band = ((k // 32) % 2).astype(np.float32)  # 0.25 m blocks along the strip (UV u = metres / 2)
    stripe = np.where(band[None, :, None] > 0, np.array(C.srgb("#f2f2f0"))[None, None, :], np.array(C.srgb("#e8520c"))[None, None, :])
    stripe = np.repeat(stripe, 8, 0).astype(np.float32)
    C.material("reflective", (1, 1, 1), albedo=C.image("tb_stripe", stripe), rough=0.35, uv_scale=(5.4 / 2.0, 1))
    C.material("paint", C.srgb("#b8231c"), 0.32, 0.1, coat=1.0, coat_rough=0.04, vcol=True)
    C.material("frame_black", C.srgb("#151618"), 0.5, 0.35, vcol=True)
    C.material("steel_dark", C.srgb("#2e3033"), 0.42, 0.85, vcol=True)
    C.material("hydraulic", C.srgb("#d6d9dd"), 0.12, 1.0, vcol=True)
    C.material("alu", C.srgb("#c5c8cc"), 0.3, 1.0, vcol=True)
    C.material("galv", C.srgb("#9ea3a8"), 0.45, 0.9, vcol=True)
    C.material("rubber", C.srgb("#161617"), 0.75, 0.0, vcol=True)
    C.material("cable", C.srgb("#8b8f94"), 0.35, 1.0, vcol=True)
    C.material("hook_yellow", C.srgb("#d9a10f"), 0.4, 0.2, vcol=True)
    C.material("lamp_housing", C.srgb("#111214"), 0.3, 0.4, vcol=True)
    C.material("light_amber", C.srgb("#b86a08"), 0.2, 0.0, coat=1.0, coat_rough=0.02, emission=(C.srgb("#ff9a10"), 0.6))
    C.material("light_tail", C.srgb("#520305"), 0.2, 0.0, coat=1.0, coat_rough=0.02, emission=(C.srgb("#ff1a12"), 0.3))
    C.material("light_head", C.srgb("#f2f2f2"), 0.2, 0.0, emission=(C.srgb("#eef4ff"), 1.5))


def uv_deck(ob):
    me = ob.data
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
    uvl = me.uv_layers.active.data
    for p in me.polygons:
        for li in p.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            w = ob.matrix_world @ v
            uvl[li].uv = (min(max((w.x + 4.6) / 5.4, 0), 1), min(max((w.y + 1.25) / 2.5, 0), 1))
    return ob


def mk(name, bm, mats_, sharp=35, uvbox=0.5, recalc=True):
    o = C.obj(name, bm, mats_, sharp=sharp, recalc=recalc)
    if uvbox:
        C.uv_box(o, uvbox)
        me = o.data  # keep UVs inside [0, 1] (quantisation): wrap the metric box UVs into one tile
        for d in me.uv_layers.active.data:
            d.uv = (d.uv.x % 1.0, d.uv.y % 1.0) if False else (min(max(d.uv.x * 0.08 + 0.5, 0), 1), min(max(d.uv.y * 0.08 + 0.5, 0), 1))
    return o


def set_pivot(ob, p):
    p = Vector(p)
    ob.data.transform(Matrix.Translation(-p))
    ob.location = p
    return ob


def beam(p0, p1, w, h, bm=None, mat=0, bevel=0.0):
    """box beam from p0 to p1 (Blender), cross-section w (horizontal) x h"""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    L = d.length
    b = C.box((L, w, h), bevel=bevel, segs=1, mat=mat)
    rot = d.to_track_quat("X", "Z").to_matrix()
    C.xform(b, rot=rot, loc=(p0 + p1) / 2)
    if bm is None:
        return b
    C.merge(bm, b)
    return bm


def cyl_between(p0, p1, r, segs, bm=None, mat=0):
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    b = C.cyl(r, d.length, segs, axis="X", mat=mat)
    C.xform(b, rot=d.to_track_quat("X", "Z").to_matrix(), loc=(p0 + p1) / 2)
    if bm is None:
        return b
    C.merge(bm, b)
    return bm


# ── parts ────────────────────────────────────────────────────────────────────
def make_subframe():
    b = bmesh.new()
    for sg in (1, -1):
        y = sg * RAIL_Y
        C.box((SUB_XF - SUB_XR, 0.09, SUB_H), loc=((SUB_XF + SUB_XR) / 2, y, RAIL_TOP + SUB_H / 2), bm=b)
        # clamp plates down onto the truck rails
        for x in np.linspace(SUB_XF - 0.3, SUB_XR + 0.4, 5):
            C.box((0.12, 0.012, 0.22), loc=(x, y + sg * 0.052, RAIL_TOP - 0.02), bm=b, mat=1)
            C.cyl(0.012, 0.03, 6, loc=(x, y + sg * 0.062, RAIL_TOP - 0.08), axis="Y", bm=b, mat=1)
    for x in (SUB_XF - 0.05, 0.1, -1.0, -2.0):
        C.box((0.08, 2 * RAIL_Y, 0.08), loc=(x, 0, RAIL_TOP + 0.05), bm=b)
    # rear crossmember with the tilt hinge lugs and the wheel-lift housing
    C.box((0.14, 2.10, 0.20), loc=(SUB_XR + 0.05, 0, RAIL_TOP - 0.02), bevel=0.01 if HI() else 0, bm=b)
    for sg in (1, -1):
        C.box((0.12, 0.05, 0.12), loc=(PIV.x, sg * 0.52, PIV.z - 0.05), bm=b)
        C.cyl(0.035, 0.08, 16 if HI() else 8, loc=(PIV.x, sg * 0.52, PIV.z), axis="Y", bm=b, mat=1)
        # ram base brackets
        C.box((0.10, 0.03, 0.26), loc=(RAM_BASE[0].x, sg * 0.30, 1.0), bm=b)
    C.box((0.10, 0.62, 0.05), loc=(RAM_BASE[0].x, 0, 0.88), bm=b)
    # rear under-run bar (bumper) on the subframe
    C.box((0.10, 2.0, 0.12), loc=(SUB_XR - 0.02, 0, 0.62), bevel=0.01 if HI() else 0, bm=b, mat=2)
    for sg in (1, -1):
        C.box((0.08, 0.08, 0.40), loc=(SUB_XR + 0.02, sg * 0.60, 0.84), bm=b)
    return mk("subframe", b, ["frame_black", "steel_dark", "paint"])


def make_tilt_frame():
    b = bmesh.new()
    for sg in (1, -1):
        C.box((0.82 - PIV.x + 0.06, 0.08, TILT_H), loc=((0.82 + PIV.x - 0.06) / 2, sg * 0.50, SUB_TOP + TILT_H / 2), bm=b)
        # slide rollers along the top
        for x in np.linspace(0.6, PIV.x + 0.2, 5):
            C.cyl(0.03, 0.05, 12 if HI() else 6, loc=(x, sg * 0.50, SUB_TOP + TILT_H - 0.01), axis="Y", bm=b, mat=1)
        C.cyl(0.04, 0.10, 16 if HI() else 8, loc=(PIV.x, sg * 0.52, PIV.z), axis="Y", bm=b, mat=1)
    for x in (0.70, -0.62, -1.7):
        C.box((0.08, 1.0, 0.07), loc=(x, 0, SUB_TOP + 0.05), bm=b)
    # ram eye lugs under the -0.62 crossmember
    for sg in (1, -1):
        C.box((0.08, 0.03, 0.10), loc=(RAM_TIP[0].x, sg * 0.28, SUB_TOP - 0.01), bm=b)
    return mk("tilt_frame", b, ["frame_black", "steel_dark"])


def make_bed():
    """deck plate + crossmembers + side rails with tie-down slots + tapered tail with roller + rear lamps"""
    parts = []
    L = BED_XF - BED_XR
    tail0 = BED_XR + 0.70  # the tail taper starts here
    # deck: a plate with a kinked tail (drops 0.10 over the last 0.70 m)
    d = bmesh.new()
    xs = [BED_XF, tail0, BED_XR]
    zs = [DECK, DECK, DECK - 0.10]
    t = 0.012
    ny = 1
    vt = [[d.verts.new((x, sy * (BED_W - 0.06), z)) for sy in (-1, 1)] for x, z in zip(xs, zs)]
    vb = [[d.verts.new((x, sy * (BED_W - 0.06), z - t)) for sy in (-1, 1)] for x, z in zip(xs, zs)]
    for i in range(2):
        d.faces.new((vt[i][0], vt[i][1], vt[i + 1][1], vt[i + 1][0]))
        d.faces.new((vb[i + 1][0], vb[i + 1][1], vb[i][1], vb[i][0]))
    deck = C.obj("_deck", d, ["deck_plate"], smooth=False, recalc=False)
    C.solidify(deck, 0.0) if False else None
    uv_deck(deck)
    parts.append(deck)
    # side rails: C-profile boxes along the length (paint), following the tail kink
    rb = bmesh.new()
    for sg in (1, -1):
        y = sg * (BED_W - 0.04)
        beam((BED_XF, y, DECK - 0.10), (tail0, y, DECK - 0.10), 0.08, 0.24, bm=rb)
        beam((tail0, y, DECK - 0.10), (BED_XR, y, DECK - 0.20), 0.08, 0.24, bm=rb)
        beam((BED_XF, y + sg * 0.035, DECK - 0.215), (tail0, y + sg * 0.035, DECK - 0.215), 0.03, 0.02, bm=rb, mat=1)
        # stake pockets / tie-down slot blocks along the rail (dark recesses)
        for x in np.arange(BED_XF - 0.35, tail0, 0.45):
            C.box((0.10, 0.012, 0.05), loc=(x, y + sg * 0.041, DECK - 0.05), bm=rb, mat=1)
    # longitudinal channels + crossmembers under the deck
    for sg in (1, -1):
        beam((BED_XF, sg * 0.56, DECK - 0.07), (tail0, sg * 0.56, DECK - 0.07), 0.06, 0.12, bm=rb, mat=2)
        beam((tail0, sg * 0.56, DECK - 0.07), (BED_XR + 0.1, sg * 0.56, DECK - 0.16), 0.06, 0.12, bm=rb, mat=2)
    for x in np.arange(BED_XF - 0.1, BED_XR + 0.3, -0.55):
        z = DECK if x > tail0 else DECK - 0.10 * (tail0 - x) / 0.70
        C.box((0.06, 2 * BED_W - 0.12, 0.08), loc=(x, 0, z - 0.052), bm=rb, mat=2)
    # tie-down rails inside the side rails (slotted track)
    for sg in (1, -1):
        C.box((tail0 - BED_XF + 0.0 if False else (BED_XF - tail0) - 0.2, 0.05, 0.012),
              loc=((BED_XF + tail0) / 2, sg * (BED_W - 0.12), DECK + 0.006), bm=rb, mat=1)
    # tail: rear roller + beam + lamp housings
    C.cyl(0.07, 2 * BED_W - 0.3, 20 if HI() else 10, loc=(BED_XR - 0.02, 0, DECK - 0.20), axis="Y", bm=rb, mat=1)
    C.box((0.10, 2 * BED_W, 0.12), loc=(BED_XR + 0.05, 0, DECK - 0.17), bm=rb)
    for sg in (1, -1):
        C.box((0.05, 0.36, 0.12), loc=(BED_XR + 0.02, sg * 0.88, DECK - 0.30), bm=rb, mat=3)
    rails = mk("_rails", rb, ["paint", "steel_dark", "frame_black", "lamp_housing"])
    parts.append(rails)
    sb = bmesh.new()
    uvl = sb.loops.layers.uv.verify()
    for sg in (1, -1):
        y = sg * (BED_W + 0.0012)
        pts = [(BED_XF - 0.05, DECK - 0.12), (tail0, DECK - 0.12), (BED_XR + 0.05, DECK - 0.22)]
        vs = [(sb.verts.new((x, y, z - 0.035)), sb.verts.new((x, y, z + 0.035))) for x, z in pts]
        acc = 0.0
        for i in range(2):
            a, b = vs[i], vs[i + 1]
            L2 = math.dist(pts[i], pts[i + 1])
            f = sb.faces.new((a[0], b[0], b[1], a[1]) if sg > 0 else (a[1], b[1], b[0], a[0]))
            u0, u1 = acc / 5.4, (acc + L2) / 5.4
            for lp in f.loops:
                lp[uvl].uv = (u0 if lp.vert in a else u1, 0.0 if lp.vert in (a[0], b[0]) else 1.0)
            acc += L2
    parts.append(mk("_stripe", sb, ["reflective"], uvbox=0, recalc=False))
    lb = bmesh.new()
    for sg in (1, -1):
        C.box((0.02, 0.18, 0.09), loc=(BED_XR - 0.005, sg * 0.94, DECK - 0.30), bm=lb)
    parts.append(mk("_tail", lb, ["light_tail"], uvbox=0))
    ab = bmesh.new()
    for sg in (1, -1):
        C.box((0.02, 0.10, 0.09), loc=(BED_XR - 0.005, sg * 0.76, DECK - 0.30), bm=ab)
        for x in (BED_XF - 0.3, -1.8, BED_XR + 0.4):  # side markers
            C.box((0.07, 0.015, 0.035), loc=(x, sg * (BED_W + 0.003), DECK - 0.03), bm=ab)
    parts.append(mk("_amber", ab, ["light_amber"], uvbox=0))
    o = C.join(parts, "bed")
    return o


def make_headboard():
    b = bmesh.new()
    x = BED_XF - 0.04
    H = 0.95
    for sg in (1, -1):
        C.box((0.08, 0.08, H), loc=(x, sg * (BED_W - 0.06), DECK + H / 2), bm=b)
    C.box((0.08, 2 * BED_W - 0.04, 0.08), loc=(x, 0, DECK + H - 0.04), bm=b)
    C.box((0.08, 2 * BED_W - 0.04, 0.06), loc=(x, 0, DECK + 0.03), bm=b)
    nb = 7 if HI() else 4
    for k in range(nb):  # horizontal bars (see-through guard)
        z = DECK + 0.12 + k * (H - 0.22) / (nb - 1)
        C.box((0.03, 2 * BED_W - 0.14, 0.04), loc=(x, 0, z), bm=b)
    for y in (-0.4, 0.4):
        C.box((0.05, 0.05, H - 0.1), loc=(x, y, DECK + H / 2), bm=b)
    # control lever box on the left post (driver side controls)
    C.box((0.18, 0.12, 0.26), loc=(x + 0.05, BED_W - 0.1, DECK + 0.35), bm=b, mat=1)
    return mk("headboard", b, ["paint", "steel_dark"])


def make_light_bar():
    b = bmesh.new()
    x = BED_XF - 0.04
    zt = DECK + 0.95
    C.box((0.20, 1.5, 0.05), loc=(x, 0, zt + 0.025), bm=b, mat=0)
    for sg in (1, -1):  # work lights facing back
        C.box((0.06, 0.18, 0.10), loc=(x - 0.12, sg * 0.35, zt + 0.02), bm=b, mat=0)
    bar = mk("_lbar", b, ["lamp_housing"], uvbox=0)
    a = bmesh.new()
    for sg in (1, -1):
        C.cyl(0.07, 0.12, 20 if HI() else 10, loc=(x, sg * 0.62, zt + 0.11), bm=a)
    amb = mk("_beacons", a, ["light_amber"], uvbox=0)
    w = bmesh.new()
    for sg in (1, -1):
        C.box((0.01, 0.15, 0.07), loc=(x - 0.155, sg * 0.35, zt + 0.02), bm=w)
    wl = mk("_work", w, ["light_head"], uvbox=0)
    return C.join([bar, amb, wl], "light_bar")


WINCH = Vector((BED_XF - 0.34, 0.0, DECK + 0.16))


def make_winch():
    b = bmesh.new()
    for sg in (1, -1):
        C.box((0.30, 0.02, 0.30), loc=(WINCH.x, sg * 0.24, WINCH.z), bevel=0.01 if HI() else 0, bm=b)
    C.box((0.34, 0.60, 0.02), loc=(WINCH.x, 0, DECK + 0.01), bm=b)
    C.cyl(0.08, 0.26, 20 if HI() else 10, loc=(WINCH.x, 0.37, WINCH.z), axis="Y", bm=b, mat=1)  # hydraulic motor
    C.cyl(0.06, 0.12, 16 if HI() else 8, loc=(WINCH.x, -0.31, WINCH.z), axis="Y", bm=b, mat=2)  # gearbox
    return mk("winch", b, ["frame_black", "steel_dark", "paint"])


def make_drum():
    b = bmesh.new()
    C.cyl(0.075, 0.44, 32 if HI() else 12, loc=(0, 0, 0), axis="Y", bm=b, mat=1)  # wound cable layer
    for sg in (1, -1):
        C.cyl(0.13, 0.015, 32 if HI() else 12, loc=(0, sg * 0.22, 0), axis="Y", bm=b)
    if HI():  # cable wraps (ridges) around the drum
        for k in range(18):
            C.torus(0.078, 0.006, 32, 6, loc=(0, -0.20 + k * 0.0235, 0), axis="Y", bm=b, mat=1)
    o = mk("winch_drum", b, ["steel_dark", "cable"], uvbox=0)
    o.location = WINCH
    return o


def make_cable_hook():
    x1 = BED_XR + 0.6
    path = [Vector((WINCH.x, 0, WINCH.z + 0.07)), Vector((WINCH.x - 0.5, 0, DECK + 0.03)), Vector((x1, 0.0, DECK + 0.03))]
    cb = C.tube(path, 0.007, 8 if HI() else 5)
    cable = mk("cable", cb, ["cable"], uvbox=0)
    hb = bmesh.new()
    C.torus(0.05, 0.014, 20 if HI() else 10, 8 if HI() else 5, loc=(0, 0, 0), axis="Z", bm=hb, arc=math.radians(250))
    C.cyl(0.02, 0.10, 12, loc=(0.09, 0, 0), axis="X", bm=hb)
    C.xform(hb, loc=(x1 - 0.1, 0.0, DECK + 0.035))
    hook = mk("hook", hb, ["hook_yellow"], uvbox=0)
    return cable, hook


def make_ramp(sg):
    """aluminium loading ramp, stowed lying flat on the deck, hinge on the tail (x = BED_XR)"""
    b = bmesh.new()
    L, w = 1.6, 0.36
    x0 = BED_XR + 0.03
    zc = DECK - 0.10 + 0.03
    y = sg * 0.72
    for s2 in (1, -1):
        C.box((L, 0.03, 0.06), loc=(x0 + L / 2, y + s2 * (w / 2 - 0.015), zc), bm=b)
    nr = 12 if HI() else 5
    for k in range(nr):
        C.box((0.04, w - 0.03, 0.025), loc=(x0 + 0.1 + k * (L - 0.2) / (nr - 1), y, zc + 0.01), bm=b)
    C.cyl(0.02, w, 10, loc=(x0, y, zc), axis="Y", bm=b, mat=1)
    o = mk(f"ramp_{'L' if sg > 0 else 'R'}", b, ["alu", "steel_dark"])
    set_pivot(o, (x0, y, zc))
    return o


def make_ram(sg):
    i = 0 if sg > 0 else 1
    p0, p1 = RAM_BASE[i], RAM_TIP[i]
    d = p1 - p0
    L = d.length
    b = bmesh.new()
    C.cyl(0.055, L * 0.62, 20 if HI() else 10, loc=(L * 0.31, 0, 0), axis="X", bm=b)
    C.cyl(0.035, 0.07, 12, loc=(0, 0, 0), axis="Y", bm=b, mat=1)  # base eye
    barrel = mk(f"ram_{'L' if sg > 0 else 'R'}", b, ["frame_black", "steel_dark"])
    r = bmesh.new()
    C.cyl(0.03, L * 0.55, 16 if HI() else 8, loc=(L - L * 0.275, 0, 0), axis="X", bm=r)
    C.cyl(0.03, 0.06, 12, loc=(L, 0, 0), axis="Y", bm=r, mat=1)
    rod = mk(f"ram_{'L' if sg > 0 else 'R'}_rod", r, ["hydraulic", "steel_dark"])
    return barrel, rod, d


def make_wheel_lift():
    """underlift: boom pivoted on the subframe rear, telescoping, crossbar with L-shaped fork arms (stowed)"""
    pv = Vector((SUB_XR - 0.02, 0, 0.86))
    b = bmesh.new()
    C.box((0.30, 0.16, 0.16), loc=(pv.x - 0.10, 0, pv.z), bm=b)
    C.cyl(0.05, 0.30, 16 if HI() else 8, loc=(pv.x, 0, pv.z), axis="Y", bm=b, mat=1)
    arm = mk("_wl_body", b, ["galv", "steel_dark"])
    bb = bmesh.new()
    C.box((1.30, 0.13, 0.13), loc=(pv.x - 0.25 - 0.65, 0, pv.z), bm=bb)
    boom = mk("wheel_lift_boom", bb, ["galv"])
    cb = bmesh.new()
    xc = pv.x - 1.58
    C.box((0.14, 1.70, 0.12), loc=(xc, 0, pv.z - 0.05), bm=cb)
    for sg in (1, -1):
        C.box((0.46, 0.08, 0.08), loc=(xc - 0.20, sg * 0.62, pv.z - 0.07), bm=cb, mat=1)  # fork arms (stowed along x)
        C.box((0.06, 0.08, 0.20), loc=(xc - 0.40, sg * 0.62, pv.z - 0.04), bm=cb, mat=1)
    for sg in (1, -1):
        C.box((0.03, 0.09, 0.12), loc=(xc - 0.07, sg * 0.40, pv.z - 0.05), bm=cb, mat=2)  # lamps on the crossbar
    cross = mk("wheel_lift_cross", cb, ["galv", "steel_dark", "light_amber"])
    return pv, arm, boom, cross


def make_toolbox(sg):
    b = bmesh.new()
    x = -3.20
    C.box((0.70, 0.36, 0.42), loc=(x, sg * 0.96, 0.98), bevel=0.012 if HI() else 0, segs=1, bm=b)
    C.box((0.30, 0.02, 0.03), loc=(x, sg * 1.145, 1.08), bm=b, mat=1)  # handle
    C.box((0.08, 0.30, 0.06), loc=(x + 0.2, sg * 0.70, 1.19), bm=b, mat=2)  # bracket to the frame
    C.box((0.08, 0.30, 0.06), loc=(x - 0.2, sg * 0.70, 1.19), bm=b, mat=2)
    return mk(f"toolbox_{'L' if sg > 0 else 'R'}", b, ["alu", "steel_dark", "frame_black"], uvbox=0)


# ── assembly ─────────────────────────────────────────────────────────────────
def build(q):
    global Q
    Q = q
    mats(q)
    root = C.empty("tow_bed")
    sub = make_subframe()
    tf = make_tilt_frame()
    bed = make_bed()
    hb = make_headboard()
    lbar = make_light_bar()
    winch = make_winch()
    drum = make_drum()
    cable, hook = make_cable_hook()
    ramps = [make_ramp(1), make_ramp(-1)]
    rams = [make_ram(1), make_ram(-1)]
    pv, wl_body, boom, cross = make_wheel_lift()
    tbs = [make_toolbox(1), make_toolbox(-1)]
    meshes = [sub, tf, bed, hb, lbar, winch, drum, cable, hook, wl_body, boom, cross] + ramps + tbs + \
        [r[0] for r in rams] + [r[1] for r in rams]
    # rams: built along +X from the origin; place them from base to tip for the AO bake
    for (barrel, rod, d), p0 in zip(rams, RAM_BASE):
        rot = d.to_track_quat("X", "Z").to_euler()
        for o in (barrel, rod):
            o.location = p0
            o.rotation_euler = rot
    bpy.context.view_layer.update()
    C.bake_ao_vcol([o for o in meshes if o.type == "MESH"], samples=40 if HI() else 16, max_dist=0.35, floor=0.3)
    for o in meshes:
        C.vcol_to_points(o)
    # hierarchy
    for o in (sub, *tbs):
        o.parent = root
    tilt = C.empty("bed_tilt", root, loc=PIV)
    slide = C.empty("bed_slide", tilt, loc=(0, 0, 0))

    def attach(o, par, par_world):
        mw = o.matrix_world.copy()
        o.parent = par
        o.matrix_parent_inverse = Matrix.Identity(4)
        o.matrix_basis = Matrix.Translation(-par_world) @ mw

    attach(tf, tilt, PIV)
    for o in (bed, hb, winch, cable, hook) + tuple(ramps):
        attach(o, slide, PIV)
    set_pivot(winch, WINCH - PIV) if False else None
    attach(drum, slide, PIV)
    lbar.parent = hb
    for sg, p1 in zip((1, -1), RAM_TIP):
        C.empty(f"ram_anchor_{'L' if sg > 0 else 'R'}", tilt, loc=p1 - PIV)
    for barrel, rod, d in rams:
        barrel.parent = root
        mw = rod.matrix_world.copy()
        rod.parent = barrel
        rod.matrix_parent_inverse = Matrix.Identity(4)
        rod.matrix_basis = Matrix.Identity(4)
        barrel["rod_rest"] = float(d.length)
    wl = C.empty("wheel_lift", root, loc=pv)
    wl_body.parent = wl
    wl_body.matrix_parent_inverse = Matrix.Identity(4)
    wl_body.location = -pv
    boom.parent = wl
    boom.matrix_parent_inverse = Matrix.Identity(4)
    boom.location = -pv
    cross.parent = boom
    cross.matrix_parent_inverse = Matrix.Identity(4)
    cross.location = (0, 0, 0)
    # spin + explode (three space)
    C.set_spin(drum, (0, 0, 1), 1.0)
    for o, v in ((sub, (0, -0.25, 0)), (tilt, (0, 0.55, 0)), (hb, (0.35, 0.25, 0)), (winch, (0.2, 0.45, 0)),
                 (drum, (0.2, 0.6, 0)), (hook, (-0.6, 0.3, 0)), (ramps[0], (-0.9, 0.35, -0.3)), (ramps[1], (-0.9, 0.35, 0.3)),
                 (tbs[0], (0, 0, -0.6)), (tbs[1], (0, 0, 0.6)), (wl, (-0.9, -0.2, 0)), (lbar, (0, 0.3, 0))):
        C.set_explode(o, v)
    root["mount"] = "truck frame; hide truck.nodes.fifth_wheel"
    return root


if __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    C.reset()
    root = build(q)
    if a.get("look"):
        H = os.path.join(C.HERE, "..", "public/lib3d/env/")
        C.look(a["look"], target=(-1.4, 0, 1.0), cam=(4.5, -8.5, 3.2), fov=34, hdr=H + a.get("env", "dusk") + "-1k-v1.hdr",
               ground=True, spp=int(a.get("spp", "24")), res=(1200, 700))
    C.finish("tow_bed", q, root, a.get("out"), pivots=True)
