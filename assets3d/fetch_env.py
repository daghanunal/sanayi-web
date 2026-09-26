"""CC0 HDRIs from Poly Haven, downloaded once at build time and hosted under public/lib3d/env/
(never requested from a third party at runtime).

  Blender -b --factory-startup --python assets3d/fetch_env.py -- --out public/lib3d/env

Each env is published as the 1k .hdr as released (hi) and a 512x256 resample (lo, Radiance RLE).
"""

import json
import os
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy

import common as C

a = C.args()
OUT = a.get("out", "public/lib3d/env")
os.makedirs(OUT, exist_ok=True)
CACHE = os.path.join(C.BUILD, "dl")
os.makedirs(CACHE, exist_ok=True)

# name -> (poly haven id, what it is for)
ENVS = {
    "workshop": ("autoshop_01", "bright auto service hall with two-post lifts under skylights + fluorescent tubes: default shop light"),
    "garage": ("garage", "moody small repair garage, fluorescent tubes, oil-stained concrete: dark hero scenes"),
    "dusk": ("highway_bridge_sunset", "urban road under a bridge at sunset: exterior car / truck shots"),
    "night": ("cobblestone_street_night", "street at night under sodium lamps: tow truck, roadside"),
    "studio": ("studio_small_09", "small photo studio with soft boxes: turntable / product shots"),
}
V = "v1"


def get(url):
    p = os.path.join(CACHE, url.rsplit("/", 1)[1])
    if not os.path.exists(p):
        req = urllib.request.Request(url, headers={"User-Agent": "sanayi-web-lib3d-build"})
        with urllib.request.urlopen(req) as r, open(p, "wb") as f:
            f.write(r.read())
    return p


def api(asset):
    req = urllib.request.Request("https://api.polyhaven.com/files/" + asset,
                                 headers={"User-Agent": "sanayi-web-lib3d-build"})
    return json.load(urllib.request.urlopen(req))


credits = []
sc = bpy.context.scene
for name, (ph, note) in ENVS.items():
    src = get(api(ph)["hdri"]["1k"]["hdr"]["url"])
    hi = f"{name}-1k-{V}.hdr"
    with open(src, "rb") as f, open(os.path.join(OUT, hi), "wb") as g:
        g.write(f.read())
    img = bpy.data.images.load(src)
    img.scale(512, 256)
    lo = f"{name}-512-{V}.hdr"
    sc.render.image_settings.file_format = "HDR"
    sc.view_settings.view_transform = "Standard"
    img.save_render(os.path.join(OUT, lo), scene=sc)
    for fn in (hi, lo):
        credits.append(dict(file="env/" + fn, source=f"https://polyhaven.com/a/{ph}", license="CC0",
                            author="Poly Haven", note=note))
    print("HDRI", name, ph, os.path.getsize(os.path.join(OUT, hi)), os.path.getsize(os.path.join(OUT, lo)))

json.dump(credits, open(os.path.join(C.BUILD, "credits_env.json"), "w"), indent=1)
