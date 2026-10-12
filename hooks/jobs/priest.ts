// 사제: 하양·금빛·하늘색의 엄숙한 성직자. 흰 두건 → 샌들 → 흰 장갑 → 금테 사제복(하늘색 영대) → 하늘빛 망토
// → 태양 홀 → 주교관 → 황금 제의와 금테 벽청 망토 → 왕관·후광·성광의 홀 → 무지개 후광. 공격은 하늘에서 몬스터 위로 내리꽂히는 빛기둥
// 흰 두건·옷·장갑은 밝은 바탕(흰 앱 화면, 흰 말풍선)에 묻히지 않게 바깥으로 회청색 윤곽을 두른다
import { ATK } from '../monsters.ts'
import {
  GOLD,
  GOLD_DARK,
  GOLD_LIGHT,
  WHITE,
  bigClawd,
  flutter,
  glow,
  halo,
  handSwing,
  pointingArm,
  rect,
  rightArm,
  smallClawd,
  sparkle,
  swap,
} from '../pixel.ts'
import type { BigVariant, Boot, Glove, Pose } from '../pixel.ts'
import type { Job } from './types.ts'

const SHADE = '#BCC8D8'
const LINE = '#A9B6C8'
const SKY = '#7DD3FC'
const SKY_DARK = '#38BDF8'
const SKY_LIGHT = '#E0F2FE'
const AZURE = '#0EA5E9'
const AZURE_DARK = '#0369A1'
const GOLD_LINE = '#8C6A14'
const SANDAL = '#A0703C'
const SANDAL_DARK = '#5A3A1C'
const RUBY = '#DC2626'
const FOOT = '#D97757'

// 사제복: 금테 흰옷 → 80부터 황금 제의(흰 테). [옷, 테, 그늘, 윤곽]
const robeColors = (t: number) => (t >= 8 ? [GOLD, WHITE, GOLD_DARK, GOLD_LINE] : [WHITE, GOLD, SHADE, LINE])
// 망토: 하늘빛 → 80부터 짙은 하늘색(벽청)에 금빛 단. [천, 그늘, 안감]
const capeColors = (t: number) => (t >= 8 ? [AZURE, AZURE_DARK, SKY] : [SKY, SKY_DARK, SKY_LIGHT])
// 영대: 하늘색 띠에 옅은 하늘색 빛줄기, 금빛 십자. [띠, 빛줄기]
const STOLE = [SKY_DARK, SKY] as const

// 샌들(20~): 맨발에 가죽 끈 (80부터 금빛 끈). 장갑(30~): 흰 장갑
const boot = (t: number): Boot | undefined =>
  t >= 2 ? { color: FOOT, stripe: t >= 8 ? GOLD : SANDAL, sole: t >= 8 ? GOLD_DARK : SANDAL_DARK } : undefined
const glove = (t: number): Glove | undefined => (t >= 3 ? { color: '#F8FAFC', shine: SKY_LIGHT } : undefined)

// 글자 그림으로 픽셀 찍기: 한 줄의 같은 글자는 한 칸짜리 막대로 합친다. '.'은 빈칸
const n = (v: number) => Math.round(v * 1000) / 1000
const pix = (x0: number, y0: number, s: number, rows: readonly string[], pal: Record<string, string>) =>
  rows
    .map((row, j) => {
      let out = ''
      for (let i = 0; i < row.length; ) {
        let k = i
        while (k < row.length && row[k] === row[i]) k++
        const c = pal[row[i]!]
        if (c) out += rect(n(x0 + i * s), n(y0 + j * s), n((k - i) * s), n(s), c)
        i = k
      }
      return out
    })
    .join('')

// 태양 (9 × 9칸): 금빛 원판, 하얗게 타는 가운데, 여덟 갈래 빛살
const SUN_ROWS = ['....R....', '.R..G..R.', '...GGG...', '..GYYYG..', 'RGGYWYGGR', '..GYYYG..', '...GGG...', '.R..G..R.', '....R....']
const sun = (cx: number, cy: number, s: number, ray = GOLD_LIGHT) =>
  pix(cx - 4.5 * s, cy - 4.5 * s, s, SUN_ROWS, { R: ray, G: GOLD, Y: GOLD_LIGHT, W: WHITE })
