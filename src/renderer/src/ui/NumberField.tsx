import { useRef } from 'react'
import { inputStyle } from './tokens'

/**
 * Console-style number field: drag horizontally to scrub the value (like an encoder),
 * or click to focus + select-all and type. Avoids the fiddly clear-then-retype of a
 * plain number input.
 */
export function NumberField({
  value,
  onChange,
  min,
  max,
  step = 1,
  style
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  style?: React.CSSProperties
}): React.JSX.Element {
  const ref = useRef<HTMLInputElement>(null)
  const scrub = useRef<{ x: number; v: number; active: boolean } | null>(null)

  const clamp = (n: number): number => {
    let r = n
    if (min != null && r < min) r = min
    if (max != null && r > max) r = max
    return r
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={String(value)}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const t = e.target.value.trim()
        if (t === '' || t === '-') return
        const n = Number(t)
        if (Number.isFinite(n)) onChange(clamp(n))
      }}
      onPointerDown={(e) => {
        scrub.current = { x: e.clientX, v: value, active: false }
      }}
      onPointerMove={(e) => {
        const s = scrub.current
        if (!s) return
        const dx = e.clientX - s.x
        if (!s.active) {
          if (Math.abs(dx) < 3) return
          s.active = true
          ref.current?.blur()
          ref.current?.setPointerCapture(e.pointerId)
        }
        onChange(clamp(s.v + Math.round(dx / 4) * step))
      }}
      onPointerUp={(e) => {
        if (scrub.current?.active) ref.current?.releasePointerCapture(e.pointerId)
        scrub.current = null
      }}
      style={{ ...inputStyle, cursor: 'ew-resize', ...style }}
    />
  )
}
