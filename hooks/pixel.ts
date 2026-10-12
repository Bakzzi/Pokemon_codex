// 그림들이 같이 쓰는 조각: 색, 글꼴, 칸 그리기, 움직임 박자, 자세 이름

export const INK = '#1F1410'
export const WHITE = '#FFFFFF'
export const GOLD = '#E8B931'
export const FONT = "'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif"

export const rect = (x: number, y: number, w: number, h: number, fill: string, inner = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"` + (inner ? `>${inner}</rect>` : '/>')

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const STEP = '0.36s' // 달릴 때 한 번 들썩이는 시간
export const STAND_STEP = '1.4s' // 쉬는 동안의 숨쉬기

// 작은 그림의 자세 (run: 전투 중, stand: 쉬는 중)와 큰 알림의 종류
export type Pose = 'run' | 'stand'
export type BigVariant = 'done' | 'waiting' | 'error'
