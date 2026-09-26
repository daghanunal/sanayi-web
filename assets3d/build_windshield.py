"""Laminated passenger-car windscreen (1.45 x 0.90 m, compound curvature) with ceramic frit band + dot
gradient, sensor / camera housing, interior mirror, rubber moulding, cowl panel and two wiper arms + blades.

  Blender -b --factory-startup --python assets3d/build_windshield.py -- --q hi --out /tmp/windshield-hi.glb

three.js space: same frame as a car facing +X (the glass leans back 28 deg from horizontal, its outer face
looks toward +X / up); the glass centre is at the origin, the cowl hangs below it at the front.
Nodes (runtime contract, see README):
  windshield > glass (outer + inner ply + green edge), frit (black band, MASK), moulding, cowl, mirror,
               wiper_L_mount > wiper_L > (arm, blade)   driver side (car left, three -Z), pivot near the centre
               wiper_R_mount > wiper_R > (arm, blade)   passenger side
  Wipers park along the bottom edge pointing toward the car's left; sweep by wiper_X.rotation.y
  (local Y = the glass normal at the pivot): 0 = parked, positive = up the glass. Full sweep:
  wiper_L 0 .. 1.45 rad (83 deg), wiper_R 0 .. 1.40 rad (80 deg).
extras.explode: glass + frit forward along the glass normal, moulding forward, wipers up, cowl down.
Materials looked up at runtime: glass (alpha blend, slight green), frit.
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

ALPHA = math.radians(28)
E_UP = Vector((-math.cos(ALPHA), 0, math.sin(ALPHA)))  # up the glass
N = Vector((math.sin(ALPHA), 0, math.cos(ALPHA)))  # outward normal (unbent)
L = 0.90  # slant height
WB, WT = 0.725, 0.63  # half widths bottom / top
THK = 0.0052  # laminate thickness


def squircle(a, b, n=9.0):
    """unit square (a, b) in [-1,1]^2 -> superellipse with rounded corners (edges stay near straight)"""
    m = max(abs(a), abs(b))
    if m < 1e-9:
        return 0.0, 0.0
    ln = (abs(a) ** n + abs(b) ** n) ** (1 / n)
    k = m / ln
    return a * k, b * k


def surf(a, b, off=0.0):
    """glass point for square params (a, b), offset `off` along the local normal (negative = inward)"""
    s, t = squircle(a, b)
    t01 = (t + 1) / 2
    w = WB + (WT - WB) * t01
    y = s * w
    p = E_UP * (t01 - 0.5) * L + Vector((0, y, 0))
    p += N * (0.020 * math.sin(math.pi * t01))  # vertical crown
    p.x -= 0.115 * (y / WB) ** 2  # plan wrap toward the A-pillars
    p.x -= 0.02 * (y / WB) ** 4
    # approximate local normal from finite differences
    return p, s, t01


def normal_at(a, b, h=1e-3):
    p0, _, _ = surf(a, b)
    pa, _, _ = surf(min(1, a + h), b)
    pb, _, _ = surf(a, min(1, b + h))
    pa2, _, _ = surf(max(-1, a - h), b)
    pb2, _, _ = surf(a, max(-1, b - h))
    n = (pa - pa2).cross(pb - pb2).normalized()
    if n.dot(N) < 0:
        n = -n
    return n


# ── textures ─────────────────────────────────────────────────────────────────
def frit_tex(W=1024, H=512):
    """RGBA: black ceramic band (alpha 1) + halftone dot fade, top band wider + camera/mirror patch.
    UV = square params: u across (0..1 = 1.45 m), v up (0..1 = 0.9 m)."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    u = (xx + 0.5) / W
    v = (yy + 0.5) / H
    mu, mv = 1.45, 0.90  # metres per uv unit
    dx = np.minimum(u, 1 - u) * mu
    db = v * mv
    dt = (1 - v) * mv
    band_side, band_bot, band_top = 0.060, 0.070, 0.085
    # distance inside the band edge (m): negative inside the solid band
    d = np.minimum(np.minimum(dx - band_side, db - band_bot), dt - band_top)
    # camera / mirror patch: top centre 0.24 x 0.17 m below the top band, rounded lower corners
    px = np.abs(u - 0.5) * mu
    py = dt - band_top
    rc = 0.04
    qx = np.maximum(px - (0.12 - rc), 0)
    qy = np.maximum(py - (0.17 - rc), 0)
    dpatch = np.where(py < 0.17, np.maximum(px - 0.12, -1), np.hypot(qx, qy) - rc)
    dpatch = np.where((px < 0.12) & (py < 0.17 - rc), -1.0, dpatch)
    dpatch = np.where((px - 0.12 > 0) | (py - 0.17 > 0), np.maximum(np.hypot(np.maximum(px - (0.12 - rc), 0), np.maximum(py - (0.17 - rc), 0)) - rc, 0) + 1e-4, dpatch)
    d = np.minimum(d, dpatch)
    solid = (d <= 0).astype(np.float32)
    # halftone: dots on a 4 mm grid whose radius falls to 0 across 30 mm
    pitch = 0.004
    gx = (u * mu) % pitch - pitch / 2
    gy = (v * mv) % pitch - pitch / 2
    rad = np.clip(1 - d / 0.030, 0, 1) * pitch * 0.62
    dots = (np.hypot(gx, gy) < rad).astype(np.float32) * (d > 0)
    a = np.clip(solid + dots, 0, 1)
    rgb = np.full((H, W, 3), 0.012, np.float32)
    return np.concatenate([rgb, a[..., None]], -1)


