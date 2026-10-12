# 큰 일러스트(서바이브·설정화)를 모드용으로 준비: 높이를 맞춰 줄이고(LANCZOS) 반투명 가장자리를 정리한 뒤 저장.
#   python3 preview/prep-art.py <in.png> <out.png> [height=160]
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGBA')
im = im.crop(im.getbbox())
h = int(sys.argv[3]) if len(sys.argv) > 3 else 160
if im.height > h:
    im = im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)
im.save(sys.argv[2])
print(sys.argv[2], im.size)
