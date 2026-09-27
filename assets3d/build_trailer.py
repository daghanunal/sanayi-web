"""13.6 m tri-axle curtainside semi-trailer (tente / perdeli yarı römork), unbranded, for the lib3d `truck`.

  Blender -b --factory-startup --python assets3d/build_trailer.py -- --q hi [--out x.glb] [--look /tmp/t.png]

three.js frame: faces +X, +Y up, left side at -Z. ORIGIN ON THE GROUND UNDER THE KINGPIN. The body runs from
x = +1.20 (headboard) to x = -12.40 (rear doors), 2.55 m wide, 4.00 m high; parked on its landing legs the
coupler plate sits at y = 1.265 = the truck's fifth-wheel height.
Coupling: trailer.scene.position = truck.scene.position + (-1.50, 0, 0) in the truck's frame (the truck's fifth-wheel
centre is x = -1.50); raise the landing legs (landing_legs.position.y = +0.30) when coupled.

Nodes (README "trailer"):
  trailer > chassis (main beams, crossmembers, side rails, coupler plate + kingpin, rear underrun + lamps, mudflaps,
                     side underrun guards, contour stripe), body (floor, headboard, roof, roof rails, posts, rear frame),
            curtain_L / curtain_R (pivot at the front post: scale.x 1 -> 0.12 bunches the curtain forward),
            door_RL_rear / door_RR_rear (hinged on the outer rear posts; left door rotation.y < 0 opens, right > 0),
            landing_gear (outer tubes, crank) > landing_legs (inner legs + sand shoes: position.y > 0 raises),
            axles (beams, air bags, hangers), hub_1L..hub_3R > wheel_1L..wheel_3R (385/65 R22.5 super singles;
            wheels spin about local Z like the truck: use trailer.roll(m)), spare_wheel, toolbox
Materials: paint (headboard / doors / side rails), curtain (near-white fabric x colour: recolour), frame_black,
alu, roof, reflective, light_tail, light_amber, tyre / rim materials of the truck.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

import build_truck as BT
import common as C
import texgen as T

X_F, X_R = 1.20, -12.40
HW = 1.275  # half width
FLOOR = 1.42  # floor top
ROOF = 4.00
KP_Z = 1.265  # coupler plate underside = fifth-wheel height
AXLES = [-7.29, -8.60, -9.91]
WHEEL_Y = 0.985
LEG_X = -2.30
Q = "hi"


def HI():
    return Q == "hi"


def mats(q):
    hi = q == "hi"
    n = 256
    # curtain: PVC-coated polyester, faint weave, near white (x colour recolours)
    f = T.fbm(n, n, base=16, octaves=4, seed=91)
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    weave = 0.5 + 0.25 * (np.sin(xx * 2 * np.pi * 64 / n) + np.sin(yy * 2 * np.pi * 64 / n))
    alb = T.gray3(0.86 + 0.05 * (f - 0.5))
    C.material("curtain", C.srgb("#2f4f7a"), albedo=C.image("tr_curt_alb", alb),
               orm=C.image("tr_curt_orm", T.orm(1, np.clip(0.62 + 0.1 * (f - 0.5), 0, 1), 0), False),
               normal=(C.image("tr_curt_n", T.normal_from_height(weave * 0.4 + f * 1.5, 1.0), False) if hi else None),
               normal_strength=0.5, vcol=True, uv_scale=(13.6 / 1.0, 2.6 / 1.0))
    C.material("paint", C.srgb("#d9dadc"), 0.34, 0.2, coat=0.8, coat_rough=0.06, vcol=True)
    C.material("frame_black", C.srgb("#17181a"), 0.5, 0.35, vcol=True)
    C.material("alu", C.srgb("#bfc3c8"), 0.32, 1.0, vcol=True)
    C.material("roof", C.srgb("#e6e7e4"), 0.55, 0.0, vcol=True)
    C.material("strap", C.srgb("#1a1b1d"), 0.6, 0.0, vcol=True)
    C.material("buckle", C.srgb("#9ca0a5"), 0.3, 1.0, vcol=True)
    k = np.arange(256)
    band = ((k // 32) % 2).astype(np.float32)
    yel = np.array(C.srgb("#f0b800")) * band[:, None] + np.array(C.srgb("#1a1a1a")) * (1 - band[:, None]) * 0 + \
        np.array(C.srgb("#f0b800")) * (1 - band[:, None]) * 0.25
    stripe = np.repeat(yel[None, :, :], 8, 0).astype(np.float32)
    C.material("reflective", (1, 1, 1), albedo=C.image("tr_stripe", stripe), rough=0.35, uv_scale=(13.6 / 2.0, 1))
    C.material("red_reflective", C.srgb("#c01010"), 0.3, 0.0)
    BT.truck_mats(q)  # tyres, rims, light_* (first definition wins: the names above stay ours)


def mk(name, bm, mats_, sharp=35, recalc=True, uvs=False):
    o = C.obj(name, bm, mats_, sharp=sharp, recalc=recalc)
    if not uvs:  # untextured: no UV layer (box seams would only split vertices)
        while o.data.uv_layers:
            o.data.uv_layers.remove(o.data.uv_layers[0])
    return o


def set_pivot(ob, p):
    p = Vector(p)
    ob.data.transform(Matrix.Translation(-p))
    ob.location = p
    return ob


def strip_uv(bm, pts, y, h, sg, mat, L_uv=13.6):
    """vertical-facing strip (height h) along (x, z) points at side y, outward normal sign sg"""
    uvl = bm.loops.layers.uv.verify()
    vs = [(bm.verts.new((x, y, z - h / 2)), bm.verts.new((x, y, z + h / 2))) for x, z in pts]
    acc = 0.0
    for i in range(len(pts) - 1):
        a, b = vs[i], vs[i + 1]
        L2 = math.dist(pts[i], pts[i + 1])
        # outward: a0 -> b0 runs along -x (towards the rear) for these point lists
        f = bm.faces.new((a[0], b[0], b[1], a[1]) if sg > 0 else (a[1], b[1], b[0], a[0]))
        f.material_index = mat
        for lp in f.loops:
            lp[uvl].uv = ((acc if lp.vert in a else acc + L2) / L_uv, 0.0 if lp.vert in (a[0], b[0]) else 1.0)
        acc += L2


# ── chassis ──────────────────────────────────────────────────────────────────
def beam_depth(x):
    """main I-beam web depth: gooseneck (thin) over the kingpin, full depth from x = -2.0"""
    if x > -1.2:
        return 0.13
    if x > -2.4:
        return 0.13 + (0.36 - 0.13) * (-1.2 - x) / 1.2
    if x < X_R + 0.6:
        return 0.36 - 0.18 * (X_R + 0.6 - x) / 0.6
    return 0.36


def make_chassis():
    b = bmesh.new()
    xs = [X_F - 0.05, -1.2, -2.4, X_R + 0.6, X_R + 0.02]
    top = FLOOR - 0.04
    for sg in (1, -1):
        y = sg * 0.46
        # web: polygon in x/z extruded 10 mm in y
        poly = [(x, top) for x in xs] + [(x, top - beam_depth(x)) for x in xs[::-1]]
        w0 = [b.verts.new((x, y - 0.005, z)) for x, z in poly]
        w1 = [b.verts.new((x, y + 0.005, z)) for x, z in poly]
        n = len(poly)
        for i in range(n):
            j = (i + 1) % n
            b.faces.new((w0[i], w0[j], w1[j], w1[i]))
        b.faces.new(w0[::-1])
        b.faces.new(w1)
        # flanges
        for k in range(len(xs) - 1):
            x0, x1 = xs[k], xs[k + 1]
            for zz in ("t", "b"):
                z0 = top if zz == "t" else top - beam_depth(x0)
                z1 = top if zz == "t" else top - beam_depth(x1)
                p0, p1 = Vector((x0, y, z0)), Vector((x1, y, z1))
                d = p1 - p0
                bx = C.box((d.length, 0.16, 0.014))
                C.xform(bx, rot=d.to_track_quat("X", "Z").to_matrix(), loc=(p0 + p1) / 2)
                C.merge(b, bx)
    # crossmembers + outriggers to the side rails
    for x in np.arange(X_F - 0.4, X_R + 0.3, -0.45 if HI() else -0.9):
        C.box((0.07, 2 * HW - 0.06, 0.09), loc=(x, 0, top - 0.05), bm=b)
    # side rails (outer frame, painted) carry the curtain buckles: mat 1
    for sg in (1, -1):
        C.box((X_F - X_R, 0.10, 0.20), loc=((X_F + X_R) / 2, sg * (HW - 0.05), FLOOR - 0.08), bm=b, mat=1)
    # coupler plate + kingpin
    C.box((1.6, 1.4, 0.012), loc=(0.2, 0, KP_Z + 0.006), bm=b, mat=2)
    C.cyl(0.0445, 0.08, 20 if HI() else 10, loc=(0, 0, KP_Z - 0.04), bm=b, mat=2)
    C.cyl(0.036, 0.02, 20 if HI() else 10, loc=(0, 0, KP_Z - 0.09), bm=b, mat=2)
    # rear underrun bar + lamp bracket
    C.box((0.12, 2.2, 0.12), loc=(X_R + 0.10, 0, 0.50), bevel=0.01 if HI() else 0, segs=1, bm=b, mat=3)
    for sg in (1, -1):
        C.box((0.10, 0.08, 0.72), loc=(X_R + 0.30, sg * 0.70, 0.86), bm=b)
        C.box((0.06, 0.62, 0.16), loc=(X_R + 0.06, sg * 0.84, 0.94), bm=b)  # lamp carrier
    # side underrun guards (alu bars) between landing gear and axles
    for sg in (1, -1):
        for z in (0.55, 0.86):
            C.box((AXLES[0] + 0.75 - (LEG_X - 0.6), 0.03, 0.10), loc=((AXLES[0] + 0.75 + LEG_X - 0.6) / 2, sg * (HW - 0.06), z),
                  bm=b, mat=3)
        for x in (LEG_X - 0.7, (LEG_X + AXLES[0]) / 2, AXLES[0] + 0.8):
            C.box((0.05, 0.40, 0.05), loc=(x, sg * (HW - 0.25), 0.9), bm=b)
            C.box((0.05, 0.05, 0.52), loc=(x, sg * (HW - 0.06), 0.96), bm=b)
    # mudflaps behind the last axle
    for sg in (1, -1):
        C.box((0.01, 0.46, 0.55), loc=(AXLES[2] - 0.62, sg * WHEEL_Y, 0.47), bm=b, mat=4)
        C.box((1.25 * 2 + 1.31 * 2 - 1.1, 0.46, 0.012), loc=((AXLES[0] + AXLES[2]) / 2, sg * WHEEL_Y, 1.14), bm=b, mat=4)
    o = mk("chassis", b, ["frame_black", "paint", "steel_dark", "alu", "rubber"])
    # lamps
    lt = bmesh.new()
    la = bmesh.new()
    for sg in (1, -1):
        C.box((0.02, 0.26, 0.10), loc=(X_R + 0.025, sg * 0.90, 0.94), bm=lt)
        C.box((0.02, 0.10, 0.10), loc=(X_R + 0.025, sg * 0.66, 0.94), bm=la)
        for x in np.arange(X_F - 0.5, X_R + 0.5, -2.7):  # side markers on the side rail
            C.box((0.07, 0.012, 0.035), loc=(x, sg * (HW + 0.002), FLOOR - 0.13), bm=la)
    tail = mk("_tail", lt, ["light_tail"])
    amb = mk("_amber", la, ["light_amber"])
    # contour stripe: yellow along the side rails, red across the rear doors' base
    sb = bmesh.new()
    for sg in (1, -1):
        strip_uv(sb, [(X_F - 0.05, FLOOR - 0.04), (X_R + 0.05, FLOOR - 0.04)], sg * (HW + 0.0015), 0.05, sg, 0)
    stripe = C.obj("_stripe", sb, ["reflective"], sharp=30, recalc=False)
    return C.join([o, tail, amb, stripe], "chassis")


# ── body ─────────────────────────────────────────────────────────────────────
def make_body():
    b = bmesh.new()
    # floor (hardwood/plywood edge visible only at the sides) + headboard with vertical ribs
    C.box((X_F - X_R, 2 * HW - 0.02, 0.03), loc=((X_F + X_R) / 2, 0, FLOOR - 0.015), bm=b, mat=2)
    C.box((0.05, 2 * HW, ROOF - FLOOR), loc=(X_F - 0.025, 0, (ROOF + FLOOR) / 2), bm=b, mat=0)
    for y in np.linspace(-HW + 0.2, HW - 0.2, 9 if HI() else 5):
        C.box((0.03, 0.06, ROOF - FLOOR - 0.2), loc=(X_F + 0.01, y, (ROOF + FLOOR) / 2), bm=b, mat=0)
    # roof + roof side rails (alu) + corner posts + two middle posts per side
    C.box((X_F - X_R, 2 * HW - 0.04, 0.02), loc=((X_F + X_R) / 2, 0, ROOF - 0.01), bm=b, mat=3)
    for sg in (1, -1):
        C.box((X_F - X_R, 0.06, 0.14), loc=((X_F + X_R) / 2, sg * (HW - 0.03), ROOF - 0.07), bm=b, mat=1)
        for x in (X_F - 0.06, -3.2, -7.6, X_R + 0.06):
            C.box((0.10, 0.06, ROOF - FLOOR - 0.14), loc=(x, sg * (HW - 0.04), (ROOF + FLOOR) / 2 - 0.07), bm=b, mat=1)
    # side boards (3 alu slats per side, slotted into the posts) + roof bows under the roof sheet
    for sg in (1, -1):
        for z in ((FLOOR + 0.55, FLOOR + 1.15, FLOOR + 1.75) if HI() else (FLOOR + 0.9,)):
            C.box((X_F - X_R - 0.3, 0.025, 0.14), loc=((X_F + X_R) / 2, sg * (HW - 0.075), z), bm=b, mat=1)
    for x in np.arange(X_F - 0.6, X_R + 0.3, -0.6 if HI() else -1.8):
        C.box((0.04, 2 * HW - 0.10, 0.05), loc=(x, 0, ROOF - 0.05), bm=b, mat=1)
    # rear portal frame
    C.box((0.12, 2 * HW, 0.16), loc=(X_R + 0.06, 0, ROOF - 0.08), bm=b, mat=0)
    C.box((0.12, 2 * HW, 0.06), loc=(X_R + 0.06, 0, FLOOR + 0.03), bm=b, mat=0)
    for sg in (1, -1):
        C.box((0.14, 0.10, ROOF - FLOOR), loc=(X_R + 0.07, sg * (HW - 0.05), (ROOF + FLOOR) / 2), bm=b, mat=0)
    return mk("body", b, ["paint", "alu", "frame_black", "roof"])


def make_curtain(sg):
    """pleated fabric sheet between the headboard and the rear posts, straps + buckles to the side rail.
    Built in place, pivot at the front post (x = X_F - 0.12): scale.x bunches it forward."""
    nx = 340 if HI() else 110
    nz = 6 if HI() else 3
    x0, x1 = X_F - 0.11, X_R + 0.14
    z0, z1 = FLOOR + 0.02, ROOF - 0.12
    y0 = sg * (HW + 0.004)
    lam = 0.24
    amp = 0.010
    b = bmesh.new()
    uvl = b.loops.layers.uv.verify()
    grid = []
    for i in range(nx + 1):
        x = x0 + (x1 - x0) * i / nx
        col = []
        for k in range(nz + 1):
            z = z0 + (z1 - z0) * k / nz
            bulge = 0.02 * math.sin(math.pi * k / nz)  # the sheet sags out slightly between the rails
            y = y0 + sg * (amp * math.sin(2 * math.pi * (x - x0) / lam) + bulge)
            col.append(b.verts.new((x, y, z)))
        grid.append(col)
    for i in range(nx):
        for k in range(nz):
            q = (grid[i][k], grid[i + 1][k], grid[i + 1][k + 1], grid[i][k + 1])
            f = b.faces.new(q if sg > 0 else q[::-1])
            for lp in f.loops:
                ii = 0 if lp.vert in (grid[i][k], grid[i][k + 1]) else 1
                kk = 0 if lp.vert in (grid[i][k], grid[i + 1][k]) else 1
                lp[uvl].uv = ((i + ii) / nx, (k + kk) / nz)
    # straps every ~0.62 m with buckles on the side rail
    ns = int((x0 - x1) / 0.62)
    for s in range(ns):
        x = x0 - 0.3 - s * (x0 - x1 - 0.6) / (ns - 1)
        yb = y0 + sg * 0.024
        C.box((0.045, 0.006, 0.42), loc=(x, yb, FLOOR + 0.13), bm=b, mat=1)
        C.box((0.06, 0.012, 0.05), loc=(x, yb + sg * 0.004, FLOOR - 0.04), bm=b, mat=2)
    o = C.obj(f"curtain_{'L' if sg > 0 else 'R'}", b, ["curtain", "strap", "buckle"], sharp=60, recalc=False)
    set_pivot(o, (x0, y0, (z0 + z1) / 2))
    return o


def make_door(sg):
    """rear barn door: framed panel, 2 cam-lock bars, 3 hinges; pivot on the outer hinge line"""
    w = HW - 0.06
    x = X_R + 0.005
    h0, h1 = FLOOR + 0.06, ROOF - 0.16
    b = bmesh.new()
    yc = sg * (w / 2 + 0.006)
    C.box((0.04, w - 0.012, h1 - h0), loc=(x, yc, (h0 + h1) / 2), bm=b, mat=0)
    for yy in (yc - sg * 0.18 * w, yc + sg * 0.22 * w):  # locking bars
        C.cyl(0.013, h1 - h0 + 0.1, 12 if HI() else 6, loc=(x - 0.035, yy, (h0 + h1) / 2), bm=b, mat=1)
        C.box((0.05, 0.05, 0.08), loc=(x - 0.03, yy, h0 + 0.9), bm=b, mat=1)
    for z in (h0 + 0.3, (h0 + h1) / 2, h1 - 0.3):
        C.box((0.03, 0.22, 0.06), loc=(x - 0.03, sg * (w - 0.08), z), bm=b, mat=1)
    C.box((0.012, w * 0.9, 0.08), loc=(x - 0.022, yc, h0 + 0.12), bm=b, mat=2)  # red reflective strip
    o = mk(f"door_{'RL' if sg > 0 else 'RR'}_rear", b, ["paint", "alu", "red_reflective"])
    set_pivot(o, (x - 0.02, sg * (w + 0.01), (h0 + h1) / 2))
    return o


def make_landing():
    b = bmesh.new()
    for sg in (1, -1):
        y = sg * 0.92
        C.box((0.13, 0.13, 0.70), loc=(LEG_X, y, 1.02), bm=b)  # outer tube under the frame
        C.box((0.10, 0.9, 0.10), loc=(LEG_X, sg * 0.48, 1.30), bm=b)  # mounting bracket to the beam
        beam = C.box((0.06, 0.06, 0.9))
        C.xform(beam, rot=Matrix.Rotation(sg * math.radians(38), 3, "X"), loc=(LEG_X - 0.1, sg * 0.62, 0.98))
        C.merge(b, beam)
    C.cyl(0.02, 1.84, 10, loc=(LEG_X + 0.04, 0, 0.98), axis="Y", bm=b, mat=1)  # cross shaft
    C.box((0.08, 0.10, 0.14), loc=(LEG_X + 0.04, -0.92 - 0.12, 0.98), bm=b, mat=1)  # gearbox
    crank = C.box((0.02, 0.02, 0.36))
    C.xform(crank, loc=(LEG_X + 0.04, -1.18, 0.86))
    C.merge(b, crank)
    gear = mk("landing_gear", b, ["frame_black", "steel_dark"])
    lb = bmesh.new()
    for sg in (1, -1):
        y = sg * 0.92
        C.box((0.10, 0.10, 0.62), loc=(LEG_X, y, 0.36), bm=lb)
        C.box((0.28, 0.24, 0.04), loc=(LEG_X, y, 0.02), bm=lb, mat=1)  # sand shoe
    legs = mk("landing_legs", lb, ["frame_black", "steel_dark"])
    return gear, legs


def make_axles():
    b = bmesh.new()
    for x in AXLES:
        C.cyl(0.07, 2 * WHEEL_Y - 0.3, 16 if HI() else 8, loc=(x, 0, BT.WR), axis="Y", bm=b)
        for sg in (1, -1):
            C.box((0.10, 0.10, FLOOR - 0.40 - BT.WR - 0.1), loc=(x + 0.35, sg * 0.46, (FLOOR - 0.40 + BT.WR) / 2), bm=b)  # hanger
            C.box((0.75, 0.09, 0.07), loc=(x - 0.05, sg * 0.46, BT.WR - 0.02), bm=b)  # trailing arm
            bag = C.lathe([(0.10, 0.0), (0.135, 0.04), (0.14, 0.10), (0.135, 0.16), (0.10, 0.20)], 16 if HI() else 8, axis="Z")
            C.xform(bag, loc=(x - 0.36, sg * 0.46, BT.WR + 0.05))
            for f in bag.faces:
                f.material_index = 1
            C.merge(b, bag)
            C.cyl(0.035, 0.34, 10, loc=(x + 0.18, sg * 0.30, BT.WR + 0.28), bm=b, mat=2)  # shock absorber
    return mk("axles", b, ["frame_black", "rubber", "steel_dark"])


def make_toolbox():
    b = bmesh.new()
    C.box((0.9, 0.45, 0.45), loc=(-5.2, -(HW - 0.30), 1.02), bevel=0.01 if HI() else 0, segs=1, bm=b)
    C.box((0.35, 0.02, 0.03), loc=(-5.2, -(HW - 0.07), 1.12), bm=b, mat=1)
    return mk("toolbox", b, ["plastic_black", "alu"])


def build(q):
    global Q
    Q = q
    mats(q)
    root = C.empty("trailer")
    ch = make_chassis()
    body = make_body()
    curt = [make_curtain(1), make_curtain(-1)]
    doors = [make_door(1), make_door(-1)]
    gear, legs = make_landing()
    ax = make_axles()
    tb = make_toolbox()
    tyre, rim_f, rim_d, hub_f, hub_d = BT.wheel_sets(q)
    parts = [ch, body, gear, legs, ax, tb] + curt + doors
    for o in parts:
        o.parent = root
    legs.parent = gear
    # wheels (same frame conventions as the truck: left hubs turned 180 deg, wheels spin about local Z)
    wheel_objs = []

    def inst(src, name, par, loc=(0, 0, 0), sc=1.0):
        o = src.copy()
        o.name = name
        bpy.context.scene.collection.objects.link(o)
        o.parent = par
        o.location = loc
        o.scale = (1, sc, 1)
        wheel_objs.append(o)
        return o

    for ia, x in enumerate(AXLES):
        for side, y in (("L", WHEEL_Y), ("R", -WHEEL_Y)):
            tag = f"{ia + 1}{side}"
            hub = C.empty("hub_" + tag, root, loc=(x, y, BT.WR))
            hub.rotation_euler = (0, 0, math.pi if y > 0 else 0.0)
            spin = C.empty("wheel_" + tag, hub)
            inst(tyre, "tyre_" + tag, spin, sc=1.22)
            inst(rim_f, "rim_" + tag, spin, sc=1.15)
            inst(hub_f, "hubcap_" + tag, spin)
    sp = C.empty("spare_wheel", root, loc=(-4.2, 0.0, 0.78))
    sp.rotation_euler = (math.pi / 2, 0, 0)  # carried flat under the frame
    inst(tyre, "tyre_spare", sp, sc=1.22)
    inst(rim_f, "rim_spare", sp, sc=1.15)
    for src in (tyre, rim_f, rim_d, hub_f, hub_d):
        bpy.data.objects.remove(src)
    bpy.context.view_layer.update()
    big = [o for o in parts if o.type == "MESH"]
    C.bake_ao_vcol(big, samples=32 if HI() else 12, max_dist=0.5, floor=0.3)
    firsts = {}
    for o in wheel_objs:
        firsts.setdefault(o.data.name, o)
    C.bake_ao_vcol(list(firsts.values()), samples=24 if HI() else 10, max_dist=0.08, floor=0.3)
    for o in big + list(firsts.values()):
        C.vcol_to_points(o)
    ex = {"body": (0, 0.9, 0), "curtain_L": (0, 0.2, -1.1), "curtain_R": (0, 0.2, 1.1), "door_RL_rear": (-1.2, 0, -0.3),
          "door_RR_rear": (-1.2, 0, 0.3), "landing_gear": (0.4, -0.3, 0), "axles": (0, -0.5, 0), "toolbox": (0, 0, 0.8),
          "spare_wheel": (0, -0.6, 0)}
    for ia in range(3):
        for side, sgn in (("L", -1), ("R", 1)):
            ex[f"hub_{ia + 1}{side}"] = (0, -0.3, sgn * 0.9)
    for o in root.children_recursive:
        if o.name in ex:
            C.set_explode(o, ex[o.name])
    root["kingpin"] = [0.0, KP_Z, 0.0]
    root["couple_offset_in_truck_frame"] = [-1.50, 0.0, 0.0]
    return root


if __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    C.reset()
    root = build(q)
    if a.get("look"):
        H = os.path.join(C.HERE, "..", "public/lib3d/env/")
        C.look(a["look"], target=(-5.6, 0, 1.8), cam=(6.0, -13.0, 3.5), fov=40, hdr=H + a.get("env", "dusk") + "-1k-v1.hdr",
               ground=True, spp=int(a.get("spp", "16")), res=(1200, 700))
    C.finish("trailer", q, root, a.get("out"), pivots=True)
