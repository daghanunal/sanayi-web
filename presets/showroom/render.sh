#!/bin/sh
# showroom: red-bonnet before/after pair (Cycles, lib3d car, no badge).
#   sh presets/showroom/render.sh        (~1 min on an M4 Max)
# kaput.jpg = the render, cropped clear of the bonnet's front edge; kaput-once.jpg = the same frame dulled,
# hazed and swirl-scratched (what the paint looks like before a three-stage polish).
set -e
cd "$(dirname "$0")/../.."
B="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
T="${TMPDIR:-/tmp}/sr-render"; mkdir -p "$T"
assets3d/lock.sh "$B" -b --factory-startup --python presets/showroom/render_kaput.py -- --out "$T/kaput.png" --spp 256 --res 1170x1680 \
  --wallE 1.4 --envE 0.45 --wallw 12 --wally 7 --wcols "2,4.6,7.2,9.8" --exp 0.1 --sun 3.5 \
  --camx 2.9 --camy -0.9 --camz 1.45 --tx 1.0 --ty 0.15 --tz 0.72 --lens 50 --f 1.6 --fx 2.0 --fy -0.2 --fz 0.86 >/dev/null
python3 - "$T/kaput.png" public/img/showroom/kaput.jpg public/img/showroom/kaput-once.jpg <<'PY'
import sys, random, math
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
im = Image.open(sys.argv[1]).convert('RGB')
im = im.crop((180, 0, 1140, 1380)).resize((975, 1400), Image.LANCZOS)
im.save(sys.argv[2], quality=84, optimize=True, progressive=True)
# before: oxidised clear coat (flat, hazy, less saturated) + holograms and swirl marks from bad washing
b = ImageEnhance.Color(im).enhance(0.62)
b = ImageEnhance.Contrast(b).enhance(0.72)
b = Image.blend(b, Image.new('RGB', b.size, (168, 140, 132)), 0.16)
b = b.filter(ImageFilter.GaussianBlur(0.8))
w, h = b.size
lay = Image.new('L', (w, h), 0)
d = ImageDraw.Draw(lay)
random.seed(7)
for _ in range(150):  # swirl arcs around a few buffer centres
    cx, cy = random.choice([(w * .3, h * .45), (w * .7, h * .35), (w * .55, h * .75), (w * .2, h * .8)])
    r = random.uniform(40, 520)
    a0 = random.uniform(0, 360)
    d.arc((cx - r, cy - r, cx + r, cy + r), a0, a0 + random.uniform(10, 50), fill=random.randint(40, 110), width=1)
for _ in range(40):  # straight scratches
    x, y = random.uniform(0, w), random.uniform(0, h)
    L, ang = random.uniform(40, 300), random.uniform(-0.5, 0.5)
    d.line((x, y, x + L * math.cos(ang), y + L * math.sin(ang)), fill=random.randint(50, 120), width=1)
lay = lay.filter(ImageFilter.GaussianBlur(0.6))
# scratches only on the paint (reddish pixels), not on the glass or the background
paint = im.point(lambda v: v).convert('RGB')
px = paint.load()
m = Image.new('L', (w, h), 0); mp = m.load()
for yy in range(h):
    for xx in range(w):
        r, g, bb = px[xx, yy]
        mp[xx, yy] = 255 if r > 60 and r > g * 1.25 and r > bb * 1.25 else 0
m = m.filter(ImageFilter.GaussianBlur(3))
from PIL import ImageChops
lay = ImageChops.multiply(lay, m)
b = Image.composite(Image.new('RGB', (w, h), (235, 225, 220)), b, lay)
b.save(sys.argv[3], quality=82, optimize=True, progressive=True)
PY
ls -la public/img/showroom/kaput.jpg public/img/showroom/kaput-once.jpg
