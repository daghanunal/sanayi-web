"""Sports front car seat (döşeme / upholstery): sculpted cushion + backrest with side bolsters, pleated centre
inserts, contrast double stitching, piping, separate headrest on posts, plastic side shield with recline knob,
seat rails. Real scale, faces three +X, origin on the floor under the rails.

  Blender -b --factory-startup --python assets3d/build_seat.py -- --q hi --out /tmp/seat-hi.glb [--look /tmp/x.png]

Nodes (three.js):  seat > base (rails, frame, shield), cushion, backrest (pivot on the recline hinge:
  rotation.z += a reclines; rest value 0.30 rad) > headrest (slides along its local +Y), variants (hidden swatches).
Material variant contract (lib3d setVariant(slot, variant)):
  upholstery_leather (default, bolsters / sides / headrest), upholstery_fabric, upholstery_alcantara, upholstery_quilted
  insert_leather (default, perforated centre panels), insert_fabric, insert_alcantara, insert_quilted (diamond kapitone)
  -> seat.setVariant('upholstery', 'alcantara'); seat.setVariant('insert', 'quilted')
  Non-default variants ride on hidden 1-quad meshes under "variants" (extras.swatch = 1, scale 0.001).
Other materials: stitch (alpha-masked thread, recolour via .color), shell (satin plastic back / shield),
  railmetal, chrome, frame. Every upholstery / insert material's colour factor can be recoloured too.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

import common as C
import texgen as T

TILT = math.radians(17)  # backrest lean from vertical
HINGE = Vector((-0.235, 0.0, 0.305))
UVK = 0.5  # uv = metres * UVK (keeps every pad inside 0..1); texture repeat = UVK / tile


# ── textures ─────────────────────────────────────────────────────────────────
def voronoi_grid(n, g, seed=0):
    """fast tileable voronoi on a jittered g x g grid: returns F1, F2 (in cell units)"""
    rng = np.random.default_rng(seed)
    jit = rng.random((g, g, 2)).astype(np.float32)
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    px = (xx + 0.5) / n * g
    py = (yy + 0.5) / n * g
    cx = np.floor(px).astype(int)
    cy = np.floor(py).astype(int)
    f1 = np.full((n, n), 9.0, np.float32)
    f2 = np.full((n, n), 9.0, np.float32)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            ix = (cx + dx) % g
            iy = (cy + dy) % g
            fx = cx + dx + jit[iy, ix, 0]
            fy = cy + dy + jit[iy, ix, 1]
            d = np.sqrt((px - fx) ** 2 + (py - fy) ** 2)
            f2 = np.where(d < f1, f1, np.minimum(f2, d))
            f1 = np.minimum(f1, d)
    return f1, f2


def leather_maps(n, seed=8, perforated=False, quilted=False):
    """nappa pebble grain (voronoi valleys) -> albedo (near white, colour goes in the factor), orm, normal"""
    f1, f2 = voronoi_grid(n, max(24, n // 7), seed)
    edge = np.clip((f2 - f1) * 2.2, 0, 1)
    pebble = np.sqrt(edge)
    fine = T.fbm(n, n, base=16, octaves=4, seed=seed + 1)
    h = pebble * 0.8 + 0.35 * fine
    lum = 0.88 + 0.10 * (pebble - 0.5) + 0.06 * (fine - 0.5)
    rough = np.clip(0.52 + 0.14 * (0.6 - pebble) + 0.05 * (fine - 0.5), 0, 1)
    ao = 1 - 0.25 * (1 - pebble)
    if perforated:  # hex grid of 1.2 mm holes: 8 x 9 per tile
        yy, xx = np.mgrid[0:n, 0:n].astype(np.float32) / n
        k = 12
        gx = xx * k
        gy = yy * k * 1.1547
        row = np.floor(gy)
        gx2 = gx + 0.5 * (row % 2)
        dx = gx2 - np.floor(gx2) - 0.5
        dy = gy - row - 0.5
        d = np.sqrt(dx * dx + (dy / 1.1547) ** 2)
        hole = np.clip((0.12 - d) * n / k * 0.5, 0, 1)
        h = h * (1 - hole) - 1.6 * hole
        lum = lum * (1 - 0.85 * hole)
        ao = ao * (1 - 0.7 * hole)
        rough = rough + 0.3 * hole
    if quilted:  # diamond kapitone: puffy cells with stitched valleys (one diamond per tile)
        yy, xx = np.mgrid[0:n, 0:n].astype(np.float32) / n
        u = (xx + yy) % 1.0
        v = (xx - yy) % 1.0
        du = np.minimum(u, 1 - u)
        dv = np.minimum(v, 1 - v)
        dd = np.minimum(du, dv)
        puff = np.sqrt(np.clip(dd / 0.5, 0, 1))
        seam = np.clip(1 - dd / 0.012, 0, 1)
        h = h * 0.35 + 9.0 * puff
        ao = ao * (0.55 + 0.45 * puff)
        lum = lum * (0.8 + 0.2 * puff)
        # thread dashes along the valleys
        along = ((xx + yy) + (xx - yy)) * 18
        dash = (np.sin(along * math.pi * 2) > -0.2).astype(np.float32) * np.clip(1 - dd / 0.006, 0, 1)
        lum = lum * (1 - 0.4 * seam) + 0.9 * dash
        rough = rough + 0.2 * seam
    alb = T.gray3(np.clip(lum, 0, 1))
    return alb, T.orm(np.clip(ao, 0, 1), np.clip(rough, 0, 1), 0), T.normal_from_height(h, 2.2 if not quilted else 1.6)


def fabric_maps(n, seed=9):
    a, o, nn = T.fabric(n, seed=seed, rgb=(1, 1, 1), rough=0.92, weave=n // 8)
    return np.clip(a * 0.9, 0, 1), o, nn


def alcantara_maps(n, seed=10):
    a, o, nn = T.alcantara(n, seed=seed, rgb=(1, 1, 1), rough=0.96)
    f = T.fbm(n, n, base=16, octaves=4, seed=seed + 5)
    o = T.orm(np.ones((n, n), np.float32), np.clip(0.93 + 0.06 * (f - 0.5), 0, 1), 0)  # nap: brushed areas shinier
    return np.clip(a * 0.85, 0, 1), o, nn


def stitch_tex():
    """alpha mask: two rows of thread dashes, 4 periods across (u), rows at v 0.28 / 0.72"""
    W, H = 128, 32
    a = np.zeros((H, W), np.float32)
    rgb = np.ones((H, W, 3), np.float32)
    for vc in (0.27, 0.73):
        r0, r1 = int((vc - 0.15) * H), int((vc + 0.15) * H)
        for k in range(4):
            c0, c1 = int((k + 0.10) * W / 4), int((k + 0.82) * W / 4)
            a[r0:r1, c0:c1] = 1.0
            # thread twist shading
            for c in range(c0, c1):
                rgb[r0:r1, c] *= 0.82 + 0.18 * math.sin((c - c0) / (c1 - c0) * math.pi)
    return np.concatenate([rgb, a[..., None]], -1)


# ── materials ────────────────────────────────────────────────────────────────
def tex_mat(name, color, alb, orm, nrm, repeat, nstr=1.0, sheen=None, coat=0.0, coat_rough=0.3, spec=None):
    """albedo(near white) x colour factor -> baseColor (so sites can recolour), orm, normal, KHR_texture_transform"""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for nd in list(nt.nodes):
        nt.nodes.remove(nd)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.uv_map = "UVMap"
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (repeat, repeat, 1)
    nt.links.new(uv.outputs["UV"], mp.inputs["Vector"])

    def tx(img, non):
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = img
        if non:
            img.colorspace_settings.name = "Non-Color"
        nt.links.new(mp.outputs["Vector"], t.inputs["Vector"])
        return t

    ta = tx(alb, False)
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    mix.inputs[7].default_value = (*color, 1)
    nt.links.new(ta.outputs["Color"], mix.inputs[6])
    nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    to = tx(orm, True)
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(to.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], b.inputs["Roughness"])
    nt.links.new(sep.outputs["Blue"], b.inputs["Metallic"])
    g = nt.nodes.new("ShaderNodeGroup")
    g.node_tree = C._gltf_output_group()
    nt.links.new(sep.outputs["Red"], g.inputs["Occlusion"])
    tn = tx(nrm, True)
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nm.inputs["Strength"].default_value = nstr
    nt.links.new(tn.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    if sheen:
        b.inputs["Sheen Weight"].default_value = 1.0
        b.inputs["Sheen Tint"].default_value = (*sheen[0], 1)
        b.inputs["Sheen Roughness"].default_value = sheen[1]
    if coat:
        b.inputs["Coat Weight"].default_value = coat
        b.inputs["Coat Roughness"].default_value = coat_rough
    if spec is not None:
        b.inputs["Specular IOR Level"].default_value = spec
    m.use_backface_culling = True
    C.MATS[name] = m
    return m


def stitch_mat(color):
    img = C.image("stitch_mask", stitch_tex())
    m = bpy.data.materials.new("stitch")
    m.use_nodes = True
    nt = m.node_tree
    for nd in list(nt.nodes):
        nt.nodes.remove(nd)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(b.outputs["BSDF"], out.inputs["Surface"])
    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.uv_map = "UVMap"
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (100.0, 1.0, 1)  # u = metres * UVK -> 200 dashes per metre (5 mm pitch)
    nt.links.new(uv.outputs["UV"], mp.inputs["Vector"])
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = img
    nt.links.new(mp.outputs["Vector"], t.inputs["Vector"])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 1.0
    mix.inputs[7].default_value = (*color, 1)
    nt.links.new(t.outputs["Color"], mix.inputs[6])
    nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    rnd = nt.nodes.new("ShaderNodeMath")
    rnd.operation = "GREATER_THAN"  # glTF exporter -> alphaMode MASK, alphaCutoff 0.3 (mips keep the thread)
    rnd.inputs[1].default_value = 0.3
    nt.links.new(t.outputs["Alpha"], rnd.inputs[0])
    nt.links.new(rnd.outputs[0], b.inputs["Alpha"])
    b.inputs["Roughness"].default_value = 0.55
    m.surface_render_method = "DITHERED"
    m.use_backface_culling = False
    C.MATS["stitch"] = m
    return m


def seat_mats(q):
    hi = q == "hi"
    n = 512 if hi else 256
    leather_col = C.srgb("#1c1c1e")
    L = leather_maps(n, 8)
    Lp = leather_maps(n, 18, perforated=True)
    Lq = leather_maps(n, 28, quilted=True)
    F = fabric_maps(n, 9)
    A = alcantara_maps(n, 10)
    imgs = {}
    for k, (a, o, nn) in {"leather": L, "perf": Lp, "quilt": Lq, "fabric": F, "alcantara": A}.items():
        imgs[k] = (C.image(f"{k}_alb", a), C.image(f"{k}_orm", o, False), C.image(f"{k}_n", nn, False))
    # repeats: uv = metres * UVK -> repeat = 1 / (UVK * tile); tile sizes: leather 9 cm, perforation 6 cm (12 holes -> 5 mm pitch), fabric 5 cm,
    # alcantara 20 cm, quilting 9 cm diamonds
    rp = lambda tile: 1.0 / (UVK * tile)
    tex_mat("upholstery_leather", leather_col, *imgs["leather"], rp(0.09), 0.55, sheen=(C.srgb("#6a6a70"), 0.35), coat=0.15)
    tex_mat("upholstery_fabric", C.srgb("#26272a"), *imgs["fabric"], rp(0.05), 1.0, sheen=(C.srgb("#303034"), 0.6))
    tex_mat("upholstery_alcantara", C.srgb("#1e1e21"), *imgs["alcantara"], rp(0.20), 0.8, sheen=(C.srgb("#3c3c42"), 0.8), spec=0.3)
    tex_mat("upholstery_quilted", leather_col, *imgs["leather"], rp(0.09), 0.55, sheen=(C.srgb("#6a6a70"), 0.35), coat=0.25, coat_rough=0.2)
    tex_mat("insert_leather", C.srgb("#202022"), *imgs["perf"], rp(0.06), 1.0, sheen=(C.srgb("#6a6a70"), 0.35), coat=0.1)
    tex_mat("insert_fabric", C.srgb("#2c2d31"), *imgs["fabric"], rp(0.05), 1.0, sheen=(C.srgb("#303034"), 0.6))
    tex_mat("insert_alcantara", C.srgb("#242427"), *imgs["alcantara"], rp(0.20), 0.8, sheen=(C.srgb("#3c3c42"), 0.8), spec=0.3)
    tex_mat("insert_quilted", leather_col, *imgs["quilt"], rp(0.09), 1.0, sheen=(C.srgb("#6a6a70"), 0.35), coat=0.25, coat_rough=0.2)
    stitch_mat(C.srgb("#c0392b"))
    ta, to, tn = T.textured_plastic(n, seed=7, lum=0.03, rough=0.55)
    C.material("shell", (1, 1, 1), albedo=C.image("shell_alb", ta), orm=C.image("shell_orm", to, False),
               normal=C.image("shell_n", tn, False), normal_strength=0.5, vcol=True, uv_scale=(1 / (UVK * 0.1), 1 / (UVK * 0.1)))
    C.material("railmetal", C.srgb("#8d9096"), 0.38, 1.0, vcol=True)
    C.material("frame", C.srgb("#1a1b1d"), 0.55, 0.6, vcol=True)
    C.material("chrome", C.srgb("#e4e5e8"), 0.07, 1.0, vcol=True)
    C.material("underside", C.srgb("#101012"), 0.9, 0.0, vcol=True)


# ── pads ─────────────────────────────────────────────────────────────────────
def mirror_loop(half):
    """half profile from the top/front centre (y=0) around the +y side to the bottom/back centre (y=0)
    -> closed loop (list of (y, t))"""
    return half + [(-y, t) for y, t in half[-2:0:-1]]


def cushion_half(s, L, pleat):
    """cushion section at depth s (0 rear .. L front): (y, height) half loop, cage for subsurf"""
    u = s / L
    c = 0.078 + 0.014 * math.sin(math.pi * min(1, u * 1.1))  # centre height
    b = 0.62 + 0.38 * math.sin(math.pi * min(1.0, 0.15 + u * 0.95))  # bolster factor (peak mid-thigh)
    d = 0.007 if pleat else 0.0
    half = [(0.0, c - d), (0.07, c - 0.002 - d), (0.13, c - 0.006 - d), (0.150, c - 0.010), (0.158, c - 0.026),
            (0.166, c - 0.012), (0.185, c + 0.022 * b), (0.207, c + 0.058 * b), (0.230, c + 0.070 * b),
            (0.250, c + 0.050 * b), (0.261, c + 0.005), (0.264, 0.035), (0.259, 0.006), (0.235, 0.0), (0.12, 0.0), (0.0, 0.0)]
    return half


def back_half(h, H, pleat):
    """backrest section at height h (0 hinge .. H top): (y, forward t) half loop; back shell at t < 0"""
    u = h / H
    lumbar = 0.022 * math.exp(-((u - 0.28) / 0.16) ** 2)
    c = 0.060 + lumbar
    b = 0.55 + 0.55 * math.exp(-((u - 0.35) / 0.28) ** 2)  # bolsters strongest at the ribs
    ws = 1.0 - 0.13 * max(0.0, (u - 0.45) / 0.55) ** 1.2  # narrower shoulders
    d = 0.007 if pleat else 0.0
    half = [(0.0, c - d), (0.08, c - 0.003 - d), (0.135, c - 0.008 - d), (0.152, c - 0.012), (0.160, c - 0.028),
            (0.168, c - 0.013), (0.188, c + 0.032 * b), (0.210, c + 0.078 * b), (0.232, c + 0.094 * b),
            (0.252, c + 0.066 * b), (0.266, c + 0.012), (0.270, -0.010), (0.262, -0.034), (0.20, -0.046),
            (0.10, -0.050), (0.0, -0.051)]
    return [(y * ws, t) for y, t in half]


def loft_pad(name, sections, mat_fn, hi):
    """sections: list of (v_metres, [3D points loop]); caps both ends (hidden sliver ends).
    UV: u = arc length along the loop, v = distance along the pad (both * UVK)."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    rings = [[bm.verts.new(p) for p in loop] for _, loop in sections]
    n = len(rings[0])
    arcs = []
    for _, loop in sections:
        acc = [0.0]
        for i in range(n):
            acc.append(acc[-1] + (Vector(loop[(i + 1) % n]) - Vector(loop[i])).length)
        arcs.append(acc)
    for k in range(len(rings) - 1):
        a, b = rings[k], rings[k + 1]
        va, vb = sections[k][0], sections[k + 1][0]
        for i in range(n):
            j = (i + 1) % n
            f = bm.faces.new((a[i], a[j], b[j], b[i]))
            f.material_index = mat_fn(i, n, k, len(rings))
            ua, ua2 = arcs[k][i], arcs[k][i + 1]
            ub, ub2 = arcs[k + 1][i], arcs[k + 1][i + 1]
            for lp, uv in zip(f.loops, ((ua, va), (ua2, va), (ub2, vb), (ub, vb))):
                lp[uvl].uv = (0.02 + uv[0] * UVK, 0.02 + uv[1] * UVK)
    for r, flip in ((rings[0], True), (rings[-1], False)):
        f = bm.faces.new(r[::-1] if flip else r)
        f.material_index = 2
    ob = C.obj(name, bm, ["upholstery_leather", "insert_leather", "underside", "shell"], smooth=True, sharp=None)
    C.subsurf(ob, 2 if hi else 1)
    if hi:
        C.decimate(ob, 0.42)  # keeps the curvature where it is, drops the flat interior density
    C.smooth_by_angle(ob, 80)
    return ob


