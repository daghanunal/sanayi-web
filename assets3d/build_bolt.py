"""Fastener set for close-ups: M10 x 1.5 cylinder-head bolt (12-point flange head, waisted shank), double-end
stud, ISO hex nut and hardened washers. Every thread is a real ISO metric helix (60 deg flanks, crest flat, rounded
root, chamfered start, run-out into the shank), right-handed, so a nut can be screwed along the stud.

  Blender -b --factory-startup --python assets3d/build_bolt.py -- --q hi [--out x.glb] [--look /tmp/b.png]

three.js space: every part stands upright along +Y, sitting on y = 0; parts in a row along X.
Nodes: bolt > head_bolt (origin: bearing face under the flange, on the axis), head_bolt_washer,
             stud (origin: bottom tip), washer, nut (origin: nut centre on the axis; seated on the washer)
Screw contract (right-hand thread, pitch P = 1.5 mm): the nut stays meshed with the stud when
    nut.rotation.y = phi,  nut.position.y = NUT_SEAT_Y + P * phi / (2 pi)     (phi > 0 unscrews, CCW from above)
the same holds for head_bolt along its own axis (phi > 0 backs it out of a threaded hole).
extras.explode: nut up off the stud, washer up, head bolt up out of its washer.
The mesh helpers (thread(), head_bolt_bm(), bolt_mats()) are reused by build_engine.py for the head-bolt nodes.
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

P = 0.0015  # pitch
D = 0.010  # nominal (major) diameter
R = D / 2
H_FLANK = 0.5413 * P  # flank depth (crest flat -> root flat)
R_ROOT = R - 0.6134 * P  # rounded root bottom (d3 / 2)
R_MINOR_NUT = R - H_FLANK  # nut crest (D1 / 2)
HEAD_Z = 0.110  # head bolt: bearing face height (length under head)
UV_H = 0.14  # UV v normalisation (tallest part)


def ext_profile(n):
    """(u, dr) samples of one pitch of the external ISO profile, u in [0, 1): crest centre at u = 0"""
    fl = 0.3125  # flank run along the axis, in pitches
    c = 1 / 16  # half crest flat
    pts = [(0.0, 0.0), (c, 0.0)]
    nf = max(1, n // 4)
    for k in range(1, nf + 1):  # rising flank (crest -> root), straight
        pts.append((c + fl * k / nf, -H_FLANK * k / nf))
    nr = max(2, n // 3)
    for k in range(1, nr):  # rounded root
        t = k / nr
        pts.append((c + fl + 0.25 * t, -H_FLANK - (R - H_FLANK - R_ROOT) * math.sin(math.pi * t)))
    pts.append((c + fl + 0.25, -H_FLANK))
    for k in range(1, nf + 1):  # falling flank
        pts.append((c + fl + 0.25 + fl * k / nf, -H_FLANK + H_FLANK * k / nf))
    return [p for p in pts if p[0] < 1 - 1e-6]


def thread(r_of, z0, z1, segs, prof, internal=False, phase=0.0, mat=0, bm=None, uv_h=UV_H):
    """helical thread surface between z0 and z1 (Blender z = axis). prof = [(u, dr)] one pitch; the surface point
    at angle th and profile sample s lies at z = P * (th / 2pi + t + u_s) + phase, radius r_of(z, R + dr_s).
    r_of must map every radius to one value at z0 and at z1 (end rings then weld into clean polygons).
    Right-handed (z grows with the CCW angle). internal=True flips the faces (nut threads)."""
    b = bmesh.new()
    uvl = b.loops.layers.uv.verify()
    S = len(prof)
    t0 = math.floor((z0 - phase) / P) - 2
    t1 = math.ceil((z1 - phase) / P) + 1
    K = (t1 - t0) * S
    grid = {}
    zs = {}
    for k in range(K):
        t, s = divmod(k, S)
        u, dr = prof[s]
        for i in range(segs):
            th = 2 * math.pi * i / segs
            z = P * (i / segs + t0 + t + u) + phase
            zc = min(max(z, z0), z1)
            r = r_of(zc, R + dr)
            grid[i, k] = b.verts.new((r * math.cos(th), r * math.sin(th), zc))
            zs[i, k] = zc

    def nb(i, k):
        return (i + 1, k) if i + 1 < segs else (0, k + S)

    for k in range(K - 1):
        for i in range(segs):
            a = (i, k)
            bb = nb(i, k)
            c = (bb[0], bb[1] + 1)
            d = (i, k + 1)
            if c[1] >= K or bb[1] >= K:
                continue
            vs = [grid[a], grid[bb], grid[c], grid[d]]
            if internal:
                vs = vs[::-1]
            try:
                f = b.faces.new(vs)
            except ValueError:
                continue
            f.material_index = mat
            iu = [i / segs, (i + 1) / segs, (i + 1) / segs, i / segs]
            if internal:
                iu = iu[::-1]
            for lp, uu in zip(f.loops, iu):
                lp[uvl].uv = (uu / C.SQUEEZE, lp.vert.co.z / uv_h)
    bmesh.ops.remove_doubles(b, verts=b.verts, dist=1e-8)
    bmesh.ops.dissolve_degenerate(b, edges=b.edges, dist=1e-8)
    # the clamped rows beyond z0 / z1 collapse onto the end rings: drop what is left of them
    kill = [f for f in b.faces if f.calc_area() < 1e-13]
    bmesh.ops.delete(b, geom=kill, context="FACES")
    loose = [v for v in b.verts if not v.link_faces]
    bmesh.ops.delete(b, geom=loose, context="VERTS")
    if bm is None:
        return b
    C.merge(bm, b)
    return bm


def blend_end(z, r, z_end, length, r_end, top):
    """smoothly pull the radius to r_end over `length` next to z_end (top: the end is above)"""
    d = (z_end - z) if top else (z - z_end)
    if d >= length:
        return r
    w = 1 - max(d, 0) / length
    w = w * w * (3 - 2 * w)
    return r * (1 - w) + r_end * w


def ring_lathe(prof, segs, mat=0, bm=None):
    """lathe around Blender Z with the same angular stations as thread() (ring vertices line up)"""
    b = C.lathe(prof, segs, axis="Z")
    uvl = b.loops.layers.uv.verify()
    for f in b.faces:
        f.material_index = mat
        for lp in f.loops:
            lp[uvl].uv = (lp[uvl].uv.x / C.SQUEEZE, lp.vert.co.z / UV_H)
    C.fix_uv_wrap(b, 1.0)
    if bm is None:
        return b
    C.merge(bm, b)
    return bm


# ── materials ────────────────────────────────────────────────────────────────
def bolt_mats(q):
    """one shared turning-mark normal map + small roughness maps (the colour comes from the factor x baked AO)"""
    hi = q == "hi"
    n = 512 if hi else 128
    sv = UV_H / 0.012  # a turn-mark tile covers 12 mm of axis
    ta, to, tn = T.brushed(n, seed=71, lum=1.0, rough=0.34)  # lines along u = circumferential turning marks
    nimg = C.image("bolt_turn_n", tn, False)
    m = max(64, n // 2)
    f = T.fbm(m, m, base=24, octaves=3, seed=72)
    lines = T.brushed(m, seed=74, lum=1.0, rough=0.3)[1][..., 1]
    ph_orm = C.image("bolt_ph_orm", T.orm(1, np.clip(0.30 + 0.10 * (f - 0.5) + 0.35 * (lines - 0.3), 0, 1), 0.9), False)
    zn_orm = C.image("bolt_zn_orm", T.orm(1, np.clip(0.26 + 0.08 * (f - 0.5) + 0.35 * (lines - 0.3), 0, 1), 1.0), False)
    C.material("bolt_phosphate", C.srgb("#4a4c50"), orm=ph_orm, normal=nimg, normal_strength=0.35, vcol=True,
               uv_scale=(C.SQUEEZE, sv))
    C.material("bolt_zinc", C.srgb("#b4b9bf"), orm=zn_orm, normal=nimg, normal_strength=0.3, vcol=True,
               uv_scale=(C.SQUEEZE, sv))
    ga, go, gn = T.brushed(m, seed=73, lum=0.70, rough=0.22)
    C.material("bolt_ground", C.srgb("#a9adb2"), orm=C.image("bolt_gr_orm", go, False),
               normal=C.image("bolt_gr_n", gn, False), normal_strength=0.4, vcol=True, uv_scale=(2.0, 2.0))


# ── parts ────────────────────────────────────────────────────────────────────
def twelve_point(af, n_round=2):
    """bi-hex (12-point) outline: two hexagons across-flats af, 30 deg apart"""
    ro = af / math.sqrt(3)
    rv = (af / 2) / math.cos(math.radians(15))
    pts = []
    for k in range(24):
        a = math.radians(15 * k)
        r = ro if k % 2 == 0 else rv
        pts.append((r * math.cos(a), r * math.sin(a)))
    return pts


def prism_z(poly, z0, z1, mat=0):
    b = bmesh.new()
    r0 = [b.verts.new((x, y, z0)) for x, y in poly]
    r1 = [b.verts.new((x, y, z1)) for x, y in poly]
    n = len(poly)
    for i in range(n):
        j = (i + 1) % n
        b.faces.new((r0[i], r0[j], r1[j], r1[i]))
    b.faces.new(r0[::-1])
    b.faces.new(r1)
    for f in b.faces:
        f.material_index = mat
    return b


def head_bolt_bm(q, segs=None, samples=None, name="head_bolt", mat="bolt_phosphate", L=None, plain=False):
    """M10 x 1.5 head bolt (length under head L, default 110 mm), tip at z = 0, bearing face at z = L.
    Returns an object (not parented). plain=True: no thread helix (a turned cylinder, for far LODs)."""
    hi = q == "hi"
    HEAD_Z = L or globals()["HEAD_Z"]
    segs = segs or (72 if hi else 28)
    prof = ext_profile(samples or (10 if hi else 5))
    zt = 0.040  # thread length
    r_tip = R_ROOT - 0.0003
    r_of = lambda z, r: blend_end(blend_end(z, r, 0.0, 0.0012, r_tip, False), r, zt, 2.2 * P, R, True) \
        if z < 0.002 else blend_end(z, r, zt, 2.2 * P, R, True)
    if plain:
        bm = ring_lathe([(0.0, 0.0), (r_tip, 0.0), (R - 0.0004, 0.001), (R - 0.0004, zt), (R, zt)], segs)
    else:
        bm = thread(r_of, 0.0, zt, segs, prof, mat=0)
        ring_lathe([(0.0, 0.0), (r_tip, 0.0)], segs, bm=bm)  # tip face (r increasing: faces down)
    # waisted shank + under-head fillet
    rs = 0.00375
    sp = [(R, zt), (R - 0.0002, zt + 0.0015), (rs, zt + 0.006), (rs, HEAD_Z - 0.004), (rs + 0.0006, HEAD_Z - 0.0012),
          (rs + 0.0016, HEAD_Z - 0.0002), (rs + 0.0024, HEAD_Z)]
    ring_lathe(sp, segs, bm=bm)
    # flange (washer face) with a dished underside edge
    fl = [(rs + 0.0024, HEAD_Z), (0.0102, HEAD_Z), (0.0105, HEAD_Z + 0.0004), (0.0105, HEAD_Z + 0.0022),
          (0.0098, HEAD_Z + 0.0027), (0.0072, HEAD_Z + 0.0030)]
    ring_lathe(fl, segs, bm=bm)
    o = C.obj(name, bm, [mat], sharp=34, recalc=False)  # winding is exact by construction (flat caps confuse recalc)
    # 12-point head: prism with rounded points, 30 deg top chamfer (intersect with a cone)
    zh0, zh1 = HEAD_Z + 0.0028, HEAD_Z + 0.0118
    hb = prism_z(twelve_point(0.0122), zh0, zh1)
    ho = C.obj("_h12", hb, [mat], smooth=False)
    if hi:
        C.bevel_mod(ho, width=0.00025, segs=2, angle=60)
    cone = C.lathe([(0.0, zh0 - 0.001), (0.0085, zh0 - 0.001), (0.0085, zh1 - 0.0012), (0.0060, zh1 + 0.0002), (0.0, zh1 + 0.0002)],
                   segs if hi else 24, axis="Z", cap0=True, cap1=True)
    ob_c = C.obj("_cone", cone, [mat], smooth=False)
    C.boolean(ho, ob_c, op="INTERSECT")
    if hi:  # shallow centre recess on the top face (forging mark)
        rc = C.obj("_rc", C.cyl(0.0022, 0.0012, 24, loc=(0, 0, zh1 + 0.0001)), [mat], smooth=False)
        C.boolean(ho, rc)
    C.smooth_by_angle(ho, 30)
    o = C.join([o, ho], name)
    C.smooth_by_angle(o, 34)
    return o


def washer_bm(q, ri, ro, t, z0, name, mat="bolt_ground"):
    segs = 72 if q == "hi" else 28
    c = 0.0003
    prof = [(ri + c, z0), (ro - c, z0), (ro, z0 + c), (ro, z0 + t - c), (ro - c, z0 + t), (ri + c, z0 + t), (ri, z0 + t - c),
            (ri, z0 + c), (ri + c, z0)]
    b = C.lathe(prof, segs, axis="Z")
    o = C.obj(name, b, [mat], sharp=40)
    # ground faces: planar UVs (grinding lines straight across the part)
    me = o.data
    uvl = me.uv_layers.active.data
    for p in me.polygons:
        for li in p.loop_indices:
            v = me.vertices[me.loops[li].vertex_index].co
            if abs(p.normal.z) > 0.7:
                uvl[li].uv = (0.5 + v.x / (4 * ro), 0.5 + v.y / (4 * ro))
            else:
                uvl[li].uv = (0.5 + math.atan2(v.y, v.x) / (2 * math.pi) * 0.5, 0.5 + (v.z - z0) / (4 * ro))
    return o


def stud_obj(q, name="stud", mat="bolt_zinc"):
    """double-end M10 stud: 22 mm block end, 25 mm plain (pitch dia.), 26 mm nut end; tip at z = 0"""
    hi = q == "hi"
    segs = 72 if hi else 28
    prof = ext_profile(10 if hi else 5)
    r_sh = R - 0.325 * P * 1.0  # plain shank ~ pitch diameter (rolled stud)
    r_tip = R_ROOT - 0.0003
    za0, za1 = 0.0, 0.022
    zb0, zb1 = 0.047, 0.073
    ra = lambda z, r: blend_end(blend_end(z, r, za0, 0.0012, r_tip, False), r, za1, 1.8 * P, r_sh, True)
    rb = lambda z, r: blend_end(blend_end(z, r, zb0, 1.8 * P, r_sh, False), r, zb1, 0.0012, r_tip, True)
    bm = thread(ra, za0, za1, segs, prof)
    thread(rb, zb0, zb1, segs, prof, bm=bm)
    ring_lathe([(0.0, za0), (r_tip, za0)], segs, bm=bm)
    ring_lathe([(r_sh, za1), (r_sh, zb0)], segs, bm=bm)
    ring_lathe([(r_tip, zb1), (0.0, zb1)], segs, bm=bm)
    return C.obj(name, bm, [mat], sharp=34, recalc=False)


def nut_obj(q, z0, name="nut", mat="bolt_zinc"):
    """ISO 4032 M10 hex nut (16 AF, 8.4 mm), double-chamfered corners, countersunk, internal thread in phase
    with stud_obj()'s threads (built in place at z0 .. z0 + 8.4 mm)."""
    hi = q == "hi"
    segs = 72 if hi else 28
    af, m = 0.016, 0.0084
    z1 = z0 + m
    ro = af / math.sqrt(3)
    hexp = [(ro * math.cos(math.radians(60 * k + 30)), ro * math.sin(math.radians(60 * k + 30))) for k in range(6)]
    body = C.obj(name, prism_z(hexp, z0, z1), [mat], smooth=False)
    ch = 0.0012
    rc = af / 2 * 0.98
    cone = C.lathe([(0.0, z0 - 0.001), (rc - 0.0012, z0 - 0.001), (rc - 0.0012 + 0.0003, z0), (ro + 0.001, z0 + ch + 0.002),
                    (ro + 0.001, z1 - ch - 0.002), (rc - 0.0012 + 0.0003, z1), (rc - 0.0012, z1 + 0.001), (0.0, z1 + 0.001)],
                   64 if hi else 24, axis="Z", cap0=True, cap1=True)
    C.boolean(body, C.obj("_cn", cone, [mat], smooth=False), op="INTERSECT")
    r_cs = R + 0.0006
    cut = ring_lathe([(0.0, z0 - 0.001), (r_cs + 0.001, z0 - 0.001), (r_cs, z0), (r_cs, z1), (r_cs + 0.001, z1 + 0.001), (0.0, z1 + 0.001)], segs)
    for f in cut.faces:
        pass
    co = C.obj("_bore", cut, [mat], smooth=False)
    C.boolean(body, co)
    C.cleanup(body)
    C.smooth_by_angle(body, 30)
    # internal thread: stud profile + clearance, crest truncated at D1 / 2, 90 deg countersinks at both faces
    clr = 0.00008
    prof = [(u, max(dr + clr, (R_MINOR_NUT - R) + clr)) for u, dr in ext_profile(10 if hi else 5)]

    def r_of(z, r):
        cs = max(r_cs - (z - z0), r_cs - (z1 - z))  # 45 deg countersink cones from both faces
        return max(r, cs)

    tb = thread(r_of, z0, z1, segs, prof, internal=True)
    th = C.obj("_nt", tb, [mat], sharp=34, recalc=False)
    o = C.join([body, th], name)
    C.smooth_by_angle(o, 34)
    return o