def cowl_tex(n=512):
    """louvre slots in the cowl grille (albedo lum, normal)"""
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32) / n
    sx = (xx * 64) % 1.0
    sy = (yy * 3) % 1.0
    slot = ((sx > 0.3) & (sx < 0.7) & (sy > 0.2) & (sy < 0.8) & (yy > 0.3) & (yy < 0.7)).astype(np.float32)
    slot = T.blur(slot, 2)
    f = T.fbm(n, n, base=48, octaves=3, seed=81)
    lum = 0.03 * (1 - 0.8 * slot) * (1 + 0.1 * (f - 0.5))
    return T.gray3(lum), T.orm(1 - 0.7 * slot, 0.72 + 0.2 * slot, 0), T.normal_from_height(-slot * 3 + f * 0.4, 1.5)


def mats(q):
    hi = q == "hi"
    # dark green-grey tint: two plies in hi (each half the opacity), one in lo
    C.material("glass", C.srgb("#22332c"), 0.02, 0.0, alpha=0.17 if hi else 0.3, spec_level=0.5, ior=1.52, double=True)
    C.material("glass_edge", C.srgb("#2f5d49"), 0.05, 0.0, alpha=0.85)
    fr = frit_tex(1024, 512) if hi else frit_tex(512, 256)
    m = C.material("frit", (1, 1, 1), 0.55, albedo=C.image("frit_rgba", fr), alpha_tex=True, double=True)
    nt = m.node_tree  # Math Round on alpha -> the glTF exporter writes alphaMode MASK (crisp dots, no sorting)
    bsdf = [n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"][0]
    tex = [n for n in nt.nodes if n.type == "TEX_IMAGE"][0]
    for l in list(nt.links):
        if l.to_socket == bsdf.inputs["Alpha"]:
            nt.links.remove(l)
    rnd = nt.nodes.new("ShaderNodeMath")
    rnd.operation = "ROUND"
    nt.links.new(tex.outputs["Alpha"], rnd.inputs[0])
    nt.links.new(rnd.outputs[0], bsdf.inputs["Alpha"])
    C.material("rubber", C.srgb("#101011"), 0.7, vcol=True)
    if hi:
        ca, co, cn = cowl_tex(512)
        C.material("cowl_plastic", (1, 1, 1), albedo=C.image("cowl_alb", ca), orm=C.image("cowl_orm", co, False),
                   normal=C.image("cowl_n", cn, False), vcol=True)
    else:
        ca, co, cn = cowl_tex(256)
        C.material("cowl_plastic", (1, 1, 1), albedo=C.image("cowl_alb", ca), rough=0.6, vcol=True)
    C.material("wiper_black", C.srgb("#0f1011"), 0.42, 0.35, vcol=True)
    C.material("plastic_black", C.srgb("#151617"), 0.5, vcol=True)
    C.material("chrome", C.srgb("#dfe1e4"), 0.05, 1.0, vcol=True)
    C.material("sensor_lens", C.srgb("#05070a"), 0.05, 0.3, coat=1.0, coat_rough=0.02)


# ── glass ────────────────────────────────────────────────────────────────────
def glass_objs(q):
    hi = q == "hi"
    na, nb = (56, 36) if hi else (24, 16)
    As = np.linspace(-1, 1, na + 1)
    Bs = np.linspace(-1, 1, nb + 1)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()

    def sheet(off, flip, mat):
        g = []
        for a in As:
            col = []
            for b in Bs:
                p, _, _ = surf(a, b)
                n = normal_at(a, b)
                col.append(bm.verts.new(p + n * off))
            g.append(col)
        for i in range(na):
            for j in range(nb):
                vs = (g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1])
                f = bm.faces.new(vs[::-1] if flip else vs)
                f.material_index = mat
                for lp in f.loops:
                    ii = [g[k][jj] for k in (i, i + 1) for jj in (j, j + 1)]
                for lp, (ai, bj) in zip(f.loops, ([(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)][::-1] if flip else
                                                  [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)])):
                    lp[uvl].uv = ((As[ai] + 1) / 2, (Bs[bj] + 1) / 2)
        return g

    outer = sheet(0.0, False, 0)
    inner = sheet(-THK, True, 0) if hi else None
    # border ring (square boundary walk)
    ring_idx = [(i, 0) for i in range(na)] + [(na, j) for j in range(nb)] + [(i, nb) for i in range(na, 0, -1)] + [(0, j) for j in range(nb, 0, -1)]
    if inner:
        for k in range(len(ring_idx)):
            i0, j0 = ring_idx[k]
            i1, j1 = ring_idx[(k + 1) % len(ring_idx)]
            f = bm.faces.new((outer[i1][j1], outer[i0][j0], inner[i0][j0], inner[i1][j1]))
            f.material_index = 1
    glass = C.obj("glass", bm, ["glass", "glass_edge"], smooth=True, sharp=60, recalc=False)
    # frit: a copy of the outer surface inside the laminate
    fb = bmesh.new()
    fuv = fb.loops.layers.uv.verify()
    g = [[fb.verts.new(surf(a, b)[0] + normal_at(a, b) * (-THK * 0.5)) for b in Bs] for a in As]
    for i in range(na):
        for j in range(nb):
            f = fb.faces.new((g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]))
            for lp, (ai, bj) in zip(f.loops, [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]):
                lp[fuv].uv = ((As[ai] + 1) / 2, (Bs[bj] + 1) / 2)
    frit = C.obj("frit", fb, ["frit"], smooth=True, sharp=60, recalc=False)
    # drop frit faces that are fully transparent (the clear vision area) to save overdraw
    img = C.MATS["frit"].node_tree.nodes["Image Texture"].image if "Image Texture" in C.MATS["frit"].node_tree.nodes else None
    if img is not None:
        W, H = img.size
        px = np.array(img.pixels[:], np.float32).reshape(H, W, 4)[..., 3]
        me = frit.data
        uvd = me.uv_layers.active.data
        kill = []
        for p in me.polygons:
            us = [uvd[li].uv for li in p.loop_indices]
            u0, u1 = min(x.x for x in us), max(x.x for x in us)
            v0, v1 = min(x.y for x in us), max(x.y for x in us)
            sub = px[int(v0 * (H - 1)):int(math.ceil(v1 * (H - 1))) + 1, int(u0 * (W - 1)):int(math.ceil(u1 * (W - 1))) + 1]
            if sub.size and sub.max() < 0.5:
                kill.append(p.index)
        bm2 = bmesh.new()
        bm2.from_mesh(me)
        bm2.faces.ensure_lookup_table()
        bmesh.ops.delete(bm2, geom=[bm2.faces[i] for i in kill], context="FACES")
        bm2.to_mesh(me)
        bm2.free()
    # rubber moulding along the outer border (slightly outside the edge)
    path = []
    for (i, j) in ring_idx[::2 if hi else 1] + [ring_idx[0]]:
        a, b = As[i], Bs[j]
        p, _, _ = surf(a, b)
        n = normal_at(a, b)
        c, _, _ = surf(a * 0.98, b * 0.98)
        outw = (p - c)
        outw = (outw - n * outw.dot(n)).normalized()
        path.append(p + outw * 0.004 - n * THK * 0.4)
    mb = C.tube(path, 0.0055, 8 if hi else 5, caps=False)
    moulding = C.obj("moulding", mb, ["rubber"], sharp=60)
    return glass, frit, moulding


