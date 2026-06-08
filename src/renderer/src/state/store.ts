import { create } from 'zustand'
import type { Chart, Shape } from '../model/types'
import { createChart } from '../model/chart-model'

export type Mode = 'edit' | 'live'
export type Tool =
  | 'select'
  | 'line'
  | 'polyline'
  | 'freehand'
  | 'ellipse'
  | 'rect'
  | 'triangle'
  | 'star'
  | 'polygon'

interface AppState {
  chart: Chart
  mode: Mode
  tool: Tool
  selectedId: string | null
  dmxByUniverse: Record<number, Uint8Array>
  setChart: (c: Chart) => void
  setMode: (m: Mode) => void
  setTool: (t: Tool) => void
  select: (id: string | null) => void
  updateShape: (id: string, patch: Partial<Shape>) => void
  setUniverseData: (universe: number, data: Uint8Array) => void
}

export const useStore = create<AppState>()((set) => ({
  chart: createChart({ w: 1920, h: 1080 }),
  mode: 'edit',
  tool: 'select',
  selectedId: null,
  dmxByUniverse: {},
  setChart: (chart) => set({ chart }),
  setMode: (mode) => set({ mode }),
  setTool: (tool) => set({ tool }),
  select: (selectedId) => set({ selectedId }),
  updateShape: (id, patch) =>
    set((s) => ({
      chart: {
        ...s.chart,
        shapes: s.chart.shapes.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh))
      }
    })),
  setUniverseData: (universe, data) =>
    set((s) => ({ dmxByUniverse: { ...s.dmxByUniverse, [universe]: data } }))
}))
