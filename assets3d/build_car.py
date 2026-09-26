"""Generic modern 5-door hatchback, unbranded (4.28 x 1.79 x 1.45 m, wheelbase 2.64 m).

  Blender -b --factory-startup --python assets3d/build_car.py -- --q hi --out /tmp/car-hi.glb

The body is two lofted shells built from level contours (see README): the lower body (sills -> shoulder,
its top cap is the hood / rear deck) and the greenhouse (belt -> roof, its top cap is the roof). Each level
is a closed plan contour: sides at the section half-width, both ends closed by superellipse roundings, so
the nose / tail wrap without poles. Glass, trim, lamps, grille and the door / hood / tailgate panels are
classified from the (x, level, segment) of every face, so panel edges follow clean mesh lines.

three.js space: the car faces +X, +Y up, left side at -Z. Origin: ground, midway between the axles.
Nodes (runtime contract, see README):
  car > body, glass_front, glass_rear, interior, lights_front, lights_rear, hood, tailgate,
        door_FL / door_FR / door_RL / door_RR (> glass_*), mirror_L / mirror_R,
        wheel_FL / wheel_FR / wheel_RL / wheel_RR (spin: rotation.z; the front ones steer inside steer_FL/FR),
        caliper_FL ... (static, parented to steer_* / car)
Materials looked up at runtime: paint (colour), glass, light_head (emissive DRL), light_tail (emissive).
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

# ── dimensions (m) ───────────────────────────────────────────────────────────
XF_AX, XR_AX = 1.30, -1.34  # axles
TRACK = 1.545
WR = 0.3172  # wheel radius (225/45 R17)
WMAX = 0.895  # body half width


def smooth_interp(xs, ys):
    """monotone cubic (Fritsch-Carlson) through control points -> f(x)"""
    xs = np.asarray(xs, float)
    ys = np.asarray(ys, float)
    if xs[0] > xs[-1]:
        xs, ys = xs[::-1], ys[::-1]
    h = np.diff(xs)
    d = np.diff(ys) / h
    m = np.zeros_like(ys)
    m[1:-1] = np.where(d[:-1] * d[1:] > 0, 2 / (1 / np.where(d[:-1] == 0, 1e-9, d[:-1]) + 1 / np.where(d[1:] == 0, 1e-9, d[1:])), 0)
    m[0], m[-1] = d[0], d[-1]

    def f(x):
        x = np.clip(x, xs[0], xs[-1])
        i = np.clip(np.searchsorted(xs, x) - 1, 0, len(h) - 1)
        t = (x - xs[i]) / h[i]
        t2, t3 = t * t, t * t * t
        return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h[i] * m[i + 1]

    return f


# side-view curves along x
Z_BOT = smooth_interp([-2.14, -1.95, -1.6, -0.9, 0.9, 1.7, 2.0, 2.2], [0.33, 0.28, 0.21, 0.185, 0.185, 0.20, 0.23, 0.27])
Z_BELT = smooth_interp([-2.14, -2.02, -1.9, -1.4, -0.4, 0.5, 0.95, 1.4, 1.8, 2.05, 2.2],
                       [0.97, 1.015, 1.035, 1.04, 1.015, 0.99, 0.965, 0.915, 0.85, 0.785, 0.74])
Z_ROOF = smooth_interp([-1.5, -1.1, -0.5, 0.0, 0.3], [1.415, 1.442, 1.458, 1.452, 1.435])
# lower body plan ends per level s (0 bottom .. 1 shoulder), before the top rounding inset
XF_S = smooth_interp([0, 0.2, 0.45, 0.6, 0.8, 1.0], [2.05, 2.12, 2.16, 2.165, 2.14, 2.08])
XR_S = smooth_interp([0, 0.2, 0.45, 0.7, 0.9, 1.0], [-2.02, -2.09, -2.12, -2.125, -2.115, -2.10])
# greenhouse per level g (0 belt .. 1 roof)
G_LEV = [0, 0.2, 0.4, 0.6, 0.75, 0.86, 0.93, 0.975, 1.0]
XF_G = smooth_interp(G_LEV, [0.93, 0.745, 0.56, 0.375, 0.235, 0.14, 0.075, 0.03, 0.0])
XR_G = smooth_interp(G_LEV, [-2.0, -1.935, -1.865, -1.79, -1.72, -1.65, -1.585, -1.525, -1.47])
H_G = smooth_interp(G_LEV, [0, 0.2, 0.4, 0.6, 0.75, 0.86, 0.935, 0.98, 1.0])
W_G = smooth_interp(G_LEV, [0.79, 0.767, 0.745, 0.72, 0.70, 0.68, 0.655, 0.625, 0.59])


def w_side(x, z, zb, zt):
    """lower body section half-width at height z (bottom zb, shoulder zt): tumble-under, barrel side,
    character line, shoulder rounding"""
    w = WMAX * (1 - 0.030 * ((z - 0.58) / 0.42) ** 2)
    # tumble-under near the sill
    rb = 0.13
    dzb = z - zb
    if dzb < rb:
        w -= rb - math.sqrt(max(0.0, rb * rb - (rb - dzb) ** 2)) * 1.0
    # character line ~13 cm under the shoulder + a soft lower crease
    dz = zt - z
    w += 0.011 * math.exp(-((dz - 0.135) / 0.016) ** 2) * (1.0 if dz > 0.135 else 1.0) - 0.010 * math.exp(-((dz - 0.36) / 0.09) ** 2)
    # plan taper toward the ends
    if x > 1.5:
        w -= 0.05 * ((x - 1.5) / 0.66) ** 2
    if x < -1.6:
        w -= 0.04 * ((-1.6 - x) / 0.52) ** 2
    # wheel-arch flares
    for ax in (XF_AX, XR_AX):
        d = math.hypot(x - ax, (z - WR) * 0.9)
        w += 0.020 * math.exp(-((d - 0.39) / 0.065) ** 2) if z > 0.22 else 0.0
    return w


def top_inset(dz, r=0.055):
    """shoulder / hood-edge rounding: inset of the plan contour when dz under the top surface is < r"""
    if dz >= r:
        return 0.0
    return r - math.sqrt(max(0.0, r * r - (r - dz) ** 2))


# ── contour sampling ─────────────────────────────────────────────────────────
def half_contour(xf, xr, width, Lf, Lr, pf, pr, x_mid, n_front, n_rear):
    """half plan contour from (xf, 0) to (xr, 0) with y >= 0: superellipse ends, width(x) sides.
    Middle samples at fixed x (x_mid, shared by every level -> vertical mesh lines)."""
    def y_at(x):
        s = 1.0
        if x > xf - Lf:
            t = min(1.0, (x - (xf - Lf)) / Lf)
            s *= (1 - t ** pf) ** (1 / pf)
        if x < xr + Lr:
            t = min(1.0, ((xr + Lr) - x) / Lr)
            s *= (1 - t ** pr) ** (1 / pr)
        return width(x) * s

    def arc_samples(x0, x1, n):
        # dense polyline from the tip (x0, 0) to x1, resampled by arc length into n points (tip excluded... included)
        v = np.linspace(0, 1, 800)
        xs = x0 + (x1 - x0) * (1 - (1 - v) ** 3)
        pts = np.array([(x, y_at(x)) for x in xs])
        pts[0, 1] = 0.0
        seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
        acc = np.concatenate([[0], np.cumsum(seg)])
        tgt = np.linspace(0, acc[-1], n + 1)[:-1]
        out = []
        for t in tgt:
            i = min(np.searchsorted(acc, t, side="right") - 1, len(seg) - 1)
            f = (t - acc[i]) / max(seg[i], 1e-12)
            out.append(tuple(pts[i] + (pts[i + 1] - pts[i]) * f))
        return out

    if callable(x_mid):
        x_mid = x_mid(xf - Lf, xr + Lr)
    front = arc_samples(xf, x_mid[0], n_front)
    mid = [(x, y_at(x)) for x in x_mid]
    rear = arc_samples(xr, x_mid[-1], n_rear)[::-1]
    rear.append((xr, 0.0))
    return front + mid + rear  # index 0 = front tip, last = rear tip


def ring_from_half(half, zfun):
    """full ring (front tip, left side y>0 to the rear tip, right side back), z per point"""
    left = [(x, y, zfun(x, y)) for x, y in half]
    right = [(x, -y, zfun(x, y)) for x, y in half[-2:0:-1]]
    return left + right


# ── materials ─────────────────────────────────────────────────────────────────
def car_mats(q):
    hi = q == "hi"
    pa, po, pn = T.painted_metal(256, seed=6, rgb=(1, 1, 1), rough=0.3, orange=0.35)
    C.material("paint", C.srgb("#6c737c"), 0.3, 0.6, coat=1.0, coat_rough=0.02, vcol=True)
    C.material("trim_black", C.srgb("#0b0c0d"), 0.18, 0.0, coat=0.6, coat_rough=0.05, vcol=True)
    if not hi:
        C.material("plastic_black", C.srgb("#1a1b1c"), 0.62, 0.0, vcol=True)
        C.material("grille", C.srgb("#0c0c0d"), 0.5, 0.0, vcol=True)
    ta, to, tn = T.textured_plastic(512 if hi else 256, seed=7, lum=0.028, rough=0.62)
    if hi:
      C.material("plastic_black", (1, 1, 1), albedo=C.image("plastic_alb", ta), orm=C.image("plastic_orm", to, False),
               normal=C.image("plastic_n", tn, False), normal_strength=0.6, vcol=True, uv_scale=(1, 1))
    C.material("chrome", C.srgb("#e8e9eb"), 0.06, 1.0, vcol=True)
    C.material("interior", C.srgb("#141416"), 0.75, 0.0, vcol=True)
    C.material("arch_liner", C.srgb("#101011"), 0.88, 0.0, vcol=True)
    ha, ho, hn = T.honeycomb(512 if hi else 256, cells=22, lum=0.03, rough=0.4)
    if hi:
      C.material("grille", (1, 1, 1), albedo=C.image("grille_alb", ha), orm=C.image("grille_orm", ho, False),
               normal=C.image("grille_n", hn, False), vcol=True, uv_scale=(1, 1))
    C.material("glass", C.srgb("#05080a"), 0.02, 0.0, alpha=0.66, spec_level=0.5, double=True)
    C.material("lamp_glass", C.srgb("#dfe4ea"), 0.02, 0.0, alpha=0.18, double=True)
    C.material("lamp_housing", C.srgb("#101113"), 0.25, 0.6, vcol=True)
    C.material("reflector", C.srgb("#cfd3d8"), 0.12, 1.0, vcol=True)
    C.material("light_head", C.srgb("#ffffff"), 0.2, 0.0, emission=(C.srgb("#eef4ff"), 3.0))
    C.material("light_tail", C.srgb("#520305"), 0.2, 0.0, coat=1.0, coat_rough=0.02, emission=(C.srgb("#ff1a12"), 0.12))
    C.material("tail_lens", C.srgb("#5a0406"), 0.08, 0.0, coat=1.0, coat_rough=0.01, vcol=True)
    C.material("plate", C.srgb("#e9eaec"), 0.45, 0.0, vcol=True)
    C.material("seat", C.srgb("#1a1a1c"), 0.7, 0.0, sheen=(C.srgb("#3a3a3e"), 0.5), vcol=True)
    C.material("dash", C.srgb("#101012"), 0.55, 0.0, vcol=True)
    C.material("tyre_inner", C.srgb("#0d0d0e"), 0.9, 0.0)


M_IDX = {n: i for i, n in enumerate(["paint", "trim_black", "plastic_black", "chrome", "interior", "arch_liner",
                                      "grille", "lamp_housing", "tail_lens", "plate"])}
MAT_LIST = list(M_IDX)


# ── lower body ───────────────────────────────────────────────────────────────
S_LEV_HI = [0, 0.015, 0.04, 0.08, 0.13, 0.2, 0.28, 0.37, 0.46, 0.55, 0.63, 0.7, 0.75, 0.785, 0.81, 0.83, 0.85,
            0.875, 0.9, 0.925, 0.945, 0.962, 0.976, 0.987, 0.995, 1.0]
S_LEV_LO = [0, 0.04, 0.12, 0.25, 0.4, 0.55, 0.68, 0.76, 0.81, 0.85, 0.9, 0.94, 0.97, 0.99, 1.0]


def x_mid_list(x0, x1, step, breaks):
    xs = set(np.round(np.arange(x0, x1 - 1e-6, -step), 4).tolist() + [round(b, 4) for b in breaks] + [x1])
    return sorted(xs, reverse=True)


BREAKS = [0.93, 0.91, -0.10, -0.12, -0.14, -0.16, -0.95, -0.97, XF_AX, XR_AX]


def lower_body(q):
    hi = q == "hi"
    levs = S_LEV_HI if hi else S_LEV_LO
    x_mid = x_mid_list(1.62, -1.62, 0.045 if hi else 0.11, [b for b in BREAKS if -1.62 < b < 1.62])
    nf, nr = (26, 22) if hi else (12, 10)
    rings = []
    meta = []  # per ring: s
    for s in levs:
        def zf(x, y, s=s):
            zb, zt = float(Z_BOT(x)), float(Z_BELT(x))
            return zb + s * (zt - zb)

        # plan extents at this level with the top rounding inset
        def ins(x, s=s):
            zb, zt = float(Z_BOT(x)), float(Z_BELT(x))
            return top_inset((1 - s) * (zt - zb))

        xf = float(XF_S(s)) - 1.3 * ins(2.05)
        xr = float(XR_S(s)) + 1.3 * ins(-2.08)

        def width(x, s=s):
            zb, zt = float(Z_BOT(x)), float(Z_BELT(x))
            z = zb + s * (zt - zb)
            return w_side(x, z, zb, zt) - ins(x)

        half = half_contour(xf, xr, width, 0.50, 0.36, 3.2, 3.6, x_mid, nf, nr)
        rings.append(ring_from_half(half, zf))
        meta.append(s)
    return rings, meta, len(half)


G_PINS = [-0.095, -0.115, -0.135, -0.165, -0.945, -0.96, -0.975]


def pinned_mid(xs, xe, pins, counts):
    """x samples from xs down to xe with pins (descending) hit exactly; counts[i] samples per segment.
    Pins outside (xe, xs) are clamped (degenerate spacing is fine where it is roof / pillar)."""
    knots = [xs] + [min(max(p, xe + 0.004 * (len(pins) - i)), xs - 0.004 * (i + 1)) for i, p in enumerate(pins)] + [xe]
    out = []
    for i, n in enumerate(counts):
        a, b = knots[i], knots[i + 1]
        for k in range(n):
            out.append(a + (b - a) * k / n)
    out.append(xe)
    return out


def greenhouse(q):
    hi = q == "hi"
    levs = ([0, 0.03, 0.07, 0.13, 0.22, 0.32, 0.42, 0.52, 0.62, 0.71, 0.79, 0.85, 0.89, 0.92, 0.945, 0.965, 0.98, 0.992, 1.0]
            if hi else [0, 0.06, 0.2, 0.4, 0.6, 0.78, 0.87, 0.93, 0.97, 1.0])
    counts = [16, 1, 1, 1, 18, 1, 1, 6] if hi else [7, 1, 1, 1, 8, 1, 1, 3]
    x_mid = lambda xs, xe: pinned_mid(xs, xe, G_PINS, counts)
    nf, nr = (22, 18) if hi else (10, 8)
    rings, meta = [], []
    for g in levs:
        xf, xr = float(XF_G(g)), float(XR_G(g))
        hg = float(H_G(g))

        def zf(x, y, hg=hg):
            zb = float(Z_BELT(x))
            return zb + hg * (float(Z_ROOF(x)) - zb)

        wg = float(W_G(g))
        half = half_contour(xf, xr, lambda x: wg - 0.01 * ((x + 0.45) / 1.1) ** 2, 0.22, 0.24, 2.6, 3.0, x_mid, nf, nr)
        rings.append(ring_from_half(half, zf))
        meta.append(g)
    return rings, meta, len(half)


def loft(rings, bm=None):
    bm = bm or bmesh.new()
    vrings = [[bm.verts.new(p) for p in r] for r in rings]
    faces = []
    n = len(rings[0])
    for li in range(len(rings) - 1):
        a, b = vrings[li], vrings[li + 1]
        for i in range(n):
            j = (i + 1) % n
            f = bm.faces.new((a[i], a[j], b[j], b[i]))
            faces.append((f, li, i))
    return bm, vrings, faces


def cap(ob, ring_idx_verts, zfun, span):
    """grid-fill the highest open boundary loop; returns (new face indices, ring vertex indices).
    zfun is unused here (interior z is set by the caller)."""
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(ob.data)
    bnd = [e for e in bm.edges if e.is_boundary]
    # group boundary edges into loops
    loops, seen = [], set()
    for e in bnd:
        if e in seen:
            continue
        stack, comp = [e], []
        while stack:
            x = stack.pop()
            if x in seen:
                continue
            seen.add(x)
            comp.append(x)
            for v in x.verts:
                for e2 in v.link_edges:
                    if e2.is_boundary and e2 not in seen:
                        stack.append(e2)
        loops.append(comp)
    topl = max(loops, key=lambda es: sum(v.co.z for e in es for v in e.verts) / (2 * len(es)))
    for v in bm.verts:
        v.select = False
    for e in bm.edges:
        e.select = False
    for f in bm.faces:
        f.select = False
    for e in topl:
        e.select = True
        for v in e.verts:
            v.select = True
    ring = sorted({v.index for e in topl for v in e.verts})
    nf0 = len(bm.faces)
    bmesh.update_edit_mesh(ob.data)
    bpy.ops.mesh.select_mode(type="EDGE")
    bpy.ops.mesh.fill_grid(span=min(span, len(ring) // 2 - 2), offset=0, use_interp_simple=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    return list(range(nf0, len(ob.data.polygons))), ring


# ── classification helpers ────────────────────────────────────────────────────
def half_index(i, H):
    return i if i < H else 2 * H - 2 - i


PANELS = ["body", "hood", "door_FL", "door_FR", "door_RL", "door_RR", "tailgate"]
P_IDX = {n: i for i, n in enumerate(PANELS)}
DOOR_F = (0.915, -0.115)
DOOR_R = (-0.135, -0.960)


def door_of(x, y):
    side = "L" if y > 0 else "R"
    if DOOR_F[1] < x < DOOR_F[0]:
        return "door_F" + side
    if DOOR_R[1] < x < DOOR_R[0]:
        return "door_R" + side
    return None


def classify_lower(x, y, z, s, zone, frac):
    """-> (material, panel) for a lower-body face. zone: 'F' front rounding, 'M' side, 'R' rear rounding;
    frac: 0 at the tip .. 1 at the side junction (end zones)"""
    ay = abs(y)
    mat, panel = "paint", "body"
    if s < 0.055:
        mat = "plastic_black"
    if zone == "F":
        if s < 0.14:
            mat = "plastic_black"
        if 0.195 < s < 0.465 and ay < 0.53:
            mat = "grille"
        elif 0.195 < s < 0.465 and 0.63 < ay < 0.72:
            mat = "trim_black"  # air-curtain slots
        elif False:
            pass
        if 0.76 < s < 0.87 and ay < 0.36:
            mat = "trim_black"
        tl = min(1.0, max(0.0, (ay - 0.34) / 0.46))
        if 0.745 + 0.10 * tl < s < 0.905 + 0.025 * tl and 0.34 < ay and x > 1.84:
            mat = "LAMP_F"
        if s >= 0.955 and ay < 0.64:
            panel = "hood"
    elif zone == "R":
        if s < 0.24:
            mat = "plastic_black"
        if 0.80 < s < 0.965 and 0.40 < ay and x < -1.90:
            mat = "LAMP_R"
        if s >= 0.62 and ay < 0.50 and mat != "LAMP_R":
            panel = "tailgate"
        if 0.63 < s < 0.79 and ay < 0.30 and x < -2.0:
            mat = "trim_black"  # plate recess
        if 0.27 < s < 0.34 and 0.60 < ay < 0.80:
            mat = "tail_lens"  # rear reflectors
    else:
        d = door_of(x, y)
        if d and s >= 0.085 and s < 0.9995:
            panel = d
    return mat, panel


def classify_green(x, y, g, zone, frac, nz):
    """greenhouse face -> (material, panel). frac along the end zones from the tip (0) to the side (1)"""
    ay = abs(y)
    mat, panel = "paint", "body"
    if zone == "F":
        if frac < 0.60 and 0.035 < g < 0.955:
            mat = "GLASS_F"
        elif frac < 0.60 and g <= 0.035:
            mat = "trim_black"
        elif frac < 0.80:
            mat = "paint"  # A-pillar
        elif 0.05 < g < 0.86:
            mat = "GLASS_S"
        elif g <= 0.05:
            mat = "trim_black"
    elif zone == "R":
        if frac < 0.66 and 0.05 < g < 0.90:
            mat = "GLASS_R"
        elif frac < 0.70 and g < 0.93:
            mat = "trim_black"
        if frac < 0.72 and g <= 1.0:
            panel = "tailgate"
    else:
        if g <= 0.05:
            mat = "trim_black"
        elif g < 0.86:
            if -0.165 < x < -0.095:
                mat = "trim_black"  # B-pillar
            elif x > -0.965:
                mat = "GLASS_S"
            elif x > -1.005:
                mat = "trim_black"  # rear door frame
            elif x > float(XR_G(g)) + 0.36 and g < 0.80:
                mat = "GLASS_S"  # fixed rear quarter window, trailing edge follows the hatch rake
            elif x > float(XR_G(g)) + 0.33 and g < 0.83:
                mat = "trim_black"
            else:
                mat = "paint"  # C-pillar
        elif g < 0.925 and x > float(XR_G(g)) + 0.33:
            mat = "trim_black"  # upper door frame / seal
        d = door_of(x, y)
        if d and g < 0.925:
            panel = d
    if zone == "F" and frac >= 0.80 and g < 0.925:
        d = door_of(x, y)
        if d:
            panel = d
    return mat, panel


# ── build ─────────────────────────────────────────────────────────────────────
def zone_of(hi_idx, H, nf, nr):
    if hi_idx < nf:
        return "F", hi_idx / nf
    if hi_idx > H - 1 - nr:
        return "R", (H - 1 - hi_idx) / nr
    return "M", 0.0


def shell(rings, meta, H, nf, nr, kind):
    """loft rings into a bmesh, assign material + panel per face. returns (bm, top ring verts)"""
    bm = bmesh.new()
    pl = bm.faces.layers.int.new("panel")
    bm, vr, faces = loft(rings, bm)
    mats_all = MAT_LIST + ["LAMP_F", "LAMP_R", "GLASS_F", "GLASS_S", "GLASS_R"]
    for f, li, i in faces:
        c = f.calc_center_median()
        n = len(rings[0])
        hA = half_index(i, H)
        hB = half_index((i + 1) % n, H)
        zone, frac = zone_of(min(hA, hB) if min(hA, hB) < nf else max(hA, hB), H, nf, nr)
        if zone == "F":
            frac = (min(hA, hB) + 0.5) / nf
        elif zone == "R":
            frac = (H - 1 - max(hA, hB) + 0.5) / nr
        lev = 0.5 * (meta[li] + meta[li + 1])
        if kind == "lower":
            m, p = classify_lower(c.x, c.y, c.z, lev, zone, frac)
        else:
            m, p = classify_green(c.x, c.y, lev, zone, frac, f.normal.z)
        f.material_index = mats_all.index(m)
        f[pl] = P_IDX[p]
    return bm, vr[-1]


def build_body(q):
    hi = q == "hi"
    mats_all = MAT_LIST + ["LAMP_F", "LAMP_R", "GLASS_F", "GLASS_S", "GLASS_R"]
    mat_objs = [C.MATS[m] if m in C.MATS else C.MATS["paint"] for m in mats_all]
    # lower body
    rings, meta, H = lower_body(q)
    nf, nr = (26, 22) if hi else (12, 10)
    bm, top = shell(rings, meta, H, nf, nr, "lower")
    lower = C.obj("body_lower", bm, mat_objs, smooth=True, sharp=None, recalc=False)
    top_idx = [v.index for v in lower.data.vertices][-len(top):]
    zc = lambda x, y: float(Z_BELT(x))

    def hood_z(x, y):
        # crown rising from the ring (distance-faded)
        return float(Z_BELT(x))

    new, top_idx = cap(lower, top_idx, hood_z, span=int(len(top) * 0.40))
    print("CAP lower", len(top_idx), len(new))
    me = lower.data
    # crown: lift interior cap verts by distance to the ring
    ring_xy = np.array([(me.vertices[i].co.x, me.vertices[i].co.y) for i in top_idx])
    cap_verts = set()
    for fi in new:
        cap_verts.update(me.polygons[fi].vertices)
    cap_verts -= set(top_idx)
    wfun = ring_width_fn(ring_xy)
    for vi in cap_verts:
        v = me.vertices[vi]
        w = max(wfun(v.co.x), 1e-3)
        v.co.z = float(Z_BELT(v.co.x)) + 0.030 * max(0.0, 1 - (v.co.y / w) ** 2) ** 1.5
    pa = me.attributes["panel"]
    gx0, gx1, gw = float(XR_G(0)) + 0.05, float(XF_G(0)) - 0.04, float(W_G(0)) - 0.04
    kill = []
    for fi in new:
        p = me.polygons[fi]
        c = p.center
        p.material_index = 0
        pa.data[fi].value = P_IDX["hood"] if c.x > 0.975 else (P_IDX["tailgate"] if c.x < -1.965 else 0)
        if gx0 < c.x < gx1 and abs(c.y) < gw:
            kill.append(fi)
    _delete_faces(lower, kill)
    # recalc normals outward on the (now open) shell: flip if they point in
    _orient_out(lower)
    # greenhouse
    grings, gmeta, GH = greenhouse(q)
    gnf, gnr = (22, 18) if hi else (10, 8)
    gbm, gtop = shell(grings, gmeta, GH, gnf, gnr, "green")
    green = C.obj("body_green", gbm, mat_objs, smooth=True, sharp=None, recalc=False)
    gtop_idx = [v.index for v in green.data.vertices][-len(gtop):]
    gnew, gtop_idx = cap(green, gtop_idx, lambda x, y: float(Z_ROOF(x)), span=int(len(gtop) * 0.36))
    print("CAP green", len(gtop_idx), len(gnew))
    me = green.data
    ring_xy = np.array([(me.vertices[i].co.x, me.vertices[i].co.y) for i in gtop_idx])
    cv = set()
    for fi in gnew:
        cv.update(me.polygons[fi].vertices)
    cv -= set(gtop_idx)
    wfun = ring_width_fn(ring_xy)
    for vi in cv:
        v = me.vertices[vi]
        w = max(wfun(v.co.x), 1e-3)
        v.co.z = float(Z_ROOF(v.co.x)) + 0.024 * max(0.0, 1 - (v.co.y / w) ** 2) ** 1.5
    pa = me.attributes["panel"]
    for fi in gnew:
        me.polygons[fi].material_index = 0
        pa.data[fi].value = 0
    _orient_out(green)
    return lower, green, mats_all


def ring_width_fn(ring_xy):
    """half-width of a closed top ring as a function of x (upper envelope of |y|)"""
    pts = ring_xy[np.argsort(ring_xy[:, 0])]
    xs = np.linspace(pts[0, 0], pts[-1, 0], 400)
    ws = np.zeros_like(xs)
    for i in range(len(ring_xy)):
        j = (i + 1) % len(ring_xy)
        (x0, y0), (x1, y1) = ring_xy[i], ring_xy[j]
        lo, hi = min(x0, x1), max(x0, x1)
        m = (xs >= lo) & (xs <= hi)
        if hi - lo < 1e-9:
            ws[m] = np.maximum(ws[m], max(abs(y0), abs(y1)))
        else:
            t = (xs[m] - x0) / (x1 - x0)
            ws[m] = np.maximum(ws[m], np.abs(y0 + (y1 - y0) * t))
    return lambda x: float(np.interp(x, xs, ws))


def _delete_faces(ob, idx):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.faces.ensure_lookup_table()
    fs = [bm.faces[i] for i in idx]
    bmesh.ops.delete(bm, geom=fs, context="FACES")
    bm.to_mesh(ob.data)
    bm.free()


def _orient_out(ob):
    """make normals consistent, then flip everything if most normals point toward the car's centre line"""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    score = 0.0
    for f in bm.faces:
        c = f.calc_center_median()
        score += f.normal.dot(Vector((c.x * 0.3, c.y, c.z - 0.75))) * f.calc_area()
    if score < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()


