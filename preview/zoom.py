# 지정한 SVG 몇 개를 크게 확대해 가로로 붙인다.  python3 preview/zoom.py <out png> <scale> <svg...>
import sys, io
import cairosvg
from PIL import Image
dst, scale, files = sys.argv[1], float(sys.argv[2]), sys.argv[3:]
imgs = [Image.open(io.BytesIO(cairosvg.svg2png(url=f, scale=scale, background_color='#F6F1EC'))).convert('RGBA') for f in files]
pad = 10
sheet = Image.new('RGBA', (sum(i.width for i in imgs) + pad * (len(imgs) + 1), max(i.height for i in imgs) + 2 * pad), '#FFFFFF')
x = pad
for im in imgs:
    sheet.paste(im, (x, pad), im); x += im.width + pad
sheet.save(dst); print(dst, sheet.size)
