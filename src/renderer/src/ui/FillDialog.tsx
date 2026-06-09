import { useMemo, useState } from 'react'
import { useStore } from '../state/store'
import type { ChannelMode } from '../model/types'
import { channelCount } from '../dmx/channel-math'
import { addressAt } from '../dmx/address'
import { C, F, buttonStyle, inputStyle, fieldLabel } from '../ui/tokens'

const CAP = 4000
const MODES: { id: ChannelMode; label: string }[] = [
  { id: 'rgb', label: 'RGB (3ch)' },
  { id: 'rgbdim', label: 'RGB+Dim (4ch)' },
  { id: 'dim', label: 'Dim (1ch)' },
  { id: 'rgbw', label: 'RGBW (5ch)' }
]

export function FillDialog({ onClose }: { onClose: () => void }): React.JSX.Element {
  const mask = useStore((s) => s.mask)
  const autoFill = useStore((s) => s.autoFill)

  const [pitchX, setPitchX] = useState(20)
  const [pitchY, setPitchY] = useState(20)
  const [cellW, setCellW] = useState(6)
  const [cellH, setCellH] = useState(6)
  const [universe, setUniverse] = useState(0)
  const [start, setStart] = useState(1)
  const [mode, setMode] = useState<ChannelMode>('rgb')
  const [step, setStep] = useState(channelCount('rgb'))
  const [done, setDone] = useState<number | null>(null)

  const estimate = useMemo(() => {
    if (!mask) return 0
    const px = Math.max(1, Math.round(pitchX))
    const py = Math.max(1, Math.round(pitchY))
    let n = 0
    for (let y = Math.floor(py / 2); y < mask.h; y += py) {
      for (let x = Math.floor(px / 2); x < mask.w; x += px) {
        if (mask.bitmap[y * mask.w + x] === 1) n++
      }
    }
    return n
  }, [mask, pitchX, pitchY])

  const capped = Math.min(estimate, CAP)
  const lastAddr = capped > 0 ? addressAt(universe, start, mode, step, capped - 1) : null

  const generate = (): void => {
    setDone(autoFill({ pitchX, pitchY, cellW, cellH, universe, start, mode, step }))
  }

  return (
    <div style={backdrop} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: F.display, fontSize: 18, letterSpacing: '0.1em', color: C.white }}>
            マスクに敷き詰め
          </div>
          <div style={{ flex: 1 }} />
          <button style={{ ...buttonStyle({}), padding: '4px 10px' }} onClick={onClose}>
            閉じる
          </button>
        </div>

        {!mask ? (
          <div style={{ color: C.amber, fontSize: 12, fontFamily: F.ui }}>
            先に下絵を読み込み、「マスク」を有効にしてください。
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="ピッチX(px)">
                <input type="number" min={1} value={pitchX} style={inputStyle}
                  onChange={(e) => setPitchX(Math.max(1, Number(e.target.value)))} />
              </Field>
              <Field label="ピッチY(px)">
                <input type="number" min={1} value={pitchY} style={inputStyle}
                  onChange={(e) => setPitchY(Math.max(1, Number(e.target.value)))} />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="セル幅(px)">
                <input type="number" min={1} value={cellW} style={inputStyle}
                  onChange={(e) => setCellW(Math.max(1, Number(e.target.value)))} />
              </Field>
              <Field label="セル高(px)">
                <input type="number" min={1} value={cellH} style={inputStyle}
                  onChange={(e) => setCellH(Math.max(1, Number(e.target.value)))} />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="基準ユニバース">
                <input type="number" min={0} value={universe} style={inputStyle}
                  onChange={(e) => setUniverse(Math.max(0, Number(e.target.value)))} />
              </Field>
              <Field label="開始番地">
                <input type="number" min={1} max={512} value={start} style={inputStyle}
                  onChange={(e) => setStart(Math.min(512, Math.max(1, Number(e.target.value))))} />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="構成">
                <select value={mode} style={{ ...inputStyle, fontFamily: F.ui }}
                  onChange={(e) => {
                    const m = e.target.value as ChannelMode
                    setMode(m)
                    setStep(channelCount(m))
                  }}>
                  {MODES.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="番地ステップ">
                <input type="number" min={1} value={step} style={inputStyle}
                  onChange={(e) => setStep(Math.max(1, Number(e.target.value)))} />
              </Field>
            </div>

            <div style={{ fontFamily: F.mono, fontSize: 12, color: C.accent, margin: '4px 0 12px' }}>
              生成予定: {capped} 個
              {estimate > CAP && <span style={{ color: C.amber }}>（上限{CAP}に制限・ピッチを大きく）</span>}
              {lastAddr && <span style={{ color: C.hint }}>　番地 U{universe}/{start} … U{lastAddr.universe}/{lastAddr.start}</span>}
            </div>

            {done !== null && (
              <div style={{ fontFamily: F.ui, fontSize: 12, color: C.green, marginBottom: 10 }}>
                {done} 個を生成しました。
              </div>
            )}

            <button style={{ ...buttonStyle({}), width: '100%' }} onClick={generate}>
              敷き詰めて番地を連番付与
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div style={{ marginBottom: 12, flex: 1 }}>
      <label style={fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

const backdrop: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100
}
const modal: React.CSSProperties = {
  width: 460,
  background: C.surface,
  border: `0.5px solid ${C.border}`,
  borderRadius: 8,
  padding: 20
}
