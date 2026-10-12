// 기술 효과 (전투 좌표, 칸 단위). 점 격자가 아니라 그라데이션·곡선으로 그려서 어느 배율에서도 매끈하다.
// 상대는 x 22~41에 서 있고 가운데가 x ≈ 31.5, 땅은 y = 13.
// 공격 주기(ATK)의 0.44에 기술이 나가서 0.6에 닿고, 상대는 0.6~0.76에 맞는다 (monsters.ts).
// from: 기술이 나가는 자리(입·손). 각 계열 파일(preview/gen-lines.py의 FX 표)이 디지몬마다 골라 쓴다
import { ATK } from './monsters.ts'
import { WHITE } from './pixel.ts'

type At = readonly [number, number]
const at = (v: number) => Math.round(v * 100) / 100
const HIT_X = 25.7
const BODY_X = 29.5
// 효과는 또렷한 점 그림(crispEdges) 위에 매끈하게 그린다
const SMOOTH = 'shape-rendering="geometricPrecision"'

// ── 색 ────────────────────────────────────────────────────────────
const uid = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '')
// 가운데가 밝고 바깥으로 갈수록 색이 짙어지다 투명해지는 둥근 그라데이션
const radial = (id: string, core: string, mid: string, edge: string) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${core}"/><stop offset="0.45" stop-color="${mid}"/><stop offset="0.8" stop-color="${edge}"/><stop offset="1" stop-color="${edge}" stop-opacity="0"/></radialGradient>`
// 가로 빔: 위아래 가장자리는 짙고 가운데는 밝다
const across = (id: string, edge: string, core: string) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${edge}" stop-opacity="0.2"/><stop offset="0.3" stop-color="${edge}"/><stop offset="0.5" stop-color="${core}"/><stop offset="0.7" stop-color="${edge}"/><stop offset="1" stop-color="${edge}" stop-opacity="0.2"/></linearGradient>`
const glowId = (c: string, l: string) => `fxg${uid(c)}${uid(l)}`
const beamId = (c: string, l: string) => `fxb${uid(c)}${uid(l)}`
const defs = (c: string, l: string) => `<defs>${radial(glowId(c, l), WHITE, l, c)}${across(beamId(c, l), c, l)}</defs>`

// 빛 번짐: 그라데이션 원
const glow = (cx: number, cy: number, r: number, c: string, l: string, opacity = 1) =>
  `<circle cx="${at(cx)}" cy="${at(cy)}" r="${at(r)}" fill="url(#${glowId(c, l)})" opacity="${opacity}"/>`

// 주기 안의 구간에만 보이기 (a → b 사이)
const during = (a: number, b: number, inner: string) =>
  `<g opacity="0" ${SMOOTH}>` +
  `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${a};${a};${b};${b};1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
  inner +
  '</g>'

// from에서 to까지 날아가기 (0.44 → 0.6). inner는 가운데가 (0, 0)이고 오른쪽을 향한 그림
const fly = (inner: string, from: At, to: At, a = 0.44, b = 0.6) => {
  const ang = at((Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI)
  return (
    `<g opacity="0" ${SMOOTH}>` +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;${a};${a};${b};${b};1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="${from[0]} ${from[1]};${from[0]} ${from[1]};${to[0]} ${to[1]};${to[0]} ${to[1]}" keyTimes="0;${a};${b};1" dur="${ATK}" repeatCount="indefinite"/>` +
    (ang ? `<g transform="rotate(${ang})">${inner}</g>` : inner) +
    '</g>'
  )
}

// 반짝 터지는 충격 (0.6 → 0.72): 빛 번짐 + 여덟 갈래 광선 + 퍼지는 고리
export const impact = (color: string, cx = HIT_X, cy = 7.6, size = 1, light = WHITE) =>
  `<g opacity="0" ${SMOOTH}>` +
  `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.6;0.61;0.7;0.74;1" dur="${ATK}" repeatCount="indefinite"/>` +
  defs(color, light) +
  `<g transform="translate(${at(cx)} ${at(cy)}) scale(${size})">` +
  `<g><animateTransform attributeName="transform" type="scale" values="0.3;1.15;1" keyTimes="0;0.63;1" dur="${ATK}" begin="0s" repeatCount="indefinite" calcMode="discrete"/>` +
  glow(0, 0, 2.2, color, light) +
  [0, 45, 90, 135].map(a => `<polygon points="-2.6,0 -0.35,-0.35 0,-2.6 0.35,-0.35 2.6,0 0.35,0.35 0,2.6 -0.35,0.35" fill="${a % 90 ? color : light}" opacity="${a % 90 ? 0.85 : 0.95}" transform="rotate(${a}) scale(${a % 90 ? 0.75 : 1})"/>`).join('') +
  `<circle cx="0" cy="0" r="0.6" fill="${WHITE}"/>` +
  '</g>' +
  `<circle cx="0" cy="0" r="1" fill="none" stroke="${light}" stroke-width="0.25" opacity="0.8"><animate attributeName="r" values="0.5;0.5;3.2" keyTimes="0;0.6;0.74" dur="${ATK}" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0;0.9;0" keyTimes="0;0.6;0.62;0.74" dur="${ATK}" repeatCount="indefinite"/></circle>` +
  '</g></g>'

