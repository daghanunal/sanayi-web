"""Write public/lib3d/manifest.json + CREDITS.txt with measured sizes and triangle counts.

  python3 assets3d/build_manifest.py [out_dir=public/lib3d]

bytes = compressed file size on disk; tris / nodes from the Blender build stats (LIB3D_BUILD/stats.json).
Budgets (asserted): every hi GLB <= 1.2 MB, every lo GLB <= 350 KB.
"""

import json
import os
import sys

OUT = sys.argv[1] if len(sys.argv) > 1 else "public/lib3d"
BUILD = os.environ.get("LIB3D_BUILD", "/tmp/lib3d-build")
st = {}
_sd = os.path.join(BUILD, "stats")
for _f in sorted(os.listdir(_sd)) if os.path.isdir(_sd) else []:
    if _f.endswith(".json"):
        st[_f[:-5]] = json.load(open(os.path.join(_sd, _f)))
env_credits = json.load(open(os.path.join(BUILD, "credits_env.json")))
V = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "versions.json")))

HI_MAX, LO_MAX = 1_200_000, 350_000

# name -> description (Turkish + English kept short), whether it has extras.explode offsets
ASSETS = {
    "car": ("Generic modern hatchback, unbranded (4.26 m). Wheels spin about local Z; doors/hood/tailgate hinge.", True),
    "engine": ("Inline-4 petrol engine, separable parts for exploded views (block, head, cams, pistons, crank, belt...).", True),
    "wheel": ("225/45 R17 wheel: tread blocks, two-tone alloy, vented disc, 4-pot caliper, lugs.", True),
    "seat": ("Sports car seat: bolsters, stitching; leather / fabric / alcantara material variants.", True),
    "truck": ("Cab-over tractor unit 4x2 (unbranded), wheels spin, tilting cab.", True),
    "turbo": ("Turbocharger: compressor + turbine housings, CHRA, wheels on a shaft (separable).", True),
    "exhaust": ("Exhaust line: manifold, downpipe, catalyst, DPF, mid pipe, muffler, tailpipe.", True),
    "garage": ("Workshop interior: floor, walls, two-post lift, toolboxes, workbench, strip lights.", False),
    "studio": ("Studio turntable: cyclorama sweep + rotating plinth (node 'turntable').", False),
    "windshield": ("Laminated windscreen with frit band, wiper arms + blades (animatable).", True),
    "battery": ("12 V AGM car battery with terminals and clamps.", True),
    "ac_compressor": ("Automotive A/C compressor with clutch pulley and manifold ports.", True),
    "lock": ("Pin-tumbler lock cylinder (cutaway-ready) + key.", True),
}

ENVS = {
    "workshop": "bright auto service hall (Poly Haven autoshop_01)",
    "garage": "moody repair garage (Poly Haven garage)",
    "dusk": "urban road at sunset (Poly Haven highway_bridge_sunset)",
    "night": "street at night, sodium lamps (Poly Haven cobblestone_street_night)",
    "studio": "small photo studio, soft boxes (Poly Haven studio_small_09)",
}


def size(f):
    return os.path.getsize(os.path.join(OUT, f))


assets = {}
credits = []
problems = []
own = "authored from scratch in Blender by assets3d/build_{}.py (procedural, no third-party model, no brand marks)"
for name, (desc, explode) in ASSETS.items():
    ver = V.get(name, 1)
    entry = {"desc": desc, "explode": explode}
    for q in ("hi", "lo"):
        f = f"{name}-{q}-v{ver}.glb"
        if not os.path.exists(os.path.join(OUT, f)):
            continue
        s = st.get(f"{name}_{q}", {})
        entry[q] = {"file": f, "bytes": size(f), "tris": s.get("tris")}
        if s.get("dims"):
            entry["dims"] = s["dims"]
        if s.get("nodes") and q == "hi":
            entry["nodes"] = [n.strip() for n in s["nodes"]]
        if s.get("materials") and q == "hi":
            entry["materials"] = s["materials"]
        lim = HI_MAX if q == "hi" else LO_MAX
        if entry[q]["bytes"] > lim:
            problems.append(f"{f} {entry[q]['bytes']} > {lim}")
        credits.append({"file": f, "source": own.format(name), "license": "own work (sanayi-web)"})
    if "hi" in entry or "lo" in entry:
        assets[name] = entry

envs = {}
for name, desc in ENVS.items():
    hi, lo = f"env/{name}-1k-v1.hdr", f"env/{name}-512-v1.hdr"
    if os.path.exists(os.path.join(OUT, hi)):
        envs[name] = {"desc": desc, "hi": {"file": hi, "bytes": size(hi)}, "lo": {"file": lo, "bytes": size(lo)}}
credits += env_credits

man = {
    "version": 1,
    "units": "metres, +Y up (glTF). Vehicles face +X; wheels spin about their local Z axis.",
    "assets": assets,
    "envs": envs,
    "budget": {"hi_max_bytes": HI_MAX, "lo_max_bytes": LO_MAX},
    "credits": credits,
}
json.dump(man, open(os.path.join(OUT, "manifest.json"), "w"), indent=1, ensure_ascii=False)
with open(os.path.join(OUT, "CREDITS.txt"), "w") as fh:
    fh.write("lib3d: shared 3D assets for the sanayi-web demo sites (built by assets3d/build_all.sh)\n\n")
    for c in credits:
        fh.write(f"{c['file']}: {c['source']} - {c['license']}" + (f" ({c['note']})" if c.get("note") else "") + "\n")
for n, e in assets.items():
    print(f"{n:14s}", "  ".join(f"{q} {e[q]['bytes'] / 1e3:7.0f} KB {e[q]['tris'] or 0:7d} tris" for q in ("hi", "lo") if q in e))
if problems:
    print("OVER BUDGET:\n  " + "\n  ".join(problems))
    sys.exit(1)