def build_cushion(hi):
    L = 0.50
    pleats = [0.14, 0.215, 0.29, 0.365] if hi else []
    ss = [-0.012, 0.0, 0.04, 0.09] + sorted(set([p + o for p in pleats for o in (-0.007, 0.0, 0.007)] +
                                             [0.14, 0.20, 0.26, 0.33, 0.40])) + [0.44, 0.47, 0.49, 0.503, 0.511]
    if not hi:
        ss = [-0.012, 0.0, 0.08, 0.16, 0.25, 0.34, 0.42, 0.47, 0.495, 0.509]
    ss = sorted(set(round(x, 4) for x in ss))
    x0 = -0.245  # rear edge (s=0) in seat space
    rake = math.radians(5)  # front higher
    sections = []
    for s in ss:
        pleat = any(abs(s - p) < 1e-4 for p in pleats)
        half = cushion_half(min(max(s, 0), L), L, pleat)
        # front roll / rear tuck: squash toward the base
        if s > 0.44:
            k = (s - 0.44) / 0.071
            zs = 1 - 0.85 * k ** 2
            ys = 1 - 0.05 * k
            sx = s - 0.012 * k ** 2
        elif s < 0.0:
            zs, ys, sx = 0.35, 0.97, s
        else:
            zs, ys, sx = 1.0, 1.0, s
        loop = mirror_loop(half)
        pts = []
        for y, t in loop:
            x = x0 + sx
            z = 0.232 + t * zs + (sx) * math.tan(rake)
            pts.append((x, y * ys, z))
        sections.append((s + 0.02, pts))
    n_half = len(cushion_half(0.2, L, False))

    def mat_fn(i, n, k, nk):
        hi_ = i if i < n_half - 1 else n - i - 1
        if hi_ <= 3:  # centre panel (between the seams)
            return 1
        if 12 <= hi_:  # underside
            return 2
        return 0

    return loft_pad("cushion", sections, mat_fn, hi)


