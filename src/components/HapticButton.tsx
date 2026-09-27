import type { ReactNode } from 'react'
import { buzz } from '../lib/sound'

function isiOS() {
  return /iP(ad|hone|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function HapticButton({ children, className = '', disabled = false, label, onPress }: {
  children: ReactNode
  className?: string
  disabled?: boolean
  label: string
  onPress: () => void
}) {
  function press() { if (!disabled) { buzz(10); onPress() } }
  if (!isiOS()) return <button type="button" className={className} disabled={disabled} onClick={press}>{children}</button>
  return <span className={`haptic-tap ${className}${disabled ? ' is-disabled' : ''}`}>
    <span className="haptic-visual" aria-hidden>{children}</span>
    <input type="checkbox" {...{ switch: '' }} disabled={disabled} aria-label={label} onChange={press} />
  </span>
}
