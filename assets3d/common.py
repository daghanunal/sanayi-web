"""Shared Blender helpers for the lib3d asset library (assets3d/README.md).

Pipeline pattern (from the SolarDetech photoreal stage, scripts/rewrite/blender/):
reproducible headless Blender builds -> raw GLB -> gltf-transform (WebP + meshopt) -> manifest.json.

Coordinates: modelled in Blender space (metres, Z up). The glTF exporter maps Blender (x, y, z) to
three.js (x, z, -y), so:   Blender +X = three +X,  Blender +Z = three +Y (up),  Blender +Y = three -Z.
Vehicles face +X. Wheels spin about three Z (Blender -Y); a standalone wheel shows its face to three +Z.
"""

import json
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

BUILD = os.environ.get("LIB3D_BUILD", "/tmp/lib3d-build")
os.makedirs(BUILD, exist_ok=True)
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))


def args():
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out = {}
    for i, k in enumerate(a):
        if k.startswith("--"):
            out[k[2:]] = a[i + 1] if i + 1 < len(a) and not a[i + 1].startswith("--") else "1"
    return out


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()


def srgb(h):
    """'#rrggbb' -> linear rgb tuple"""
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def lin2srgb(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055)


# ── images ───────────────────────────────────────────────────────────────────
def image(name, arr, srgb=True):
    """numpy (H,W,C) bottom-up float -> packed bpy image (PNG). srgb=True encodes linear->sRGB."""
    arr = np.asarray(arr, np.float32)
    if arr.ndim == 2:
        arr = np.repeat(arr[..., None], 3, -1)
    H, W, Cn = arr.shape
    rgb = arr[..., :3]
    if srgb:
        rgb = lin2srgb(rgb)
    a = arr[..., 3:4] if Cn == 4 else np.ones((H, W, 1), np.float32)
    px = np.concatenate([np.clip(rgb, 0, 1), a], -1).astype(np.float32)
    img = bpy.data.images.new(name, W, H, alpha=(Cn == 4))
    img.colorspace_settings.name = "sRGB" if srgb else "Non-Color"
    img.pixels.foreach_set(px.ravel())
    path = os.path.join(BUILD, "tex", name + ".png")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    img.filepath = path
    img.pack()
    return img


# ── materials ────────────────────────────────────────────────────────────────
MATS = {}


def _gltf_output_group():
    g = bpy.data.node_groups.get("glTF Material Output")
    if g:
        return g
    g = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
    g.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    g.interface.new_socket("Thickness", in_out="INPUT", socket_type="NodeSocketFloat")
    return g