def back_frame():
    up = Vector((-math.sin(TILT), 0, math.cos(TILT)))
    fwd = Vector((math.cos(TILT), 0, math.sin(TILT)))
    return up, fwd


def build_backrest(hi):
    H = 0.72
    up, fwd = back_frame()
    pleats = [0.14, 0.215, 0.29, 0.365, 0.44, 0.515] if hi else []
    hs = [-0.015, 0.0, 0.05, 0.10] + sorted(set([p + o for p in pleats for o in (-0.007, 0.0, 0.007)] +
                                             [0.18, 0.25, 0.33, 0.40, 0.48, 0.56, 0.60, 0.64])) + [0.67, 0.695, 0.712, 0.722]
    if not hi:
        hs = [-0.015, 0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.66, 0.70, 0.72]
    hs = sorted(set(round(x, 4) for x in hs))
    sections = []
    base = HINGE + fwd * 0.012
    for h in hs:
        pleat = any(abs(h - p) < 1e-4 for p in pleats)
        half = back_half(min(max(h, 0), H), H, pleat)
        if h > 0.66:  # rounded top roll
            k = (h - 0.66) / 0.062
            ts = 1 - 0.8 * k ** 2
            ys = 1 - 0.18 * k ** 2
            hh = h - 0.01 * k
        elif h < 0:
            ts, ys, hh = 0.5, 0.97, h
        else:
            ts, ys, hh = 1.0, 1.0, h
        pts = []
        for y, t in mirror_loop(half):
            p = base + up * hh + fwd * (t * ts)
            pts.append((p.x, y * ys, p.z))
        sections.append((h + 0.02, pts))
    n_half = len(back_half(0.2, H, False))

    def mat_fn(i, n, k, nk):
        hi_ = i if i < n_half - 1 else n - i - 1
        if hi_ <= 3 and 3 <= k <= nk - 5:
            return 1
        if hi_ >= 12:  # back shell
            return 3
        return 0

    return loft_pad("backrest_pad", sections, mat_fn, hi)


