# sprites/<묶음>/*.png 를 hooks/img/<묶음>.ts 로 심는다 (색마다 path 하나인 벡터 칸).
#   python3 preview/embed.py <묶음> [묶음 ...]
# 데스크톱 앱은 Svg 안의 <image>(data URI)를 그리지 않으므로 점 하나하나를 사각형으로 바꾼다.
# 같은 색이 가로로 이어진 칸을 한 줄로 묶고, 바로 아랫줄에 같은 줄이 있으면 위아래로 늘린다
import sys, os
from PIL import Image


def rects(im):
    w, h = im.size
    px = im.load()
    open_ = {}  # (x, 너비, 색) → [y, 높이]
    done = []
    for y in range(h):
        seen = set()
        x = 0
        while x < w:
            r, g, b, a = px[x, y]
            if a < 128:
                x += 1
                continue
            x0 = x
            while x < w and px[x, y][3] >= 128 and px[x, y][:3] == (r, g, b):
                x += 1
            k = (x0, x - x0, '#%02X%02X%02X' % (r, g, b))
            seen.add(k)
            if k in open_:
                open_[k][1] += 1
            else:
                open_[k] = [y, 1]
        for k in list(open_):
            if k not in seen:
                done.append((k, *open_.pop(k)))
    done += [(k, *v) for k, v in open_.items()]
    return done


def body(im):
    by = {}
    for (x, rw, color), y, rh in rects(im.convert('RGBA')):
        by.setdefault(color, []).append(f'M{x} {y}h{rw}v{rh}h-{rw}z')
    return ''.join(f'<path fill="{c}" d="{"".join(d)}"/>' for c, d in sorted(by.items()))


for line in sys.argv[1:]:
    src = os.path.join('sprites', line)
    out = os.path.join('hooks', 'img', f'{line}.ts')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    entries = []
    for f in sorted(os.listdir(src)):
        if not f.endswith('.png'): continue
        im = Image.open(os.path.join(src, f))
        entries.append(f"  {f[:-4]}: {{ w: {im.width}, h: {im.height}, body: '{body(im)}' }},")
    with open(out, 'w', encoding='utf-8') as fp:
        fp.write(f"// preview/embed.py 가 sprites/{line}/*.png 에서 만든 파일. 손으로 고치지 말 것\n")
        fp.write("import type { Sprite } from '../digi.ts'\n\n")
        fp.write(f"export const {line.upper()}: Record<string, Sprite> = {{\n" + "\n".join(entries) + "\n}\n")
    print(out, len(entries), 'sprites', os.path.getsize(out) // 1024, 'KB')