def cowl_obj(q):
    """plastic cowl panel under the glass: from the glass foot forward and down to the hood line"""
    hi = q == "hi"
    na = 40 if hi else 14
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    rows_ = []
    for k, (fw, dz) in enumerate(((0.0, 0.0), (0.05, -0.01), (0.11, -0.022), (0.16, -0.036), (0.175, -0.055))):
        row = []
        for a in np.linspace(-1, 1, na + 1):
            p, s, t = surf(a, -1)
            n = normal_at(a, -1)
            q_ = p - n * 0.008 + Vector((fw, 0, dz)) + E_UP * (-0.004)
            row.append(bm.verts.new(q_))
        rows_.append(row)
    for k in range(len(rows_) - 1):
        for i in range(na):
            f = bm.faces.new((rows_[k][i], rows_[k][i + 1], rows_[k + 1][i + 1], rows_[k + 1][i]))
            for lp, (ii, kk) in zip(f.loops, ((i, k), (i + 1, k), (i + 1, k + 1), (i, k + 1))):
                lp[uvl].uv = (ii / na, kk / (len(rows_) - 1))
    cowl = C.obj("cowl", bm, ["cowl_plastic"], sharp=50)
    C.solidify(cowl, 0.004)
    return cowl


def mirror_obj(q):
    """camera / rain-sensor housing on the inner face at the top centre + interior mirror"""
    hi = q == "hi"
    a, b = 0.0, 0.62
    p, _, _ = surf(a, b)
    n = normal_at(a, b)
    base = p - n * (THK + 0.001)
    parts = []
    hb = C.box((0.19, 0.13, 0.05), bevel=0.012 if hi else 0.0, segs=2)
    # orient: local x across (world y), local y up the glass, local z inward (-n)
    up = (E_UP - n * E_UP.dot(n)).normalized()
    Mx = Matrix(((0, up.x, -n.x), (1, up.y, -n.y), (0, up.z, -n.z))).to_4x4()
    C.xform(hb, mat=Mx)
    C.xform(hb, loc=base - n * 0.025)
    housing = C.obj("mirror_housing", hb, ["plastic_black"], sharp=40)
    lb = C.cyl(0.012, 0.01, 16, loc=(0, 0, 0))
    C.xform(lb, mat=Mx)
    C.xform(lb, loc=base - n * 0.051 + up * 0.03)
    lens = C.obj("sensor_lens", lb, ["sensor_lens"], sharp=40)
    # stem + mirror body hanging toward the cabin (-X, down)
    stem_top = base - n * 0.04 - up * 0.04
    stem_bot = stem_top + Vector((-0.05, 0, -0.07))
    sb = C.tube([stem_top, stem_bot], 0.009, 8 if hi else 5)
    stem = C.obj("mirror_stem", sb, ["plastic_black"])
    mb = C.box((0.035, 0.26, 0.07), bevel=0.02 if hi else 0.0, segs=3 if hi else 1)
    C.xform(mb, loc=stem_bot + Vector((-0.02, 0, -0.03)))
    body = C.obj("mirror_body", mb, ["plastic_black"], sharp=40)
    gb = C.box((0.002, 0.24, 0.055), bevel=0.012 if hi else 0.0, segs=2)
    C.xform(gb, loc=stem_bot + Vector((-0.038, 0, -0.03)))
    mglass = C.obj("mirror_glass", gb, ["chrome"], sharp=40)
    return C.join([housing, lens, stem, body, mglass], "mirror")