def material(name, color=(0.8, 0.8, 0.8), rough=0.5, metal=0.0, albedo=None, orm=None, normal=None,
             normal_strength=1.0, coat=0.0, coat_rough=0.03, spec_level=None, ior=None, alpha=None,
             alpha_tex=False, vcol=False, double=False, emission=None, uv_map=None, sheen=None,
             transmission=None, occlusion=True, uv_scale=None):
    """Principled BSDF laid out so the Blender glTF exporter writes it 1:1:
    albedo -> baseColorTexture (x COLOR_0 when vcol), orm (R=AO, G=rough, B=metal) ->
    metallicRoughnessTexture (+ occlusionTexture), normal -> normalTexture, coat -> KHR_materials_clearcoat,
    sheen=(color, rough) -> KHR_materials_sheen, alpha<1 -> BLEND, emission=(rgb, strength) -> emissive."""
    if name in MATS:  # first definition wins (shared names across builders, e.g. "chrome")
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    I = bsdf.inputs
    I["Base Color"].default_value = (*color, 1)
    I["Roughness"].default_value = rough
    I["Metallic"].default_value = metal
    uvn = None
    if uv_map or uv_scale:
        un = nt.nodes.new("ShaderNodeUVMap")
        un.uv_map = uv_map or ""  # "" = the mesh's active UV layer (bmesh layers may be named "Float2")
        uvn = un.outputs["UV"]
    if uv_scale:  # -> KHR_texture_transform (UVs stay in 0..1 so meshopt can quantize them)
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.vector_type = "POINT"
        mp.inputs["Scale"].default_value = (uv_scale[0], uv_scale[1], 1)
        nt.links.new(uvn, mp.inputs["Vector"])
        uvn = mp.outputs["Vector"]

    def tex(img, noncolor):
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = img
        if noncolor:
            img.colorspace_settings.name = "Non-Color"
        if uvn is not None:
            nt.links.new(uvn, t.inputs["Vector"])
        return t

    if albedo is not None:
        t = tex(albedo, False)
        col = t.outputs["Color"]
        if vcol:
            va = nt.nodes.new("ShaderNodeVertexColor")
            va.layer_name = "Color"
            mix = nt.nodes.new("ShaderNodeMix")
            mix.data_type = "RGBA"
            mix.blend_type = "MULTIPLY"
            mix.inputs["Factor"].default_value = 1.0
            nt.links.new(col, mix.inputs[6])
            nt.links.new(va.outputs["Color"], mix.inputs[7])
            col = mix.outputs[2]
        nt.links.new(col, I["Base Color"])
        if alpha_tex:
            nt.links.new(t.outputs["Alpha"], I["Alpha"])
    elif vcol:
        va = nt.nodes.new("ShaderNodeVertexColor")
        va.layer_name = "Color"
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0
        mix.inputs[6].default_value = (*color, 1)
        nt.links.new(va.outputs["Color"], mix.inputs[7])
        nt.links.new(mix.outputs[2], I["Base Color"])
    if orm is not None:
        t = tex(orm, True)
        sep = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(t.outputs["Color"], sep.inputs["Color"])
        nt.links.new(sep.outputs["Green"], I["Roughness"])
        nt.links.new(sep.outputs["Blue"], I["Metallic"])
        if occlusion:
            g = nt.nodes.new("ShaderNodeGroup")
            g.node_tree = _gltf_output_group()
            nt.links.new(sep.outputs["Red"], g.inputs["Occlusion"])
    if normal is not None:
        t = tex(normal, True)
        nm = nt.nodes.new("ShaderNodeNormalMap")
        if uv_map:
            nm.uv_map = uv_map
        nm.inputs["Strength"].default_value = normal_strength
        nt.links.new(t.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], I["Normal"])
    if coat:
        I["Coat Weight"].default_value = coat
        I["Coat Roughness"].default_value = coat_rough
    if spec_level is not None:
        I["Specular IOR Level"].default_value = spec_level
    if ior is not None:
        I["IOR"].default_value = ior
    if sheen is not None:
        I["Sheen Weight"].default_value = 1.0
        I["Sheen Tint"].default_value = (*sheen[0], 1)
        I["Sheen Roughness"].default_value = sheen[1]
    if transmission is not None:
        I["Transmission Weight"].default_value = transmission
    if emission is not None:
        I["Emission Color"].default_value = (*emission[0], 1)
        I["Emission Strength"].default_value = emission[1]
    if alpha is not None:
        I["Alpha"].default_value = alpha
        m.surface_render_method = "BLENDED"
    elif alpha_tex:
        m.surface_render_method = "DITHERED"
    m.use_backface_culling = not double
    MATS[name] = m
    return m


# ── bmesh primitives (all in Blender space) ─────────────────────────────────
def obj(name, bm, mats, smooth=True, sharp=35, parent=None, loc=None, recalc=True):
    """bmesh -> linked object. mats: material or list (face material_index indexes the list).
    recalc: orient normals outward (closed solids and convex-ish shells)."""
    me = bpy.data.meshes.new(name)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    if recalc:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    norm_uv(me)
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    for m in (mats if isinstance(mats, (list, tuple)) else [mats]):
        me.materials.append(m if isinstance(m, bpy.types.Material) else MATS[m])
    if smooth:
        me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
        if sharp is not None:
            me.set_sharp_from_angle(angle=math.radians(sharp))
    if parent is not None:
        ob.parent = parent
    if loc is not None:
        ob.location = loc
    return ob


def norm_uv(me):
    """one UV layer named "UVMap" (new bmesh layers may be called "Float2"; joins then keep two layers
    and textures sample a single texel)"""
    if len(me.uv_layers) and "UVMap" not in me.uv_layers:
        me.uv_layers[0].name = "UVMap"
    if "UVMap" in me.uv_layers:
        me.uv_layers.active = me.uv_layers["UVMap"]
        me.uv_layers["UVMap"].active_render = True
    return me


def empty(name, parent=None, loc=(0, 0, 0), rot=None):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.empty_display_size = 0.1
    e.location = loc
    if rot:
        e.rotation_euler = rot
    if parent is not None:
        e.parent = parent
    return e


