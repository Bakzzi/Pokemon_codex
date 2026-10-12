# 전투 SVG를 "공격 순간"으로 고정한 사본을 만든다 (정지 렌더러는 SMIL을 모르므로):
#  - 투명도 0으로 시작해 주기 중에 켜지는 묶음(<g opacity="0"><animate attributeName="opacity"…)을 모두 켠다
#  - 서 있는 그림(1;1;0;0;1;1)은 끈다 (공격 장면이 있으면 그쪽이 보인다)
#  - translate 움직임이 있으면 값 목록의 세 번째 자리(날아가는 중간·도착)로 옮긴다
#   python3 preview/attack-frame.py <in.svg> <out.svg>
import re, sys
s = open(sys.argv[1], encoding='utf-8').read()
s = s.replace('<g><animate attributeName="opacity" values="1;1;0;0;1;1"', '<g opacity="0"><animate attributeName="opacity" values="1;1;0;0;1;1"')
def show(m):
    head, anim = m.group(1), m.group(2)
    rest = s_after = ''
    return f'<g opacity="1">{anim}'
s = re.sub(r'<g opacity="0">(<animate attributeName="opacity"[^>]*/>)', lambda m: f'<g opacity="1">{m.group(1)}', s)
# 묶음 바로 안의 translate 움직임: 값 목록에서 세 번째 값(없으면 마지막)으로 transform을 박는다
def move(m):
    vals = m.group(2).split(';')
    v = vals[2] if len(vals) > 3 else vals[-1]
    return f'<g opacity="1" transform="translate({v})">{m.group(1)}<animateTransform attributeName="transform" type="translate" values="{m.group(2)}"'
s = re.sub(r'<g opacity="1">(<animate attributeName="opacity"[^>]*/>)<animateTransform attributeName="transform" type="translate" values="([^"]+)"', move, s)
open(sys.argv[2], 'w', encoding='utf-8').write(s)
