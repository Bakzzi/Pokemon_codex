# preview/out/*.png 를 모아 미리보기 HTML 한 장을 만든다.  python3 preview/gallery.py <out.html>
import base64, sys
def uri(p): return 'data:image/png;base64,'+base64.b64encode(open(p,'rb').read()).decode()
lines=[('courage','용기','코로몬 → 아구몬 → 그레이몬 → 메탈그레이몬 → 워그레이몬'),('friendship','우정','츠노몬 → 가브몬 → 가루몬 → 워가루몬 → 메탈가루몬'),('love','사랑','뿌카몬 → 피요몬 → 버드라몬 → 가루다몬 → 피닉스몬'),('sincerity','순수','타네몬 → 팔몬 → 니드몬 → 릴리몬 → 로제몬'),('knowledge','지식','모티몬 → 텐타몬 → 캅테리몬 → 메가캅테리몬 → 헤라클레스캅테리몬'),('reliability','성실','푸카몬 → 파피몬 → 이크몬 → 쥬드몬 → 플레시오몬'),('hope','희망','토코몬 → 파닥몬 → 엔젤몬 → 홀리엔젤몬 → 세라피몬'),('light','빛','뉴몬 → 플롯몬 → 가트몬 → 엔젤우몬 → 오파니몬')]
sections=''.join(f'''  <section>
    <h2>{name}의 문장 <small>{chain}</small></h2>
    <figure><img src="{uri(f'preview/out/{k}-idle.png')}" alt="{chain}"></figure>
  </section>
''' for k,name,chain in lines)
html=f'''<title>디지몬 런버디 미리보기</title>
<style>
/* 레이아웃: 한 열. 위에서부터 전투 한 줄(상대 10종), 공격 순간, 알림, 문장 8계열의 쉬는 모습 */
:root {{ --bg:#F6F1EC; --fg:#2A1F1A; --sub:#7A5244; --line:#E2D6CE; --accent:#F26B21; --card:#FFFFFF;
  --display:'Jua','Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif; --body:'Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',sans-serif; }}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg:#1D1715; --fg:#F3EAE3; --sub:#C9A99A; --line:#3A2E29; --card:#2A211D; color-scheme:dark }} }}
:root[data-theme="dark"] {{ --bg:#1D1715; --fg:#F3EAE3; --sub:#C9A99A; --line:#3A2E29; --card:#2A211D; color-scheme:dark }}
body {{ background:var(--bg); color:var(--fg); font-family:var(--body); padding-inline:16px; padding-block:28px 48px; }}
main {{ max-width:1100px; margin:0 auto; display:grid; gap:26px; }}
h1 {{ font-family:var(--display); font-size:1.9rem; margin:0; text-wrap:balance; }}
h1 span {{ color:var(--accent); }}
p.lead {{ margin:6px 0 0; color:var(--sub); max-width:65ch; line-height:1.6; }}
section {{ display:grid; gap:10px; }}
h2 {{ font-size:1.05rem; margin:0; }}
h2 small {{ color:var(--sub); font-weight:400; margin-left:8px; font-size:.85rem; }}
figure {{ margin:0; background:var(--card); border:1px solid var(--line); border-radius:10px; padding:10px; overflow-x:auto; }}
figure img {{ display:block; max-width:100%; height:auto; }}
figure.wide img {{ max-width:none; width:2600px; }}
</style>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;600&display=swap">
<main>
  <header>
    <h1>디지몬 런버디 <span>어드벤처 편</span></h1>
    <p class="lead">run-buddy 모드의 캐릭터를 디지몬으로 바꿨습니다. 그림은 위키몬에 있는 DS 디지몬 스토리 전투 스프라이트에 검은 테두리를 두른 것이고, 매달 문장 하나가 뽑혀 그 파트너가 유년기부터 궁극체까지 진화합니다. 상대는 어드벤처의 빌런 10명이고 Lv.100에 오메가몬이 합류합니다.</p>
  </header>
  <section>
    <h2>전투 <small>Lv.1부터 100까지, 용기 계열. 옆으로 스크롤해 보세요</small></h2>
    <figure class="wide"><img src="{uri('preview/out/courage-run.png')}" alt="레벨별 전투 장면: 쿠와가몬부터 아포카리몬, 오메가몬까지"></figure>
  </section>
  <section>
    <h2>공격 순간 <small>서 있는 그림 그대로 몸을 움찔하며 입(손)에서 기술이 나갑니다. 고유 기술과 어울리는 경우에만 게임의 공격 장면을 씁니다</small></h2>
    <figure><img src="{uri('preview/out/attack-check.png')}" alt="아구몬, 그레이몬, 메탈그레이몬, 워그레이몬, 메탈가루몬의 공격 순간"></figure>
    <figure><img src="{uri('preview/out/attack-check2.png')}" alt="캅테리몬, 파닥몬, 엔젤몬, 플롯몬, 피요몬의 공격 순간"></figure>
  </section>
  <section>
    <h2>알림 <small>완료 · 대기 · 오류(색이 바램)</small></h2>
    <figure><img src="{uri('preview/out/big-check.png')}" alt="니드몬 완료, 헤라클레스캅테리몬 대기, 홀리엔젤몬 오류 알림"></figure>
  </section>
{sections}</main>
'''
open(sys.argv[1],'w',encoding='utf-8').write(html); print(sys.argv[1], len(html)//1024, 'KB')