// 베는 자국 (0.6 → 0.72): 초승달꼴 빛줄기
export const slash = (color: string, cx = BODY_X, cy = 7.5, light = WHITE, angle = -40) =>
  `<g opacity="0" ${SMOOTH}>` +
  `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.6;0.61;0.68;0.72;1" dur="${ATK}" repeatCount="indefinite"/>` +
  `<g transform="translate(${at(cx)} ${at(cy)}) rotate(${angle})">` +
  `<path d="M-3.2 0 Q0 -1.6 3.2 0 Q0 -0.4 -3.2 0Z" fill="${color}" opacity="0.9"/>` +
  `<path d="M-2.4 -0.1 Q0 -1.1 2.4 -0.1 Q0 -0.45 -2.4 -0.1Z" fill="${light}"/>` +
  '</g></g>'

// 기술이 나가는 순간 입가(손끝)의 번쩍임 (0.4 → 0.5)
export const muzzle = (color: string, light: string, [x, y]: At, size = 1) =>
  during(
    0.4,
    0.5,
    defs(color, light) +
      `<g transform="translate(${at(x)} ${at(y)}) scale(${size})">` +
      glow(0, 0, 1.6, color, light) +
      `<polygon points="-1.6,0 -0.3,-0.3 0,-1.6 0.3,-0.3 1.6,0 0.3,0.3 0,1.6 -0.3,0.3" fill="${light}"/>` +
      `<circle cx="0" cy="0" r="0.35" fill="${WHITE}"/>` +
      '</g>',
  )

// ── 투사체 그림 (가운데 (0, 0), 오른쪽을 향함) ─────────────────────────────
const FIRE = '#F26B21'
const FIRE_L = '#FDE047'

// 불덩이: 둥근 불 + 뒤로 흩날리는 꼬리 + 불티
const fireballArt = (c = FIRE, l = FIRE_L) =>
  defs(c, l) +
  `<path d="M0.2 -1.1 C-1.2 -1.6 -2.6 -0.9 -3.8 -0.2 C-2.4 -0.5 -2 0 -3.4 0.9 C-2.2 0.7 -1.3 1.2 0.2 1.1 Z" fill="${c}" opacity="0.85"/>` +
  `<path d="M0 -0.6 C-0.9 -0.9 -1.9 -0.5 -2.6 -0.1 C-1.8 -0.2 -1.5 0.2 -2.2 0.6 C-1.4 0.5 -0.8 0.7 0 0.6 Z" fill="${l}" opacity="0.9"/>` +
  glow(0.1, 0, 1.6, c, l) +
  `<circle cx="0.2" cy="0" r="0.75" fill="${l}"/><circle cx="0.35" cy="-0.1" r="0.4" fill="${WHITE}"/>` +
  `<circle cx="-2.8" cy="-0.9" r="0.22" fill="${l}"/><circle cx="-3.6" cy="0.5" r="0.18" fill="${c}"/><circle cx="-2.2" cy="1.1" r="0.16" fill="${l}"/>`

// 얼음 조각: 마름모에 하이라이트
const shardArt = (c = '#60A5FA', l = '#E0F2FE') =>
  `<polygon points="1.6,0 0,-0.75 -1.6,0 0,0.75" fill="${c}"/><polygon points="1.2,0 0,-0.45 -0.9,0 0,0.45" fill="${l}"/><polygon points="0.9,0 0.1,-0.2 -0.4,0 0.1,0.2" fill="${WHITE}"/>`

// 별: 다섯 꼭지
const starArt = (c = '#FDE047', l = WHITE) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 0.45 : 1.1
    const a = (Math.PI / 5) * i - Math.PI / 2
    return `${at(Math.cos(a) * r)},${at(Math.sin(a) * r)}`
  }).join(' ')
  return defs(c, l) + glow(0, 0, 1.5, c, l, 0.8) + `<polygon points="${pts}" fill="${c}"/><polygon points="${pts}" fill="${l}" transform="scale(0.45)"/>`
}

// 미사일: 회색 몸통, 붉은 탄두, 꼬리 날개, 분사 불꽃
const missileArt = () =>
  defs(FIRE, FIRE_L) +
  `<path d="M-2.6 -0.1 L-2.6 -0.9 L-1.6 -0.3 L-1.6 0.3 L-2.6 0.9 L-2.6 0.1 Z" fill="#7B8794"/>` +
  `<rect x="-2.2" y="-0.42" width="3.2" height="0.84" rx="0.3" fill="#C5CDD6"/>` +
  `<rect x="-2.2" y="-0.42" width="3.2" height="0.3" rx="0.15" fill="#EEF2F5"/>` +
  `<path d="M1 -0.42 L2.3 0 L1 0.42 Z" fill="#D7263D"/>` +
  `<rect x="-0.6" y="-0.42" width="0.25" height="0.84" fill="#7B8794"/>` +
  `<path d="M-2.6 0 C-3.4 -0.6 -4.4 -0.5 -5 0 C-4.4 0.5 -3.4 0.6 -2.6 0 Z" fill="${FIRE}" opacity="0.9"/>` +
  `<path d="M-2.6 0 C-3.1 -0.3 -3.7 -0.3 -4.1 0 C-3.7 0.3 -3.1 0.3 -2.6 0 Z" fill="${FIRE_L}"/>`