def cap_bottom(ob, mat_index):
    """close the lowest open loop (underbody)"""
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(ob.data)
    bnd = [e for e in bm.edges if e.is_boundary]
    loops, seen = [], set()
    for e in bnd:
        if e in seen:
            continue
        stack, comp = [e], []
        while stack:
            x = stack.pop()
            if x in seen:
                continue
            seen.add(x)
            comp.append(x)
            for v in x.verts:
                for e2 in v.link_edges:
                    if e2.is_boundary and e2 not in seen:
                        stack.append(e2)
        loops.append(comp)
    low = min(loops, key=lambda es: sum(v.co.z for e in es for v in e.verts) / (2 * len(es)))
    for g in list(bm.verts) + list(bm.edges) + list(bm.faces):
        g.select = False
    for e in low:
        e.select = True
    nf0 = len(bm.faces)
    bmesh.update_edit_mesh(ob.data)
    res = bmesh.ops.triangle_fill(bm, edges=low, use_beauty=True, use_dissolve=False)
    for f in res["geom"]:
        if isinstance(f, bmesh.types.BMFace):
            f.material_index = mat_index
    bmesh.update_edit_mesh(ob.data)
    bpy.ops.object.mode_set(mode="OBJECT")


def arch_cutters(hi):
    bm = bmesh.new()
    for ax in (XF_AX, XR_AX):
        for sgn in (1, -1):
            C.cyl(0.372, 0.7, 64 if hi else 32, loc=(ax, sgn * (0.585 + 0.35), WR), axis="Y", bm=bm)
    return C.obj("_arch", bm, ["arch_liner"], smooth=False)


