"""Generic 4-door notchback sedan, unbranded (4.70 x 1.82 x 1.45 m, wheelbase 2.75 m).

  Blender -b --factory-startup --python assets3d/build_car_sedan.py -- --q hi --out /tmp/car_sedan-hi.glb [--look 1]

Same builder and node conventions as `car` (carkit.py = the parameterised build_car.py): the car faces +X, +Y up,
left side at -Z, origin on the ground midway between the axles. Differences: longer nose, a notchback greenhouse
(raked fixed rear window ending on a separate boot deck, wide C-pillars with a small quarter window in the rear
door frame) and a boot lid instead of the tailgate.
Nodes: car_sedan > body, glass_front, glass_rear (fixed), glass_QL / glass_QR, interior, lights_front, lights_rear,
       hood > hood_panel (pivot on the cowl: rotation.z > 0 opens),
       trunk > trunk_panel (pivot at the rear-window base: rotation.z < 0 opens, ~ -1.15 fully open),
       door_FL|FR|RL|RR > door_*_panel, glass_*, handle_* (+ mirror_L / mirror_R on the front doors),
       steer_FL|FR > wheel_FL|FR (> tyre_*, rim_*, disc_*, lugs_*, cap_*, valve_*), caliper_*, hub_RL|RR > wheel_RL|RR
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import common as C
import carkit as K

sm = K.smooth_interp
K.XF_AX, K.XR_AX = 1.37, -1.38
K.TRACK = 1.57
K.WMAX = 0.905
K.Z_BOT = sm([-2.37, -2.2, -1.8, -1.0, 1.0, 1.8, 2.1, 2.33], [0.36, 0.30, 0.215, 0.185, 0.185, 0.20, 0.24, 0.29])
K.Z_BELT = sm([-2.37, -2.30, -2.18, -1.95, -1.5, -0.4, 0.5, 0.95, 1.4, 1.9, 2.2, 2.33],
              [0.985, 1.028, 1.046, 1.05, 1.035, 1.0, 0.975, 0.955, 0.912, 0.835, 0.765, 0.725])
K.Z_ROOF = sm([-1.35, -1.0, -0.55, -0.15, 0.3], [1.37, 1.41, 1.442, 1.452, 1.432])
K.XF_S = sm([0, 0.2, 0.45, 0.6, 0.8, 1.0], [2.22, 2.29, 2.33, 2.335, 2.31, 2.25])
K.XR_S = sm([0, 0.2, 0.45, 0.7, 0.9, 1.0], [-2.27, -2.34, -2.37, -2.375, -2.365, -2.35])
# notchback greenhouse: same windscreen / cabin as the hatch, the roof ends at x -1.09 and the rear window runs
# down to the boot deck at x -1.78
K.XR_G = sm(K.G_LEV, [-1.90, -1.80, -1.695, -1.59, -1.505, -1.43, -1.36, -1.30, -1.245])
K.W_G = sm(K.G_LEV, [0.795, 0.772, 0.75, 0.725, 0.705, 0.685, 0.66, 0.63, 0.595])
K.TAPER_F = (1.6, 0.055, 0.73)
K.TAPER_R = (-1.72, 0.05, 0.65)
K.PANELS = ["body", "hood", "door_FL", "door_FR", "door_RL", "door_RR", "trunk"]
K.P_IDX = {n: i for i, n in enumerate(K.PANELS)}
TRUNK_X = float(K.XR_G(0)) - 0.06
K.REAR_X = TRUNK_X
K.REAR_PANEL = "trunk"
K.REAR_GLASS_PANEL = None
K.LOWER_NFR_HI, K.LOWER_NFR_LO = (28, 26), (12, 12)

_green0 = K.classify_green


def classify_lower(x, y, z, s, zone, frac):
    ay = abs(y)
    mat, panel = "paint", "body"
    if s < 0.055:
        mat = "plastic_black"
    if zone == "F":
        if s < 0.14:
            mat = "plastic_black"
        if 0.195 < s < 0.465 and ay < 0.55:
            mat = "grille"
        elif 0.195 < s < 0.465 and 0.64 < ay < 0.73:
            mat = "trim_black"
        if 0.76 < s < 0.87 and ay < 0.36:
            mat = "trim_black"
        tl = min(1.0, max(0.0, (ay - 0.34) / 0.46))
        if 0.745 + 0.10 * tl < s < 0.905 + 0.025 * tl and 0.34 < ay and x > 2.0:
            mat = "LAMP_F"
        if s >= 0.955 and ay < 0.64:
            panel = "hood"
    elif zone == "R":
        if s < 0.13 or (s < 0.2 and ay < 0.55):
            mat = "plastic_black"  # diffuser; the bumper above is body colour
        if 0.79 < s < 0.965 and 0.38 < ay and x < -2.14:
            mat = "LAMP_R"
        if s >= 0.62 and ay < 0.50 and mat != "LAMP_R" and x < -2.2:
            panel = "trunk"
        if 0.64 < s < 0.79 and ay < 0.30 and x < -2.2:
            mat = "trim_black"  # plate recess on the boot lid
        if 0.29 < s < 0.35 and 0.60 < ay < 0.80:
            mat = "tail_lens"
        if 0.965 <= s and x < -2.3 and ay < 0.55:
            panel = "trunk"
    else:
        d = K.door_of(x, y)
        if d and 0.085 <= s < 0.9995:
            panel = d
    return mat, panel


def classify_green(x, y, g, zone, frac, nz):
    mat, panel = _green0(x, y, g, zone, frac, nz)
    if zone == "M" and x < -1.005 and 0.05 < g:
        # fixed quarter window behind the rear door frame: its trailing edge follows the 3rd x-sample line of the
        # last greenhouse segment (continuous across levels -> a clean raked edge, no stair steps)
        xe = float(K.XR_G(g)) + K.GREEN_END[1]
        fr = (x + 0.975) / min(-1e-3, xe + 0.975)
        mat = "GLASS_S" if (fr < 0.5 and g < 0.80) else "paint"
    return mat, ("body" if panel == "tailgate" else panel)


K.classify_lower = classify_lower
K.classify_green = classify_green


def recess(lower, mi):
    gi, ti = mi["grille"], mi["trim_black"]
    C.recess(lower, lambda f: f.material_index == gi, 0.02, wall_mat=mi["plastic_black"])
    C.recess(lower, lambda f: f.material_index == ti and f.calc_center_median().x < -2.2 and f.calc_center_median().z < 0.97,
             0.012, wall_mat=mi["paint"])
    C.recess(lower, lambda f: f.material_index == ti and f.calc_center_median().x > 2.05 and f.calc_center_median().z < 0.5,
             0.03, wall_mat=mi["plastic_black"])


def pivots():
    piv = {"hood": (K.HOOD_X, 0, float(K.Z_BELT(K.HOOD_X))), "trunk": (TRUNK_X, 0, float(K.Z_BELT(TRUNK_X)) + 0.02)}
    for d in ("door_FL", "door_FR", "door_RL", "door_RR"):
        x0 = K.DOOR_F[0] if d[5] == "F" else K.DOOR_R[0]
        piv[d] = (x0, (0.86 if d[-1] == "L" else -0.86), 0.7)
    return piv


def extras(hi):
    return [K.wipers(hi), K.plate(True, hi), K.plate(False, hi), K.grille_bar(hi)]


def post(car, panels, glass, hi):
    """boot tub under the lid (dark liner, open at the top) so an opened boot does not look into the wheel arch"""
    import bmesh
    x0, x1 = TRUNK_X - 0.01, -2.29
    b = C.box((x0 - x1, 1.30, 0.44), loc=((x0 + x1) / 2, 0, 0.78))
    bmesh.ops.delete(b, geom=[f for f in b.faces if f.normal.z > 0.9], context="FACES")
    bmesh.ops.reverse_faces(b, faces=b.faces)  # seen from inside
    liner = C.obj("boot_liner", b, ["interior"], smooth=False, recalc=False)
    C.vcol_fill(liner)
    inter = [c for c in car.children if c.name == "interior"][0]
    C.vcol_fill(inter) if inter.data.color_attributes.get("Color") is None else None
    liner.parent = car
    j = C.join([inter, liner], "interior")
    j.parent = car


K.POST = post
K.RECESS = recess
K.PIVOTS = pivots
K.EXTRAS = extras

EXPLODE = {"hood": (0.25, 0.55, 0), "trunk": (-0.35, 0.55, 0), "door_FL": (0.05, 0, -0.7), "door_FR": (0.05, 0, 0.7),
           "door_RL": (-0.05, 0, -0.7), "door_RR": (-0.05, 0, 0.7), "steer_FL": (0.1, 0, -0.55), "steer_FR": (0.1, 0, 0.55),
           "hub_RL": (-0.1, 0, -0.55), "hub_RR": (-0.1, 0, 0.55), "glass_front": (0.3, 0.35, 0), "glass_rear": (-0.3, 0.35, 0),
           "interior": (0, 0.9, 0)}


def set_explode(car):
    for o in car.children_recursive:
        if o.name in EXPLODE:
            C.set_explode(o, EXPLODE[o.name])


if __name__ == "__main__":
    K.main("car_sedan", set_explode)
