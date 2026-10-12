// 기술 효과 (전투 좌표, 칸 단위). 투사체·충격·빔은 벡터 원화(ART)를 1칸당 4점 도트 PNG로 구운 것(hooks/img/fx.ts)을
// 점 그대로 키워 그리고, 날아가기·커지기·깜빡임 같은 움직임만 SVG 애니메이션으로 준다 → 스프라이트와 같은 도트 느낌.
// 상대는 x 22~41에 서 있고 가운데가 x ≈ 31.5, 땅은 y = 13. 공격 주기(ATK)의 0.44에 기술이 나가서 0.6에 닿고,
// 상대는 0.6~0.76에 맞는다 (monsters.ts). from: 기술이 나가는 자리(입·손). preview/gen-lines.py의 FX 표가 디지몬마다 고른다
import { ATK } from './monsters.ts'
import { WHITE } from './pixel.ts'
import { FX } from './img/fx.ts'

type At = readonly [number, number]
const at = (v: number) => Math.round(v * 100) / 100
const HIT_X = 25.7
const BODY_X = 29.5

// ── 색 묶음 ────────────────────────────────────────────────────────
export const TONE = {
  fire: ['#F26B21', '#FDE047'],
  blue: ['#3B82F6', '#BFDBFE'],
  ice: ['#93C5FD', '#E0F2FE'],
  thunder: ['#FDE047', '#FFFBEB'],
  holy: ['#FDE68A', '#FFFFFF'],
  pink: ['#F9A8D4', '#FFFFFF'],
  water: ['#38BDF8', '#E0F2FE'],
  leaf: ['#22C55E', '#86EFAC'],
  grey: ['#CBD5E1', '#FFFFFF'],
  sky: ['#7DD3FC', '#E0F2FE'],
  elec: ['#38BDF8', '#F0F9FF'],
  green: ['#22C55E', '#BBF7D0'],
  gold: ['#F59E0B', '#FDE68A'],
} as const
export type Tone = keyof typeof TONE

// ── 벡터 원화 (가운데 (0, 0), 오른쪽을 향함). 굽는 쪽(preview/build-fx.ts)이 이 표를 읽는다 ──
const radial = (id: string, core: string, mid: string, edge: string) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${core}"/><stop offset="0.45" stop-color="${mid}"/><stop offset="0.8" stop-color="${edge}"/><stop offset="1" stop-color="${edge}" stop-opacity="0"/></radialGradient>`
const glow = (cx: number, cy: number, r: number, c: string, l: string, opacity = 1) =>
  `<defs>${radial('g', WHITE, l, c)}</defs><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g)" opacity="${opacity}"/>`