def mirror_obj(side, hi):
    """door mirror: body-colour cap, black base, chrome glass"""
    sg = 1 if side == "L" else -1
    segs = 20 if hi else 10
    bm = bmesh.new()
    # housing: squashed half-ellipsoid lofted along y
    for k in range(9):
        t = k / 8
        y = 0.02 + 0.20 * t
        w = 0.105 * math.sin(math.pi * (0.25 + 0.75 * t)) ** 0.6 if t < 1 else 0.02
        hgt = 0.075 * math.sin(math.pi * (0.2 + 0.8 * t)) ** 0.5 if t < 1 else 0.02
    prof = []
    ob_parts = []
    hs = bmesh.new()
    C.cyl(0.07, 0.19, segs, loc=(0, 0.0, 0), axis="Y", bm=hs)
    C.xform(hs, scale=(0.72, 1.0, 1.0))
    for v in hs.verts:
        t = (v.co.y + 0.095) / 0.19  # 0 at the door, 1 at the tip
        v.co.x *= 0.75 + 0.25 * math.sin(math.pi * min(1, t * 0.9 + 0.1))
        v.co.z *= 0.8 + 0.2 * math.sin(math.pi * min(1, t * 0.9 + 0.1))
        if v.co.x < -0.02:  # glass side is flat-ish
            v.co.x = -0.02 - (v.co.x + 0.02) * 0.25
    housing = C.obj("mirror_" + side, hs, ["paint"], sharp=60)
    C.subsurf(housing, 1)
    gb = C.box((0.004, 0.16, 0.085), loc=(-0.031, 0.01, 0.0), bevel=0.01, segs=2)
    glass = C.obj("mirror_glass_" + side, gb, ["chrome"], sharp=40)
    sb = C.box((0.10, 0.06, 0.03), loc=(0.01, -0.11, -0.03), bevel=0.01, segs=2)
    stalk = C.obj("mirror_base_" + side, sb, ["trim_black"], sharp=40)
    m = C.join([housing, glass, stalk], "mirror_" + side)
    m.data.transform(Matrix.Rotation(math.radians(-8), 4, "Z"))
    if sg < 0:
        m.data.transform(Matrix.Scale(-1, 4, Vector((0, 1, 0))))
        m.data.flip_normals()
    m.location = (0.80, sg * 0.965, 0.995)
    return m