def build_headrest(hi):
    """pillow on two posts; built at the backrest top in seat space"""
    up, fwd = back_frame()
    top = HINGE + up * 0.74
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector((0.105, 0.27, 0.19)), verts=bm.verts)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2 if hi else 1, use_grid_fill=True)
    bm.normal_update()
    for v in bm.verts:
        # wrap-around curve + softer back
        v.co.x += 0.035 * (v.co.y / 0.135) ** 2 * (1 if v.co.x > -0.02 else 0.6)
        if v.co.z > 0.05:
            v.co.x -= 0.02 * (v.co.z - 0.05) / 0.045
    for f in bm.faces:
        f.material_index = 3 if f.normal.x < -0.6 else 0
    ob = C.obj("headrest_pad", bm, ["upholstery_leather", "insert_leather", "underside", "shell"], smooth=True, sharp=None)
    C.subsurf(ob, 2 if hi else 1)
    # UV: box metric
    me = ob.data
    uvl = me.uv_layers.active or me.uv_layers.new(name="UVMap")
    for p in me.polygons:
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            n = p.normal
            if abs(n.x) > 0.6:
                uv = (co.y, co.z)
            elif abs(n.y) > abs(n.z):
                uv = (co.x, co.z)
            else:
                uv = (co.y, co.x)
            uvl.data[li].uv = (0.3 + uv[0] * UVK, 0.3 + uv[1] * UVK)
    C.smooth_by_angle(ob, 80)
    # place: pad centre above the backrest top, a bit forward, tilted with the backrest
    ob.data.transform(Matrix.Rotation(-TILT, 4, "Y"))
    ob.data.transform(Matrix.Translation(top + up * 0.090 + fwd * 0.018))
    # posts (chrome) going down into the backrest
    pb = bmesh.new()
    for y in (-0.075, 0.075):
        p0 = top + up * 0.03 + fwd * 0.005 + Vector((0, y, 0))
        p1 = top - up * 0.05 + fwd * 0.005 + Vector((0, y, 0))
        C.tube([p1, p0], 0.0065, 12 if hi else 8, bm=pb)
        # guide collars (plastic) at the backrest top
        cb = C.cyl(0.011, 0.018, 14 if hi else 8, loc=(0, 0, 0))
        C.xform(cb, rot=Matrix.Rotation(-TILT, 3, "Y"), loc=top - up * 0.004 + fwd * 0.005 + Vector((0, y, 0)))
        C.merge(pb, cb)
    posts = C.obj("headrest_posts", pb, ["chrome"], sharp=40)
    return ob, posts, top


