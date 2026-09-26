"""Procedural PBR texture authoring (numpy only, runs inside Blender's Python).

Every array is float32, BOTTOM-UP (row 0 = v 0), the convention of bpy image pixels.
Normal maps are OpenGL / glTF convention (+Y = +v). All tileable unless noted.
Each material function returns (albedo_linear_rgb, orm, normal) with orm = (AO, rough, metal).
"""

import numpy as np


# ── noise ────────────────────────────────────────────────────────────────────
def _up(g, h, w):
    """wrap-around smoothstep-bilinear upsample of a small grid to h x w"""
    gh, gw = g.shape
    y = (np.arange(h) + 0.5) * gh / h - 0.5
    x = (np.arange(w) + 0.5) * gw / w - 0.5
    y0 = np.floor(y).astype(int)
    x0 = np.floor(x).astype(int)
    fy = y - y0
    fx = x - x0
    fy = fy * fy * (3 - 2 * fy)
    fx = fx * fx * (3 - 2 * fx)
    y0 %= gh
    x0 %= gw
    y1 = (y0 + 1) % gh
    x1 = (x0 + 1) % gw
    a = g[y0][:, x0]
    b = g[y0][:, x1]
    c = g[y1][:, x0]
    d = g[y1][:, x1]
    fx = fx[None, :]
    fy = fy[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(h, w, base=4, octaves=5, seed=0, gain=0.5, aspect=None):
    """tileable fractal value noise in ~[0,1], shape (h,w)"""
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    ay = aspect if aspect else max(1, round(base * h / w))
    for o in range(octaves):
        gx = min(base * 2 ** o, w)
        gy = min(ay * 2 ** o, h)
        out += amp * _up(rng.random((gy, gx)).astype(np.float32), h, w)
        tot += amp
        amp *= gain
    return out / tot


def white(h, w, seed=0):
    return np.random.default_rng(seed).random((h, w)).astype(np.float32)


def blur(a, r=1, axis=None):
    """cheap wrap box blur, radius r (repeated 2x ~ gaussian)"""
    out = a.astype(np.float32)
    axes = (0, 1) if axis is None else (axis,)
    for _ in range(2):
        for ax in axes:
            acc = np.zeros_like(out)
            for k in range(-r, r + 1):
                acc += np.roll(out, k, ax)
            out = acc / (2 * r + 1)
    return out


def voronoi(h, w, n, seed=0, aspect=1.0):
    """tileable voronoi: returns (F1 distance, F2-F1 edge distance, cell id value) in cell units"""
    rng = np.random.default_rng(seed)
    pts = rng.random((n, 2)).astype(np.float32)
    val = rng.random(n).astype(np.float32)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    yy = (yy + 0.5) / h
    xx = (xx + 0.5) / w
    f1 = np.full((h, w), 9.0, np.float32)
    f2 = np.full((h, w), 9.0, np.float32)
    idx = np.zeros((h, w), np.int32)
    s = np.sqrt(n)
    for i, (px, py) in enumerate(pts):
        dx = np.abs(xx - px)
        dx = np.minimum(dx, 1 - dx) * s
        dy = np.abs(yy - py)
        dy = np.minimum(dy, 1 - dy) * s * aspect
        d = np.sqrt(dx * dx + dy * dy)
        m1 = d < f1
        f2 = np.where(m1, f1, np.minimum(f2, d))
        idx = np.where(m1, i, idx)
        f1 = np.where(m1, d, f1)
    return f1, f2 - f1, val[idx]


def normal_from_height(hgt, strength, wrap=True):
    """height (h,w) in 'texel units x strength' -> OpenGL normal map rgb in [0,1]"""
    if wrap:
        dx = (np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1)) * 0.5
        dy = (np.roll(hgt, -1, 0) - np.roll(hgt, 1, 0)) * 0.5
    else:
        dx = np.gradient(hgt, axis=1)
        dy = np.gradient(hgt, axis=0)
    n = np.stack([-dx * strength, -dy * strength, np.ones_like(hgt)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return (n * 0.5 + 0.5).astype(np.float32)


def gray3(x):
    return np.repeat(np.asarray(x, np.float32)[..., None], 3, -1)


def tint(lum, rgb):
    return (np.asarray(lum, np.float32)[..., None] * np.asarray(rgb, np.float32)[None, None, :]).astype(np.float32)


def orm(ao, rough, metal):
    sh = np.shape(rough) if np.ndim(rough) else np.shape(ao)
    f = lambda v: np.broadcast_to(np.asarray(v, np.float32), sh)
    return np.stack([f(ao), f(rough), f(metal)], -1).astype(np.float32)


def flat_normal(n=4):
    return np.tile(np.array([0.5, 0.5, 1.0], np.float32), (n, n, 1))


# ── materials ────────────────────────────────────────────────────────────────
def rubber(n=512, seed=1, lum=0.035, rough=0.82):
    """tyre rubber: fine grain + mould flow marks. returns albedo, orm, normal"""
    f = fbm(n, n, base=64, octaves=3, seed=seed)
    m = fbm(n, n, base=4, octaves=4, seed=seed + 1)
    wn = blur(white(n, n, seed + 2), 1)
    l = lum * (1 + 0.25 * (m - 0.5) + 0.15 * (f - 0.5))
    r = np.clip(rough + 0.08 * (m - 0.5) - 0.06 * (f - 0.5), 0, 1)
    return gray3(l), orm(1, r, 0), normal_from_height(f * 1.2 + wn * 0.8, 1.2)


def cast_alu(n=512, seed=3, lum=0.62, rough=0.42):
    """sand-cast / machined-painted aluminium (engine block, turbo housing): speckled, pitted"""
    f = fbm(n, n, base=96, octaves=3, seed=seed)
    m = fbm(n, n, base=5, octaves=5, seed=seed + 1)
    pits = (white(n, n, seed + 2) > 0.994).astype(np.float32)
    pits = blur(pits, 1) * 4
    l = lum * (1 + 0.10 * (m - 0.5) + 0.12 * (f - 0.5)) - 0.15 * np.clip(pits, 0, 1)
    r = np.clip(rough + 0.14 * (f - 0.5) + 0.1 * (m - 0.5) + 0.2 * np.clip(pits, 0, 1), 0, 1)
    return gray3(l) * np.array([1.0, 1.0, 1.02], np.float32), orm(1 - 0.3 * np.clip(pits, 0, 1), r, 1), \
        normal_from_height(f * 2.0 - pits * 1.5, 1.0)


def cast_iron(n=512, seed=4, lum=0.20, rough=0.62, rust=0.0):
    """grey cast iron (block, exhaust manifold, turbine housing): dark, grainy, optional rust bloom"""
    f = fbm(n, n, base=128, octaves=3, seed=seed)
    m = fbm(n, n, base=4, octaves=5, seed=seed + 1)
    rr = np.clip((fbm(n, n, base=6, octaves=5, seed=seed + 3) - 0.55) * 4, 0, 1) * rust
    base = gray3(lum * (1 + 0.2 * (m - 0.5) + 0.25 * (f - 0.5)))
    rustc = np.array([0.22, 0.08, 0.03], np.float32)
    alb = base * (1 - rr[..., None]) + rustc[None, None, :] * rr[..., None]
    r = np.clip(rough + 0.12 * (f - 0.5) + 0.2 * rr, 0, 1)
    return alb.astype(np.float32), orm(1, r, 1 - 0.8 * rr), normal_from_height(f * 2.5 + rr * 1.5, 1.0)


def brushed(n=512, seed=5, lum=0.7, rough=0.28, radial=False):
    """brushed steel/alu, lines along u (or concentric around centre when radial)"""
    rng = np.random.default_rng(seed)
    if radial:
        yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
        rad = np.sqrt((xx - n / 2) ** 2 + (yy - n / 2) ** 2)
        lines1d = _up(rng.random((1, n)).astype(np.float32), 1, n * 2)[0]
        lines = lines1d[np.clip(rad.astype(int) * 2, 0, n * 2 - 1)]
        lines2 = lines
    else:
        lines = _up(rng.random((n, 2)).astype(np.float32), n, n)
        lines2 = _up(rng.random((n // 2, 3)).astype(np.float32), n, n)
    m = fbm(n, n, base=3, octaves=3, seed=seed + 1)
    l = lum + 0.04 * (lines - 0.5) + 0.03 * (m - 0.5)
    r = np.clip(rough + 0.08 * (lines2 - 0.5) + 0.05 * (m - 0.5), 0.05, 0.9)
    return gray3(l), orm(1, r, 1), normal_from_height(lines * 0.7 + lines2 * 0.5, 0.7)


def painted_metal(n=256, seed=6, rgb=(0.5, 0.5, 0.5), rough=0.35, orange=0.6):
    """factory paint micro orange-peel (for coat normal) + faint mottling"""
    f = fbm(n, n, base=24, octaves=3, seed=seed)
    return tint(1 + 0.02 * (f - 0.5), rgb), orm(1, rough, 0), normal_from_height(f, orange)


def textured_plastic(n=512, seed=7, lum=0.03, rough=0.7, grain=1.0):
    """interior/trim plastic with moulded stipple grain"""
    f1, e, v = voronoi(n, n, 900, seed=seed)
    f = fbm(n, n, base=48, octaves=3, seed=seed + 1)
    h = (1 - np.clip(f1, 0, 1)) * 0.6 + f * 0.6
    l = lum * (1 + 0.12 * (f - 0.5))
    r = np.clip(rough + 0.1 * (h - 0.5), 0, 1)
    return gray3(l), orm(1, r, 0), normal_from_height(h * grain, 2.0)


def leather(n=1024, seed=8, rgb=(0.02, 0.02, 0.02), rough=0.48, scale=260):
    """automotive nappa: voronoi pebble grain with creased valleys"""
    f1, e, v = voronoi(n, n, scale * 4, seed=seed)
    val = np.clip(e * 3, 0, 1)
    f = fbm(n, n, base=8, octaves=4, seed=seed + 1)
    h = np.sqrt(val) * 0.9 + 0.3 * f
    l = 1 + 0.18 * (h - 0.5) + 0.1 * (f - 0.5)
    r = np.clip(rough + 0.15 * (0.5 - val) + 0.06 * (f - 0.5), 0, 1)
    return tint(l, rgb), orm(1 - 0.25 * (1 - val), r, 0), normal_from_height(h, 3.0)


def fabric(n=512, seed=9, rgb=(0.05, 0.05, 0.055), rough=0.92, weave=64):
    """woven seat fabric (twill-ish) : albedo, orm, normal"""
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    k = 2 * np.pi * weave / n
    warp = 0.5 + 0.5 * np.sin(xx * k)
    weft = 0.5 + 0.5 * np.sin(yy * k)
    sel = (np.floor(xx * weave / n) + np.floor(yy * weave / n)) % 2
    h = np.where(sel > 0, warp, weft)
    f = fbm(n, n, base=32, octaves=3, seed=seed)
    fl = blur(white(n, n, seed + 1), 1)
    l = 1 + 0.25 * (h - 0.5) + 0.2 * (f - 0.5) + 0.1 * (fl - 0.5)
    return tint(l, rgb), orm(1 - 0.2 * (1 - h), np.clip(rough + 0.05 * (f - 0.5), 0, 1), 0), \
        normal_from_height(h * 1.0 + fl * 0.3, 2.5)


def alcantara(n=512, seed=10, rgb=(0.03, 0.03, 0.035), rough=0.95):
    """suede microfibre: soft directional nap noise"""
    f = fbm(n, n, base=16, octaves=5, seed=seed)
    fl = blur(white(n, n, seed + 1), 1)
    l = 1 + 0.35 * (f - 0.5) + 0.1 * (fl - 0.5)
    return tint(l, rgb), orm(1, rough, 0), normal_from_height(fl * 0.6 + f * 0.4, 1.5)


def honeycomb(n=512, cells=16, seed=11, lum=0.02, rough=0.45):
    """grille mesh: hex cells (alpha-free: dark holes via albedo/AO + normal)"""
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32) / n * cells
    # hex grid distance
    xs = xx * 2 / np.sqrt(3)
    q = xs
    r = yy - xx / np.sqrt(3)
    rq, rr = np.round(q), np.round(r)
    s = -q - r
    rs = np.round(s)
    dq, dr, ds = np.abs(rq - q), np.abs(rr - r), np.abs(rs - s)
    d = np.maximum(np.maximum(dq, dr), ds)
    hole = np.clip((0.40 - d) * 12, 0, 1)
    l = lum * (1 - 0.8 * hole)
    return gray3(l), orm(1 - 0.85 * hole, rough + 0.3 * hole, 0), normal_from_height(-hole * 1.0, 3.0)


def concrete_floor(n=1024, seed=12, lum=0.34, rough=0.72, epoxy=False, tint_rgb=(1.0, 0.98, 0.95)):
    """shop floor: power-floated concrete with oil stains, or grey epoxy (glossier, fewer pores)"""
    m = fbm(n, n, base=3, octaves=6, seed=seed)
    f = fbm(n, n, base=64, octaves=3, seed=seed + 1)
    pores = blur((white(n, n, seed + 2) > 0.997).astype(np.float32), 1) * 3
    stains = np.clip((fbm(n, n, base=4, octaves=5, seed=seed + 3) - 0.58) * 3.5, 0, 1)
    tyre = np.clip((fbm(n, n, base=2, octaves=4, seed=seed + 5, aspect=12) - 0.6) * 3, 0, 1)
    l = lum * (1 + 0.25 * (m - 0.5) + 0.1 * (f - 0.5)) * (1 - 0.45 * stains) * (1 - 0.25 * tyre) - 0.1 * np.clip(pores, 0, 1)
    r = rough + 0.12 * (f - 0.5) - 0.35 * stains - (0.35 if epoxy else 0)
    return tint(l, tint_rgb), orm(1, np.clip(r, 0.08, 1), 0), normal_from_height(f * (0.4 if epoxy else 1.2) - pores, 1.0)


def painted_wall(n=512, seed=13, rgb=(0.6, 0.6, 0.6), rough=0.85):
    f = fbm(n, n, base=48, octaves=3, seed=seed)
    m = fbm(n, n, base=3, octaves=5, seed=seed + 1)
    grime = np.clip(1 - (np.arange(n)[:, None] / n) * 3, 0, 1) * (0.5 + 0.5 * m)  # dirt at the bottom (v=0)
    l = (1 + 0.06 * (m - 0.5) + 0.04 * (f - 0.5)) * (1 - 0.35 * grime)
    return tint(l, rgb), orm(1, rough, 0), normal_from_height(f, 0.8)


def heat_steel(n=512, seed=14, rough=0.35):
    """stainless exhaust with heat-tint bands along u (straw -> bronze -> blue), for manifolds/downpipes"""
    x = (np.arange(n) + 0.5) / n
    f = fbm(n, n, base=8, octaves=4, seed=seed)
    t = np.clip(x[None, :] + 0.15 * (f - 0.5), 0, 1)
    stops = np.array([[0.60, 0.60, 0.62], [0.55, 0.45, 0.28], [0.45, 0.28, 0.14], [0.25, 0.16, 0.30],
                      [0.16, 0.22, 0.40], [0.40, 0.40, 0.44]], np.float32)
    k = t * (len(stops) - 1)
    i0 = np.floor(k).astype(int).clip(0, len(stops) - 2)
    fr = (k - i0)[..., None]
    alb = stops[i0] * (1 - fr) + stops[i0 + 1] * fr
    b = brushed(n, seed + 1, 1.0, rough)
    return (alb * b[0]).astype(np.float32), b[1], b[2]


def tread_wear(n=256, seed=15):
    """subtle scuffing for tyre tread surfaces"""
    f = fbm(n, n, base=32, octaves=4, seed=seed)
    return f
