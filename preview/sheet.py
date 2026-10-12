# SVG 묶음을 PNG로 바꾸고 한 장의 표(contact sheet)로 붙인다.
#   python3 -I preview/sheet.py <svg dir> <out png> [scale]
import sys, os, io, re
import cairosvg
from PIL import Image, ImageDraw

src, dst = sys.argv[1], sys.argv[2]
scale = float(sys.argv[3]) if len(sys.argv) > 3 else 2.0
files = sorted(f for f in os.listdir(src) if f.endswith('.svg'))
def order(f):
    m = re.match(r'(idle|run|big-done|big-waiting|big-error)-(\d+)\.svg', f)
    kind = ['idle', 'run', 'big-done', 'big-waiting', 'big-error'].index(m.group(1))
    return (kind, int(m.group(2)))
files.sort(key=order)
imgs = []
for f in files:
    png = cairosvg.svg2png(url=os.path.join(src, f), scale=scale, background_color='#F6F1EC')
    imgs.append((f, Image.open(io.BytesIO(png)).convert('RGBA')))
# 종류별로 한 줄씩
rows = {}
for f, im in imgs:
    rows.setdefault(order(f)[0], []).append((f, im))
pad, label_h = 12, 18
width = max(sum(im.width for _, im in r) + pad * (len(r) + 1) for r in rows.values())
height = sum(max(im.height for _, im in r) + label_h + pad for r in rows.values()) + pad
sheet = Image.new('RGBA', (width, height), '#FFFFFF')
d = ImageDraw.Draw(sheet)
y = pad
for k in sorted(rows):
    x = pad
    rh = max(im.height for _, im in rows[k])
    for f, im in rows[k]:
        d.text((x, y), f[:-4], fill='#333333')
        sheet.paste(im, (x, y + label_h), im)
        x += im.width + pad
    y += rh + label_h + pad
sheet.save(dst)
print(dst, sheet.size)