def parent(child, par, keep=True):
    mw = child.matrix_world.copy()
    child.parent = par
    if keep:
        child.matrix_parent_inverse = par.matrix_world.inverted()
    return child


def lathe(profile, segs, axis="Z", cap0=False, cap1=False, mat_idx=None, bm=None, angle=2 * math.pi, ofs=0.0):
    """revolve a profile [(r, h), ...] around an axis ('X'|'Y'|'Z'), h along the axis.
    mat_idx: optional per-segment list (len(profile)-1) of material indices. Returns bm.
    UV: u = around (0..1), v = cumulative profile length (metres)."""
    bm = bm or bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    full = abs(angle - 2 * math.pi) < 1e-6
    n = segs if full else segs + 1
    rings = []
    for (r, h) in profile:
        ring = []
        for i in range(n):
            t = ofs + angle * i / segs
            c, s = math.cos(t) * r, math.sin(t) * r
            if axis == "Z":
                p = (c, s, h)
            elif axis == "X":
                p = (h, c, s)
            else:  # Y
                p = (s, h, c)
            ring.append(bm.verts.new(p))
        rings.append(ring)
    acc = [0.0]
    for a, b in zip(profile, profile[1:]):
        acc.append(acc[-1] + math.dist(a, b))
    for k, (ra, rb) in enumerate(zip(rings, rings[1:])):
        for i in range(segs):
            j = (i + 1) % n
            vs = (ra[i], ra[j], rb[j], rb[i])
            if len(set(vs)) < 4:
                continue
            try:
                f = bm.faces.new(vs)
            except ValueError:
                continue
            if mat_idx is not None:
                f.material_index = mat_idx[k]
            for lp, (u, v) in zip(f.loops, ((i / segs, acc[k]), ((i + 1) / segs, acc[k]),
                                           ((i + 1) / segs, acc[k + 1]), (i / segs, acc[k + 1]))):
                lp[uvl].uv = (u, v)
    if full:
        if cap0 and profile[0][0] > 1e-6:
            f = bm.faces.new(rings[0][::-1])
            if mat_idx is not None:
                f.material_index = mat_idx[0]
        if cap1 and profile[-1][0] > 1e-6:
            f = bm.faces.new(rings[-1])
            if mat_idx is not None:
                f.material_index = mat_idx[-1]
    return bm


def box(size, loc=(0, 0, 0), bevel=0.0, segs=2, bm=None, mat=0):
    """axis box, optional beveled edges. size (sx,sy,sz)."""
    b = bmesh.new()
    bmesh.ops.create_cube(b, size=1.0)
    bmesh.ops.scale(b, vec=Vector(size), verts=b.verts)
    if bevel > 0:
        bmesh.ops.bevel(b, geom=b.verts[:] + b.edges[:], offset=bevel, segments=segs, profile=0.5,
                        affect="EDGES", clamp_overlap=True)
    bmesh.ops.translate(b, vec=Vector(loc), verts=b.verts)
    for f in b.faces:
        f.material_index = mat
    if bm is None:
        return b
    merge(bm, b)
    return bm


def cyl(r, h, segs=24, loc=(0, 0, 0), axis="Z", r2=None, bevel=0.0, bsegs=2, caps=True, bm=None, mat=0):
    """cylinder centred at loc along axis. bevel rounds the rims."""
    b = bmesh.new()
    bmesh.ops.create_cone(b, cap_ends=caps, cap_tris=False, segments=segs, radius1=r,
                          radius2=r if r2 is None else r2, depth=h)
    if bevel > 0:
        rim = [e for e in b.edges if len(e.link_faces) == 2 and
               abs(e.link_faces[0].normal.dot(e.link_faces[1].normal)) < 0.5]
        bmesh.ops.bevel(b, geom=rim, offset=bevel, segments=bsegs, profile=0.5, affect="EDGES", clamp_overlap=True)
    rot = {"Z": Matrix.Identity(3), "X": Matrix.Rotation(math.pi / 2, 3, "Y"),
           "Y": Matrix.Rotation(-math.pi / 2, 3, "X")}[axis]
    bmesh.ops.rotate(b, verts=b.verts, cent=(0, 0, 0), matrix=rot)
    bmesh.ops.translate(b, vec=Vector(loc), verts=b.verts)
    for f in b.faces:
        f.material_index = mat
    if bm is None:
        return b
    merge(bm, b)
    return bm


