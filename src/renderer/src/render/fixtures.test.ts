import { describe, expect, it } from 'vitest'
import type { Shape } from '../model/types'
import {
  blinderCells,
  blinderLensR,
  blinderRingR,
  pixelPattCells,
  pixelPattCellDiameter,
  pixelPattFrameRadius,
  blinderWidth,
  parDiameter,
  pattDiameter,
  reflectGain,
  PAR_DEFAULT_DIAMETER,
  BLINDER_DEFAULT_WIDTH,
  PATT_DEFAULT_DIAMETER
} from './fixtures'
import { repeatCount } from '../dmx/address'

const blinder = (over: Partial<Shape> = {}): Shape =>
  ({
    id: 'bl1',
    type: 'blinder',
    points: [{ x: 100, y: 200 }],
    display: 'fill',
    strokeWidth: 1,
    diameter: 40,
    ...over
  }) as Shape

describe('blinderCells: the 2×4 unit', () => {
  it('always 8 cells, row-major from the top-left', () => {
    const cells = blinderCells(blinder())
    expect(cells).toHaveLength(8)
    expect(cells[0].x).toBeLessThan(cells[1].x)
    expect(cells[0].y).toBeCloseTo(cells[1].y)
    expect(cells[0].y).toBeLessThan(cells[2].y)
  })
  it('every cell sits inside the housing (w × 2w, centred on the anchor)', () => {
    const cells = blinderCells(blinder())
    for (const c of cells) {
      expect(c.x).toBeGreaterThan(100 - 20)
      expect(c.x).toBeLessThan(100 + 20)
      expect(c.y).toBeGreaterThan(200 - 40)
      expect(c.y).toBeLessThan(200 + 40)
    }
  })
  it('scales with the width dial', () => {
    const small = blinderCells(blinder({ diameter: 20 }))
    const big = blinderCells(blinder({ diameter: 80 }))
    expect(big[0].x).toBeLessThan(small[0].x)
    expect(big[7].y).toBeGreaterThan(small[7].y)
  })
})

describe('stage fixture addressing & defaults', () => {
  it('a blinder is its own 8-instance array', () => {
    expect(repeatCount(blinder())).toBe(8)
  })
  it('PAR and PAT stay single instances', () => {
    expect(repeatCount({ type: 'parlight', points: [{ x: 0, y: 0 }] } as Shape)).toBe(1)
    expect(repeatCount({ type: 'patt', points: [{ x: 0, y: 0 }] } as Shape)).toBe(1)
  })
  it('size getters fall back to the agreed defaults', () => {
    expect(parDiameter({} as Shape)).toBe(PAR_DEFAULT_DIAMETER)
    expect(blinderWidth({} as Shape)).toBe(BLINDER_DEFAULT_WIDTH)
    expect(pattDiameter({} as Shape)).toBe(PATT_DEFAULT_DIAMETER)
  })
})

describe('blinder lens & the glare rule (のむさん確定 2026-06-11)', () => {
  it('lens aperture = 55% of the pitch and the chrome rings never overlap', () => {
    const b = blinder()
    const pitch = blinderWidth(b) / 2
    expect(blinderLensR(b) * 2).toBeCloseTo(pitch * 0.55)
    expect(blinderRingR(b) * 2).toBeLessThan(pitch)
  })
  it('reflectGain: structure peaks mid-gauge, glare swallows it at full', () => {
    expect(reflectGain(0)).toBe(0)
    expect(reflectGain(0.6)).toBeCloseTo(1)
    expect(reflectGain(1)).toBeLessThan(0.2)
    expect(reflectGain(0.6)).toBeGreaterThan(reflectGain(1))
  })
})

describe('pixelPattCells: the 7-cell hex unit', () => {
  const pp = (over: Partial<Shape> = {}): Shape =>
    ({
      id: 'pp1',
      type: 'pixelpatt',
      points: [{ x: 300, y: 300 }],
      display: 'fill',
      strokeWidth: 1,
      diameter: 90,
      ...over
    }) as Shape
  it('centre first, then the ring from the top clockwise — 7 cells', () => {
    const cells = pixelPattCells(pp())
    expect(cells).toHaveLength(7)
    expect(cells[0]).toEqual({ x: 300, y: 300 })
    expect(cells[1].x).toBeCloseTo(300)
    expect(cells[1].y).toBeCloseTo(270)
  })
  it('ring cells sit at equal distance from the centre', () => {
    const cells = pixelPattCells(pp())
    for (let i = 1; i < 7; i++) {
      expect(Math.hypot(cells[i].x - 300, cells[i].y - 300)).toBeCloseTo(30)
    }
  })
  it('is its own 7-instance array', () => {
    expect(repeatCount(pp())).toBe(7)
  })
  it('aperture = 55% of the cell spacing (のむさん fixed on the v10 mock, 2026-06-11)', () => {
    // D=90 → spacing 30 → aperture 16.5: the skeleton must show between the bezels
    expect(pixelPattCellDiameter(pp())).toBeCloseTo(16.5)
  })
  it('hex band vertices sit AT the cells, between the ring and the unit edge', () => {
    const r = pixelPattFrameRadius(pp())
    expect(r).toBeGreaterThan(30) // outside the cell centres
    expect(r).toBeLessThan(45) // inside the unit half-width
  })
})
