# preview/out/fx/*.svg → sprites/fx/*.png (도트: 색 12개, 디더 없음, 반투명은 자르고 테두리는 두르지 않는다)
import os, io
import cairosvg
from PIL import Image
os.makedirs('sprites/fx', exist_ok=True)
n = 0
for f in sorted(os.listdir('preview/out/fx')):
    if not f.endswith('.svg'): continue
    png = cairosvg.svg2png(url=os.path.join('preview/out/fx', f))
    im = Image.open(io.BytesIO(png)).convert('RGBA')
    alpha = im.getchannel('A').point(lambda v: 255 if v > 90 else 0)
    rgb = im.convert('RGB').quantize(colors=12, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    rgb.putalpha(alpha)
    rgb.save(os.path.join('sprites/fx', f[:-4] + '.png')); n += 1
print(n, 'fx sprites')