// 90부터 홀의 태양 뒤에서 숨 쉬듯 번지는 빛 (태양 모양 그대로 크게)
const sunGlow = (cx: number, cy: number, s: number) =>
  `<g opacity="0.4">${glow()}${pix(cx - 4.5 * s, cy - 4.5 * s, s, SUN_ROWS, { R: GOLD_LIGHT, G: GOLD_LIGHT, Y: GOLD_LIGHT, W: GOLD_LIGHT })}</g>`

// 주교관 (12 × 11칸): 위가 뾰족한 흰 모자에 금빛 십자 띠
const MITRE_ROWS = [
  '.....WW.....',
  '....WGGW....',
  '...SWGGWW...',
  '..SWWGGWWW..',
  '.SWWWGGWWWW.',
  '.SWGGGGGGWW.',
  'SWWWWGGWWWWW',
  'SWWWWGGWWWWW',
  'SWWWWGGWWWWW',
  'GGGGGGGGGGGG',
  'DDDDDDDDDDDD',
]
const mitre = (cx: number, top: number, s: number, t: number) =>
  pix(cx - 6 * s, top, s, MITRE_ROWS, { W: WHITE, S: SHADE, G: GOLD, D: GOLD_DARK }) +
  // 80부터 십자 가운데에 하늘빛 보석
  (t >= 8 ? rect(n(cx - s), n(top + 5 * s), n(2 * s), n(s), SKY_DARK) : '')

// ── 윤곽 ─────────────────────────────────────────────────────────
// 흰 장비 둘레를 바깥으로 o만큼 부풀린 회청색 판. 장비보다 먼저(뒤에) 그리면 몸·옷·장비가 안쪽을 덮어 테두리만 남는다.
// 작은 그림은 0.25칸, 큰 그림은 3px

// 부풀린 사각형들 ([x, y, 폭, 높이] 목록)
const edge = (parts: readonly (readonly number[])[], o: number) =>
  parts.map(([x, y, w, h]) => rect(n(x! - o), n(y! - o), n(w! + 2 * o), n(h! + 2 * o), LINE)).join('')

// 주교관 윤곽: 글자 그림의 줄마다 칠한 칸의 처음~끝을 한 막대로 부풀린다
const mitreEdge = (cx: number, top: number, s: number, o: number) =>
  edge(
    MITRE_ROWS.map((row, j) => {
      const a = row.length - row.replace(/^\.+/, '').length
      const b = row.replace(/\.+$/, '').length
      return [cx - 6 * s + a * s, top + j * s, (b - a) * s, s]
    }),
    o,
  )

// 두건 모양: 뾰족한 윗단 두 줄, 머리를 덮는 띠, 머리 양옆으로 내려오는 자락 (작은 그림 칸 / 큰 그림 px)
const SMALL_COWL = [[13.2, 1.3, 3.6, 0.5], [11.2, 1.7, 7.6, 0.7], [10.5, 2.2, 9, 1.4], [10.5, 3.4, 1, 3.2], [18.5, 3.4, 1, 3.2]] as const
const BIG_COWL = [[352, 10, 36, 8], [330, 16, 80, 8], [322, 22, 96, 16], [322, 36, 12, 36], [406, 36, 12, 36]] as const

// ── 작은 그림 ─────────────────────────────────────────────────────