def torus(R, r, segs=32, rsegs=12, loc=(0, 0, 0), axis="Z", bm=None, mat=0, arc=2 * math.pi):
    prof = [(R + r * math.cos(2 * math.pi * k / rsegs), r * math.sin(2 * math.pi * k / rsegs)) for k in range(rsegs + 1)]
    b = lathe(prof, segs, axis=axis, angle=arc)
    bmesh.ops.remove_doubles(b, verts=b.verts, dist=1e-7)
    bmesh.ops.translate(b, vec=Vector(loc), verts=b.verts)
    for f in b.faces:
        f.material_index = mat
    if bm is None:
        return b
    merge(bm, b)
    return bm


def tube(path, r, sides=12, caps=True, bm=None, mat=0, radii=None, twist=0.0):
    """round tube along a polyline of Vectors (parallel-transport frames). radii: per point radius."""
    b = bmesh.new()
    uvl = b.loops.layers.uv.verify()
    path = [Vector(p) for p in path]
    n = len(path)
    tang = []
    for i in range(n):
        a = path[max(i - 1, 0)]
        c = path[min(i + 1, n - 1)]
        tang.append((c - a).normalized())
    ref = Z if abs(tang[0].z) < 0.9 else X
    nrm = tang[0].cross(ref).normalized()
    rings = []
    dist = [0.0]
    for i in range(n):
        if i:
            dist.append(dist[-1] + (path[i] - path[i - 1]).length)
            nrm = (nrm - tang[i] * nrm.dot(tang[i])).normalized()
        bi = tang[i].cross(nrm)
        rr = radii[i] if radii else r
        ring = []
        for k in range(sides):
            ang = 2 * math.pi * k / sides + twist
            ring.append(b.verts.new(path[i] + (nrm * math.cos(ang) + bi * math.sin(ang)) * rr))
        rings.append(ring)
    for i in range(n - 1):
        for k in range(sides):
            k2 = (k + 1) % sides
            f = b.faces.new((rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]))
            f.material_index = mat
            for lp, uv in zip(f.loops, ((dist[i], k / sides), (dist[i], (k + 1) / sides),
                                        (dist[i + 1], (k + 1) / sides), (dist[i + 1], k / sides))):
                lp[uvl].uv = uv
    if caps:
        f = b.faces.new(rings[0][::-1])
        f.material_index = mat
        f = b.faces.new(rings[-1])
        f.material_index = mat
    if bm is None:
        return b
    merge(bm, b)
    return bm


def bezier_path(pts, res=8):
    """Catmull-Rom through points -> dense polyline"""
    pts = [Vector(p) for p in pts]
    out = []
    for i in range(len(pts) - 1):
        p0 = pts[max(i - 1, 0)]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[min(i + 2, len(pts) - 1)]
        for k in range(res):
            t = k / res
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(pts[-1])
    return out


def bend_path(pts, r=0.05, res=6):
    """polyline with rounded corners (pipe bends of radius r)"""
    pts = [Vector(p) for p in pts]
    out = [pts[0]]
    for i in range(1, len(pts) - 1):
        a, b, c = pts[i - 1], pts[i], pts[i + 1]
        d1 = (b - a).normalized()
        d2 = (c - b).normalized()
        ang = math.acos(max(-1, min(1, d1.dot(d2))))
        if ang < 1e-3:
            out.append(b)
            continue
        t = min(r * math.tan(ang / 2), (b - a).length * 0.49, (c - b).length * 0.49)
        p0 = b - d1 * t
        p1 = b + d2 * t
        for k in range(res + 1):
            s = k / res
            out.append((1 - s) ** 2 * p0 + 2 * (1 - s) * s * b + s * s * p1)
    out.append(pts[-1])
    return out


SQUEEZE = 1.04


def fix_uv_wrap(bm, squeeze=SQUEEZE):
    """faces whose u straddles the 0/1 seam (atan2-derived UVs): lift the small side by 1, then divide
    every u by `squeeze` so all UVs stay inside [0,1] (quantizable). Multiply the texture repeat by squeeze."""
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        us = [lp[uvl].uv.x for lp in f.loops]
        if max(us) - min(us) > 0.5:
            for lp in f.loops:
                if lp[uvl].uv.x < 0.5:
                    lp[uvl].uv.x += 1.0
    for f in bm.faces:
        for lp in f.loops:
            lp[uvl].uv.x /= squeeze
    return bm


