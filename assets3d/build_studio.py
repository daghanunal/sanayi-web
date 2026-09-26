"""Studio turntable: infinity cyclorama (U-cove, 10 m wide, 5 m high) + a 4.8 m turntable + 3 softboxes.

  Blender -b --factory-startup --python assets3d/build_studio.py -- --q hi --out /tmp/studio-hi.glb

three.js space: the TURNTABLE TOP is at y = 0 (objects placed at the origin sit on it); the studio floor
is 8 cm lower (y = -0.08). Back wall at z = -4.5, side coves at x = +-5, open toward +Z.
Nodes: studio > cyclorama, turntable (rotate .rotation.y), softbox_1 (big key, front left),
       softbox_2 (strip, right), softbox_3 (overhead scrim)
Materials looked up at runtime: light_panel (softbox diffusers + turntable LED rim), cyc (sweep colour).
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

FZ = -0.08  # studio floor (Blender z)
TR = 2.4  # turntable radius
HW, BACK, FRONT, WH, RC = 5.0, 4.5, -6.5, 5.0, 1.6  # half width, back wall y, floor front y, wall height, cove radius


def mats(q):
    hi = q == "hi"
    C.material("cyc", C.srgb("#c6c7c8"), 0.6, vcol=True)
    if hi:
        a, o, n = T.brushed(512, seed=71, lum=0.028, rough=0.38, radial=True)
        C.material("turntable_top", (1, 1, 1), albedo=C.image("tt_alb", a), orm=C.image("tt_orm", T.orm(1, o[..., 1], 0), False),
                   normal=C.image("tt_n", n, False), normal_strength=0.4, vcol=True)
    else:
        C.material("turntable_top", C.srgb("#2b2c2e"), 0.38, vcol=True)
    C.material("alu", C.srgb("#c9ccd0"), 0.25, 1.0, vcol=True)
    C.material("black_fabric", C.srgb("#111112"), 0.9, vcol=True)
    C.material("stand", C.srgb("#1d1e20"), 0.4, 0.8, vcol=True)
    C.material("chrome", C.srgb("#e6e7e9"), 0.1, 1.0, vcol=True)
    C.material("light_panel", C.srgb("#f4f6f8"), 0.5, emission=(C.srgb("#f6f8ff"), 6.0))


def plan_path(hi):
    """inner base line of the U cove (Blender xy), from front-left round the back to front-right"""
    pts = []
    rr = 1.8  # plan corner radius
    n = 10 if hi else 4
    ys = np.linspace(FRONT, BACK - rr, 9 if hi else 4)
    for y in ys:
        pts.append(Vector((-HW, y, 0)))
    for k in range(1, n):
        a = math.pi - (math.pi / 2) * k / n
        pts.append(Vector((-HW + rr + rr * math.cos(a), BACK - rr + rr * math.sin(a), 0)))
    for x in np.linspace(-HW + rr, HW - rr, 10 if hi else 4):
        pts.append(Vector((x, BACK, 0)))
    for k in range(1, n):
        a = math.pi / 2 - (math.pi / 2) * k / n
        pts.append(Vector((HW - rr + rr * math.cos(a), BACK - rr + rr * math.sin(a), 0)))
    for y in ys[::-1]:
        pts.append(Vector((HW, y, 0)))
    return pts


def cyclorama(q):
    hi = q == "hi"
    path = plan_path(hi)
    # section: from the floor (inset RC from the wall line) curving up into the wall, then up to WH
    ns = 12 if hi else 5
    sec = [(RC * (1 - math.sin(math.pi / 2 * k / ns)), FZ + RC * (1 - math.cos(math.pi / 2 * k / ns))) for k in range(ns + 1)]
    for z in np.linspace(FZ + RC, WH, 6 if hi else 3)[1:]:
        sec.append((0.0, z))
    bm = bmesh.new()
    rings = []
    n = len(path)
    for i, p in enumerate(path):
        a = path[max(i - 1, 0)]
        b = path[min(i + 1, n - 1)]
        t = (b - a).normalized()
        inward = Vector((-t.y, t.x, 0))  # left of travel = inside of the U (path runs clockwise seen from above? check)
        if inward.dot(Vector((0, 0.5, 0)) - p) < 0:
            inward = -inward
        rings.append([bm.verts.new(p + inward * o + Vector((0, 0, z))) for o, z in sec])
    for i in range(n - 1):
        for j in range(len(sec) - 1):
            f = bm.faces.new((rings[i][j], rings[i + 1][j], rings[i + 1][j + 1], rings[i][j + 1]))
            c = f.calc_center_median()
            f.normal_update()
            if f.normal.dot(Vector((0, 0.5, 2.0)) - c) < 0:
                f.normal_flip()
    cove = C.obj("cove", bm, ["cyc"], smooth=True, sharp=60, recalc=False)
    # floor: grid (dense for the vertex AO under the turntable), stops at the cove foot
    fb = bmesh.new()
    cell = 0.2 if hi else 0.8
    x0, y1 = HW - RC + 0.06, BACK - RC + 0.06
    xs = np.linspace(-x0, x0, int(round(2 * x0 / cell)) + 1)
    ys = np.linspace(FRONT, y1, int(round((y1 - FRONT) / cell)) + 1)
    g = [[fb.verts.new((x, y, FZ)) for y in ys] for x in xs]
    for i in range(len(xs) - 1):
        for j in range(len(ys) - 1):
            fb.faces.new((g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]))
    floor = C.obj("floor", fb, ["cyc"], smooth=False)
    # front floor apron between the side coves' ends and further out
    return cove, floor


def turntable(q, root):
    hi = q == "hi"
    segs = 128 if hi else 48
    e = C.empty("turntable", root)
    prof = [(0.0, 0.0), (TR - 0.03, 0.0), (TR - 0.005, -0.004), (TR, -0.015), (TR, FZ + 0.012), (TR - 0.03, FZ + 0.004), (TR - 0.05, FZ)]
    bm = C.lathe(prof, segs, axis="Z", mat_idx=[0, 1, 1, 1, 1, 1])
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        for lp in f.loops:
            p = lp.vert.co
            lp[uvl].uv = (p.x / (2 * TR) + 0.5, p.y / (2 * TR) + 0.5)
    top = C.obj("turntable_disc", bm, ["turntable_top", "alu"], smooth=True, sharp=40)
    top.parent = e
    rb = bmesh.new()
    C.torus(TR + 0.012, 0.006, segs, 6 if hi else 4, loc=(0, 0, FZ + 0.012), bm=rb)
    rim = C.obj("led_rim", rb, ["light_panel"])
    rim.parent = e
    return e, [top, rim]


def softbox(q, name, loc, aim, w, h, depth, stand_h, root, overhead=False):
    """rectangular softbox: black fabric pyramid, white emissive front, speed ring, stand / boom"""
    hi = q == "hi"
    node = C.empty(name, root)
    bm = bmesh.new()
    # built facing -Y (front at y = -depth/2 ... ) then aimed
    fw, fh = w / 2, h / 2
    bw, bh = fw * 0.35, fh * 0.35
    front = [bm.verts.new(v) for v in ((-fw, 0, -fh), (fw, 0, -fh), (fw, 0, fh), (-fw, 0, fh))]
    back = [bm.verts.new(v) for v in ((-bw, depth, -bh), (bw, depth, -bh), (bw, depth, bh), (-bw, depth, bh))]
    for i in range(4):
        j = (i + 1) % 4
        f = bm.faces.new((front[i], front[j], back[j], back[i]))
        f.material_index = 0
    f = bm.faces.new(back[::-1])
    f.material_index = 0
    # recessed diffuser + a thin rim
    dv = [bm.verts.new((x * 0.97, 0.03, z * 0.97)) for x, z in ((-fw, -fh), (fw, -fh), (fw, fh), (-fw, fh))]
    f = bm.faces.new(dv)
    f.material_index = 1
    for i in range(4):
        j = (i + 1) % 4
        f = bm.faces.new((front[i], front[j], dv[j], dv[i]))
        f.material_index = 0
    C.cyl(0.09, 0.06, 16 if hi else 8, loc=(0, depth + 0.03, 0), axis="Y", bm=bm, mat=2)
    head = C.obj(name + "_head", bm, ["black_fabric", "light_panel", "stand"], smooth=False, recalc=False)
    for p in head.data.polygons:  # face the diffuser toward -Y (normal of the front face)
        pass
    # aim: rotate so -Y points from loc toward aim
    d = (Vector(aim) - Vector(loc)).normalized()
    q_ = (-d).to_track_quat("Y", "Z")
    head.data.transform(q_.to_matrix().to_4x4())
    head.location = loc
    head.parent = node
    sb = bmesh.new()
    x, y, z = loc
    if overhead:
        # boom from a stand at the side wall
        C.tube([Vector((x - 3.0, y, 0.0 + FZ)), Vector((x - 3.0, y, z + 0.4))], 0.025, 8, bm=sb)
        C.tube([Vector((x - 3.2, y, z + 0.35)), Vector((x, y, z + 0.35))], 0.02, 8, bm=sb)
        C.tube([Vector((x, y, z + 0.35)), Vector((x, y, z + 0.05))], 0.012, 6, bm=sb)
        base = (x - 3.0, y)
    else:
        C.tube([Vector((x, y, FZ + 0.6)), Vector((x, y, z - 0.1))], 0.02, 8, bm=sb)
        base = (x, y)
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.3
        C.tube([Vector((base[0], base[1], FZ + 0.62)), Vector((base[0] + 0.55 * math.cos(a), base[1] + 0.55 * math.sin(a), FZ))], 0.013, 6, bm=sb)
    stand = C.obj(name + "_stand", sb, ["stand"])
    stand.parent = node
    return node, [head, stand]


def build(q):
    hi = q == "hi"
    mats(q)
    root = C.empty("studio")
    cove, floor = cyclorama(q)
    cyc = C.join([cove, floor], "cyclorama")
    cyc.parent = root
    tt, tt_parts = turntable(q, root)
    s1, p1 = softbox(q, "softbox_1", (-3.3, -3.4, 2.6), (0, 0, 0.6), 1.5, 2.0, 0.9, 2.6, root)
    s2, p2 = softbox(q, "softbox_2", (3.6, -1.0, 1.7), (0, 0, 0.7), 0.4, 1.8, 0.45, 1.7, root)
    s3, p3 = softbox(q, "softbox_3", (0.0, 0.6, 4.1), (0, 0.4, 0), 3.0, 1.6, 0.7, 4.1, root, overhead=True)
    parts = [cyc] + tt_parts + p1 + p2 + p3
    C.bake_ao_vcol([cyc], samples=64 if hi else 24, max_dist=1.5, floor=0.35)
    C.bake_ao_vcol([p for p in parts if p is not cyc and not p.name.startswith("led")], samples=32 if hi else 12,
                   max_dist=0.3, floor=0.35)
    for p in parts:
        if p.name.startswith("led"):
            C.vcol_fill(p)
    return root


if __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    C.reset()
    root = build(q)
    if a.get("look") or a.get("still"):
        H = os.path.join(C.HERE, "..", "public/lib3d/env/")
        if a.get("car"):
            g = bpy.data.node_groups.get("glTF Material Output")
            if g:  # the importer wants its own (fuller) group of that name
                g.name = "glTF Material Output (build)"
            before = set(bpy.data.objects)
            bpy.ops.import_scene.gltf(filepath=os.path.join(C.HERE, "..", "public/lib3d/car-hi-v1.glb"))
            for o in set(bpy.data.objects) - before:
                if o.parent is None:
                    o.rotation_euler = (0, 0, math.radians(-25))
        for m in bpy.data.materials:
            if m.name.startswith("light_panel") and m.node_tree:
                for n in m.node_tree.nodes:
                    if n.type == "BSDF_PRINCIPLED":
                        n.inputs["Emission Strength"].default_value = float(a.get("emit", "12"))
        views = {"front": ((3.4, -7.4, 1.9), (0, 0, 0.7), 40), "wide": ((0.0, -11.0, 3.0), (0, 0.5, 1.3), 50)}
        for k in a.get("views", "front,wide").split(","):
            cam, tgt, fov = views[k]
            C.look(a.get("still") or f"/tmp/l3d/studio_{k}.png", target=tgt, cam=cam, fov=fov,
                   hdr=H + a.get("env", "studio") + "-1k-v1.hdr", ground=False, spp=int(a.get("spp", "48")),
                   res=(1400, 875), strength=float(a.get("strength", "0.6")))
    if a.get("out") or not (a.get("look") or a.get("still")):
        C.finish("studio", q, root, a.get("out"))
