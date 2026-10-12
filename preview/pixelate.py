# 일러스트를 도트 그림처럼: 작게 줄이고(LANCZOS) 색을 줄인 뒤(디더 없음) 1px 검은 테두리를 두른다.
#   python3 preview/pixelate.py <in.png> <out.png> [height=64] [colors=32]
import sys
from PIL import Image, ImageFilter
INK = (16, 12, 10, 255)
def pixelate(im, h=64, colors=32):
    im = im.convert('RGBA'); im = im.crop(im.getbbox())
    w = max(1, round(im.width * h / im.height))
    small = im.resize((w, h), Image.LANCZOS)
    # 반투명 가장자리를 정리하고 색을 줄인다 (알파는 따로 보존)
    alpha = small.getchannel('A').point(lambda v: 255 if v > 110 else 0)
    rgb = small.convert('RGB').quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGBA')
    rgb.putalpha(alpha)
    # 1px 테두리
    pad = 2
    base = Image.new('RGBA', (w + pad * 2, h + pad * 2), (0, 0, 0, 0)); base.paste(rgb, (pad, pad), rgb)
    a = base.getchannel('A')
    grown = a.filter(ImageFilter.MaxFilter(3))
    out = Image.new('RGBA', base.size, (0, 0, 0, 0))
    out.paste(Image.new('RGBA', base.size, INK), (0, 0), grown)
    out.paste(base, (0, 0), a)
    return out.crop(out.getbbox())
if __name__ == '__main__':
    im = Image.open(sys.argv[1])
    h = int(sys.argv[3]) if len(sys.argv) > 3 else 64
    c = int(sys.argv[4]) if len(sys.argv) > 4 else 32
    pixelate(im, h, c).save(sys.argv[2]); print(sys.argv[2])