def merge(dst, src):
    """append bmesh src into dst (keeps material indices + UVs), frees src"""
    me = bpy.data.meshes.new("_tmp")
    src.to_mesh(me)
    src.free()
    dst.from_mesh(me)
    bpy.data.meshes.remove(me)
    return dst


def xform(bm, mat=None, loc=None, rot=None, scale=None):
    if scale is not None:
        bmesh.ops.scale(bm, vec=Vector(scale) if hasattr(scale, "__len__") else Vector((scale,) * 3), verts=bm.verts)
    if rot is not None:
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=rot if isinstance(rot, Matrix) else
                         __import__("mathutils").Euler(rot).to_matrix())
    if mat is not None:
        bmesh.ops.transform(bm, matrix=mat, verts=bm.verts)
    if loc is not None:
        bmesh.ops.translate(bm, vec=Vector(loc), verts=bm.verts)
    return bm


def rot_copies(bm_fn, n, axis="Z", mat=None):
    """merge n rotated copies of bm_fn(i) around the origin"""
    out = bmesh.new()
    for i in range(n):
        b = bm_fn(i)
        bmesh.ops.rotate(b, verts=b.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(2 * math.pi * i / n, 3, axis))
        merge(out, b)
    return out


# ── modifiers ────────────────────────────────────────────────────────────────
def apply_mods(ob):
    """bake the modifier stack into the mesh"""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=True, depsgraph=dg)
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    if old.users == 0:
        bpy.data.meshes.remove(old)
    return ob


def subsurf(ob, levels=2, apply=True, crease=None):
    m = ob.modifiers.new("sub", "SUBSURF")
    m.levels = levels
    m.render_levels = levels
    m.quality = 3
    if apply:
        apply_mods(ob)
    return ob


def cleanup(ob, dist=1e-5):
    """merge near-duplicate verts + dissolve degenerate faces (boolean output before a bevel)"""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=dist)
    bm.to_mesh(ob.data)
    bm.free()
    return ob


def bevel_mod(ob, width=0.002, segs=2, angle=40, apply=True, harden=False):
    cleanup(ob)
    m = ob.modifiers.new("bev", "BEVEL")
    m.width = width
    m.segments = segs
    m.limit_method = "ANGLE"
    m.angle_limit = math.radians(angle)
    m.harden_normals = harden
    m.use_clamp_overlap = True
    if apply:
        apply_mods(ob)
    return ob


def weighted_normals(ob, weight=50, apply=True):
    """face-area weighted custom normals: flat faces stay flat next to bevels / n-gons (keep sharp edges)"""
    ob.data.polygons.foreach_set("use_smooth", [True] * len(ob.data.polygons))
    m = ob.modifiers.new("wn", "WEIGHTED_NORMAL")
    m.weight = weight
    m.keep_sharp = True
    m.mode = "FACE_AREA"
    if apply:
        apply_mods(ob)
    return ob


def solidify(ob, t, offset=-1, apply=True):
    m = ob.modifiers.new("sol", "SOLIDIFY")
    m.thickness = t
    m.offset = offset
    m.use_even_offset = True
    if apply:
        apply_mods(ob)
    return ob


def boolean(ob, cutter, op="DIFFERENCE", apply=True, remove_cutter=True, transfer=False):
    m = ob.modifiers.new("bool", "BOOLEAN")
    m.operation = op
    m.object = cutter
    m.solver = "EXACT"
    if transfer:
        m.material_mode = "TRANSFER"
    cutter.hide_set(True)
    if apply:
        apply_mods(ob)
        if remove_cutter:
            me = cutter.data
            bpy.data.objects.remove(cutter)
            if me and me.users == 0:
                bpy.data.meshes.remove(me)
    return ob


def decimate(ob, ratio, apply=True):
    m = ob.modifiers.new("dec", "DECIMATE")
    m.ratio = ratio
    m.use_collapse_triangulate = True
    if apply:
        apply_mods(ob)
    return ob


def weld(ob, dist=1e-5):
    m = ob.modifiers.new("weld", "WELD")
    m.merge_threshold = dist
    apply_mods(ob)
    return ob


def smooth_by_angle(ob, deg=35):
    ob.data.polygons.foreach_set("use_smooth", [True] * len(ob.data.polygons))
    ob.data.set_sharp_from_angle(angle=math.radians(deg))
    return ob