def handle(x, side, hi):
    sg = 1 if side == "L" else -1
    b = C.box((0.16, 0.018, 0.028), bevel=0.009, segs=2 if hi else 1)
    o = C.obj("handle", b, ["chrome"], sharp=40)
    zt = float(Z_BELT(x))
    z = zt - 0.13
    w = w_side(x, z, float(Z_BOT(x)), zt) + 0.004
    o.location = (x, sg * w, z)
    return o


def spoiler(hi):
    bm = bmesh.new()
    n = 24 if hi else 10
    # a thin wing continuing the roof over the rear glass
    for i in range(n + 1):
        y = -0.60 + 1.2 * i / n
    b = C.box((0.16, 1.08, 0.022), loc=(-1.52, 0, 1.418), bevel=0.010, segs=2 if hi else 1)
    for v in b.verts:
        yy = v.co.y / 0.54
        v.co.z -= 0.030 * yy * yy + (v.co.x + 1.44) * 0.16
        v.co.x -= 0.03 * yy * yy
    return C.obj("spoiler", b, ["paint"], sharp=45)


def plate(front, hi):
    """blank EU-size plate (white, blue band at the left, no characters)"""
    if "plate_face" not in C.MATS:
        W_, H_ = 256, 64
        img = np.ones((H_, W_, 3), np.float32) * 0.82
        img[:, :22] = C.srgb("#0b3a9c")
        img[:3, :] = img[-3:, :] = 0.05
        img[:, :3] = img[:, -3:] = 0.05
        C.material("plate_face", (1, 1, 1), 0.35, albedo=C.image("plate_alb", img), vcol=True)
    b = C.box((0.006, 0.52, 0.11), bevel=0.004, segs=1)
    uvl = b.loops.layers.uv.verify()
    for f in b.faces:
        for lp in f.loops:
            lp[uvl].uv = (0.5 - lp.vert.co.y / 0.52, 0.5 + lp.vert.co.z / 0.11)
            if front:
                lp[uvl].uv = (0.5 + lp.vert.co.y / 0.52, 0.5 + lp.vert.co.z / 0.11)
    s = 0.515 if front else 0.705
    x = _front_x_at(0.0, s) + 0.004 if front else None
    if not front:
        zb, zt = float(Z_BOT(-2.1)), float(Z_BELT(-2.1))
        x = float(XR_S(s)) + 0.012 - 0.0065
        z = zb + s * (zt - zb)
    else:
        zb, zt = float(Z_BOT(x)), float(Z_BELT(x))
        z = zb + s * (zt - zb)
    C.xform(b, loc=(x, 0, z))
    return C.obj("plate_front" if front else "plate_rear", b, ["plate_face"], sharp=40)


