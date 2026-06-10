import { useEffect, useRef } from 'react'
import { C, F } from '../ui/tokens'
import { drawBulbGlass, drawBulbLit, BULB_DEFAULT_DIAMETER } from '../render/bulb'

/** Live-rendered thumbnail: the actual bulb renderer at a thumbnail-friendly size,
 *  lit warm — what you drag is what you get. */
function BulbThumb({ size = 46 }: { size?: number }): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, size, size)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, size, size)
    const d = size * 0.62
    drawBulbGlass(ctx, size / 2, size / 2, d, 'clear')
    drawBulbLit(ctx, size / 2, size / 2, d, [255, 160, 60], 'clear')
  }, [size])
  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      style={{ display: 'block', borderRadius: 4, pointerEvents: 'none' }}
    />
  )
}

/** アイコン棚 — drag a part onto the chart to place it (bulb centre = the dropped
 *  cell). First resident: the ball bulb. Future parts join this grid. */
export function PartsPalette(): React.JSX.Element {
  return (
    <div style={wrapStyle}>
      <div style={titleStyle}>Parts</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/x-decor-part', 'bulb')
            e.dataTransfer.effectAllowed = 'copy'
          }}
          title="ドラッグしてチャートに置く（中心がそのマスに乗る）"
          style={cardStyle}
        >
          <BulbThumb />
          <div style={{ fontSize: 11, color: C.text, fontFamily: F.ui, marginTop: 5 }}>ボール球</div>
          <div style={{ fontSize: 9, color: C.hint, fontFamily: F.mono }}>
            Φ{BULB_DEFAULT_DIAMETER}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: C.faint, fontFamily: F.ui, marginTop: 8, lineHeight: 1.5 }}>
        ドラッグ＆ドロップで設置 · 2個目からは ⌘C → クリック → ⌘V
      </div>
    </div>
  )
}

const wrapStyle: React.CSSProperties = {
  padding: '12px 16px 14px',
  borderBottom: `0.5px solid ${C.border}`,
  flexShrink: 0
}

const titleStyle: React.CSSProperties = {
  fontFamily: F.display,
  fontSize: 15,
  letterSpacing: '0.1em',
  color: C.white,
  marginBottom: 8,
  textTransform: 'uppercase'
}

const cardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '8px 10px 7px',
  background: '#242220',
  border: `1px solid #3b3631`,
  borderRadius: 5,
  cursor: 'grab',
  userSelect: 'none',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
}