// 망토(50~): 두건 아래로 길게 늘어져 뒤로 휘날린다. 80부터는 휘날리는 자락 끝에 금빛 단 (자락과 같이 오르내린다)
const smallCape = (t: number) => {
  if (t < 5) return ''
  const [c, d, l] = capeColors(t)
  return (
    rect(10, 3.6, 9.4, 6.6, c!) +
    rect(7.4, 4, 2.8, 5.8, c!, swap('height', 5.8, 4.6)) +
    rect(5.6, 4.6, 2, 4.2, c!, swap('height', 4.2, 3)) +
    rect(9.6, 4, 0.6, 5.6, l!, swap('height', 5.6, 4.4)) +
    rect(7.4, 4, 0.4, 4.4, d!, swap('height', 4.4, 3.2)) +
    (t >= 8 ? rect(7.4, 9.5, 2.8, 0.3, GOLD, swap('y', 9.5, 8.3)) + rect(5.6, 8.5, 2, 0.3, GOLD, swap('y', 8.5, 7.3)) : '')
  )
}

// 두건·주교관 윤곽 (등 뒤에 그려 몸과 두건이 안쪽을 덮는다. 망토보다 위)
const smallHeadEdge = (t: number) => (t < 1 ? '' : edge(SMALL_COWL, 0.25) + (t >= 7 ? mitreEdge(15, -2.2, 0.4, 0.25) : ''))

// 사제복(40~): 발목까지 오는 긴 옷, 금테, 양쪽으로 늘어진 하늘색 영대, 가슴의 작은 태양.
// 옷 양옆과 단에는 0.25칸 윤곽 (옷 폭은 두건 자락과 같게 맞춰 윤곽이 한 줄로 이어진다)
const smallRobe = (t: number) => {
  if (t < 4) return ''
  const [c, tr, sh, line] = robeColors(t)
  const [st, stl] = STOLE
  return (
    rect(10.25, 6, 9.5, 4.25, line!) +
    rect(10.5, 6, 9, 4, c!) +
    rect(10.5, 6, 0.4, 4, sh!) +
    rect(19.1, 6, 0.4, 4, sh!) +
    rect(12.2, 6, 5.6, 0.3, tr!) +
    rect(10.5, 9.65, 9, 0.35, tr!) +
    rect(12.6, 6, 1, 3.9, st) +
    rect(16.4, 6, 1, 3.9, st) +
    rect(12.6, 6, 0.3, 3.9, stl) +
    rect(16.4, 6, 0.3, 3.9, stl) +
    rect(12.6, 9.4, 1, 0.5, GOLD_LIGHT) +
    rect(16.4, 9.4, 1, 0.5, GOLD_LIGHT) +
    rect(14.5, 7.3, 1, 1, t >= 8 ? WHITE : GOLD) +
    rect(14.85, 6.8, 0.3, 2, t >= 8 ? WHITE : GOLD) +
    rect(14, 7.65, 2, 0.3, t >= 8 ? WHITE : GOLD)
  )
}

// 흰 장갑(30~) 윤곽: smallArm이 그리는 장갑(1.5 × 1.6칸) 둘레 0.25칸. 팔·장갑보다 먼저 그리고 같은 박자로 움직인다
const smallGloveEdge = (t: number, pose: Pose) => {
  if (!glove(t)) return ''
  // smallClawd의 팔 높이 (달릴 때 왼팔 5.5 ↔ 6.5, 오른팔 6.5 ↔ 5.5, 쉴 때 6)
  const [la, lb, ra, rb] = pose === 'run' ? ([5.5, 6.5, 6.5, 5.5] as const) : ([6, 6, 6, 6] as const)
  const box = (gx: number, a: number, b: number) =>
    rect(n(gx - 0.55), n(a - 0.55), 2, 2.1, LINE, swap('y', n(a - 0.55), n(b - 0.55)))
  return box(9, la, lb) + box(20.1, ra, rb)
}

