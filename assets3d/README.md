# lib3d: shared photoreal 3D assets for the sinematik presets

Procedurally authored in Blender 5.2 (no third-party models, no brand logos or wordmarks), published as
meshopt + WebP GLBs with a hi (desktop) and lo (phone) LOD, plus CC0 HDRIs from Poly Haven.
Pipeline pattern from the SolarDetech photoreal stage: reproducible headless Blender scripts →
raw GLB → gltf-transform (WebP textures, meshopt geometry, quantized attributes) → `manifest.json` with
measured sizes and asserted budgets → Cycles reference stills to judge the realtime look.

```
assets3d/                  build scripts (this folder)
  build_all.sh             rebuild everything from scratch (ONLY="car wheel" for a subset)
  common.py / texgen.py    Blender helpers (meshing, modifiers, AO bakes, export) / numpy PBR textures
  build_<asset>.py         one script per asset: --q hi|lo --out file.raw.glb
  fetch_env.py             downloads the HDRIs (Poly Haven API) → public/lib3d/env/
  compress.sh              raw GLB → web GLB (WebP + meshopt), node names kept
  build_manifest.py        public/lib3d/manifest.json + CREDITS.txt, budget check (hi ≤ 1.2 MB, lo ≤ 350 KB)
  render_cycles.py         Cycles still of a published GLB, framed like the preview page
  shoot_preview.mjs        Playwright screenshots of the preview page
  preview/                 picker page: asset × quality × HDRI, turntable, exploded-view slider, paint, variants
  shots/                   reference stills (Cycles) and preview screenshots
  versions.json            -vN per asset (bump when an asset is re-cut: caches never serve a stale file)
public/lib3d/              published GLBs, env/*.hdr, manifest.json, CREDITS.txt
shared/lib3d.js            runtime helper (below)
```

## Rebuild

```sh
assets3d/build_all.sh                    # everything (~4 min on an M4 Max; the Cycles AO bakes dominate)
ONLY="car" assets3d/build_all.sh         # one asset; the manifest is always refreshed
# preview:
pnpm vite --port 5401 --strictPort       # → http://localhost:5401/assets3d/preview/
node assets3d/shoot_preview.mjs /tmp/shots "asset=car&q=hi&env=workshop&az=40&el=8"
Blender -b --factory-startup --python assets3d/render_cycles.py -- --asset car --env workshop --az 40 --out /tmp/car.png
# one asset by hand (what build_all.sh does per asset; lock.sh serialises heavy jobs, LIB3D_CPU=1 if the GPU is busy)
LIB3D_CPU=1 assets3d/lock.sh Blender -b --factory-startup --python assets3d/build_bolt.py -- --q hi --out /tmp/lib3d-build/bolt-hi.raw.glb
assets3d/compress.sh /tmp/lib3d-build/bolt-hi.raw.glb public/lib3d/bolt-hi-v1.glb 90 85 && python3 assets3d/build_manifest.py
```
Requires Blender 5.2 (`BLENDER=` to override), node (npx runs `@gltf-transform/cli@4.5.0`), network for the
first HDRI download (cached in `$LIB3D_BUILD/dl`).

## Runtime API (`shared/lib3d.js`)

```js
import * as THREE from 'three';
import { loadAsset, loadEnv, pickQuality, groundAndCenter } from '../../shared/lib3d.js';

const q = pickQuality();                               // 'lo' on phones / weak devices / save-data; ?q=hi|lo overrides
renderer.toneMapping = THREE.AgXToneMapping;           // the assets are tuned for AgX (ACES works too)
scene.environment = await loadEnv('workshop', renderer, { quality: q });   // PMREM texture, cached per renderer
scene.background = scene.environment; scene.backgroundBlurriness = 0.35;   // optional

const car = await loadAsset('car', { quality: q, renderer });   // { scene, nodes, materials, explode, setVariant, dispose, info }
scene.add(car.scene);
car.materials.paint.color.set('#8e1b1f');              // recolour
car.roll(v * dt);                                      // roll every wheel_* node d metres forward (+X)
car.nodes.steer_FL.rotation.y = 0.3;                   // front wheels steer inside steer_FL / steer_FR
car.nodes.door_FL.rotation.y = -1.0;                   // doors: hinge at the front edge (left doors negative)
car.nodes.hood.rotation.z = 0.9;                       // hood hinge at the cowl; tailgate: rotation.z negative
car.materials.light_head.emissiveIntensity = 4;        // DRL / lamps on
car.dispose();                                         // geometries, materials, textures

const engine = await loadAsset('engine', { quality: q, renderer });
engine.explode(t);                                     // 0 = assembled … 1 = fully exploded (extras.explode per node)
seat.setVariant('upholstery', 'alcantara');            // material variants carried in the GLB

const e2 = await loadAsset('engine', { version: 2 });  // a specific cut ('latest' = newest); default = manifest default
e2.explodeData.head.vector;                            // [x, y, z] explode offset of one part (asset space, metres)
radiator.spin(angle);                                  // turn every node with extras.spin (fans, gears) by angle × ratio
```

- `loadAsset(name, { quality, renderer, shadows = true, onProgress })`: GLTFLoader + MeshoptDecoder, URLs from
  `import.meta.env.BASE_URL` (works under `/sanayi-web/`). Meshes cast/receive shadows unless `shadows:false`;
  textures get anisotropy 8; shaders are pre-compiled with `renderer.compileAsync` when a renderer is given.
- `roll(d)`: rolls every `wheel_*` node (car, truck; `spin` on the wheel asset) by d metres towards +X,
  with the correct sign per side and each wheel's own radius. `wheels` lists them.
