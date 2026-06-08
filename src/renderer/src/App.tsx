import { Toolbar } from './editor/Toolbar'
import { useStore } from './state/store'
import { C, F } from './ui/tokens'

function App(): React.JSX.Element {
  const mode = useStore((s) => s.mode)
  const chart = useStore((s) => s.chart)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: C.canvas }}>
      <Toolbar />
      <main
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: C.canvas
        }}
      >
        {/* Placeholder canvas frame — EditorCanvas (Task 2.3) renders here next. */}
        <div
          style={{
            position: 'relative',
            width: '72%',
            maxWidth: 980,
            aspectRatio: `${chart.canvas.w} / ${chart.canvas.h}`,
            border: `0.5px solid ${C.border}`,
            background: '#000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12
          }}
        >
          <div
            style={{
              fontFamily: F.display,
              fontSize: 44,
              letterSpacing: '0.12em',
              color: mode === 'edit' ? C.accent : C.amber
            }}
          >
            {mode === 'edit' ? 'EDIT MODE' : 'LIVE MODE'}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 12, color: C.hint, letterSpacing: '0.05em' }}>
            {chart.canvas.w} × {chart.canvas.h}
          </div>
          <div style={{ fontFamily: F.ui, fontSize: 11, color: C.faint }}>
            キャンバス（ここに下絵と図形が入ります）
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