type Art = { svg: string; w: number; h: number; anchor?: 'center' | 'left' | 'top' }
const fireballArt = (c: string, l: string): Art => ({
  w: 9, h: 4,
  svg:
    `<path d="M0.2 -1.1 C-1.2 -1.6 -2.6 -0.9 -3.8 -0.2 C-2.4 -0.5 -2 0 -3.4 0.9 C-2.2 0.7 -1.3 1.2 0.2 1.1 Z" fill="${c}" opacity="0.85"/>` +
    `<path d="M0 -0.6 C-0.9 -0.9 -1.9 -0.5 -2.6 -0.1 C-1.8 -0.2 -1.5 0.2 -2.2 0.6 C-1.4 0.5 -0.8 0.7 0 0.6 Z" fill="${l}" opacity="0.9"/>` +
    glow(0.1, 0, 1.6, c, l) +
    `<circle cx="0.2" cy="0" r="0.75" fill="${l}"/><circle cx="0.35" cy="-0.1" r="0.4" fill="${WHITE}"/>` +
    `<circle cx="-2.8" cy="-0.9" r="0.22" fill="${l}"/><circle cx="-3.6" cy="0.5" r="0.18" fill="${c}"/><circle cx="-2.2" cy="1.1" r="0.16" fill="${l}"/>`,
})
const orbArt = (c: string, l: string, r: number): Art => ({
  w: r * 4, h: r * 4,
  svg: glow(0, 0, r * 1.9, c, l, 0.9) + `<circle cx="0" cy="0" r="${r}" fill="${c}"/><circle cx="${at(-r * 0.2)}" cy="${at(-r * 0.2)}" r="${at(r * 0.68)}" fill="${l}"/><circle cx="${at(-r * 0.36)}" cy="${at(-r * 0.36)}" r="${at(r * 0.3)}" fill="${WHITE}"/>`,
})
const impactArt = (c: string, l: string): Art => ({
  w: 6, h: 6,
  svg:
    glow(0, 0, 2.2, c, l) +
    [0, 45, 90, 135].map(a => `<polygon points="-2.6,0 -0.35,-0.35 0,-2.6 0.35,-0.35 2.6,0 0.35,0.35 0,2.6 -0.35,0.35" fill="${a % 90 ? c : l}" opacity="${a % 90 ? 0.85 : 0.95}" transform="rotate(${a}) scale(${a % 90 ? 0.75 : 1})"/>`).join('') +
    `<circle cx="0" cy="0" r="0.6" fill="${WHITE}"/>`,
})
const muzzleArt = (c: string, l: string): Art => ({
  w: 3.6, h: 3.6,
  svg: glow(0, 0, 1.6, c, l) + `<polygon points="-1.6,0 -0.3,-0.3 0,-1.6 0.3,-0.3 1.6,0 0.3,0.3 0,1.6 -0.3,0.3" fill="${l}"/><circle cx="0" cy="0" r="0.35" fill="${WHITE}"/>`,
})
const slashArt = (c: string, l: string): Art => ({
  w: 7, h: 2.4,
  svg: `<path d="M-3.2 0 Q0 -1.6 3.2 0 Q0 -0.4 -3.2 0Z" fill="${c}" opacity="0.9"/><path d="M-2.4 -0.1 Q0 -1.1 2.4 -0.1 Q0 -0.45 -2.4 -0.1Z" fill="${l}"/>`,
})
const BEAM_LEN = 14
const beamArt = (c: string, l: string): Art => ({
  w: BEAM_LEN, h: 2.4, anchor: 'left',
  svg:
    `<rect x="0" y="-1" width="${BEAM_LEN}" height="2" rx="1" fill="${c}" opacity="0.3"/>` +
    `<rect x="0" y="-0.5" width="${BEAM_LEN}" height="1" rx="0.5" fill="${c}"/>` +
    `<rect x="0" y="-0.3" width="${BEAM_LEN}" height="0.6" rx="0.3" fill="${l}"/>` +
    `<rect x="0" y="-0.14" width="${BEAM_LEN}" height="0.28" rx="0.14" fill="${WHITE}"/>`,
})
const PILLAR_H = 15
const pillarArt = (c: string, l: string): Art => ({
  w: 3, h: PILLAR_H, anchor: 'top',
  svg:
    `<rect x="-1.2" y="0" width="2.4" height="${PILLAR_H}" fill="${c}" opacity="0.45"/>` +
    `<rect x="-0.8" y="0" width="1.6" height="${PILLAR_H}" fill="${c}"/>` +
    `<rect x="-0.45" y="0" width="0.9" height="${PILLAR_H}" fill="${l}"/>` +
    `<rect x="-0.18" y="0" width="0.36" height="${PILLAR_H}" fill="${WHITE}"/>`,
})
const lightningArt = (c: string, l: string): Art => {
  const pts = [[0, -7], [-1.2, -3], [0.8, -0.5], [-0.8, 2.5], [0.6, 5], [0, 7]]
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')
  return { w: 4, h: 14, svg: `<path d="${d}" stroke="${c}" stroke-width="1.6" fill="none" stroke-linejoin="round" opacity="0.35"/><path d="${d}" stroke="${c}" stroke-width="0.8" fill="none" stroke-linejoin="round"/><path d="${d}" stroke="${l}" stroke-width="0.3" fill="none" stroke-linejoin="round"/>` }
}
const WHIP_LEN = 13
const whipArt = (c: string, l: string): Art => {
  const d = `M0 0 Q${WHIP_LEN / 2} -5 ${WHIP_LEN} 0`
  return { w: WHIP_LEN, h: 6, anchor: 'left', svg: `<g transform="translate(0 2.5)"><path d="${d}" stroke="${c}" stroke-width="0.9" fill="none" stroke-linecap="round" opacity="0.35"/><path d="${d}" stroke="${c}" stroke-width="0.45" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${l}" stroke-width="0.16" fill="none"/></g>` }
}
const vineArt = (c: string, l: string): Art => {
  const L = WHIP_LEN
  const d = `M0 0 C${L * 0.25} -1.2 ${L * 0.5} 1.2 ${L * 0.75} -0.6 S${L} 0.2 ${L} 0`
  return {
    w: L, h: 3.2, anchor: 'left',
    svg:
      `<path d="${d}" stroke="#15803D" stroke-width="0.9" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${c}" stroke-width="0.55" fill="none" stroke-linecap="round"/><path d="${d}" stroke="${l}" stroke-width="0.15" fill="none"/>` +
      [0.3, 0.6, 0.85].map((k, i) => `<ellipse cx="${at(L * k)}" cy="${i % 2 ? 0.9 : -0.9}" rx="0.7" ry="0.35" fill="${c}" transform="rotate(${i % 2 ? 35 : -35} ${at(L * k)} ${i % 2 ? 0.9 : -0.9})"/>`).join(''),
  }
}
const waveArt = (c: string, l: string): Art => ({
  w: 4, h: 5,
  svg: [1.2, 1.7, 2.2].map((r, i) => `<path d="M${-1.2 + i * 1.2} -${r} Q${-1.2 + i * 1.2 + r * 1.1} 0 ${-1.2 + i * 1.2} ${r}" stroke="${i == 1 ? l : c}" stroke-width="0.5" fill="none" stroke-linecap="round"/>`).join(''),
})
const ARTS_ONE: Record<string, Art> = {
  shard: { w: 3.4, h: 1.6, svg: `<polygon points="1.6,0 0,-0.75 -1.6,0 0,0.75" fill="#60A5FA"/><polygon points="1.2,0 0,-0.45 -0.9,0 0,0.45" fill="#E0F2FE"/><polygon points="0.9,0 0.1,-0.2 -0.4,0 0.1,0.2" fill="${WHITE}"/>` },
  star: (() => {
    const pts = Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 0.45 : 1.1; const a = (Math.PI / 5) * i - Math.PI / 2; return `${at(Math.cos(a) * r)},${at(Math.sin(a) * r)}` }).join(' ')
    return { w: 3.2, h: 3.2, svg: glow(0, 0, 1.5, '#FDE047', WHITE, 0.8) + `<polygon points="${pts}" fill="#FDE047"/><polygon points="${pts}" fill="${WHITE}" transform="scale(0.45)"/>` }
  })(),
  missile: {
    w: 10.5, h: 2.2,
    svg:
      `<path d="M-2.6 -0.1 L-2.6 -0.9 L-1.6 -0.3 L-1.6 0.3 L-2.6 0.9 L-2.6 0.1 Z" fill="#7B8794"/><rect x="-2.2" y="-0.42" width="3.2" height="0.84" rx="0.3" fill="#C5CDD6"/><rect x="-2.2" y="-0.42" width="3.2" height="0.3" rx="0.15" fill="#EEF2F5"/><path d="M1 -0.42 L2.3 0 L1 0.42 Z" fill="#D7263D"/><rect x="-0.6" y="-0.42" width="0.25" height="0.84" fill="#7B8794"/>` +
      `<path d="M-2.6 0 C-3.4 -0.6 -4.4 -0.5 -5 0 C-4.4 0.5 -3.4 0.6 -2.6 0 Z" fill="#F26B21" opacity="0.9"/><path d="M-2.6 0 C-3.1 -0.3 -3.7 -0.3 -4.1 0 C-3.7 0.3 -3.1 0.3 -2.6 0 Z" fill="#FDE047"/>`,
  },
  arrow: {
    w: 13, h: 2.6,
    svg:
      `<path d="M-6 0 L-4 0" stroke="#F9A8D4" stroke-width="1" stroke-linecap="round" opacity="0.3"/><rect x="-4.5" y="-0.24" width="6.5" height="0.48" rx="0.24" fill="#F9A8D4"/><rect x="-4.5" y="-0.1" width="6.5" height="0.2" fill="${WHITE}"/>` +
      `<path d="M1.6 -1.1 L5.2 0 L1.6 1.1 L2.3 0 Z" fill="#F9A8D4"/><path d="M2 -0.55 L4.4 0 L2 0.55 L2.4 0 Z" fill="${WHITE}"/><path d="M-4.5 -0.2 L-3.2 -1.2 L-2.2 -1.2 L-3.4 -0.2 Z" fill="${WHITE}" stroke="#F9A8D4" stroke-width="0.1"/><path d="M-4.5 0.2 L-3.2 1.2 L-2.2 1.2 L-3.4 0.2 Z" fill="${WHITE}" stroke="#F9A8D4" stroke-width="0.1"/>` +
      glow(4.2, 0, 1.2, '#F9A8D4', WHITE, 0.7),
  },
  harpoon: { w: 12, h: 1.6, svg: `<rect x="-3.6" y="-0.16" width="5.4" height="0.32" fill="#9AA3AE"/><rect x="-3.6" y="-0.16" width="5.4" height="0.12" fill="#E2E8F0"/><path d="M1.6 -0.7 L3.4 0 L1.6 0.7 L2.1 0 Z" fill="#CBD5E1"/><path d="M1.8 -0.4 L2.9 0 L1.8 0.4 L2.1 0 Z" fill="${WHITE}"/><path d="M-3.6 0 C-4.4 0.3 -5 -0.3 -5.8 0.1" stroke="#64748B" stroke-width="0.14" fill="none"/>` },
  fish: { w: 3.4, h: 1.4, svg: `<path d="M0.9 0 C0.4 -0.6 -0.6 -0.6 -1 0 C-0.6 0.6 0.4 0.6 0.9 0 Z" fill="#38BDF8"/><path d="M-0.9 0 L-1.6 -0.5 L-1.5 0 L-1.6 0.5 Z" fill="#38BDF8"/><path d="M0.5 -0.15 C0.1 -0.4 -0.5 -0.4 -0.8 -0.05 C-0.4 -0.2 0.1 -0.15 0.5 -0.15Z" fill="#E0F2FE"/><circle cx="0.45" cy="-0.12" r="0.1" fill="#1F1410"/>` },
  flower: { w: 4, h: 4, svg: glow(0, 0, 1.8, '#F472B6', '#FBCFE8', 0.8) + [0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-0.85" rx="0.42" ry="0.7" fill="#F472B6" transform="rotate(${a})"/>`).join('') + [0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-0.8" rx="0.2" ry="0.4" fill="#FBCFE8" transform="rotate(${a})"/>`).join('') + `<circle cx="0" cy="0" r="0.45" fill="#FDE047"/><circle cx="-0.1" cy="-0.1" r="0.18" fill="${WHITE}"/>` },
  wind: { w: 8.6, h: 3.6, svg: `<ellipse cx="0" cy="0" rx="1.2" ry="1.6" fill="none" stroke="#7DD3FC" stroke-width="0.5" opacity="0.9"/><ellipse cx="0.15" cy="0" rx="0.7" ry="1" fill="none" stroke="#E0F2FE" stroke-width="0.35"/><ellipse cx="0.3" cy="0" rx="0.3" ry="0.45" fill="${WHITE}" opacity="0.9"/><path d="M-1.4 -1 Q-3 -0.8 -4 0.2" stroke="#7DD3FC" stroke-width="0.3" fill="none" stroke-linecap="round" opacity="0.7"/><path d="M-1.4 1 Q-2.8 1.3 -3.6 0.4" stroke="#E0F2FE" stroke-width="0.25" fill="none" stroke-linecap="round" opacity="0.7"/>` },
  needle: { w: 5, h: 1, svg: `<path d="M-2.2 0 L2.2 0" stroke="#15803D" stroke-width="0.45" stroke-linecap="round"/><path d="M-2 0 L1.8 0" stroke="#4ADE80" stroke-width="0.2"/><path d="M1.6 -0.35 L2.5 0 L1.6 0.35 Z" fill="${WHITE}"/>` },
  rock: { w: 2.2, h: 2.2, svg: `<polygon points="-0.9,-0.4 -0.2,-0.9 0.8,-0.5 0.9,0.5 0.1,0.9 -0.8,0.5" fill="#9CA3AF"/><polygon points="-0.5,-0.3 0.1,-0.6 0.5,-0.2 0,0.1" fill="#D1D5DB"/>` },
  bubble: orbArt('#7DD3FC', '#E0F2FE', 0.55),
  bubble_s: orbArt('#7DD3FC', '#E0F2FE', 0.32),
  orb_holy: orbArt('#FDE68A', '#FFF7D6', 0.8),
  orb_white: orbArt('#FDE047', WHITE, 0.6),
  orb_fire: orbArt('#F26B21', '#FDE047', 1.25),
  orb_thunder: orbArt('#FDE047', '#FFFBEB', 1.25),
  fireball: fireballArt('#F26B21', '#FDE047'),
  fireball_blue: fireballArt('#3B82F6', '#BFDBFE'),
  fireball_green: fireballArt('#22C55E', '#BBF7D0'),
  orb_elec: orbArt('#38BDF8', '#F0F9FF', 1.25),
  // 전기 불꽃 (쁘띠 썬더): 작은 전기구 둘레로 지그재그 번개
  spark: { w: 4.4, h: 4.4, svg: glow(0, 0, 1.4, '#38BDF8', '#F0F9FF', 0.9) + `<circle cx="0" cy="0" r="0.6" fill="#F0F9FF"/>` + [0, 72, 144, 216, 288].map(a => `<path d="M0 -0.6 L-0.3 -1.2 L0.25 -1.5 L-0.1 -2.1" stroke="#38BDF8" stroke-width="0.25" fill="none" stroke-linejoin="round" transform="rotate(${a})"/>`).join('') },
  // 창 (에덴즈 재블린): 금빛 창대와 넓은 날, 빛 꼬리
  javelin: { w: 13, h: 2.2, svg: `<path d="M-6.5 0 L-4 0" stroke="#FDE68A" stroke-width="0.9" stroke-linecap="round" opacity="0.35"/><rect x="-4.6" y="-0.2" width="7" height="0.4" rx="0.2" fill="#F59E0B"/><rect x="-4.6" y="-0.08" width="7" height="0.16" fill="#FDE68A"/><path d="M2 -0.9 L5.4 0 L2 0.9 L2.6 0 Z" fill="#FDE68A"/><path d="M2.4 -0.4 L4.6 0 L2.4 0.4 L2.7 0 Z" fill="${WHITE}"/><rect x="1.4" y="-0.5" width="0.5" height="1" fill="#B45309"/>` + glow(4.4, 0, 1.1, '#F59E0B', '#FDE68A', 0.7) },
  claw: { w: 2.6, h: 3.2, svg: `<circle cx="0" cy="0" r="0.75" fill="#AEB7C2"/><circle cx="-0.15" cy="-0.15" r="0.35" fill="#E2E8F0"/><path d="M0.3 -0.5 L1.9 -1.4 L2.2 -0.8 L0.8 -0.1 Z" fill="#F3EEE0"/><path d="M0.3 0.5 L1.9 1.4 L2.2 0.8 L0.8 0.1 Z" fill="#F3EEE0"/><path d="M0.6 -0.25 L2.3 -0.1 L2.3 0.1 L0.6 0.25 Z" fill="#F3EEE0"/>` },
}
// 색 묶음마다 만드는 것
const PER_TONE: Record<string, (c: string, l: string) => Art> = { impact: impactArt, muzzle: muzzleArt, slash: slashArt, beam: beamArt, pillar: pillarArt, lightning: lightningArt, whip: whipArt, vine: vineArt, wave: waveArt }
export const ARTS: Record<string, Art> = { ...ARTS_ONE }
for (const [tone, [c, l]] of Object.entries(TONE)) for (const [kind, make] of Object.entries(PER_TONE)) ARTS[`${kind}_${tone}`] = make(c, l)

// ── 도트 그림 놓기 ──────────────────────────────────────────────────
const DOTS = 4 // 1칸당 점 수 (구울 때와 같아야 한다)
// 구운 그림을 칸 크기로 놓는다. anchor: center(가운데가 (0,0)) / left(왼쪽 가운데) / top(위 가운데)
export const art = (name: string, scale = 1) => {
  const s = FX[name]
  const a = ARTS[name]
  if (!s || !a) return ''
  const w = at(s.w / DOTS)
  const h = at(s.h / DOTS)
  const x = a.anchor === 'left' ? 0 : at(-w / 2)
  const y = a.anchor === 'top' ? 0 : at(-h / 2)
  const img = `<image href="${s.href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none" style="image-rendering:pixelated"/>`
  return scale === 1 ? img : `<g transform="scale(${scale})">${img}</g>`
}
// 색 → 색 묶음 이름 (impact/slash/muzzle에 쓰던 색을 묶음으로 바꾼다)
const toneOf = (color: string): Tone => {
  const k = (Object.keys(TONE) as Tone[]).find(t => TONE[t][0].toLowerCase() === color.toLowerCase() || TONE[t][1].toLowerCase() === color.toLowerCase())
  if (k) return k
  const map: Record<string, Tone> = { '#f0f9ff': 'elec', '#bbf7d0': 'green', '#fde68a': 'holy', '#60a5fa': 'ice', '#bae6fd': 'sky', '#f472b6': 'pink', '#fbcfe8': 'pink', '#ec4899': 'pink', '#e2e8f0': 'grey', '#86efac': 'leaf', '#fff7d6': 'holy', '#ffffff': 'holy', '#fde047': 'thunder' }
  return map[color.toLowerCase()] ?? 'holy'
}

// ── 시간 ──────────────────────────────────────────────────────────
const during = (a: number, b: number, inner: string) =>
  '<g opacity="0">' +
  `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${a};${a};${b};${b};1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
  inner +
  '</g>'
// from에서 to까지 날아가기 (0.44 → 0.6). 높이가 다르면 그 방향으로 기운다
const fly = (inner: string, from: At, to: At, a = 0.44, b = 0.6) => {
  const ang = at((Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI)
  return (
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${a};${a};${b};${b};1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="${from[0]} ${from[1]};${from[0]} ${from[1]};${to[0]} ${to[1]};${to[0]} ${to[1]}" keyTimes="0;${a};${b};1" dur="${ATK}" repeatCount="indefinite"/>` +
    (ang ? `<g transform="rotate(${ang})">${inner}</g>` : inner) +
    '</g>'
  )
}