- `nodes`: every named node (glTF names below). `materials`: by name. `explode(t)` moves every node that has
  `extras.explode = [x,y,z]` (metres, asset space) by `t × vector` (converted into its parent's space).
- `version`: every `<name>-<q>-vN.glb` on disk is listed in `manifest.assets[name].versions[N]`; the top-level
  files are the default (`assets[name].version`, the newest unless `build_manifest.py`'s `PIN` holds an older one
  back because live presets depend on it: **engine defaults to v1**, v2 is opt-in). `latest` = newest N.
- `explodeData[name]` = `{ node, vector, dir, base, order }` for every node with `extras.explode`
  (`vector` in asset space, `dir` converted into the parent's space, `base` = the rest position). Raw values are
  also on `node.userData.explode`.
- `spin(angle)` / `spinners`: nodes with `extras.spin = [ax, ay, az, ratio]` (axis in the node's local frame)
  are set to their rest rotation × a turn of `angle × ratio` about that axis (absolute, not incremental). One
  input angle drives a whole gear train (gearbox ratios), a fan, a turbo wheel, a winch drum.
- **Pivots** (assets built with `C.finish(pivots=True)`: every asset added after v1 of the library, and engine v2):
  every named node's origin is its documented pivot. A leaf mesh is carried by a `<name>_geo` child, so
  `nodes[name]` is an `Object3D` (use `nodes[name + '_geo']` or `.children[0]` for the mesh / material). Reason:
  gltf-transform's meshopt quantization rewrites a leaf mesh node's translation/scale (the origin jumps to the mesh
  bounds), which is why engine v1's conrods pivot mid-rod.
- `loadEnv(name, renderer, { quality })`: `workshop | garage | dusk | night | studio`, hi = 1k .hdr, lo = 512.
- `pickQuality()`: `(max-width: 820px)`, coarse pointer, `deviceMemory ≤ 4`, `hardwareConcurrency ≤ 4` or save-data → `'lo'`.
- `manifest()`: the parsed `public/lib3d/manifest.json` (files, bytes, tris, dims, node list, materials, credits).

Conventions: metres, +Y up. Vehicles face **+X**, the left side is at −Z, origin on the ground midway between the
axles. Every asset sits on y = 0 unless noted. Paint-like materials are named `paint`; lamps `light_head`,
`light_tail`, `light_amber`, `light_panel` (emissive, raise `emissiveIntensity` to switch on).

## Assets

| asset | hi KB | hi tris | lo KB | lo tris | explode | size (m, x × y × z) |
|---|---|---|---|---|---|---|
| car | 996 | 133,837 | 329 | 58,972 | yes | 4.29 × 1.48 × 2.12 |
| car_sedan | 958 | 134,734 | 328 | 58,748 | yes | 4.72 × 1.48 × 1.81 |
| van | 930 | 133,256 | 315 | 58,632 | yes | 4.99 × 1.97 × 2.25 |
| engine (v1, default) | 1072 | 68,996 | 344 | 23,818 | yes | 0.61 × 0.60 × 0.63 |
| engine v2 (`version: 2`) | 1070 | 117,428 | 348 | 25,630 | yes | 0.61 × 0.60 × 0.63 |
| engine_diesel | 1170 | 82,946 | 341 | 21,136 | yes | 0.64 × 0.64 × 0.72 |
| wheel | 867 | 58,646 | 302 | 20,510 | yes | 0.63 × 0.63 × 0.23 |
| seat | 1127 | 31,460 | 266 | 6,956 | yes | 0.83 × 1.22 × 0.59 |
| truck | 1058 | 228,924 | 268 | 51,680 | yes | 5.99 × 3.81 × 3.18 |
| tow_bed | 226 | 11,528 | 102 | 2,798 | yes | 5.67 × 1.89 × 2.42 (truck frame) |
| trailer | 632 | 250,804 | 170 | 53,016 | yes | 13.67 × 4.00 × 2.63 |
| turbo | 701 | 29,764 | 132 | 10,580 | yes | 0.27 × 0.28 × 0.20 |
| exhaust | 371 | 24,016 | 108 | 6,538 | yes | 3.92 × 0.42 × 0.61 |
| gearbox | 1143 | 85,290 | 338 | 29,300 | yes | 0.47 × 0.47 × 0.44 |
| radiator | 808 | 67,420 | 126 | 5,446 | yes | 0.27 × 0.53 × 0.86 |
| injector | 431 | 33,128 | 150 | 7,794 | yes | 0.06 × 0.17 × 0.02 |
| lpg_kit | 608 | 39,332 | 224 | 11,304 | yes | 1.46 × 0.32 × 1.00 |
| bolt | 784 | 91,698 | 263 | 24,540 | yes | 0.05 × 0.12 × 0.02 |
| garage | 752 | 29,534 | 168 | 7,572 | – | 9.44 × 4.50 × 8.82 |
| studio | 189 | 8,316 | 40 | 1,822 | – | 10.00 × 5.09 × 11.00 |
| windshield | 115 | 13,906 | 44 | 2,652 | yes | 1.04 × 0.52 × 1.45 |
| battery | 133 | 7,018 | 81 | 2,884 | yes | 0.29 × 0.21 × 0.35 |
| ac_compressor | 240 | 9,468 | 70 | 4,286 | yes | 0.23 × 0.18 × 0.17 |
| lock | 113 | 11,617 | 68 | 4,483 | yes | 0.10 × 0.04 × 0.04 |

Triangle counts are rendered triangles (instanced wheels / pistons counted per instance). Sizes are the
compressed files; `public/lib3d/manifest.json` has the exact bytes, dims, node lists and materials.
Reference stills: `assets3d/shots/<asset>-cycles.jpg`, three.js screenshots `<asset>-preview-hi|lo.jpg`,
all assets at a glance `lib3d-all-hi.jpg` / `lib3d-all-lo-mobile.jpg` (v1 set). Assets added in the second pass
(everything from `bolt` on, engine v2) are built with `pivots=True` (see Runtime API: Pivots).


### car — generic 5-door hatchback (4.30 × 1.79 × 1.48 m, wheelbase 2.64 m)
Built from level-contour lofts (`build_car.py`): the lower body (sill → shoulder; its top cap is the hood /
rear deck) and the greenhouse (belt → roof). Glass, trim, lamps, grille, plates and the opening panels are
classified from each face's (x, level, contour segment), so panel gaps (a 2.5 mm pulled-back edge + a return
flange) follow clean mesh lines. Wheel arches are exact booleans, lamps are separate lens / housing / light-guide
meshes, interior = inset cabin shell + seats, dash, steering wheel.
```
car
  body                       paint shell, trims, grille, spoiler, wipers, plates (materials: paint, trim_black, plastic_black, grille, arch_liner…)
  hood > hood_panel          pivot on the cowl: hood.rotation.z = +0.9 opens
  tailgate > tailgate_panel, glass_rear      pivot at the roof edge: rotation.z = -1.1 opens
  door_FL|FR|RL|RR > door_*_panel, glass_*, handle_*  (+ mirror_L / mirror_R on the front doors)
                             pivot on the front edge: left doors rotation.y < 0, right doors > 0
  glass_front, glass_QL, glass_QR, interior, lights_front, lights_rear
  steer_FL|FR > wheel_FL|FR (> tyre_*, rim_*, disc_*, lugs_*, cap_*, valve_*), caliper_FL|FR
  hub_RL|RR   > wheel_RL|RR, caliper_RL|RR
```
Wheels spin about their local Z. The left hubs are turned 180°, so their Z points the other way: use
`car.roll(metres)` (lib3d measures each wheel's sign and radius at load) instead of setting `rotation.z` by hand.
Steering: `steer_FL.rotation.y` / `steer_FR.rotation.y`.
Recolour `materials.paint`; lamps `light_head` (DRL + projectors), `light_tail` (emissive, dim by default).
lo: fewer loft levels, untextured trims, 24-segment "min" wheels, decimated cabin shell.

### car_sedan — generic 4-door notchback sedan (4.72 × 1.81 × 1.48 m, wheelbase 2.75 m)
Built with `carkit.py` (a parameterised copy of `build_car.py`'s level-contour loft builder; build_car.py is
untouched, so fixes there do not reach carkit automatically). Longer nose (front overhang 0.96 m), raked fixed rear
window meeting a 0.47 m boot deck at x −1.90, fixed quarter lights, separate boot lid. Same frame as `car`.
```
car_sedan
  body                       paint shell, trims, grille, plates, wipers (materials as car)
  hood > hood_panel          pivot on the cowl: hood.rotation.z = +0.9 opens
  trunk > trunk_panel        pivot at the rear-window base (x -1.96): rotation.z < 0 opens (~ -1.1 fully open)
  door_FL|FR|RL|RR > door_*_panel, glass_*, handle_*  (+ mirror_L / mirror_R on the front doors)
                             pivot on the front edge: left doors rotation.y < 0, right doors > 0
  glass_front, glass_rear (fixed, in the body), glass_QL / glass_QR, interior (with a boot tub), lights_front, lights_rear
  steer_FL|FR > wheel_FL|FR (> tyre_*, rim_*, disc_*, lugs_*, cap_*, valve_*), caliper_FL|FR
  hub_RL|RR   > wheel_RL|RR, caliper_RL|RR
```
Wheels, paint, lamps as `car` (`roll()`, `materials.paint`, `light_head`, `light_tail`). Explode: hood up / forward,
trunk up / back, doors out ±Z, wheels out, glass and interior up. lo as car. Shots: `car_sedan-cycles.jpg`,
`car_sedan-preview-hi|lo|open.jpg`.

### van — generic mid-size panel van / LCV (4.99 × 1.93 × 1.97 m, 2.25 m over the mirrors, wheelbase 3.00 m)
Built with `carkit.py`: short sloping hood, raked screen, slab box body with windowless cargo sides, fixed quarter
light ahead of each cab door, black bumpers / cladding / rub strips, pressed roof beads, bulkhead + cargo floor,
rear-door windows, tall tail lamps in the rear pillars, 215/65 R16 on 16″ alloys. Same frame as `car`.
```
van
  body                       paint shell, cladding, rub strips, roof beads, plates, wipers
  hood > hood_panel          pivot at the cowl: rotation.z > 0 opens (~0.8)
  door_FL|FR > door_*_panel, glass_*, handle_*, mirror_L / mirror_R   (front-edge hinge: left rotation.y < 0, right > 0)
  slide_door_R > slide_door_R_panel, handle_slide_R                  (pivot on the door's front edge)
  door_RL_rear / door_RR_rear > door_*_rear_panel, glass_*_rear (+ handle_RR_rear)   (pivot on the outer edge)
  glass_front, glass_QL / glass_QR, interior (seats, dash, wheel, bulkhead, floor), lights_front, lights_rear
  steer_FL|FR > wheel_FL|FR, caliper_FL|FR ;  hub_RL|RR > wheel_RL|RR
```
Sliding door (right side, +Z): pop out, then run back: `slide_door_R.position.z = z0 + 0.05·a` (a 0 → 1), then
`slide_door_R.position.x = x0 − 1.02·b` (b 0 → 1); z0 / x0 = rest position, opening 1.12 m. Barn doors:
`door_RL_rear.rotation.y < 0`, `door_RR_rear.rotation.y > 0` (±1.5 ≈ 86°, ±2.8 folds them against the sides).
Explode: hood up, cab doors out, sliding door back / out, barn doors back, wheels out, interior up. Shots:
`van-cycles.jpg`, `van-preview-hi|lo|open.jpg`.

### wheel — 225/45 R17 on a two-tone 5-twin-spoke alloy (Ø 0.634 m)
Axle along Z, face towards +Z, hub centre at the origin (the only asset not sitting on y = 0).
`wheel > spin (> tyre, rim, disc, lugs, cap, valve), caliper`. Spin: `nodes.spin.rotation.z`.
Explode: rim +0.30, lugs +0.52, cap +0.62, disc −0.30, caliper back + up. hi has 240 real tread blocks, a vented
disc with 36 vanes and a 4-pot caliper; lo keeps the grooves, drops the blocks and vanes. Materials: `tyre_tread`,
`tyre_side`, `rim_face` (machined), `rim_paint` (gunmetal), `disc_face`, `disc_hat`, `caliper_paint` (recolour).

### engine — 1.6 L DOHC 16-valve inline-4 (0.61 × 0.59 × 0.61 m)
Crank axis along X, timing belt at +X, intake at −Z, exhaust at +Z, origin at the bottom of the oil pan.
```
engine > block, head, head_gasket, valve_cover, timing_cover, timing_belt, tensioner, accessory_belt,
         camshaft_intake > cam_pulley_intake, camshaft_exhaust > cam_pulley_exhaust,
         crankshaft > crank_pulley, flywheel,   piston_1..4 > conrod_1..4,
         intake_manifold, exhaust_manifold, fuel_rail > injector_1..4, coil_1..4,
         oil_pan, oil_filter, dipstick, alternator, starter (hi), coolant_hose, mount_front, mount_rear
```
Kinematics (bore 78, stroke 83.6, rod 140 mm, firing order 1-3-4-2): crank axis at y = 0.160;
`crankshaft.rotation.x = θ`, pin phase φ = [0, π, π, 0], a = θ + φᵢ, r = 0.0418, L = 0.140:
`piston_i.position.y = 0.160 + r·cos a + √(L² − (r·sin a)²)`, `conrod_i.rotation.x = −asin(r·sin a / L)`,
`camshaft_*.rotation.x = θ / 2`. `explode()` also writes positions: animate pistons or explode, not both.
Explode order: timing cover furthest forward, valve cover / coils highest, head, cams, pistons up, crank and
oil pan down, manifolds / ancillaries outward.

#### engine v2 — `loadAsset('engine', { version: 2 })` (opt-in; the default stays v1)
Same node names as v1 (a superset), same frame, same kinematics formula, but:
- **Pivots:** every named node is an `Object3D` at its authored pivot; the mesh is the `<name>_geo` child.
  `conrod_i` sits exactly on the wrist pin (local origin of `piston_i`), so the formula
  `conrod_i.rotation.x = −asin(r·sin a / L)` needs no position correction. (v1: gltf-transform moved the conrod
  origin 79.75 mm down the rod; presets such as silindir compensate with `rod.position` — keep them on v1 or drop
  the compensation when switching.)
- **Deep bores:** the cylinders run from the deck (y 0.370) down to y 0.222 and open into the crankcase, so with
  `head`, `head_gasket`, cams, covers hidden a piston at BDC (crown y 0.286) is visible in its bore; lighter
  `piston_crown`; 10 threaded head-bolt holes in the deck.
- **head_bolt_1..10:** M10 12-point head bolts (hi: real thread helix from `build_bolt.py`, lo: plain), length
  under head 140 mm, bearing face on the cam-tub floor at y 0.452, 5 per side at x = ±0.176, ±0.088, 0,
  z = ±0.094 (hidden under the valve cover). Origin = bearing face; screw contract as the `bolt` asset
  (`rotation.y = φ`, `position.y += 0.0015·φ/2π`). Explode `[0, 0.47, 0]` (they rise clear of the head).
- **Explode data:** unchanged offsets, now also as `engine.explodeData[name]` (see Runtime API).
- **Timing cover:** smooth moulded shells with a raised panel (no horizontal ribs), finer plastic grain.
- AO is averaged onto the vertices (smaller files). lo textures 192 px to stay under 350 KB.
Shots: `engine-v2-cycles.jpg`, `engine-v2-preview-hi|lo.jpg`, `engine-v2-headoff.jpg` (BDC pistons in the bores),
`engine-v2-conrods.jpg` (block hidden, θ = 1.1 rad, rods on the pins), `engine-v2-exploded.jpg`.

### seat — sports front seat (0.56 × 1.22 × 0.84 m, faces +X)
`seat > base > base_mesh; cushion > stitching_cushion, piping_cushion; backrest > backrest_pad, stitching_back,
piping_back, headrest > headrest_pad, headrest_posts; variants > swatch_* (hidden)`.
Recline: `backrest.rotation.z` (rest ≈ +0.30, larger reclines). Headrest slides along its local +Y.
Variants: `seat.setVariant('upholstery', 'leather' | 'fabric' | 'alcantara' | 'quilted')` (bolsters, sides,
headrest) and `seat.setVariant('insert', …)` (centre panels; `quilted` = diamond kapitone). All upholstery
materials are near-white textures × colour, so `.color` recolours; thread colour: `materials.stitch.color`.

### truck — cab-over 4x2 tractor unit (5.99 × 2.50 × 3.81 m, wheelbase 3.70 m, faces +X)
```
truck > chassis (> chassis_mesh, bumper, headlamps, tail_lamps, amber_lamps)
        cab (tilt hinge at x 3.02, y 0.98: rotation.z tilts forward) > cab_body, glass_windscreen, interior,
            mirror_L, mirror_R, door_L / door_R (> door_*_panel, glass_*)
        fifth_wheel, fuel_tank, adblue_tank, battery_box, air_tanks
        steer_FL|FR > wheel_FL|FR ;  hub_R1L|R1R > wheel_R1L|R1R (twin tyres)
```
Wheels spin about local Z like the car. Materials: `paint` (cab), `light_head`, `light_amber`, `light_tail`, `glass`.
315/80 R22.5 tyres with lug tread (hi); lo uses grooved tyres and flat materials.

### turbo — turbocharger (0.27 × 0.28 × 0.21 m, shaft along X, compressor at +X)
`turbo > compressor_housing, center_housing, turbine_housing, compressor_wheel, turbine_wheel, shaft, actuator,
oil_feed, oil_drain`. `compressor_wheel`, `turbine_wheel`, `shaft` spin about local X (6 + 6 splitter backswept
blades; 11-blade turbine). Explode: housings apart along X, wheels + shaft out, actuator sideways.

### exhaust — full passenger-car line (3.92 m along X, engine end at +X)
`exhaust > manifold, flex, downpipe, catalyst, dpf, midpipe, resonator, muffler, tailpipe, hangers`.
Explode pulls the segments apart along X. Frame it with a wide camera (it is long and thin).

### ac_compressor — swash-plate A/C compressor (0.23 × 0.18 × 0.17 m)
`ac_compressor > body, pulley, clutch_plate, manifold`; `pulley` / `clutch_plate` spin about local X.

### garage — Şaşmaz-style repair bay (9 × 7 × 4.5 m, open towards +Z)
```
garage > floor, walls, roof, door, front, lights, lift (> lift_frame, lift_carriage > carriage_body, arms > arms_mesh),
         toolbox_1..3, workbench, props
```
A car at the origin facing +X sits between the lift posts (x 0.2, z ±1.52). `lift_carriage.position.y` 0 → 1.8 m
(raise the car by the same amount). Emissive tubes: `light_panel`; skylights / window strip: `window`.
AO is baked into the room (1.2 m radius) and props. Pair it with the `garage` or `workshop` HDRI.

### studio — turntable product stage
`studio > cyclorama, turntable (> turntable_disc, led_rim), softbox_1..3`. The turntable top is y = 0 (objects at
the origin sit on it); spin `turntable.rotation.y`. The softboxes are emissive props only: light with the
`studio` HDRI.

### windshield — laminated windscreen with wipers (1.45 × 0.9 m, car frame: forward +X, 28° rake)
`windshield > glass, frit, moulding, cowl, mirror, wiper_L_mount > wiper_L > (wiper_L_arm, wiper_L_blade),
wiper_R_mount > wiper_R > …`. Sweep: `wiper_L.rotation.y` 0 (parked) → 1.45, `wiper_R` 0 → 1.40 (tandem).
Frit band with halftone fade and camera patch; glass = `glass` (alpha blend, two plies in hi).

### battery — 12 V AGM (0.28 × 0.175 × 0.21 m)
`battery > case, lid, terminal_pos, terminal_neg, clamp_pos, clamp_neg, handle > handle_mesh` (handle hinges on
local X, `rotation.x ≈ -1.4` lifts it). Label is colour bands only; `indicator` is a glowing charge eye.

### lock — pin-tumbler cylinder + key (Ø 30 × 60 mm, key enters from +X)
`lock > housing > housing_front, housing_back, driver_1..5, spring_1..5; plug > plug_front, plug_back,
key_pin_1..5, key > key_blade, key_head`. `plug.rotation.x` turns, `key.position.x` slides; hide the `*_front`
nodes for a clean cutaway (each half is a closed solid).


### bolt — M10 × 1.5 fastener set for close-ups (head bolt 122 mm, stud 73 mm)
Real ISO metric threads: a right-handed helical surface (60° flanks, crest flat, rounded root), chamfered start,
run-out into the shank; the nut's internal thread is built in phase with the stud, so it stays meshed when turned.
Parts stand upright (+Y) on y = 0 in a row along X.
```
bolt > head_bolt (12-point flange head, waisted shank; origin = bearing face under the flange, on the axis),
       head_bolt_washer, stud (double-end, origin = bottom tip), washer, nut (ISO 4032, 16 AF; origin = nut centre)
```
Screw contract (pitch P = 1.5 mm, `extras.thread_pitch`): `nut.rotation.y = φ`, `nut.position.y = y₀ + P·φ/2π`
(φ > 0 unscrews, CCW seen from above); same for `head_bolt` along its axis. Explode: nut +0.045 up, washer +0.028,
head bolt +0.03. Materials: `bolt_phosphate` (dark phosphated steel), `bolt_zinc` (clear zinc), `bolt_ground`
(ground washer faces); one shared turning-mark normal map, AO baked on the vertices (thread roots darken).
hi 72 segments / turn, lo 28. Shots: `bolt-cycles.jpg`, `bolt-macro.jpg` (thread + nut close-up), `bolt-preview-*`.
The helpers (`thread()`, `head_bolt_bm()`) are reused by engine v2's head bolts.

### engine_diesel — 2.0 L common-rail turbo diesel, DOHC 16 V (0.64 × 0.64 × 0.72 m)
Same frame as `engine` (crank along X, timing belt at +X, cyl 1 at +X, intake −Z, exhaust + turbo +Z, origin at the
bottom of the oil pan) but clearly taller (deck 0.403 vs 0.370): dark cast-iron block, flat-deck head, omega-bowl
pistons, four upright solenoid injectors on the centre line through a cast-aluminium cam cover, forged rail + HP
lines + leak-off line on top, belt-driven HP pump, turbo on a cast log manifold, EGR cooler + valve, intercooler
pipe stubs with hose ends, glow plugs, vacuum pump, oil filter / cooler module, dual-mass flywheel.
```
engine_diesel > block, head, head_gasket, valve_cover, timing_cover, timing_belt, tensioner, accessory_belt,
                camshaft_intake, camshaft_exhaust > cam_pulley_exhaust,   crankshaft > crank_pulley, flywheel,
                piston_1..4 > conrod_1..4,   common_rail, injector_1..4, hp_lines, return_line, hp_pump > hp_pump_pulley,
                turbo > compressor_housing, center_housing, turbine_housing, compressor_wheel, turbo_actuator,
                exhaust_manifold, downpipe, air_inlet_hose, intercooler_pipe_out, intercooler_pipe_in,
                intake_manifold, egr_cooler, egr_valve, glow_plug_1..4, vacuum_pump,
                oil_pan, oil_filter, alternator, starter (hi), dipstick, coolant_hose
```
Kinematics (bore 81, stroke 95.5, rod 144 mm, 1968 cc, firing order 1-3-4-2): crank axis y = 0.175;
`crankshaft.rotation.x = θ`, φ = [0, π, π, 0], a = θ + φᵢ, r = 0.04775, L = 0.144:
`piston_i.position.y = 0.175 + r·cos a + √(L² − (r·sin a)²)`, `conrod_i.rotation.x = −asin(r·sin a / L)` (conrod
origin = wrist pin), `camshaft_*.rotation.x = θ/2` (exhaust cam belt-driven, intake cam by a spur pair in the tub).
Spinners (`spin(θ)`): crankshaft ×1, camshafts and HP pump pulley ×0.5, compressor wheel ×12 (visual).
Explode: rail / injectors / lines highest, cam cover, head +0.30, timing cover furthest forward (+0.50 X), crank and
flywheel down, oil pan lowest, turbo out along +Z with its housings split. The turbo parts sit under an empty scaled
0.62 (geometry from `build_turbo.py`); their explode vectors are pre-divided by 0.62 (lib3d converts explode vectors
by the parent's rotation only). Materials: `iron_cast`, `iron_hot`, `alu_cast`, `plastic_black`, `steel_machined`,
`steel_forged`, `rail_steel`, `hp_tube`, `zinc`, `piston_alu`, `piston_crown`, `stainless`, `rubber`,
`plastic_gloss`, `copper`. lo: flat untextured PBR, decimated dense meshes (≈ 9 KB headroom: add detail hi-only).

### gearbox — manual 5-speed + reverse FWD transaxle (0.47 × 0.47 × 0.44 m)
Shafts along X; the bellhousing face (engine side) is the plane x = 0 and the box extends to −X; input axis at
y 0.302, z 0; output shaft below and towards +Z, differential further down / back (+Z); stands on y = 0.
Mating to `engine`: flywheel at x ≈ −0.23, crank axis y 0.160 → place the gearbox at
(engine.x − 0.235, 0.160 − 0.302, 0) relative to the engine (approximate).
```
gearbox > case_clutch (bellhousing half), case_gear (gear housing half), end_cover (5th-gear cover)
          input_shaft > gear_1_in, gear_rev_in, gear_2_in, gear_5_in, sync_34_hub, sync_34_sleeve ;  gear_3_in, gear_4_in
          output_shaft > final_pinion, gear_3_out, gear_4_out, sync_12_hub, sync_12_sleeve, sync_5_hub, sync_5_sleeve ;
          gear_1_out, gear_2_out, gear_5_out,  reverse_idler, reverse_shaft
          diff > ring_gear, diff_case, cross_pin, planet_1, planet_2, side_gear_L, side_gear_R, flange_L, flange_R
          fork_12, fork_34, fork_5, selector_shaft, release_bearing, drain_plug, fill_plug, breather
```
Teeth (in/out): 1st 11/38 (3.45), 2nd 18/35 (1.94), 3rd 25/32 (1.28), 4th 31/30 (0.97), 5th 35/28 (0.80), reverse
11 → 19 idler → 33 (3.00), final 17/66 (3.88); meshing pairs are tooth-phased. Spin contract: every rotating node has
`extras.spin = [1, 0, 0, ratio]` (local X) relative to the input-shaft angle, posed with **3rd engaged**:
input_shaft +1, gear_3_in +1, gear_4_in +0.756, output_shaft −0.78125, gear_1_out −0.289, gear_2_out −0.514,
gear_5_out −1.25, diff +0.201, reverse_idler 0. Another gear: rewrite `userData.spin[3]` before `spin()` (output
−1/i; a free gear turns at −(driving teeth / own teeth) × its driving shaft). Shifting: `sync_*_sleeve.position.x`
±0.008 together with `fork_*.position.x`; selector shaft `rotation.z` = shift, `position.z` = select.
Open view: hide `case_gear` + `end_cover`. Explode: clutch case +X, gear case / cover −X and aside, shafts up, diff down.
Materials: `case_alu`, `gear_steel`, `gear_face`, `shaft_steel`, `steel_dark`, `cast_iron`, `bronze`, `fork_steel`,
`alu_machined`, `rubber`, `plastic_black`. lo: spur 4-point teeth, no dog / baulk rings (≈ 11 KB headroom).

### injector — common-rail solenoid injector, cutaway-ready (0.167 m tall, body Ø 19 mm)
Axis vertical, nozzle down, origin at the nozzle tip (y = 0), HP inlet (M14, tilted 20° up) towards +X, plug
towards −X. Cut plane x–y: every `*_front` node is the +Z half (faces the default camera); each half is a closed,
capped solid (`cut_face` material).
```
injector > nozzle_front / _back, nozzle_nut_front / _back, body_front / _back, valve_piece_front / _back,
           magnet_core_front / _back, coil_front / _back, magnet_nut_front / _back,
           needle, nozzle_spring, valve_piston, armature > valve_ball, armature_spring,
           hp_fuel (blue emissive fuel in the passages / gallery / control chamber), edge_filter, connector,
           return_connector, copper_washer, o_ring
```
Cutaway: hide `*_front`. Lift contract (real values): `armature.position.y += 0.00005`, then `needle.position.y`
and `valve_piston.position.y` += 0.00025 (exaggerate 5–20× for a readable animation); spray holes at y ≈ 0.0018
(spray is the scene's job). `materials.fuel.emissiveIntensity` can pulse. Explode: vertical spread, halves apart ±Z.

### radiator — compact-car cooling pack, crossflow (core 0.64 × 0.40 × 0.027 m)
Core faces +X (car forward, air flows to −X); width along Z with `tank_L` at −Z; origin at the bbox centre in x / z,
rubber mounting pins on y = 0.
```
radiator > core, tank_L, tank_R, neck_upper, neck_lower, cap, drain_cock, mount_L, mount_R, condenser, shroud, fan_motor, fan
```
`fan` spins about local X (`extras.spin = [1,0,0,1]` → `radiator.spin(angle)`), origin on the fan axis. hi core:
39 flat tubes + real zig-zag louvred fin geometry (40 rows, 2.5 mm pitch, see-through, `fin` material); crimped
header plates, ribbed glass-filled nylon tanks, 7-blade skewed fan, shroud with bell-mouth, 5-strut spider and
ram-air flaps; condenser with receiver-dryer. Explode: condenser +X, tanks / necks / mounts sideways, shroud, fan,
motor back in steps. lo: textured core faces instead of tubes / fins.

### lpg_kit — sequential LPG conversion kit laid out on the floor (1.46 × 0.32 × 1.0 m)
All parts on y = 0, origin at the layout's bbox centre; toroidal tank (630 × 210 mm) back-left.
```
lpg_kit > tank, tank_bracket, multivalve (> gauge_needle), valve_housing, reducer, filter,
          injector_rail (> injector_1..4), nozzle_hoses, map_sensor, ecu, fill_valve, gas_line, hoses
```
`gauge_needle.rotation.z`: 0 = half, +2.36 = empty (red), −2.36 = full (green); dial without text behind glass.
Explode lifts and spreads the parts (multivalve off its boss, injectors out of the rail). Materials: `tank_paint`,
`weld`, `alu_cast`, `brass`, `steel`, `steel_zinc`, `plastic_black`, `coil_black`, `rubber`, `copper`, `ecu_alu`,
`dial`, `glass`, `needle_red`, `label_silver`, `plastic_yellow`, `housing_grey`.

### tow_bed — tilt-and-slide recovery bed for the `truck` (5.2 × 2.4 m deck)
Authored in the **truck's frame**: add `tow_bed.scene` with the same transform as `truck.scene` and hide
`truck.nodes.fifth_wheel`; the subframe clamps onto the truck rails (z ±0.43, top y 1.116), deck top y 1.328, bed
from x +0.80 (behind the cab) to −4.40.
```
tow_bed > subframe (+ rear under-run bar), toolbox_L, toolbox_R,
          ram_L / ram_R (tilt cylinders, pivot = base eye, extras.rod_rest) > ram_L_rod / ram_R_rod,
          bed_tilt (pivot = rear tilt hinge x −2.66, y 1.246) > tilt_frame, ram_anchor_L / ram_anchor_R,
              bed_slide > bed (deck, side rails + contour stripe, tail roller, lamps), headboard (> light_bar),
                          winch, winch_drum (spins), cable, hook, ramp_L, ramp_R
          wheel_lift (pivot on the subframe rear) > wheel_lift_boom > wheel_lift_cross (fork arms)
```
Contract: `bed_tilt.rotation.z` > 0 raises the front / lowers the tail (≈ 0.22 working angle);
`bed_slide.position.x` < 0 slides the bed back along the tilted frame (≈ −2.8 m puts the tail near the ground at
0.22 rad); ramps hinge on the tail: `ramp_L/R.rotation.z = −π + tilt` lays them on the ground;
`winch_drum` spins (`spin()` or `rotation` about local Z); `wheel_lift.rotation.z` > 0 lowers the forks,
`wheel_lift_boom.position.x` < 0 extends. Rams follow the tilt:
```js
const pv = n.bed_tilt.position, c = Math.cos(tilt), s = Math.sin(tilt);
for (const k of ['L', 'R']) {
  const ram = n['ram_' + k], a0 = n['ram_anchor_' + k].position;          // anchor in bed_tilt space
  const ax = pv.x + a0.x * c - a0.y * s, ay = pv.y + a0.x * s + a0.y * c;   // anchor after the tilt
  ram.rotation.set(0, 0, Math.atan2(ay - ram.position.y, ax - ram.position.x));
  n['ram_' + k + '_rod'].position.x = Math.hypot(ax - ram.position.x, ay - ram.position.y) - ram.userData.rod_rest;
}
```
Materials: `paint` (bed red, recolour), `deck_plate` (galvanised checker plate), `reflective` (orange / white
contour stripe), `galv` (wheel lift), `frame_black`, `steel_dark`, `hydraulic`, `alu`, `cable`, `hook_yellow`,
`light_amber` (beacons), `light_head` (work lights), `light_tail`. Shots: `tow_bed-on-truck.jpg`,
`tow_bed-on-truck-loading.jpg` (tilt 0.22, slide 2.8, ramps down, lift lowered), `tow_bed-cycles.jpg`.

### trailer — 13.6 m tri-axle curtainside semi-trailer (13.6 × 2.55 × 4.0 m)
Faces +X, left at −Z, **origin on the ground under the kingpin**; body from x +1.20 (headboard) to −12.40 (doors).
Parked on its legs the coupler plate is at y 1.265 = the truck's fifth-wheel height. **Coupling:**
`trailer.scene.position = truck.scene.position + (−1.50, 0, 0)` (truck frame; its fifth-wheel centre is x −1.50),
then `landing_legs.position.y = 0.30` (legs up). Axles at x −7.29 / −8.60 / −9.91, 385/65 R22.5-style super singles.
```
trailer > chassis (I-beams, crossmembers, side rails, coupler plate + kingpin, lamps, under-run bars, mudflaps, stripe),
          body (floor, headboard, roof + bows, side boards, posts, rear portal),
          curtain_L / curtain_R, door_RL_rear / door_RR_rear, landing_gear > landing_legs, axles, toolbox,
          hub_1L..hub_3R > wheel_1L..wheel_3R (> tyre_*, rim_*, hubcap_*), spare_wheel
```
Contract: `trailer.roll(m)` rolls all six wheels (spin about local Z like the truck); curtains open by
`curtain_L/R.scale.x` 1 → 0.12 (pivot at the front post: the pleats bunch forward, straps included);
`door_RL_rear.rotation.y` < 0 and `door_RR_rear.rotation.y` > 0 swing the barn doors out (±2.6 lies them along the
sides); `landing_legs.position.y` 0 (parked, feet on the ground) → 0.30 (coupled). Explode: body up, curtains
sideways, doors back, axles down, hubs out. Materials: `curtain` (near-white PVC fabric: `.color` recolours it,
default white), `paint` (headboard, doors, side rails), `frame_black`, `alu`, `roof`, `reflective` (yellow contour
stripe), `red_reflective`, `strap`, `buckle`, `light_tail`, `light_amber`, truck tyre / rim materials.
Shots: `trailer-coupled.jpg`, `trailer-coupled-open.jpg`, `trailer-cycles.jpg`, `trailer-preview-hi|lo.jpg`.


## HDRIs (Poly Haven, CC0)

| name | source | use |
|---|---|---|
| workshop | autoshop_01 | bright auto service hall, lifts, skylights: default shop light |
| garage | garage | moody small repair garage, fluorescent tubes: dark hero scenes |
| dusk | highway_bridge_sunset | urban road at sunset: exterior car / truck shots |
| night | cobblestone_street_night | street at night, sodium lamps: tow truck, roadside |
| studio | studio_small_09 | soft boxes: turntable / product shots |

hi = the 1k .hdr as published (~1.6 MB), lo = 512×256 resample (~0.4 MB). Loaded once per renderer.

## Budgets and how they are met

- hi GLB ≤ 1.2 MB, lo GLB ≤ 350 KB (asserted by `build_manifest.py`).
- Geometry: meshopt + KHR_mesh_quantization (positions i16, normals i8, UVs u16). UVs are kept inside
  [0, 1] (tile repeats are `KHR_texture_transform`, see `C.fix_uv_wrap`) so they quantize.
- Textures: authored in numpy (`texgen.py`), WebP (normals q90, colour q85; lo capped at 256 px).
- Ambient occlusion: Cycles bakes into vertex colours (`COLOR_0`, multiplied into base colour) with the whole
  asset occluding, so contact shadows survive without extra texture sets.
- Shared meshes: the four car wheels are one mesh set instanced by four nodes.

## Survey (2026-09): what the sinematik presets model today

37 presets import three.js (grep of `presets/*/scene.js`, `engine.js`, `wheel.js`, `seat3d.js`, `parts.js`…).
All of them light with `RoomEnvironment`; only vernik / voltaj (CC-BY Ferrari), yikama (SDF car) and dis
(tooth) load a GLB. Hero objects, ranked by reuse:

| object | presets that model it procedurally today | uses | lib3d asset |
|---|---|---|---|
| car body (hatch / sedan) | ekspertiz-sinematik (sedan), cekici-sinematik (car on the tow bed), yikama-sinematik (SDF car), vernik + voltaj (Ferrari GLB), agirvasita-sinematik2 (assistance van), egzoz-sinematik2 (rear bumper); candidates: boya, cam, klima, elektrik, kilit | 7 (+5) | `car`, `car_sedan`, `van` |
| inline-4 engine / parts | garaj (crank, rods, pistons), silindir (exploded I4), mikron (crank, block, head), motor-sinematik2 (head studs), lpg-sinematik (rail, cylinder), rektifiye-sinematik2 (journals), depo + yedekparca-sinematik2 (piston, belt, plug), tonaj (driveline) | 8 | `engine` (v2: pivots, deep bores, head bolts), `engine_diesel`, `bolt` |
| wheel / tyre / brake | drift (wheel.js: tread, rim, disc, caliper), lastik-sinematik2 (winter tyre), wheels of cekici, tonaj, agirvasita, ekspertiz, yikama; brake disc in depo / yedekparca | 2 hero + 7 | `wheel` (+ inside `car`, `truck`) |
| truck / tractor | agirvasita-sinematik2 (tractor + trailer), cekici-sinematik (tow truck), tonaj (6x4 tractor) | 3 | `truck`, `tow_bed`, `trailer` |
| seat / upholstery | kapitone (seat3d.js), doseme-sinematik2 (fabric → alcantara → nappa → quilted), yikama (interior) | 3 | `seat` |
| exhaust line | manifold (manifold → cat → DPF → muffler), egzoz-sinematik2 (tips), silindir (manifolds) | 3 | `exhaust` |
| turbo / diesel | turbo-sinematik (housings, wheels, VNT), dizel-sinematik (injector) | 2 | `turbo`, `engine_diesel`, `injector` |
| windscreen | cam-sinematik2, kristal (glass, frit, wiper, ADAS) | 2 | `windshield` |
| workshop bay | ekspertiz (inspection bay, lift), yikama (wash bay); every preset needs a backdrop | 2 + all | `garage`, `studio`, HDRIs |
| A/C circuit | klima-sinematik (compressor, condenser, dryer, TXV, evaporator) | 1 | `ac_compressor` |
| lock / key | kilit-sinematik (pin tumbler, key, transponder) | 1 | `lock` |
| battery / wiring | voltaj (car x-ray wiring), elektrik-sinematik2 (coil) | 1–2 | `battery` |
| gearbox | sanziman-sinematik (planetary, torque converter, DSG, CVT) | 1 | `gearbox` (manual transaxle) |
| radiator | radyator-sinematik | 1 | `radiator` |
| injectors / LPG | dizel-sinematik, lpg-sinematik | 2 | `injector`, `lpg_kit` |
| non-automotive | dis (tooth), eczane (pills), restoran (grill), veteriner (booklet), mimarlik (house), alcibay (plaster), boya (paint panel) | – | out of scope |


## Known gaps / next steps

- **car**: one generic hatch body; headlamp internals are simple (projector bowls + a DRL light guide); no engine
  in the bay (drop the `engine` asset in if a scene opens the hood); glass is alpha-blended (no refraction);
  side-mirror glass is a chrome stand-in. `car_sedan` / `van`: no `light_amber` (no indicator lenses, like `car`);
  the hood opens onto the wheel arches (no engine-bay floor); sedan nose / bumper shared with the hatch, wiper
  bar sits high on the cowl; van: slight belt crease on the cargo side, no sliding-door rail channel, alloys only.
- **engine**: no wiring loom / sensors beyond the knock sensor; piston skirts plain; mount bushings plain. v2 is
  opt-in (silindir compensates v1's mid-rod conrod pivot); switch presets one by one, then move the default
  (`PIN` in build_manifest.py).
- **engine_diesel**: no loom, DPF or mounts; water pump not modelled; lo has ≈ 9 KB headroom.
- **gearbox**: no clutch disc / pressure plate, no bearing balls, approximate involutes; manual only (no automatic
  / DSG / CVT internals for sanziman's other chapters).
- **injector**: HP passages are section-plane "fuel" rods, not real drillings; straight connector; no clamp.
- **radiator / lpg_kit**: no hoses on the radiator necks; condenser is a textured face; LPG hoses float free when
  exploded; no harness.
- **tow_bed**: the rams are driven by the scene (snippet above); no hydraulic hoses, no crane (the German
  "Plateau + Kran" type); the bed overhangs the tractor's short wheelbase more than a purpose-built carrier.
- **trailer**: curtains open by scaling (pleats compress, they do not slide on rollers); middle posts fixed; the
  super singles reuse the truck's 315/80 tyre stretched 1.22× in width.
- **truck**: clean rounded cab, no roof-deflector sculpting or catwalk; one lug tread pattern on both axles;
  drum brakes only.
- **seat**: frame and side plates a bit boxy, no seatbelt buckle.
- **not built**: spare-parts shelf items (filter, shock absorber, clutch, spark plug), automatic gearbox internals,
  non-automotive heroes (tooth, pills, grill, house).
- **tooling**: `common._gltf_output_group` defines a 2-socket "glTF Material Output" group; importing a GLB into
  the same Blender scene afterwards fails ("Iridescence Factor") unless the group is renamed first (see
  build_studio.py). `render_cycles.py` resets the scene first, so it is unaffected.
- The HDRIs are ~1.6 MB (hi) each: load one per page. For a dark hero page the `lo` (0.4 MB) HDRI is plenty
  for lighting if the background is not the HDRI.

## Build tooling notes (second pass)

- `C.finish(..., pivots=True)` → `C.keep_pivots(root)`: leaf mesh nodes become pivot empties + `<name>_geo`
  children, so compress.sh's quantization can no longer move node origins (it rewrites a leaf mesh node's
  translation/scale). Use it for every new asset.
- `C.vcol_to_points(ob)`: averages the corner-domain AO bake onto vertices; a corner colour layer splits every
  vertex per face on export (bolt: 2.3 MB → 0.8 MB). `C.join` now fills a missing colour layer with white (it used
  to come out black on the parts that had none).
- `C.set_explode(ob, v3)`, `C.set_spin(ob, axis3, ratio)`, `C.b2t(v)` (Blender → three coordinates).
- `assets3d/lock.sh <cmd>`: a mkdir mutex so parallel builders run one Blender / browser at a time (build_all.sh
  uses it); `LIB3D_CPU=1` bakes / renders on the CPU when the GPU is busy.
- `build_manifest.py`: lists every `-vN` file under `versions`, keeps previous-manifest data for files without
  fresh stats (a subset rebuild never drops the others), atomic writes, `PIN` for held-back defaults.
- `render_cycles.py --v N --hide a,prefix*`, preview `?v=N&hide=a,prefix*&anim=angle`, and a version picker.
- Reference photos for the second pass: Wikimedia Commons (search API + `Special:FilePath`), viewed next to the
  renders; not redistributed.