def join(objs, name=None):
    objs = [o for o in objs if o is not None]
    if len(objs) == 1:
        if name:
            objs[0].name = name
        return objs[0]
    for o in objs:
        norm_uv(o.data)
    ctx = {"active_object": objs[0], "selected_editable_objects": objs, "selected_objects": objs}
    with bpy.context.temp_override(**ctx):
        bpy.ops.object.join()
    if name:
        objs[0].name = name
        objs[0].data.name = name
    objs[0].data.validate()
    norm_uv(objs[0].data)
    return objs[0]


def uv_box(ob, scale=1.0):
    """metric cube-projection UVs: u,v in metres / scale (for tileable textures)"""
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    uvl = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            p = lp.vert.co
            if ax == 0:
                u, v = p.y * math.copysign(1, n.x), p.z
            elif ax == 1:
                u, v = -p.x * math.copysign(1, n.y), p.z
            else:
                u, v = p.x, p.y * math.copysign(1, n.z)
            lp[uvl].uv = (u / scale, v / scale)
    bm.to_mesh(me)
    bm.free()
    return ob


def uv_smart(ob, margin=0.01, angle=66):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=margin, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    return ob


def ntris(objs):
    t = 0
    for o in objs:
        if o.type == "MESH":
            t += sum(len(p.vertices) - 2 for p in o.data.polygons)
    return t


def vcol_fill(ob, rgba=(1, 1, 1, 1)):
    me = ob.data
    ca = me.color_attributes.get("Color") or me.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")
    ca.data.foreach_set("color", list(rgba) * len(ca.data))
    return ca


# ── Cycles ───────────────────────────────────────────────────────────────────
def cycles(samples=64):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        prefs.compute_device_type = "METAL"
        prefs.get_devices()
        for dv in prefs.devices:
            dv.use = True
        sc.cycles.device = "GPU"
    except Exception as e:  # CPU fallback
        print("cycles gpu unavailable", e)
    sc.cycles.samples = samples
    return sc


def bake_ao_vcol(objs, samples=48, max_dist=0.3, floor=0.3, gamma=1.0, only_local=False):
    """Cycles AO into each object's COLOR_0 ("Color", multiplied into what is there), with the whole
    scene occluding: contact shadows between parts. Objects need a material (any)."""
    sc = cycles(samples)
    sc.world = sc.world or bpy.data.worlds.new("w")
    sc.world.light_settings.distance = max_dist
    b = sc.render.bake
    b.target = "VERTEX_COLORS"
    b.use_selected_to_active = False
    b.max_ray_distance = max_dist
    for o in objs:
        if o.type != "MESH" or not len(o.data.polygons):
            continue
        me = o.data
        if not me.materials:
            me.materials.append(material("_ao_tmp"))
        base = me.color_attributes.get("Color")
        if base is None:
            base = vcol_fill(o)
        ao = me.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
        me.color_attributes.active_color = ao
        bpy.ops.object.select_all(action="DESELECT")
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.bake(type="AO")
        n = len(base.data)
        c0 = np.zeros(n * 4, np.float32)
        c1 = np.zeros(n * 4, np.float32)
        base.data.foreach_get("color", c0)
        ao.data.foreach_get("color", c1)
        a = c1.reshape(-1, 4)[:, :1] ** gamma
        k = floor + (1 - floor) * a
        c0 = c0.reshape(-1, 4)
        c0[:, :3] *= k
        base.data.foreach_set("color", c0.ravel())
        me.color_attributes.remove(ao)
        me.color_attributes.active_color = base
        me.color_attributes.render_color_index = me.color_attributes.active_color_index
    b.target = "IMAGE_TEXTURES"