// 머리: 흰 두건(10~) → 주교관(70~) → 금빛 두건 테(80~) → 주교관을 두른 왕관(90~)
const smallHead = (t: number) => {
  if (t < 1) return ''
  // 두건 안쪽 테: 하늘색 안감 (80부터 금빛)
  const rim = t >= 8 ? GOLD : SKY
  return (
    SMALL_COWL.map(([x, y, w, h]) => rect(x, y, w, h, WHITE)).join('') +
    rect(10.5, 2.2, 0.3, 4.4, SHADE) +
    rect(11.5, 3.35, 7, 0.3, rim) +
    rect(11.25, 3.35, 0.25, 3.25, rim) +
    rect(18.5, 3.35, 0.25, 3.25, rim) +
    (t >= 7 ? mitre(15, -2.2, 0.4, t) : '') +
    (t >= 9
      ? rect(12.4, 1.5, 5.2, 0.8, GOLD) +
        rect(12.4, 1, 0.6, 0.6, GOLD) +
        rect(14.7, 0.9, 0.6, 0.7, GOLD) +
        rect(17, 1, 0.6, 0.6, GOLD) +
        rect(13.3, 1.7, 0.5, 0.45, SKY_DARK) +
        rect(14.75, 1.7, 0.5, 0.45, RUBY) +
        rect(16.2, 1.7, 0.5, 0.45, SKY_DARK)
      : '')
  )
}

// 태양 홀(60~): 금빛 자루 위에 태양. 90부터 태양이 숨 쉬듯 빛난다.
// 싸우는 중(run)에는 빛기둥을 부르기 직전(ATK 0.44~0.6)에 홀 끝이 번쩍인다
const smallScepter = (t: number, pose: Pose) => {
  const cast =
    pose === 'run' && t < 10
      ? '<g opacity="0">' +
        `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.42;0.46;0.56;0.62;1" dur="${ATK}" repeatCount="indefinite"/>` +
        (t >= 6
          ? rect(20.5, -1.8, 0.4, 4, WHITE) + rect(18.5, 0, 4.4, 0.4, WHITE)
          : rect(20.7, 2.6, 0.4, 2.4, GOLD_LIGHT) + rect(19.7, 3.6, 2.4, 0.4, GOLD_LIGHT)) +
        '</g>'
      : ''
  if (t < 6) return cast
  return (
    '<g>' +
    handSwing +
    rect(20.45, 1.4, 0.5, 7.4, GOLD) +
    rect(20.75, 1.4, 0.2, 7.4, GOLD_DARK) +
    rect(20.25, 8.5, 0.9, 0.45, GOLD_DARK) +
    rect(20.25, 1.7, 0.9, 0.35, GOLD_DARK) +
    (t >= 9 ? sunGlow(20.7, 0.2, 0.4) : '') +
    sun(20.7, 0.2, 0.33, t >= 9 ? WHITE : GOLD_LIGHT) +
    cast +
    '</g>'
  )
}

// 레벨 90~: 머리 뒤의 둥근 후광(님부스)과 금빛 반짝이
const smallNimbus = (t: number) => (t < 9 ? '' : halo(15, 0.7, 4.8, 2.9, 0.35, t))
const smallSparkles = (t: number) =>
  t < 9
    ? ''
    : [[6.6, 1.4, '0s'], [8.6, -1.2, '0.8s']]
        .map(
          ([x, y, b]) =>
            '<g opacity="0">' +
            `<animate attributeName="opacity" values="0;1;0" dur="1.6s" begin="${b}" repeatCount="indefinite"/>` +
            rect((x as number) - 0.2, (y as number) - 0.7, 0.4, 1.4, GOLD) +
            rect((x as number) - 0.7, (y as number) - 0.2, 1.4, 0.4, GOLD) +
            '</g>',
        )
        .join('')

const small = (t: number, pose: Pose) =>
  smallClawd(pose, {
    back: smallNimbus(t) + smallCape(t) + smallHeadEdge(t),
    boot: boot(t),
    body: smallRobe(t),
    head: smallHead(t) + smallGloveEdge(t, pose),
    glove: glove(t),
    hand: smallScepter(t, pose),
    over: smallSparkles(t),
  })

