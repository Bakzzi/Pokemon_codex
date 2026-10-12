# 일러스트를 도트 그림처럼: 작게 줄이고(LANCZOS) 색을 줄인 뒤(디더 없음) 1px 검은 테두리를 두른다.
#   python3 preview/pixelate.py <in.png> <out.png> [height=64] [colors=32]
import sys
from PIL import Image, ImageFilter
INK = (16, 12, 10, 255)
# 테두리 방식: 'ink' 순검정 1점, 'soft' 옆 색을 어둡게 한 1점(실제 도트 스프라이트의 선택적 테두리, 얇아 보인다), 'half' 반투명 검정
def pixelate(im, h=64, colors=32, edge='soft', dark=0.42):
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
    if edge == 'half':
        out.paste(Image.new('RGBA', base.size, INK[:3] + (150,)), (0, 0), grown)
    elif edge == 'soft':
        # 테두리 점마다 가장 가까운 몸 색을 찾아 어둡게 칠한다
        ring = Image.new('RGBA', base.size, (0, 0, 0, 0)); rp = ring.load(); bp = base.load(); ap = a.load(); gp = grown.load()
        W, H = base.size
        for y in range(H):
            for x in range(W):
                if gp[x, y] and not ap[x, y]:
                    near = None
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < W and 0 <= ny < H and ap[nx, ny]:
                            near = bp[nx, ny]; break
                    r, g, b = (near or INK)[:3]
                    rp[x, y] = (int(r * dark), int(g * dark), int(b * dark), 255)
        out.paste(ring, (0, 0), grown)
    else:
        out.paste(Image.new('RGBA', base.size, INK), (0, 0), grown)
    out.paste(base, (0, 0), a)
    return out.crop(out.getbbox())
if __name__ == '__main__':
    im = Image.open(sys.argv[1])
    h = int(sys.argv[3]) if len(sys.argv) > 3 else 64
    c = int(sys.argv[4]) if len(sys.argv) > 4 else 32
    e = sys.argv[5] if len(sys.argv) > 5 else 'soft'
    pixelate(im, h, c, e).save(sys.argv[2]); print(sys.argv[2])
