import { useStore } from '../state/store'
import { C, F, buttonStyle } from '../ui/tokens'
import { channelRange, detectOverlaps } from '../dmx/patch'
import { formatDmx } from '../dmx/address'
import { resolveColor } from '../dmx/resolve'
import { buildMvr } from '../io/mvr-export'

interface MvrApi {
  saveMvr?: (name: string, data: Uint8Array) => Promise<string | null>
}

export function PatchTable(): React.JSX.Element {
  const chart = useStore((s) => s.chart)
  const dmxByUniverse = useStore((s) => s.dmxByUniverse)
  const manualMode = useStore((s) => s.manualMode)
  const manualByFixture = useStore((s) => s.manualByFixture)
  const selectedId = useStore((s) => s.selectedId)
  const select = useStore((s) => s.select)

  const overlaps = detectOverlaps(chart.fixtures)
  const flagged = new Set(overlaps.flat())

  const shapeName = (shapeId: string): string => {
    const sh = chart.shapes.find((s) => s.id === shapeId)
    return sh ? `${sh.type} ${sh.id.slice(-4)}` : shapeId.slice(-4)
  }

  const exportCsv = (): void => {
    const header = ['shape', 'type', 'universe', 'start', 'end', 'mode']
    const rows = chart.fixtures.map((f) => {
      const [, e] = channelRange(f)
      return [shapeName(f.shapeId), f.mode, String(f.universe), String(f.start), String(e), f.mode]
    })
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${chart.name || 'chart'}-patch.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportMvr = async (): Promise<void> => {
    const data = await buildMvr(chart)
    const api = (window as unknown as { api?: MvrApi }).api
    if (api?.saveMvr) {
      await api.saveMvr(chart.name || 'decor', data)
      return
    }
    const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${chart.name || 'decor'}.mvr`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={wrapStyle}>
      <div style={headerRow}>
        <div style={{ fontFamily: F.display, fontSize: 15, letterSpacing: '0.1em', color: C.white }}>
          Patch <span style={{ color: C.hint, fontSize: 12 }}>({chart.fixtures.length})</span>
        </div>
        {overlaps.length > 0 && (
          <div style={{ color: '#e0726a', fontSize: 11, fontFamily: F.ui }}>
            ⚠ {overlaps.length} DMX clash
          </div>
        )}
        <div style={{ flex: 1 }} />
        <button
          style={{ ...buttonStyle({}), padding: '5px 12px' }}
          onClick={exportMvr}
          title="grandMA3 用の MVR（パッチ＋配置＋DECOR Cell の GDTF 同梱）を書き出す"
        >
          Export MVR
        </button>
        <button style={{ ...buttonStyle({}), padding: '5px 12px' }} onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <div style={{ overflow: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: F.mono, fontSize: 11 }}>
          <thead>
            <tr style={{ color: C.label, textAlign: 'left' }}>
              {['Fixture', 'DMX', 'Type', 'Range', 'Value'].map((h) => (
                <th key={h} style={thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.fixtures.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, color: C.faint, fontFamily: F.ui }}>
                  No fixtures patched yet — select a fixture and patch it in the Inspector.
                </td>
              </tr>
            )}
            {chart.fixtures.map((f) => {
              const [s, e] = channelRange(f)
              const cnt = chart.shapes.find((x) => x.id === f.shapeId)?.repeat?.count ?? 1
              const isFlagged = flagged.has(f.id)
              const isSel = f.shapeId === selectedId
              const [r, g, b] = resolveColor(
                f,
                dmxByUniverse,
                chart.settings.gamma,
                manualMode ? manualByFixture : null
              )
              return (
                <tr
                  key={f.id}
                  onClick={() => select(f.shapeId)}
                  style={{
                    cursor: 'pointer',
                    background: isFlagged
                      ? 'rgba(224,114,106,0.14)'
                      : isSel
                        ? 'rgba(123,197,232,0.12)'
                        : 'transparent',
                    color: C.text
                  }}
                >
                  <td style={tdStyle}>
                    {shapeName(f.shapeId)}
                    {cnt > 1 ? ` ×${cnt}` : ''}
                  </td>
                  <td style={tdStyle}>{formatDmx(f.universe, f.start)}</td>
                  <td style={tdStyle}>{f.mode}</td>
                  <td style={{ ...tdStyle, color: isFlagged ? '#e0726a' : C.text }}>
                    {s}–{e}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 14,
                        height: 14,
                        borderRadius: 2,
                        background: `rgb(${r},${g},${b})`,
                        border: `0.5px solid ${C.border}`,
                        verticalAlign: 'middle'
                      }}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const wrapStyle: React.CSSProperties = {
  height: 190,
  flexShrink: 0,
  background: C.panel,
  borderTop: `0.5px solid ${C.border}`,
  padding: '10px 14px',
  display: 'flex',
  flexDirection: 'column'
}
const headerRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 8
}
const thStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderBottom: `0.5px solid ${C.border}`,
  fontWeight: 400,
  position: 'sticky',
  top: 0,
  background: C.panel
}
const tdStyle: React.CSSProperties = {
  padding: '5px 10px',
  borderBottom: `0.5px solid ${C.borderFaint}`
}