def grille_bar(hi):
    """gloss-black bar across the lower grille"""
    s = 0.33
    b = C.box((0.02, 1.0, 0.035), bevel=0.008, segs=2 if hi else 1)
    x = _front_x_at(0.0, s) - 0.012
    zb, zt = float(Z_BOT(x)), float(Z_BELT(x))
    for v in b.verts:
        v.co.x -= 0.10 * (v.co.y / 0.5) ** 2
    C.xform(b, loc=(x, 0, zb + s * (zt - zb)))
    return C.obj("grille_bar", b, ["trim_black"], sharp=40)


def wipers(hi):
    bm = bmesh.new()
    for y0, L in ((0.42, 0.62), (-0.05, 0.56)):
        path = [Vector((0.97, y0, 0.975)), Vector((0.93, y0 + 0.2, 0.99)), Vector((0.90, y0 + L * 0.95, 1.0))]
        C.tube(C.bezier_path(path, 4), 0.006, 6, bm=bm)
    return C.obj("wipers", bm, ["trim_black"], sharp=40)


def seat(x, y, hi, rear=False):
    parts = []
    w = 0.50 if not rear else 1.30
    cb = C.box((0.50, w, 0.12), loc=(x, y, 0.52), bevel=0.04, segs=2 if hi else 1)
    parts.append(C.obj("s", cb, ["seat"], sharp=50))
    bb = C.box((0.12, w, 0.60), loc=(x - 0.27, y, 0.86), bevel=0.045, segs=2 if hi else 1)
    for v in bb.verts:
        v.co.x -= (v.co.z - 0.56) * 0.28
    parts.append(C.obj("s", bb, ["seat"], sharp=50))
    for yy in ((y,) if not rear else (y - 0.4, y + 0.4)):
        hb = C.box((0.09, 0.25, 0.17), loc=(x - 0.38, yy, 1.27), bevel=0.04, segs=2 if hi else 1)
        parts.append(C.obj("s", hb, ["seat"], sharp=50))
    return C.join(parts, "seat")


