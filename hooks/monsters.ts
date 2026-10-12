// 레벨마다 싸우는 상대: 디지몬 어드벤처의 빌런들 (hooks/img/monsters.ts의 디지몬 스토리 전투 스프라이트)
// 전투 장면은 44 × 15칸이고, 상대는 오른쪽(x 22~41)에 서서 왼쪽의 내 디지몬을 바라본다. 땅은 y = 13.
// 단계(tier) = 레벨 ÷ 10: 0 워매몬 … 9 피에몬, 10(레벨 100)은 최종 보스 아포카리몬. 애니 등장 순서 그대로
import { MONSTERS } from './img/monsters.ts'
import { ATK, FOE_BEGIN, FOE_DUR } from './atk.ts'
import * as fx from './fx.ts'

export { ATK } from './atk.ts'

export const MONSTER_NAMES = ['워매몬', '우가몬', '데블몬', '에테몬', '묘티스몬', '베놈묘티스몬', '메탈시드라몬', '피노키몬', '파워드라몬', '피에몬', '아포카리몬']
// 그림 키, 키(칸), 뒤집기(원본이 오른쪽을 보면 true: 왼쪽의 내 디지몬을 보게 뒤집는다), 근접인지, 기술이 나가는 자리(그림 비율, 내 디지몬을 본 상태 기준),
// 기술 효과(좌우를 뒤집은 장면에서 그리므로 영웅용 부품을 그대로 쓴다). 너비는 원본 비율대로
type At = readonly [number, number]
type Foe = { key: string; h: number; flip: boolean; melee: boolean; mouth: At; skill: string; fx: (from: At) => string }
const FOES: readonly Foe[] = [
  { key: 'numemon', h: 8, flip: true, melee: false, mouth: [0.8, 0.5], skill: '똥 던지기', fx: f => fx.lob('poo', f, '#8B5E3C', '#D2B48C', 1) },
  { key: 'orgemon', h: 11.5, flip: false, melee: true, mouth: [0.8, 0.4], skill: '몽둥이 찍기', fx: () => fx.strike('#8B5E3C', '#D2B48C') + fx.impact('#D2B48C', fx.BODY_X - 1, 9, 1.3) },
  { key: 'devimon', h: 12.5, flip: false, melee: true, mouth: [0.8, 0.4], skill: '데스 클로', fx: () => fx.strike('#312E81', '#A5B4FC', true) },
  { key: 'etemon', h: 11, flip: true, melee: false, mouth: [0.85, 0.3], skill: '러브 세레나데', fx: f => fx.soundWave(f, '#F26B21', '#FDE047') },
  { key: 'vamdemon', h: 13, flip: true, melee: false, mouth: [0.85, 0.45], skill: '크림슨 라이트닝', fx: f => fx.whip(f, '#DC2626', '#FCA5A5') },
  { key: 'venomvamdemon', h: 13.5, flip: false, melee: false, mouth: [0.8, 0.35], skill: '베놈 인퓨즈', fx: f => fx.orb(f, '#A855F7', '#E9D5FF', 1.5) },
  { key: 'metalseadramon', h: 13.5, flip: true, melee: false, mouth: [0.9, 0.25], skill: '용의 콧물', fx: f => fx.beam(f, '#38BDF8', '#E0F2FE', 1.5) },
  { key: 'pinochimon', h: 11.5, flip: true, melee: false, mouth: [0.85, 0.45], skill: '불릿 해머', fx: f => fx.bullets(f, 3) },
  { key: 'mugendramon', h: 13.5, flip: true, melee: false, mouth: [0.75, 0.2], skill: '무한 캐논', fx: f => fx.twinBeam(f, '#CBD5E1', '#FFFFFF', 0.9) },
  { key: 'piemon', h: 13, flip: true, melee: false, mouth: [0.85, 0.35], skill: '트럼프 소드', fx: f => fx.swords(f, 4) },
  { key: 'apocalymon', h: 13.5, flip: false, melee: false, mouth: [0.5, 0.45], skill: '다크니스 존', fx: f => fx.darkness(f) },
]
export const foeSkill = (t: number) => FOES[Math.max(0, Math.min(10, t))]!.skill
const CENTER = 31.5
const GROUND = 13


const INK = '#1F1410'
const WHITE = '#FFFFFF'

