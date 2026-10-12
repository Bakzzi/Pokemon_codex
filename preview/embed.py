# sprites/<계열>/*.png 를 hooks/img/<계열>.ts 로 심는다 (base64 data URI).
#   python3 preview/embed.py <계열> [계열 ...]
import sys, os, base64
from PIL import Image
for line in sys.argv[1:]:
    src = os.path.join('sprites', line)
    out = os.path.join('hooks', 'img', f'{line}.ts')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    entries = []
    for f in sorted(os.listdir(src)):
        if not f.endswith('.png'): continue
        name = f[:-4]
        im = Image.open(os.path.join(src, f))
        b64 = base64.b64encode(open(os.path.join(src, f), 'rb').read()).decode()
        entries.append(f"  {name}: {{ w: {im.width}, h: {im.height}, href: 'data:image/png;base64,{b64}' }},")
    with open(out, 'w', encoding='utf-8') as fp:
        fp.write(f"// preview/embed.py 가 sprites/{line}/*.png 에서 만든 파일. 손으로 고치지 말 것\n")
        fp.write("import type { Sprite } from '../digi.ts'\n\n")
        fp.write(f"export const {line.upper()}: Record<string, Sprite> = {{\n" + "\n".join(entries) + "\n}\n")
    print(out, len(entries), 'sprites', os.path.getsize(out) // 1024, 'KB')