def interior(hi, lower_src, green_src):
    """dark cabin shell (inset flipped copies of the body), seats, dashboard, steering wheel"""
    objs = []
    for src, name, keep in ((green_src, "cab_g", lambda c: True),
                            (lower_src, "cab_l", lambda c: c.z > 0.21 if c.x > 0.98 else (-1.35 < c.x and c.z > 0.32))):
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
    objs.append(seat(0.05, 0.37, hi))
    objs.append(seat(0.05, -0.37, hi))
    objs.append(seat(-0.82, 0.0, hi, rear=True))
    # dashboard
    db = C.box((0.42, 1.46, 0.22), loc=(0.72, 0, 0.86), bevel=0.06, segs=2 if hi else 1)
    for v in db.verts:
        v.co.z += (v.co.x - 0.6) * 0.25 if v.co.z > 0.9 else 0
    objs.append(C.obj("dash", db, ["dash"], sharp=50))
    # steering wheel (left-hand drive: driver on the left = +Y)
    sb = bmesh.new()
    C.torus(0.185, 0.016, 32 if hi else 16, 8 if hi else 6, bm=sb)
    C.cyl(0.05, 0.05, 16, loc=(0, 0, 0), bm=sb)
    C.xform(sb, rot=Matrix.Rotation(math.radians(-62), 3, "Y"), loc=(0.42, 0.37, 0.98))
    objs.append(C.obj("steer", sb, ["dash"], sharp=40))
    return C.join(objs, "interior")


