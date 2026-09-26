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
```

- `loadAsset(name, { quality, renderer, shadows = true, onProgress })`: GLTFLoader + MeshoptDecoder, URLs from
  `import.meta.env.BASE_URL` (works under `/sanayi-web/`). Meshes cast/receive shadows unless `shadows:false`;
  textures get anisotropy 8; shaders are pre-compiled with `renderer.compileAsync` when a renderer is given.
- `roll(d)`: rolls every `wheel_*` node (car, truck; `spin` on the wheel asset) by d metres towards +X,
  with the correct sign per side and each wheel's own radius. `wheels` lists them.
- `nodes`: every named node (glTF names below). `materials`: by name. `explode(t)` moves every node that has
  `extras.explode = [x,y,z]` (metres, asset space) by `t × vector` (converted into its parent's space).
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
| engine | 1072 | 68,996 | 344 | 23,818 | yes | 0.61 × 0.60 × 0.63 |
| wheel | 867 | 58,646 | 302 | 20,510 | yes | 0.63 × 0.63 × 0.23 |
| seat | 1127 | 31,460 | 266 | 6,956 | yes | 0.83 × 1.22 × 0.59 |
| truck | 1058 | 228,924 | 268 | 51,680 | yes | 5.99 × 3.81 × 3.18 |
| turbo | 701 | 29,764 | 132 | 10,580 | yes | 0.27 × 0.28 × 0.20 |
| exhaust | 371 | 24,016 | 108 | 6,538 | yes | 3.92 × 0.42 × 0.61 |
| garage | 752 | 29,534 | 168 | 7,572 | – | 9.44 × 4.50 × 8.82 |
| studio | 189 | 8,316 | 40 | 1,822 | – | 10.00 × 5.09 × 11.00 |
| windshield | 115 | 13,906 | 44 | 2,652 | yes | 1.04 × 0.52 × 1.45 |
| battery | 133 | 7,018 | 81 | 2,884 | yes | 0.29 × 0.21 × 0.35 |
| ac_compressor | 240 | 9,468 | 70 | 4,286 | yes | 0.23 × 0.18 × 0.17 |
| lock | 113 | 11,617 | 68 | 4,483 | yes | 0.10 × 0.04 × 0.04 |

Triangle counts are rendered triangles (instanced wheels / pistons counted per instance). Sizes are the
compressed files; `public/lib3d/manifest.json` has the exact bytes, dims, node lists and materials.
Reference stills: `assets3d/shots/<asset>-cycles.jpg`, three.js screenshots `<asset>-preview-hi|lo.jpg`,
all assets at a glance `lib3d-all-hi.jpg` / `lib3d-all-lo-mobile.jpg`.


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
| car body (hatch / sedan) | ekspertiz-sinematik (sedan), cekici-sinematik (car on the tow bed), yikama-sinematik (SDF car), vernik + voltaj (Ferrari GLB), agirvasita-sinematik2 (assistance van), egzoz-sinematik2 (rear bumper); candidates: boya, cam, klima, elektrik, kilit | 7 (+5) | `car` |
| inline-4 engine / parts | garaj (crank, rods, pistons), silindir (exploded I4), mikron (crank, block, head), motor-sinematik2 (head studs), lpg-sinematik (rail, cylinder), rektifiye-sinematik2 (journals), depo + yedekparca-sinematik2 (piston, belt, plug), tonaj (driveline) | 8 | `engine` |
| wheel / tyre / brake | drift (wheel.js: tread, rim, disc, caliper), lastik-sinematik2 (winter tyre), wheels of cekici, tonaj, agirvasita, ekspertiz, yikama; brake disc in depo / yedekparca | 2 hero + 7 | `wheel` (+ inside `car`, `truck`) |
| truck / tractor | agirvasita-sinematik2 (tractor + trailer), cekici-sinematik (tow truck), tonaj (6x4 tractor) | 3 | `truck` |
| seat / upholstery | kapitone (seat3d.js), doseme-sinematik2 (fabric → alcantara → nappa → quilted), yikama (interior) | 3 | `seat` |
| exhaust line | manifold (manifold → cat → DPF → muffler), egzoz-sinematik2 (tips), silindir (manifolds) | 3 | `exhaust` |
| turbo / diesel | turbo-sinematik (housings, wheels, VNT), dizel-sinematik (injector) | 2 | `turbo` |
| windscreen | cam-sinematik2, kristal (glass, frit, wiper, ADAS) | 2 | `windshield` |
| workshop bay | ekspertiz (inspection bay, lift), yikama (wash bay); every preset needs a backdrop | 2 + all | `garage`, `studio`, HDRIs |
| A/C circuit | klima-sinematik (compressor, condenser, dryer, TXV, evaporator) | 1 | `ac_compressor` |
| lock / key | kilit-sinematik (pin tumbler, key, transponder) | 1 | `lock` |
| battery / wiring | voltaj (car x-ray wiring), elektrik-sinematik2 (coil) | 1–2 | `battery` |
| gearbox | sanziman-sinematik (planetary, torque converter, DSG, CVT) | 1 | gap |
| radiator | radyator-sinematik | 1 | gap |
| injectors / LPG | dizel-sinematik, lpg-sinematik | 2 | partly (`engine` injectors) |
| non-automotive | dis (tooth), eczane (pills), restoran (grill), veteriner (booklet), mimarlik (house), alcibay (plaster), boya (paint panel) | – | out of scope |


## Known gaps / next steps

- **car**: one generic hatch body (no sedan / van variant yet); headlamp internals are simple (projector bowls
  + a DRL light guide); no engine in the bay (drop the `engine` asset in if a scene opens the hood); glass is
  alpha-blended (no refraction); side-mirror glass is a chrome stand-in.
- **engine**: no wiring loom / sensors beyond the knock sensor; piston skirts plain; mount bushings plain.
- **truck**: clean rounded cab, no roof-deflector sculpting or catwalk; one lug tread pattern on both axles;
  drum brakes only; no trailer (agirvasita / cekici still need their trailer / tow bed procedurally).
- **seat**: frame and side plates a bit boxy, no seatbelt buckle.
- **not built**: gearbox (sanziman), radiator (radyator), injectors / LPG kit (dizel, lpg), spare-parts shelf
  items (filter, shock absorber, clutch, spark plug), tow-truck bed, trailer, non-automotive heroes
  (tooth, pills, grill, house).
- **tooling**: `common._gltf_output_group` defines a 2-socket "glTF Material Output" group; importing a GLB into
  the same Blender scene afterwards fails ("Iridescence Factor") unless the group is renamed first (see
  build_studio.py). `render_cycles.py` resets the scene first, so it is unaffected.
- The HDRIs are ~1.6 MB (hi) each: load one per page. For a dark hero page the `lo` (0.4 MB) HDRI is plenty
  for lighting if the background is not the HDRI.