// 충격 (0.6 → 0.72): 도트 폭발이 작게 시작해 커진다
export const impact = (color: string, cx = HIT_X, cy = 7.6, size = 1, _light = WHITE) =>
  '<g opacity="0">' +
  `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.6;0.61;0.7;0.74;1" dur="${ATK}" repeatCount="indefinite"/>` +
  `<g transform="translate(${at(cx)} ${at(cy)})"><g transform="scale(${size})"><animateTransform attributeName="transform" type="scale" values="${at(size * 0.4)};${at(size * 1.15)};${size}" keyTimes="0;0.63;1" dur="${ATK}" repeatCount="indefinite" calcMode="discrete"/>${art(`impact_${toneOf(color)}`)}</g></g>` +
  '</g>'
// 베는 자국 (0.6 → 0.72)
export const slash = (color: string, cx = BODY_X, cy = 7.5, _light = WHITE, angle = -40) =>
  '<g opacity="0">' +
  `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.6;0.61;0.68;0.72;1" dur="${ATK}" repeatCount="indefinite"/>` +
  `<g transform="translate(${at(cx)} ${at(cy)}) rotate(${angle})">${art(`slash_${toneOf(color)}`)}</g></g>`
// 기술이 나가는 순간 입가(손끝)의 번쩍임 (0.4 → 0.5)
export const muzzle = (color: string, _light: string, [x, y]: At, size = 1) =>
  during(0.4, 0.5, `<g transform="translate(${at(x)} ${at(y)})">${art(`muzzle_${toneOf(color)}`, size)}</g>`)

