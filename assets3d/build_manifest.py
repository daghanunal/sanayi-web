"""Write public/lib3d/manifest.json + CREDITS.txt with measured sizes and triangle counts.

  python3 assets3d/build_manifest.py [out_dir=public/lib3d]

bytes = compressed file size on disk; tris / nodes from the Blender build stats (LIB3D_BUILD/stats/<name>_<q>.json).
Assets (or versions) without fresh stats keep what the previous manifest.json said about them, so rebuilding a
subset never drops the others' triangle counts / node lists.
Budgets (asserted): every hi GLB <= 1.2 MB, every lo GLB <= 350 KB.

Versions: assets3d/versions.json gives the version the build scripts produce now. Every <name>-<q>-v<N>.glb on
disk is listed under assets[name].versions[N]. The top-level hi / lo / nodes of an asset are the DEFAULT version:
the newest one, unless PIN holds it back (an older default that live presets depend on; newer versions are then
opt-in with loadAsset(name, { version: N | 'latest' })).
"""

import json
import os
import re
import sys

OUT = sys.argv[1] if len(sys.argv) > 1 else "public/lib3d"
BUILD = os.environ.get("LIB3D_BUILD", "/tmp/lib3d-build")
HERE = os.path.dirname(os.path.abspath(__file__))
V = json.load(open(os.path.join(HERE, "versions.json")))
_mp = os.path.join(OUT, "manifest.json")
try:
    PREV = json.load(open(_mp))
    PREV_T = os.path.getmtime(_mp)
except Exception:
    PREV, PREV_T = {"assets": {}, "credits": []}, 0
# build stats: (mtime, data); older ones may be stale leftovers of a build dir that was not the one the published
# files came from (the previous manifest wins for those, see below)
st = {}
_sd = os.path.join(BUILD, "stats")
for _f in sorted(os.listdir(_sd)) if os.path.isdir(_sd) else []:
    if _f.endswith(".json"):
        _fp = os.path.join(_sd, _f)
        _k = _f[:-5]
        _name = _k.rsplit("_", 1)[0]
        st[_k] = (os.path.getmtime(_fp), json.load(open(_fp)))
_ce = os.path.join(BUILD, "credits_env.json")
env_credits = json.load(open(_ce)) if os.path.exists(_ce) else [c for c in PREV.get("credits", []) if c["file"].startswith("env/")]

HI_MAX, LO_MAX = 1_200_000, 350_000

# default version held back for assets whose newer cut changes behaviour live presets rely on
# engine v2 moves the conrod pivots onto the small-end pin (v1 pivots mid-rod; presets compensate for it)
PIN = {"engine": 1}

