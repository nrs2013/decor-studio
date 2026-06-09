import type { ChannelMode, Shape } from '../model/types'
import { channelCount } from './channel-math'

export interface Addr {
  universe: number
  start: number
}

/** grandMA2-style DMX notation: `universe.address` (Art-Net universe, 0-based). */
export const formatDmx = (universe: number, address: number): string => `${universe}.${address}`

/** How many instances a shape expands to (1 if no repeat). */
export function repeatCount(shape: Pick<Shape, 'repeat'>): number {
  const c = shape.repeat?.count ?? 1
  return c > 1 ? c : 1
}

/** Address of repeat index i: base universe/start advanced by i*step, rolling over
 *  512 channels into the next universe (so huge arrays keep valid addresses). */
export function addressAt(
  universe: number,
  start: number,
  mode: ChannelMode,
  step: number | undefined,
  i: number
): Addr {
  const s = step && step > 0 ? step : channelCount(mode)
  const zeroBased = start - 1 + i * s // 0-based channel offset across universes
  return {
    universe: universe + Math.floor(zeroBased / 512),
    start: (((zeroBased % 512) + 512) % 512) + 1
  }
}
