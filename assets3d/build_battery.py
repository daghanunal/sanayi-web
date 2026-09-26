"""12 V AGM car battery (L3 / 70 Ah class, 278 x 175 x 190 mm), unbranded: ribbed polypropylene case with
hold-down ledge and end grips, lid with vent strip, cell caps and charge indicator, lead posts in pockets,
tinned clamps with red / black boots and cable stubs, folding carry handle, a generic label (colour bands only).

  Blender -b --factory-startup --python assets3d/build_battery.py -- --q hi --out /tmp/battery-hi.glb

three.js space: long side along X, front label faces +Z, origin on the floor at the centre.
Nodes: battery > case, lid, terminal_pos, terminal_neg, clamp_pos, clamp_neg, handle (hinge axis = local X:
  rotation.x -= 1.4 lifts it). extras.explode: lid up, clamps up (more), handle up.
Materials: case, lid, lead, clamp (tinned brass), boot_red, boot_black, cable_red, cable_black, label, indicator.
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

L, W, H = 0.278, 0.175, 0.165  # case (lid adds ~0.02, posts ~0.018)
LID = 0.022
TX = 0.108  # terminal x offset
TY = -0.052  # terminals on the front long edge (Blender -Y = three +Z)


def label_tex(n=512):
    """generic label: charcoal panel, brushed silver band, blue accent, grey pictogram blocks (no text)"""
    Hh, Ww = n // 2, n
    y = (np.arange(Hh) + 0.5) / Hh
    x = (np.arange(Ww) + 0.5) / Ww
    img = np.zeros((Hh, Ww, 3), np.float32) + np.array(C.srgb("#1d1f22"), np.float32)
    f = T.fbm(Hh, Ww, base=6, octaves=3, seed=4)
    band = (y > 0.56) & (y < 0.80)
    silver = np.array(C.srgb("#b9bdc2"), np.float32) * (0.85 + 0.15 * f[..., None])
    img[band] = silver[band]
    blue = (y > 0.50) & (y < 0.555)
    img[blue] = np.array(C.srgb("#1f5fae"), np.float32)
    red = (y > 0.80) & (y < 0.83)
    img[red] = np.array(C.srgb("#b3261e"), np.float32)
    # pictogram blocks in a row at the bottom
    for k in range(6):
        x0, x1 = 0.08 + k * 0.075, 0.08 + k * 0.075 + 0.05
        m = (y > 0.12)[:, None] & (y < 0.30)[:, None] & (x > x0)[None, :] & (x < x1)[None, :]
        img[m] = np.array(C.srgb("#8d9196"), np.float32)
    # big spec panel (right) lighter
    m = (y > 0.10)[:, None] & (y < 0.44)[:, None] & (x > 0.60)[None, :] & (x < 0.92)[None, :]
    img[m] = np.array(C.srgb("#2c2f33"), np.float32)
    b2 = np.broadcast_to(band[:, None], (Hh, Ww))
    rough = np.where(b2, 0.35, 0.55).astype(np.float32)
    return img, T.orm(np.ones((Hh, Ww), np.float32), rough, np.where(b2, 0.6, 0.0).astype(np.float32))


def mats(q):
    hi = q == "hi"
    n = 512 if hi else 256
    pa, po, pn = T.textured_plastic(n, seed=31, lum=0.030, rough=0.48, grain=0.6)
    C.material("case", (1, 1, 1), albedo=C.image("pp_alb", pa), orm=C.image("pp_orm", po, False),
               normal=C.image("pp_n", pn, False), normal_strength=0.35, vcol=True, uv_scale=(24, 24))
    C.material("lid", (1, 1, 1), albedo=bpy.data.images["pp_alb"], orm=bpy.data.images["pp_orm"],
               normal=bpy.data.images["pp_n"], normal_strength=0.35, vcol=True, uv_scale=(24, 24))
    la, lo_ = label_tex(n)
    C.material("label", (1, 1, 1), albedo=C.image("label_alb", la), orm=C.image("label_orm", lo_, False), coat=0.6,
               coat_rough=0.12, vcol=True)
    C.material("lead", C.srgb("#7c7f84"), 0.48, 1.0, vcol=True)
    C.material("clamp", C.srgb("#c7b98f"), 0.32, 1.0, vcol=True)
    C.material("boot_red", C.srgb("#b3161b"), 0.42, 0.0, vcol=True)
    C.material("boot_black", C.srgb("#141416"), 0.45, 0.0, vcol=True)
    C.material("cable_red", C.srgb("#9e1418"), 0.5, 0.0, coat=0.3, vcol=True)
    C.material("cable_black", C.srgb("#101012"), 0.5, 0.0, coat=0.3, vcol=True)
    C.material("indicator", C.srgb("#1f8a3a"), 0.05, 0.0, coat=1.0, emission=(C.srgb("#2ecc55"), 0.4))
    C.material("steel", C.srgb("#9a9da2"), 0.3, 1.0, vcol=True)


def uv_norm(ob, scale=0.32):
    """metric box UVs (metres / 0.32) shifted into [0,1] (the tile repeat lives in the material)"""
    C.uv_box(ob, scale)
    me = ob.data
    lay = me.uv_layers[0]
    lay.name = "UVMap"
    a = np.zeros(len(me.loops) * 2, np.float32)
    lay.data.foreach_get("uv", a)
    a = a.reshape(-1, 2)
    a -= a.min(0)
    a /= max(1.0, float(a.max()))
    lay.data.foreach_set("uv", a.ravel())


def build_case(hi):
    seg = 3 if hi else 1
    b = C.box((L, W, H), loc=(0, 0, H / 2), bevel=0.007, segs=seg)
    case = C.obj("case", b, ["case"], sharp=35)
    # end grips (recess under the lid line) + back ribs
    cut = bmesh.new()
    for sx in (-1, 1):
        C.box((0.03, 0.11, 0.028), loc=(sx * (L / 2 + 0.008), 0, H - 0.030), bevel=0.006, segs=2, bm=cut)
    C.boolean(case, C.obj("_c", cut, ["case"], smooth=False))
    parts = [case]
    # hold-down ledge along the bottom of both long sides
    for sy in (-1, 1):
        parts.append(C.obj("ledge", C.box((L - 0.004, 0.012, 0.012), loc=(0, sy * (W / 2 + 0.005), 0.006), bevel=0.003, segs=2 if hi else 1), ["case"], sharp=35))
    # vertical ribs on the back face
    nr = 13 if hi else 7
    for k in range(nr):
        x = -L / 2 + 0.03 + (L - 0.06) * k / (nr - 1)
        parts.append(C.obj("rib", C.box((0.004, 0.003, H - 0.05), loc=(x, W / 2 + 0.0012, H / 2 - 0.004), bevel=0.0012, segs=1), ["case"], sharp=35))
    c = C.join(parts, "case")
    uv_norm(c)
    # label: a thin raised decal on the front face
    lb = bmesh.new()
    uvl = lb.loops.layers.uv.verify()
    x0, x1, z0, z1 = -0.118, 0.118, 0.022, 0.140
    vs = [lb.verts.new(p) for p in ((x0, -W / 2 - 0.0006, z0), (x1, -W / 2 - 0.0006, z0), (x1, -W / 2 - 0.0006, z1), (x0, -W / 2 - 0.0006, z1))]
    f = lb.faces.new(vs)
    for lp, uv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        lp[uvl].uv = uv
    lab = C.obj("label", lb, ["label"], smooth=False, recalc=False)
    lab.data.uv_layers[0].name = "UVMap"
    f.normal_update() if False else None
    return c, lab


def build_lid(hi):
    seg = 3 if hi else 1
    b = C.box((L + 0.002, W + 0.002, LID), loc=(0, 0, H + LID / 2 - 0.002), bevel=0.006, segs=seg)
    lid = C.obj("lid", b, ["lid"], sharp=35)
    cut = bmesh.new()
    for sx in (-1, 1):
        C.box((0.046, 0.046, 0.03), loc=(sx * TX, TY, H + LID + 0.004), bevel=0.004, segs=2, bm=cut)  # terminal pockets
    C.box((0.17, 0.004, 0.01), loc=(0, 0.035, H + LID), bevel=0.001, segs=1, bm=cut)  # moulded groove
    C.boolean(lid, C.obj("_c", cut, ["lid"], smooth=False))
    parts = [lid]
    # vent strip with 6 flush cell caps + charge indicator
    strip = C.box((0.19, 0.036, 0.004), loc=(0, 0.0, H + LID + 0.0015), bevel=0.0018, segs=2 if hi else 1)
    parts.append(C.obj("strip", strip, ["lid"], sharp=35))
    for k in range(6):
        x = -0.080 + k * 0.032
        cp = C.lathe([(0.0, 0.0045), (0.0085, 0.0042), (0.0098, 0.003), (0.0098, 0.0)], 20 if hi else 10, axis="Z")
        C.xform(cp, loc=(x, 0.0, H + LID + 0.0035))
        parts.append(C.obj("cap", cp, ["lid"], sharp=40))
    # + / - moulded symbols next to the pockets
    for sx, sym in ((1, "+"), (-1, "-")):
        cx = sx * TX
        cy = TY + 0.034
        parts.append(C.obj("sym", C.box((0.018, 0.0045, 0.0016), loc=(cx, cy, H + LID - 0.0012), bevel=0.0008, segs=1), ["lid"], sharp=35))
        if sym == "+":
            parts.append(C.obj("sym", C.box((0.0045, 0.018, 0.0016), loc=(cx, cy, H + LID - 0.0012), bevel=0.0008, segs=1), ["lid"], sharp=35))
    lidj = C.join(parts, "lid")
    uv_norm(lidj)
    ind = C.lathe([(0.0, 0.0022), (0.0058, 0.0016), (0.0068, 0.0)], 20 if hi else 10, axis="Z")
    C.xform(ind, loc=(0.0, -0.040, H + LID - 0.0005))
    indicator = C.obj("indicator", ind, ["indicator"], sharp=40)
    ring = C.torus(0.0072, 0.0012, 20 if hi else 10, 6, loc=(0, -0.040, H + LID))
    return lidj, indicator, C.obj("ind_ring", ring, ["lid"], sharp=None)


def build_post(sx, hi):
    z0 = H + LID - 0.012  # pocket floor
    prof = [(0.0125, z0), (0.0125, z0 + 0.003), (0.0098, z0 + 0.004), (0.0092, z0 + 0.021), (0.0078, z0 + 0.0225), (0.0, z0 + 0.0228)]
    b = C.lathe(prof, 28 if hi else 14, axis="Z")
    C.xform(b, loc=(sx * TX, TY, 0))
    return C.obj("terminal_" + ("pos" if sx > 0 else "neg"), b, ["lead"], sharp=40)


def build_clamp(sx, hi):
    """tinned clamp ring + bolt, cable stub leaving to the front, boot over it"""
    pos = sx > 0
    z0 = H + LID - 0.012
    cx, cy = sx * TX, TY
    parts = []
    ring = C.lathe([(0.0098, z0 + 0.006), (0.0142, z0 + 0.006), (0.0142, z0 + 0.018), (0.0098, z0 + 0.018)], 28 if hi else 12, axis="Z")
    bm = bmesh.new()
    ring.to_mesh(bpy.data.meshes.new("_t")) if False else None
    rv = [v for v in ring.verts]
    ring_faces = list(ring.faces)
    C.xform(ring, loc=(cx, cy, 0))
    parts.append(C.obj("clamp_ring", ring, ["clamp"], sharp=40))
    # lug + bolt toward the front (-Y)
    lug = C.box((0.020, 0.030, 0.010), loc=(cx, cy - 0.022, z0 + 0.012), bevel=0.002, segs=2 if hi else 1)
    parts.append(C.obj("clamp_lug", lug, ["clamp"], sharp=40))
    bolt = C.cyl(0.0035, 0.034, 6, loc=(cx, cy - 0.016, z0 + 0.012), axis="X")
    parts.append(C.obj("bolt", bolt, ["steel"], sharp=40))
    nut = C.cyl(0.0058, 0.005, 6, loc=(cx + 0.014, cy - 0.016, z0 + 0.012), axis="X")
    parts.append(C.obj("nut", nut, ["steel"], sharp=40))
    # cable stub: out of the lug, over the lid edge and down the front
    path = C.bend_path([Vector((cx, cy - 0.034, z0 + 0.012)), Vector((cx, -W / 2 - 0.035, z0 + 0.012)),
                        Vector((cx + sx * 0.01, -W / 2 - 0.045, 0.012)), Vector((cx + sx * 0.03, -W / 2 - 0.16, 0.0075))],
                       0.035, 8 if hi else 3)
    cab = C.tube(path, 0.0072, 14 if hi else 8)
    parts.append(C.obj("cable", cab, ["cable_red" if pos else "cable_black"], sharp=None))
    # boot: soft cover over ring + lug
    boot = bmesh.new()
    bmesh.ops.create_cube(boot, size=1.0)
    bmesh.ops.scale(boot, vec=Vector((0.030, 0.050, 0.022)), verts=boot.verts)
    bmesh.ops.subdivide_edges(boot, edges=boot.edges[:], cuts=1, use_grid_fill=True)
    for v in boot.verts:
        if v.co.z > 0:
            v.co.x *= 0.8
            v.co.y *= 0.9
    C.xform(boot, loc=(cx, cy - 0.012, z0 + 0.022))
    bo = C.obj("boot", boot, ["boot_red" if pos else "boot_black"], sharp=None)
    C.subsurf(bo, 2 if hi else 1)
    parts.append(bo)
    cl = C.join(parts, "clamp_" + ("pos" if pos else "neg"))
    C.smooth_by_angle(cl, 40)
    return cl


def build_handle(hi):
    """folding strap: flat on the lid (back half), arms down to hinge pins on the end walls"""
    y = 0.045
    zt = H + LID + 0.0045
    pts = [Vector((-L / 2 - 0.004, y, H - 0.02)), Vector((-L / 2 - 0.004, y, zt)), Vector((-L / 2 + 0.03, y, zt + 0.001)),
           Vector((L / 2 - 0.03, y, zt + 0.001)), Vector((L / 2 + 0.004, y, zt)), Vector((L / 2 + 0.004, y, H - 0.02))]
    path = C.bend_path(pts, 0.012, 6 if hi else 3)
    bm = bmesh.new()
    # strap: rectangular section swept along the path
    prof = [(-0.009, -0.0022), (0.009, -0.0022), (0.009, 0.0022), (-0.009, 0.0022)]
    rings = []
    for i, p in enumerate(path):
        a = path[max(i - 1, 0)]
        b = path[min(i + 1, len(path) - 1)]
        t = (b - a).normalized()
        side = Vector((0, 1, 0))
        nrm = t.cross(side).normalized()
        rings.append([bm.verts.new(p + side * u + nrm * v) for u, v in prof])
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(4):
            bm.faces.new((r0[k], r0[(k + 1) % 4], r1[(k + 1) % 4], r1[k]))
    bm.faces.new(rings[0][::-1])
    bm.faces.new(rings[-1])
    h = C.obj("handle_strap", bm, ["boot_black"], sharp=40)
    C.bevel_mod(h, 0.001, 1, 40) if hi else None
    pins = bmesh.new()
    for sx in (-1, 1):
        C.cyl(0.006, 0.006, 16 if hi else 8, loc=(sx * (L / 2 + 0.004), y, H - 0.02), axis="X", bm=pins)
    return C.join([h, C.obj("pins", pins, ["lid"], sharp=40)], "handle_mesh"), Vector((0, y, H - 0.02))


def build(q):
    hi = q == "hi"
    mats(q)
    case, label = build_case(hi)
    lid, ind, ring = build_lid(hi)
    lid = C.join([lid, ind, ring], "lid")
    posts = {s: build_post(s, hi) for s in (1, -1)}
    clamps = {s: build_clamp(s, hi) for s in (1, -1)}
    handle, hpiv = build_handle(hi)
    case = C.join([case, label], "case")
    for o in [case, lid, handle] + list(posts.values()) + list(clamps.values()):
        if o.data.uv_layers:
            o.data.uv_layers[0].name = "UVMap"
    C.bake_ao_vcol([case, lid, handle] + list(posts.values()) + list(clamps.values()), samples=64 if hi else 24,
                   max_dist=0.04, floor=0.35)
    root = C.empty("battery")
    case.parent = root
    lid.parent = root
    for s, o in posts.items():
        o.parent = root
        o["explode"] = [0.0, 0.10, 0.0]
    for s, o in clamps.items():
        o.parent = root
        o["explode"] = [0.0, 0.20, 0.0]
    hn = C.empty("handle", root, loc=hpiv)
    handle.parent = hn
    handle.location = (-hpiv.x, -hpiv.y, -hpiv.z)
    lid["explode"] = [0.0, 0.08, 0.0]
    hn["explode"] = [0.0, 0.14, 0.0]
    return root


if __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    C.reset()
    root = build(q)
    if a.get("look"):
        Hd = os.path.join(C.HERE, "..", "public/lib3d/env/")
        cams = {"q3": ((0.42, -0.50, 0.40), (0.0, 0.0, 0.10), 30), "close": ((0.22, -0.20, 0.30), (0.09, -0.04, 0.17), 30),
                "top": ((0.05, -0.12, 0.62), (0, 0, 0.1), 30)}
        for k in a.get("views", "q3").split(","):
            cam, tgt, fov = cams[k]
            C.look(a["look"].replace(".png", f"_{k}.png"), target=tgt, cam=cam, fov=fov, hdr=Hd + a.get("env", "studio") + "-1k-v1.hdr",
                   ground=True, spp=int(a.get("spp", "48")), res=(1000, 800))
    if a.get("out") or not a.get("look"):
        C.finish("battery", q, root, a.get("out"))