# name -> description, whether it has extras.explode offsets
ASSETS = {
    "car": ("Generic modern hatchback, unbranded (4.26 m). Wheels spin about local Z; doors/hood/tailgate hinge.", True),
    "car_sedan": ("Generic 4-door notchback sedan, unbranded (4.7 m). Same node conventions as car; trunk lid.", True),
    "van": ("Generic panel van / LCV, unbranded. Same node conventions as car; sliding side door, rear barn doors.", True),
    "engine": ("Inline-4 petrol engine, separable parts for exploded views (block, head, cams, pistons, crank, belt...).", True),
    "engine_diesel": ("Inline-4 common-rail turbo diesel: tall block, rail + injectors on top, turbo, intercooler stubs; separable.", True),
    "wheel": ("225/45 R17 wheel: tread blocks, two-tone alloy, vented disc, 4-pot caliper, lugs.", True),
    "seat": ("Sports car seat: bolsters, stitching; leather / fabric / alcantara material variants.", True),
    "truck": ("Cab-over tractor unit 4x2 (unbranded), wheels spin, tilting cab.", True),
    "tow_bed": ("Tilt / slide recovery bed for the truck chassis: bed, subframe, winch, ramps, wheel lift.", True),
    "trailer": ("Tri-axle curtainside semi-trailer (13.6 m), kingpin for the truck's fifth wheel, wheels spin.", True),
    "turbo": ("Turbocharger: compressor + turbine housings, CHRA, wheels on a shaft (separable).", True),
    "exhaust": ("Exhaust line: manifold, downpipe, catalyst, DPF, mid pipe, muffler, tailpipe.", True),
    "garage": ("Workshop interior: floor, walls, two-post lift, toolboxes, workbench, strip lights.", False),
    "studio": ("Studio turntable: cyclorama sweep + rotating plinth (node 'turntable').", False),
    "windshield": ("Laminated windscreen with frit band, wiper arms + blades (animatable).", True),
    "battery": ("12 V AGM car battery with terminals and clamps.", True),
    "ac_compressor": ("Automotive A/C compressor with clutch pulley and manifold ports.", True),
    "lock": ("Pin-tumbler lock cylinder (cutaway-ready) + key.", True),
    "bolt": ("Fastener set for close-ups: cylinder-head bolt, stud, nut, washer with real helical threads.", True),
    "gearbox": ("Manual 5-speed transaxle: separable casing halves, input / output gear sets, differential, forks.", True),
    "radiator": ("Radiator pack: finned core, plastic end tanks, fan shroud, spinning fan, cap, hose necks.", True),
    "injector": ("Common-rail diesel injector with a cutaway: body, solenoid, needle, spring, nozzle.", True),
    "lpg_kit": ("LPG conversion kit: toroidal tank + multivalve, reducer / vaporiser, injector rail, filter, ECU.", True),
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


def prev_version(name, ver):
    """what the previous manifest recorded for this asset version (top level or versions[ver])"""
    pa = PREV.get("assets", {}).get(name) or {}
    pv = (pa.get("versions") or {}).get(str(ver))
    if pv:
        return pv
    f = (pa.get("hi") or pa.get("lo") or {}).get("file", "")
    if f.endswith(f"-v{ver}.glb"):
        return pa
    return {}


files = os.listdir(OUT)
assets = {}
credits = []
problems = []
own = "authored from scratch in Blender by assets3d/build_{}.py (procedural, no third-party model, no brand marks)"
for name, (desc, explode) in ASSETS.items():
    cur = V.get(name, 1)
    pat = re.compile(rf"^{re.escape(name)}-(hi|lo)-v(\d+)\.glb$")
    found = sorted({int(m.group(2)) for f in files for m in [pat.match(f)] if m})
    if not found:
        continue
    versions = {}
    for ver in found:
        pv = prev_version(name, ver)
        e = {}
        for q in ("hi", "lo"):
            f = f"{name}-{q}-v{ver}.glb"
            if f not in files:
                continue
            # the build stats describe this file when they were written before it was compressed, and they are
            # news (newer than the last manifest refresh, or that refresh knew nothing about this file)
            s = {}
            if ver == cur and f"{name}_{q}" in st:
                t_st, s0 = st[f"{name}_{q}"]
                t_f = os.path.getmtime(os.path.join(OUT, f))
                if t_st <= t_f + 1 and (t_st > PREV_T or t_f > PREV_T or not (pv.get(q) or {}).get("tris")):
                    s = s0
            e[q] = {"file": f, "bytes": size(f), "tris": s.get("tris", (pv.get(q) or {}).get("tris"))}
            if s.get("dims"):
                e["dims"] = s["dims"]
            if s.get("nodes") and q == "hi":
                e["nodes"] = [n.strip() for n in s["nodes"]]
            if s.get("materials") and q == "hi":
                e["materials"] = s["materials"]
            lim = HI_MAX if q == "hi" else LO_MAX
            if e[q]["bytes"] > lim:
                problems.append(f"{f} {e[q]['bytes']} > {lim}")
            credits.append({"file": f, "source": own.format(name), "license": "own work (sanayi-web)"})
        for k in ("dims", "nodes", "materials", "notes"):
            if k not in e and pv.get(k):
                e[k] = pv[k]
        versions[ver] = e
    dflt = PIN.get(name, found[-1])
    if dflt not in versions:
        dflt = found[-1]
    entry = {"desc": desc, "explode": explode, "version": dflt, "latest": found[-1]}
    entry.update(versions[dflt])
    if len(versions) > 1:
        entry["versions"] = {str(v): versions[v] for v in found}
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
# atomic writes: parallel asset builds may refresh the manifest while a preview page is reading it
tmp = os.path.join(OUT, f".manifest.{os.getpid()}.tmp")
json.dump(man, open(tmp, "w"), indent=1, ensure_ascii=False)
os.replace(tmp, os.path.join(OUT, "manifest.json"))
tmp = os.path.join(OUT, f".credits.{os.getpid()}.tmp")
with open(tmp, "w") as fh:
    fh.write("lib3d: shared 3D assets for the sanayi-web demo sites (built by assets3d/build_all.sh)\n\n")
    for c in credits:
        fh.write(f"{c['file']}: {c['source']} - {c['license']}" + (f" ({c['note']})" if c.get("note") else "") + "\n")
os.replace(tmp, os.path.join(OUT, "CREDITS.txt"))
for n, e in assets.items():
    vs = e.get("versions") or {str(e["version"]): e}
    for v, ve in vs.items():
        tag = f"{n}-v{v}" + (" (default)" if int(v) == e["version"] and len(vs) > 1 else "")
        print(f"{tag:22s}", "  ".join(f"{q} {ve[q]['bytes'] / 1e3:7.0f} KB {ve[q]['tris'] or 0:7d} tris" for q in ("hi", "lo") if q in ve))
if problems:
    print("OVER BUDGET:\n  " + "\n  ".join(problems))
    sys.exit(1)
