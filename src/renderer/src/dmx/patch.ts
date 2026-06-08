import type { Fixture } from '../model/types'
import { channelCount } from './channel-math'

export function channelRange(fx: Fixture): [number, number] {
  return [fx.start, fx.start + channelCount(fx.mode) - 1]
}

/** Returns pairs of fixture ids that partially overlap (a warning). Identical
 *  start+mode in the same universe is allowed (intentional 一斉点灯). */
export function detectOverlaps(fixtures: Fixture[]): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (let i = 0; i < fixtures.length; i++) {
    for (let j = i + 1; j < fixtures.length; j++) {
      const a = fixtures[i],
        b = fixtures[j]
      if (a.universe !== b.universe) continue
      const shared = a.start === b.start && a.mode === b.mode
      if (shared) continue
      const [as, ae] = channelRange(a),
        [bs, be] = channelRange(b)
      if (as <= be && bs <= ae) out.push([a.id, b.id])
    }
  }
  return out
}
