# 내려받은 스프라이트에 검은 테두리(1px, 8방향)를 두르고 sprites/<묶음>/<이름>.png 로 저장한다.
#   python3 preview/outline.py <raw dir> <sprites dir> [thickness]
import sys, os
from PIL import Image, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
thick = int(sys.argv[3]) if len(sys.argv) > 3 else 1
INK = (16, 12, 10, 255)
def outline(im):
    im = im.convert('RGBA')
    # 여백을 두르고, 반투명 가장자리는 불투명하게 (테두리가 또렷하게 붙도록)
    pad = thick + 1
    base = Image.new('RGBA', (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    base.paste(im, (pad, pad), im)
    a = base.getchannel('A').point(lambda v: 255 if v > 40 else 0)
    grown = a.filter(ImageFilter.MaxFilter(thick * 2 + 1))
    ring = Image.new('RGBA', base.size, INK)
    out = Image.new('RGBA', base.size, (0, 0, 0, 0))
    out.paste(ring, (0, 0), grown)
    solid = Image.new('RGBA', base.size, (0, 0, 0, 0))
    solid.paste(base, (0, 0), a)
    out.paste(solid, (0, 0), a)
    return out.crop(out.getbbox())
for group in sorted(os.listdir(src)):
    g = os.path.join(src, group)
    if not os.path.isdir(g): continue
    os.makedirs(os.path.join(dst, group), exist_ok=True)
    for f in sorted(os.listdir(g)):
        if not f.endswith('.png'): continue
        im = Image.open(os.path.join(g, f))
        o = outline(im)
        # 256색 팔레트로 줄여 저장 (용량 절반, 테두리가 또렷해 눈에 띄는 차이 없음)
        o.quantize(colors=255, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(os.path.join(dst, group, f), optimize=True)
        print(f'{group}/{f}: {im.size} -> {o.size}')
