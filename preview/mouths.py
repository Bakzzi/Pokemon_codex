# 모든 영웅 그림(모드에 보이는 방향)에 지금 설정된 발사 자리(mouth)를 빨간 점으로 찍어 한 장으로 본다
import re, sys
from PIL import Image, ImageOps, ImageDraw
src=open('preview/gen-lines.py',encoding='utf-8').read()
lines=['courage','friendship','love','sincerity','knowledge','reliability','hope','light']
rows=[]
for line in lines:
    start=src.index(f" ('{line}',")
    nxt=[src.index(f" ('{l}',") for l in lines if src.find(f" ('{l}',")>start]
    block=src[start:min(nxt) if nxt else len(src)]
    items=[]
    for m in re.finditer(r"\('(\w+)','([^']+)',([\d.]+),\{([^}]*)\}\)", block):
        k,name,h,opts=m.groups()
        flip = "'flip':True" in opts
        mm=re.search(r"'mouth':\(([\d.-]+),([\d.-]+)\)", opts)
        fx,fy=(float(mm.group(1)),float(mm.group(2))) if mm else (0.85,0.3)
        im=Image.open(f'sprites/{line}/{k}.png').convert('RGBA')
        if flip: im=ImageOps.mirror(im)
        items.append((k,name,im,fx,fy))
    rows.append(items)
S=4; pad=10; lab=14
tiles=[]
for items in rows:
    row=[]
    for k,name,im,fx,fy in items:
        big=im.resize((im.width*S,im.height*S),Image.NEAREST)
        canvas=Image.new('RGBA',(big.width+40,big.height+60),'#F6F1EC'); canvas.paste(big,(20,40),big)
        d=ImageDraw.Draw(canvas); x=20+fx*big.width; y=40+fy*big.height
        d.ellipse((x-6,y-6,x+6,y+6),fill='#E5484D',outline='#FFFFFF',width=2)
        d.text((4,4),f'{k} ({fx},{fy})',fill='#333')
        row.append(canvas)
    tiles.append(row)
W=max(sum(t.width+pad for t in r)+pad for r in tiles); H=sum(max(t.height for t in r)+pad for r in tiles)+pad
sheet=Image.new('RGBA',(W,H),'#F6F1EC'); y=pad
for r in tiles:
    x=pad
    for t in r: sheet.paste(t,(x,y)); x+=t.width+pad
    y+=max(t.height for t in r)+pad
sheet.save(sys.argv[1]); print(sheet.size)
