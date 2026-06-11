import type { Shape } from '../model/types'
import type { RGB } from './bulb'

export const STARS_DEFAULT_DENSITY = 40
export const STARS_DEFAULT_WHITE_RATIO = 50
export const STARS_DEFAULT_SIZE = 3
export const STARS_MAX_COUNT = 4000

/** Star curtain populations: WHITE is instance 0 (base address), BLUE is instance 1
 *  (base + offset). Two desk faders run the whole sky. */
export const STAR_WHITE: RGB = [255, 243, 222]
export const STAR_BLUE: RGB = [86, 138, 255]

export const starsDensity = (s: Pick<Shape, 'starDensity'>): number => {
  const d = s.starDensity ?? STARS_DEFAULT_DENSITY
  return d < 0 ? 0 : d > 100 ? 100 : d
}
export const starsWhiteRatio = (s: Pick<Shape, 'starWhiteRatio'>): number => {
  const r = s.starWhiteRatio ?? STARS_DEFAULT_WHITE_RATIO
  return r < 0 ? 0 : r > 100 ? 100 : r
}
export const starsSize = (s: Pick<Shape, 'starSize'>): number => {
  const z = s.starSize ?? STARS_DEFAULT_SIZE
  return z < 0.5 ? 0.5 : z > 30 ? 30 : z
}

/** Deterministic PRNG (mulberry32): the layout is locked by starSeed, so a saved
 *  chart opens with the exact same sky — stars never re-shuffle on their own. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface StarDot {
  x: number
  y: number
  /** dot radius in canvas px */
  r: number
  /** per-star brightness factor (some stars shine harder — like the real curtain) */
  tw: number
  /** twinkle phase 0..2π (used for the subtle live shimmer) */
  ph: number
}

export interface StarField {
  white: StarDot[]
  blue: StarDot[]
}

function starBox(shape: Pick<Shape, 'points'>): { x: number; y: number; w: number; h: number } {
  const a = shape.points[0] ?? { x: 0, y: 0 }
  const b = shape.points[shape.points.length - 1] ?? a
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return { x, y, w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }
}

/** How many stars a field holds. The dial maps onto THIS field's own ceiling
 *  (its area, capped at STARS_MAX_COUNT) with a gentle curve — so the slider's whole
 *  travel stays alive on any size: it never slams into the cap halfway and goes dead
 *  (「上げるとワサワサ・下げるとまばら」が全域で効く). */
export function starCount(shape: Pick<Shape, 'points' | 'starDensity'>): number {
  const b = starBox(shape)
  const d = starsDensity(shape)
  if (d <= 0 || b.w < 1 || b.h < 1) return 0
  const fieldMax = Math.min(STARS_MAX_COUNT, (b.w * b.h) / 120)
  const n = Math.round(fieldMax * Math.pow(d / 100, 1.5))
  return Math.min(STARS_MAX_COUNT, Math.max(1, n))
}

const fieldCache = new Map<string, StarField>()

/** The star sky itself — pure and cached. Same shape values → identical sky. */
export function genStars(
  shape: Pick<Shape, 'points' | 'starDensity' | 'starWhiteRatio' | 'starSize' | 'starSeed'>
): StarField {
  const b = starBox(shape)
  const seed = shape.starSeed ?? 1
  const ratio = starsWhiteRatio(shape) / 100
  const size = starsSize(shape)
  const count = starCount(shape)
  const key = `${b.x},${b.y},${b.w},${b.h}|${seed}|${ratio}|${size}|${count}`
  const hit = fieldCache.get(key)
  if (hit) return hit
  const rnd = mulberry32(seed)
  const white: StarDot[] = []
  const blue: StarDot[] = []
  for (let i = 0; i < count; i++) {
    const u = rnd()
    const dot: StarDot = {
      x: b.x + rnd() * b.w,
      y: b.y + rnd() * b.h,
      // most stars are small; a few heroes get the full size
      r: size * (0.3 + 0.7 * rnd() * rnd()),
      tw: 0.5 + 0.5 * rnd(),
      ph: rnd() * Math.PI * 2
    }
    ;(u < ratio ? white : blue).push(dot)
  }
  if (fieldCache.size > 100) fieldCache.clear()
  const out = { white, blue }
  fieldCache.set(key, out)
  return out
}

/** Editor schematic: the field's frame + cold dots (the lit render lives in
 *  Live / Syphon output, like the other parts). */
export function drawStarsSchematic(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  stroke: string,
  fill: string,
  boost = 1
): void {
  const b = starBox(shape)
  const f = genStars(shape)
  ctx.save()
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(1, boost) * 0.6
  ctx.setLineDash([4, 3])
  ctx.strokeRect(b.x, b.y, b.w, b.h)
  ctx.setLineDash([])
  ctx.fillStyle = fill
  for (const d of f.white) ctx.fillRect(d.x - d.r / 2, d.y - d.r / 2, d.r, d.r)
  ctx.fillStyle = stroke
  for (const d of f.blue) ctx.fillRect(d.x - d.r / 2, d.y - d.r / 2, d.r, d.r)
  ctx.restore()
}

const rgba = (c: RGB, a: number): string => {
  const al = a < 0 ? 0 : a > 1 ? 1 : a
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${al.toFixed(3)})`
}

/** One lit population (instance 0 = white sky, 1 = blue sky), additive-only.
 *  `rgb` is the resolved console value of that population's channel — its max
 *  component IS the fader level. A gentle per-star twinkle rides on `timeMs`
 *  (display only — never changes which stars exist or where). */
export function drawStarsLit(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  rgb: RGB,
  instance: number,
  timeMs?: number
): void {
  const I = Math.max(rgb[0], rgb[1], rgb[2]) / 255
  if (I <= 0.004) return
  const f = genStars(shape)
  const pop = instance === 0 ? f.white : f.blue
  if (!pop.length) return
  const base = instance === 0 ? STAR_WHITE : STAR_BLUE
  const t = (timeMs ?? 0) / 1000
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  for (const d of pop) {
    const twinkle = timeMs === undefined ? 1 : 0.82 + 0.18 * Math.sin(t * (1.1 + d.tw) + d.ph)
    const a = I * d.tw * twinkle
    // soft halo then hot core — two flat arcs beat per-star gradients on speed
    ctx.fillStyle = rgba(base, 0.18 * a)
    ctx.beginPath()
    ctx.arc(d.x, d.y, d.r * 2.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = rgba(base, a)
    ctx.beginPath()
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
    ctx.fill()
    if (a > 0.55) {
      ctx.fillStyle = rgba([255, 255, 255], (a - 0.55) * 1.1)
      ctx.beginPath()
      ctx.arc(d.x, d.y, d.r * 0.45, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}
