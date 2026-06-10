import { describe, it, expect } from 'vitest'
import { eraseCellsFromChart } from './erase'
import { createChart } from './chart-model'
import type { Chart, Shape, Fixture } from './types'

const cc = (x: number, y: number): { x: number; y: number } => ({ x: x + 0.5, y: y + 0.5 })

function paintedChart(): Chart {
  const c = createChart({ w: 100, h: 100 })
  const sh: Shape = {
    id: 'sh1',
    type: 'freehand',
    points: [cc(10, 5), cc(11, 5), cc(12, 5), cc(13, 5), cc(14, 5)],
    display: 'stroke',
    strokeWidth: 1,
    fixtureId: 'fx1'
  }
  const fx: Fixture = { id: 'fx1', shapeId: 'sh1', universe: 0, start: 1, mode: 'rgb' }
  return { ...c, shapes: [sh], fixtures: [fx] }
}

describe('eraseCellsFromChart', () => {
  it('erases end dots (trim)', () => {
    const r = eraseCellsFromChart(paintedChart(), new Set(['14,5']))
    expect(r.changed).toBe(true)
    expect(r.chart.shapes).toHaveLength(1)
    expect(r.chart.shapes[0].points).toHaveLength(4)
  })

  it('erasing the middle splits into two runs, fixture cloned with same address', () => {
    const r = eraseCellsFromChart(paintedChart(), new Set(['12,5']))
    expect(r.chart.shapes).toHaveLength(2)
    const [a, b] = r.chart.shapes
    expect(a.id).toBe('sh1') // first remnant keeps identity
    expect(a.points.map((p) => p.x)).toEqual([10.5, 11.5])
    expect(b.points.map((p) => p.x)).toEqual([13.5, 14.5])
    expect(r.chart.fixtures).toHaveLength(2)
    const fb = r.chart.fixtures.find((f) => f.shapeId === b.id)!
    expect(fb.universe).toBe(0)
    expect(fb.start).toBe(1) // split halves keep lighting together
    expect(b.fixtureId).toBe(fb.id)
  })

  it('erasing everything removes shape and fixture', () => {
    const r = eraseCellsFromChart(
      paintedChart(),
      new Set(['10,5', '11,5', '12,5', '13,5', '14,5'])
    )
    expect(r.chart.shapes).toHaveLength(0)
    expect(r.chart.fixtures).toHaveLength(0)
  })

  it('splitting a cleaned chain remaps corner verts (remnants stay editable)', () => {
    const c = createChart({ w: 100, h: 100 })
    // L字チェーン: (0,0)→(4,0)→(4,3)  verts=[0,4,7]
    const pts = [
      cc(0, 0), cc(1, 0), cc(2, 0), cc(3, 0), cc(4, 0),
      cc(4, 1), cc(4, 2), cc(4, 3)
    ]
    const sh: Shape = {
      id: 'ch1', type: 'freehand', points: pts, display: 'stroke', strokeWidth: 1,
      verts: [0, 4, 7]
    }
    const r = eraseCellsFromChart({ ...c, shapes: [sh], fixtures: [] }, new Set(['2,0']))
    expect(r.chart.shapes).toHaveLength(2)
    const [a, b] = r.chart.shapes
    expect(a.verts).toEqual([0, 1]) // (0,0)-(1,0): 両端のみ
    expect(b.verts).toEqual([0, 1, 4]) // (3,0)-(4,0)-(4,3): 角(4,0)が生き残る
    expect(b.points[b.verts![1]]).toEqual(cc(4, 0))
  })

  it('leaves non-freehand shapes and missed strokes untouched', () => {
    const c = paintedChart()
    const line: Shape = {
      id: 'ln',
      type: 'line',
      points: [
        { x: 10, y: 5 },
        { x: 50, y: 5 }
      ],
      display: 'stroke',
      strokeWidth: 1
    }
    const r = eraseCellsFromChart({ ...c, shapes: [...c.shapes, line] }, new Set(['30,5']))
    expect(r.changed).toBe(false)
    expect(r.chart.shapes).toHaveLength(2)
  })
})