# ── stitching + piping on the finished pads ────────────────────────────────────
class Surf:
    def __init__(self, ob):
        dg = bpy.context.evaluated_depsgraph_get()
        self.bvh = BVHTree.FromObject(ob, dg)

    def snap(self, p):
        loc, nrm, idx, d = self.bvh.find_nearest(Vector(p))
        return loc, nrm


def ribbon(surf, pts, width=0.0095, lift=0.0008, name="stitch"):
    """alpha-masked thread ribbon hugging the surface along pts (seat space)"""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    snapped = [surf.snap(p) for p in pts]
    L = [0.0]
    for i in range(1, len(snapped)):
        L.append(L[-1] + (snapped[i][0] - snapped[i - 1][0]).length)
    prev = []
    for i, (p, n) in enumerate(snapped):
        a = snapped[max(i - 1, 0)][0]
        b = snapped[min(i + 1, len(snapped) - 1)][0]
        tdir = (b - a).normalized()
        side = n.cross(tdir).normalized()
        base = p + n * lift
        prev.append((bm.verts.new(base - side * width / 2), bm.verts.new(base + side * width / 2)))
    for i in range(len(prev) - 1):
        (a0, a1), (b0, b1) = prev[i], prev[i + 1]
        f = bm.faces.new((a0, a1, b1, b0))
        for lp, uv in zip(f.loops, ((L[i], 0.0), (L[i], 1.0), (L[i + 1], 1.0), (L[i + 1], 0.0))):
            lp[uvl].uv = (0.01 + uv[0] * UVK, uv[1])
    return C.obj(name, bm, ["stitch"], smooth=True, sharp=None, recalc=False)