// 화살 (홀리 애로우): 굵은 빛의 살대, 길고 큰 삼각 촉, 뒤로 눕힌 깃 둘, 뒤로 끌리는 빛줄기
const arrowArt = (c = '#F9A8D4', l = WHITE) =>
  defs(c, l) +
  `<path d="M-7 0 L-4 0" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="0.3"/>` +
  `<rect x="-4.5" y="-0.24" width="6.5" height="0.48" rx="0.24" fill="${c}"/><rect x="-4.5" y="-0.1" width="6.5" height="0.2" fill="${WHITE}"/>` +
  `<path d="M1.6 -1.1 L5.2 0 L1.6 1.1 L2.3 0 Z" fill="${c}"/><path d="M2 -0.55 L4.4 0 L2 0.55 L2.4 0 Z" fill="${WHITE}"/>` +
  `<path d="M-4.5 -0.2 L-3.2 -1.2 L-2.2 -1.2 L-3.4 -0.2 Z" fill="${l}" stroke="${c}" stroke-width="0.1"/>` +
  `<path d="M-4.5 0.2 L-3.2 1.2 L-2.2 1.2 L-3.4 0.2 Z" fill="${l}" stroke="${c}" stroke-width="0.1"/>` +
  glow(4.2, 0, 1.2, c, l, 0.7)

// 작살 (하푼 발칸): 쇠 창대와 넓은 촉, 줄
const harpoonArt = () =>
  `<rect x="-3.6" y="-0.16" width="5.4" height="0.32" fill="#9AA3AE"/><rect x="-3.6" y="-0.16" width="5.4" height="0.12" fill="#E2E8F0"/>` +
  `<path d="M1.6 -0.7 L3.4 0 L1.6 0.7 L2.1 0 Z" fill="#CBD5E1"/><path d="M1.8 -0.4 L2.9 0 L1.8 0.4 L2.1 0 Z" fill="${WHITE}"/>` +
  `<path d="M-3.6 0 C-4.4 0.3 -5 -0.3 -5.8 0.1" stroke="#64748B" stroke-width="0.14" fill="none"/>`

// 물고기 (마칭 피시즈)
const fishArt = (c = '#38BDF8', l = '#E0F2FE') =>
  `<path d="M0.9 0 C0.4 -0.6 -0.6 -0.6 -1 0 C-0.6 0.6 0.4 0.6 0.9 0 Z" fill="${c}"/>` +
  `<path d="M-0.9 0 L-1.6 -0.5 L-1.5 0 L-1.6 0.5 Z" fill="${c}"/>` +
  `<path d="M0.5 -0.15 C0.1 -0.4 -0.5 -0.4 -0.8 -0.05 C-0.4 -0.2 0.1 -0.15 0.5 -0.15Z" fill="${l}"/>` +
  `<circle cx="0.45" cy="-0.12" r="0.1" fill="#1F1410"/>`

