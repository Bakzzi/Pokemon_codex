# art/<묶음>/*.png 원본 일러스트를 화면 크기에 맞춘 도트 그림으로 바꿔 sprites/ 에 쓴다.
# 점 크기를 통일하려고 "1칸당 DOTS점"으로 높이를 정한다 (키 10칸인 아구몬 → 40px).
#   python3 preview/pixelate-all.py [art dir=art] [DOTS=4] [colors=32] [edge=soft|ink|half]
import os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from pixelate import pixelate
from PIL import Image
raw = sys.argv[1] if len(sys.argv) > 1 else 'art'
DOTS = float(sys.argv[2]) if len(sys.argv) > 2 else 4
COLORS = int(sys.argv[3]) if len(sys.argv) > 3 else 32
EDGE = sys.argv[4] if len(sys.argv) > 4 else 'soft'
gen = open('preview/gen-lines.py', encoding='utf-8').read()
heights = {}
for line in ['courage', 'friendship', 'love', 'sincerity', 'knowledge', 'reliability', 'hope', 'light']:
    # 계열 블록: " ('<line>','...'" 부터 다음 계열 시작 전까지
    start = gen.index(f" ('{line}',")
    nxt = [gen.index(f" ('{l}',") for l in ['courage','friendship','love','sincerity','knowledge','reliability','hope','light'] if gen.find(f" ('{l}',") > start]
    block = gen[start:min(nxt) if nxt else len(gen)]
    for k, h in re.findall(r"\('(\w+)','[^']+',([\d.]+),\{", block):
        heights[f'{line}/{k}'] = float(h)
mon = open('hooks/monsters.ts', encoding='utf-8').read()
for k, h in re.findall(r"\['(\w+)', ([\d.]+), (?:true|false)\]", mon):
    heights[f'monsters/{k}'] = float(h)
m = re.search(r"OMEGA = \('(\w+)', '[^']+', ([\d.]+),", gen)
if m: heights[f'omega/{m.group(1)}'] = float(m.group(2))
for key, cells in sorted(heights.items()):
    src = os.path.join(raw, key + '.png')
    if not os.path.exists(src): continue
    im = Image.open(src)
    # 너비가 19칸을 넘는 상대는 monsters.ts가 키를 줄이므로 같은 비율로 맞춘다
    h = cells
    w = cells * im.width / im.height
    if key.startswith('monsters/') and w > 19:
        h = 19 * im.height / im.width
    out = pixelate(im, max(8, round(h * DOTS)), COLORS, EDGE)
    os.makedirs(os.path.dirname(os.path.join('sprites', key)), exist_ok=True)
    out.save(os.path.join('sprites', key + '.png'))
    print(f'{key}: {im.size} -> {out.size}')
