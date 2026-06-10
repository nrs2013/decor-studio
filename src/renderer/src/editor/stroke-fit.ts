import type { Point } from '../model/types'
import { cellsBetween } from './geometry'

// なぞり×自動清書: a painted trail is fitted on release — near-straight strokes become
// perfect dot bars, strokes with a few corners become straight-segment chains (with
// grabbable corners), busy squiggles stay raw. Z undoes the cleanup (then the stroke).

const cellOf = (p: Point): Point => ({ x: Math.floor(p.x), y: Math.floor(p.y) })

function perpDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len
}

/** Ramer–Douglas–Peucker: reduce a trail to its corner points (tolerance in cells). */
export function rdpSimplify(pts: Point[], eps: number): Point[] {
  if (pts.length < 3) return pts.slice()
  let maxD = 0
  let idx = 0
  const a = pts[0]
  const b = pts[pts.length - 1]
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], a, b)
    if (d > maxD) {
      maxD = d
      idx = i
    }
  }
  if (maxD <= eps) return [a, b]
  const left = rdpSimplify(pts.slice(0, idx + 1), eps)
  const right = rdpSimplify(pts.slice(idx), eps)
  return [...left.slice(0, -1), ...right]
}

/** Directions that render as perfectly even 1px staircases (H, V, 1:1, 2:1, 3:1, 4:1). */
const RATIOS: Point[] = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 1, y: 2 },
  { x: 3, y: 1 },
  { x: 1, y: 3 },
  { x: 4, y: 1 },
  { x: 1, y: 4 }
]

/** Snaps segment a→b onto the nearest clean stair angle — only when the endpoint
 *  barely moves (within `tolCells`, or 6% of the length for long bars). */
export function snapCleanRatio(a: Point, b: Point, tolCells: number): Point {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len < 3) return b
  let best: Point | null = null
  let bd = Infinity
  for (const r of RATIOS) {
    for (const sx of [1, -1]) {
      for (const sy of [1, -1]) {
        const rl = Math.hypot(r.x, r.y)
        const ux = (sx * r.x) / rl
        const uy = (sy * r.y) / rl
        const t = dx * ux + dy * uy
        if (t <= 0) continue
        const px = a.x + Math.round(ux * t)
        const py = a.y + Math.round(uy * t)
        const d = Math.hypot(px - b.x, py - b.y)
        if (d < bd) {
          bd = d
          best = { x: px, y: py }
        }
      }
    }
  }
  const tol = Math.max(tolCells, len * 0.06)
  return best && bd <= tol ? best : b
}

/** Rebuilds a dot chain through the given corner cells. Returns cell-center points
 *  plus the indices of the corners (for grabbable handles). */
export function regenChain(vertCells: Point[]): { points: Point[]; verts: number[] } {
  const points: Point[] = []
  const verts: number[] = []
  for (let i = 0; i < vertCells.length; i++) {
    if (i === 0) {
      points.push({ x: vertCells[0].x + 0.5, y: vertCells[0].y + 0.5 })
      verts.push(0)
      continue
    }
    for (const c of cellsBetween(vertCells[i - 1], vertCells[i])) {
      points.push({ x: c.x + 0.5, y: c.y + 0.5 })
    }
    verts.push(points.length - 1)
  }
  return { points, verts }
}

export interface CleanResult {
  kind: 'straight' | 'chain' | 'raw'
  points: Point[]
  verts?: number[]
}

/** The cleanup decision: straight bar / corner chain / leave raw. */
export function cleanPaintStroke(
  centers: Point[],
  opts?: { eps?: number; maxVerts?: number; ratioTol?: number }
): CleanResult {
  const eps = opts?.eps ?? 2.4
  const maxVerts = opts?.maxVerts ?? 8
  const ratioTol = opts?.ratioTol ?? 2
  if (centers.length < 6) return { kind: 'raw', points: centers }
  const cells = centers.map(cellOf)
  const simp = rdpSimplify(cells, eps)
  if (simp.length === 2) {
    const end = snapCleanRatio(simp[0], simp[1], ratioTol)
    const { points, verts } = regenChain([simp[0], end])
    return { kind: 'straight', points, verts }
  }
  if (simp.length <= maxVerts) {
    const snapped: Point[] = [simp[0]]
    for (let i = 1; i < simp.length; i++) {
      snapped.push(snapCleanRatio(snapped[i - 1], simp[i], ratioTol))
    }
    const { points, verts } = regenChain(snapped)
    return { kind: 'chain', points, verts }
  }
  return { kind: 'raw', points: centers }
}