def lamp_front(obj_faces, hi):
    """headlight: clear lens (the classified faces), dark housing pushed in, DRL light guide, 2 projectors"""
    lens = obj_faces
    lens.name = "lights_front"
    housing = lens.copy()
    housing.data = lens.data.copy()
    bpy.context.scene.collection.objects.link(housing)
    bm = bmesh.new()
    bm.from_mesh(housing.data)
    bm.normal_update()
    bnd = [e for e in bm.edges if e.is_boundary]
    for v in bm.verts:
        v.co -= v.normal * 0.045
    for f in bm.faces:
        f.material_index = 0
    # walls from the lens edge down to the housing: extrude the housing boundary back up
    res = bmesh.ops.extrude_edge_only(bm, edges=bnd)
    for g in res["geom"]:
        if isinstance(g, bmesh.types.BMVert):
            g.co += g.normal * 0.045
    bm.to_mesh(housing.data)
    bm.free()
    housing.data.materials.clear()
    housing.data.materials.append(C.MATS["lamp_housing"])
    lens.data.materials.clear()
    lens.data.materials.append(C.MATS["lamp_glass"])
    for p in lens.data.polygons:
        p.material_index = 0
    parts = [lens, housing]
    # DRL: a light guide along the top of each lamp, projectors: chrome bowls with a lens
    for sg in (1, -1):
        pts = []
        for k in range(12):
            t = k / 11
            y = sg * (0.40 + 0.40 * t)
            s = 0.885 - 0.03 * t
            x = _front_x_at(y, s) - 0.02
            zb, zt = float(Z_BOT(x)), float(Z_BELT(x))
            pts.append(Vector((x, y, zb + s * (zt - zb))))
        drl = C.obj("drl", C.tube(pts, 0.0055, 8), ["light_head"])
        parts.append(drl)
        for yy, rr in ((0.50, 0.034), (0.64, 0.030)):
            y = sg * yy
            s = 0.80
            x = _front_x_at(y, s) - 0.035
            zb, zt = float(Z_BOT(x)), float(Z_BELT(x))
            z = zb + s * (zt - zb)
            bb = C.lathe([(0.0, -0.012), (rr * 0.6, -0.01), (rr, 0.0), (rr * 1.05, 0.004)], 20 if hi else 10, axis="X")
            bowl = C.obj("proj", C.xform(bb, loc=(x, y, z)), ["reflector"])
            lb = C.lathe([(0.0, 0.012), (rr * 0.7, 0.008), (rr * 0.8, 0.0)], 20 if hi else 10, axis="X")
            lensp = C.obj("projl", C.xform(lb, loc=(x - 0.004, y, z)), ["lamp_glass"])
            parts += [bowl, lensp]
    return C.join(parts, "lights_front")


_HALF_CACHE = {}


def _front_x_at(y, s):
    """x of the lower-body front surface at lateral y, level s (from the same contour as the body)"""
    key = round(s, 3)
    if key not in _HALF_CACHE:
        rings, meta, H = lower_body("hi") if False else (None, None, None)
        zb_f = lambda x: float(Z_BOT(x))
        ins = lambda x: top_inset((1 - s) * (float(Z_BELT(x)) - float(Z_BOT(x))))
        xf = float(XF_S(s)) - 1.3 * ins(2.05)

        def width(x):
            zb, zt = float(Z_BOT(x)), float(Z_BELT(x))
            return w_side(x, zb + s * (zt - zb), zb, zt) - ins(x)

        xs = np.linspace(xf, xf - 0.6, 400)
        ys = []
        for x in xs:
            t = min(1.0, max(0.0, (x - (xf - 0.50)) / 0.50))
            ys.append(width(x) * (1 - t ** 3.2) ** (1 / 3.2))
        _HALF_CACHE[key] = (xs, np.array(ys))
    xs, ys = _HALF_CACHE[key]
    return float(np.interp(abs(y), ys, xs))


