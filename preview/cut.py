# 스프라이트 시트에서 낱장을 잘라낸다: 바깥의 순검정 배경을 투명하게 만들고(윤곽선의 거의-검정은 남긴다),
# 서로 떨어진 그림마다 PNG로 저장한다. 왼쪽부터 이름을 붙인다.
#   python3 preview/cut.py <sheet.png> <out dir> <name1,name2,...> [bg=0,0,0]
import sys, os
from collections import deque
from PIL import Image

src, out, names = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
bg = tuple(int(v) for v in (sys.argv[4] if len(sys.argv) > 4 else '0,0,0').split(','))
im = Image.open(src).convert('RGBA')
w, h = im.size
px = im.load()

# 1) 테두리에서 닿는 배경색을 투명으로 (안쪽에 갇힌 배경색 조각은 그대로)
seen = bytearray(w * h)
q = deque()
def push(x, y):
    i = y * w + x
    if not seen[i] and px[x, y][:3] == bg and px[x, y][3] > 0:
        seen[i] = 1; q.append((x, y))
for x in range(w): push(x, 0); push(x, h - 1)
for y in range(h): push(0, y); push(w - 1, y)
while q:
    x, y = q.popleft()
    px[x, y] = (0, 0, 0, 0)
    if x > 0: push(x - 1, y)
    if x < w - 1: push(x + 1, y)
    if y > 0: push(x, y - 1)
    if y < h - 1: push(x, y + 1)

# 2) 불투명 점의 연결 덩어리(8방향)마다 경계 상자
comp = [0] * (w * h)
boxes = []
for y0 in range(h):
    for x0 in range(w):
        if px[x0, y0][3] == 0 or comp[y0 * w + x0]: continue
        k = len(boxes) + 1
        comp[y0 * w + x0] = k
        q = deque([(x0, y0)]); x1 = x2 = x0; y1 = y2 = y0; n = 0
        while q:
            x, y = q.popleft(); n += 1
            x1, x2, y1, y2 = min(x1, x), max(x2, x), min(y1, y), max(y2, y)
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] and not comp[ny * w + nx]:
                        comp[ny * w + nx] = k; q.append((nx, ny))
        boxes.append([x1, y1, x2, y2, n])

# 3) 작은 조각(떨어진 점)은 가장 가까운 큰 상자에 합친다
big = sorted([b for b in boxes if b[4] >= 200], key=lambda b: b[0])
for b in boxes:
    if b[4] >= 200: continue
    cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
    best = min(big, key=lambda B: max(0, B[0] - cx, cx - B[2]) + max(0, B[1] - cy, cy - B[3]))
    best[0], best[1], best[2], best[3] = min(best[0], b[0]), min(best[1], b[1]), max(best[2], b[2]), max(best[3], b[3])
# 겹치는 상자끼리 합치기
merged = True
while merged:
    merged = False
    for i in range(len(big)):
        for j in range(i + 1, len(big)):
            a, b = big[i], big[j]
            if a[0] <= b[2] and b[0] <= a[2] and a[1] <= b[3] and b[1] <= a[3]:
                a[0], a[1], a[2], a[3] = min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])
                big.pop(j); merged = True; break
        if merged: break
big.sort(key=lambda b: b[0])
os.makedirs(out, exist_ok=True)
if len(big) != len(names):
    print(f'그림 {len(big)}개를 찾았는데 이름은 {len(names)}개입니다:', [(b[0], b[1], b[2] - b[0] + 1, b[3] - b[1] + 1) for b in big]); sys.exit(1)
for name, (x1, y1, x2, y2, _) in zip(names, big):
    crop = im.crop((x1, y1, x2 + 1, y2 + 1))
    crop.save(os.path.join(out, f'{name}.png'))
    print(f'{name}.png {crop.width}x{crop.height}')