// 꽃 (플라워 캐논): 꽃잎 다섯과 노란 가운데, 빛 번짐
const flowerArt = (c = '#F472B6', l = '#FDE047') =>
  defs(c, '#FBCFE8') +
  glow(0, 0, 1.8, c, '#FBCFE8', 0.8) +
  [0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-0.85" rx="0.42" ry="0.7" fill="${c}" transform="rotate(${a})"/>`).join('') +
  [0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-0.8" rx="0.2" ry="0.4" fill="#FBCFE8" transform="rotate(${a})"/>`).join('') +
  `<circle cx="0" cy="0" r="0.45" fill="${l}"/><circle cx="-0.1" cy="-0.1" r="0.18" fill="${WHITE}"/>`

// 바람 고리 (에어 슛): 겹친 고리 둘과 뒤로 흐르는 바람 줄기
const windArt = (c = '#7DD3FC', l = '#E0F2FE') =>
  `<ellipse cx="0" cy="0" rx="1.2" ry="1.6" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.9"/>` +
  `<ellipse cx="0.15" cy="0" rx="0.7" ry="1" fill="none" stroke="${l}" stroke-width="0.35"/>` +
  `<ellipse cx="0.3" cy="0" rx="0.3" ry="0.45" fill="${WHITE}" opacity="0.9"/>` +
  `<path d="M-1.4 -1 Q-3 -0.8 -4 0.2" stroke="${c}" stroke-width="0.3" fill="none" stroke-linecap="round" opacity="0.7"/>` +
  `<path d="M-1.4 1 Q-2.8 1.3 -3.6 0.4" stroke="${l}" stroke-width="0.25" fill="none" stroke-linecap="round" opacity="0.7"/>`

// 바늘 (니들 스프레이)
const needleArt = (c = '#16A34A', l = '#86EFAC') =>
  `<path d="M-1.2 0 L1.2 0" stroke="${c}" stroke-width="0.3" stroke-linecap="round"/><path d="M-1 0 L0.9 0" stroke="${l}" stroke-width="0.12"/><circle cx="1.2" cy="0" r="0.18" fill="${WHITE}"/>`

// 빛구 (세븐 헤븐즈·거품)
const orbArt = (c: string, l: string, r = 0.9) =>
  defs(c, l) + glow(0, 0, r * 1.7, c, l, 0.8) + `<circle cx="0" cy="0" r="${r}" fill="${l}"/><circle cx="${at(-r * 0.3)}" cy="${at(-r * 0.3)}" r="${at(r * 0.4)}" fill="${WHITE}"/><circle cx="0" cy="0" r="${r}" fill="none" stroke="${c}" stroke-width="0.12" opacity="0.8"/>`

// ── 기술 ──────────────────────────────────────────────────────────

// 유년기의 거품: 작은 물방울 둘
export const bubble = (from: At) =>
  muzzle('#BAE6FD', WHITE, from, 0.6) +
  fly(orbArt('#7DD3FC', '#E0F2FE', 0.55), from, [HIT_X, from[1]]) +
  fly(`<g transform="translate(-1.2 -0.8)">${orbArt('#7DD3FC', '#E0F2FE', 0.32)}</g>`, from, [HIT_X - 0.6, from[1] - 0.8], 0.46, 0.6) +
  impact('#BAE6FD', HIT_X, from[1], 0.7)

// 불덩이 (아구몬·그레이몬·피요몬). size로 크기
export const fireball = (from: At, size = 1) =>
  muzzle(FIRE, FIRE_L, from, size) +
  fly(`<g transform="scale(${size})">${fireballArt()}</g>`, from, [HIT_X, from[1]]) +
  impact(FIRE, HIT_X, from[1], size, FIRE_L)

// 파란 불꽃 (블루 블래스터·폭스 파이어): 불덩이의 파란 판
export const blueFlame = (from: At, size = 1) =>
  muzzle('#3B82F6', '#BFDBFE', from, size) +
  fly(`<g transform="scale(${size})">${fireballArt('#3B82F6', '#BFDBFE')}</g>`, from, [HIT_X, from[1]]) +
  impact('#3B82F6', HIT_X, from[1], size, '#BFDBFE')

// 큰 에너지구 (가이아 포스·일렉트로 쇼커): 머리 위로 던져 포물선으로 떨어진다
export const orb = (from: At, color: string, light: string, size = 1.6) => {
  const [x0, y0] = from
  const yTop = Math.max(-1.5, y0 - 5)
  return (
    muzzle(color, light, from, size) +
    `<g opacity="0" ${SMOOTH}>` +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.36;0.36;0.62;0.62;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="${x0} ${y0};${x0} ${y0};${at((x0 + BODY_X) / 2)} ${yTop};${BODY_X} 8;${BODY_X} 8" keyTimes="0;0.36;0.49;0.62;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<g transform="scale(${size})">` +
    defs(color, light) +
    glow(0, 0, 2.4, color, light, 0.9) +
    `<circle cx="0" cy="0" r="1.25" fill="${color}"/><circle cx="-0.25" cy="-0.25" r="0.85" fill="${light}"/><circle cx="-0.45" cy="-0.45" r="0.38" fill="${WHITE}"/>` +
    `<ellipse cx="0" cy="0" rx="1.9" ry="0.45" fill="none" stroke="${light}" stroke-width="0.14" opacity="0.8" transform="rotate(-25)"/>` +
    '</g></g>' +
    impact(color, BODY_X, 8, size * 1.3, light) +
    impact(light, BODY_X - 2.2, 6, size * 0.6)
  )
}

// 가이아 포스: 머리 위(from)에서 에너지구가 커지며 모였다가(0.3 → 0.46) 상대에게 포물선으로 날아간다 (0.46 → 0.62)
export const gaiaForce = (from: At, color = FIRE, light = FIRE_L, size = 1.7) => {
  const [x0, y0] = from
  const art =
    defs(color, light) +
    glow(0, 0, 2.4, color, light, 0.9) +
    `<circle cx="0" cy="0" r="1.25" fill="${color}"/><circle cx="-0.25" cy="-0.25" r="0.85" fill="${light}"/><circle cx="-0.45" cy="-0.45" r="0.38" fill="${WHITE}"/>` +
    `<ellipse cx="0" cy="0" rx="1.9" ry="0.45" fill="none" stroke="${light}" stroke-width="0.14" opacity="0.8" transform="rotate(-25)"><animateTransform attributeName="transform" type="rotate" values="-25;335" dur="1s" repeatCount="indefinite"/></ellipse>`
  return (
    // 모으기: 머리 위에서 작게 시작해 커진다
    `<g opacity="0" ${SMOOTH}>` +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.3;0.3;0.46;0.46;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<g transform="translate(${x0} ${y0})"><g transform="scale(${size})"><animateTransform attributeName="transform" type="scale" values="0.2;0.2;${size};${size}" keyTimes="0;0.3;0.46;1" dur="${ATK}" repeatCount="indefinite"/>${art}</g></g>` +
    '</g>' +
    // 던지기: 머리 위에서 살짝 더 올라갔다가 상대에게 떨어진다
    `<g opacity="0" ${SMOOTH}>` +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.46;0.46;0.62;0.62;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<animateTransform attributeName="transform" type="translate" values="${x0} ${y0};${x0} ${y0};${at((x0 + BODY_X) / 2)} ${at(y0 - 0.6)};${BODY_X} 8;${BODY_X} 8" keyTimes="0;0.46;0.54;0.62;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<g transform="scale(${size})">${art}</g>` +
    '</g>' +
    impact(color, BODY_X, 8, size * 1.3, light) +
    impact(light, BODY_X - 2.2, 6, size * 0.6)
  )
}

// 빔 (블루 블래스터·폭스 파이어·호른 버스터·메가 블래스터·헤븐즈 너클·소로 블루): 입에서 상대까지 쭉 뻗는다. thick: 굵기(칸)
export const beam = (from: At, color: string, light: string, thick = 0.8) => {
  const [x0, y0] = from
  const len = at(BODY_X - x0)
  const grow = `<animate attributeName="width" values="0;0;${len};${len}" keyTimes="0;0.44;0.5;1" dur="${ATK}" repeatCount="indefinite"/>`
  return (
    muzzle(color, light, from, thick) +
    `<g opacity="0" ${SMOOTH}>` +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.44;0.44;0.64;0.64;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    defs(color, light) +
    `<g transform="translate(${x0} ${y0})">` +
    `<rect x="0" y="${at(-thick)}" width="${len}" height="${at(thick * 2)}" rx="${thick}" fill="${color}" opacity="0.3">${grow}</rect>` +
    `<rect x="0" y="${at(-thick / 2)}" width="${len}" height="${thick}" rx="${at(thick / 2)}" fill="url(#${beamId(color, light)})">${grow}</rect>` +
    `<rect x="0" y="${at(-thick / 6)}" width="${len}" height="${at(thick / 3)}" rx="${at(thick / 6)}" fill="${WHITE}" opacity="0.9">${grow}</rect>` +
    '</g>' +
    `<g transform="translate(${BODY_X} ${y0})"><animateTransform attributeName="transform" type="translate" values="${x0} ${y0};${x0} ${y0};${BODY_X} ${y0};${BODY_X} ${y0}" keyTimes="0;0.44;0.5;1" dur="${ATK}" repeatCount="indefinite"/>${glow(0, 0, thick * 1.6, color, light)}</g>` +
    '</g>' +
    impact(color, BODY_X, y0, thick * 1.3, light)
  )
}

// 미사일 (기가 디스트로이어): 가슴 해치에서 둘이 위아래로 날아간다. 뒤에 연기
export const missiles = (from: At, n = 2) => {
  let out = muzzle('#FDE047', WHITE, from, 0.8)
  for (let i = 0; i < n; i++) {
    const y = at(from[1] + (i - (n - 1) / 2) * 1.8)
    const a = at(0.44 + i * 0.02)
    out +=
      fly(`<g transform="scale(0.9)">${missileArt()}</g>`, [from[0], y], [HIT_X + 1, y], a, at(a + 0.16)) +
      // 연기: 지나간 자리에 남는 흐린 원들
      [0.25, 0.5, 0.75].map(k => {
        const x = at(from[0] + (HIT_X - from[0]) * k)
        return `<circle cx="${x}" cy="${y}" r="0.45" fill="#CBD5E1" opacity="0"><animate attributeName="opacity" values="0;0;0.7;0;0" keyTimes="0;${at(a + 0.16 * k)};${at(a + 0.16 * k + 0.02)};${at(a + 0.16 * k + 0.2)};1" dur="${ATK}" repeatCount="indefinite"/><animate attributeName="r" values="0.3;0.3;0.3;0.9;0.9" keyTimes="0;${at(a + 0.16 * k)};${at(a + 0.16 * k + 0.02)};${at(a + 0.16 * k + 0.2)};1" dur="${ATK}" repeatCount="indefinite"/></circle>`
      }).join('') +
      impact(FIRE, HIT_X + 1, y, 1.2, FIRE_L)
  }
  return out
}

// 하늘에서 떨어지는 것 (메테오 윙·스타라이트·세븐 헤븐즈·니들 스프레이): n개가 상대 위로 엇갈려 떨어진다
const rainOf = (art: string, color: string, light: string, n: number, spread: number, rotate = 0, scale = 1) => {
  let out = ''
  for (let i = 0; i < n; i++) {
    const x = at(24.5 + (spread * i) / Math.max(1, n - 1) + (i % 2) * 0.6)
    const s = at(0.44 + i * 0.03)
    const e = at(s + 0.14)
    const yEnd = at(10 - (i % 3) * 1.5)
    out +=
      fly(`<g transform="rotate(${rotate}) scale(${scale})">${art}</g>`, [x, -2], [at(x - 1.5), yEnd], s, e) +
      `<g opacity="0" ${SMOOTH}><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;${e};${at(e + 0.02)};${at(e + 0.1)};1" dur="${ATK}" repeatCount="indefinite"/>` +
      `<g transform="translate(${at(x - 1.5)} ${yEnd}) scale(${scale * 0.8})">${defs(color, light)}${glow(0, 0, 1.4, color, light)}<circle cx="0" cy="0" r="0.4" fill="${WHITE}"/></g></g>`
  }
  return out
}
export const rain = (_rows: readonly string[], _pal: unknown, color: string, n = 3, scale = 1, spread = 7) => rainOf(orbArt(color, WHITE, 0.6), color, WHITE, n, spread, 0, scale)
export const meteorWing = (from: At, n = 3) => muzzle(FIRE, FIRE_L, from, 1) + rainOf(fireballArt(), FIRE, FIRE_L, n, 7, 110, 0.9)
export const starlight = (n = 5) => rainOf(starArt(), '#FDE047', WHITE, n, 9, 0, 1.1)
export const sevenHeavens = () => rainOf(orbArt('#FDE68A', '#FFF7D6', 0.8), '#FDE68A', WHITE, 7, 10)
export const needleSpray = (from: At) => muzzle('#86EFAC', WHITE, from, 0.8) + rainOf(needleArt(), '#86EFAC', WHITE, 6, 8, 110)
export const rockRain = (n = 4) => rainOf(`<polygon points="-0.9,-0.4 -0.2,-0.9 0.8,-0.5 0.9,0.5 0.1,0.9 -0.8,0.5" fill="#9CA3AF"/><polygon points="-0.5,-0.3 0.1,-0.6 0.5,-0.2 0,0.1" fill="#D1D5DB"/>`, '#9CA3AF', WHITE, n, 8)

// 빛기둥 (헤븐즈 게이트·에덴즈 재블린·해머 스파크): 상대 위에서 내려꽂힌다 (0.56 → 0.72)
export const pillar = (color: string, light: string, w = 2.4, x = BODY_X) => {
  const id = `fxp${uid(color)}${uid(light)}`
  return (
    `<g opacity="0" ${SMOOTH}>` +
    `<animate attributeName="opacity" values="0;0;0.95;0.95;0;0" keyTimes="0;0.56;0.58;0.7;0.74;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${color}" stop-opacity="0"/><stop offset="0.25" stop-color="${color}" stop-opacity="0.8"/><stop offset="0.5" stop-color="${light}"/><stop offset="0.75" stop-color="${color}" stop-opacity="0.8"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>${radial(glowId(color, light), WHITE, light, color)}</defs>` +
    `<rect x="${at(x - w / 2)}" y="-2" width="${w}" height="15" fill="url(#${id})"><animate attributeName="height" values="0;0;15;15" keyTimes="0;0.56;0.6;1" dur="${ATK}" repeatCount="indefinite"/></rect>` +
    `<rect x="${at(x - w / 8)}" y="-2" width="${at(w / 4)}" height="15" fill="${WHITE}" opacity="0.9"><animate attributeName="height" values="0;0;15;15" keyTimes="0;0.56;0.6;1" dur="${ATK}" repeatCount="indefinite"/></rect>` +
    `<ellipse cx="${x}" cy="12.6" rx="${at(w * 0.9)}" ry="0.5" fill="url(#${glowId(color, light)})"/>` +
    '</g>' +
    impact(light, x, 11.5, 1.2, color)
  )
}

// 번개 (프티 썬더·울트라 썬더·해머 스파크): 지그재그가 하늘에서 상대에게
export const lightning = (x = BODY_X, color = '#FDE047', light = '#FFFBEB') => {
  const pts = [[0, -2], [-1.2, 2], [0.8, 4.5], [-0.8, 7.5], [0.6, 10], [0, 12]]
  const path = pts.map(([dx, dy], i) => `${i ? 'L' : 'M'}${at(x + dx!)} ${dy}`).join(' ')
  return (
    `<g opacity="0" ${SMOOTH}>` +
    `<animate attributeName="opacity" values="0;0;1;0.3;1;0;0" keyTimes="0;0.56;0.57;0.62;0.66;0.72;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<path d="${path}" stroke="${color}" stroke-width="1.6" fill="none" stroke-linejoin="round" opacity="0.35"/>` +
    `<path d="${path}" stroke="${color}" stroke-width="0.8" fill="none" stroke-linejoin="round"/>` +
    `<path d="${path}" stroke="${light}" stroke-width="0.3" fill="none" stroke-linejoin="round"/>` +
    '</g>' +
    impact(color, x, 11, 1.1, light)
  )
}

// 채찍 (템프테이션): 손에서 상대까지 휘어 날아가 찰싹
export const whip = (from: At, color: string, light: string) => {
  const [x0, y0] = from
  const cx = at((x0 + BODY_X) / 2)
  const d = `M${x0} ${y0} Q${cx} ${at(y0 - 5)} ${BODY_X} 7.5`
  const draw = `<animate attributeName="stroke-dashoffset" values="40;40;0;0" keyTimes="0;0.5;0.58;1" dur="${ATK}" repeatCount="indefinite"/>`
  return (
    muzzle(color, light, from, 0.8) +
    `<g opacity="0" ${SMOOTH}>` +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.5;0.5;0.66;0.66;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<path d="${d}" stroke="${color}" stroke-width="0.9" fill="none" stroke-linecap="round" opacity="0.35" stroke-dasharray="40" stroke-dashoffset="40">${draw}</path>` +
    `<path d="${d}" stroke="${color}" stroke-width="0.45" fill="none" stroke-linecap="round" stroke-dasharray="40" stroke-dashoffset="40">${draw}</path>` +
    `<path d="${d}" stroke="${light}" stroke-width="0.16" fill="none" stroke-dasharray="40" stroke-dashoffset="40">${draw}</path>` +
    '</g>' +
    slash(color, BODY_X, 7.5, light, -60)
  )
}

// 덩굴 (포이즌 아이비): 손에서 굵은 덩굴이 구불구불 뻗어 상대를 친다
export const vine = (from: At, color = '#22C55E', light = '#86EFAC') => {
  const [x0, y0] = from
  const len = at(BODY_X - x0)
  const d = `M0 0 C${at(len * 0.25)} -1.2 ${at(len * 0.5)} 1.2 ${at(len * 0.75)} -0.6 S${len} 0.2 ${len} 0`
  const draw = `<animate attributeName="stroke-dashoffset" values="30;30;0;0" keyTimes="0;0.46;0.56;1" dur="${ATK}" repeatCount="indefinite"/>`
  return (
    muzzle(light, WHITE, from, 0.7) +
    `<g opacity="0" ${SMOOTH}>` +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.46;0.46;0.66;0.66;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<g transform="translate(${x0} ${y0})">` +
    `<path d="${d}" stroke="#15803D" stroke-width="0.9" fill="none" stroke-linecap="round" stroke-dasharray="30" stroke-dashoffset="30">${draw}</path>` +
    `<path d="${d}" stroke="${color}" stroke-width="0.55" fill="none" stroke-linecap="round" stroke-dasharray="30" stroke-dashoffset="30">${draw}</path>` +
    `<path d="${d}" stroke="${light}" stroke-width="0.15" fill="none" stroke-dasharray="30" stroke-dashoffset="30">${draw}</path>` +
    [0.3, 0.6, 0.85].map((k, i) => `<ellipse cx="${at(len * k)}" cy="${i % 2 ? 0.9 : -0.9}" rx="0.7" ry="0.35" fill="${color}" transform="rotate(${i % 2 ? 35 : -35} ${at(len * k)} ${i % 2 ? 0.9 : -0.9})"/>`).join('') +
    '</g></g>' +
    slash(light, BODY_X, 7.5, WHITE, -30)
  )
}

// 음파 (퍼피 하울링): 입에서 둥근 파동 셋이 퍼져 간다
export const soundWave = (from: At, color = '#F9A8D4', light = WHITE) => {
  const [x0, y0] = from
  let out = muzzle(color, light, from, 0.8)
  for (let i = 0; i < 3; i++) {
    const s = at(0.44 + i * 0.04)
    const e = at(s + 0.16)
    const r = 1.2 + i * 0.5
    out += fly(
      `<path d="M0 -${r} Q${at(r * 1.1)} 0 0 ${r}" stroke="${color}" stroke-width="0.5" fill="none" stroke-linecap="round" opacity="0.9"/><path d="M0 -${at(r * 0.7)} Q${at(r * 0.8)} 0 0 ${at(r * 0.7)}" stroke="${light}" stroke-width="0.2" fill="none"/>`,
      [x0, y0],
      [BODY_X - 2, y0],
      s,
      e,
    )
  }
  return out + impact(color, BODY_X - 1.5, y0, 0.9, light)
}

// 화살 (홀리 애로우)·작살 (하푼 발칸)·물고기 떼 (마칭 피시즈)·바람 고리 (에어 슛)·꽃 (플라워 캐논)·얼음 조각
export const holyArrow = (from: At) =>
  muzzle('#F9A8D4', WHITE, from, 0.9) +
  fly(`<g transform="scale(1.5)">${arrowArt()}</g>`, from, [HIT_X + 1.5, 7.5]) +
  impact('#F9A8D4', HIT_X + 4, 7.5, 1.1, '#FBCFE8')
export const harpoon = (from: At, n = 1) => {
  let out = muzzle('#CBD5E1', WHITE, from, 0.8)
  for (let i = 0; i < n; i++) {
    const y = at(from[1] + (i - (n - 1) / 2) * 1.5)
    const a = at(0.44 + i * 0.03)
    const ty = at(7.5 + (i - (n - 1) / 2) * 1.5)
    out += fly(`<g transform="scale(1.3)">${harpoonArt()}</g>`, [from[0], y], [HIT_X + 1, ty], a, at(a + 0.16)) + impact('#E2E8F0', HIT_X + 1.5, ty, 1, '#CBD5E1')
  }
  return out
}
export const marchingFishes = (from: At, n = 4) => {
  let out = ''
  for (let i = 0; i < n; i++) {
    const x0 = at(from[0] - i * 1.4)
    const y = at(11.4 - (i % 2) * 1.1)
    const a = at(0.44 + i * 0.015)
    out += fly(`<g transform="scale(1.1)">${fishArt()}</g>`, [x0, y], [HIT_X + 1, y], a, at(a + 0.16))
  }
  return out + impact('#38BDF8', HIT_X + 1, 10.5, 1.1, '#E0F2FE') + impact('#BAE6FD', HIT_X + 2, 8.5, 0.8)
}
export const airShot = (from: At) => muzzle('#7DD3FC', WHITE, from, 0.8) + fly(`<g transform="scale(1.2)">${windArt()}</g>`, from, [HIT_X, from[1]]) + impact('#BAE6FD', HIT_X, from[1], 1.1, '#E0F2FE')
export const flowerCannon = (from: At) =>
  muzzle('#F9A8D4', '#FDE047', from, 1) +
  fly(`<g transform="scale(1.4)"><g><animateTransform attributeName="transform" type="rotate" values="0;360" dur="0.6s" repeatCount="indefinite"/>${flowerArt()}</g></g>`, from, [HIT_X, from[1]]) +
  impact('#F472B6', HIT_X, from[1], 1.5, '#FBCFE8')
export const iceShards = (from: At, n = 3) => {
  let out = muzzle('#60A5FA', '#E0F2FE', from, 1)
  for (let i = 0; i < n; i++) {
    const y = at(from[1] + (i - (n - 1) / 2) * 1.4)
    out += fly(shardArt(), [from[0], y], [HIT_X, y], at(0.44 + i * 0.02), at(0.6 + i * 0.02))
  }
  return out + impact('#60A5FA', HIT_X, from[1], 1.3, '#E0F2FE')
}
// 얼음 브레스 (코큐토스): 빔 + 상대를 얼리는 결정
export const cocytus = (from: At) => beam(from, '#93C5FD', '#E0F2FE', 1.4) + rainOf(shardArt(), '#93C5FD', '#E0F2FE', 4, 6, 60, 0.9)

// 근접 (카이저 네일·캣 펀치·엑스칼리버·망치): 베는 자국과 충격. claws가 true면 발톱 자국 셋
export const strike = (color: string, light: string, claws = false) =>
  claws
    ? slash(color, BODY_X - 1.2, 6.6, light, -55) + slash(color, BODY_X + 0.2, 7.6, light, -55) + slash(light, BODY_X + 1.4, 8.6, WHITE, -55)
    : slash(color, BODY_X - 0.5, 7.5, light) + impact(light, BODY_X - 1, 8.5, 0.9, color)

// 트라이던트 암: 집게가 케이블을 끌고 뻗어 상대를 문다
export const tridentArm = (from: At) => {
  const [x0, y0] = from
  const len = at(HIT_X - x0)
  const reach = `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;${len} 0;${len} 0" keyTimes="0;0.5;0.58;1" dur="${ATK}" repeatCount="indefinite"/>`
  return (
    `<g opacity="0" ${SMOOTH}>` +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.5;0.5;0.7;0.7;1" dur="${ATK}" calcMode="discrete" repeatCount="indefinite"/>` +
    `<g transform="translate(${x0} ${y0})">` +
    `<rect x="0" y="-0.22" width="${len}" height="0.44" rx="0.22" fill="#5F6B78"><animate attributeName="width" values="0;0;${len};${len}" keyTimes="0;0.5;0.58;1" dur="${ATK}" repeatCount="indefinite"/></rect>` +
    `<rect x="0" y="-0.08" width="${len}" height="0.16" fill="#9AA3AE"><animate attributeName="width" values="0;0;${len};${len}" keyTimes="0;0.5;0.58;1" dur="${ATK}" repeatCount="indefinite"/></rect>` +
    `<g>${reach}` +
    `<circle cx="0" cy="0" r="0.75" fill="#AEB7C2"/><circle cx="-0.15" cy="-0.15" r="0.35" fill="#E2E8F0"/>` +
    `<path d="M0.3 -0.5 L1.9 -1.4 L2.2 -0.8 L0.8 -0.1 Z" fill="#F3EEE0"/><path d="M0.3 0.5 L1.9 1.4 L2.2 0.8 L0.8 0.1 Z" fill="#F3EEE0"/><path d="M0.6 -0.25 L2.3 -0.1 L2.3 0.1 L0.6 0.25 Z" fill="#F3EEE0"/>` +
    '</g></g></g>' +
    impact(FIRE, HIT_X + 1, y0, 1.1, FIRE_L)
  )
}