// ── 기술 ──────────────────────────────────────────────────────────
export const bubble = (from: At) =>
  muzzle('#BAE6FD', WHITE, from, 0.6) +
  fly(art('bubble'), from, [HIT_X, from[1]]) +
  fly(`<g transform="translate(-1.2 -0.8)">${art('bubble_s')}</g>`, from, [HIT_X - 0.6, from[1] - 0.8], 0.46, 0.6) +
  impact('#BAE6FD', HIT_X, from[1], 0.7)
export const fireball = (from: At, size = 1) =>
  muzzle('#F26B21', '#FDE047', from, size) + fly(art('fireball', size), from, [HIT_X, from[1]]) + impact('#F26B21', HIT_X, from[1], size)
export const greenFlame = (from: At, size = 1) =>
  muzzle('#22C55E', '#BBF7D0', from, size) + fly(art('fireball_green', size), from, [HIT_X, from[1]]) + impact('#22C55E', HIT_X, from[1], size)
// 전기 불꽃 (쁘띠 썬더): 작은 전기구가 튀어 나간다
export const sparks = (from: At, size = 1) =>
  muzzle('#38BDF8', '#F0F9FF', from, size) + fly(`<g><animateTransform attributeName="transform" type="rotate" values="0;90;180;270" dur="0.3s" calcMode="discrete" repeatCount="indefinite"/>${art('spark', size)}</g>`, from, [HIT_X, from[1]]) + impact('#38BDF8', HIT_X, from[1], size)