def build(q, ao=True):
    hi = q == "hi"
    car_mats(q)
    lower, green, mats_all = build_body(q)
    mi = {m: i for i, m in enumerate(mats_all)}
    cap_bottom(lower, mi["plastic_black"])
    # interior shell source copies (before holes are cut)
    lower_src = lower.copy()
    lower_src.data = lower.data.copy()
    bpy.context.scene.collection.objects.link(lower_src)
    green_src = green.copy()
    green_src.data = green.data.copy()
    bpy.context.scene.collection.objects.link(green_src)
    # wheel arches
    C.boolean(lower, arch_cutters(hi), transfer=True)
    # grille / intakes recessed
    gi, ti = mi["grille"], mi["trim_black"]
    C.recess(lower, lambda f: f.material_index == gi, 0.02, wall_mat=mi["plastic_black"])
    C.recess(lower, lambda f: f.material_index == ti and f.calc_center_median().x < -2.0 and f.calc_center_median().z < 0.9,
             0.012, wall_mat=mi["paint"])
    C.recess(lower, lambda f: f.material_index == ti and f.calc_center_median().x > 1.9 and f.calc_center_median().z < 0.5,
             0.03, wall_mat=mi["plastic_black"])
    # glass + lamps out of the shells
    gl = {mi["GLASS_F"]: "glass_front", mi["GLASS_R"]: "glass_rear"}

    def gkey(p, me):
        if p.material_index in gl:
            return gl[p.material_index]
        if p.material_index == mi["GLASS_S"]:
            pan = PANELS[me.attributes["panel"].data[p.index].value]
            return "glass_" + (pan.split("_")[1] if pan.startswith("door") else ("QL" if p.center.y > 0 else "QR"))
        return None

    glass = C.split_faces(green, gkey)
    lamps = C.split_faces(lower, lambda p, me: {mi["LAMP_F"]: "LF", mi["LAMP_R"]: "LR"}.get(p.material_index))
    # panels
    def pkey(p, me):
        v = me.attributes["panel"].data[p.index].value
        return PANELS[v] if v else None

    pl = C.split_faces(lower, pkey)
    pg = C.split_faces(green, pkey)
    panels = {}
    for k in set(pl) | set(pg):
        panels[k] = C.join([o for o in (pl.get(k), pg.get(k)) if o], k)
    body = C.join([lower, green], "body")
    for o in [body] + list(panels.values()):
        C.uv_box(o, 0.3)
        C.flange(o, gap=0.0025, depth=0.018)
        C.smooth_by_angle(o, 50)
    for o in panels.values():  # opening panels get a dark inner skin (seen when a door / hood opens)
        o.data.materials.append(C.MATS["interior"])
        m = o.modifiers.new("inner", "SOLIDIFY")
        m.thickness = 0.03
        m.offset = -1
        m.use_even_offset = False
        m.material_offset = 1000
        m.material_offset_rim = 1000
        m.use_rim = False
        C.apply_mods(o)
    # materials on glass / lamps
    for k, o in glass.items():
        o.data.materials.clear()
        o.data.materials.append(C.MATS["glass"])
        for p in o.data.polygons:
            p.material_index = 0
    lights_f = lamp_front(lamps["LF"], hi) if "LF" in lamps else None
    lr = lamps.get("LR")
    if lr:
        lr.name = "lights_rear"
        lr.data.materials.clear()
        lr.data.materials.append(C.MATS["light_tail"])
        for p in lr.data.polygons:
            p.material_index = 0
    # details
    extras = [spoiler(hi), wipers(hi), plate(True, hi), plate(False, hi), grille_bar(hi)]
    mirrors = {s: mirror_obj(s, hi) for s in ("L", "R")}
    handles = {}
    for d, x in (("door_FL", 0.30), ("door_FR", 0.30), ("door_RL", -0.66), ("door_RR", -0.66)):
        handles[d] = handle(x, d[-1], hi)
    body = C.join([body] + extras, "body")
    inter = interior(hi, lower_src, green_src)
    for o in (lower_src, green_src):
        bpy.data.objects.remove(o)
    # wheels
    import build_wheel as W
    wq = "lo" if hi else "min"
    wroot, wparts = W.make_wheel(wq, "car", name="_wheel", caliper_angle=150, ao=False)
    car = C.empty("car")
    for o in [body, inter, lights_f, lr] + list(glass.values()):
        if o:
            o.parent = car
    # panels with pivots
    piv = {"hood": (0.975, 0, float(Z_BELT(0.975))), "tailgate": (-1.40, 0, 1.415)}
    for d in ("door_FL", "door_FR", "door_RL", "door_RR"):
        x0 = DOOR_F[0] if d[5] == "F" else DOOR_R[0]
        piv[d] = (x0, (0.86 if d[-1] == "L" else -0.86), 0.7)
    for k, o in panels.items():
        o.name = k + "_panel"
        o.data.name = k + "_panel"
    for k, o in panels.items():
        e = C.empty(k, car, loc=piv[k])
        o.parent = e
        o.location = (-piv[k][0], -piv[k][1], -piv[k][2])
        if k.startswith("door"):
            g = glass.get("glass_" + k[5:])
            if g:
                g.parent = e
                g.location = o.location
            h = handles[k]
            h.name = "handle_" + k[5:]
            h.parent = e
            h.location = (h.location.x - piv[k][0], h.location.y - piv[k][1], h.location.z - piv[k][2])
        if k == "tailgate" and "glass_rear" in glass:
            g = glass["glass_rear"]
            g.parent = e
            g.location = o.location
    for s_, mo in mirrors.items():
        par = car.children_recursive
        e = [c for c in car.children if c.name == "door_F" + s_]
        if e:
            mo.parent = e[0]
            mo.location = (mo.location.x - e[0].location.x, mo.location.y - e[0].location.y, mo.location.z - e[0].location.z)
        else:
            mo.parent = car
    wheel_objs = []
    for tag, x, y in (("FL", XF_AX, TRACK / 2), ("FR", XF_AX, -TRACK / 2), ("RL", XR_AX, TRACK / 2), ("RR", XR_AX, -TRACK / 2)):
        front = tag[0] == "F"
        hub = C.empty("steer_" + tag if front else "hub_" + tag, car, loc=(x, y, WR))
        rz = math.pi if y > 0 else 0.0  # the wheel's face looks outward (-Y is its face)
        hub.rotation_euler = (0, 0, rz)
        spin = C.empty("wheel_" + tag, hub)
        for k in ("tyre", "rim", "disc", "lugs", "cap", "valve"):
            src = wparts[k]
            o = src.copy()
            o.name = f"{k}_{tag}"
            bpy.context.scene.collection.objects.link(o)
            o.parent = spin
            wheel_objs.append(o)
        cal = wparts["caliper"].copy()
        cal.name = "caliper_" + tag
        bpy.context.scene.collection.objects.link(cal)
        cal.parent = hub
        if y > 0:  # keep the caliper behind the axle on both sides
            cal.rotation_euler = (0, 0, 0)
            cal.scale = (-1, 1, 1)
        wheel_objs.append(cal)
    for o in [wroot] + list(wroot.children_recursive):
        bpy.data.objects.remove(o)
    bpy.context.view_layer.update()
    # AO: whole car occluding (arches, sills, door gaps)
    meshes = [o for o in car.children_recursive if o.type == "MESH"]
    big = [o for o in meshes if not o.name.startswith(("tyre", "rim", "disc", "lugs", "cap_", "valve", "caliper", "glass", "lights"))]
    if not ao:
        for o in meshes:
            C.vcol_fill(o)
        return car
    C.bake_ao_vcol(big, samples=64 if hi else 24, max_dist=0.45, floor=0.22)
    firsts = {}
    for o in wheel_objs:
        firsts.setdefault(o.data.name, o)
    C.bake_ao_vcol(list(firsts.values()), samples=32 if hi else 16, max_dist=0.06, floor=0.3)
    return car


if __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    C.reset()
    car = build(q, ao=not a.get("noao"))
    if a.get("look"):
        H = os.path.join(C.HERE, "..", "public/lib3d/env/")
        views = {"side": ((0.0, -9.5, 0.75), (0, 0, 0.72), 22), "front": ((9.5, 0.0, 0.85), (0, 0, 0.72), 18),
                 "q3": ((5.8, -6.2, 2.1), (0, 0, 0.6), 28), "rear3": ((-5.8, -5.2, 2.3), (0, 0, 0.6), 28),
                 "close": ((3.6, -2.2, 1.0), (1.4, 0, 0.6), 34), "top": ((0.0, -0.01, 13), (0, 0, 0), 22),
                 "rearc": ((-4.2, -2.4, 1.3), (-1.6, 0, 0.8), 34)}
        for k in a.get("views", "side,q3,rear3,close").split(","):
            cam, tgt, fov = views[k]
            C.look(f"/tmp/l3d/car_{k}.png", target=tgt, cam=cam, fov=fov, hdr=H + a.get("env", "workshop") + "-1k-v1.hdr",
                   ground=True, spp=int(a.get("spp", "32")), res=(1100, 620))
    if a.get("out") or not a.get("look"):
        C.finish("car", q, car, a.get("out"))