def wiper(q, name, pivot_a, arm_len, blade_len):
    """wiper at square param a (bottom edge): mount (aligned, static) > sweep node > arm, blade.
    Built parked, pointing toward +Y (car left)."""
    hi = q == "hi"
    p, _, _ = surf(pivot_a, -1)
    n = normal_at(pivot_a, -1)
    piv = p + Vector((0.07, 0, -0.03)) + n * 0.01  # on the cowl, a little ahead of the glass foot
    X = Vector((0, 1, 0))
    X = (X - n * X.dot(n)).normalized()
    Zl = n
    Yl = Zl.cross(X)
    M = Matrix((X, Yl, Zl)).transposed().to_4x4()
    M.translation = piv
    mount = C.empty(name + "_mount")
    mount.matrix_world = M
    sweep = C.empty(name, mount)
    # arm in local coords: x along the arm, z up off the glass
    ab = bmesh.new()
    C.cyl(0.024, 0.03, 20 if hi else 8, loc=(0, 0, 0.012), bm=ab)  # pivot cap
    C.box((0.14, 0.03, 0.022), loc=(0.07, 0, 0.018), bevel=0.006 if hi else 0.0, segs=2, bm=ab)  # spring housing
    path = [Vector((0.13, 0, 0.018)), Vector((arm_len * 0.5, 0, 0.022)), Vector((arm_len, 0, 0.014))]
    C.tube(C.bezier_path(path, 6 if hi else 2), 0.0075, 6, bm=ab)
    arm = C.obj(name + "_arm", ab, ["wiper_black"], sharp=40)
    arm.parent = sweep
    # blade: rubber lip + spoiler, bowed to lie on the glass around the parked line
    bb = bmesh.new()
    nseg = 24 if hi else 8
    prof = [(-0.009, 0.0), (0.009, 0.0), (0.004, 0.012), (-0.002, 0.013)]  # (across, up) spoiler section
    rings = []
    for k in range(nseg + 1):
        t = k / nseg
        x = arm_len - blade_len / 2 + blade_len * t
        # sample the glass under this point to follow its curvature
        wpt = M @ Vector((x, 0, 0))
        # find the glass height along the local z by projecting: approximate using the bottom-row surface
        ybl = wpt.y
        a_ = max(-1, min(1, ybl / WB))
        gp, _, _ = surf(a_, -0.86)
        gl = M.inverted() @ gp
        z = gl.z + 0.004
        rings.append([bb.verts.new((x, 0.012 + u, z + h)) for u, h in prof])
    for k in range(nseg):
        for i in range(len(prof)):
            j = (i + 1) % len(prof)
            bb.faces.new((rings[k][i], rings[k][j], rings[k + 1][j], rings[k + 1][i]))
    bb.faces.new(rings[0][::-1])
    bb.faces.new(rings[-1])
    # connector clip under the arm tip
    C.box((0.05, 0.02, 0.018), loc=(arm_len, 0.008, 0.01), bevel=0.004 if hi else 0.0, segs=1, bm=bb)
    blade = C.obj(name + "_blade", bb, ["wiper_black"], sharp=40)
    blade.parent = sweep
    return mount, sweep, [arm, blade]