// 창 던지기 (에덴즈 재블린)
export const javelin = (from: At) =>
  muzzle('#F59E0B', '#FDE68A', from, 0.9) + fly(art('javelin', 1.4), from, [HIT_X + 1.5, 7.5]) + impact('#F59E0B', HIT_X + 4, 7.5, 1.2)
export const blueFlame = (from: At, size = 1) =>
  muzzle('#3B82F6', '#BFDBFE', from, size) + fly(art('fireball_blue', size), from, [HIT_X, from[1]]) + impact('#3B82F6', HIT_X, from[1], size)

// 큰 에너지구 (일렉트로 쇼커): 머리 위로 던져 포물선으로 떨어진다
export const orb = (from: At, color: string, _light: string, size = 1.6) => {
  const [x0, y0] = from
  const yTop = Math.max(-1.5, y0 - 5)
  const tn = toneOf(color)
  const name = tn === 'thunder' ? 'orb_thunder' : tn === 'elec' ? 'orb_elec' : 'orb_fire'
  return (
    muzzle(color, _light, from, size) +
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.36;0.36;0.62;0.62;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="${x0} ${y0};${x0} ${y0};${at((x0 + BODY_X) / 2)} ${yTop};${BODY_X} 8;${BODY_X} 8" keyTimes="0;0.36;0.49;0.62;1" dur="${ATK}" repeatCount="indefinite"/>` +
    art(name, size) +
    '</g>' +
    impact(color, BODY_X, 8, size * 1.3) +
    impact(_light, BODY_X - 2.2, 6, size * 0.6)
  )
}
// 가이아 포스: 머리 위(from)에서 에너지구가 커지며 모였다가(0.3 → 0.46) 상대에게 포물선으로 날아간다 (0.46 → 0.62)
export const gaiaForce = (from: At, _color = '#F26B21', _light = '#FDE047', size = 1.7) => {
  const [x0, y0] = from
  return (
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.3;0.3;0.46;0.46;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<g transform="translate(${x0} ${y0})"><g transform="scale(${size})"><animateTransform attributeName="transform" type="scale" values="0.2;0.2;${size};${size}" keyTimes="0;0.3;0.46;1" dur="${ATK}" repeatCount="indefinite"/>${art('orb_fire')}</g></g>` +
    '</g>' +
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.46;0.46;0.62;0.62;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="${x0} ${y0};${x0} ${y0};${at((x0 + BODY_X) / 2)} ${at(y0 - 0.6)};${BODY_X} 8;${BODY_X} 8" keyTimes="0;0.46;0.54;0.62;1" dur="${ATK}" repeatCount="indefinite"/>` +
    art('orb_fire', size) +
    '</g>' +
    impact('#F26B21', BODY_X, 8, size * 1.3) +
    impact('#FDE047', BODY_X - 2.2, 6, size * 0.6)
  )
}

// 빔: 입에서 상대까지 뻗는다 (clip으로 길이가 자라는 것처럼). thick: 굵기(칸)
export const beam = (from: At, color: string, _light: string, thick = 0.8) => {
  const [x0, y0] = from
  const len = at(BODY_X - x0)
  const id = `bc${Math.round(x0 * 10)}${Math.round(y0 * 10)}`
  return (
    muzzle(color, _light, from, thick) +
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.44;0.44;0.64;0.64;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<defs><clipPath id="${id}"><rect x="0" y="-3" width="${len}" height="6"><animate attributeName="width" values="0;0;${len};${len}" keyTimes="0;0.44;0.5;1" dur="${ATK}" repeatCount="indefinite"/></rect></clipPath></defs>` +
    `<g transform="translate(${x0} ${y0})"><g clip-path="url(#${id})"><g transform="scale(${at(len / BEAM_LEN)} ${thick})">${art(`beam_${toneOf(color)}`)}</g></g></g>` +
    '</g>' +
    impact(color, BODY_X, y0, thick * 1.3)
  )
}
// 미사일 (기가 디스트로이어)
export const missiles = (from: At, n = 2) => {
  let out = muzzle('#FDE047', WHITE, from, 0.8)
  for (let i = 0; i < n; i++) {
    const y = at(from[1] + (i - (n - 1) / 2) * 1.8)
    const a = at(0.44 + i * 0.02)
    out += fly(art('missile', 0.9), [from[0], y], [HIT_X + 1, y], a, at(a + 0.16)) + impact('#F26B21', HIT_X + 1, y, 1.2)
  }
  return out
}
// 하늘에서 떨어지는 것: n개가 상대 위로 엇갈려 떨어진다. rot: 그림 회전(90의 배수로 도트가 유지된다)
const rainOf = (name: string, color: string, n: number, spread: number, rot = 0, scale = 1, hit = 0.6) => {
  let out = ''
  for (let i = 0; i < n; i++) {
    const x = at(24.5 + (spread * i) / Math.max(1, n - 1) + (i % 2) * 0.6)
    const s = at(0.44 + i * 0.03)
    const e = at(s + 0.14)
    const yEnd = at(10 - (i % 3) * 1.5)
    const inner = rot ? `<g transform="rotate(${rot})">${art(name, scale)}</g>` : art(name, scale)
    out +=
      '<g opacity="0">' +
      `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${s};${s};${e};${e};1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
      `<animateTransform attributeName="transform" type="translate" values="${x} -2;${x} -2;${at(x - 1.5)} ${yEnd};${at(x - 1.5)} ${yEnd}" keyTimes="0;${s};${e};1" dur="${ATK}" repeatCount="indefinite"/>` +
      inner +
      '</g>' +
      impact(color, at(x - 1.5), yEnd, scale * hit)
  }
  return out
}
export const meteorWing = (from: At, n = 3) => muzzle('#F26B21', '#FDE047', from, 1) + rainOf('fireball', '#F26B21', n, 7, 90, 0.9)
export const starlight = (n = 5) => rainOf('star', '#FDE047', n, 9, 0, 1.1)
export const sevenHeavens = () => rainOf('orb_holy', '#FDE68A', 7, 10)
export const needleSpray = (from: At) => muzzle('#86EFAC', WHITE, from, 0.8) + rainOf('needle', '#86EFAC', 7, 9, 90, 1, 0.3)
export const rockRain = (n = 4) => rainOf('rock', '#9CA3AF', n, 8)
export const rain = (_rows: unknown, _pal: unknown, color: string, n = 3, scale = 1, spread = 7) => rainOf('orb_white', color, n, spread, 0, scale)

// 빛기둥: 상대 위에서 내려꽂힌다 (0.56 → 0.72)
export const pillar = (color: string, _light: string, w = 2.4, x = BODY_X) =>
  '<g opacity="0">' +
  `<animate attributeName="opacity" values="0;0;0.95;0.95;0;0" keyTimes="0;0.56;0.58;0.7;0.74;1" dur="${ATK}" repeatCount="indefinite"/>` +
  `<g transform="translate(${x} -2) scale(${at(w / 2.4)} 1)">${art(`pillar_${toneOf(color)}`)}</g>` +
  '</g>' +
  impact(color, x, 11.5, 1.2)
// 번개
export const lightning = (x = BODY_X, color = '#FDE047', _light = '#FFFBEB') =>
  '<g opacity="0">' +
  `<animate attributeName="opacity" values="0;0;1;0.3;1;0;0" keyTimes="0;0.56;0.57;0.62;0.66;0.72;1" dur="${ATK}" repeatCount="indefinite"/>` +
  `<g transform="translate(${x} 5)">${art(`lightning_${toneOf(color)}`)}</g></g>` +
  impact(color, x, 11, 1.1)
// 채찍 (템프테이션)·덩굴 (포이즌 아이비): 손에서 상대까지 clip으로 뻗어 나간다
const lash = (name: string, from: At, len: number, a: number, b: number) => {
  const id = `lc${name}${Math.round(from[0] * 10)}`
  return (
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${a};${a};${b};${b};1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<defs><clipPath id="${id}"><rect x="0" y="-8" width="${len}" height="16"><animate attributeName="width" values="0;0;${len};${len}" keyTimes="0;${a};${at(a + 0.08)};1" dur="${ATK}" repeatCount="indefinite"/></rect></clipPath></defs>` +
    `<g transform="translate(${from[0]} ${from[1]})"><g clip-path="url(#${id})"><g transform="scale(${at(len / WHIP_LEN)} 1)">${art(name)}</g></g></g>` +
    '</g>'
  )
}
export const whip = (from: At, color: string, light: string) =>
  muzzle(color, light, from, 0.8) + `<g transform="translate(0 -2.5)">${lash(`whip_${toneOf(color)}`, from, at(BODY_X - from[0]), 0.5, 0.66)}</g>` + slash(color, BODY_X, 7.5, light, -60)