def bake_image(target, W, H, kind="AO", sources=None, cage=0.02, max_dist=0.1, samples=64, margin=8):
    """bake `kind` ('AO' | 'NORMAL' | 'DIFFUSE') into target's active UV -> (H,W,3) float, bottom-up.
    sources: selected-to-active from these objects (None: target itself, scene occludes)."""
    sc = cycles(samples)
    img = bpy.data.images.new("bake_" + kind + "_" + target.name, W, H, float_buffer=True)
    if kind == "NORMAL":
        img.colorspace_settings.name = "Non-Color"
    added = []
    for s in target.material_slots:
        if not s.material:
            continue
        nt = s.material.node_tree
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = img
        nt.nodes.active = n
        added.append((nt, n))
    bpy.ops.object.select_all(action="DESELECT")
    for o in sources or []:
        o.select_set(True)
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    b = sc.render.bake
    b.target = "IMAGE_TEXTURES"
    b.use_selected_to_active = bool(sources)
    b.cage_extrusion = cage
    b.max_ray_distance = max_dist
    b.margin = margin
    if kind == "DIFFUSE":
        b.use_pass_direct = False
        b.use_pass_indirect = False
        b.use_pass_color = True
    if kind == "AO":
        sc.world = sc.world or bpy.data.worlds.new("w")
        sc.world.light_settings.distance = max_dist
    bpy.ops.object.bake(type=kind)
    arr = np.array(img.pixels[:], np.float32).reshape(H, W, 4)[..., :3].copy()
    for nt, n in added:
        nt.nodes.remove(n)
    bpy.data.images.remove(img)
    return arr


# ── export ───────────────────────────────────────────────────────────────────
def export_glb(path, objects=None, extras=True):
    bpy.ops.object.select_all(action="DESELECT")
    objs = objects or [o for o in bpy.context.scene.objects]
    for o in objs:
        o.hide_set(False)
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True,
                              export_yup=True, export_texcoords=True, export_normals=True,
                              export_materials="EXPORT", export_image_format="AUTO", export_cameras=False,
                              export_lights=False, export_extras=extras, export_vertex_color="ACTIVE",
                              export_all_vertex_colors=False, export_tangents=False)
    return ntris(objs)


def write_stats(key, **vals):
    """one file per key (parallel builds never clobber each other); build_manifest.py merges them"""
    d = os.path.join(BUILD, "stats")
    os.makedirs(d, exist_ok=True)
    json.dump(vals, open(os.path.join(d, key + ".json"), "w"), indent=1)


def node_tree_names(root_objs):
    out = []

    def walk(o, depth):
        out.append(("  " * depth) + o.name)
        for c in sorted(o.children, key=lambda c: c.name):
            walk(c, depth + 1)

    for r in root_objs:
        walk(r, 0)
    return out


# ── quick look renders for iteration (Cycles, studio HDRI or env file) ─────────
def look(path, target=(0, 0, 0.5), cam=(4, -5, 2), fov=35, hdr=None, res=(1200, 800), spp=64, ground=True,
         exposure=0.0, strength=1.0, rot=0.0, hide=()):
    sc = cycles(spp)
    sc.cycles.use_denoising = True
    w = bpy.data.worlds.new("look")
    sc.world = w
    w.use_nodes = True
    wn = w.node_tree
    bg = wn.nodes["Background"]
    bg.inputs["Strength"].default_value = strength
    if hdr and os.path.exists(hdr):
        env = wn.nodes.new("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(hdr, check_existing=True)
        tc = wn.nodes.new("ShaderNodeTexCoord")
        mp = wn.nodes.new("ShaderNodeMapping")
        mp.inputs["Rotation"].default_value = (0, 0, rot)
        wn.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
        wn.links.new(mp.outputs["Vector"], env.inputs["Vector"])
        wn.links.new(env.outputs["Color"], bg.inputs["Color"])
    else:
        bg.inputs["Color"].default_value = (0.5, 0.5, 0.52, 1)
    added = []
    if ground:
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=40)
        g = obj("_ground", bm, material("_ground_m", srgb("#3a3a3c"), 0.6), smooth=False)
        added.append(g)
    cd = bpy.data.cameras.new("_cam")
    cd.sensor_fit = "VERTICAL"
    cd.angle_y = math.radians(fov)
    co = bpy.data.objects.new("_cam", cd)
    sc.collection.objects.link(co)
    co.location = cam
    co.rotation_euler = (Vector(target) - Vector(cam)).to_track_quat("-Z", "Y").to_euler()
    sc.camera = co
    added.append(co)
    for o in hide:
        o.hide_render = True
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.exposure = exposure
    sc.render.image_settings.file_format = "PNG"
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    for o in hide:
        o.hide_render = False
    for o in added:
        bpy.data.objects.remove(o)
    print("look", path)


