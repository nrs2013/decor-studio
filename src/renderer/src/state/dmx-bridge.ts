import { useEffect } from 'react'
import { useStore } from './store'

interface DmxPacket {
  universe: number
  sequence: number
  data: Uint8Array | number[]
}
interface DecorApi {
  onDmx?: (cb: (pkt: DmxPacket) => void) => void
}

/** Subscribes to Art-Net packets forwarded from the main process and feeds the store.
 *  No-op in a plain browser (window.api absent). */
export function useDmxBridge(): void {
  useEffect(() => {
    const api = (window as unknown as { api?: DecorApi }).api
    if (!api?.onDmx) return
    api.onDmx((pkt) => {
      const data = pkt.data instanceof Uint8Array ? pkt.data : Uint8Array.from(pkt.data)
      useStore.getState().setUniverseData(pkt.universe, data)
    })
  }, [])
}
