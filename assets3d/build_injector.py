"""Common-rail solenoid diesel injector (Bosch-style CRI layout, unbranded), ~0.165 m long, body 19 mm,
built cutaway-ready: the nozzle, nozzle nut, body, valve piece, magnet core, coil and magnet nut are split into
*_front / *_back halves by the plane through the axis, so a site can hide the *_front nodes and show the
internals (needle, nozzle spring, valve piston, control chamber, ball valve, armature, solenoid, HP passages).

  Blender -b --factory-startup --python assets3d/build_injector.py -- --q hi --out /tmp/injector-hi.glb

three.js space: injector axis vertical, nozzle down. Origin at the nozzle tip (y = 0), axis at x = z = 0.
The HP inlet points to +X (tilted 20 deg up), the electrical plug to -X; the cut plane is x-y, *_front = the +Z half.
Lift contract (real values; exaggerate x5..x20 for a readable animation):
  armature.position.y += 0.00005 (50 um; valve_ball is its child), then
  needle.position.y and valve_piston.position.y += 0.00025 (0.25 mm needle lift) while the injector sprays.
extras.explode on every part (metres, three space).
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bmesh
import bpy
from mathutils import Matrix, Vector

import common as C
import texgen as T

Q = "hi"
IN_Z = 0.103  # HP inlet axis meets the body axis here
IN_TILT = math.radians(20)
PX = 0.0056  # HP passage offset along X (in the cut plane)


def HI():
    return Q == "hi"


def seg(a, b):
    return a if HI() else b


def mats():
    ba, bo, bn = T.brushed(256, seed=71, lum=1.0, rough=0.3)
    C.material("steel_body", C.srgb("#9da1a6"), 0.32, 1.0, normal=(C.image("i_body_n", bn, False) if HI() else None),
               normal_strength=0.2, vcol=True, uv_scale=(1, 24))
    C.material("steel_bright", C.srgb("#c8ccd0"), 0.27, 1.0, vcol=True)
    C.material("steel_dark", C.srgb("#2a2c2f"), 0.36, 0.85, vcol=True)
    C.material("steel_nut", C.srgb("#72767b"), 0.38, 1.0, vcol=True)
    C.material("rubber", C.srgb("#101011"), 0.6, 0.0, vcol=True)
    C.material("cut_face", C.srgb("#d4d7da"), 0.42, 0.55, vcol=True)  # milled section: satin, reads bright
    C.material("copper", C.srgb("#c0703f"), 0.3, 1.0, vcol=True)
    C.material("coil_copper", C.srgb("#a4552a"), 0.36, 1.0, vcol=True)
    C.material("plastic_black", C.srgb("#141416"), 0.45, 0.0, vcol=True)
    C.material("plastic_grey", C.srgb("#3c3f43"), 0.5, 0.0, vcol=True)
    C.material("fuel", C.srgb("#2f7fd6"), 0.25, 0.0, emission=(C.srgb("#2f7fd6"), 0.35), vcol=False)
    C.material("hole", C.srgb("#050506"), 0.6, 0.0)


def uvz(ob):
    """cylindrical UVs about the Z axis (u around, v = height / 0.2) inside [0, 1]"""
    me = ob.data
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
    bm = bmesh.new()
    bm.from_mesh(me)
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        for lp in f.loops:
            p = lp.vert.co
            u = (math.atan2(p.y, p.x) / (2 * math.pi)) % 1.0
            lp[uvl].uv = (u, min(max(p.z / 0.2, 0), 1))
    C.fix_uv_wrap(bm)
    bm.to_mesh(me)
    bm.free()
    return ob


def mk(name, bm, mats_, sharp=35, recalc=True):
    o = C.obj(name, bm, mats_, sharp=sharp, recalc=recalc)
    uvz(o)
    return o


def lathe(prof, segs, bm=None, mat=0, loc=(0, 0, 0)):
    b = C.lathe(prof, segs, axis="Z")
    bmesh.ops.remove_doubles(b, verts=b.verts, dist=1e-8)
    C.xform(b, loc=loc)
    for f in b.faces:
        f.material_index = mat
    if bm is None:
        return b
    C.merge(bm, b)
    return bm


def boolean(ob, cut, op="DIFFERENCE", solver="EXACT"):
    """EXACT boolean with hole tolerance (thin coaxial drillings trip the strict solver)"""
    m = ob.modifiers.new("bool", "BOOLEAN")
    m.operation = op
    m.object = cut
    m.solver = solver
    m.use_hole_tolerant = True
    m.use_self = False
    cut.hide_set(True)
    C.apply_mods(ob)
    me = cut.data
    bpy.data.objects.remove(cut)
    if me.users == 0:
        bpy.data.meshes.remove(me)
    return ob


def cutter(bms):
    o = C.obj("_cut", bms, ["hole"], smooth=False)
    return o


def cyl_between(p0, p1, r, segs=12, bm=None, mat=0, ext=0.0):
    p0, p1 = Vector(p0), Vector(p1)
    d = (p1 - p0)
    L = d.length
    b = C.cyl(r, L + 2 * ext, segs, axis="Z")
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    C.xform(b, rot=q.to_matrix(), loc=(p0 + p1) / 2)
    for f in b.faces:
        f.material_index = mat
    if bm is None:
        return b
    C.merge(bm, b)
    return bm


def inlet_dir():
    return Vector((math.cos(IN_TILT), 0, math.sin(IN_TILT)))


def halves(ob, name):
    """split a closed solid by the plane y = 0 (Blender) into capped halves: y < 0 -> '_front' (three +Z)"""
    out = {}
    if "cut_face" not in [m.name for m in ob.data.materials]:
        ob.data.materials.append(C.MATS["cut_face"])
    ci = [m.name for m in ob.data.materials].index("cut_face")
    for side, keep_neg in (("front", True), ("back", False)):
        o = ob.copy()
        o.data = ob.data.copy()
        bpy.context.scene.collection.objects.link(o)
        bm = bmesh.new()
        bm.from_mesh(o.data)
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        res = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, 0), plane_no=(0, 1, 0), dist=1e-7,
                                     clear_outer=keep_neg, clear_inner=not keep_neg)
        edges = [e for e in res["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
        if edges:
            f = bmesh.ops.triangle_fill(bm, edges=edges, use_beauty=True)
            for g in f["geom"]:
                if isinstance(g, bmesh.types.BMFace):
                    g.material_index = ci
                    g.smooth = False
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(o.data)
        bm.free()
        o.name = f"{name}_{side}"
        o.data.name = o.name
        # flat cut faces: mark their edges sharp
        C.smooth_by_angle(o, 35)
        out[side] = o
    bpy.data.objects.remove(ob)
    return out


# ── parts ────────────────────────────────────────────────────────────────────
def make_nozzle():
    s = seg(64, 24)
    prof = [(0.0, 0.0), (0.0012, 0.0002), (0.0024, 0.0011), (0.0031, 0.0025), (0.0034, 0.004), (0.0035, 0.0165),
            (0.0045, 0.0185), (0.0055, 0.0205), (0.0078, 0.0215), (0.0079, 0.0335), (0.0074, 0.0345), (0.0, 0.0345)]
    o = C.obj("nozzle", lathe(prof, s), ["steel_bright", "hole"], sharp=40)
    cuts = []
    b = bmesh.new()  # needle bore + pressure gallery + sac
    lathe([(0.0, 0.0012), (0.0006, 0.0013), (0.0019, 0.0032), (0.00205, 0.0032), (0.00205, 0.0195), (0.0033, 0.0205),
           (0.0033, 0.0235), (0.0021, 0.0245), (0.0021, 0.036), (0.0, 0.036)], s, bm=b)
    cuts.append(cutter(b))
    b = bmesh.new()  # inclined feed bore from the top face into the gallery
    cyl_between((PX, 0, 0.036), (0.0026, 0, 0.0222), 0.0008, seg(12, 8), bm=b, ext=0.0004)
    cuts.append(cutter(b))
    if HI():
        b = bmesh.new()  # 7 spray holes around the sac
        for k in range(7):
            a = 2 * math.pi * (k + 0.5) / 7
            d = Vector((math.cos(a) * math.cos(0.45), math.sin(a) * math.cos(0.45), -math.sin(0.45)))
            p0 = Vector((0, 0, 0.0018))
            cyl_between(p0, p0 + d * 0.004, 0.00014, 6, bm=b)
        cuts.append(cutter(b))
    for c in cuts:
        boolean(o, c)
    uvz(o)
    return halves(o, "nozzle")


def make_nut():
    s = seg(64, 24)
    ch = 0.0006
    prof = [(0.0037, 0.0178), (0.0062, 0.0178), (0.0085, 0.021), (0.0086, 0.0215), (0.0086, 0.0465), (0.0082, 0.0478),
            (0.0073, 0.0478), (0.0073, 0.0345), (0.0080, 0.0345), (0.0080, 0.0215), (0.0037, 0.0205), (0.0037, 0.0178)]
    o = C.obj("nozzle_nut", lathe(prof, s), ["steel_body"], sharp=40)
    if HI():  # two wrench flats
        cut = bmesh.new()
        for sx in (-1, 1):
            C.merge(cut, C.box((0.004, 0.03, 0.012), loc=(sx * (0.0078 + 0.002), 0, 0.041)))
        boolean(o, cutter(cut))
    uvz(o)
    return halves(o, "nozzle_nut")


def make_body():
    s = seg(72, 28)
    prof = [(0.0, 0.0345), (0.0072, 0.0345), (0.0072, 0.0478), (0.0092, 0.0482), (0.0095, 0.049), (0.0095, 0.071),
            (0.0088, 0.0725), (0.0088, 0.0795), (0.0112, 0.081), (0.0112, 0.0875), (0.0104, 0.089), (0.0104, 0.1165),
            (0.0092, 0.118), (0.0088, 0.118), (0.0088, 0.127), (0.0, 0.127)]
    o = C.obj("body", lathe(prof, s), ["steel_body"], sharp=40)
    # HP inlet boss (M14 thread) pointing +X, tilted up
    d = inlet_dir()
    p0 = Vector((0.006, 0, IN_Z)) + d * 0.0
    b = bmesh.new()
    cyl_between(p0, Vector((0, 0, IN_Z)) + d * 0.0175, 0.0082, seg(32, 16), bm=b)
    tb = bmesh.new()
    prof_t = [(0.0, 0.0)]
    n_th = 7 if HI() else 0
    L0, L1 = 0.0175, 0.0335
    prof_t = [(0.0, L0), (0.0068, L0)]
    for k in range(n_th):
        z0 = L0 + 0.001 + k * 0.0021
        prof_t += [(0.0068, z0), (0.0072, z0 + 0.0008), (0.0072, z0 + 0.0011), (0.0068, z0 + 0.0019)]
    prof_t += [(0.0068, L1 - 0.0008), (0.0062, L1), (0.0, L1)]
    tb = lathe(prof_t, seg(32, 16))
    q = Vector((0, 0, 1)).rotation_difference(d)
    C.xform(tb, rot=q.to_matrix(), loc=(0, 0, IN_Z))
    boss = C.obj("_boss", b, ["steel_body"], smooth=False)
    boolean(o, boss, op="UNION")
    boolean(o, C.obj("_thr", tb, ["steel_body"], smooth=False), op="UNION")
    if HI():  # wrench flats on the upper body (+-Y, clear of the cut plane)
        cut = bmesh.new()
        for sy in (-1, 1):
            C.merge(cut, C.box((0.03, 0.004, 0.0105), loc=(0, sy * (0.0104 - 0.0016 + 0.002), 0.0955)))
        boolean(o, cutter(cut))
    cuts = []
    b = bmesh.new()  # central bores: spring chamber, valve-piston bore, valve-piece / armature pocket
    lathe([(0.0, 0.0335), (0.0046, 0.0335), (0.0046, 0.0525), (0.00215, 0.0535), (0.00215, 0.1105), (0.0047, 0.1105),
           (0.0047, 0.128), (0.0, 0.128)], s, bm=b)
    cuts.append(cutter(b))
    # the HP drillings are not cut: the blue hp_fuel rods sit centred on the cut plane, so a cutaway shows them as
    # channels in the section face (thin coaxial drillings break the boolean solvers)
    b = bmesh.new()  # inlet counterbore for the edge filter
    cyl_between(Vector((0, 0, IN_Z)) + d * 0.02, Vector((0, 0, IN_Z)) + d * 0.034, 0.0024, seg(20, 10), bm=b, ext=0.001)
    cuts.append(cutter(b))
    for c in cuts:
        boolean(o, c)
    uvz(o)
    C.smooth_by_angle(o, 40)
    return halves(o, "body")


def make_fuel():
    """HP fuel volumes in the passages (blue, reads through the cutaway)"""
    b = bmesh.new()
    d = inlet_dir()
    cyl_between(Vector((PX, 0, IN_Z + PX * math.tan(IN_TILT))), Vector((0, 0, IN_Z)) + d * 0.021, 0.00095, 10, bm=b)
    cyl_between((PX, 0, 0.0345), (PX, 0, IN_Z + PX * math.tan(IN_TILT) + 0.0004), 0.00078, 10, bm=b)
    cyl_between((PX, 0, 0.0345), (0.0026, 0, 0.0224), 0.00068, 10, bm=b)
    lathe([(0.00205, 0.0198), (0.0032, 0.0206), (0.0032, 0.0234), (0.00205, 0.0243), (0.00205, 0.0198)], seg(40, 16), bm=b)
    lathe([(0.0, 0.1108), (0.0014, 0.1108), (0.0014, 0.1118), (0.0, 0.1118)], 16, bm=b)  # control chamber
    return mk("hp_fuel", b, ["fuel"], sharp=40)


def make_needle():
    s = seg(32, 14)
    prof = [(0.0, 0.0028), (0.0019, 0.0039), (0.00195, 0.0041), (0.00195, 0.0196), (0.0016, 0.0212), (0.0016, 0.0232),
            (0.00198, 0.0242), (0.00198, 0.0335), (0.0012, 0.0343), (0.0012, 0.0360), (0.0033, 0.0362), (0.0033, 0.0368),
            (0.0, 0.0369)]
    return mk("needle", lathe(prof, s), ["steel_bright"], sharp=40)


def coil_spring(name, r, wire, z0, z1, turns, mat="steel_dark"):
    pts = []
    n = int(turns * seg(20, 10))
    for k in range(n + 1):
        t = k / n
        a = 2 * math.pi * turns * t
        pts.append((r * math.cos(a), r * math.sin(a), z0 + wire + (z1 - z0 - 2 * wire) * t))
    b = C.tube(pts, wire, seg(8, 5))
    return mk(name, b, [mat], sharp=60)


def make_valve_piston():
    prof = [(0.0, 0.0368), (0.0026, 0.0368), (0.0026, 0.0376), (0.00115, 0.0385), (0.00115, 0.052), (0.0021, 0.0528),
            (0.0021, 0.1102), (0.0017, 0.1106), (0.0, 0.1106)]
    return mk("valve_piston", lathe(prof, seg(28, 12)), ["steel_bright"], sharp=40)


def make_valve_piece():
    s = seg(48, 20)
    prof = [(0.0, 0.1106), (0.0046, 0.1106), (0.0046, 0.1146), (0.0024, 0.1146), (0.0024, 0.1152), (0.0, 0.1152)]
    o = C.obj("valve_piece", lathe(prof, s), ["steel_bright"], sharp=40)
    b = bmesh.new()
    lathe([(0.0, 0.1095), (0.00145, 0.1095), (0.00145, 0.1119), (0.00022, 0.1122), (0.00022, 0.116), (0.0, 0.116)], 16, bm=b)
    cyl_between((0.0026, 0, 0.1095), (0.0012, 0, 0.1112), 0.00018, 6, bm=b)  # inlet throttle
    boolean(o, cutter(b))
    uvz(o)
    return halves(o, "valve_piece")


def make_armature():
    b = bmesh.new()
    lathe([(0.0, 0.1160), (0.0044, 0.1160), (0.0044, 0.1172), (0.0012, 0.1176), (0.0012, 0.1262), (0.0, 0.1262)],
          seg(40, 16), bm=b)
    arm = mk("armature", b, ["steel_bright"], sharp=40)
    s = bmesh.new()
    bmesh.ops.create_uvsphere(s, u_segments=seg(16, 8), v_segments=seg(10, 6), radius=0.00066)
    C.xform(s, loc=(0, 0, 0.11535))
    ball = mk("valve_ball", s, ["steel_bright"], sharp=80)
    return arm, ball


def make_solenoid():
    s = seg(56, 20)
    core = C.obj("magnet_core", lathe([(0.0016, 0.1185), (0.0066, 0.1185), (0.0066, 0.1385), (0.0016, 0.1385),
                                       (0.0016, 0.1185)], s), ["steel_dark"], sharp=40)
    b = bmesh.new()
    lathe([(0.0033, 0.1195), (0.0056, 0.1195), (0.0056, 0.136), (0.0033, 0.136), (0.0033, 0.1195)], s, bm=b)
    boolean(core, cutter(b))
    uvz(core)
    coil = C.obj("coil", lathe([(0.0034, 0.1197), (0.0055, 0.1197), (0.0055, 0.1358), (0.0034, 0.1358), (0.0034, 0.1197)], s),
                 ["coil_copper"], sharp=40)
    if HI():  # winding ridges
        rb = bmesh.new()
        for k in range(12):
            z = 0.1203 + k * 0.00128
            C.torus(0.0055, 0.00045, s, 5, loc=(0, 0, z), bm=rb)
        boolean(coil, C.obj("_w", rb, ["coil_copper"]), op="UNION")
    uvz(coil)
    nut = C.obj("magnet_nut", lathe([(0.0068, 0.1175), (0.0106, 0.1175), (0.0108, 0.119), (0.0108, 0.1405), (0.0098, 0.1418),
                                     (0.0068, 0.1418), (0.0068, 0.1175)], s), ["steel_nut"], sharp=40)
    if HI():  # hex-ish knurl flats
        cut = bmesh.new()
        for k in range(6):
            a = 2 * math.pi * k / 6
            bx = C.box((0.004, 0.03, 0.016), loc=(0.0107 + 0.0015, 0, 0.130))
            C.xform(bx, rot=Matrix.Rotation(a, 3, "Z"))
            C.merge(cut, bx)
        boolean(nut, cutter(cut))
    uvz(nut)
    return halves(core, "magnet_core"), halves(coil, "coil"), halves(nut, "magnet_nut")


def make_connector():
    b = bmesh.new()
    lathe([(0.0, 0.1415), (0.0097, 0.1415), (0.0099, 0.143), (0.0099, 0.1545), (0.0092, 0.1575), (0.0, 0.1575)],
          seg(48, 20), bm=b)
    C.merge(b, C.box((0.019, 0.0125, 0.0135), loc=(-0.0135, 0, 0.1505), bevel=0.0012 if HI() else 0, segs=2))
    C.merge(b, C.box((0.003, 0.0085, 0.009), loc=(-0.0232, 0, 0.1505), mat=1))  # socket (dark face)
    C.merge(b, C.box((0.006, 0.0038, 0.002), loc=(-0.018, 0, 0.1582)))  # latch
    o = mk("connector", b, ["plastic_black", "hole"], sharp=40)
    pb = bmesh.new()
    for sy in (-0.002, 0.002):
        C.cyl(0.0005, 0.006, 8, loc=(-0.0215, sy, 0.1505), axis="X", bm=pb)
    pins = mk("_pins", pb, ["steel_bright"])
    return C.join([o, pins], "connector")


def make_return():
    b = bmesh.new()
    d = Vector((0.55, 0, 0.83)).normalized()
    prof = [(0.0, 0.0), (0.0034, 0.0), (0.0034, 0.004), (0.0026, 0.0045), (0.0026, 0.0075), (0.0031, 0.0085),
            (0.0024, 0.0095), (0.0024, 0.012), (0.0, 0.012)]
    t = lathe(prof, seg(24, 12))
    q = Vector((0, 0, 1)).rotation_difference(d)
    C.xform(t, rot=q.to_matrix(), loc=(0.0045, 0, 0.1555))
    C.merge(b, t)
    return mk("return_connector", b, ["plastic_grey"], sharp=40)


def make_edge_filter():
    d = inlet_dir()
    prof = [(0.0, 0.0205), (0.0021, 0.0205)]
    ng = 6 if HI() else 0
    for k in range(ng):
        z = 0.0215 + k * 0.0018
        prof += [(0.0021, z), (0.0016, z + 0.0004), (0.0016, z + 0.0012), (0.0021, z + 0.0016)]
    prof += [(0.0021, 0.0335), (0.0, 0.0335)]
    b = lathe(prof, seg(20, 10))
    q = Vector((0, 0, 1)).rotation_difference(d)
    C.xform(b, rot=q.to_matrix(), loc=(0, 0, IN_Z))
    return mk("edge_filter", b, ["steel_bright"], sharp=40)


def make_oring():
    b = C.torus(0.0092, 0.00095, seg(48, 20), seg(10, 6), loc=(0, 0, 0.0625))
    return mk("o_ring", b, ["rubber"], sharp=80)


def make_washer():
    return mk("copper_washer", lathe([(0.0037, 0.0164), (0.0074, 0.0164), (0.0074, 0.0178), (0.0037, 0.0178),
                                      (0.0037, 0.0164)], seg(48, 20)), ["copper"], sharp=40)


def build(q):
    global Q
    Q = q
    mats()
    root = C.empty("injector")
    nz = make_nozzle()
    nut = make_nut()
    body = make_body()
    vp = make_valve_piece()
    core, coil, mnut = make_solenoid()
    fuel = make_fuel()
    needle = make_needle()
    nspring = coil_spring("nozzle_spring", 0.0033, 0.00055, 0.0368, 0.0525, 7)
    piston = make_valve_piston()
    arm, ball = make_armature()
    aspring = coil_spring("armature_spring", 0.0012 + 0.0009, 0.00035, 0.1262 - 0.004, 0.1385, 9)
    con = make_connector()
    ret = make_return()
    ef = make_edge_filter()
    wash = make_washer()
    oring = make_oring()
    halves_all = [nz, nut, body, vp, core, coil, mnut]
    solids = [o for h in halves_all for o in h.values()] + [needle, piston, arm, ball, con, ret, ef, wash, oring, nspring, aspring]
    bpy.context.view_layer.update()
    C.bake_ao_vcol(solids, samples=48 if HI() else 16, max_dist=0.004, floor=0.35)
    for h in halves_all:  # flat cut faces: no AO smear across their long triangles
        for o in h.values():
            ci = [m.name for m in o.data.materials].index("cut_face")
            ca = o.data.color_attributes.get("Color")
            for p in o.data.polygons:
                if p.material_index == ci:
                    for li in p.loop_indices:
                        ca.data[li].color = (1, 1, 1, 1)
    parts = solids + [fuel]
    for o in parts:
        c = sum((Vector(v) for v in o.bound_box), Vector()) / 8
        p = Vector((0, 0, c.z))
        o.data.transform(Matrix.Translation(-p))
        o.location = p
        o.parent = root
    bpy.context.view_layer.update()
    mw = ball.matrix_world.copy()
    ball.parent = arm
    ball.matrix_world = mw
    # explode: vertical spread + halves apart along three Z (front +Z)
    ex = {"nozzle": -0.055, "nozzle_nut": -0.03, "body": 0.0, "valve_piece": 0.04, "magnet_core": 0.075,
          "coil": 0.075, "magnet_nut": 0.10}
    for name, h in zip(("nozzle", "nozzle_nut", "body", "valve_piece", "magnet_core", "coil", "magnet_nut"), halves_all):
        dz = {"body": 0.022, "nozzle_nut": 0.03, "magnet_nut": 0.03}.get(name, 0.016)
        C.set_explode(h["front"], (0, ex[name], dz))
        C.set_explode(h["back"], (0, ex[name], -dz))
    C.set_explode(needle, (0, -0.035, 0))
    C.set_explode(nspring, (0, -0.012, 0))
    C.set_explode(piston, (0, 0.01, 0))
    C.set_explode(arm, (0, 0.06, 0))
    C.set_explode(ball, (0, -0.012, 0))
    C.set_explode(aspring, (0, 0.085, 0))
    C.set_explode(con, (0, 0.13, 0))
    C.set_explode(ret, (0.02, 0.13, 0))
    C.set_explode(ef, (0.035, 0.012, 0))
    C.set_explode(wash, (0, -0.065, 0))
    C.set_explode(fuel, (0, 0, 0))
    C.set_explode(oring, (0, 0.0, 0.05))
    for o in [root] + list(root.children_recursive):  # explode(1) stays within ~1.5x the assembled height
        if "explode" in o.keys():
            v = o["explode"]
            o["explode"] = [round(v[0] * 0.8, 4), round(v[1] * 0.65, 4), round(v[2] * 1.4, 4)]
    return root


if __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    C.reset()
    root = build(q)
    if a.get("look"):
        H = os.path.join(C.HERE, "..", "public/lib3d/env/")
        hide = [o for o in bpy.data.objects if a.get("cut") and o.name.endswith("_front")]
        C.look(a["look"], target=(0, 0, 0.085), cam=(0.12, -0.28, 0.14), fov=30, hdr=H + a.get("env", "studio") + "-1k-v1.hdr",
               ground=False, spp=int(a.get("spp", "32")), res=(800, 1000), hide=hide)
    if a.get("out") or not a.get("look"):
        C.finish("injector", q, root, a.get("out"), pivots=True)
