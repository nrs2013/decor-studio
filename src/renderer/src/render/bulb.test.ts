import { describe, it, expect } from 'vitest'
import { bulbHueIntensity, bulbHaloRadius, BULB_DEFAULT_DIAMETER } from './bulb'

describe('bulbHueIntensity (console RGB -> hue + gauge)', () => {
  it('half-power red: hue saturates to full red, gauge = 0.5', () => {
    const { hue, intensity } = bulbHueIntensity([128, 0, 0])
    expect(hue[0]).toBeCloseTo(255)
    expect(hue[1]).toBe(0)
    expect(hue[2]).toBe(0)
    expect(intensity).toBeCloseTo(128 / 255)
  })

  it('blackout -> zero intensity (bulb stays invisible on the output)', () => {
    expect(bulbHueIntensity([0, 0, 0]).intensity).toBe(0)
  })

  it('full white -> full gauge, white hue', () => {
    const { hue, intensity } = bulbHueIntensity([255, 255, 255])
    expect(intensity).toBe(1)
    expect(hue).toEqual([255, 255, 255])
  })

  it('mixed colour keeps its ratio when scaled to full saturation', () => {
    const { hue, intensity } = bulbHueIntensity([60, 110, 220])
    expect(intensity).toBeCloseTo(220 / 255)
    expect(hue[2]).toBeCloseTo(255)
    expect(hue[0] / hue[2]).toBeCloseTo(60 / 220)
    expect(hue[1] / hue[2]).toBeCloseTo(110 / 220)
  })
})

describe('bulbHaloRadius (ジュワッ curve)', () => {
  it('grows monotonically with the gauge', () => {
    const r = BULB_DEFAULT_DIAMETER / 2
    const lo = bulbHaloRadius(r, 0.2)
    const mid = bulbHaloRadius(r, 0.6)
    const hi = bulbHaloRadius(r, 1)
    expect(lo).toBeLessThan(mid)
    expect(mid).toBeLessThan(hi)
    expect(hi).toBeGreaterThan(r * 5) // full power blooms well past the glass
  })
})
