import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join, extname } from 'path'
import { readFileSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { ArtNetReceiver } from './artnet/artnet-receiver'
import type { ArtDmxPacket } from './artnet/artdmx-parser'
import { OutputPublisher } from './output/syphon-publisher'

// Engine: Art-Net in (UDP 6454) is forwarded to the renderer, which renders the chart and
// sends frames back to be published on the "DECOR STUDIO" Syphon source.
const receiver = new ArtNetReceiver()
const publisher = new OutputPublisher()
let mainWindow: BrowserWindow | null = null

function startEngine(): void {
  publisher.start('DECOR STUDIO')
  receiver.on('dmx', (pkt: ArtDmxPacket) => {
    mainWindow?.webContents.send('artnet:dmx', {
      universe: pkt.universe,
      sequence: pkt.sequence,
      data: pkt.data
    })
  })
  receiver.on('error', (err) => console.error('[artnet] receiver error:', err))
  receiver.start('0.0.0.0')
  console.log('[engine] Art-Net receiver (UDP 6454) + Syphon "DECOR STUDIO" started')
}

function stopEngine(): void {
  receiver.stop()
  publisher.stop()
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0a',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // DECOR_QUERY appends a startup query string, e.g. 'live' (start in Live mode) or
  // 'live&demo' (Live + a sample chart). Handy for output-only machines and testing.
  const q = process.env['DECOR_QUERY'] ?? ''
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] + (q ? '?' + q : ''))
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), q ? { search: q } : undefined)
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.decor.studio')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Underlay image picker: returns the chosen image as a data URL.
  ipcMain.handle('dialog:openImage', async () => {
    const res = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }]
    })
    if (res.canceled || res.filePaths.length === 0) return null
    const file = res.filePaths[0]
    const ext = extname(file).slice(1).toLowerCase()
    const mime = ext === 'jpg' ? 'jpeg' : ext
    return `data:image/${mime};base64,${readFileSync(file).toString('base64')}`
  })

  // Live frames from the renderer -> Syphon.
  ipcMain.on(
    'syphon:frame',
    (_e, payload: { width: number; height: number; buffer: Uint8Array | Uint8ClampedArray }) => {
      publisher.publishRGBA(payload.width, payload.height, payload.buffer)
    }
  )

  createWindow()
  startEngine()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  stopEngine()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