def build(q):
    hi = q == "hi"
    mats(q)
    root = C.empty("windshield")
    glass, frit, moulding = glass_objs(q)
    cowl = cowl_obj(q)
    mirror = mirror_obj(q)
    for o in (glass, frit, moulding, cowl, mirror):
        o.parent = root
    wl_m, wl, wl_p = wiper(q, "wiper_L", -0.02, 0.45, 0.60)
    wr_m, wr, wr_p = wiper(q, "wiper_R", -0.86, 0.40, 0.46)
    for m in (wl_m, wr_m):
        mw = m.matrix_world.copy()
        m.parent = root
        m.matrix_world = mw
    # exploded view (three space): glass normal (sin a, cos a, 0)
    nx, ny = math.sin(ALPHA), math.cos(ALPHA)
    glass["explode"] = [nx * 0.30, ny * 0.30, 0.0]
    frit["explode"] = [nx * 0.30, ny * 0.30, 0.0]
    moulding["explode"] = [nx * 0.14, ny * 0.14, 0.0]
    mirror["explode"] = [-0.35, -0.05, 0.0]
    cowl["explode"] = [0.10, -0.25, 0.0]
    wl_m["explode"] = [0.12, 0.45, 0.0]
    wr_m["explode"] = [0.12, 0.40, 0.0]
    parts = [moulding, cowl, mirror] + wl_p + wr_p
    C.bake_ao_vcol(parts, samples=32 if hi else 12, max_dist=0.05, floor=0.4)
    return root


if __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    C.reset()
    root = build(q)
    if a.get("sweep"):
        for nm in ("wiper_L", "wiper_R"):
            bpy.data.objects[nm].rotation_euler = (0, 0, float(a["sweep"]))
    if a.get("look"):
        H = os.path.join(C.HERE, "..", "public/lib3d/env/")
        views = {"front": ((2.4, -1.2, 1.2), (0, 0, 0), 36), "close": ((0.9, 0.35, 0.55), (0, 0.1, 0.1), 40),
                 "in": ((-1.2, 0.3, 0.2), (0, 0, 0.15), 50)}
        for k in a.get("views", "front,close").split(","):
            cam, tgt, fov = views[k]
            C.look(f"/tmp/l3d/ws_{k}.png", target=tgt, cam=cam, fov=fov, hdr=H + a.get("env", "dusk") + "-1k-v1.hdr",
                   ground=False, spp=int(a.get("spp", "48")), res=(1200, 800))
    if a.get("out") or not a.get("look"):
        C.finish("windshield", q, root, a.get("out"))