// 하늘에서 금빛 빛기둥이 몬스터 위로 내리꽂힌다(0.52~0.6에 떨어져 0.6에 닿는다). 닿으면 넓게 번쩍이고 땅에 빛이 튄다.
// 레벨 100은 싸움이 끝나 효과가 없다
const hit = (t: number) => {
  if (t >= 10) return ''
  const cx = 27.5
  const w = t >= 9 ? 2.6 : t >= 6 ? 2.2 : 1.8
  const drop = `<animate attributeName="height" values="0;0;25;25" keyTimes="0;0.52;0.6;1" dur="${ATK}" repeatCount="indefinite"/>`
  const beam =
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.52;0.53;0.68;0.74;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<g opacity="0.5">${rect(cx - w / 2 - 0.7, -12, w + 1.4, 0, GOLD, drop)}</g>` +
    rect(cx - w / 2, -12, w, 0, GOLD, drop) +
    rect(cx - w / 2 + 0.4, -12, w - 0.8, 0, GOLD_LIGHT, drop) +
    rect(cx - 0.3, -12, 0.6, 0, WHITE, drop) +
    '</g>'
  const star = (x: number, y: number, c: string) => rect(x - 0.2, y - 0.8, 0.4, 1.6, c) + rect(x - 0.8, y - 0.2, 1.6, 0.4, c)
  const flash =
    '<g opacity="0">' +
    `<animate attributeName="opacity" values="0;0;1;0.8;0;0" keyTimes="0;0.6;0.61;0.67;0.74;1" dur="${ATK}" repeatCount="indefinite"/>` +
    `<g opacity="0.35">${rect(cx - w / 2 - 1.6, -12, w + 3.2, 25, GOLD)}</g>` +
    rect(cx - 4, 12.4, 8, 0.6, GOLD_LIGHT) +
    rect(cx - 2.8, 11.8, 5.6, 0.6, GOLD) +
    rect(cx - 4.6, 11.2, 0.6, 0.6, GOLD) +
    rect(cx + 4, 11.2, 0.6, 0.6, GOLD) +
    star(cx - 3.2, 4.2, t >= 9 ? WHITE : GOLD_LIGHT) +
    star(cx + 3.4, 6.6, GOLD) +
    '</g>'
  return beam + flash
}

// ── 큰 그림 ───────────────────────────────────────────────────────

// 펄럭이는 자락 끝을 따라가는 움직임 (flutter의 높이 대신 y를 같은 박자로)
const flutterY = (from: number, to: number) => flutter(from, to).replace('"height"', '"y"')

const bigCape = (t: number) => {
  if (t < 5) return ''
  const [c, d, l] = capeColors(t)
  return (
    rect(316, 40, 108, 70, c!) +
    rect(424, 46, 16, 58, c!, flutter(58, 42)) +
    rect(440, 54, 10, 42, c!, flutter(42, 28)) +
    rect(424, 46, 4, 54, d!, flutter(54, 38)) +
    rect(316, 40, 6, 66, l!) +
    // 80부터 금빛 단: 옷자락 아래와, 펄럭이는 자락 끝 (펄럭임과 같은 박자로 y가 오르내린다)
    (t >= 8
      ? rect(316, 105, 108, 5, GOLD) + rect(424, 100, 16, 4, GOLD, flutterY(100, 84)) + rect(440, 92, 10, 4, GOLD, flutterY(92, 78))
      : '')
  )
}

// 샌들의 발등 끈 (신발 줄무늬와 만나 T자가 된다). 옷자락은 y 102, 단 윤곽은 105에서 끝나 그 아래로 끈이 보인다
const bigStraps = (t: number) => {
  const b = boot(t)
  return b ? [330, 350, 380, 400].map(x => rect(x + 3, 102, 4, 6, b.stripe!)).join('') : ''
}

// 사제복: 두건 자락과 같은 폭(x 322~418)에 양옆·단 3px 윤곽 (단 윤곽은 샌들 끈 위로 지나간다)
const bigRobe = (t: number) => {
  if (t < 4) return bigStraps(t)
  const [c, tr, sh, line] = robeColors(t)
  const [st, stl] = STOLE
  return (
    bigStraps(t) +
    rect(319, 72, 102, 33, line!) +
    rect(322, 72, 96, 30, c!) +
    rect(322, 72, 6, 30, sh!) +
    rect(412, 72, 6, 30, sh!) +
    rect(338, 72, 64, 4, tr!) +
    rect(322, 98, 96, 4, tr!) +
    // 80부터는 황금 제의 가운데에 흰 앞판을 대고 태양 문장을 단다
    (t >= 8 ? rect(358, 76, 24, 22, WHITE) : '') +
    // 하늘색 영대(왼쪽에 옅은 빛줄기)와 금빛 십자 (십자 오른쪽·아래에 짙은 금빛 그늘)
    [342, 386]
      .map(
        x =>
          rect(x, 72, 12, 30, st) +
          rect(x, 72, 3, 30, stl) +
          rect(x + 5, 82, 4, 12, GOLD_DARK) +
          rect(x + 2, 85, 10, 4, GOLD_DARK) +
          rect(x + 4, 81, 4, 12, GOLD) +
          rect(x + 1, 84, 10, 4, GOLD) +
          rect(x, 98, 12, 4, GOLD_LIGHT),
      )
      .join('') +
    // 가슴의 태양 문장
    sun(370, 87, 2, t >= 8 ? SKY_DARK : GOLD_LIGHT)
  )
}

// 두건·주교관 윤곽 (등 뒤에 그려 몸과 두건이 안쪽을 덮는다. 망토보다 위)
const bigHeadEdge = (t: number) => (t < 1 ? '' : edge(BIG_COWL, 3) + (t >= 7 ? mitreEdge(370, -16, 4, 3) : ''))

const bigHead = (t: number) => {
  if (t < 1) return ''
  const rim = t >= 8 ? GOLD : SKY
  return (
    // 흰 두건: 살짝 뾰족한 윗단, 머리 양옆으로 내려오는 자락, 얼굴을 두르는 안감 테
    BIG_COWL.map(([x, y, w, h]) => rect(x, y, w, h, WHITE)).join('') +
    rect(322, 22, 4, 50, SHADE) +
    rect(334, 36, 72, 4, rim) +
    rect(331, 36, 3, 36, rim) +
    rect(406, 36, 3, 36, rim) +
    (t >= 7 ? mitre(370, -16, 4, t) : '') +
    (t >= 9
      ? rect(342, 18, 56, 10, GOLD) +
        rect(342, 12, 6, 6, GOLD) +
        rect(356, 13, 6, 5, GOLD) +
        rect(366, 8, 8, 10, GOLD) +
        rect(378, 13, 6, 5, GOLD) +
        rect(392, 12, 6, 6, GOLD) +
        rect(342, 26, 56, 2, GOLD_DARK) +
        rect(350, 20, 5, 5, SKY_DARK) +
        rect(367, 20, 6, 6, RUBY) +
        rect(385, 20, 5, 5, SKY_DARK)
      : '')
  )
}

// 오른손 흰 장갑 둘레 3px 윤곽 (rightArm의 장갑 자리: 든 손 x 409~433 y 27~47, 늘어뜨린 손 x 411~429 y 88~104).
// 팔보다 먼저 그려 팔·홀이 윤곽 위로 지나가고, 두건 위에 겹친 장갑이 두건과 갈라져 보인다
const bigHandEdge = (variant: BigVariant, t: number) =>
  !glove(t) ? '' : variant === 'error' ? rect(408, 85, 24, 22, LINE) : rect(406, 24, 30, 26, LINE)

// 오른팔과 태양 홀: 끝·대기는 높이 들고, 오류는 축 늘어뜨려 태양이 바닥 가까이 처진다
const bigArm = (variant: BigVariant, t: number) => {
  const g = glove(t)
  if (t < 6) return bigHandEdge(variant, t) + rightArm(variant, g)
  const ray = t >= 9 ? WHITE : GOLD_LIGHT
  if (variant === 'error') {
    return (
      bigHandEdge(variant, t) +
      rightArm(variant, g) +
      rect(417, 92, 6, 22, GOLD) +
      rect(421, 92, 2, 22, GOLD_DARK) +
      sun(420, 124, 3, ray) +
      (g ? rect(411, 88, 18, 16, g.color) : '')
    )
  }
  const hand = g ? rect(409, 27, 24, 20, g.color) + (g.shine ? rect(412, 29, 7, 5, g.shine) : '') : ''
  return (
    bigHandEdge(variant, t) +
    rightArm(variant, g) +
    rect(418, 2, 6, 62, GOLD) +
    rect(422, 2, 2, 62, GOLD_DARK) +
    rect(414, 4, 14, 4, GOLD_DARK) +
    (t >= 9 ? sunGlow(421, -10, 5.6) : '') +
    sun(421, -10, 4, ray) +
    hand
  )
}

// 가리키는 팔의 콕콕 찌르는 움직임 (pointingArm에서 그대로 꺼내 쓴다: 윤곽이 장갑과 한 몸처럼 움직인다)
const POINT_MOTION = pointingArm().match(/<animateTransform[^>]*\/>/)?.[0] ?? ''

// 가리키는 흰 장갑의 3px 윤곽: 흰 말풍선·밝은 바탕에 묻히지 않게 장갑(손가락 x 262~282, 손바닥 276~300 × 56~86,
// 엄지 286~294 × 53~61) 둘레에 테를 두른다. 손가락 끝은 그림 칸(x 262) 밖으로 나가지 않게 안쪽 3px를 덮고,
// 손목은 팔이 지나는 곳(y 66~76)을 비운다. 주름은 bigClawd의 crease로 같은 회청색을 쓴다
const bigPointEdge = (t: number) =>
  !glove(t)
    ? ''
    : '<g>' +
      POINT_MOTION +
      [
        [262, 61, 14, 3], // 손가락 위
        [262, 73, 14, 3], // 손가락 아래
        [262, 64, 3, 9], // 손가락 끝
        [273, 53, 3, 11], // 손바닥 왼쪽 (손가락 위)
        [273, 73, 3, 16], // 손바닥 왼쪽 (손가락 아래)
        [273, 53, 13, 3], // 손바닥 위 (엄지 왼쪽)
        [294, 53, 9, 3], // 손바닥 위 (엄지 오른쪽)
        [283, 50, 14, 3], // 엄지 위
        [283, 50, 3, 6], // 엄지 왼쪽
        [294, 50, 3, 6], // 엄지 오른쪽
        [300, 53, 3, 13], // 손목 (팔 위)
        [300, 76, 3, 13], // 손목 (팔 아래)
        [273, 86, 30, 3], // 손바닥 아래
      ]
        .map(([x, y, w, h]) => rect(x!, y!, w!, h!, LINE))
        .join('') +
      '</g>'

const bigNimbus = (t: number) => (t < 9 ? '' : halo(370, 18, 64, 38, 4, t))
const bigSparkles = (t: number) => (t < 9 ? '' : sparkle(306, 24, 12, GOLD, '0.3s') + sparkle(448, 30, 12, GOLD, '1.1s'))

const big = (variant: BigVariant, t: number) =>
  bigClawd(variant, {
    back: bigNimbus(t) + bigCape(t) + bigHeadEdge(t),
    boot: boot(t),
    body: bigRobe(t),
    head: bigHead(t),
    glove: glove(t),
    crease: LINE,
    arm: bigArm(variant, t),
    over: bigPointEdge(t) + bigSparkles(t),
  })

export const priest: Job = {
  key: 'priest',
  name: '사제',
  icon: '✨',
  gear: [
    '',
    '흰 두건',
    '샌들',
    '흰 장갑',
    '금테 사제복',
    '하늘빛 망토',
    '태양 홀',
    '주교관',
    '황금 제의와 금테 망토',
    '왕관·후광·성광의 홀',
    '무지개 후광',
  ],
  melee: false,
  small,
  hit,
  big,
  smallHeadroom: t => (t >= 9 ? 11 : t >= 6 ? 4 : 0),
  bigHeadroom: t => (t >= 9 ? 40 : t >= 6 ? 30 : 0),
}
