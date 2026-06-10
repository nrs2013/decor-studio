import { describe, it, expect } from 'vitest'
import { cleanPaintStroke, snapCleanRatio, regenChain } from './stroke-fit'
import type { Point } from '../model/types'

const center = (x: number, y: number): Point => ({ x: x + 0.5, y: y + 0.5 })

describe('cleanPaintStroke (なぞり×自動清書)', () => {
  it('a wobbly near-horizontal trail becomes a perfect straight bar', () => {
    const pts: Point[] = []
    for (let x = 0; x <= 30; x++) pts.push(center(x, 10 + (x % 5 === 0 ? 1 : 0))) // 震え
    const r = cleanPaintStroke(pts)
    expect(r.kind).toBe('straight')
    expect(r.points.every((p) => p.y === r.points[0].y)).toBe(true) // 完全水平
    expect(r.verts).toEqual([0, r.points.length - 1])
  })

  it('an L-shaped trail becomes a 3-corner chain', () => {
    const pts: Point[] = []
    for (let x = 0; x <= 20; x++) pts.push(center(x, 0))
    for (let y = 1; y <= 15; y++) pts.push(center(20, y))
    const r = cleanPaintStroke(pts)
    expect(r.kind).toBe('chain')
    expect(r.verts).toHaveLength(3)
    expect(r.points[r.verts![1]]).toEqual(center(20, 0)) // 角の位置
  })

  it('a busy squiggle stays raw (intentional curves are respected)', () => {
    const pts: Point[] = []
    for (let i = 0; i < 80; i++) pts.push(center(i, Math.round(8 * Math.sin(i / 3))))
    const r = cleanPaintStroke(pts)
    expect(r.kind).toBe('raw')
    expect(r.points).toBe(pts)
  })

  it('tiny strokes (single dots) are left untouched', () => {
    const pts = [center(5, 5), center(5, 5)]
    expect(cleanPaintStroke(pts).kind).toBe('raw')
  })
})

describe('snapCleanRatio', () => {
  it('nearly-horizontal snaps to horizontal', () => {
    expect(snapCleanRatio({ x: 0, y: 0 }, { x: 30, y: 1 }, 2)).toEqual({ x: 30, y: 0 })
  })
  it('near-2:1 snaps to exact 2:1 stairs', () => {
    const p = snapCleanRatio({ x: 0, y: 0 }, { x: 20, y: 11 }, 2)
    expect(p.x / p.y).toBeCloseTo(2, 5)
  })
  it('clearly odd angles are left alone', () => {
    expect(snapCleanRatio({ x: 0, y: 0 }, { x: 20, y: 7 }, 2)).toEqual({ x: 20, y: 7 })
  })
})

describe('regenChain', () => {
  it('builds contiguous dots through corners with correct vert indices', () => {
    const { points, verts } = regenChain([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 3 }
    ])
    expect(points).toHaveLength(8) // 1 + 4 + 3
    expect(verts).toEqual([0, 4, 7])
    expect(points[4]).toEqual(center(4, 0))
    expect(points[7]).toEqual(center(4, 3))
  })
})