def finish(name, q, root, out=None, look=None, extra_stats=None):
    """export root (+ descendants) to BUILD/<name>-<q>.raw.glb and record tris / dims / nodes / materials"""
    out = out or os.path.join(BUILD, f"{name}-{q}.raw.glb")
    objs = [root] + list(root.children_recursive)
    bpy.context.view_layer.update()
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    mats = set()
    for o in objs:
        if o.type != "MESH":
            continue
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
        for m in o.data.materials:
            if m:
                mats.add(m.name)
    tris = export_glb(out, objs)
    # three.js space dims: x, y(up)=blender z, z=-blender y
    dims = {"min": [round(lo.x, 3), round(lo.z, 3), round(-hi.y, 3)], "max": [round(hi.x, 3), round(hi.z, 3), round(-lo.y, 3)]}
    st = dict(tris=tris, dims=dims, nodes=node_tree_names([root]), materials=sorted(mats))
    st.update(extra_stats or {})
    write_stats(f"{name}_{q}", **st)
    print(f"{name} {q} tris {tris} dims {dims}")
    return out


# ── face-set operations (split / flange / recess) ─────────────────────────────
def split_faces(ob, key_fn, keep=None):
    """split ob's faces into new objects by key_fn(polygon, mesh) -> key (None = stays in ob).
    returns {key: object}. Materials are kept (same slots)."""
    me = ob.data
    keys = {}
    for p in me.polygons:
        k = key_fn(p, me)
        if k is not None:
            keys.setdefault(k, []).append(p.index)
    out = {}
    for k, idx in keys.items():
        o2 = ob.copy()
        o2.data = me.copy()
        o2.name = str(k)
        o2.data.name = str(k)
        bpy.context.scene.collection.objects.link(o2)
        s = set(idx)
        bm = bmesh.new()
        bm.from_mesh(o2.data)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in s], context="FACES")
        bm.to_mesh(o2.data)
        bm.free()
        out[k] = o2
    allk = set(i for v in keys.values() for i in v)
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.faces[i] for i in sorted(allk)], context="FACES")
    bm.to_mesh(me)
    bm.free()
    return out


def flange(ob, gap=0.0025, depth=0.02, mat=None):
    """panel-gap look: pull every open boundary back by `gap` along the surface and turn it inward by
    `depth` (a return flange), so seams read as dark gaps and panels never look paper thin."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.normal_update()
    bnd_edges = [e for e in bm.edges if e.is_boundary]
    bverts = {v for e in bnd_edges for v in e.verts}
    moves = {}
    for v in bverts:
        inner = [e.other_vert(v).co - v.co for e in v.link_edges if not e.is_boundary]
        if not inner:
            continue
        d = sum(inner, Vector()) / len(inner)
        n = v.normal
        d = d - n * d.dot(n)
        if d.length > 1e-9:
            moves[v] = d.normalized() * min(gap, d.length * 0.45)
    for v, m in moves.items():
        v.co += m
    res = bmesh.ops.extrude_edge_only(bm, edges=bnd_edges)
    newv = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
    for v in newv:
        ln = [e.other_vert(v) for e in v.link_edges]
        n = Vector()
        for f in v.link_faces:
            pass
        # original partner vertex: the connected vert not in newv
        src = [u for u in ln if u not in newv]
        nn = src[0].normal if src else Vector((0, 0, 1))
        v.co -= nn * depth
    newf = [g for g in res["geom"] if isinstance(g, bmesh.types.BMFace)]
    if mat is not None:
        for f in newf:
            f.material_index = mat
    bm.to_mesh(ob.data)
    bm.free()
    return ob


def recess(ob, pred, depth=0.015, wall_mat=None):
    """push the face regions selected by pred(face) inward by depth, with side walls (wall_mat)"""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.normal_update()
    fs = [f for f in bm.faces if pred(f)]
    if not fs:
        bm.free()
        return ob
    res = bmesh.ops.extrude_face_region(bm, geom=fs)
    verts = {g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)}
    faces = [g for g in res["geom"] if isinstance(g, bmesh.types.BMFace)]
    tops = [f for f in faces if all(v in verts for v in f.verts)]
    walls = [f for f in faces if f not in tops]
    bmesh.ops.delete(bm, geom=fs, context="FACES")
    for f in tops:
        f.normal_update()
    for v in verts:
        n = Vector()
        for f in v.link_faces:
            if f in tops:
                n += f.normal
        if n.length < 1e-6:
            n = v.normal
        v.co -= n.normalized() * depth
    if wall_mat is not None:
        for f in walls:
            f.material_index = wall_mat
    bm.to_mesh(ob.data)
    bm.free()
    return ob