def piping(surf, pts, r=0.0032, hi=True, name="piping"):
    """round welt cord sitting on a panel seam"""
    snapped = [surf.snap(p) for p in pts]
    path = [p + n * (r * 0.4) for p, n in snapped]
    return C.obj(name, C.tube(path, r, 6 if hi else 4), ["upholstery_leather"], sharp=None)


def seam_points_cushion(y, s0, s1, n, lift_z=0.25):
    """points above the cushion seam line (snapped later): x along depth, y lateral"""
    L = 0.50
    pts = []
    for k in range(n + 1):
        s = s0 + (s1 - s0) * k / n
        half = cushion_half(s, L, False)
        # height of the loop at this lateral y (interpolate the top part of the half profile)
        top = [p for p in half[:11]]
        ys = [p[0] for p in top]
        zs = [p[1] for p in top]
        z = float(np.interp(abs(y), ys, zs))
        x = -0.245 + s
        pts.append((x, y, 0.232 + z + s * math.tan(math.radians(5))))
    return pts


def seam_points_back(y, h0, h1, n, tdepth=None):
    up, fwd = back_frame()
    H = 0.72
    base = HINGE + fwd * 0.012
    pts = []
    for k in range(n + 1):
        h = h0 + (h1 - h0) * k / n
        half = back_half(h, H, False)
        top = half[:11]
        ys = [p[0] for p in top]
        ts = [p[1] for p in top]
        t = float(np.interp(abs(y) * (1.0), ys, ts)) if tdepth is None else tdepth
        yy = y
        p = base + up * h + fwd * t
        pts.append((p.x, yy, p.z))
    return pts


def ws_back(h):
    u = h / 0.72
    return 1.0 - 0.13 * max(0.0, (u - 0.45) / 0.55) ** 1.2


def build_trim(cushion, back, head, hi):
    """contrast double stitching on the insert seams + pleats, piping on the bolster crowns"""
    sc, sb, sh = Surf(cushion), Surf(back), Surf(head)
    rib, pip, ribc, pipc = [], [], [], []
    n = 40 if hi else 14
    for sg in (1, -1):
        ribc.append(ribbon(sc, seam_points_cushion(sg * 0.1585, 0.03, 0.455, n)))
        # bolster outer crown piping
        pipc.append(piping(sc, seam_points_cushion(sg * 0.252, 0.03, 0.45, n), hi=hi))
        # backrest seams follow the narrowing shoulders
        pts = []
        for p in seam_points_back(sg * 0.160, 0.05, 0.64, n):
            pts.append(p)
        pts = [(x, y * ws_back(max(0.0, ((Vector((x, 0, z)) - HINGE).dot(back_frame()[0])))), z) for x, y, z in pts]
        rib.append(ribbon(sb, pts))
        pts = [(x, y * ws_back(max(0.0, ((Vector((x, 0, z)) - HINGE).dot(back_frame()[0])))), z)
               for x, y, z in seam_points_back(sg * 0.262, 0.05, 0.66, n)]
        pip.append(piping(sb, pts, hi=hi))
    if hi:  # pleat stitching across the centre panels
        for s in (0.14, 0.215, 0.29, 0.365):
            ys = np.linspace(-0.148, 0.148, 16)
            pts = []
            for y in ys:
                half = cushion_half(s, 0.5, True)
                z = float(np.interp(abs(y), [p[0] for p in half[:11]], [p[1] for p in half[:11]]))
                pts.append((-0.245 + s, y, 0.232 + z + s * math.tan(math.radians(5))))
            ribc.append(ribbon(sc, pts, width=0.0075))
        up, fwd = back_frame()
        for h in (0.14, 0.215, 0.29, 0.365, 0.44, 0.515):
            pts = []
            w = ws_back(h)
            for y in np.linspace(-0.140, 0.140, 16):
                half = back_half(h, 0.72, True)
                t = float(np.interp(abs(y), [p[0] for p in half[:11]], [p[1] for p in half[:11]]))
                p = HINGE + fwd * 0.012 + up * h + fwd * t
                pts.append((p.x, y * 1.0, p.z))
            rib.append(ribbon(sb, pts, width=0.0075))
    # headrest: stitch around the front face
    bb = head.bound_box
    return C.join(ribc, "stitching_cushion"), C.join(pipc, "piping_cushion"), C.join(rib, "stitching_back"), C.join(pip, "piping_back")


