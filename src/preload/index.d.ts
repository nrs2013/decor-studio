import { ElectronAPI } from '@electron-toolkit/preload'

export interface DecorApi {
  /** Opens a native file dialog and returns the chosen image as a data URL (or null). */
  openImage: () => Promise<string | null>
  /** Subscribe to Art-Net DMX packets forwarded from the main process. */
  onDmx: (cb: (pkt: { universe: number; sequence: number; data: Uint8Array }) => void) => void
  /** Publish an RGBA frame to the Syphon server. */
  publishFrame: (width: number, height: number, buffer: Uint8ClampedArray) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: DecorApi
  }
}
