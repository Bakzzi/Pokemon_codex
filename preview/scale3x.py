# 픽셀아트 확대(Scale2x/Scale3x, EPX 계열): 작은 스프라이트를 점이 뭉개지지 않게 2배·3배로 키운다.
#   python3 preview/scale3x.py <in.png> <out.png> [2|3]
import sys
from PIL import Image
def scale2x(im):
    w, h = im.size; src = im.load()
    out = Image.new('RGBA', (w * 2, h * 2)); dst = out.load()
    T = (0, 0, 0, 0)
    g = lambda x, y: src[x, y] if 0 <= x < w and 0 <= y < h else T
    for y in range(h):
        for x in range(w):
            P = g(x, y); A = g(x, y - 1); B = g(x + 1, y); C = g(x - 1, y); D = g(x, y + 1)
            e0 = A if (C == A and C != D and A != B) else P
            e1 = B if (A == B and A != C and B != D) else P
            e2 = C if (D == C and D != B and C != A) else P
            e3 = D if (B == D and B != A and D != C) else P
            dst[2 * x, 2 * y] = e0; dst[2 * x + 1, 2 * y] = e1; dst[2 * x, 2 * y + 1] = e2; dst[2 * x + 1, 2 * y + 1] = e3
    return out
def scale3x(im):
    w, h = im.size; src = im.load()
    out = Image.new('RGBA', (w * 3, h * 3)); dst = out.load()
    T = (0, 0, 0, 0)
    g = lambda x, y: src[x, y] if 0 <= x < w and 0 <= y < h else T
    for y in range(h):
        for x in range(w):
            A, B, C = g(x - 1, y - 1), g(x, y - 1), g(x + 1, y - 1)
            D, E, F = g(x - 1, y), g(x, y), g(x + 1, y)
            G, H, I = g(x - 1, y + 1), g(x, y + 1), g(x + 1, y + 1)
            if B != H and D != F:
                e0 = D if D == B else E
                e1 = B if (D == B and E != C) or (B == F and E != A) else E
                e2 = F if B == F else E
                e3 = D if (D == B and E != G) or (D == H and E != A) else E
                e4 = E
                e5 = F if (B == F and E != I) or (H == F and E != C) else E
                e6 = D if D == H else E
                e7 = H if (D == H and E != I) or (H == F and E != G) else E
                e8 = F if H == F else E
            else:
                e0 = e1 = e2 = e3 = e4 = e5 = e6 = e7 = e8 = E
            for i, v in enumerate((e0, e1, e2, e3, e4, e5, e6, e7, e8)):
                dst[3 * x + i % 3, 3 * y + i // 3] = v
    return out
if __name__ == '__main__':
    im = Image.open(sys.argv[1]).convert('RGBA')
    k = int(sys.argv[3]) if len(sys.argv) > 3 else 3
    (scale3x(im) if k == 3 else scale2x(im)).save(sys.argv[2])
    print(sys.argv[2])