# ── base: rails, pan, shield ───────────────────────────────────────────────────
def build_base(hi):
    parts = []
    seg = 2 if hi else 1
    for y in (-0.19, 0.19):
        # lower fixed rail (U-channel look) + upper slider + feet
        parts.append(C.obj("rail", C.box((0.56, 0.034, 0.026), loc=(0.0, y, 0.013), bevel=0.004, segs=seg), ["railmetal"], sharp=40))
        parts.append(C.obj("slider", C.box((0.44, 0.026, 0.018), loc=(-0.02, y, 0.035), bevel=0.003, segs=seg), ["railmetal"], sharp=40))
        for x in (-0.26, 0.26):
            parts.append(C.obj("foot", C.box((0.05, 0.05, 0.008), loc=(x, y, 0.004), bevel=0.002, segs=1), ["frame"], sharp=40))
        # stamped side member from the slider up to the pan (height-adjust linkage lives behind it)
        pb = C.box((0.44, 0.006, 0.11), loc=(-0.02, y * 1.13, 0.125), bevel=0.003, segs=1)
        for v in pb.verts:  # taller at the rear (the hinge), a raked front edge
            if v.co.z < 0.1 and v.co.x > 0.1:
                v.co.x -= 0.06
            if v.co.z > 0.15:
                v.co.z += 0.03 * (-(v.co.x) / 0.23)
        parts.append(C.obj("sidemember", pb, ["frame"], sharp=40))
        for x in (-0.19, 0.12):  # link pivots
            parts.append(C.obj("pivot", C.cyl(0.012, 0.012, 12 if hi else 6, loc=(x, y * 1.13 + (0.008 if y > 0 else -0.008), 0.07), axis="Y"), ["chrome"], sharp=40))
    # seat pan (black steel) under the cushion
    pan = C.box((0.49, 0.46, 0.035), loc=(0.0, 0.0, 0.215), bevel=0.012, segs=seg)
    parts.append(C.obj("pan", pan, ["frame"], sharp=40))
    # slide release towel bar (chrome) under the front
    pts = [Vector((0.20, -0.19, 0.045)), Vector((0.25, -0.17, 0.09)), Vector((0.28, -0.08, 0.11)),
           Vector((0.28, 0.08, 0.11)), Vector((0.25, 0.17, 0.09)), Vector((0.20, 0.19, 0.045))]
    parts.append(C.obj("bar", C.tube(C.bezier_path(pts, 6 if hi else 3), 0.0065, 10 if hi else 6), ["chrome"], sharp=None))
    # outer (+Y, door side) plastic shield around the hinge with recline knob + height lever
    sh = bmesh.new()
    bmesh.ops.create_cube(sh, size=1.0)
    bmesh.ops.scale(sh, vec=Vector((0.40, 0.03, 0.15)), verts=sh.verts)
    bmesh.ops.subdivide_edges(sh, edges=sh.edges[:], cuts=2, use_grid_fill=True)
    for v in sh.verts:
        # taper to the front + round the rear around the hinge
        t = (v.co.x + 0.2) / 0.4
        v.co.z *= 1.0 - 0.45 * t
        v.co.z += 0.03 * t
    shield = C.obj("shield", sh, ["shell"], smooth=True, sharp=None)
    C.subsurf(shield, 2 if hi else 1)
    C.uv_box(shield, 1.0 / UVK)
    shield.location = (-0.12, 0.283, 0.27)
    C.apply_mods(shield)
    shield.data.transform(shield.matrix_basis)
    shield.matrix_basis = Matrix.Identity(4)
    parts.append(shield)
    knob = C.lathe([(0.0, 0.028), (0.026, 0.026), (0.031, 0.018), (0.031, 0.004), (0.024, 0.0)], 28 if hi else 12, axis="Y")
    C.xform(knob, loc=(HINGE.x, 0.296, HINGE.z))
    parts.append(C.obj("knob", knob, ["shell"], sharp=40))
    lev = C.box((0.13, 0.014, 0.024), bevel=0.007, segs=seg)
    C.xform(lev, rot=Matrix.Rotation(math.radians(-10), 3, "Y"), loc=(0.10, 0.305, 0.215))
    parts.append(C.obj("lever", lev, ["shell"], sharp=40))
    base = C.join(parts, "base_mesh")
    C.smooth_by_angle(base, 40)
    return base


