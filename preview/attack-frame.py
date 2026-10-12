# 전투 SVG를 "공격 순간"(주기의 0.6쯤)으로 고정한 사본을 만든다: 공격 그림·날아가는 것·맞은 불꽃을 켜고 서 있는 그림을 끈다
#   python3 preview/attack-frame.py <in.svg> <out.svg>
import re, sys
s = open(sys.argv[1], encoding='utf-8').read()
s = s.replace('<g><animate attributeName="opacity" values="1;1;0;0;1;1"', '<g opacity="0"><animate attributeName="opacity" values="1;1;0;0;1;1"')
s = s.replace('<g opacity="0"><animate attributeName="opacity" values="0;0;1;1;0;0"', '<g opacity="1"><animate attributeName="opacity" values="0;0;1;1;0;0"')
# 날아가는 것: 출발점과 도착점 사이(40%)에 놓고 보이게. 입가의 번쩍임도 켠다
def mid(m):
    x0, y, x1 = float(m.group(2)), m.group(3), float(m.group(4))
    x = x0 + (x1 - x0) * 0.4
    return f'<g opacity="1" transform="translate({x:.2f} {y})">{m.group(1)}<animateTransform attributeName="transform" type="translate" values="{m.group(2)} {y};{m.group(2)} {y};{m.group(4)} {y};{m.group(4)} {y}"'
s = re.sub(r'<g opacity="0">(<animate attributeName="opacity" values="0;1;0" keyTimes="0;0.44;0.6"[^>]*/>)<animateTransform attributeName="transform" type="translate" values="([\d.]+) ([\d.]+);[\d.]+ [\d.]+;([\d.]+) [\d.]+;[\d.]+ [\d.]+"', mid, s)
s = s.replace('<g opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.4;0.43;0.5;1"', '<g opacity="1"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.4;0.43;0.5;1"')
s = s.replace('<g opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.6;0.62;0.72;1"', '<g opacity="1"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.6;0.62;0.72;1"')
open(sys.argv[2], 'w', encoding='utf-8').write(s)