const at = (v: number) => Math.round(v * 100) / 100
const rect = (x: number, y: number, w: number, h: number, fill: string, inner = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"` + (inner ? `>${inner}</rect>` : '/>')

// 상대의 자리(칸): 발은 땅, 가운데는 CENTER. 너비가 19칸을 넘으면 키를 줄인다
const box = (tier: number) => {
  const { key, h: wantH, flip } = FOES[tier]!
  const img = MONSTERS[key]!
  let h = wantH
  let w = at((h * img.w) / img.h)
  if (w > 19) {
    w = 19
    h = at((w * img.h) / img.w)
  }
  return { img, x: at(CENTER - w / 2), y: at(GROUND - h), w, h, flip }
}

// 상대 한 마리: 숨 쉬듯 들썩인다. 최종 보스는 느긋하게
const draw = (tier: number) => {
  const b = box(tier)
  const dur = tier >= 10 ? '1.6s' : tier >= 5 ? '1s' : '0.7s'
  return (
    `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -0.3;0 0" dur="${dur}" repeatCount="indefinite"/>` +
    (b.flip ? `<g transform="translate(${at(2 * b.x + b.w)} 0) scale(-1 1)">` : '') +
    `<image href="${b.img.href}" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" preserveAspectRatio="none" style="image-rendering:pixelated"/>` +
    (b.flip ? '</g>' : '') +
    '</g>'
  )
}

// 상대 머리 위 체력 막대의 높이 (키가 다르다). 키가 크면 머리에 살짝 겹친다
const barY = (tier: number) => Math.max(-0.4, at(box(tier).y - 1.3))

// 상대 하나 + 체력 막대 + 맞는 순간의 흔들림·깜빡임·데미지 숫자.
// hp: 상대에게 남은 체력(0~1)
export const monster = (t: number, hp: number, damage: number) => {
  const tier = Math.max(0, Math.min(10, t))
  const fill = Math.max(0, Math.min(1, hp))
  const y = barY(tier)
  // 레벨 100의 최종 보스는 체력이 줄지 않는다 (시즌이 끝날 때까지 결전)
  const shown = tier >= 10 ? 1 : fill
  const bar = rect(26, y, 8, 0.9, INK) + rect(26.15, y + 0.15, 7.7, 0.6, '#4B5563') + (shown > 0 ? rect(26.15, y + 0.15, 7.7 * shown, 0.6, '#EF4444') : '')
  const hit =
    // 맞는 순간 좌우로 흔들리고 깜빡인다
    '<g>' +
    `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;1 0;-0.6 0;0 0;0 0" keyTimes="0;0.6;0.65;0.7;0.76;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<animate attributeName="opacity" values="1;1;0.35;1;0.35;1;1" keyTimes="0;0.6;0.64;0.68;0.72;0.76;1" dur="${ATK}" repeatCount="indefinite"/>` +
    draw(tier) +
    '</g>'
  // 데미지 숫자가 떠오른다
  const pop =
    '<g opacity="0" shape-rendering="auto">' +
    `<animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.6;0.64;0.88;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 -2.6" keyTimes="0;0.6;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<text x="38.5" y="${y + 2.6}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="2.8" font-weight="900" fill="#EF4444" stroke="${WHITE}" stroke-width="0.5" paint-order="stroke">-${damage}</text>` +
    '</g>'
  return hit + bar + pop
}

// 영웅용 효과 문자열을 상대 반격 박자로: 주기를 두 배(FOE_DUR)로 늘리고 keyTimes를 반으로 접은 뒤(뒤 절반은 쉼) FOE_BEGIN만큼 늦춘다
const slow = (svg: string) =>
  svg
    .replace(/keyTimes="([^"]+)"/g, (_m, k: string) => `keyTimes="${k.split(';').map((v, i, a) => (i === a.length - 1 ? '1' : String(Math.round(parseFloat(v) * 50) / 100))).join(';')}"`)
    .replace(new RegExp(`dur="${ATK}"`, 'g'), `dur="${FOE_DUR}" begin="${FOE_BEGIN}"`)

// 내 디지몬이 맞는 순간의 흔들림·깜빡임 (오류 알림, 상대의 기술 박자에 맞춰)
export const heroHurt = () =>
  `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;-1 0;0.6 0;0 0;0 0" keyTimes="0;0.3;0.325;0.35;0.38;1" dur="${FOE_DUR}" begin="${FOE_BEGIN}" repeatCount="indefinite" additive="sum"/>` +
  `<animate attributeName="opacity" values="1;1;0.35;1;0.35;1;1" keyTimes="0;0.3;0.32;0.34;0.36;0.38;1" dur="${FOE_DUR}" begin="${FOE_BEGIN}" repeatCount="indefinite"/>`

// 큰 알림(오류)에서 내 디지몬을 치는 상대: 1px 단위, 발이 (x, 120)에 닿고 왼쪽을 본다. h: 키(px)
// 큰 알림(오류): 상대 그림(1px 단위, 발이 (0, 120), 왼쪽을 본다)과 그 기술. heroDx: 상대 가운데에서 내 디지몬 몸 가운데까지의 px(음수).
// 기술은 영웅용 부품(오른쪽의 상대를 향한다)을 좌우로 뒤집어 쓴다: 1칸 = 10px, 내 디지몬 몸(BODY_X) ↔ heroDx
export const foeBig = (t: number, heroDx: number, h = 110) => {
  const tier = Math.max(0, Math.min(10, t))
  const f = FOES[tier]!
  const img = MONSTERS[f.key]!
  const w = at((h * img.w) / img.h)
  const left = at(-w / 2)
  const image = `<image href="${img.href}" x="${left}" y="${120 - h}" width="${w}" height="${h}" preserveAspectRatio="none" style="image-rendering:pixelated"/>`
  const lunge = f.melee
    ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;${at(heroDx + 90)} 0;${at(heroDx + 90)} 0;0 0;0 0" keyTimes="0;0.24;0.3;0.36;0.42;1" dur="${FOE_DUR}" begin="${FOE_BEGIN}" repeatCount="indefinite"/>`
    : ''
  const body = `<g>${lunge}${f.flip ? `<g transform="translate(${at(2 * left + w)} 0) scale(-1 1)">${image}</g>` : image}</g>`
  // 뒤집기: fx의 x = X0 - (px / 10) 이 되게. 내 디지몬 몸(BODY_X = 29.5)이 heroDx에 오도록 X0를 잡는다
  const X0 = at(29.5 + heroDx / 10)
  const mouthPx = at(left + w * (1 - f.mouth[0]))
  const mouthY = at((120 - h + h * f.mouth[1] + 9) / 10)
  const skill = `<g transform="translate(0 -9) scale(10)"><g transform="translate(${X0} 0) scale(-1 1)">${slow(f.fx([at(X0 - mouthPx / 10), mouthY]))}</g></g>`
  return body + skill
}
export const foeMelee = (t: number) => FOES[Math.max(0, Math.min(10, t))]!.melee