def swatch(name, mat, parent):
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in ((0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0))]
    f = bm.faces.new(vs)
    uvl = bm.loops.layers.uv.verify()
    for lp, uv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        lp[uvl].uv = uv
    o = C.obj(name, bm, [mat], smooth=False, recalc=False)
    o.parent = parent
    o.scale = (0.001, 0.001, 0.001)
    o["swatch"] = 1
    return o


def uv_names(objs):
    """bmesh-made layers are called 'Float2'; the materials read 'UVMap'. Also shift UVs into [0,1]."""
    for o in objs:
        if o.type != "MESH" or not o.data.uv_layers:
            continue
        lay = o.data.uv_layers[0]
        lay.name = "UVMap"
        a = np.zeros(len(o.data.loops) * 2, np.float32)
        lay.data.foreach_get("uv", a)
        a = a.reshape(-1, 2)
        lo = a.min(0)
        shift = np.where(lo < 0, -np.floor(lo), 0)
        a += shift
        hi_ = a.max(0)
        if (hi_ > 1).any():  # out of range: scale down (only on flat, texture-free parts)
            a /= np.maximum(hi_, 1)
        lay.data.foreach_set("uv", a.ravel())


def build(q):
    hi = q == "hi"
    seat_mats(q)
    cushion = build_cushion(hi)
    back = build_backrest(hi)
    head, posts, top = build_headrest(hi)
    st_c, pp_c, stitch, pipe = build_trim(cushion, back, head, hi)
    base_mesh = build_base(hi)
    uv_names([cushion, back, head, posts, stitch, pipe, st_c, pp_c, base_mesh])
    # AO (vertex) with everything occluding; stitching/piping ride on top
    C.bake_ao_vcol([cushion, back, head, posts, base_mesh, pipe, pp_c], samples=64 if hi else 24, max_dist=0.12, floor=0.35)
    for o in (stitch, st_c):
        C.vcol_fill(o)
    root = C.empty("seat")
    base = C.empty("base", root)
    base_mesh.parent = base
    # cushion node = the mesh itself (+ its stitching / piping as children)
    cushion.parent = root
    cushion.name = "cushion"
    up, fwd = back_frame()
    br = C.empty("backrest", root, loc=HINGE)
    br.rotation_euler = (0, -TILT, 0)
    bpy.context.view_layer.update()
    inv = br.matrix_world.inverted()

    def to_local(o, par):
        o.data.transform(inv if par is br else hr_inv)
        o.parent = par

    back.name = "backrest_pad"
    to_local(back, br)
    stitch.name = "stitching_back"
    pipe.name = "piping_back"
    to_local(stitch, br)
    to_local(pipe, br)
    st_c.parent = cushion
    pp_c.parent = cushion
    hr = C.empty("headrest", br, loc=(0, 0, 0.74))
    bpy.context.view_layer.update()
    hr_inv = hr.matrix_world.inverted()
    head.name = "headrest_pad"
    posts.name = "headrest_posts"
    to_local(head, hr)
    to_local(posts, hr)
    var = C.empty("variants", root)
    var.location = (0, 0, 0.02)
    for vname in ("upholstery_fabric", "upholstery_alcantara", "upholstery_quilted", "insert_fabric", "insert_alcantara",
                  "insert_quilted"):
        swatch("swatch_" + vname, C.MATS[vname], var)
    # exploded view (three space: +Y up, +X forward)
    base["explode"] = [0.0, -0.25, 0.0]
    cushion["explode"] = [0.12, 0.18, 0.0]
    br["explode"] = [-0.25, 0.30, 0.0]
    hr["explode"] = [0.0, 0.22, 0.0]
    return root


if __name__ == "__main__":
    a = C.args()
    q = a.get("q", "hi")
    C.reset()
    root = build(q)
    if a.get("look"):
        H = os.path.join(C.HERE, "..", "public/lib3d/env/")
        cams = {"q3": ((1.35, -1.25, 1.05), (0.0, 0.0, 0.62), 32), "side": ((0.0, -2.4, 0.7), (-0.05, 0, 0.62), 32),
                "front": ((2.2, 0.0, 0.9), (0, 0, 0.62), 32), "close": ((0.75, -0.55, 0.75), (0.0, 0.05, 0.42), 34),
                "back": ((-1.4, 1.1, 1.1), (-0.1, 0, 0.62), 32),
                "seam": ((0.35, -0.38, 0.62), (-0.02, -0.12, 0.33), 30), "head": ((0.45, -0.35, 1.25), (-0.40, 0.0, 1.12), 30)}
        for k in a.get("views", "q3").split(","):
            cam, tgt, fov = cams[k]
            C.look(a["look"].replace(".png", f"_{k}.png"), target=tgt, cam=cam, fov=fov, hdr=H + a.get("env", "studio") + "-1k-v1.hdr",
                   ground=True, spp=int(a.get("spp", "48")), res=(1000, 800))
    if a.get("out") or not a.get("look"):
        C.finish("seat", q, root, a.get("out"))
