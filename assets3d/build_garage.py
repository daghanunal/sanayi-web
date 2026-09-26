"""Workshop interior: a small oto sanayi repair bay (9 m wide x 7 m deep x 4.5 m high), open to the camera.

  Blender -b --factory-startup --python assets3d/build_garage.py -- --q hi --out /tmp/garage-hi.glb

three.js space: floor at y = 0, the bay centred at the origin, the open side (raised roller shutter in the
front header) faces +Z, the back wall (closed roller shutter) is at z = -3.5, side walls at x = +-4.5.
A car (4.3 m, facing +X) parks at the origin between the two lift posts.
Nodes (runtime contract, see README):
  garage > floor, walls, roof, door (closed back shutter), front (header + raised shutter box), lights,
           lift > lift_frame, lift_carriage (> arms)   lift_carriage.position.y: 0 (arms on the floor) .. 1.8 m
           toolbox_1 (roller cabinet + top chest), toolbox_2 (mobile trolley), workbench (+ vice, pegboard),
           props (tyre stack, compressor, drum, oil drain, hose reel, extinguisher, signage)
Materials looked up at runtime: light_panel (emissive tubes / window), paint_red (lift + toolboxes).
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

W2, D2, HT = 4.5, 3.5, 4.5  # half width (x), half depth (y), height
LIFT_X, LIFT_Y = 0.2, 1.52  # post centres (Blender y = +-LIFT_Y)
Z_BAND, Z_STRIPE = 1.20, 1.26


# ── textures ─────────────────────────────────────────────────────────────────
def block_wall(n=512, seed=31):
    """painted concrete block, tile = 1.2 m: 3 blocks (0.4 m) x 6 courses (0.2 m), running bond.
    returns lum (h,w), rough, normal"""
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32) / n  # 0..1 over 1.2 m
    course = np.floor(yy * 6)
    xs = (xx * 3 + 0.5 * (course % 2)) % 1.0
    ys = (yy * 6) % 1.0
    jw = 0.012 / 0.4  # 12 mm joint in block units (x)
    jh = 0.012 / 0.2
    dx = np.minimum(xs, 1 - xs) / jw
    dy = np.minimum(ys, 1 - ys) / jh
    joint = np.clip(1.5 - np.minimum(dx, dy) * 1.5, 0, 1)
    f = T.fbm(n, n, base=64, octaves=3, seed=seed)
    m = T.fbm(n, n, base=4, octaves=5, seed=seed + 1)
    pores = T.blur((T.white(n, n, seed + 2) > 0.992).astype(np.float32), 1) * 3
    h = -joint * 0.9 + f * 0.5 - np.clip(pores, 0, 1) * 0.6
    lum = 1 + 0.05 * (m - 0.5) + 0.03 * (f - 0.5) - 0.10 * joint - 0.08 * np.clip(pores, 0, 1)
    rough = np.clip(0.82 + 0.08 * (f - 0.5), 0, 1)
    return lum.astype(np.float32), rough, T.normal_from_height(h, 1.6)


def pegboard_tex(W=1024, H=512, seed=41):
    """white pegboard 2 x 1 m, 25 mm hole grid, painted tool outlines + hanging tools (albedo, orm, normal)"""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    px = W / 2.0  # px per metre
    pitch = 0.025 * px
    hx = (xx % pitch) - pitch / 2
    hy = (yy % pitch) - pitch / 2
    hole = np.clip(1.0 - (np.sqrt(hx * hx + hy * hy) - 0.0035 * px) / 1.2, 0, 1)
    alb = np.ones((H, W, 3), np.float32) * np.array([0.13, 0.17, 0.22], np.float32)
    rough = np.full((H, W), 0.7, np.float32)
    metal = np.zeros((H, W), np.float32)
    tool = np.zeros((H, W), np.float32)
    shadow = np.zeros((H, W), np.float32)
    rng = np.random.default_rng(seed)

    def capsule(ax, ay, bx, by, r):
        vx, vy = bx - ax, by - ay
        L2 = vx * vx + vy * vy + 1e-9
        t = np.clip(((xx - ax) * vx + (yy - ay) * vy) / L2, 0, 1)
        d = np.hypot(xx - (ax + t * vx), yy - (ay + t * vy))
        return np.clip(r - d + 0.5, 0, 1)

    def ring(cx, cy, r0, r1):
        d = np.hypot(xx - cx, yy - cy)
        return np.clip(np.minimum(d - r0, r1 - d) + 0.5, 0, 1)

    # combination wrenches (graduated) on the left
    x0 = 0.12 * px
    for i in range(9):
        L = (0.14 + 0.022 * i) * px
        cx = x0 + i * 0.055 * px
        top = H - 0.14 * px
        w = (0.006 + 0.0012 * i) * px
        m = capsule(cx, top, cx, top - L, w)
        m = np.maximum(m, ring(cx, top + 0.004 * px, 0.006 * px + i * 0.4, 0.014 * px + i * 0.8))
        m = np.maximum(m, ring(cx, top - L - 0.006 * px, 0.005 * px + i * 0.4, 0.013 * px + i * 0.8) * (yy < top - L - 0.002 * px))
        tool = np.maximum(tool, m)
    # screwdrivers
    for i in range(7):
        cx = 0.70 * px + i * 0.05 * px
        top = H - 0.12 * px
        tool = np.maximum(tool, capsule(cx, top, cx, top - 0.10 * px, 0.012 * px) * 0.999)
        tool = np.maximum(tool, capsule(cx, top - 0.10 * px, cx, top - (0.22 + 0.02 * (i % 3)) * px, 0.0035 * px))
    # hammers / pliers
    for i in range(3):
        cx = 1.15 * px + i * 0.14 * px
        top = H - 0.10 * px
        tool = np.maximum(tool, capsule(cx, top - 0.02 * px, cx, top - 0.30 * px, 0.010 * px))
        tool = np.maximum(tool, capsule(cx - 0.05 * px, top, cx + 0.05 * px, top, 0.016 * px))
    for i in range(4):
        cx = 1.62 * px + i * 0.08 * px
        top = H - 0.12 * px
        tool = np.maximum(tool, capsule(cx - 0.012 * px, top, cx + 0.018 * px, top - 0.20 * px, 0.006 * px))
        tool = np.maximum(tool, capsule(cx + 0.012 * px, top, cx - 0.018 * px, top - 0.20 * px, 0.006 * px))
    # socket rail at the bottom
    for i in range(14):
        cx = 0.15 * px + i * 0.06 * px
        cy = 0.12 * px
        tool = np.maximum(tool, capsule(cx, cy, cx, cy + (0.03 + 0.003 * i) * px, (0.008 + 0.0008 * i) * px))
    tool = np.clip(tool, 0, 1)
    shadow = np.roll(np.roll(T.blur(tool, 3), -4, 0), 3, 1)
    outline = np.clip(T.blur(tool, 4) * 3, 0, 1)  # painted shadow-board silhouette
    grey = 0.55 + 0.1 * T.fbm(H, W, base=32, octaves=3, seed=seed + 3)
    alb = alb * (1 - outline[..., None]) + np.array([0.75, 0.74, 0.70], np.float32) * outline[..., None]
    alb = alb * (1 - 0.45 * shadow[..., None]) * (1 - 0.7 * hole[..., None] * (1 - outline[..., None]))
    alb = alb * (1 - tool[..., None]) + T.gray3(grey) * tool[..., None]
    rough = rough * (1 - tool) + 0.3 * tool
    metal = tool
    hgt = -hole * (1 - outline) + T.blur(tool, 1) * 2.5
    hole = hole * (1 - outline)
    return alb.astype(np.float32), T.orm(1 - 0.5 * hole, rough, metal), T.normal_from_height(hgt - 0 * hole, 1.5, wrap=False)


def wood_tex(n=512, seed=51):
    """oiled beech butcher-block worktop (strips along u), worn"""
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32) / n
    strip = np.floor(yy * 8)
    rng = np.random.default_rng(seed)
    tone = rng.random(8).astype(np.float32)[strip.astype(int)]
    grain = T.fbm(n, n, base=2, octaves=6, seed=seed, aspect=16)
    lines = 0.5 + 0.5 * np.sin((yy * 90 + grain * 6) * np.pi * 2)
    edge = np.clip(1 - np.minimum((yy * 8) % 1, 1 - (yy * 8) % 1) / 0.03, 0, 1)
    lum = 0.9 + 0.4 * (tone - 0.5) + 0.15 * (lines - 0.5) - 0.45 * edge
    wear = T.fbm(n, n, base=6, octaves=4, seed=seed + 2)
    alb = T.tint(lum * (1 - 0.35 * np.clip((wear - 0.55) * 3, 0, 1)), (0.46, 0.30, 0.17))
    return alb, T.orm(1, np.clip(0.55 + 0.15 * (wear - 0.5), 0, 1), 0), T.normal_from_height(lines * 0.3 - edge, 1.0)


# ── materials ────────────────────────────────────────────────────────────────
def mats(q):
    hi = q == "hi"
    if hi:
        fa, fo, fn = T.concrete_floor(1024, seed=12, lum=0.20, rough=0.55, epoxy=True, tint_rgb=(0.93, 0.95, 0.96))
        C.material("floor", (1, 1, 1), albedo=C.image("floor_alb", fa), orm=C.image("floor_orm", fo[::2, ::2], False),
                   normal=C.image("floor_n", fn[::2, ::2], False), normal_strength=0.5, vcol=True, uv_scale=(2.5, 2.5))
        lum, rough, nrm = block_wall(512)
        C.material("wall", (1, 1, 1), albedo=C.image("wall_alb", T.tint(lum, C.srgb("#d8d5cc"))),
                   orm=C.image("wall_orm", T.orm(1, rough, 0), False), normal=C.image("wall_n", nrm, False),
                   vcol=True, uv_scale=(10 / 1.2, 10 / 1.2))
        C.material("wall_lower", (1, 1, 1), albedo=C.image("wall_low_alb", T.tint(lum, C.srgb("#44564f"))),
                   orm=C.image("wall_low_orm", T.orm(1, rough * 0.7, 0), False), normal=bpy.data.images["wall_n"],
                   vcol=True, uv_scale=(10 / 1.2, 10 / 1.2))
        C.material("wall_ext", (1, 1, 1), albedo=C.image("wall_ext_alb", T.tint(lum, C.srgb("#bdb6a8"))),
                   orm=bpy.data.images["wall_orm"], normal=bpy.data.images["wall_n"], vcol=True,
                   uv_scale=(10 / 1.2, 10 / 1.2))
        pa, po, pn = pegboard_tex(1024, 512)
        C.material("pegboard", (1, 1, 1), albedo=C.image("peg_alb", pa), orm=C.image("peg_orm", po, False),
                   normal=C.image("peg_n", pn, False), vcol=True)
        wa, wo, wn = wood_tex(256)
        C.material("wood", (1, 1, 1), albedo=C.image("wood_alb", wa), orm=C.image("wood_orm", wo, False),
                   normal=C.image("wood_n", wn, False), vcol=True, uv_scale=(1, 6))
        ga, go, gn = T.brushed(256, seed=61, lum=0.62, rough=0.38)
        C.material("galv", (1, 1, 1), albedo=C.image("galv_alb", ga), orm=C.image("galv_orm", go, False),
                   normal=C.image("galv_n", gn, False), normal_strength=0.5, vcol=True, uv_scale=(4, 4))
    else:
        fa, fo, fn = T.concrete_floor(256, seed=12, lum=0.20, rough=0.55, epoxy=True, tint_rgb=(0.93, 0.95, 0.96))
        C.material("floor", (1, 1, 1), albedo=C.image("floor_alb", fa), rough=0.5, vcol=True, uv_scale=(2.5, 2.5))
        C.material("wall", C.srgb("#d8d5cc"), 0.85, vcol=True)
        C.material("wall_lower", C.srgb("#44564f"), 0.6, vcol=True)
        C.material("wall_ext", C.srgb("#bdb6a8"), 0.85, vcol=True)
        pa, po, pn = pegboard_tex(256, 128)
        C.material("pegboard", (1, 1, 1), albedo=C.image("peg_alb", pa), rough=0.6, vcol=True)
        C.material("wood", C.srgb("#8a5a33"), 0.55, vcol=True)
        C.material("galv", C.srgb("#a9adb0"), 0.4, 0.9, vcol=True)
    C.material("stripe_red", C.srgb("#a3161b"), 0.45, vcol=True)
    C.material("line_yellow", C.srgb("#e0b21a"), 0.55, vcol=True)
    C.material("steel", C.srgb("#5e6266"), 0.45, 0.9, vcol=True)
    C.material("steel_dark", C.srgb("#2a2c2f"), 0.5, 0.8, vcol=True)
    C.material("roof_sheet", C.srgb("#b8bcbf"), 0.42, 0.85, vcol=True)
    C.material("paint_red", C.srgb("#b3161c"), 0.38, 0.0, coat=0.35, coat_rough=0.2, vcol=True)
    C.material("paint_blue", C.srgb("#1f4f8f"), 0.4, 0.0, coat=0.3, coat_rough=0.2, vcol=True)
    C.material("paint_grey", C.srgb("#4b4f55"), 0.5, 0.2, vcol=True)
    C.material("paint_yellow", C.srgb("#d9a514"), 0.45, 0.0, vcol=True)
    C.material("chrome", C.srgb("#e6e7e9"), 0.1, 1.0, vcol=True)
    C.material("alu", C.srgb("#c8cbce"), 0.3, 1.0, vcol=True)
    C.material("rubber", C.srgb("#141415"), 0.85, vcol=True)
    C.material("plastic_black", C.srgb("#1a1b1c"), 0.55, vcol=True)
    C.material("hose_orange", C.srgb("#e0561b"), 0.5, vcol=True)
    C.material("sign_white", C.srgb("#e8e8e4"), 0.5, vcol=True)
    C.material("sign_green", C.srgb("#157a3c"), 0.5, vcol=True)
    C.material("cardboard", C.srgb("#a67c4e"), 0.8, vcol=True)
    C.material("oil_black", C.srgb("#141416"), 0.35, vcol=True)
    C.material("cork", C.srgb("#9b7653"), 0.85, vcol=True)
    C.material("light_panel", C.srgb("#f4f6f8"), 0.3, emission=(C.srgb("#f2f6ff"), 8.0))
    C.material("window", C.srgb("#dfe8ee"), 0.1, emission=(C.srgb("#cfe0ee"), 2.5))


# ── geometry helpers ─────────────────────────────────────────────────────────
def norm_uv(ob):
    """exactly one UV map called 'UVMap' (bmesh may name new layers 'Float2'; joins then split UVs)"""
    me = ob.data
    if not me.uv_layers:
        me.uv_layers.new(name="UVMap")
        return ob
    keep = me.uv_layers[0]
    for l in list(me.uv_layers):
        if l.name == "UVMap":
            keep = l
    for l in list(me.uv_layers):
        if l != keep:
            me.uv_layers.remove(l)
    me.uv_layers[0].name = "UVMap"
    me.uv_layers.active_index = 0
    me.uv_layers[0].active_render = True
    return ob


def join(objs, name):
    objs = [o for o in objs if o is not None]
    for o in objs:
        norm_uv(o)
    j = C.join(objs, name)
    norm_uv(j)
    return j

def face(bm, verts, want=None, mat=0):
    f = bm.faces.new(verts)
    f.normal_update()
    if want is not None and f.normal.dot(Vector(want)) < 0:
        f.normal_flip()
    f.material_index = mat
    return f


def rows(z0, z1, cell, breaks=()):
    zs = set([z0, z1] + [b for b in breaks if z0 < b < z1])
    n = max(1, int(round((z1 - z0) / cell)))
    zs.update(z0 + (z1 - z0) * i / n for i in range(n + 1))
    zs = sorted(zs)
    out = [zs[0]]
    for z in zs[1:]:
        if z - out[-1] > 0.02:
            out.append(z)
        else:
            out[-1] = z if z in breaks else out[-1]
    if out[-1] != z1:
        out[-1] = z1
    return out


def wall_box(bm, origin, u_dir, n_in, u0, u1, z0, z1, t, cell, band=True, ext=True):
    """wall slab: inner face (towards n_in) subdivided for vertex AO with the lower band / stripe split,
    outer face + edges coarse. Material slots: 0 wall, 1 wall_lower, 2 stripe_red, 3 wall_ext."""
    o, u, n = Vector(origin), Vector(u_dir).normalized(), Vector(n_in).normalized()
    us = rows(u0, u1, cell)
    zs = rows(z0, z1, cell, (Z_BAND, Z_STRIPE) if band else ())
    P = lambda uu, zz, off: o + u * uu + Vector((0, 0, zz)) - n * off
    g = [[bm.verts.new(P(uu, zz, 0)) for zz in zs] for uu in us]
    for i in range(len(us) - 1):
        for j in range(len(zs) - 1):
            zc = 0.5 * (zs[j] + zs[j + 1])
            m = 0 if not band else (1 if zc < Z_BAND else (2 if zc < Z_STRIPE else 0))
            face(bm, (g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]), n, m)
    oc = [bm.verts.new(P(uu, zz, t)) for uu, zz in ((u0, z0), (u1, z0), (u1, z1), (u0, z1))]
    face(bm, oc, -n, 3 if ext else 0)
    # edges: n-gons that include every inner boundary vertex (manifold)
    bottom = [g[i][0] for i in range(len(us))]
    top = [g[i][-1] for i in range(len(us))]
    left = [g[0][j] for j in range(len(zs))]
    right = [g[-1][j] for j in range(len(zs))]
    face(bm, bottom + [oc[1], oc[0]], (0, 0, -1), 3)
    face(bm, top + [oc[2], oc[3]], (0, 0, 1), 3)
    face(bm, left + [oc[3], oc[0]], -u, 3)
    face(bm, right + [oc[2], oc[1]], u, 3)


def grid(bm, x0, x1, y0, y1, z, cell, want=(0, 0, 1), mat=0):
    xs = rows(x0, x1, cell)
    ys = rows(y0, y1, cell)
    g = [[bm.verts.new((x, y, z)) for y in ys] for x in xs]
    for i in range(len(xs) - 1):
        for j in range(len(ys) - 1):
            face(bm, (g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]), want, mat)


def uv_norm(ob, L=10.0):
    """metric box-projected UVs divided by L and shifted to start at 0 (quantizable 0..1)"""
    norm_uv(ob)
    C.uv_box(ob, L)
    me = ob.data
    uv = me.uv_layers.active.data
    a = np.zeros(len(uv) * 2, np.float32)
    uv.foreach_get("uv", a)
    a = a.reshape(-1, 2)
    a -= a.min(0)
    if a.max() > 1.0:
        print("WARN uv range", ob.name, a.max())
    a = np.clip(a, 0, 1)
    uv.foreach_set("uv", a.ravel())
    return ob


def rbox(size, loc, bevel=0.0, segs=1, mat=0, bm=None, rot=None):
    b = C.box(size, bevel=bevel, segs=segs, mat=mat)
    if rot is not None:
        C.xform(b, rot=rot)
    C.xform(b, loc=loc)
    if bm is None:
        return b
    C.merge(bm, b)
    return bm


def ibeam(bm, p0, p1, h, w, tw, tf, up=(0, 0, 1), mat=0):
    """I-section from p0 to p1 (web along `up`)"""
    prof = [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, -h / 2 + tf), (tw / 2, -h / 2 + tf), (tw / 2, h / 2 - tf),
            (w / 2, h / 2 - tf), (w / 2, h / 2), (-w / 2, h / 2), (-w / 2, h / 2 - tf), (-tw / 2, h / 2 - tf),
            (-tw / 2, -h / 2 + tf), (-w / 2, -h / 2 + tf)]
    p0, p1 = Vector(p0), Vector(p1)
    d = (p1 - p0).normalized()
    upv = Vector(up)
    side = upv.cross(d).normalized()
    upv = d.cross(side).normalized()
    r0 = [bm.verts.new(p0 + side * a + upv * b) for a, b in prof]
    r1 = [bm.verts.new(p1 + side * a + upv * b) for a, b in prof]
    n = len(prof)
    for i in range(n):
        j = (i + 1) % n
        f = bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
        f.material_index = mat
    f = bm.faces.new(r0[::-1])
    f.material_index = mat
    f = bm.faces.new(r1)
    f.material_index = mat


def box_tube(bm, p0, p1, w, h, up=(0, 0, 1), mat=0):
    p0, p1 = Vector(p0), Vector(p1)
    d = (p1 - p0).normalized()
    upv = Vector(up)
    if abs(upv.dot(d)) > 0.99:
        upv = Vector((1, 0, 0))
    side = upv.cross(d).normalized()
    upv = d.cross(side).normalized()
    prof = [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]
    r0 = [bm.verts.new(p0 + side * a + upv * b) for a, b in prof]
    r1 = [bm.verts.new(p1 + side * a + upv * b) for a, b in prof]
    for i in range(4):
        j = (i + 1) % 4
        f = bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
        f.material_index = mat
    for r in (r0[::-1], r1):
        f = bm.faces.new(r)
        f.material_index = mat


# ── room ─────────────────────────────────────────────────────────────────────
def build_room(q):
    hi = q == "hi"
    cell = 0.25 if hi else 0.9
    wm = ["wall", "wall_lower", "stripe_red", "wall_ext"]
    # floor + apron outside the open side
    fb = bmesh.new()
    grid(fb, -W2, W2, -D2 - 1.6, D2, 0.0, 0.18 if hi else 0.9)
    floor = C.obj("floor", fb, ["floor"], smooth=False)
    uv_norm(floor, 10.0)
    # painted bay outline + drain channel
    lb = bmesh.new()
    lw = 0.07
    x0, x1, y0, y1 = -2.75, 2.75, -2.05, 2.05
    for a, b in (((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))):
        cx, cy = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        sx = abs(b[0] - a[0]) + lw
        sy = abs(b[1] - a[1]) + lw
        rbox((sx if sx > lw * 1.5 else lw, sy if sy > lw * 1.5 else lw, 0.002), (cx, cy, 0.001), bm=lb)
    # hatch at the posts
    for sg in (1, -1):
        for k in range(5):
            b = C.box((0.05, 0.55, 0.002))
            C.xform(b, rot=Matrix.Rotation(math.radians(40), 3, "Z"), loc=(LIFT_X - 0.4 + k * 0.2, sg * (LIFT_Y + 0.05), 0.001))
            C.merge(lb, b)
    lines = C.obj("floor_lines", lb, ["line_yellow"], smooth=False)
    db = bmesh.new()
    rbox((2 * W2 - 0.1, 0.16, 0.012), (0, -D2 + 0.35, 0.004), mat=0, bm=db)
    if hi:
        for k in range(int((2 * W2 - 0.2) / 0.035)):
            rbox((0.012, 0.15, 0.004), (-W2 + 0.12 + k * 0.035, -D2 + 0.35, 0.012), mat=0, bm=db)
    drain = C.obj("drain", db, ["steel_dark"], smooth=False)
    floor = join([floor, lines, drain], "floor")

    t = 0.22
    wb = bmesh.new()
    # side walls (inner faces look to the room)
    wall_box(wb, (-W2, -D2, 0), (0, 1, 0), (1, 0, 0), 0, 2 * D2, 0, HT, t, cell)
    # right wall with a high window strip (y -2 .. 2, z 2.8 .. 3.6)
    wy0, wy1, wz0, wz1 = 1.5, 5.5, 2.8, 3.6  # along u (from y = -D2)
    wall_box(wb, (W2, -D2, 0), (0, 1, 0), (-1, 0, 0), 0, 2 * D2, 0, wz0, t, cell)
    wall_box(wb, (W2, -D2, 0), (0, 1, 0), (-1, 0, 0), 0, 2 * D2, wz1, HT, t, cell, band=False)
    wall_box(wb, (W2, -D2, 0), (0, 1, 0), (-1, 0, 0), 0, wy0, wz0, wz1, t, cell, band=False)
    wall_box(wb, (W2, -D2, 0), (0, 1, 0), (-1, 0, 0), wy1, 2 * D2, wz0, wz1, t, cell, band=False)
    # back wall with the roller door opening (x -1.8 .. 1.8, z 0 .. 3.6)
    dx, dz = 1.8, 3.6
    wall_box(wb, (-W2, D2, 0), (1, 0, 0), (0, -1, 0), -t, W2 - dx, 0, HT, t, cell)
    wall_box(wb, (-W2, D2, 0), (1, 0, 0), (0, -1, 0), W2 + dx, 2 * W2 + t, 0, HT, t, cell)
    wall_box(wb, (-W2, D2, 0), (1, 0, 0), (0, -1, 0), W2 - dx, W2 + dx, dz, HT, t, cell, band=False)
    walls = C.obj("walls", wb, wm, smooth=False, recalc=False)
    uv_norm(walls, 10.0)

    # front: piers + header beam + rolled-up shutter box
    fr = bmesh.new()
    rbox((0.4, 0.4, HT), (-W2 - t / 2 + 0.2, -D2 - 0.1, HT / 2), mat=3, bm=fr)
    rbox((0.4, 0.4, HT), (W2 + t / 2 - 0.2, -D2 - 0.1, HT / 2), mat=3, bm=fr)
    rbox((2 * W2 + t, 0.4, 0.55), (0, -D2 - 0.1, HT - 0.275), mat=3, bm=fr)
    fr2 = bmesh.new()
    C.cyl(0.24, 2 * W2 - 0.4, 24 if hi else 10, loc=(0, -D2 + 0.25, HT - 0.62), axis="X", bm=fr2)
    rbox((2 * W2 - 0.4, 0.5, 0.06), (0, -D2 + 0.25, HT - 0.35), bm=fr2)
    for sg in (1, -1):  # shutter guide rails
        rbox((0.08, 0.12, HT - 0.9), (sg * (W2 - 0.25), -D2 + 0.12, (HT - 0.9) / 2), bm=fr2)
    front = join([C.obj("front_m", fr, wm, smooth=False), C.obj("front_s", fr2, ["galv"], sharp=40)], "front")
    uv_norm(front, 10.0)

    # closed roller door in the back opening: slat profile swept along x
    sb = bmesh.new()
    nsl = int(dz / 0.08)
    prof = []
    for k in range(nsl):
        z = k * 0.08
        prof += [(z, 0.0), (z + 0.01, 0.012), (z + 0.066, 0.012), (z + 0.074, 0.0)] if hi else [(z, 0.0), (z + 0.07, 0.008)]
    yb = D2 + 0.06
    r0 = [sb.verts.new((-dx - 0.05, yb - d, z)) for z, d in prof]
    r1 = [sb.verts.new((dx + 0.05, yb - d, z)) for z, d in prof]
    for i in range(len(prof) - 1):
        face(sb, (r0[i], r0[i + 1], r1[i + 1], r1[i]), (0, -1, 0))
    rbox((2 * dx, 0.06, 0.08), (0, yb - 0.02, 0.04), mat=1, bm=sb)  # bottom bar
    for sg in (1, -1):
        rbox((0.09, 0.14, dz), (sg * (dx + 0.03), D2 - 0.02, dz / 2), mat=1, bm=sb)
    door = C.obj("door", sb, ["galv", "steel"], smooth=False, recalc=False)
    uv_norm(door, 10.0)

    # roof: sheet + trusses + purlins + skylights
    rb = bmesh.new()
    if hi:  # trapezoidal sheet profile along y, ribs every 0.25 m
        xs = []
        x = -W2 - t
        while x < W2 + t:
            xs += [x, x + 0.05, x + 0.08, x + 0.17, x + 0.20]
            x += 0.25
        prof = []
        for i, x in enumerate(xs):
            k = i % 5
            prof.append((x, 0.035 if k in (2, 3) else 0.0))
    else:
        prof = [(-W2 - t, 0.0), (W2 + t, 0.0)]
    r0 = [rb.verts.new((x, -D2 - 0.3, HT + h)) for x, h in prof]
    r1 = [rb.verts.new((x, D2 + t, HT + h)) for x, h in prof]
    for i in range(len(prof) - 1):
        face(rb, (r0[i], r0[i + 1], r1[i + 1], r1[i]), (0, 0, 1))
    sheet = C.obj("roof_sheet", rb, ["roof_sheet"], smooth=False, recalc=False)
    # the sheet is single sided: add the underside by a flipped copy 1 cm lower
    under = sheet.copy()
    under.data = sheet.data.copy()
    bpy.context.scene.collection.objects.link(under)
    under.data.flip_normals()
    under.data.transform(Matrix.Translation((0, 0, -0.008)))
    tb = bmesh.new()
    for x in (-3.0, 0.0, 3.0):
        ibeam(tb, (x, -D2 - 0.1, HT - 0.52), (x, D2, HT - 0.52), 0.16, 0.09, 0.008, 0.012)
        ibeam(tb, (x, -D2 - 0.1, HT - 0.06), (x, D2, HT - 0.06), 0.12, 0.08, 0.008, 0.012)
        if hi:
            n = 8
            for k in range(n):
                ya = -D2 + 2 * D2 * k / n
                yb2 = -D2 + 2 * D2 * (k + 1) / n
                za, zb = (HT - 0.45, HT - 0.12) if k % 2 == 0 else (HT - 0.12, HT - 0.45)
                box_tube(tb, (x, ya, za), (x, yb2, zb), 0.05, 0.05, up=(1, 0, 0))
    for y in np.linspace(-D2 + 0.4, D2 - 0.4, 6):
        ibeam(tb, (-W2, y, HT - 0.07 + 0.0), (W2, y, HT - 0.07), 0.14 if hi else 0.12, 0.06, 0.006, 0.01, up=(0, 0, 1))
    trusses = C.obj("trusses", tb, ["steel"], smooth=False)
    sk = bmesh.new()
    for x in (-1.5, 1.5):
        rbox((0.9, 5.0, 0.01), (x, 0, HT - 0.005), bm=sk)
    sky = C.obj("skylights", sk, ["window"], smooth=False)
    roof = join([sheet, under, trusses, sky], "roof")
    return floor, walls, front, door, roof


def build_lights(q):
    hi = q == "hi"
    bm = bmesh.new()
    tubes = bmesh.new()
    for x in (-2.6, 0.0, 2.6):
        for y in (-1.6, 1.6):
            z = HT - 0.9
            rbox((1.55, 0.2, 0.06), (x, y, z + 0.03), bevel=0.01 if hi else 0.0, mat=0, bm=bm)
            for dy in (-0.05, 0.05):
                C.cyl(0.016, 1.46, 10 if hi else 6, loc=(x, y + dy, z - 0.01), axis="X", bm=tubes)
            for dx in (-0.6, 0.6):  # hanging chains
                C.cyl(0.004, 0.35, 4, loc=(x + dx, y, z + 0.06 + 0.175), bm=bm)
    lamp = C.obj("fixtures", bm, ["alu"], smooth=False)
    tb = C.obj("tubes", tubes, ["light_panel"])
    wb = bmesh.new()  # window strip in the right wall
    for k in range(4):
        y = -D2 + 1.5 + 0.5 + k * 1.0
        rbox((0.02, 0.92, 0.75), (W2 - 0.12, y, 3.2), bm=wb)
    win = C.obj("window_glass", wb, ["window"], smooth=False)
    fb = bmesh.new()
    for k in range(5):
        y = -D2 + 1.5 + k * 1.0
        rbox((0.06, 0.06, 0.8), (W2 - 0.12, y, 3.2), bm=fb)
    for z in (2.82, 3.58):
        rbox((0.06, 4.0, 0.05), (W2 - 0.12, 0, z), bm=fb)
    frames = C.obj("window_frames", fb, ["steel_dark"], smooth=False)
    return join([lamp, tb, win, frames], "lights")


# ── lift ─────────────────────────────────────────────────────────────────────
def build_lift(q, root):
    hi = q == "hi"
    lift = C.empty("lift", root, loc=(0, 0, 0))
    fb = bmesh.new()
    PH = 3.9
    for sg in (1, -1):
        y = sg * LIFT_Y
        # post: C-channel-ish column (box + inner slot), base plate, top cap
        rbox((0.30, 0.26, PH), (LIFT_X, y + sg * 0.03, PH / 2), bevel=0.012 if hi else 0.0, segs=1, mat=0, bm=fb)
        rbox((0.55, 0.5, 0.02), (LIFT_X, y + sg * 0.05, 0.01), mat=2, bm=fb)
        rbox((0.34, 0.30, 0.05), (LIFT_X, y + sg * 0.03, PH + 0.025), mat=2, bm=fb)
        # hydraulic cylinder + hose on the outer side
        C.cyl(0.045, 2.2, 16 if hi else 8, loc=(LIFT_X + 0.21, y + sg * 0.06, 1.2), bm=fb, mat=1)
        C.cyl(0.03, 2.0, 12 if hi else 6, loc=(LIFT_X + 0.21, y + sg * 0.06, 2.9), bm=fb, mat=3)
        # safety lock cover + label panel
        rbox((0.02, 0.12, 1.6), (LIFT_X - 0.16, y + sg * 0.03, 1.4), mat=2, bm=fb)
        rbox((0.005, 0.16, 0.22), (LIFT_X - 0.152, y + sg * 0.03, 1.6), mat=4, bm=fb)
    # overhead beam with the equaliser / shut-off bar
    box_tube(fb, (LIFT_X, -LIFT_Y - 0.03, PH + 0.1), (LIFT_X, LIFT_Y + 0.03, PH + 0.1), 0.24, 0.18, mat=0)
    box_tube(fb, (LIFT_X - 0.16, -LIFT_Y + 0.2, PH - 0.05), (LIFT_X - 0.16, LIFT_Y - 0.2, PH - 0.05), 0.025, 0.025, mat=3)
    # power unit on one post
    rbox((0.25, 0.25, 0.45), (LIFT_X, -LIFT_Y - 0.28, 1.25), bevel=0.01 if hi else 0.0, mat=2, bm=fb)
    C.cyl(0.08, 0.35, 16 if hi else 8, loc=(LIFT_X, -LIFT_Y - 0.28, 1.65), bm=fb, mat=1)
    frame = C.obj("lift_frame", fb, ["paint_red", "chrome", "steel_dark", "steel", "sign_white"], sharp=40)
    frame.parent = lift
    # carriage (slides up the posts): node origin at floor level so position.y = lift height
    car = C.empty("lift_carriage", lift)
    cb = bmesh.new()
    arms_b = bmesh.new()
    for sg in (1, -1):
        y = sg * LIFT_Y
        rbox((0.26, 0.16, 0.75), (LIFT_X, y - sg * 0.17, 0.52), bevel=0.01 if hi else 0.0, mat=0, bm=cb)
        # arm pivots at the carriage foot, arms reach the car's lifting points
        for tx, L in ((0.85, 1.25), (-0.92, 1.20)):
            p0 = Vector((LIFT_X + (0.08 if tx > 0 else -0.08), y - sg * 0.2, 0.12))
            p1 = Vector((tx, sg * 0.55, 0.12))
            d = (p1 - p0)
            p1 = p0 + d.normalized() * min(L, d.length)
            box_tube(arms_b, p0, p0 + (p1 - p0) * 0.55, 0.11, 0.07, mat=0)  # outer arm
            box_tube(arms_b, p0 + (p1 - p0) * 0.5, p1, 0.085, 0.055, mat=0)  # telescoping inner arm
            C.cyl(0.03, 0.08, 12 if hi else 6, loc=(p0.x, p0.y, 0.12), bm=arms_b, mat=2)
            # screw pad
            C.cyl(0.06, 0.05, 20 if hi else 8, loc=(p1.x, p1.y, 0.18), bm=arms_b, mat=2)
            C.cyl(0.065, 0.02, 20 if hi else 8, loc=(p1.x, p1.y, 0.215), bm=arms_b, mat=1)
    carriage = C.obj("carriage_body", cb, ["paint_red"], sharp=40)
    carriage.parent = car
    arms_e = C.empty("arms", car)
    arms = C.obj("arms_mesh", arms_b, ["paint_red", "rubber", "steel_dark"], sharp=40)
    arms.parent = arms_e
    return lift, [frame, carriage, arms]


# ── props ────────────────────────────────────────────────────────────────────
def tool_cabinet(q, w, d, h, drawers, loc, name, top=False):
    """red roller cabinet: carcass, drawer fronts with alu pull bars, casters, optional top chest"""
    hi = q == "hi"
    bm = bmesh.new()
    x, y, z0 = loc
    base = 0.11
    rbox((w, d, h - base), (x, y, base + (h - base) / 2), bevel=0.01 if hi else 0.0, mat=0, bm=bm)
    rbox((w + 0.02, d + 0.02, 0.012), (x, y, h + 0.006), mat=3, bm=bm)  # worktop mat (rubber)
    # drawers on the front (-y face)
    zc = base + 0.03
    heights = drawers
    tot = sum(heights)
    sc = (h - base - 0.06) / tot
    for hh in heights:
        dh = hh * sc
        rbox((w - 0.05, 0.012, dh - 0.012), (x, y - d / 2 - 0.004, zc + dh / 2), bevel=0.004 if hi else 0.0, mat=0, bm=bm)
        rbox((w - 0.14, 0.022, 0.018), (x, y - d / 2 - 0.016, zc + dh - 0.03), bevel=0.005 if hi else 0.0, mat=1, bm=bm)
        zc += dh
    for sx in (-1, 1):
        for sy in (-1, 1):
            C.cyl(0.045, 0.035, 12 if hi else 6, loc=(x + sx * (w / 2 - 0.07), y + sy * (d / 2 - 0.07), 0.045), axis="Y", bm=bm, mat=3)
            rbox((0.06, 0.06, 0.04), (x + sx * (w / 2 - 0.07), y + sy * (d / 2 - 0.07), 0.09), mat=2, bm=bm)
    # side handle
    C.tube([Vector((x + w / 2 + 0.01, y - d / 3, h - 0.1)), Vector((x + w / 2 + 0.05, y - d / 3, h - 0.1)),
            Vector((x + w / 2 + 0.05, y + d / 3, h - 0.1)), Vector((x + w / 2 + 0.01, y + d / 3, h - 0.1))], 0.012, 8, bm=bm, mat=1)
    if top:
        tw, td, th = w * 0.96, d * 0.8, 0.45
        rbox((tw, td, th), (x, y + (d - td) / 2 - 0.01, h + 0.012 + th / 2), bevel=0.01 if hi else 0.0, mat=0, bm=bm)
        rbox((tw + 0.01, td + 0.01, 0.05), (x, y + (d - td) / 2 - 0.01, h + 0.012 + th + 0.02), bevel=0.01 if hi else 0.0, mat=0, bm=bm)
        zc = h + 0.04
        for k in range(4):
            dh = 0.085
            rbox((tw - 0.05, 0.012, dh - 0.01), (x, y + (d - td) / 2 - 0.01 - td / 2 - 0.004, zc + dh / 2), mat=0, bm=bm)
            rbox((tw - 0.16, 0.02, 0.014), (x, y + (d - td) / 2 - 0.01 - td / 2 - 0.014, zc + dh - 0.02), mat=1, bm=bm)
            zc += dh
    return C.obj(name, bm, ["paint_red", "alu", "steel_dark", "rubber"], sharp=40)


def workbench(q):
    hi = q == "hi"
    x0, x1, y = 2.0, 4.25, D2 - 0.42
    bm = bmesh.new()
    L = x1 - x0
    xc = (x0 + x1) / 2
    for x in (x0 + 0.05, x1 - 0.05):
        for yy in (y - 0.28, y + 0.28):
            box_tube(bm, (x, yy, 0.0), (x, yy, 0.86), 0.05, 0.05, mat=0)
    for yy in (y - 0.28, y + 0.28):
        box_tube(bm, (x0 + 0.05, yy, 0.82), (x1 - 0.05, yy, 0.82), 0.05, 0.05, mat=0)
    rbox((L - 0.1, 0.56, 0.02), (xc, y, 0.18), mat=0, bm=bm)  # lower shelf
    frame = C.obj("bench_frame", bm, ["paint_grey"], sharp=40)
    tb = bmesh.new()
    rbox((L, 0.7, 0.05), (xc, y, 0.885), bevel=0.004 if hi else 0.0, bm=tb)
    top = C.obj("bench_top", tb, ["wood"], sharp=40)
    norm_uv(top)
    C.uv_box(top, 1.0)
    uvn_scale(top, 2.4)
    # vice at the left end
    vb = bmesh.new()
    vx = x0 + 0.25
    rbox((0.18, 0.2, 0.09), (vx, y - 0.22, 0.955), bevel=0.01 if hi else 0.0, bm=vb)
    rbox((0.16, 0.05, 0.1), (vx, y - 0.36, 0.96), bevel=0.008 if hi else 0.0, bm=vb)
    rbox((0.16, 0.05, 0.1), (vx, y - 0.28, 0.96), bevel=0.008 if hi else 0.0, bm=vb)
    C.cyl(0.012, 0.28, 10, loc=(vx, y - 0.45, 0.945), axis="Y", bm=vb, mat=1)
    C.cyl(0.008, 0.2, 8, loc=(vx, y - 0.58, 0.945), axis="X", bm=vb, mat=1)
    vice = C.obj("vice", vb, ["paint_blue", "chrome"], sharp=40)
    # pegboard on the back wall above the bench
    pb = bmesh.new()
    pv = [pb.verts.new(p) for p in ((x0 + 0.1, D2 - 0.02, 1.05), (x0 + 2.1, D2 - 0.02, 1.05),
                                   (x0 + 2.1, D2 - 0.02, 2.05), (x0 + 0.1, D2 - 0.02, 2.05))]
    face(pb, pv, (0, -1, 0))
    rbox((2.04, 0.015, 1.04), (x0 + 1.1, D2 - 0.012, 1.55), mat=1, bm=pb)
    peg = C.obj("pegboard", pb, ["pegboard", "paint_grey"], smooth=False, recalc=False)
    me = peg.data
    uvl = me.uv_layers.get("UVMap") or me.uv_layers.new(name="UVMap")
    for p in me.polygons:
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uvl.data[li].uv = (min(1, max(0, (co.x - x0 - 0.1) / 2.0)), min(1, max(0, (co.z - 1.05) / 1.0)))
    # a few objects on the bench: toolbox case, oil can
    ob = bmesh.new()
    rbox((0.45, 0.22, 0.2), (x0 + 1.2, y + 0.05, 1.01), bevel=0.02 if hi else 0.0, bm=ob)
    C.cyl(0.07, 0.24, 16 if hi else 8, loc=(x0 + 1.75, y + 0.12, 1.03), bm=ob, mat=1)
    stuff = C.obj("bench_stuff", ob, ["paint_red", "paint_blue"], sharp=40)
    return join([frame, top, vice, peg, stuff], "workbench")


def uvn_scale(ob, L):
    """rescale existing UVs by 1/L and clamp into [0,1] (quantizable)"""
    uv = ob.data.uv_layers.active.data
    a = np.zeros(len(uv) * 2, np.float32)
    uv.foreach_get("uv", a)
    a = a.reshape(-1, 2) / L
    a -= a.min(0)
    uv.foreach_set("uv", np.clip(a, 0, 1).ravel())


def tyre_mesh(bm, loc, R=0.315, w=0.205, rb=0.21, segs=48, tread=True):
    prof = [(rb, -w * 0.42), (rb + 0.03, -w * 0.52), (R - 0.03, -w * 0.52), (R - 0.004, -w * 0.46), (R, -w * 0.35),
            (R, w * 0.35), (R - 0.004, w * 0.46), (R - 0.03, w * 0.52), (rb + 0.03, w * 0.52), (rb, w * 0.42)]
    b = C.lathe(prof, segs, axis="Z")
    if tread:
        for v in b.verts:
            r = math.hypot(v.co.x, v.co.y)
            if r > R - 0.005:
                ang = math.atan2(v.co.y, v.co.x)
                k = 1.0 if (int(ang / (2 * math.pi) * segs) % 2) else 0.992
                v.co.x *= k
                v.co.y *= k
    C.xform(b, loc=loc)
    C.merge(bm, b)


def props(q):
    hi = q == "hi"
    out = []
    # tyre stack in the back-left corner + one leaning
    tb = bmesh.new()
    for k in range(5):
        tyre_mesh(tb, (-3.75, D2 - 0.55, 0.105 + k * 0.212), segs=48 if hi else 20, tread=hi)
    # the last one leans against the stack: rotate it
    tyres = C.obj("tyres", tb, ["rubber"], sharp=50)
    out.append(tyres)
    lean = bmesh.new()
    tyre_mesh(lean, (0, 0, 0), segs=48 if hi else 20, tread=hi)
    C.xform(lean, rot=Matrix.Rotation(math.radians(80), 3, "X"))
    C.xform(lean, rot=Matrix.Rotation(math.radians(20), 3, "Z"), loc=(-3.05, D2 - 0.45, 0.32))
    out.append(C.obj("tyre_lean", lean, ["rubber"], sharp=50))
    # air compressor (front-right, against the right wall)
    cb = bmesh.new()
    cx, cy = W2 - 0.55, -1.9
    prof = [(0.0, -0.62), (0.12, -0.60), (0.2, -0.55), (0.22, -0.48), (0.22, 0.48), (0.2, 0.55), (0.12, 0.60), (0.0, 0.62)]
    b = C.lathe(prof, 32 if hi else 12, axis="Y")
    C.xform(b, loc=(cx, cy, 0.34))
    C.merge(cb, b)
    for dy in (-0.4, 0.4):
        rbox((0.34, 0.05, 0.14), (cx, cy + dy, 0.07), mat=2, bm=cb)
    rbox((0.28, 0.32, 0.22), (cx, cy - 0.2, 0.68), bevel=0.01 if hi else 0.0, mat=1, bm=cb)  # motor
    C.cyl(0.1, 0.3, 16 if hi else 8, loc=(cx, cy + 0.2, 0.7), axis="Y", bm=cb, mat=2)  # pump
    rbox((0.06, 0.5, 0.28), (cx - 0.16, cy, 0.72), bevel=0.01 if hi else 0.0, mat=0, bm=cb)  # belt guard
    C.cyl(0.04, 0.03, 12, loc=(cx - 0.12, cy + 0.45, 0.62), axis="X", bm=cb, mat=3)  # gauge
    out.append(C.obj("compressor", cb, ["paint_red", "paint_grey", "steel_dark", "chrome"], sharp=40))
    # 200 L drum + oil drain caddy
    db = bmesh.new()
    prof = [(0.0, 0.0), (0.29, 0.0), (0.295, 0.01), (0.295, 0.28), (0.302, 0.29), (0.295, 0.30), (0.295, 0.58),
            (0.302, 0.59), (0.295, 0.60), (0.295, 0.87), (0.29, 0.88), (0.0, 0.88)]
    b = C.lathe(prof, 32 if hi else 12, axis="Z")
    C.xform(b, loc=(-3.95, -1.3, 0.0))
    C.merge(db, b)
    out.append(C.obj("drum", db, ["paint_blue"], sharp=40))
    ob = bmesh.new()
    ox, oy = 1.85, 2.3
    prof = [(0.0, 0.25), (0.22, 0.25), (0.24, 0.3), (0.24, 0.85), (0.22, 0.88), (0.0, 0.88)]
    b = C.lathe(prof, 24 if hi else 10, axis="Z")
    C.xform(b, loc=(ox, oy, 0))
    C.merge(ob, b)
    b = C.lathe([(0.03, 0.9), (0.05, 1.3), (0.28, 1.45), (0.29, 1.5)], 24 if hi else 10, axis="Z")
    C.xform(b, loc=(ox, oy, 0))
    C.merge(ob, b)
    C.cyl(0.02, 0.5, 8, loc=(ox, oy, 1.12), bm=ob, mat=1)
    for k in range(3):
        a = 2 * math.pi * k / 3
        C.cyl(0.035, 0.03, 10, loc=(ox + 0.2 * math.cos(a), oy + 0.2 * math.sin(a), 0.04), axis="X", bm=ob, mat=2)
        box_tube(ob, (ox, oy, 0.25), (ox + 0.2 * math.cos(a), oy + 0.2 * math.sin(a), 0.07), 0.03, 0.03, mat=1)
    out.append(C.obj("oil_drain", ob, ["paint_yellow", "steel_dark", "rubber"], sharp=40))
    # hose reel on the right wall
    hb = bmesh.new()
    hx, hy, hz = W2 - 0.2, 0.6, 2.1
    b = C.lathe([(0.0, -0.1), (0.22, -0.1), (0.22, -0.09), (0.08, -0.09), (0.08, 0.09), (0.22, 0.09), (0.22, 0.1), (0.0, 0.1)],
                32 if hi else 12, axis="X")
    C.xform(b, loc=(hx, hy, hz))
    C.merge(hb, b)
    rbox((0.04, 0.3, 0.35), (W2 - 0.02, hy, hz), mat=1, bm=hb)
    reel = C.obj("reel", hb, ["paint_red", "steel_dark"], sharp=40)
    hs = bmesh.new()
    C.torus(0.13, 0.012 * 7, 32 if hi else 12, 8, loc=(0, 0, 0), axis="X", bm=hs, mat=0)
    C.xform(hs, loc=(hx, hy, hz))
    hose = C.obj("hose", hs, ["hose_orange"], sharp=50)
    hpath = C.bezier_path([(hx - 0.05, hy - 0.2, hz - 0.1), (hx - 0.25, hy - 0.4, 1.2), (hx - 0.35, hy - 0.5, 0.3),
                           (hx - 0.8, hy - 0.7, 0.02), (hx - 1.3, hy - 0.4, 0.02)], 8 if hi else 3)
    hose2 = C.obj("hose2", C.tube(hpath, 0.011, 8 if hi else 5), ["hose_orange"])
    out += [reel, hose, hose2]
    # fire extinguisher + safety sign panels (no text: pictogram-free colour panels)
    eb = bmesh.new()
    ex, ey = -W2 + 0.18, -2.6
    b = C.lathe([(0.0, 0.0), (0.08, 0.0), (0.085, 0.02), (0.085, 0.5), (0.07, 0.56), (0.03, 0.6), (0.0, 0.6)], 20 if hi else 8)
    C.xform(b, loc=(ex, ey, 0.9))
    C.merge(eb, b)
    rbox((0.02, 0.12, 0.12), (-W2 + 0.02, ey, 1.62), mat=1, bm=eb)
    rbox((0.015, 0.3, 0.3), (-W2 + 0.01, ey, 1.9), mat=2, bm=eb)
    rbox((0.015, 0.5, 0.35), (-W2 + 0.01, 0.4, 2.2), mat=3, bm=eb)
    rbox((0.02, 0.46, 0.08), (-W2 + 0.012, 0.4, 2.3), mat=2, bm=eb)
    out.append(C.obj("safety", eb, ["paint_red", "steel_dark", "sign_green", "sign_white"], sharp=40))
    # creeper board + jack stands near the lift
    kb = bmesh.new()
    rbox((1.0, 0.45, 0.03), (-1.1, -2.6, 0.1), bevel=0.012 if hi else 0.0, mat=0, bm=kb)
    for sx in (-0.4, 0.4):
        for sy in (-0.17, 0.17):
            C.cyl(0.03, 0.03, 10, loc=(-1.1 + sx, -2.6 + sy, 0.045), axis="Y", bm=kb, mat=1)
    for k, (jx, jy) in enumerate(((-3.2, -2.9), (-2.9, -2.95))):
        b = C.cyl(0.13, 0.42, 4, loc=(jx, jy, 0.21), r2=0.035)
        C.merge(kb, b)
        C.cyl(0.02, 0.2, 8, loc=(jx, jy, 0.5), bm=kb, mat=2)
    out.append(C.obj("floor_kit", kb, ["paint_red", "rubber", "steel"], sharp=40))
    # steel shelving rack with parts boxes and oil bottles (back wall, left)
    sb = bmesh.new()
    rx0, rx1, ry = -3.15, -1.95, D2 - 0.33
    for x in (rx0, rx1):
        for y in (ry - 0.22, ry + 0.22):
            box_tube(sb, (x, y, 0), (x, y, 2.1), 0.04, 0.04, mat=0)
    for z in (0.12, 0.62, 1.12, 1.62, 2.08):
        rbox((rx1 - rx0 + 0.04, 0.48, 0.02), ((rx0 + rx1) / 2, ry, z), mat=1, bm=sb)
    rng = np.random.default_rng(7)
    for z in (0.13, 0.63, 1.13, 1.63):
        x = rx0 + 0.05
        while x < rx1 - 0.12:
            if rng.random() < 0.55:
                w = rng.uniform(0.18, 0.34)
                hgt = rng.uniform(0.14, 0.36)
                rbox((w, rng.uniform(0.25, 0.4), hgt), (x + w / 2, ry + rng.uniform(-0.04, 0.04), z + 0.01 + hgt / 2),
                     mat=2, bm=sb)
                x += w + 0.03
            else:
                for k in range(int(rng.integers(2, 5))):
                    C.cyl(0.05, 0.26, 12 if hi else 6, loc=(x + 0.05, ry - 0.1 + k * 0.1, z + 0.14),
                          bm=sb, mat=int(rng.integers(3, 6)))
                x += 0.13
    out.append(C.obj("shelving", sb, ["paint_blue", "galv", "cardboard", "paint_red", "paint_yellow", "oil_black"], sharp=40))
    # poster / notice board panels (colour blocks only) and a waste bin
    nb = bmesh.new()
    rbox((0.015, 0.9, 0.6), (-W2 + 0.012, -1.6, 2.0), mat=0, bm=nb)
    for k, (dy, dz, w, h) in enumerate(((-0.2, 0.08, 0.35, 0.25), (0.2, 0.1, 0.3, 0.2), (0.0, -0.15, 0.7, 0.12))):
        rbox((0.018, w, h), (-W2 + 0.014, -1.6 + dy, 2.0 + dz), mat=1 + (k % 2), bm=nb)
    b = C.lathe([(0.0, 0.0), (0.2, 0.0), (0.23, 0.6), (0.21, 0.62)], 20 if hi else 8)
    C.xform(b, loc=(3.7, 2.2, 0))
    C.merge(nb, b)
    for f in nb.faces[-40:]:
        pass
    out.append(C.obj("notices", nb, ["cork", "sign_white", "paint_yellow"], sharp=40))
    return out


def stain_floor(floor):
    """oil blots under the lift and around the drain caddy, multiplied into COLOR_0 before the AO bake"""
    me = floor.data
    ca = C.vcol_fill(floor)
    n = len(ca.data)
    col = np.ones((n, 4), np.float32)
    rng = np.random.default_rng(3)
    blots = [(LIFT_X + rng.uniform(-1.6, 1.6), rng.uniform(-0.8, 0.8), rng.uniform(0.15, 0.5)) for _ in range(9)]
    blots += [(1.85, 2.3, 0.45), (1.6, 2.0, 0.3), (-3.8, -1.2, 0.5), (3.9, -1.9, 0.4), (0.9, -0.2, 0.6)]
    for li, lp in enumerate(me.loops):
        co = me.vertices[lp.vertex_index].co
        k = 1.0
        for bx, by, br in blots:
            d = math.hypot(co.x - bx, co.y - by) / br
            if d < 1.6:
                k *= 1 - 0.35 * math.exp(-d * d * 2.2)
        # tyre tracks entering from the open side
        for ty in (-0.77, 0.77):
            d = abs(co.y - ty) / 0.12
            if co.x > -2.0 and d < 2:
                k *= 1 - 0.10 * math.exp(-d * d) * min(1, (co.x + 2.0) / 3)
        col[li, :3] = k
    ca.data.foreach_set("color", col.ravel())


def build(q):
    hi = q == "hi"
    mats(q)
    root = C.empty("garage")
    floor, walls, front, door, roof = build_room(q)
    lights = build_lights(q)
    for o in (floor, walls, front, door, roof, lights):
        o.parent = root
    lift, lift_parts = build_lift(q, root)
    tb1 = tool_cabinet(q, 1.05, 0.47, 1.0, [1, 1, 1, 1.4, 1.4, 2, 2], (-W2 + 0.45, 0.9, 0), "toolbox_1_mesh", top=True)
    tb1.data.transform(Matrix.Rotation(math.radians(-90), 4, "Z"))  # drawers face the room (+x)
    tb1.data.transform(Matrix.Translation((0, 0, 0)))
    tb1.location = (0, 0, 0)
    # rotate about its own centre: move to the wall
    me = tb1.data
    c = sum((v.co for v in me.vertices), Vector()) / len(me.vertices)
    me.transform(Matrix.Translation((-W2 + 0.3 - c.x, 0.9 - c.y, 0)))
    t1 = C.empty("toolbox_1", root)
    tb1.parent = t1
    tb2 = tool_cabinet(q, 0.72, 0.42, 0.86, [1, 1, 1.5, 2], (0, 0, 0), "toolbox_2_mesh", top=False)
    me = tb2.data
    me.transform(Matrix.Rotation(math.radians(-25), 4, "Z"))
    me.transform(Matrix.Translation((-1.45, 2.35, 0)))
    t2 = C.empty("toolbox_2", root)
    tb2.parent = t2
    parts = [tb1, tb2]
    if hi:  # a second cabinet next to the first
        tb3 = tool_cabinet(q, 0.72, 0.47, 1.0, [1, 1, 1, 1.4, 2, 2], (0, 0, 0), "toolbox_3_mesh")
        me = tb3.data
        me.transform(Matrix.Rotation(math.radians(-90), 4, "Z"))
        c = sum((v.co for v in me.vertices), Vector()) / len(me.vertices)
        me.transform(Matrix.Translation((-W2 + 0.3 - c.x, -0.15 - c.y, 0)))
        t3 = C.empty("toolbox_3", root)
        tb3.parent = t3
        parts.append(tb3)
    wbn = workbench(q)
    wbe = C.empty("workbench_node", root)
    wbn.name = "workbench"
    wbn.parent = root
    bpy.data.objects.remove(wbe)
    pr = props(q) if True else []
    if not hi:
        keep = {"tyres", "compressor", "drum", "reel", "hose", "safety", "shelving"}
        for o in list(pr):
            if o.name not in keep:
                bpy.data.objects.remove(o)
                pr.remove(o)
    prop_o = join(pr, "props")
    prop_o.parent = root
    meshes = [floor, walls, front, door, roof, lights, wbn, prop_o] + lift_parts + parts
    for o in meshes:
        if o.type == "MESH":
            C.smooth_by_angle(o, 40)
    # AO: the room occludes itself (contact shadows under cabinets, lift, drum; corners)
    big = [floor, walls, front, door, roof]
    stain_floor(floor)
    small = [lights, wbn, prop_o] + lift_parts + parts
    C.bake_ao_vcol(big, samples=96 if hi else 32, max_dist=1.2, floor=0.28)
    C.bake_ao_vcol(small, samples=48 if hi else 16, max_dist=0.35, floor=0.3)
    return root


def still(a):
    """Cycles still of the PUBLISHED garage with the published car parked between the lift posts"""
    C.reset()
    root = os.path.join(C.HERE, "..", "public", "lib3d")
    bpy.ops.import_scene.gltf(filepath=os.path.join(root, "garage-hi-v1.glb"))
    if not a.get("nocar"):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(root, "car-hi-v1.glb"))
        for o in set(bpy.data.objects) - before:
            if o.parent is None:
                o.location.x += 0.1
    for m in bpy.data.materials:  # emissive tubes / skylights light the room in the path tracer
        if m.name.startswith(("light_panel", "window")) and m.node_tree:
            for n in m.node_tree.nodes:
                if n.type == "BSDF_PRINCIPLED":
                    n.inputs["Emission Strength"].default_value = 40.0 if m.name.startswith("light") else 6.0
    cam = tuple(float(v) for v in a.get("cam", "4.2,-7.8,1.7").split(","))
    tgt = tuple(float(v) for v in a.get("tgt", "-0.2,0.6,1.0").split(","))
    C.look(a.get("still"), target=tgt, cam=cam, fov=float(a.get("fov", "46")),
           hdr=os.path.join(root, "env", a.get("env", "garage") + "-1k-v1.hdr"), ground=False,
           spp=int(a.get("spp", "256")), res=(1600, 1000), exposure=float(a.get("exp", "0")))


if __name__ == "__main__" and C.args().get("still"):
    still(C.args())
elif __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    C.reset()
    root = build(q)
    if a.get("look"):
        H = os.path.join(C.HERE, "..", "public/lib3d/env/")
        views = {"in": ((3.8, -6.5, 2.0), (0, 0.5, 1.2), 50), "wide": ((6.5, -9.5, 3.5), (0, 0, 1.4), 40),
                 "back": ((-2.5, -2.8, 1.6), (1.5, 3.0, 1.2), 55), "left": ((2.0, -2.0, 1.5), (-4.0, 1.0, 1.0), 60),
                 "peg": ((3.1, 1.2, 1.6), (3.1, 3.5, 1.5), 50)}
        for k in a.get("views", "in,wide").split(","):
            cam, tgt, fov = views[k]
            C.look(f"/tmp/l3d/garage_{k}.png", target=tgt, cam=cam, fov=fov, hdr=H + a.get("env", "garage") + "-1k-v1.hdr",
                   ground=False, spp=int(a.get("spp", "48")), res=(1200, 750))
    if a.get("out") or not a.get("look"):
        C.finish("garage", q, root, a.get("out"))