export const vine = (from: At, color = '#22C55E', light = '#86EFAC') =>
  muzzle(light, WHITE, from, 0.7) + lash(`vine_${toneOf(color)}`, from, at(BODY_X - from[0]), 0.46, 0.66) + slash(light, BODY_X, 7.5, WHITE, -30)
// 음파 (퍼피 하울링)
export const soundWave = (from: At, color = '#F9A8D4', _light = WHITE) =>
  muzzle(color, _light, from, 0.8) + fly(art(`wave_${toneOf(color)}`), from, [BODY_X - 2, from[1]], 0.44, 0.6) + impact(color, BODY_X - 1.5, from[1], 0.9)
export const holyArrow = (from: At) =>
  muzzle('#F9A8D4', WHITE, from, 0.9) + fly(art('arrow', 1.5), from, [HIT_X + 1.5, 7.5]) + impact('#F9A8D4', HIT_X + 4, 7.5, 1.1)
export const harpoon = (from: At, n = 1) => {
  let out = muzzle('#CBD5E1', WHITE, from, 0.8)
  for (let i = 0; i < n; i++) {
    const y = at(from[1] + (i - (n - 1) / 2) * 1.5)
    const ty = at(7.5 + (i - (n - 1) / 2) * 1.5)
    const a = at(0.44 + i * 0.03)
    out += fly(art('harpoon', 1.3), [from[0], y], [HIT_X + 1, ty], a, at(a + 0.16)) + impact('#E2E8F0', HIT_X + 1.5, ty, 1)
  }
  return out
}
export const marchingFishes = (from: At, n = 4) => {
  let out = ''
  for (let i = 0; i < n; i++) {
    const x0 = at(from[0] - i * 1.4)
    const y = at(11.4 - (i % 2) * 1.1)
    const a = at(0.44 + i * 0.015)
    out += fly(art('fish', 1.1), [x0, y], [HIT_X + 1, y], a, at(a + 0.16))
  }
  return out + impact('#38BDF8', HIT_X + 1, 10.5, 1.1) + impact('#BAE6FD', HIT_X + 2, 8.5, 0.8)
}
export const airShot = (from: At) => muzzle('#7DD3FC', WHITE, from, 0.8) + fly(art('wind', 1.2), from, [HIT_X, from[1]]) + impact('#BAE6FD', HIT_X, from[1], 1.1)
export const flowerCannon = (from: At) =>
  muzzle('#F9A8D4', '#FDE047', from, 1) + fly(`<g><animateTransform attributeName="transform" type="rotate" values="0;90;180;270" dur="0.6s" calcMode="discrete" repeatCount="indefinite"/>${art('flower', 1.4)}</g>`, from, [HIT_X, from[1]]) + impact('#F472B6', HIT_X, from[1], 1.5)
