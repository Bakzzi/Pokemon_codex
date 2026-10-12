# 전투 SVG를 "상대의 반격 순간"으로 고정한 사본을 만든다: 반격 박자(dur 3.6s begin 1s)의 묶음만 켜고, 내 기술은 끈다
#   python3 preview/foe-frame.py <in.svg> <out.svg>
import re, sys
s = open(sys.argv[1], encoding='utf-8').read()
# 반격 묶음(dur="3.6s")의 투명도 0 → 1, 날아가는 것은 도착 자리로
def on(m):
    return m.group(0).replace('<g opacity="0"', '<g opacity="1"', 1)
s = re.sub(r'<g opacity="0"( [^>]*)?><animate attributeName="opacity" values="[^"]*" keyTimes="[^"]*" dur="3\.6s"', on, s)
def move(m):
    vals = m.group(3).split(';')
    v = vals[2] if len(vals) > 3 else vals[-1]
    return f'<g opacity="1"{m.group(1) or ""} transform="translate({v})">{m.group(2)}<animateTransform attributeName="transform" type="translate" values="{m.group(3)}"'
s = re.sub(r'<g opacity="1"( [^>]*)?>(<animate attributeName="opacity"[^>]*dur="3\.6s"[^>]*/>)<animateTransform attributeName="transform" type="translate" values="([^"]+)"', move, s)
open(sys.argv[2], 'w', encoding='utf-8').write(s)
