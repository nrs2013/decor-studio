import type { Chart, Shape, Fixture, Point } from './types'
import { newId } from './chart-model'

/** The 1px cell a point lives in, as a map key. */
export const cellKey = (p: Point): string => `${Math.floor(p.x)},${Math.floor(p.y)}`

/**
 * Removes the given cells from every freehand stroke (the painted dot runs).
 * A stroke erased in the middle splits into separate runs; each extra run gets a
 * clone of the original fixture (same address — split halves keep lighting together,
 * like cutting a lit rope). A fully-erased stroke disappears with its fixture.
 * Other shape types (line/rect/...) are left alone — delete/redraw those instead.
 */
export function eraseCellsFromChart(
  chart: Chart,
  cells: Set<string>
): { chart: Chart; changed: boolean } {
  let changed = false
  const shapes: Shape[] = []
  const fixtures: Fixture[] = [...chart.fixtures]

  for (const sh of chart.shapes) {
    if (sh.type !== 'freehand' || sh.repeat) {
      shapes.push(sh)
      continue
    }
    const runs: Point[][] = []
    let cur: Point[] = []
    let hit = false
    for (const p of sh.points) {
      if (cells.has(cellKey(p))) {
        hit = true
        if (cur.length) {
          runs.push(cur)
          cur = []
        }
      } else {
        cur.push(p)
      }
    }
    if (cur.length) runs.push(cur)
    if (!hit) {
      shapes.push(sh)
      continue
    }
    changed = true
    const fx = chart.fixtures.find((f) => f.shapeId === sh.id)
    if (runs.length === 0) {
      // nothing left: drop the shape and its fixture
      const i = fixtures.findIndex((f) => f.shapeId === sh.id)
      if (i >= 0) fixtures.splice(i, 1)
      continue
    }
    runs.forEach((run, i) => {
      const pts = run.length === 1 ? [run[0], run[0]] : run // single dot stays renderable
      if (i === 0) {
        shapes.push({ ...sh, points: pts })
        return
      }
      const nid = newId('shape')
      let fid: string | undefined
      if (fx) {
        const nf: Fixture = { ...fx, id: newId('fx'), shapeId: nid }
        fixtures.push(nf)
        fid = nf.id
      }
      shapes.push({ ...sh, id: nid, points: pts, fixtureId: fid })
    })
  }

  return { chart: changed ? { ...chart, shapes, fixtures } : chart, changed }
}