def set_origin(o, p):
    p = Vector(p)
    o.data.transform(Matrix.Translation(-p))
    o.location = p
    return o


def build(q):
    bolt_mats(q)
    root = C.empty("bolt")
    hb = head_bolt_bm(q)
    hw = washer_bm(q, 0.0053, 0.0105, 0.0025, HEAD_Z - 0.0025, "head_bolt_washer")
    st = stud_obj(q)
    NUT_Z = 0.050  # nut bottom face (sits on the washer)
    ws = washer_bm(q, 0.0053, 0.0100, 0.002, NUT_Z - 0.002, "washer")
    nt = nut_obj(q, NUT_Z)
    for o in (hb, hw):
        o.location.x -= 0.0
    # row along X: head bolt, then the stud with washer + nut
    SX = 0.030
    for o in (st, ws, nt):
        o.data.transform(Matrix.Translation((SX, 0, 0)))
    parts = [hb, hw, st, ws, nt]
    bpy.context.view_layer.update()
    C.bake_ao_vcol(parts, samples=64 if q == "hi" else 24, max_dist=0.0025, floor=0.35)
    for o in parts:
        C.vcol_to_points(o)
    set_origin(hb, (0, 0, HEAD_Z))
    set_origin(hw, (0, 0, HEAD_Z - 0.0025))
    set_origin(st, (SX, 0, 0))
    set_origin(ws, (SX, 0, NUT_Z - 0.002))
    set_origin(nt, (SX, 0, NUT_Z + 0.0042))
    for o in parts:
        o.parent = root
    C.set_explode(hb, (0, 0.03, 0))
    C.set_explode(nt, (0, 0.045, 0))
    C.set_explode(ws, (0, 0.028, 0))
    nt["thread_pitch"] = P
    hb["thread_pitch"] = P
    st["thread_pitch"] = P
    return root


if __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    C.reset()
    root = build(q)
    if a.get("look"):
        H = os.path.join(C.HERE, "..", "public/lib3d/env/")
        C.look(a["look"], target=(0.015, 0, 0.062), cam=(0.13, -0.24, 0.13), fov=30, hdr=H + a.get("env", "studio") + "-1k-v1.hdr",
               ground=True, spp=int(a.get("spp", "64")), res=(1200, 900))
    if a.get("look2"):  # thread macro
        H = os.path.join(C.HERE, "..", "public/lib3d/env/")
        C.look(a["look2"], target=(0.030, 0, 0.060), cam=(0.062, -0.052, 0.074), fov=26, hdr=H + a.get("env", "studio") + "-1k-v1.hdr",
               ground=True, spp=int(a.get("spp", "64")), res=(1200, 900))
    C.finish("bolt", q, root, a.get("out"), pivots=True)
