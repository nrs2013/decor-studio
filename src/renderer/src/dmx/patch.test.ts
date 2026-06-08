import { describe, it, expect } from 'vitest'
import { channelRange, detectOverlaps } from './patch'
import type { Fixture } from '../model/types'

const fx = (id: string, universe: number, start: number, mode: Fixture['mode']): Fixture => ({
  id,
  shapeId: id,
  universe,
  start,
  mode
})

describe('channelRange', () => {
  it('returns inclusive [start, end] from mode width', () => {
    expect(channelRange(fx('a', 0, 1, 'rgb'))).toEqual([1, 3])
    expect(channelRange(fx('a', 0, 10, 'rgbdim'))).toEqual([10, 13])
  })
})

describe('detectOverlaps', () => {
  it('allows identical start+mode in the same universe (intentional shared)', () => {
    const a = fx('a', 0, 1, 'rgb'),
      b = fx('b', 0, 1, 'rgb')
    expect(detectOverlaps([a, b])).toEqual([])
  })
  it('warns on partial overlap (different start, ranges intersect)', () => {
    const a = fx('a', 0, 1, 'rgb'),
      b = fx('b', 0, 2, 'rgb') // [1..3] vs [2..4]
    expect(detectOverlaps([a, b])).toEqual([['a', 'b']])
  })
  it('does not warn across different universes', () => {
    const a = fx('a', 0, 1, 'rgb'),
      b = fx('b', 1, 1, 'rgb')
    expect(detectOverlaps([a, b])).toEqual([])
  })
})
