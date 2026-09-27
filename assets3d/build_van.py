"""Generic mid-size panel van / LCV, unbranded (4.98 x 1.93 x 1.97 m, wheelbase 3.00 m, 215/65 R16).

  Blender -b --factory-startup --python assets3d/build_van.py -- --q hi --out /tmp/van-hi.glb [--look 1]

Same builder and node conventions as `car` (carkit.py = the parameterised build_car.py): faces +X, +Y up, left side
at -Z, origin on the ground midway between the axles. Short sloping hood, raked windscreen, a tall box body with
windowless cargo sides, cab doors with a fixed quarter light ahead of them, a sliding side door on the right, rear
barn doors with small windows, black bumpers + lower cladding, roof beads, bulkhead behind the seats.
Nodes: van > body, glass_front, glass_QL / glass_QR, interior, lights_front, lights_rear, hood > hood_panel,
       door_FL|FR > door_*_panel, glass_*, handle_*, mirror_L / mirror_R,
       slide_door_R > slide_door_R_panel, handle_slide_R   (pivot: front edge)
       door_RL_rear / door_RR_rear > door_*_rear_panel, glass_*_rear (+ handle_RR_rear)   (pivot: outer edge)
       steer_FL|FR > wheel_FL|FR, caliper_*, hub_RL|RR > wheel_RL|RR
Contracts (three.js): hood.rotation.z > 0 opens; door_FL.rotation.y < 0 / door_FR > 0 open; the sliding door pops
out then runs back: slide_door_R.position.z = z0 + 0.05 * a (a 0..1), slide_door_R.position.x = x0 - 1.02 * b (b 0..1);
barn doors: door_RL_rear.rotation.y < 0 (to about -1.6, 90 deg; -2.8 folded against the side), door_RR_rear > 0.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bmesh
import bpy
from mathutils import Matrix, Vector

import common as C
import carkit as K

sm = K.smooth_interp
K.XF_AX, K.XR_AX = 1.50, -1.50
K.TRACK = 1.65
K.WHEEL_SPEC = dict(Rb=0.2032, R=0.3445, SW=0.215, TW=0.182, D=0.008, RW=0.165, PCD=0.118, NS=5, ET=0.052,
                    disc_r=0.150, disc_t=0.026, NP=62)
K.WR = 0.3445
K.WMAX = 0.965
XT_F, XT_R = 2.45, -2.535  # nose / tail
K.Z_BOT = sm([-2.53, -2.3, -1.9, -1.0, 1.0, 1.9, 2.25, 2.45], [0.43, 0.37, 0.31, 0.30, 0.30, 0.32, 0.37, 0.43])
BELT = 1.10
K.Z_BELT = sm([-2.53, -2.44, -1.5, 0.0, 1.2, 1.70, 1.95, 2.2, 2.38, 2.45], [1.075, 1.10, 1.10, 1.10, 1.10, 1.10, 1.055, 0.995, 0.945, 0.915])
K.Z_ROOF = sm([-2.5, -1.0, 0.0, 0.8, 1.0], [1.945, 1.95, 1.95, 1.948, 1.94])
K.XF_S = sm([0, 0.25, 0.5, 0.75, 1.0], [2.37, 2.44, 2.45, 2.435, 2.34])
K.XR_S = sm([0, 0.2, 0.45, 0.7, 1.0], [-2.48, -2.525, -2.535, -2.535, -2.53])
K.XF_G = sm(K.G_LEV, [1.72, 1.57, 1.42, 1.27, 1.155, 1.07, 1.015, 0.975, 0.955])
K.XR_G = sm(K.G_LEV, [-2.505, -2.504, -2.502, -2.498, -2.494, -2.488, -2.48, -2.47, -2.455])
K.W_G = sm(K.G_LEV, [0.935, 0.934, 0.932, 0.929, 0.925, 0.917, 0.905, 0.885, 0.855])
K.GREEN_END = (0.34, 0.10, 2.4, 4.0)
K.GREEN_TAPER = lambda x: 0.0
K.LOWER_END = (0.42, 0.13, 3.0, 4.5)
K.LOWER_XMID = (1.70, -2.26)
K.TAPER_F = (2.0, 0.07, 0.45)
K.TAPER_R = (-2.3, 0.012, 0.24)
K.ARCH_R, K.ARCH_Y = 0.40, 0.63
K.HOOD_X = 1.76
K.REAR_X = -9.0
K.REAR_PANEL = "body"
K.REAR_GLASS_PANEL = None
K.HOOD_CROWN, K.ROOF_CROWN = 0.02, 0.02
K.MIRROR_LOC = (1.08, 1.0, 1.23)
K.PANELS = ["body", "hood", "door_FL", "door_FR", "slide_door_R", "door_RL_rear", "door_RR_rear"]
K.P_IDX = {n: i for i, n in enumerate(K.PANELS)}
DOOR_F = (1.12, 0.25)
SLIDE = (0.17, -0.95)
K.DOOR_F = DOOR_F
K.BREAKS = [1.12, 1.10, 0.25, 0.23, 0.17, 0.15, -0.95, -0.97, K.XF_AX, K.XR_AX]
K.G_PINS = [1.12, 1.10, 0.25, 0.23, 0.17, 0.15, -0.95, -0.97]
K.GREEN_COUNTS_HI = [4, 1, 14, 1, 1, 1, 18, 1, 22]
K.GREEN_COUNTS_LO = [2, 1, 6, 1, 1, 1, 8, 1, 10]
K.GREEN_LEVS_HI = [0, 0.02, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.78, 0.84, 0.88, 0.91, 0.935, 0.955, 0.97, 0.982, 0.992, 1.0]
K.GREEN_LEVS_LO = [0, 0.04, 0.2, 0.4, 0.6, 0.78, 0.86, 0.92, 0.96, 0.985, 1.0]
K.LOWER_NFR_HI, K.LOWER_NFR_LO = (24, 16), (12, 8)
K.GREEN_NFR_HI, K.GREEN_NFR_LO = (16, 16), (8, 8)
K.GREEN_SPAN = lambda n, nf, nr: 2 * nf
K.HANDLES = {"door_FL": 0.42, "door_FR": 0.42, "slide_door_R": 0.06}


def top_inset(dz, r=0.014):
    if dz >= r:
        return 0.0
    return r - math.sqrt(max(0.0, r * r - (r - dz) ** 2))


def w_side(x, z, zb, zt):
    """slab van side: slight barrel, sill tumble-under, a crease 0.34 m under the belt, small arch flares"""
    w = K.WMAX * (1 - 0.010 * ((z - 0.78) / 0.4) ** 2)
    rb = 0.10
    dzb = z - zb
    if dzb < rb:
        w -= rb - math.sqrt(max(0.0, rb * rb - (rb - dzb) ** 2))
    dz = zt - z
    w += 0.006 * math.exp(-((dz - 0.34) / 0.012) ** 2)
    if x > K.TAPER_F[0]:
        w -= K.TAPER_F[1] * ((x - K.TAPER_F[0]) / K.TAPER_F[2]) ** 2
    if x < K.TAPER_R[0]:
        w -= K.TAPER_R[1] * ((K.TAPER_R[0] - x) / K.TAPER_R[2]) ** 2
    for ax in (K.XF_AX, K.XR_AX):
        d = math.hypot(x - ax, (z - K.WR) * 0.9)
        w += 0.012 * math.exp(-((d - 0.43) / 0.06) ** 2) if z > 0.25 else 0.0
    return w


K.top_inset = top_inset
K.w_side = w_side


def door_of(x, y):
    if DOOR_F[1] < x < DOOR_F[0]:
        return "door_F" + ("L" if y > 0 else "R")
    if y < 0 and SLIDE[1] < x < SLIDE[0]:
        return "slide_door_R"
    return None


K.door_of = door_of


def classify_lower(x, y, z, s, zone, frac):
    ay = abs(y)
    mat, panel = "paint", "body"
    if s < 0.16:
        mat = "plastic_black"  # lower cladding all round
    if zone == "F":
        if s < 0.32:
            mat = "plastic_black"  # bumper
        if 0.10 < s < 0.20 and 0.55 < ay < 0.72:
            mat = "trim_black"  # fog-lamp pockets
        if 0.34 < s < 0.66 and ay < 0.52:
            mat = "grille"
        tl = min(1.0, max(0.0, (ay - 0.42) / 0.45))
        if 0.56 - 0.10 * tl < s < 0.93 - 0.03 * tl and 0.42 < ay and x > 2.10:
            mat = "LAMP_F"
        if s >= 0.955 and ay < 0.86:
            panel = "hood"
    elif zone == "R":
        if s < 0.30:
            mat = "plastic_black"
        if 0.12 < s < 0.25 and ay < 0.28 and x < -2.46:
            mat = "trim_black"  # plate recess in the bumper
        if x < -2.47 and ay < 0.86 and s >= 0.30:
            panel = "door_RL_rear" if y > 0 else "door_RR_rear"
        if x < -2.36 and ay > 0.84 and 0.36 < s < 0.985:
            mat = "LAMP_R"  # tall lamps in the rear corner pillars
    else:
        d = door_of(x, y)
        if d and 0.10 <= s < 0.9995:
            panel = d
    return mat, panel


def classify_green(x, y, g, zone, frac, nz):
    ay = abs(y)
    mat, panel = "paint", "body"
    if zone == "F":
        if frac < 0.62 and 0.035 < g < 0.955:
            mat = "GLASS_F"
        elif frac < 0.62 and g <= 0.035:
            mat = "trim_black"
        elif frac < 0.82:
            mat = "trim_black" if g < 0.955 else "paint"  # black A-pillar trim
        elif 0.04 < g < 0.80:
            mat = "GLASS_S"
        elif g <= 0.04:
            mat = "trim_black"
    elif zone == "R":
        rear_face = x < float(K.XR_G(g)) + 0.045
        if rear_face and ay < 0.86 and g < 0.965:
            panel = "door_RL_rear" if y > 0 else "door_RR_rear"
            if 0.42 < g < 0.86 and 0.10 < ay < 0.74:
                mat = "GLASS_R"
    else:
        cab = x > 0.25
        if g <= 0.04 and cab:
            mat = "trim_black"
        elif cab and g < 0.80 and x > 0.27:
            mat = "GLASS_S"
        elif cab and g < 0.93 and 0.23 < x <= 0.27:
            mat = "trim_black"
        d = door_of(x, y)
        if d and g < 0.935:
            panel = d
    return mat, panel


K.classify_lower = classify_lower
K.classify_green = classify_green


def recess(lower, mi):
    gi, ti = mi["grille"], mi["trim_black"]
    C.recess(lower, lambda f: f.material_index == gi, 0.025, wall_mat=mi["plastic_black"])
    C.recess(lower, lambda f: f.material_index == ti and f.calc_center_median().x < -2.4 and f.calc_center_median().z < 0.7,
             0.012, wall_mat=mi["plastic_black"])
    C.recess(lower, lambda f: f.material_index == ti and f.calc_center_median().x > 2.2 and f.calc_center_median().z < 0.6,
             0.03, wall_mat=mi["plastic_black"])


def edge_y(x, s):
    zb, zt = float(K.Z_BOT(x)), float(K.Z_BELT(x))
    return w_side(x, zb + s * (zt - zb), zb, zt)


def pivots():
    piv = {"hood": (K.HOOD_X, 0, float(K.Z_BELT(K.HOOD_X)))}
    for side, sg in (("L", 1), ("R", -1)):
        piv["door_F" + side] = (DOOR_F[0], sg * (edge_y(DOOR_F[0], 0.8) - 0.03), 0.9)
        piv[f"door_R{side}_rear"] = (XT_R + 0.04, sg * 0.88, 1.15)
    piv["slide_door_R"] = (SLIDE[0], -(edge_y(0.0, 0.6) - 0.02), 1.0)
    return piv


def plate_at(front, hi, x, z):
    o = K.plate(front, hi)
    me = o.data
    c = sum((v.co for v in me.vertices), Vector()) / len(me.vertices)
    me.transform(Matrix.Translation(Vector((x, 0, z)) - c))
    return o


def wipers_van(hi):
    bm = bmesh.new()
    for y0, L in ((-0.58, 0.70), (0.02, 0.66)):
        path = [Vector((1.745, y0, 1.115)), Vector((1.70, y0 + 0.2, 1.16)), Vector((1.64, y0 + L * 0.95, 1.21))]
        C.tube(C.bezier_path(path, 4), 0.007, 6, bm=bm)
    return C.obj("wipers", bm, ["trim_black"], sharp=40)


def roof_beads(hi):
    """pressed stiffening beads across the roof panel (raised 6 mm)"""
    bm = bmesh.new()
    wr = float(K.W_G(1.0))
    for x in [0.55 - 0.34 * k for k in range(9)]:
        b = C.box((0.045, 1.44, 0.018), loc=(x, 0, 0.0), bevel=0.006 if hi else 0.0, segs=2 if hi else 1)
        for v in b.verts:  # sit on the crowned roof cap (same crown law as carkit's roof), 6 mm proud
            v.co.z += float(K.Z_ROOF(v.co.x)) + K.ROOF_CROWN * max(0.0, 1 - (v.co.y / wr) ** 2) ** 1.5 + 0.003
        C.merge(bm, b)
    return C.obj("roof_beads", bm, ["paint"], sharp=40)


def rubbing_strip(hi):
    """black side protection strips (cladding band at the crease)"""
    bm = bmesh.new()
    for sg in (1, -1):
        for x0, x1 in ((1.08, 0.28), (0.13, -1.06), (-1.93, -2.40)):
            xm = (x0 + x1) / 2
            b = C.box((x0 - x1, 0.012, 0.07), loc=(xm, sg * (edge_y(xm, 0.30) + 0.004), 0.0), bevel=0.005 if hi else 0, segs=1)
            zb, zt = float(K.Z_BOT(xm)), float(K.Z_BELT(xm))
            C.xform(b, loc=(0, 0, zb + 0.30 * (zt - zb)))
            C.merge(bm, b)
    return C.obj("rub_strips", bm, ["plastic_black"], sharp=40)


def extras(hi):
    zb = float(K.Z_BOT(2.4))
    xf = K._front_x_at(0.0, 0.2) + 0.012
    xr = float(K.XR_S(0.18)) - 0.012
    zbr = float(K.Z_BOT(-2.5)) + 0.18 * (float(K.Z_BELT(-2.5)) - float(K.Z_BOT(-2.5)))
    return [wipers_van(hi), roof_beads(hi), rubbing_strip(hi), plate_at(True, hi, xf, zb + 0.2 * (float(K.Z_BELT(2.4)) - zb)),
            plate_at(False, hi, xr, zbr)]


def van_seat(x, y, hi, w=0.50):
    parts = []
    z0 = 0.78
    parts.append(C.obj("s", C.box((0.50, w, 0.12), loc=(x, y, z0), bevel=0.04, segs=2 if hi else 1), ["seat"], sharp=50))
    bb = C.box((0.12, w, 0.62), loc=(x - 0.27, y, z0 + 0.36), bevel=0.045, segs=2 if hi else 1)
    for v in bb.verts:
        v.co.x -= (v.co.z - z0) * 0.22
    parts.append(C.obj("s", bb, ["seat"], sharp=50))
    parts.append(C.obj("s", C.box((0.09, 0.25, 0.17), loc=(x - 0.38, y, z0 + 0.78), bevel=0.04, segs=2 if hi else 1), ["seat"], sharp=50))
    parts.append(C.obj("s", C.box((0.40, 0.36, 0.36), loc=(x, y, z0 - 0.24)), ["interior"], sharp=50))  # seat box
    return C.join(parts, "seat")


def interior_van(hi, lower_src, green_src):
    objs = []
    for src, keep in ((green_src, lambda c: True), (lower_src, lambda c: c.z > 0.42 and c.x < 1.95)):
        o = src.copy()
        o.data = src.data.copy()
        bpy.context.scene.collection.objects.link(o)
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if not keep(f.calc_center_median())], context="FACES")
        bm.normal_update()
        for v in bm.verts:
            v.co -= v.normal * 0.035
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
        for f in bm.faces:
            f.material_index = 0
        bm.to_mesh(o.data)
        bm.free()
        o.data.materials.clear()
        o.data.materials.append(C.MATS["interior"])
        C.decimate(o, 0.35 if hi else 0.15)
        objs.append(o)
    objs.append(van_seat(0.72, 0.43, hi))
    objs.append(van_seat(0.72, -0.30, hi, w=0.80))  # passenger bench (2 seats)
    db = C.box((0.40, 1.70, 0.28), loc=(1.28, 0, 1.00), bevel=0.06, segs=2 if hi else 1)
    for v in db.verts:
        v.co.z += (v.co.x - 1.2) * 0.25 if v.co.z > 1.05 else 0
    objs.append(C.obj("dash", db, ["dash"], sharp=50))
    sb = bmesh.new()
    C.torus(0.19, 0.017, 32 if hi else 16, 8 if hi else 6, bm=sb)
    C.cyl(0.05, 0.05, 16, loc=(0, 0, 0), bm=sb)
    C.xform(sb, rot=Matrix.Rotation(math.radians(-55), 3, "Y"), loc=(1.12, 0.43, 1.30))
    objs.append(C.obj("steer", sb, ["dash"], sharp=40))
    # bulkhead behind the seats (full height, window in the upper part) + cargo floor
    bh = C.box((0.03, 1.80, 1.30), loc=(0.20, 0, 1.08))
    objs.append(C.obj("bulkhead", bh, ["interior"], sharp=40))
    objs.append(C.obj("floor", C.box((2.70, 1.70, 0.02), loc=(-1.10, 0, 0.56)), ["interior"], sharp=40))
    return C.join(objs, "interior")


def post(car, panels, glass, hi):
    for o in car.children_recursive:
        if o.name in ("mirror_L", "mirror_R"):
            o.scale = (1.35, 1.35, 1.35)
            for i, m in enumerate(o.data.materials):  # black commercial-vehicle mirror caps
                if m and m.name == "paint":
                    o.data.materials[i] = C.MATS["plastic_black"]
        if o.name.startswith("handle_") and o.type == "MESH":
            o.data.materials[0] = C.MATS["trim_black"]
    e = [c for c in car.children if c.name == "door_RR_rear"]
    if e:  # rear door handle on the right-hand barn door, near the centre gap
        h = C.obj("handle_RR_rear", C.box((0.02, 0.16, 0.035), bevel=0.008, segs=2 if hi else 1), ["trim_black"], sharp=40)
        C.vcol_fill(h)
        h.parent = e[0]
        p = e[0].location
        h.location = (XT_R - 0.008 - p.x, -0.13 - p.y, 1.02 - p.z)


K.RECESS = recess
K.PIVOTS = pivots
K.EXTRAS = extras
K.INTERIOR = interior_van
K.POST = post

EXPLODE = {"hood": (0.35, 0.5, 0), "door_FL": (0.05, 0, -0.75), "door_FR": (0.05, 0, 0.75), "slide_door_R": (-0.2, 0, 0.8),
           "door_RL_rear": (-0.7, 0, -0.25), "door_RR_rear": (-0.7, 0, 0.25), "steer_FL": (0.1, 0, -0.6),
           "steer_FR": (0.1, 0, 0.6), "hub_RL": (-0.1, 0, -0.6), "hub_RR": (-0.1, 0, 0.6), "glass_front": (0.35, 0.4, 0),
           "interior": (0, 1.1, 0)}


def set_explode(car):
    for o in car.children_recursive:
        if o.name in EXPLODE:
            C.set_explode(o, EXPLODE[o.name])


if __name__ == "__main__":
    K.main("van", set_explode)
