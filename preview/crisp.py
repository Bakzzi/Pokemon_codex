# 미리보기 전용: cairosvg는 image-rendering:pixelated를 모르므로, SVG 안의 base64 PNG를 미리 NEAREST로 8배 키워 넣는다 (점 하나가 정수 px가 되는 배율로 뽑으면 또렷하다).
# (앱의 브라우저 렌더러는 pixelated를 지원하므로 실제 모드에는 필요 없다)
import base64, hashlib, io, re
from PIL import Image
_cache = {}
def _up(b64):
    key = hashlib.md5(b64.encode()).hexdigest()
    if key not in _cache:
        im = Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGBA')
        if im.height <= 128:
            im = im.resize((im.width * 8, im.height * 8), Image.NEAREST)
        buf = io.BytesIO(); im.save(buf, 'PNG'); _cache[key] = base64.b64encode(buf.getvalue()).decode()
    return _cache[key]
def crispify(svg):
    return re.sub(r'data:image/png;base64,([A-Za-z0-9+/=]+)', lambda m: 'data:image/png;base64,' + _up(m.group(1)), svg)
