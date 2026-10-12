// hooks/fx.ts의 벡터 원화(ARTS)를 낱장 SVG로 쓴다 (1칸 = DOTS px). 다음에 build-fx.py가 PNG 도트로 굽는다
import { mkdirSync, writeFileSync } from 'node:fs'
import { ARTS } from '../hooks/fx.ts'
const DOTS = 4
mkdirSync('preview/out/fx', { recursive: true })
for (const [name, a] of Object.entries(ARTS)) {
  const x = a.anchor === 'left' ? 0 : -a.w / 2
  const y = a.anchor === 'top' ? 0 : -a.h / 2
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(a.w * DOTS)}" height="${Math.ceil(a.h * DOTS)}" viewBox="${x} ${y} ${a.w} ${a.h}">${a.svg}</svg>`
  writeFileSync(`preview/out/fx/${name}.svg`, svg)
}
console.log(Object.keys(ARTS).length, 'arts')