export const iceShards = (from: At, n = 3) => {
  let out = muzzle('#60A5FA', '#E0F2FE', from, 1)
  for (let i = 0; i < n; i++) {
    const y = at(from[1] + (i - (n - 1) / 2) * 1.4)
    out += fly(art('shard'), [from[0], y], [HIT_X, y], at(0.44 + i * 0.02), at(0.6 + i * 0.02))
  }
  return out + impact('#60A5FA', HIT_X, from[1], 1.3)
}
export const cocytus = (from: At) => beam(from, '#93C5FD', '#E0F2FE', 1.4) + rainOf('shard', '#93C5FD', 4, 6, 90, 0.9)
export const strike = (color: string, light: string, claws = false) =>
  claws
    ? slash(color, BODY_X - 1.2, 6.6, light, -55) + slash(color, BODY_X + 0.2, 7.6, light, -55) + slash(light, BODY_X + 1.4, 8.6, WHITE, -55)
    : slash(color, BODY_X - 0.5, 7.5, light) + impact(light, BODY_X - 1, 8.5, 0.9)
// 트라이던트 암: 집게가 케이블을 끌고 뻗어 상대를 문다
export const tridentArm = (from: At) => {
  const [x0, y0] = from
  const len = at(HIT_X - x0)
  return (
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.5;0.5;0.7;0.7;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<g transform="translate(${x0} ${y0})">` +
    `<rect x="0" y="-0.25" width="${len}" height="0.5" fill="#5F6B78" shape-rendering="crispEdges"><animate attributeName="width" values="0;0;${len};${len}" keyTimes="0;0.5;0.58;1" dur="${ATK}" repeatCount="indefinite"/></rect>` +
    `<g><animateTransform attributeName="transform" type="translate" values="0 0;0 0;${len} 0;${len} 0" keyTimes="0;0.5;0.58;1" dur="${ATK}" repeatCount="indefinite"/>${art('claw')}</g>` +
    '</g></g>' +
    impact('#F26B21', HIT_X + 1, y0, 1.1)
  )
}
