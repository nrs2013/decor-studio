import { describe, expect, it } from 'vitest'
import type { Shape } from '../model/types'
import { genStars, starCount, starsDensity, starsWhiteRatio } from './stars'
import { repeatCount } from '../dmx/address'

const field = (over: Partial<Shape> = {}): Shape =>
  ({
    id: 's1',
    type: 'stars',
    points: [
      { x: 100, y: 50 },
      { x: 400, y: 250 }
    ],
    display: 'fill',
    strokeWidth: 1,
    starDensity: 40,
    starWhiteRatio: 50,
    starSize: 3,
    starSeed: 1234,
    ...over
  }) as Shape

describe('starCount: the density dial', () => {
  it('more density = more stars (monotonic), 0 = empty sky', () => {
    expect(starCount(field({ starDensity: 0 }))).toBe(0)
    const a = starCount(field({ starDensity: 20 }))
    const b = starCount(field({ starDensity: 60 }))
    const c = starCount(field({ starDensity: 100 }))
    expect(a).toBeGreaterThan(0)
    expect(b).toBeGreaterThan(a)
    expect(c).toBeGreaterThan(b)
  })
  it('scales with area and clamps at the autoFill-style ceiling', () => {
    const small = starCount(field())
    const wide = starCount(
      field({
        points: [
          { x: 0, y: 0 },
          { x: 1920, y: 1080 }
        ]
      })
    )
    expect(wide).toBeGreaterThan(small)
    expect(
      starCount(
        field({
          starDensity: 100,
          points: [
            { x: 0, y: 0 },
            { x: 4000, y: 4000 }
          ]
        })
      )
    ).toBe(4000)
  })
})

describe('genStars: a locked, deterministic sky', () => {
  it('same seed → the identical sky; new seed → a different one', () => {
    const a = genStars(field())
    const b = genStars(field())
    expect(b).toEqual(a)
    const c = genStars(field({ starSeed: 99 }))
    expect(JSON.stringify(c)).not.toEqual(JSON.stringify(a))
  })
  it('every dot stays inside the field box', () => {
    const f = genStars(field())
    for (const d of [...f.white, ...f.blue]) {
      expect(d.x).toBeGreaterThanOrEqual(100)
      expect(d.x).toBeLessThanOrEqual(400)
      expect(d.y).toBeGreaterThanOrEqual(50)
      expect(d.y).toBeLessThanOrEqual(250)
    }
  })
  it('the white ratio dial really splits the populations', () => {
    const all = genStars(field({ starWhiteRatio: 100 }))
    expect(all.blue).toHaveLength(0)
    expect(all.white.length).toBeGreaterThan(0)
    const none = genStars(field({ starWhiteRatio: 0 }))
    expect(none.white).toHaveLength(0)
    const mix = genStars(field({ starWhiteRatio: 50 }))
    expect(mix.white.length).toBeGreaterThan(0)
    expect(mix.blue.length).toBeGreaterThan(0)
  })
  it('stretching the box keeps each star at its relative spot (fabric-like)', () => {
    const a = genStars(field())
    const b = genStars(
      field({
        points: [
          { x: 100, y: 50 },
          { x: 700, y: 250 }
        ]
      })
    )
    const fxA = (a.white[0] ?? a.blue[0]).x
    const fxB = (b.white[0] ?? b.blue[0]).x
    expect((fxB - 100) / 600).toBeCloseTo((fxA - 100) / 300, 5)
  })
})

describe('star field addressing: two faders run the sky', () => {
  it('repeatCount is exactly 2 (White / Blue)', () => {
    expect(repeatCount(field())).toBe(2)
  })
})

describe('dial clamps', () => {
  it('density and ratio clamp to 0–100', () => {
    expect(starsDensity({ starDensity: -10 } as Shape)).toBe(0)
    expect(starsDensity({ starDensity: 300 } as Shape)).toBe(100)
    expect(starsWhiteRatio({} as Shape)).toBe(50)
  })
})
